"""Validate source grounding on the synthetic decks in `test-presentations/`.

Run inside the backend image with this worktree mounted, for example:

    docker compose run --rm --no-deps -T -v "$PWD:/workspace:ro" \
      -w /workspace/backend backend python -m scripts.validate_grounding

Add --live-llm only when intentionally testing the configured cloud model.

The script creates a temporary collection, ingests the three decks directly
through the worker code, exercises retrieval, fact-check and the question
simulator, prints a JSON report and deletes the sources again. All content is
synthetic. `--live-llm` is required because it sends synthetic transcript text
to the configured model; without it, only extraction and retrieval run.
"""

import argparse
import json
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

from app.connections import s3_client
from app.factcheck.llm import configured_llm
from app.factcheck.models import FactCheckConfig, FactCheckRequest
from app.factcheck.pipeline import numeric_gate, run_fact_check
from app.questions.models import QuestionConfig, QuestionRequest
from app.questions.pipeline import generate_questions
from app.sources import db, retrieval
from app.sources.ingest import ingest_source, object_key
from app.sources.models import Source
from app.transcription.models import Word

DECKS = {
    "01-startup-plantsens.pptx": ("A", "startup"),
    "02-thesis-kurzpausen.pdf": ("B", "thesis"),
    "03-nonprofit-tafel-musterstadt.docx": ("C", "nonprofit"),
}
QUERIES = {
    "01-startup-plantsens.pptx": ["38 Prozent Wasserverlust", "Preis 149 Euro", "Anzahl Pilotbetriebe"],
    "02-thesis-kurzpausen.pdf": ["7,1 Punkte Differenz", "48 Studierende", "Förderung DFG"],
    "03-nonprofit-tafel-musterstadt.docx": ["1.200 Haushalte pro Woche", "2 Standorte", "Wartezeit 6 Wochen"],
}


def _section(text: str, letter: str) -> list[str]:
    match = re.search(rf"ABSCHNITT {letter}.*?Vorlesen:\s*(.*?)\s*Erwartete Funde:", text, re.DOTALL)
    if not match:
        raise ValueError(f"section {letter} not found")
    lines = []
    for line in match.group(1).splitlines():
        spoken = re.match(r"\s*\d+\s+\[[^\]]+\]\s*(.+)", line)
        if spoken:
            lines.append(spoken.group(1).strip())
    return lines


def _words(lines: list[str]) -> list[Word]:
    result, clock = [], 0
    for line in lines:
        for token in line.split():
            result.append(Word(word=token, start_ms=clock, end_ms=clock + 280))
            clock += 300
        clock += 250
    return result


def _ingest(collection: UUID, path: Path, created: list[UUID]) -> tuple[Source, list[dict]]:
    source = Source(id=uuid4(), collection_id=collection, filename=path.name,
                    content_type=path.suffix, size_bytes=path.stat().st_size,
                    status="queued", created_at=datetime.now(UTC))
    db.insert_source(source, object_key(source.id))
    created.append(source.id)
    s3_client().upload_file(str(path), os.environ["S3_BUCKET"], object_key(source.id))
    ingest_source(source.id)
    found = db.get_source(source.id)
    if found is None:
        raise RuntimeError("source disappeared during ingest")
    current = found[0]
    if current.status != "ready":
        raise RuntimeError(f"{path.name} failed: {current.error}")
    with db.connect() as connection:
        chunks = connection.execute(
            "SELECT ordinal, location_kind, location_start, location_end, text FROM source_chunks"
            " WHERE source_id = %s ORDER BY ordinal", (source.id,),
        ).fetchall()
    return current, chunks


def _hits(collection: UUID, queries: list[str]) -> list[dict]:
    report = []
    for query in queries:
        found = retrieval.search(collection, query, 3)
        report.append({
            "query": query,
            "hits": [{
                "label": f"{hit.filename}, {retrieval.location_label(hit.location)}",
                "similarity": hit.similarity,
                "matched_by": hit.matched_by,
                "retrieval_score": hit.retrieval_score,
                "weak": hit.weak,
                "text": hit.text[:160],
            } for hit in found],
        })
    return report


def _check_gate(claim) -> None:
    if claim.verdict in ("supports", "contradicts") and claim.evidence:
        note = numeric_gate(claim.claim, claim.evidence.quote, claim.verdict)
        if note:
            raise AssertionError(f"numeric gate postcondition failed: {claim.claim!r} ({note})")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decks", type=Path, default=Path("../test-presentations"))
    parser.add_argument("--live-llm", action="store_true", help="Run fact-check and questions with the configured model")
    parser.add_argument("--output", type=Path, help="Write the JSON report to this path")
    args = parser.parse_args()

    script = args.decks / "sprech-skript.txt"
    text = script.read_text(encoding="utf-8")
    created: list[UUID] = []
    report: dict = {"decks": {}, "llm": None}
    llm = configured_llm() if args.live_llm else None
    try:
        for filename, (letter, mode) in DECKS.items():
            path = args.decks / filename
            collection = uuid4()
            source, chunks = _ingest(collection, path, created)
            deck = {
                "collection": str(collection),
                "source_id": str(source.id),
                "chunks": len(chunks),
                "kinds": sorted({chunk["location_kind"] for chunk in chunks}),
                "tables": [{
                    "location": chunk["location_start"],
                    "text": chunk["text"][:160],
                } for chunk in chunks if chunk["location_kind"] == "table"],
                "retrieval": _hits(collection, QUERIES[filename]),
            }
            if filename.endswith(".docx"):
                assert deck["tables"], "DOCX extraction produced no table chunk"
            if args.live_llm:
                words = _words(_section(text, letter))
                request = FactCheckRequest(words=words, collection_id=collection, use_web=False,
                                           config=FactCheckConfig(max_claims=6))
                result = run_fact_check(request, llm, None)
                for claim in result.claims:
                    _check_gate(claim)
                deck["fact_check"] = [{
                    "claim": claim.claim,
                    "verdict": claim.verdict,
                    "checked": claim.checked,
                    "evidence": None if claim.evidence is None else {
                        "label": claim.evidence.label,
                        "quote": claim.evidence.quote,
                        "quote_verified": claim.evidence.quote_verified,
                        "similarity": claim.evidence.similarity,
                        "weak": claim.evidence.weak,
                    },
                    "notes": claim.notes,
                } for claim in result.claims]
                questions = generate_questions(QuestionRequest(
                    words=words, collection_id=collection, claims=result.claims, presentation_mode=mode,
                    config=QuestionConfig(max_questions=3),
                ), llm)
                deck["questions"] = [{
                    "kind": question.kind,
                    "question": question.question,
                    "evidence": None if question.evidence is None else {
                        "label": question.evidence.label,
                        "quote": question.evidence.quote,
                    },
                } for question in questions.questions]
                report["llm"] = result.model
            report["decks"][filename] = deck
    finally:
        for source_id in created:
            db.delete_source(source_id)
            s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=object_key(source_id))

    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    sys.exit(main())

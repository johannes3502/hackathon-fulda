"""Benchmark für den Embedding-Schritt der RAG-Pipeline (FastEmbed/ONNX).

Spiegelt `app/sources/embeddings.py` exakt wider: gleiches Modell-Pin,
gleiche `batch_size=16` für Dokumente, gleicher `query_embed`-Pfad für
Queries (Fact-Check-Aussagen-Retrieval). Reines CPU-OnnxRuntime wie im
Einsatz, keine Sonderkonfiguration der Threads.

Lauf auf dem zu messenden Rechner (einmalig wird ~0,6 GB Modell geladen):

    cd backend
    .venv/bin/python scripts/benchmark_embedding.py

Ergebnisse landen als JSON + Markdown in `backend/benchmarks/results/`
und werden mit dem Branch committet, um Rechner zu vergleichen
(z. B. Laptop vs. Apple M5 Pro).
"""

import argparse
import json
import math
import os
import platform
import socket
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.sources.embeddings import DEFAULT_MODEL, MODEL_REVISION, FastEmbedEmbedder  # noqa: E402

QUERIES = [
    "Wie hoch ist die Studierendenzahl in Hessen?",
    "Welche Übungsmethoden verbessern Präsentationskompetenz am schnellsten?",
    "Der Weltmarkt für Präsentationstraining wächst jedes Jahr.",
    "Warum scheitern Studierende bei mündlichen Prüfungen?",
    "Welche Rolle spielt Körpersprache für die Wirkung eines Vortrags?",
    "Laut der Quelle liegen die Kosten bei rund 250 Euro pro Person.",
    "Wie wirkt sich häufiges Üben auf Redeangst aus?",
    "Eye Tracking kann Blickkontakt zuverlässig messen.",
    "Welche Folienstruktur empfiehlt die Quelle für Kurzvorträge?",
    "Eine gute Einleitung besteht aus Problem, Nutzen und Fahrplan.",
]

SENTENCES = [
    "Präsentationen sind im Studium und im Berufsalltag allgegenwärtig, werden aber selten systematisch geübt.",
    "Studierende berichten, dass sie Feedback zu Vorträgen erst Wochen nach der Veranstaltung erhalten.",
    "Eine mangelhafte Körperhaltung lenkt das Publikum von den Inhalten ab und mindert die Glaubwürdigkeit.",
    "Der Prototyp analysiert Auftritt und Sprache und macht Feedback timestamp-genau zurückspulbar.",
    "Cameras und Mikrofon laufen während der Aufnahme, die Analyse erfolgt anschließend im Backend.",
    "Für den Abgleich von Aussagen werden hochgeladene Quellen in Chunks zerlegt und lokal embedded.",
    "Die Hybrid-Suche kombiniert Vektorähnlichkeit mit deutscher Volltextsuche über Reciprocal Rank Fusion.",
    "Ein Sprecher mit monotoner Tonhöhe wird als weniger kompetent wahrgenommen als einer mit Variation.",
    "Sprechtempo und Füllwörter lassen sich zuverlässig aus Wort-Timestamps der Transkription ableiten.",
    "Nach dem Vortrag stellt ein Agent gezielte Rückfragen zu Widersprüchen und Lücken im Inhalt.",
    "Alle Aufnahmen werden nach der Verarbeitung gelöscht, damit keine personenbezogenen Daten bleiben.",
    "Die Evaluation zeigt in einer synthetischen Demo, wie Events auf einer gemeinsamen Zeitachse liegen.",
    "Regeln auf Landmarks erkennen etwa verschränkte Arme und erzeugen Events mit Schweregrad hint.",
    "Der Fact-Check prüft wörtliche Zitate per String-Match, damit das LLM nichts erfinden kann.",
    "Eine Kalibrierungsphase von drei Sekunden normalisiert Pegel und Tonhöhe auf den einzelnen Sprecher.",
    "Web-Quellen kommen erst als Zweitquelle infrage, nachdem die hochgeladenen Dokumente durchsucht wurden.",
]


def system_info() -> dict:
    info = {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "cpu_count_logical": os.cpu_count(),
        "cpu_model": None,
        "ram_total_gb": None,
    }
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if line.startswith("model name"):
                info["cpu_model"] = line.split(":", 1)[1].strip()
                break
        for line in Path("/proc/meminfo").read_text().splitlines():
            if line.startswith("MemTotal"):
                info["ram_total_gb"] = round(int(line.split()[1]) / 1024 / 1024, 1)
                break
    except OSError:
        pass
    if info["cpu_model"] is None:
        info["cpu_model"] = platform.processor() or "unknown"
    if info["ram_total_gb"] is None:
        try:
            info["ram_total_gb"] = round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024**3, 1)
        except (ValueError, OSError):
            pass
    for package in ("fastembed", "onnxruntime", "numpy", "tokenizers"):
        try:
            info[f"version_{package}"] = __import__(package).__version__
        except (ImportError, AttributeError):
            info[f"version_{package}"] = None
    return info


def model_cached() -> bool:
    cache = Path.home() / ".cache" / "fastembed"
    return any(cache.glob("models--*jina*")) if cache.is_dir() else False


def stats(samples: list[float]) -> dict:
    ordered = sorted(samples)
    return {
        "n": len(samples),
        "mean_ms": round(statistics.mean(samples) * 1000, 2),
        "p50_ms": round(ordered[len(ordered) // 2] * 1000, 2),
        "p95_ms": round(ordered[min(len(ordered) - 1, math.ceil(len(ordered) * 0.95) - 1)] * 1000, 2),
        "min_ms": round(ordered[0] * 1000, 2),
        "max_ms": round(ordered[-1] * 1000, 2),
        "stdev_ms": round(statistics.stdev(samples) * 1000, 2) if len(samples) > 1 else 0.0,
    }


def build_chunks(count: int, chunk_chars: int) -> list[str]:
    chunks = []
    position = 0
    while len(chunks) < count:
        parts = []
        size = 0
        while size < chunk_chars:
            sentence = SENTENCES[position % len(SENTENCES)]
            parts.append(sentence)
            size += len(sentence) + 1
            position += 1
        chunks.append(" ".join(parts)[:chunk_chars])
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query-reps", type=int, default=5, help="Wiederholungen der 10 Queries")
    parser.add_argument("--num-chunks", type=int, default=128, help="Dokument-Chunks à ~1200 Zeichen")
    parser.add_argument("--chunk-chars", type=int, default=1200, help="Zielgröße eines Chunks in Zeichen")
    args = parser.parse_args()

    result: dict = {
        "benchmark": "rag-embedding",
        "model": DEFAULT_MODEL,
        "revision": MODEL_REVISION,
        "model_cached_before_run": model_cached(),
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "system": system_info(),
        "parameters": {
            "query_reps": args.query_reps,
            "num_chunks": args.num_chunks,
            "chunk_chars": args.chunk_chars,
            "document_batch_size": 16,
        },
    }
    print(f"Modell: {DEFAULT_MODEL} (Cache vorhanden: {result['model_cached_before_run']})")
    print(f"CPU: {result['system']['cpu_model']} | {result['system']['cpu_count_logical']} Threads")

    print("Lade Modell …")
    start = time.perf_counter()
    embedder = FastEmbedEmbedder(DEFAULT_MODEL, os.getenv("EMBEDDING_MODEL_PATH"))
    result["model_load_s"] = round(time.perf_counter() - start, 2)
    print(f"Modell geladen in {result['model_load_s']}s")

    for query in QUERIES[:3]:
        embedder.embed_query(query)
    embedder.embed_documents(SENTENCES[:4])
    print("Warmup abgeschlossen")

    samples = []
    for _ in range(args.query_reps):
        for query in QUERIES:
            start = time.perf_counter()
            embedder.embed_query(query)
            samples.append(time.perf_counter() - start)
    total = sum(samples)
    result["query_embedding"] = {
        **stats(samples),
        "throughput_qps": round(len(samples) / total, 2),
        "example_lengths_chars": sorted({len(query) for query in QUERIES}),
    }
    print(f"Queries: {result['query_embedding']['mean_ms']}ms Ø | {result['query_embedding']['throughput_qps']} q/s")

    chunks = build_chunks(args.num_chunks, args.chunk_chars)
    samples = []
    remaining = list(chunks)
    while remaining:
        batch = remaining[:16]
        remaining = remaining[16:]
        start = time.perf_counter()
        embedder.embed_documents(batch)
        samples.append(time.perf_counter() - start)
    total = sum(samples)
    chars = sum(len(chunk) for chunk in chunks)
    result["document_embedding"] = {
        "batch_stats": stats(samples),
        "total_s": round(total, 2),
        "chunks_total": len(chunks),
        "chunks_per_second": round(len(chunks) / total, 2),
        "chars_total": chars,
        "chars_per_second": round(chars / total),
    }
    print(
        f"Dokumente: {result['document_embedding']['chunks_per_second']} Chunks/s | "
        f"{result['document_embedding']['total_s']}s gesamt für {len(chunks)} Chunks"
    )

    vector = embedder.embed_query(QUERIES[0])
    result["vector"] = {
        "dimension": len(vector),
        "l2_norm": round(math.sqrt(sum(value * value for value in vector)), 4),
    }

    result["finished_at_utc"] = datetime.now(timezone.utc).isoformat()

    outdir = BACKEND_DIR / "benchmarks" / "results"
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    host = result["system"]["hostname"]
    json_path = outdir / f"embedding-benchmark_{host}_{stamp}.json"
    md_path = outdir / f"embedding-benchmark_{host}_{stamp}.md"
    json_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path.write_text(markdown_report(result), encoding="utf-8")
    print(f"\nErgebnisse: {json_path}\n            {md_path}")


def markdown_report(result: dict) -> str:
    query = result["query_embedding"]
    docs = result["document_embedding"]
    system = result["system"]
    lines = [
        "# Embedding-Benchmark (RAG-Pipeline)",
        "",
        f"Modell: `{result['model']}` @ {result['revision'][:8]} (FastEmbed/ONNX, CPU) · "
        f"Vektor: {result['vector']['dimension']}d, L2={result['vector']['l2_norm']}",
        f"Gelaufen: {result['finished_at_utc']}",
        "",
        "| Rechner | Wert |",
        "|---|---|",
        f"| Host | {system['hostname']} |",
        f"| CPU | {system['cpu_model']} ({system['cpu_count_logical']} Threads) |",
        f"| RAM | {system['ram_total_gb']} GB |",
        f"| OS | {system['platform']} |",
        f"| Python | {system['python']} |",
        f"| fastembed / onnxruntime | {system['version_fastembed']} / {system['version_onnxruntime']} |",
        f"| Modell geladen (inkl. Download falls kalt) | {result['model_load_s']}s |",
        "",
        "| Metrik | Wert |",
        "|---|---|",
        f"| Query-Latenz Ø / p95 | {query['mean_ms']} ms / {query['p95_ms']} ms |",
        f"| Query-Durchsatz | {query['throughput_qps']} q/s |",
        f"| Dokument-Embedding gesamt ({docs['chunks_total']} Chunks à ~{result['parameters']['chunk_chars']} Zeichen) | {docs['total_s']} s |",
        f"| Dokument-Durchsatz | {docs['chunks_per_second']} Chunks/s · {docs['chars_per_second']} Zeichen/s |",
        f"| Batch-Latenz (16 Chunks) Ø / p95 | {docs['batch_stats']['mean_ms']} ms / {docs['batch_stats']['p95_ms']} ms |",
        "",
        "Vorgehen: gleiche Codepfade wie die Pipeline (`FastEmbedEmbedder`, batch_size=16, "
        "`query_embed` für Queries); Parameter: "
        f"{result['parameters']['query_reps']}×10 Queries, {docs['chunks_total']} Chunks. "
        "Siehe `scripts/benchmark_embedding.py`.",
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    main()

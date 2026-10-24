"""Insert synthetic review examples without media, model calls or quality scores.

Run from backend: python -m scripts.seed_demo
Stable IDs and insert-only transactions make repeated runs safe for existing data.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from uuid import UUID, uuid5

from psycopg.types.json import Jsonb

from app.review import db, service
from app.review.models import ReviewEvent, ReviewRequest, Session, Take, TakeAnalysis
from app.review.timeline import validate_event
from app.review.writer import build_review
from app.transcription.analysis import analyze_words
from app.transcription.models import Word

NAMESPACE = UUID("ea234d32-c34b-4d70-a95d-fc868879f3f1")
SEED_VERSION = "synthetic-seed.v1"
NOTICE = "Synthetische Seed-Daten: keine echte Aufnahme, keine ASR- oder Genauigkeitsvalidierung."


@dataclass(frozen=True)
class DemoTake:
    session: Session
    take: Take
    events: list[ReviewEvent]


def demo_takes(namespace: UUID = NAMESPACE) -> list[DemoTake]:
    scripts = [
        ("Lernlabor – erster Pilot", "Unser Lernlabor ist ein synthetisches Beispiel. Wir üben kurze Präsentationen mit Quellen. Ähm danach sehen wir uns einzelne Stellen gemeinsam an. Für den ersten Pilot planen wir zwölf Teilnehmende. Die Rückfragen helfen beim Erklären der eigenen Gedanken."),
        ("Quellen im Vortrag", "Diese Präsentation beschreibt ein erfundenes Seminar. Jede Gruppe erhält einen kurzen Text und erklärt die zentrale Aussage. Ähm die Quelle wird direkt genannt. Anschließend vergleichen wir die Erklärung mit dem Text. Eine fehlende Fundstelle bedeutet nicht automatisch eine falsche Aussage."),
        ("Gezielte Rückfragen", "In diesem synthetischen Beispiel üben wir Rückfragen nach einem Vortrag. Zuerst erklärt eine Person ihre Idee. Dann fragt die andere Person nach einem konkreten Beispiel. Ähm wir schauen die betreffende Stelle noch einmal an. Zum Schluss formulieren wir die Erklärung gemeinsam neu."),
    ]
    fixtures = []
    for index, (title, text) in enumerate(scripts):
        identifier = lambda kind: uuid5(namespace, f"{index}:{kind}")
        created = datetime(2026, 10, 24, 8, tzinfo=timezone.utc) + timedelta(hours=index)
        duration_ms = 60000 + index * 15000
        tokens = text.split()
        words = [Word(word=token,
                      start_ms=3000 + offset * 900 + (2000 if offset >= len(tokens) // 2 else 0),
                      end_ms=3500 + offset * 900 + (2000 if offset >= len(tokens) // 2 else 0))
                 for offset, token in enumerate(tokens)]
        word_analysis = analyze_words(words)
        session = Session(session_id=identifier("session"), title=f"Synthetische Demo · {title}",
            status="review_ready", created_at=created,
            consent={"granted": True, "at": created, "version": SEED_VERSION, "scope": "local-analysis"})
        take = Take(take_id=identifier("take"), session_id=session.session_id, status="review_ready",
            duration_ms=duration_ms, mime_type="video/webm", timebase={"onstartPerfMs": 0},
            # No camera was observed, so no interval is declared evaluable.
            coverage=[], created_at=created,
            analysis=TakeAnalysis(words=words, word_summary=word_analysis.summary,
                asr_provider="synthetic-seed", synthetic_demo=True, notices=[NOTICE]))
        events = [ReviewEvent(event_id=f"seed:asr:{offset}", t_ms=event.t_ms, peak_ms=event.t_ms,
            duration_ms=event.duration_ms, type=event.type, severity=event.severity, source="asr",
            payload={"schema": "asr.event.v1", **event.payload, "synthetic": True})
            for offset, event in enumerate(word_analysis.events)]
        fixtures.append(DemoTake(session, take, [validate_event(event, duration_ms) for event in events]))
    return fixtures


def seed_demo(namespace: UUID = NAMESPACE) -> dict:
    manifest = {"seedVersion": SEED_VERSION, "synthetic": True, "inserted": 0, "skipped": 0, "sessions": []}
    with db.connect() as connection, connection.transaction():
        connection.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (str(namespace),))
        for fixture in demo_takes(namespace):
            session, take = fixture.session, fixture.take
            entry = {"sessionId": str(session.session_id), "takeId": str(take.take_id),
                     "title": session.title, "reviewPath": f"/api/takes/{take.take_id}/review"}
            manifest["sessions"].append(entry)
            inserted = connection.execute(
                "INSERT INTO sessions(id,title,status,consent,capture,created_at)"
                " VALUES (%s,%s,'created',%s,%s,%s) ON CONFLICT(id) DO NOTHING RETURNING id",
                (session.session_id, session.title, Jsonb(service.json_model(session.consent)),
                 Jsonb(service.json_model(session.capture)), session.created_at)).fetchone()
            if not inserted:
                manifest["skipped"] += 1
                continue
            connection.execute(
                "INSERT INTO takes(id,session_id,status,duration_ms,mime_type,timebase,analysis,created_at)"
                " VALUES (%s,%s,'events_ready',%s,%s,%s,%s,%s)",
                (take.take_id, session.session_id, take.duration_ms, take.mime_type,
                 Jsonb(service.json_model(take.timebase)), Jsonb(service.json_model(take.analysis)), take.created_at))
            db.upsert_events(connection, take.take_id, fixture.events)
            report, verification = build_review(service.load_timeline(connection, take.take_id), ReviewRequest())
            report = report.model_copy(update={"review_id": uuid5(take.take_id, "review"),
                "generated_at": take.created_at, "limitations": [NOTICE, *report.limitations]})
            connection.execute(
                "INSERT INTO reviews(id,take_id,status,report,generator,verification,created_at,updated_at)"
                " VALUES (%s,%s,'ready',%s,%s,%s,%s,%s)",
                (report.review_id, take.take_id, Jsonb(service.json_model(report)),
                 Jsonb(service.json_model(report.generator)), Jsonb(verification), take.created_at, take.created_at))
            connection.execute(
                "INSERT INTO jobs(id,take_id,kind,status,progress,result,input,created_at,updated_at)"
                " VALUES (%s,%s,'review_generate','completed',100,%s,'{}',%s,%s)",
                (uuid5(take.take_id, "review-job"), take.take_id, Jsonb({"reviewId": str(report.review_id)}),
                 take.created_at, take.created_at))
            connection.execute("UPDATE takes SET status='review_ready' WHERE id=%s", (take.take_id,))
            connection.execute("UPDATE sessions SET status='review_ready' WHERE id=%s", (session.session_id,))
            manifest["inserted"] += 1
    return manifest


if __name__ == "__main__":
    print(json.dumps(seed_demo(), ensure_ascii=False, indent=2))

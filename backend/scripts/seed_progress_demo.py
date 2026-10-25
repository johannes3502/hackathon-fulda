"""Insert a synthetic profile with 24 measurable takes for progress UI tests.

Run from backend: python -m scripts.seed_progress_demo [--reset]
No media, model calls or real measurements are created.
"""

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from uuid import UUID, uuid5

from psycopg.types.json import Jsonb

from app.factcheck.models import ClaimResult, FactCheckConfig, FactCheckResult, Evidence
from app.progress import db, definitions, service
from app.review import db as review_db
from app.review.models import (
    Capture, Consent, CoverageInterval, ReviewEvent, Session, Take, TakeAnalysis, Timebase,
)
from app.review.timeline import validate_event
from app.speech.models import AudioSummary
from app.transcription.models import Word, WordSummary

NAMESPACE = UUID("ea234d32-c34b-4d70-a95d-fc868879f3f1")
PROFILE_ID = uuid5(NAMESPACE, "progress-profile:demo")
PROFILE_TOKEN = "pp_progressseed7f4c9a2b6d8e1f3a5c0b9d7e"
PROFILE_NAME = "Demo-Profil (synthetisch, UI-Test)"
NOTICE = ("Synthetische Fortschritts-Testdaten: keine echte Aufnahme, "
          "keine ASR- oder Genauigkeitsvalidierung.")
DEVICE_KEY = UUID("a3f1c9e2-4b7a-4c1d-9e2f-5a6b7c8d9e0f")
TOKEN_ID = uuid5(NAMESPACE, "progress-profile:demo:token")

SHOWCASE_NAMESPACE = UUID("7c5d4f2e-91b8-4a63-8d1f-2e7a9c0b5d34")
SHOWCASE_PROFILE_ID = uuid5(SHOWCASE_NAMESPACE, "progress-profile:showcase")
SHOWCASE_PROFILE_TOKEN = "pp_showcase3b8e1f4a6c9d2e5f7a0b3c8d1e4f6a9b"
SHOWCASE_PROFILE_NAME = "Alex Winter"
SHOWCASE_NOTICE = None

DATES = [
    (2026, 1, 12), (2026, 1, 24), (2026, 2, 5), (2026, 2, 19),
    (2026, 3, 3), (2026, 3, 16), (2026, 3, 28), (2026, 4, 9),
    (2026, 4, 22), (2026, 5, 4), (2026, 5, 16), (2026, 5, 29),
    (2026, 6, 10), (2026, 6, 23), (2026, 7, 5), (2026, 7, 18),
    (2026, 7, 30), (2026, 8, 12), (2026, 8, 24), (2026, 9, 6),
    (2026, 9, 12), (2026, 9, 25), (2026, 10, 8), (2026, 10, 20),
]
MODES = [
    "startup", "startup", "thesis", "startup", "school", "startup",
    "startup", "thesis", "startup", "startup", "school", "startup",
    "startup", "thesis", "startup", "school", "startup", "startup",
    "school", "startup", "startup", "thesis", "startup", "startup",
]
DURATIONS = [
    182000, 176000, 191000, 169000, 204000, 188000, 173000, 198000,
    186000, 171000, 213000, 194000, 180000, 199000, 175000, 184000,
    190000, 177000, 202000, 181000, 48000, 52000, 45000, 50000,
]
PACE = [112, 115, 110, 118, 121, 119, 124, 126, 123, 129,
        127, 132, 130, 134, 131, 136, 133, 138, 140, 136,
        118, 121, 116, 120]
PAUSE_SHARE = [0.24, 0.22, 0.23, 0.20, 0.21, 0.19, 0.18, 0.20, 0.17, 0.16,
               0.18, 0.15, 0.16, 0.14, 0.13, 0.15, 0.12, 0.13, 0.11, 0.12,
               0.22, 0.20, 0.23, 0.21]
FILLER_RATE = [7.5, 7.0, 7.2, 6.4, 6.0, 6.3, 5.5, 5.1, 5.4, 4.6,
               4.2, 4.5, 3.8, 3.4, 3.6, 3.0, 2.7, 2.9, 2.3, 2.1,
               6.8, 6.1, 7.0, 6.5]
POSTURE_SHARE = [0.26, 0.24, 0.25, 0.22, 0.23, 0.20, 0.19, 0.21, 0.17, 0.18,
                 0.15, 0.16, 0.14, 0.15, 0.13, 0.12, 0.14, 0.11, 0.10, 0.09,
                 0.24, 0.22, 0.25, 0.23]
HEAD_AWAY_SHARE = [0.18, 0.17, 0.19, 0.16, 0.15, 0.16, 0.14, 0.13, 0.14, 0.12,
                   0.11, 0.12, 0.10, 0.11, 0.09, 0.10, 0.08, 0.09, 0.07, 0.06,
                   0.17, 0.16, 0.18, 0.17]
ARMS_SHARE = [0.12, 0.11, 0.13, 0.10, 0.11, 0.09, 0.08, 0.10, 0.07, 0.08,
              0.06, 0.07, 0.05, 0.06, 0.05, 0.04, 0.06, 0.04, 0.03, 0.03,
              0.11, 0.10, 0.12, 0.11]
GESTURE_RATE = [3, 4, 4, 5, 5, 6, 5, 6, 7, 6, 7, 8, 8, 7, 9, 9, 8, 10, 10, 9,
                4, 5, 4, 6]
CONTRADICTION_RATE = [0.30, 0.30, 0.25, 0.30, 0.25, 0.25, 0.20, 0.25, 0.20, 0.20,
                      0.15, 0.20, 0.15, 0.15, 0.10, 0.15, 0.10, 0.10, 0.05, 0.10,
                      0.30, 0.25, 0.30, 0.20]
WORDS = (
    "wir erklären heute eine idee mit quellen und beispielen für das publikum "
    "die zentrale aussage wird zuerst genannt danach folgt der beleg aus dem text "
    "gemeinsam prüfen wir die stelle und formulieren sie verständlich neu "
    "ein kurzer blick in die folie hilft beim einstieg in den gedanken"
).split()


@dataclass(frozen=True)
class ProgressDemoTake:
    session: Session
    take: Take
    events: list[ReviewEvent]


def _recorded_at(index: int) -> datetime:
    year, month, day = DATES[index]
    return datetime(year, month, day, 18, 30, tzinfo=timezone.utc)


def _words(count: int, wpm: int, start_ms: int) -> tuple[list[Word], int]:
    speaking_ms = round(count * 60_000 / wpm)
    slot = max(1, speaking_ms // count)
    gap = max(40, slot // 5)
    words = []
    for index in range(count):
        start = start_ms + index * slot
        words.append(Word(word=WORDS[index % len(WORDS)], start_ms=start,
                          end_ms=start + slot - gap))
    actual_ms = sum(word.end_ms - word.start_ms for word in words)
    actual_ms += sum(word.start_ms - previous.end_ms for previous, word in zip(words, words[1:])
                     if 0 < word.start_ms - previous.end_ms < 2_000)
    return words, actual_ms


def _episodes(event_type: str, kind: str, total_ms: int, start_ms: int, end_ms: int,
              count: int, *, source: str = "browser", valid_ratio: float = 0.92,
              rule_version: str | None = "1", trunk_delta: float | None = None) -> list[ReviewEvent]:
    if total_ms <= 0 or count <= 0 or end_ms <= start_ms:
        return []
    duration = max(1, total_ms // count)
    step = max(1, (end_ms - start_ms) // count)
    events = []
    for index in range(count):
        start = start_ms + index * step
        if start + duration > end_ms:
            start = end_ms - duration
        payload = {
            "kind": kind,
            "evidence": {"validRatio": valid_ratio},
            "rule": {"version": 1},
            "message": {"key": f"seed.{kind}", "params": {}},
        }
        if trunk_delta is not None:
            payload["metric"] = {"delta": trunk_delta, "valueAtPeak": trunk_delta,
                                 "baseline": 0, "unit": "deg"}
        events.append(ReviewEvent(
            event_id=f"seed:{event_type}:{kind}:{index}",
            t_ms=max(0, start), peak_ms=max(0, start + duration // 2),
            duration_ms=duration, type=event_type, severity="hint",
            source=source, stage="final", payload=payload,
            dedupe_key=f"seed:{event_type}:{kind}:{index}",
            rule_version=rule_version))
    return events


def _pause_events(total_ms: int, start_ms: int, duration_ms: int) -> list[ReviewEvent]:
    total_ms = min(total_ms, duration_ms)
    if total_ms <= 0:
        return []
    count = min(4, max(1, total_ms // 4_000))
    duration = total_ms // count
    start = min(max(0, start_ms), duration_ms - total_ms)
    events = []
    for index in range(count):
        begin = start + index * duration
        events.append(ReviewEvent(
            event_id=f"seed:pause:{index}", t_ms=begin, peak_ms=begin + duration // 2,
            duration_ms=duration, type="pause", severity="hint", source="speech",
            stage="final", payload={"kind": "pause", "mid_sentence": False,
                                    "sentence_boundary": True},
            dedupe_key=f"seed:pause:{index}"))
    return events


def _filler_events(count: int, start_ms: int, end_ms: int) -> list[ReviewEvent]:
    if count <= 0 or end_ms <= start_ms:
        return []
    step = max(1, (end_ms - start_ms) // count)
    return [ReviewEvent(
        event_id=f"seed:filler:{index}", t_ms=start_ms + index * step,
        peak_ms=start_ms + index * step + 120, duration_ms=240, type="filler",
        severity="hint", source="asr", stage="final",
        payload={"kind": "filler", "word": "ähm"},
        dedupe_key=f"seed:filler:{index}") for index in range(count)]


def _gesture_events(count: int, start_ms: int, end_ms: int) -> list[ReviewEvent]:
    if count <= 0 or end_ms <= start_ms:
        return []
    step = max(1, (end_ms - start_ms) // count)
    return [ReviewEvent(
        event_id=f"seed:gesture:{index}", t_ms=start_ms + index * step,
        peak_ms=start_ms + index * step + 600, duration_ms=1_200, type="gesture",
        severity="info", source="browser", stage="final",
        payload={"kind": "hand-raise", "evidence": {"validRatio": 0.92}},
        dedupe_key=f"seed:gesture:{index}") for index in range(count)]


def _claims(count: int, contradiction_rate: float, start_ms: int, end_ms: int,
            duration_ms: int, *, showcase: bool = False) -> list[ClaimResult]:
    contradictions = round(count * contradiction_rate)
    supports = max(3, round(count * (1 - contradiction_rate) * 0.4))
    claims = []
    for index in range(count):
        if index < contradictions:
            verdict = "contradicts"
        elif index < contradictions + supports:
            verdict = "supports"
        else:
            verdict = "not_found"
        at = start_ms + (index * max(1, end_ms - start_ms) // count)
        if showcase:
            evidence = None if verdict == "not_found" else Evidence(
                kind="upload", label="Pitch-Deck · Folie 9",
                quote="Das Lernlabor plant den ersten Pilot mit zwölf Teilnehmenden.",
                passage=("Das Lernlabor plant den ersten Pilot mit zwölf Teilnehmenden "
                         "und wertet die Rückfragen gemeinsam aus."),
                filename="pitch-deck.pdf", quote_verified="exact",
                location={"kind": "slide", "start": 9, "end": 9})
            claims.append(ClaimResult(
                claim=f"Aussage {index + 1} aus dem Training.",
                transcript="Satz aus dem Training.",
                t_ms=at, duration_ms=min(2_000, max(1, duration_ms - at)),
                verdict=verdict, explanation="Quellenbefund aus dem hochgeladenen Material.",
                evidence=evidence, checked=["upload"]))
            continue
        evidence = None if verdict == "not_found" else Evidence(
            kind="upload", label="demo-quelle.pdf, Seite 2",
            quote="Das Lernlabor plant den ersten Pilot mit zwölf Teilnehmenden.",
            passage=("Das Lernlabor plant den ersten Pilot mit zwölf Teilnehmenden "
                     "und wertet die Rückfragen gemeinsam aus."),
            filename="demo-quelle.pdf", quote_verified="exact",
            location={"kind": "page", "start": 2, "end": 2})
        claims.append(ClaimResult(
            claim=f"Synthetische Aussage {index + 1} aus dem Demo-Vortrag.",
            transcript="Synthetischer Satz aus dem Demo-Vortrag.",
            t_ms=at, duration_ms=min(2_000, max(1, duration_ms - at)),
            verdict=verdict, explanation="Synthetischer Seed-Befund ohne Modellaufruf.",
            evidence=evidence, checked=["upload"]))
    return claims


def demo_progress_takes(
    namespace: UUID = NAMESPACE,
    profile_id: UUID = PROFILE_ID,
    notice: str | None = NOTICE,
    *,
    showcase: bool = False,
) -> list[ProgressDemoTake]:
    title_prefix = "Pitch-Training" if showcase else "Synthetische Fortschritts-Demo"
    fixtures = []
    for index, duration in enumerate(DURATIONS):
        identifier = lambda kind: uuid5(namespace, f"progress:{index}:{kind}")
        recorded_at = _recorded_at(index)
        created_at = recorded_at - timedelta(minutes=10)
        word_count = 60 if duration < 60_000 else 200
        words, speaking_ms = _words(word_count, PACE[index], 4_000)
        word_end = words[-1].end_ms
        filler_count = round(FILLER_RATE[index] * word_count / 100)
        gesture_count = round(GESTURE_RATE[index] * duration / 60_000)
        pause_ms = round(PAUSE_SHARE[index] * duration)
        claims = _claims(20, CONTRADICTION_RATE[index], 4_000, max(5_000, word_end),
                         duration, showcase=showcase)

        events = []
        events += _episodes("posture", "trunk-lateral", round(POSTURE_SHARE[index] * duration),
                            4_000, word_end, 7, trunk_delta=8 + index * 0.4)
        events += _episodes("head", "head-orientation", round(HEAD_AWAY_SHARE[index] * duration),
                            6_000, word_end, 5)
        events += _episodes("hands", "arms-closed", round(ARMS_SHARE[index] * duration),
                            8_000, word_end, 4)
        events += _gesture_events(gesture_count, 4_000, word_end)
        events += _filler_events(filler_count, 4_000, word_end)
        pause_events = _pause_events(pause_ms, word_end + 500, duration)
        events += pause_events
        events = [validate_event(event, duration) for event in events]

        analysis = TakeAnalysis(
            words=words,
            audio_summary=AudioSummary(
                duration_ms=duration, active_ms=round(duration * 0.78),
                median_level_db=-24.0, median_f0_hz=132.0,
                f0_range_st=round(3.5 + index * 0.22, 2),
                syllables_per_second=4.1, pause_count=len(pause_events)),
            word_summary=WordSummary(
                word_count=word_count, speaking_duration_ms=speaking_ms,
                words_per_minute=round(word_count / speaking_ms * 60_000, 1),
                pause_count=len(pause_events), filler_count=filler_count,
                repetition_count=0,
                median_window_wpm=round(word_count / speaking_ms * 60_000, 1)),
            asr_provider="local-whisper" if showcase else "synthetic-progress-seed",
            synthetic_demo=False,
            notices=[] if notice is None else [notice],
            factcheck=FactCheckResult(
                claims=claims, events=[], model="synthetic-progress-seed",
                web_provider=None, sources_checked=True,
                config=FactCheckConfig(),
                notices=[] if notice is None else [notice]))
        session = Session(
            session_id=identifier("session"),
            title=f"{title_prefix} · Take {index + 1}",
            profile_id=profile_id, presentation_mode=MODES[index],
            status="review_ready", created_at=created_at,
            capture=Capture(device_key=DEVICE_KEY),
            consent=Consent(granted=True, at=created_at,
                            version="synthetic-progress-seed.v1", scope="local-analysis"))
        take = Take(
            take_id=identifier("take"), session_id=session.session_id,
            profile_id=profile_id, status="review_ready", duration_ms=duration,
            mime_type="video/webm", timebase=Timebase(onstart_perf_ms=0.0),
            recorded_at=recorded_at, recorded_at_source="client",
            coverage=[CoverageInterval(t_ms=0, duration_ms=duration, evaluable=True)],
            analysis=analysis, created_at=created_at)
        fixtures.append(ProgressDemoTake(session, take, events))
    return fixtures


def _reset(connection, namespace: UUID, profile_id: UUID):
    session_ids = [uuid5(namespace, f"progress:{index}:session") for index in range(len(DURATIONS))]
    connection.execute("DELETE FROM sessions WHERE id = ANY(%s)", (session_ids,))
    connection.execute("DELETE FROM speaker_profiles WHERE id=%s", (profile_id,))


def seed_progress_demo(*, reset: bool = False, showcase: bool = False) -> dict:
    namespace = SHOWCASE_NAMESPACE if showcase else NAMESPACE
    profile_id = SHOWCASE_PROFILE_ID if showcase else PROFILE_ID
    profile_token = SHOWCASE_PROFILE_TOKEN if showcase else PROFILE_TOKEN
    profile_name = SHOWCASE_PROFILE_NAME if showcase else PROFILE_NAME
    notice = SHOWCASE_NOTICE if showcase else NOTICE
    token_id = uuid5(namespace, "progress-profile:token")
    fixtures = demo_progress_takes(
        namespace, profile_id, notice, showcase=showcase)
    manifest = {
        "seedVersion": "showcase-progress-seed.v1" if showcase else "synthetic-progress-seed.v1",
        "variant": "showcase" if showcase else "qa",
        "synthetic": True,
        "profileId": str(profile_id),
        "token": profile_token,
        "displayName": profile_name,
        "localStorage": {
            "key": "pitchcoach.progress-profile.v1",
            "value": {
                "profileId": str(profile_id), "token": profile_token,
                "displayName": profile_name,
                "createdAt": _recorded_at(0).isoformat(),
            },
        },
        "inserted": 0, "skipped": 0, "goals": 0, "takes": [],
    }
    retention = datetime.now(timezone.utc) + timedelta(days=365)
    consent = {
        "granted": True, "at": _recorded_at(0).isoformat(),
        "version": "synthetic-progress-seed.v1",
        "scope": "long-term-progress", "retentionUntil": retention.isoformat(),
    }
    with db.connect() as connection, connection.transaction():
        lock_key = "progress-seed-showcase" if showcase else "progress-seed-demo"
        connection.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (lock_key,))
        if reset:
            _reset(connection, namespace, profile_id)
        existing = connection.execute(
            "SELECT id FROM speaker_profiles WHERE id=%s", (profile_id,)).fetchone()
        if existing:
            manifest["skipped"] = len(fixtures)
            return manifest
        connection.execute(
            "INSERT INTO speaker_profiles(id,display_name,locale,consent,retention_until,"
            "retention_origin,created_at,updated_at) VALUES (%s,%s,'de',%s,%s,'default',%s,%s)",
            (profile_id, profile_name, Jsonb(consent), retention,
             _recorded_at(0), _recorded_at(0)))
        connection.execute(
            "INSERT INTO profile_tokens(id,profile_id,token_hash,label) VALUES (%s,%s,%s,%s)",
            (token_id, profile_id, db.token_hash(profile_token),
             "showcase-progress-seed" if showcase else "synthetic-progress-seed"))
        connection.execute(
            "INSERT INTO profile_goals(profile_id,metric_id,metric_version,direction,"
            "target_value,target_min,target_max) VALUES"
            " (%s,'speech.pace_wpm',%s,'increase',120,NULL,NULL),"
            " (%s,'speech.filler_rate_per_100_words',%s,'decrease',2.0,NULL,NULL),"
            " (%s,'speech.pause_share',%s,'target_band',NULL,0.10,0.18),"
            " (%s,'pose.gesture_rate_per_min',%s,'decrease',6.0,NULL,NULL)",
            (profile_id, definitions.METRIC_VERSION, profile_id, definitions.METRIC_VERSION,
             profile_id, definitions.METRIC_VERSION, profile_id, definitions.METRIC_VERSION))
        manifest["goals"] = 4
        for fixture in fixtures:
            session, take = fixture.session, fixture.take
            connection.execute(
                "INSERT INTO sessions(id,title,profile_id,presentation_mode,status,consent,"
                "capture,created_at) VALUES (%s,%s,%s,%s,'review_ready',%s,%s,%s)",
                (session.session_id, session.title, profile_id, session.presentation_mode,
                 Jsonb(service.json_model(session.consent)),
                 Jsonb(service.json_model(session.capture)), session.created_at))
            connection.execute(
                "INSERT INTO takes(id,session_id,profile_id,recorded_at,recorded_at_source,"
                "device_key,status,duration_ms,mime_type,timebase,coverage,analysis,created_at)"
                " VALUES (%s,%s,%s,%s,'client',%s,'events_ready',%s,%s,%s,%s,%s,%s)",
                (take.take_id, session.session_id, profile_id, take.recorded_at, DEVICE_KEY,
                 take.duration_ms, take.mime_type, Jsonb(service.json_model(take.timebase)),
                 Jsonb([service.json_model(item) for item in take.coverage]),
                 Jsonb(service.json_model(take.analysis)), take.created_at))
            review_db.upsert_events(connection, take.take_id, fixture.events)
            connection.execute("UPDATE takes SET status='review_ready' WHERE id=%s", (take.take_id,))
            connection.execute("UPDATE sessions SET status='review_ready' WHERE id=%s", (session.session_id,))
            manifest["takes"].append({"takeId": str(take.take_id), "sessionId": str(session.session_id),
                                      "recordedAt": take.recorded_at.isoformat()})
            manifest["inserted"] += 1
    response = service.progress(profile_id, profile_token, window="all",
                                requested_metrics="all", include_exploratory=True)
    manifest["series"] = {
        item.metric_id: {
            "points": len(item.points),
            "eligible": item.quality.eligible_points,
            "trend": item.trend.status,
            "direction": item.trend.direction,
            "goalStatus": item.goal_status,
        } for item in response.series
    }
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    parser.add_argument("--showcase", action="store_true",
                        help="neutral profile and titles for presentation assets")
    arguments = parser.parse_args()
    print(json.dumps(seed_progress_demo(
        reset=arguments.reset, showcase=arguments.showcase),
        ensure_ascii=False, indent=2))

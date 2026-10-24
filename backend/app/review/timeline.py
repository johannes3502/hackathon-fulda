"""Pure timestamp validation, merge, aggregates and measured pose coverage."""

from statistics import median

from pydantic import ValidationError

from app.review.errors import ReviewError
from app.review.coaching import sentence_pause
from app.review.models import Aggregate, Coverage, MAX_DURATION_MS, PosePayload, ReviewEvent, Take


def validate_event(event: ReviewEvent, duration_ms: int, *, browser=False) -> ReviewEvent:
    if event.t_ms > duration_ms + 1000:
        raise ReviewError(422, "E_EVENT_OUT_OF_RANGE", "Event liegt außerhalb der Take-Dauer.")
    if event.t_ms + event.duration_ms > min(duration_ms + 1000, MAX_DURATION_MS):
        raise ReviewError(422, "E_EVENT_DURATION_INVALID", "Event-Ende liegt außerhalb der Take-Dauer.")
    if not event.t_ms <= event.peak_ms <= event.t_ms + event.duration_ms:
        raise ReviewError(422, "E_PEAK_OUT_OF_RANGE", "peakMs liegt außerhalb des Events.")
    if not event.dedupe_key.strip():
        raise ReviewError(422, "E_DEDUPE_KEY_MISSING", "Dedupe-Key darf nicht leer sein.")
    if browser:
        if event.source != "browser":
            raise ReviewError(422, "E_EVENT_SOURCE_INVALID", "Dieser Endpunkt nimmt nur Browser-Pose-Events an.")
        try:
            pose = PosePayload.model_validate(event.payload)
        except ValidationError as error:
            code = "E_VALID_RATIO_INVALID" if any("validRatio" in str(e["loc"]) or "valid_ratio" in str(e["loc"]) for e in error.errors()) else "E_POSE_PAYLOAD_INVALID"
            raise ReviewError(422, code, "Ungültige Pose-Evidenz; keine rohen Landmarks senden.") from error
        if event.type != pose.category:
            raise ReviewError(422, "E_POSE_CATEGORY_MISMATCH", "Event-Typ und Pose-Kategorie müssen übereinstimmen.")
        event = event.model_copy(update={"payload": pose.model_dump(mode="json", by_alias=True, exclude_none=False),
                                        "rule_version": str(pose.rule.version) if pose.rule else None})
    return event


def merge_events(events: list[ReviewEvent]) -> list[ReviewEvent]:
    final = [item for item in events if item.stage == "final"]
    pauses = sorted((item for item in final if item.type == "pause" and item.source in {"speech", "asr"}),
                    key=lambda item: (item.t_ms, item.peak_ms, item.event_id))
    groups: list[list[ReviewEvent]] = []
    end = -1000
    for event in pauses:
        if not groups or event.t_ms - end >= 500:
            groups.append([])
            end = event.t_ms + event.duration_ms
        groups[-1].append(event)
        end = max(end, event.t_ms + event.duration_ms)
    result = [item for item in final if item not in pauses]
    for group in groups:
        chosen = sorted(group, key=lambda event: (
            -(event.source == "asr" and event.payload.get("mid_sentence") is True),
            -sentence_pause(event),
            -event.duration_ms, event.event_id))[0]
        if len(group) > 1:
            ids = sorted({identifier for event in group for identifier in [event.event_id, *event.payload.get("merged_from", [])]})
            chosen = chosen.model_copy(update={"payload": {**chosen.payload, "merged_from": ids}})
        result.append(chosen)
    return sorted(result, key=lambda event: (event.t_ms, event.peak_ms, event.event_id))


def union_ms(intervals: list[tuple[int, int]]) -> int:
    total, end = 0, -1
    for start, stop in sorted(intervals):
        total += max(0, stop - max(start, end))
        end = max(end, stop)
    return total


def _coverage_segments(take: Take, events: list[ReviewEvent]):
    intervals = [(item.t_ms, item.t_ms + item.duration_ms, item.evaluable,
                  item.reason or "not-evaluable") for item in take.coverage]
    intervals.extend((event.t_ms, min(take.duration_ms, event.t_ms + event.duration_ms), False,
                      event.payload.get("reason") or event.payload.get("kind") or "data-quality")
                     for event in events if event.type in {"framing", "data-quality"})
    boundaries = sorted({0, take.duration_ms, *(max(0, min(take.duration_ms, value))
                         for item in intervals for value in item[:2])})
    for start, end in zip(boundaries, boundaries[1:]):
        active = [item for item in intervals if item[0] <= start and item[1] >= end]
        invalid = sorted({item[3] for item in active if not item[2]})
        yield start, end, invalid, not invalid and any(item[2] for item in active)


def evaluable_intervals(take: Take, events: list[ReviewEvent]) -> list[tuple[int, int]]:
    return [(start, end) for start, end, _, valid in _coverage_segments(take, events) if valid]


def coverage(take: Take, events: list[ReviewEvent]) -> Coverage:
    """Unknown time is never inferred to be valid from absence of findings."""
    valid, reasons = 0, {}
    for start, end, invalid, evaluable in _coverage_segments(take, events):
        if invalid:
            # Multiple reasons may overlap; total coverage is a union, not their sum.
            for reason in invalid:
                reasons[reason] = reasons.get(reason, 0) + end - start
        elif evaluable:
            valid += end - start
        else:
            reasons["coverage-not-reported"] = reasons.get("coverage-not-reported", 0) + end - start
    return Coverage(duration_ms=take.duration_ms, evaluable_ms=valid,
                    not_evaluable_ms=take.duration_ms - valid, reasons=reasons)


def aggregates(events: list[ReviewEvent], duration_ms: int) -> list[Aggregate]:
    result = []
    for category, types, label in (("pose", {"posture", "head", "hands", "gesture"}, "Haltungs-Ereignisse"),
                                    ("voice", {"filler", "pause", "pace", "volume", "pitch"}, "Stimm-Ereignisse"),
                                    ("content", {"fact", "question"}, "Quellen- und Frage-Ereignisse")):
        selected = [event for event in events if event.type in types]
        length = union_ms([(min(event.t_ms, duration_ms), min(event.t_ms + event.duration_ms, duration_ms)) for event in selected])
        result.extend([
            Aggregate(id=f"{category}-events", label=label, value=len(selected), unit="count"),
            Aggregate(id=f"{category}-duration", label=label + " · Dauer", value=length, unit="ms"),
            Aggregate(id=f"{category}-share", label=label + " · Zeitanteil", value=length / duration_ms if duration_ms else 0, unit="ratio"),
            Aggregate(id=f"{category}-longest", label=label + " · längstes Ereignis", value=max((event.duration_ms for event in selected), default=0), unit="ms"),
        ])
    for source, key, unit in (("asr", "window_wpm", "WPM"), ("speech", "window_syllables_per_s", "syllables/s")):
        values = [value for event in events if event.type == "pace" and event.source == source
                  for value in event.payload.get(key, []) if isinstance(value, (int, float))]
        if values:
            result.append(Aggregate(id=f"pace-{source}", label="Worttempo" if source == "asr" else "Silbenrate (Proxy)",
                                    value=median(values), unit=unit))
    return result

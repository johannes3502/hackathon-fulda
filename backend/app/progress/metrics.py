"""Metric extraction from persisted final events and take analysis summaries."""

from __future__ import annotations

import math
from statistics import median

from app.progress import definitions
from app.review.models import ReviewEvent, Take
from app.review.timeline import coverage, evaluable_intervals, union_ms


def _payload(event: ReviewEvent) -> dict:
    return event.payload if isinstance(event.payload, dict) else {}


def _kind(event: ReviewEvent) -> str | None:
    payload = _payload(event)
    return payload.get("kind") or payload.get("rule")


def _valid_ratio(event: ReviewEvent):
    evidence = _payload(event).get("evidence") or {}
    value = evidence.get("validRatio", evidence.get("valid_ratio"))
    return value if isinstance(value, (int, float)) else None


def _rule_versions(events: list[ReviewEvent], *types: str) -> list[str]:
    found = set()
    for event in events:
        if types and event.type not in types:
            continue
        value = event.rule_version
        payload = _payload(event)
        value = value or payload.get("ruleVersion") or payload.get("rule_version")
        raw = payload.get("rule")
        if isinstance(raw, dict):
            value = value or raw.get("version")
        if value is None:
            continue
        text = str(value)
        found.add(f"pose-rules-v{text}" if text.isdigit() else text)
    return sorted(found)


def _rule_version(events: list[ReviewEvent], *types: str) -> str | None:
    versions = _rule_versions(events, *types)
    return ",".join(versions) if versions else None


def _number(value):
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else None


def _ratio(numerator, denominator):
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator


def extract(take: Take, events: list[ReviewEvent]):
    """Return quality plus one metric result per definition."""
    events = [event for event in events if event.stage == "final"]
    measured = coverage(take, events)
    pose_intervals = evaluable_intervals(take, events)
    audio = take.analysis.audio_summary.model_dump() if take.analysis.audio_summary is not None else None
    words = sorted((word.start_ms, word.end_ms) for word in take.analysis.words)
    claims = take.analysis.factcheck.claims if take.analysis.factcheck is not None else None
    checked = [claim for claim in (claims or []) if claim.verdict in
               {"supports", "contradicts", "not_found"}]
    duration = take.duration_ms
    pose_ratio = _ratio(measured.evaluable_ms, duration)
    audio_active = _number(audio.get("active_ms")) if isinstance(audio, dict) else None
    if audio_active is not None and not 0 <= audio_active <= duration:
        audio_active = None
        audio = {**audio, "active_ms": None}
    audio_ratio = _ratio(audio_active, duration)
    valid_values = [_valid_ratio(event) for event in events if event.type in {"posture", "head", "hands"}]
    valid_values = [value for value in valid_values if value is not None]
    pose_valid = median(valid_values) if valid_values else None
    synthetic = take.analysis.synthetic_demo
    global_reasons = []
    if duration < 60_000:
        global_reasons.append("duration-too-short")
    if synthetic:
        global_reasons.append("synthetic-demo")
    available = sum([
        measured.evaluable_ms > 0 and (pose_ratio or 0) >= 0.6,
        bool(audio) and (audio_ratio or 0) >= 0.2,
        len(words) >= 50,
        len(checked) >= 3,
    ])
    status = "poor" if global_reasons or available == 0 else "ok" if available >= 2 else "partial"
    quality = {
        "status": status,
        "global_exclusion_reasons": sorted(set(global_reasons)),
        "pose_coverage_ratio": pose_ratio,
        "pose_valid_ratio": pose_valid,
        "audio_active_ratio": audio_ratio,
        "word_count": len(words),
        "claim_count": len(checked),
        "synthetic_demo": synthetic,
        "quality_version": definitions.QUALITY_VERSION,
    }
    metrics = {}
    for definition in definitions.ALL:
        reasons = list(quality["global_exclusion_reasons"])
        if definition.min_duration_ms and duration < definition.min_duration_ms:
            reasons.append("duration-too-short")
        if definition.min_pose_coverage is not None:
            if measured.evaluable_ms == 0:
                reasons.append("pose-not-evaluable")
            elif (pose_ratio or 0) < definition.min_pose_coverage:
                reasons.append("pose-coverage-low")
            if definition.min_pose_valid_ratio is not None and pose_valid is not None and pose_valid < definition.min_pose_valid_ratio:
                reasons.append("pose-valid-ratio-low")
            if definition.min_pose_valid_ratio is not None and pose_valid is None:
                reasons.append("pose-valid-ratio-unknown")
        if definition.min_audio_active_ratio is not None:
            if not audio:
                reasons.append("audio-missing")
            elif (audio_ratio or 0) < definition.min_audio_active_ratio:
                reasons.append("audio-active-low")
        if definition.min_word_count is not None:
            if not words:
                reasons.append("transcript-missing")
            elif len(words) < definition.min_word_count:
                reasons.append("word-count-low")
        if definition.min_claim_count is not None:
            if claims is None:
                reasons.append("factcheck-missing")
            elif len(checked) < definition.min_claim_count:
                reasons.append("claims-low")
        value, n, denominator, extra_reason, rule_version = _value(
            definition.metric_id, take, events, pose_intervals, audio, words, checked)
        if definition.source == "asr":
            rule_version = f"asr:{take.analysis.asr_provider or 'unknown'}"
        if extra_reason:
            reasons.append(extra_reason)
        if value is None:
            reasons.append("metric-not-computable")
        reasons = sorted(set(reasons))
        metrics[definition.metric_id] = {
            "value": value,
            "unit": definition.unit,
            "n": n,
            "denominator": denominator,
            "rule_version": rule_version,
            "quality": {
                "eligible": not reasons and value is not None,
                "exclusionReasons": reasons,
                "poseCoverage": pose_ratio,
                "poseValidRatio": pose_valid,
                "audioActiveRatio": audio_ratio,
                "wordCount": len(words),
                "claimCount": len(checked),
                "asrProvider": take.analysis.asr_provider,
                "syntheticDemo": synthetic,
                "censored": definition.metric_id == "pose.trunk_lean_peak_deg",
            },
        }
    return quality, metrics


def _event_time(events, intervals):
    return union_ms([(max(event.t_ms, start), min(event.t_ms + event.duration_ms, end))
                     for event in events for start, end in intervals
                     if event.t_ms < end and event.t_ms + event.duration_ms > start])


def _value(metric_id, take, events, pose_intervals, audio, words, checked):
    duration = take.duration_ms
    evaluable = union_ms(pose_intervals)
    if metric_id == "speech.pace_wpm":
        speaking_ms = sum(end - start for start, end in words)
        speaking_ms += sum(
            gap for (_, end), (start, _) in zip(words, words[1:])
            if 0 < (gap := start - end) < 2_000
        )
        value = len(words) / speaking_ms * 60_000 if speaking_ms > 0 else None
        return value, len(words), speaking_ms or None, None, None
    if metric_id == "speech.pause_share":
        pauses = [event for event in events if event.type == "pause"]
        total = _event_time(pauses, [(0, duration)])
        return min(1.0, total / duration) if duration else None, len(pauses), duration or None, None, None
    if metric_id == "speech.filler_rate_per_100_words":
        count = len([event for event in events if event.type == "filler" and _payload(event).get("kind") == "filler"])
        return (count / len(words) * 100 if words else None), count, len(words) or None, None, None
    if metric_id == "speech.pitch_range_st":
        value = _number(audio.get("f0_range_st")) if isinstance(audio, dict) else None
        return value, 1 if value is not None else 0, None, None, None
    if metric_id == "speech.speaking_ratio":
        active = _number(audio.get("active_ms")) if isinstance(audio, dict) else None
        return (_ratio(active, duration) if active is not None else None), 1, duration or None, None, None
    if metric_id == "speech.volume_event_share":
        volume = [event for event in events if event.type == "volume"]
        total = _event_time(volume, [(0, duration)])
        active = _number(audio.get("active_ms")) if isinstance(audio, dict) else None
        return (min(1.0, total / active) if active else None), len(volume), active or None, None, None
    if metric_id == "speech.repetition_rate_per_100_words":
        count = len([event for event in events if event.type == "filler" and _payload(event).get("kind") == "repetition"])
        return (count / len(words) * 100 if words else None), count, len(words) or None, None, None
    if metric_id in {"pose.posture_share", "pose.head_away_share", "pose.arms_crossed_share"}:
        if metric_id == "pose.posture_share":
            selected = [event for event in events if event.type == "posture"]
        elif metric_id == "pose.head_away_share":
            selected = [event for event in events if event.type == "head" and _kind(event) in
                        {"head-orientation", "head-lateral", "head_turned", "head_down"}]
        else:
            selected = [event for event in events if event.type == "hands" and _kind(event) in
                        {"arms-closed", "arms_crossed"}]
        total = _event_time(selected, pose_intervals)
        value = min(1.0, total / evaluable) if evaluable else None
        return value, len(selected), evaluable or None, None, _rule_version(events, "posture", "head", "hands")
    if metric_id == "pose.gesture_rate_per_min":
        selected = [event for event in events if event.type == "gesture"
                    and any(start <= event.peak_ms < end for start, end in pose_intervals)]
        if not any(event.type == "gesture" for event in events):
            return None, 0, evaluable or None, "gesture-measurement-missing", None
        value = len(selected) / evaluable * 60_000 if evaluable else None
        return value, len(selected), evaluable or None, None, _rule_version(events, "gesture")
    if metric_id == "pose.trunk_lean_peak_deg":
        values = []
        for event in events:
            if event.type != "posture" or _kind(event) not in {"trunk-lateral", "torso_lean", "body_shift"}:
                continue
            payload = _payload(event)
            metric = payload.get("metric") or {}
            value = metric.get("delta") if isinstance(metric, dict) else None
            value = value if value is not None else payload.get("measurement")
            if isinstance(value, (int, float)):
                values.append(abs(float(value)))
        return (max(values) if values else None), len(values), None, None, _rule_version(events, "posture")
    if metric_id in {"content.contradiction_rate", "content.supported_rate", "content.not_found_rate"}:
        count = len(checked)
        if count == 0:
            return None, 0, None, None, "factcheck-v1"
        verdict = {"content.contradiction_rate": "contradicts",
                   "content.supported_rate": "supports",
                   "content.not_found_rate": "not_found"}[metric_id]
        hits = len([claim for claim in checked if claim.verdict == verdict])
        return hits / count, count, count, None, "factcheck-v1"
    return None, 0, None, "metric-unknown", None

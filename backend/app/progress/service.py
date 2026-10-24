"""Profile, goal and deterministic progress operations."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

from app.progress import db, definitions, metrics, stats
from app.progress.models import (
    GoalListResponse, GoalRecord, GoalResponse, MetricDefinitionOut,
    MetricProgressResponse, ProfileCreate, ProfileCreateResponse, ProfileGetResponse,
    ProfileIdentity, ProfilePatch, ProfileTake, ProfileTakesResponse, ProgressBaseline,
    ProgressChangePoint, ProgressHighlight, ProgressLatest, ProgressLimitation, ProgressPoint,
    ProgressProfile, ProgressRange, ProgressResponse, ProgressSeries, ProgressSeriesQuality,
    ProgressTrend, TrendWindow,
)
from app.review import db as review_db
from app.review.errors import ReviewError
from app.review.timeline import merge_events

WINDOWS = {"all", "last_20", "last_10", "last_5"}
PRIMARY_LIMITATIONS = [
    ProgressLimitation(code="heuristic-metrics", message=(
        "Die Metriken sind Prototyp-Heuristiken; es gibt keine Genauigkeits- oder Wirksamkeitszusage.")),
    ProgressLimitation(code="missing-is-unknown", message=(
        "Fehlende oder ausgeschlossene Punkte sind unbekannt, nicht 0 und nicht 'gut'.")),
    ProgressLimitation(code="change-not-causal", message=(
        "Change-Points beschreiben beobachtete Niveauänderungen, keine Ursachen.")),
    ProgressLimitation(code="no-score", message=(
        "Kein Gesamtscore, keine Note, kein Ranking und kein Vergleich mit anderen Personen.")),
]


def json_model(value):
    return value.model_dump(mode="json", by_alias=True)


def _profile(row):
    return ProfileIdentity.model_validate(db.profile_identity(row))


def _goal(row):
    if row is None:
        return None
    return GoalRecord.model_validate({
        "metricId": row["metric_id"], "metricVersion": row["metric_version"],
        "direction": row["direction"], "targetValue": row["target_value"],
        "targetMin": row["target_min"], "targetMax": row["target_max"],
        "createdAt": row["created_at"], "updatedAt": row["updated_at"],
    })


def _definition(metric) -> MetricDefinitionOut:
    return MetricDefinitionOut.model_validate({
        "metricId": metric.metric_id, "version": metric.version,
        "label": {"de": metric.label_de, "en": metric.label_en},
        "description": {"de": metric.description_de, "en": metric.description_en},
        "unit": metric.unit, "valueType": metric.value_type,
        "suggestedDirection": metric.suggested_direction, "isPrimary": metric.is_primary,
        "heuristic": metric.heuristic, "source": metric.source,
        "quality": {
            "minDurationMs": metric.min_duration_ms,
            "minPoseCoverage": metric.min_pose_coverage,
            "minPoseValidRatio": metric.min_pose_valid_ratio,
            "minAudioActiveRatio": metric.min_audio_active_ratio,
            "minWordCount": metric.min_word_count,
            "minClaimCount": metric.min_claim_count,
            "deviceSensitive": metric.device_sensitive,
        },
    })


def _require_token(profile_id, token):
    with db.connect() as connection:
        row = db.authenticate(connection, profile_id, token)
        if row["retention_until"] is not None and row["retention_until"] < datetime.now(timezone.utc):
            raise ReviewError(410, "E_PROFILE_EXPIRED", "Die Aufbewahrungsfrist dieses Profils ist abgelaufen.")
        return row


def require_profile_token(profile_id, token):
    return _require_token(profile_id, token)


def authorize_session(session_id, token):
    """Validate X-Profile-Token only when the session is linked to a profile."""
    with db.connect() as connection:
        row = connection.execute("SELECT profile_id FROM sessions WHERE id=%s", (session_id,)).fetchone()
        if row is None:
            raise ReviewError(404, "E_SESSION_NOT_FOUND", "Session nicht gefunden.")
        if row["profile_id"] is not None:
            profile = db.authenticate(connection, row["profile_id"], token)
            if profile["retention_until"] is not None and profile["retention_until"] < datetime.now(timezone.utc):
                raise ReviewError(410, "E_PROFILE_EXPIRED", "Die Aufbewahrungsfrist dieses Profils ist abgelaufen.")
    return True


def authorize_take(take_id, token):
    with db.connect() as connection:
        row = connection.execute(
            "SELECT s.profile_id FROM takes t JOIN sessions s ON s.id=t.session_id WHERE t.id=%s",
            (take_id,)).fetchone()
        if row is None:
            raise ReviewError(404, "E_TAKE_NOT_FOUND", "Take nicht gefunden.")
        if row["profile_id"] is not None:
            profile = db.authenticate(connection, row["profile_id"], token)
            if profile["retention_until"] is not None and profile["retention_until"] < datetime.now(timezone.utc):
                raise ReviewError(410, "E_PROFILE_EXPIRED", "Die Aufbewahrungsfrist dieses Profils ist abgelaufen.")
    return True


def create_profile(request: ProfileCreate, key: str):
    request_hash = db.digest(json_model(request))
    with db.mutation("profiles:create", key, request_hash) as (connection, previous):
        if previous:
            return 200, previous["response"]
        raw_token = db.new_token()
        row = db.create_profile(connection, request, raw_token)
        stored = json_model(ProfileCreateResponse(profile=_profile(row), token=None, token_issued=False))
        db.remember(connection, "profiles:create", key, request_hash, row["id"], 201, stored)
        body = {**stored, "token": raw_token, "tokenIssued": True}
        return 201, body


def get_profile(profile_id, token):
    return ProfileGetResponse(profile=_profile(_require_token(profile_id, token)))


def update_profile(profile_id, request: ProfilePatch, token, key):
    request_hash = db.digest({"profileId": str(profile_id), **json_model(request)})
    scope = f"profiles:{profile_id}:patch"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return 200, previous["response"]
        db.authenticate(connection, profile_id, token)
        row = db.update_profile(connection, profile_id, request)
        body = json_model(ProfileGetResponse(profile=_profile(row)))
        db.remember(connection, scope, key, request_hash, profile_id, 200, body)
        return 200, body


def delete_profile(profile_id, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "delete": True})
    scope = f"profiles:{profile_id}:delete"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return 204, None
        row = connection.execute("SELECT id FROM speaker_profiles WHERE id=%s", (profile_id,)).fetchone()
        if row is None:
            return 204, None
        db.authenticate(connection, profile_id, token)
        db.delete_profile(connection, profile_id)
        db.remember(connection, scope, key, request_hash, None, 204, None)
        return 204, None


def rotate_token(profile_id, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "rotate": True})
    scope = f"profiles:{profile_id}:rotate-token"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return 200, {"token": None, "tokenIssued": False}
        db.authenticate(connection, profile_id, token)
        raw = db.rotate_token(connection, profile_id)
        db.remember(connection, scope, key, request_hash, profile_id, 200,
                    {"token": None, "tokenIssued": False})
        return 200, {"token": raw, "tokenIssued": True}


def _point(take, metric, metric_row, sequence):
    quality = dict(metric_row["quality"]) if metric_row else {}
    reasons = list(quality.get("exclusionReasons", []))
    value = metric_row["value"] if metric_row else None
    eligible = bool(quality.get("eligible", False)) and value is not None
    if metric_row is None:
        reasons.append("metric-not-computable")
    rule_versions = sorted({item for item in (metric_row["rule_version"] or "").split(",") if item})
    return ProgressPoint.model_validate({
        "takeId": take["id"], "sessionId": take["session_id"],
        "recordedAt": take["recorded_at"], "recordedAtSource": take["recorded_at_source"],
        "sequence": sequence, "value": value, "unit": metric.unit, "eligible": eligible,
        "exclusionReasons": sorted(set(reasons)),
        "quality": {
            "poseCoverage": quality.get("poseCoverage"),
            "poseValidRatio": quality.get("poseValidRatio"),
            "audioActiveRatio": quality.get("audioActiveRatio"),
            "wordCount": quality.get("wordCount"),
            "claimCount": quality.get("claimCount"),
            "asrProvider": quality.get("asrProvider"),
            "syntheticDemo": bool(quality.get("syntheticDemo", False)),
        },
        "context": {
            "presentationMode": take["presentation_mode"],
            "durationMs": take["duration_ms"],
            "deviceKey": take["device_key"],
            "ruleVersions": rule_versions,
        },
    })


def _goal_status(goal, trend, values):
    if goal is None:
        return "not_applicable"
    if trend.n < 5 or trend.trend_status == "insufficient":
        return "unknown"
    if goal["direction"] == "target_band":
        low, high = goal["target_min"], goal["target_max"]
        distances = [0.0 if low <= value <= high else min(abs(value - low), abs(value - high))
                     for value in values[-6:]]
        if len(distances) < 2:
            return "unknown"
        distance_trend = stats.analyse(distances)
        if distance_trend.direction == "down":
            return "on_track"
        if distance_trend.direction == "up":
            return "off_track"
        return "unknown"
    wanted = "up" if goal["direction"] == "increase" else "down"
    if trend.trend_status in {"early_signal", "trend_up", "trend_down"}:
        return "on_track" if trend.direction == wanted else "off_track"
    return "unknown"


def _change_point(profile_id, metric, points, values, trend, goal):
    change = stats.cusum_change(values, trend.baseline, trend.noise_band)
    if change is None:
        return None
    if abs(change["magnitude"] or 0) < metric.min_effect:
        return None
    start = max(0, min(change["start_index"], len(points) - 1))
    detected = max(start, min(change["detected_index"], len(points) - 1))
    kind = "step_up" if change["direction"] == "up" else "step_down"
    if goal is not None and goal["direction"] in {"increase", "decrease"}:
        toward = (goal["direction"] == "increase" and change["direction"] == "up") or (
            goal["direction"] == "decrease" and change["direction"] == "down")
        kind = "recovery" if toward else "regression"
    point_id = points[detected].take_id
    return {
        "id": uuid5(NAMESPACE_URL, f"{profile_id}:{metric.metric_id}:{metric.version}:{point_id}:{definitions.ALGORITHM_VERSION}"),
        "profile_id": profile_id, "metric_id": metric.metric_id,
        "metric_version": metric.version, "take_id": point_id,
        "change_started_at_take_id": points[start].take_id, "kind": kind,
        "from_value": change["from_value"], "to_value": change["to_value"],
        "magnitude": change["magnitude"], "confidence": change["confidence"],
        "evidence_take_ids": [point.take_id for point in points[start:detected + 1]],
        "sequence": points[detected].sequence,
        "recorded_at": points[detected].recorded_at,
    }


def _series(profile_id, metric, points, goal, *, version_break=False):
    eligible = [point for point in points if point.eligible and point.value is not None]
    values = [point.value for point in eligible]
    result = stats.analyse(values, total_n=len(points), version_break=version_break)
    baseline_ids = [point.take_id for point in eligible[:3]]
    baseline = ProgressBaseline(
        kind="first_3_eligible" if baseline_ids else "none", value=result.baseline,
        n=len(baseline_ids), take_ids=baseline_ids)
    latest_point = eligible[-1] if eligible else None
    latest = None
    if latest_point:
        latest = ProgressLatest(
            take_id=latest_point.take_id, recorded_at=latest_point.recorded_at,
            value=latest_point.value,
            change_vs_baseline=None if result.recent is None or result.baseline is None
            else result.recent - result.baseline,
            relative_change=result.relative_change,
            z_score=None if not result.noise_band or result.noise_band < 1e-6
            or result.recent is None or result.baseline is None
            else (result.recent - result.baseline) / result.noise_band,
            reliable_change=result.reliable_change)
    window = TrendWindow(
        from_take_id=points[0].take_id if points else None,
        to_take_id=points[-1].take_id if points else None,
        from_recorded_at=points[0].recorded_at if points else None,
        to_recorded_at=points[-1].recorded_at if points else None)
    trend = ProgressTrend(
        status=result.trend_status, direction=result.direction,
        method="theil-sen+mann-kendall+ewma-cusum", algorithm_version=definitions.ALGORITHM_VERSION,
        n=result.n, window=window, slope_per_take=result.slope,
        slope_per_10_takes=result.slope_per_10, slope_ci95=result.slope_ci,
        relative_change=result.relative_change, effect_size=result.effect_size,
        noise_band=result.noise_band,
        minimum_detectable_change=result.minimum_detectable_change,
        mann_kendall_p=result.mann_kendall_p, adjusted_p=None,
        reliable_slope=result.reliable_slope, confidence=result.confidence)
    change = _change_point(profile_id, metric, eligible, values, result, goal)
    goal_status = _goal_status(goal, result, values)
    quality = ProgressSeriesQuality(
        total_points=len(points), eligible_points=len(eligible),
        excluded_points=len(points) - len(eligible),
        missing_points=len([point for point in points if point.value is None]),
        version_break=version_break, rule_versions=sorted({
            item for point in points for item in point.context.rule_versions}),
        status="good" if points and len(eligible) / len(points) >= 0.8 else
               "partial" if eligible else "poor")
    limitations = []
    if version_break:
        limitations.append(ProgressLimitation(code="version-break",
            message="Die Reihe überschreitet eine Regelversion; der Trend ist nicht durchgehend vergleichbar."))
    if len({point.session_id for point in eligible}) < len(eligible):
        trend.confidence = "low"
        limitations.append(ProgressLimitation(code="clustered-takes",
            message="Mehrere auswertbare Takes derselben Session zählen als separate Punkte; die Unabhängigkeit ist eingeschränkt. Für belastbare Trends eine Aufnahme pro Präsentation verwenden."))
    if quality.status != "good":
        limitations.append(ProgressLimitation(code="quality-mix",
            message="Ein Teil der Aufnahmen ist für diese Metrik nicht vergleichbar; Lücken bleiben sichtbar."))
    series = ProgressSeries(
        metric_id=metric.metric_id, metric_version=metric.version,
        label={"de": metric.label_de, "en": metric.label_en}, unit=metric.unit,
        suggested_direction=metric.suggested_direction, is_primary=metric.is_primary,
        heuristic=metric.heuristic, goal=_goal(goal), points=points, baseline=baseline,
        latest=latest, trend=trend, change_points=[], goal_status=goal_status,
        quality=quality, limitations=limitations)
    return series, result, change, eligible


def _selected_ids(connection, profile_id, requested, include_exploratory):
    if requested in (None, "", "primary"):
        ids = list(definitions.PRIMARY_IDS)
        for goal in db.goals(connection, profile_id):
            if goal["metric_id"] not in ids:
                ids.append(goal["metric_id"])
        return ids
    if requested == "all":
        if not include_exploratory:
            return list(definitions.PRIMARY_IDS)
        return list(definitions.PRIMARY_IDS) + list(definitions.EXPLORATORY_IDS)
    ids = [item.strip() for item in requested.split(",") if item.strip()]
    unknown = [item for item in ids if item not in definitions.BY_ID]
    if unknown:
        raise ReviewError(422, "E_METRIC_UNKNOWN", "Unbekannte Metrik.", {"metrics": unknown})
    if not include_exploratory:
        ids = [item for item in ids if item in definitions.PRIMARY_IDS or
               db.goal_for(connection, profile_id, item) is not None]
    return ids


def recompute_profile(profile_id):
    """Rebuild take_quality, take_metrics, snapshots and change points."""
    with db.connect() as connection, connection.transaction():
        db.require_profile(connection, profile_id, lock=True)
        takes = db.take_rows(connection, profile_id)
        db.clear_metrics(connection, profile_id)
        computed = []
        for row in takes:
            take = review_db.take_from(row)
            events = db.events(connection, take.take_id)
            quality, metric_values = metrics.extract(take, events)
            db.upsert_quality(connection, take.take_id, quality)
            for metric_id, item in metric_values.items():
                db.upsert_metric(connection, take.take_id, metric_id, definitions.METRIC_VERSION,
                                 item["value"], item["unit"], item["n"], item["denominator"],
                                 item["rule_version"], item["quality"])
            computed.append((row, quality, metric_values))
        device_baseline = {}
        for row, _, metric_values in computed:
            for metric_id in definitions.EXPLORATORY_IDS:
                definition = definitions.BY_ID[metric_id]
                if not definition.device_sensitive:
                    continue
                item = metric_values.get(metric_id)
                if item and item["quality"]["eligible"] and row["device_key"] is not None:
                    device_baseline.setdefault(metric_id, row["device_key"])
        for row, _, metric_values in computed:
            for metric_id, item in metric_values.items():
                definition = definitions.BY_ID[metric_id]
                if not definition.device_sensitive:
                    continue
                baseline_device = device_baseline.get(metric_id)
                reason = None
                if item["quality"]["eligible"]:
                    if row["device_key"] is None:
                        reason = "device-unknown"
                    elif baseline_device is not None and row["device_key"] != baseline_device:
                        reason = "device-changed"
                if reason:
                    item["quality"]["eligible"] = False
                    item["quality"]["exclusionReasons"] = sorted(
                        set(item["quality"]["exclusionReasons"]) | {reason})
                    db.upsert_metric(connection, row["id"], metric_id, definitions.METRIC_VERSION,
                                     item["value"], item["unit"], item["n"], item["denominator"],
                                     item["rule_version"], item["quality"])
        for metric in definitions.ALL:
            rows = connection.execute(
                "SELECT m.*, t.recorded_at, t.created_at, t.id FROM take_metrics m"
                " JOIN takes t ON t.id=m.take_id WHERE t.profile_id=%s AND m.metric_id=%s"
                " AND m.metric_version=%s ORDER BY t.recorded_at,t.created_at,t.id",
                (profile_id, metric.metric_id, metric.version)).fetchall()
            if not rows:
                continue
            versions = sorted({item for row in rows for item in (row["rule_version"] or "").split(",") if item})
            for window_kind, subset in (
                    ("all", rows), ("last_20", rows[-20:]), ("last_10", rows[-10:]),
                    ("last_5", rows[-5:])):
                if not subset:
                    continue
                subset_values = [row["value"] for row in subset
                                 if row["quality"].get("eligible") and row["value"] is not None]
                result = stats.analyse(subset_values, total_n=len(subset),
                                       version_break=len(versions) > 1)
                goal = db.goal_for(connection, profile_id, metric.metric_id)
                db.upsert_snapshot(connection, {
                    "profile_id": profile_id, "metric_id": metric.metric_id,
                    "metric_version": metric.version, "window_kind": window_kind,
                    "window_end_take_id": subset[-1]["id"], "total_n": len(subset),
                    "eligible_n": len(subset_values), "baseline_value": result.baseline,
                    "latest_value": result.latest, "recent_value": result.recent,
                    "noise_band": result.noise_band, "trend_status": result.trend_status,
                    "goal_status": _goal_status(goal, result, subset_values),
                    "slope_per_take": result.slope, "slope_per_10_takes": result.slope_per_10,
                    "slope_ci_low": result.slope_ci[0] if result.slope_ci else None,
                    "slope_ci_high": result.slope_ci[1] if result.slope_ci else None,
                    "relative_change": result.relative_change, "effect_size": result.effect_size,
                    "minimum_detectable_change": result.minimum_detectable_change,
                    "mann_kendall_p": result.mann_kendall_p, "adjusted_p": None,
                    "method": "theil-sen+mann-kendall+ewma-cusum",
                    "algorithm_version": definitions.ALGORITHM_VERSION,
                    "rule_versions": versions, "version_break": len(versions) > 1,
                    "input_hash": db.digest([(str(row["id"]), row["value"], row["quality"].get("eligible"))
                                             for row in subset]),
                })


def _ensure(profile_id, takes):
    if len(takes) <= 200:
        recompute_profile(profile_id)
        return
    with db.connect() as connection:
        row = connection.execute(
            "SELECT count(*) AS n FROM progress_snapshots WHERE profile_id=%s", (profile_id,)).fetchone()
        if not row or row["n"] == 0:
            recompute_profile(profile_id)


def progress(profile_id, token, *, window="last_20", requested_metrics="primary",
             from_at=None, to_at=None, presentation_mode=None, include_excluded=True,
             include_exploratory=False):
    if window not in WINDOWS:
        raise ReviewError(422, "E_WINDOW_INVALID", "Unbekanntes Fenster.")
    with db.connect() as connection:
        db.authenticate(connection, profile_id, token)
        all_takes = db.take_rows(connection, profile_id)
        _ensure(profile_id, all_takes)
        profile_row = db.require_profile(connection, profile_id)
        goals = {row["metric_id"]: row for row in db.goals(connection, profile_id)}
        selected = _selected_ids(connection, profile_id, requested_metrics, include_exploratory)
        take_rows = db.take_rows(connection, profile_id, from_at=from_at, to_at=to_at,
                                 presentation_mode=presentation_mode)
        window_size = None if window == "all" else int(window.split("_")[1])
        effective_window = window if window_size is None or len(take_rows) >= window_size else "all"
        if window_size is not None and len(take_rows) > window_size:
            take_rows = take_rows[-window_size:]
        metric_rows = {
            (row["take_id"], row["metric_id"]): row
            for row in db.load_metrics(connection, profile_id)
        }
        sequence_by_id = {row["id"]: index for index, row in enumerate(all_takes, 1)}
        series = []
        all_results = {}
        changes = []
        for metric_id in selected:
            metric = definitions.BY_ID[metric_id]
            points = [_point(take, metric, metric_rows.get((take["id"], metric_id)),
                             sequence_by_id[take["id"]]) for take in take_rows]
            if not include_excluded:
                points = [point for point in points if point.eligible]
            version_break = len({item for point in points for item in point.context.rule_versions}) > 1
            item_series, result, change, eligible = _series(
                profile_id, metric, points, goals.get(metric_id), version_break=version_break)
            series.append(item_series)
            all_results[metric_id] = result
            if change:
                changes.append((metric, change, eligible))
        pvalues = {metric_id: result.mann_kendall_p for metric_id, result in all_results.items()
                   if definitions.BY_ID[metric_id].is_primary}
        adjusted = stats.benjamini_hochberg(pvalues)
        for item_series in series:
            item_series.trend.adjusted_p = adjusted.get(item_series.metric_id)
            item_series.goal_status = _goal_status(
                goals.get(item_series.metric_id), all_results[item_series.metric_id],
                [point.value for point in item_series.points if point.eligible and point.value is not None])
        persisted = []
        can_materialize = (from_at is None and to_at is None and presentation_mode is None
                           and include_excluded)
        for metric, change, eligible in changes:
            goal = goals.get(metric.metric_id)
            if change is None or not eligible:
                continue
            item = ProgressChangePoint.model_validate({
                "id": change["id"], "metricId": metric.metric_id, "metricVersion": metric.version,
                "takeId": change["take_id"], "sequence": change["sequence"],
                "recordedAt": change["recorded_at"], "kind": change["kind"],
                "fromValue": change["from_value"], "toValue": change["to_value"],
                "magnitude": change["magnitude"], "confidence": change["confidence"],
                "evidenceTakeIds": change["evidence_take_ids"],
                "algorithmVersion": definitions.ALGORITHM_VERSION,
            })
            persisted.append({**change, "profile_id": profile_id})
            for series_item in series:
                if series_item.metric_id == metric.metric_id:
                    series_item.change_points.append(item)
        if persisted and can_materialize:
            with db.connect() as write_connection, write_connection.transaction():
                db.insert_change_points(write_connection, persisted)
        with db.connect() as write_connection, write_connection.transaction():
            for item_series in series:
                if not item_series.points or not can_materialize:
                    continue
                for window_kind, subset in (
                        ("all", item_series.points),
                        ("last_20", item_series.points[-20:]),
                        ("last_10", item_series.points[-10:]),
                        ("last_5", item_series.points[-5:])):
                    subset_values = [point.value for point in subset if point.eligible and point.value is not None]
                    subset_result = stats.analyse(subset_values, total_n=len(subset),
                                                  version_break=item_series.quality.version_break)
                    db.upsert_snapshot(write_connection, {
                        "profile_id": profile_id, "metric_id": item_series.metric_id,
                        "metric_version": item_series.metric_version, "window_kind": window_kind,
                        "window_end_take_id": subset[-1].take_id, "total_n": len(subset),
                        "eligible_n": len(subset_values), "baseline_value": subset_result.baseline,
                        "latest_value": subset_result.latest, "recent_value": subset_result.recent,
                        "noise_band": subset_result.noise_band,
                        "trend_status": subset_result.trend_status,
                        "goal_status": item_series.goal_status,
                        "slope_per_take": subset_result.slope,
                        "slope_per_10_takes": subset_result.slope_per_10,
                        "slope_ci_low": subset_result.slope_ci[0] if subset_result.slope_ci else None,
                        "slope_ci_high": subset_result.slope_ci[1] if subset_result.slope_ci else None,
                        "relative_change": subset_result.relative_change,
                        "effect_size": subset_result.effect_size,
                        "minimum_detectable_change": subset_result.minimum_detectable_change,
                        "mann_kendall_p": subset_result.mann_kendall_p,
                        "adjusted_p": item_series.trend.adjusted_p,
                        "method": "theil-sen+mann-kendall+ewma-cusum",
                        "algorithm_version": definitions.ALGORITHM_VERSION,
                        "rule_versions": item_series.quality.rule_versions,
                        "version_break": item_series.quality.version_break,
                        "input_hash": db.digest([(str(point.take_id), point.value, point.eligible)
                                                 for point in subset]),
                    })
        total_takes = len(all_takes)
        eligible_takes = len({row["take_id"] for row in db.load_metrics(connection, profile_id)
                              if row["metric_id"] in definitions.PRIMARY_IDS
                              and row["quality"].get("eligible")})
        identity = _profile(profile_row)
        profile = ProgressProfile(
            profile_id=identity.profile_id, display_name=identity.display_name,
            locale=identity.locale, created_at=identity.created_at, consent=identity.consent,
            total_takes=total_takes, eligible_takes=eligible_takes,
            first_recorded_at=all_takes[0]["recorded_at"] if all_takes else None,
            last_recorded_at=all_takes[-1]["recorded_at"] if all_takes else None)
        limitations = list(PRIMARY_LIMITATIONS)
        if any(item.quality.version_break for item in series):
            limitations.append(ProgressLimitation(code="version-break",
                message="Mindestens eine Reihe überschreitet eine Regelversion."))
        return ProgressResponse(
            generated_at=datetime.now(timezone.utc), profile=profile,
            range=ProgressRange(from_=from_at, to=to_at, window=effective_window,
                                presentation_mode=presentation_mode),
            metric_definitions=[_definition(definitions.BY_ID[item]) for item in selected],
            series=series, highlights=_highlights(series), limitations=limitations)


def _highlights(series):
    result = []
    for item in series:
        if item.trend.status == "trend_up":
            result.append(ProgressHighlight(kind="trend_up", metric_id=item.metric_id,
                take_id=item.trend.window.to_take_id, sequence=item.points[-1].sequence if item.points else None,
                text_key="progress.trend.up", params={"metric": item.metric_id}))
        elif item.trend.status == "trend_down":
            result.append(ProgressHighlight(kind="trend_down", metric_id=item.metric_id,
                take_id=item.trend.window.to_take_id, sequence=item.points[-1].sequence if item.points else None,
                text_key="progress.trend.down", params={"metric": item.metric_id}))
        if item.goal_status == "on_track":
            result.append(ProgressHighlight(kind="goal_on_track", metric_id=item.metric_id,
                take_id=item.latest.take_id if item.latest else None,
                sequence=None, text_key="progress.goal.on_track", params={"metric": item.metric_id}))
        elif item.goal_status == "off_track":
            result.append(ProgressHighlight(kind="goal_off_track", metric_id=item.metric_id,
                take_id=item.latest.take_id if item.latest else None,
                sequence=None, text_key="progress.goal.off_track", params={"metric": item.metric_id}))
        for change in item.change_points:
            result.append(ProgressHighlight(kind="change_point", metric_id=item.metric_id,
                take_id=change.take_id, sequence=change.sequence,
                text_key=f"progress.change.{change.kind}", params={"metric": item.metric_id}))
        if item.quality.status != "good":
            result.append(ProgressHighlight(kind="quality_warning", metric_id=item.metric_id,
                take_id=None, sequence=None, text_key="progress.quality.partial",
                params={"metric": item.metric_id}))
    return result[:12]


def metric_progress(profile_id, token, metric_id, **kwargs):
    response = progress(profile_id, token, requested_metrics=metric_id, **kwargs)
    return MetricProgressResponse(generated_at=response.generated_at, profile=response.profile,
                                  range=response.range, series=response.series[0])


def goals(profile_id, token):
    with db.connect() as connection:
        db.authenticate(connection, profile_id, token)
        return GoalListResponse(goals=[_goal(row) for row in db.goals(connection, profile_id)])


def set_goal(profile_id, metric_id, request, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "metric": metric_id, **json_model(request)})
    scope = f"profiles:{profile_id}:goals:{metric_id}"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return 200, previous["response"]
        db.authenticate(connection, profile_id, token)
        row = db.put_goal(connection, profile_id, metric_id, request)
        body = json_model(GoalResponse(goal=_goal(row)))
        db.remember(connection, scope, key, request_hash, profile_id, 200, body)
        return 200, body


def remove_goal(profile_id, metric_id, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "metric": metric_id, "delete": True})
    scope = f"profiles:{profile_id}:goals:{metric_id}:delete"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return 204, None
        db.authenticate(connection, profile_id, token)
        db.delete_goal(connection, profile_id, metric_id)
        db.remember(connection, scope, key, request_hash, profile_id, 204, None)
        return 204, None


def takes(profile_id, token, *, limit=50, cursor=None):
    with db.connect() as connection:
        db.authenticate(connection, profile_id, token)
        offset = max(0, int(cursor or 0))
        rows = connection.execute(
            "SELECT t.*, s.presentation_mode FROM takes t JOIN sessions s ON s.id=t.session_id"
            " WHERE t.profile_id=%s ORDER BY t.recorded_at,t.created_at,t.id LIMIT %s OFFSET %s",
            (profile_id, min(max(limit, 1), 200), offset)).fetchall()
        items = [ProfileTake.model_validate({
            "takeId": row["id"], "sessionId": row["session_id"],
            "recordedAt": row["recorded_at"], "recordedAtSource": row["recorded_at_source"],
            "durationMs": row["duration_ms"], "status": row["status"],
            "presentationMode": row["presentation_mode"]}) for row in rows]
        return ProfileTakesResponse(takes=items,
                                    next_cursor=str(offset + len(items)) if len(items) == limit else None)


def export(profile_id, token, *, format="json"):
    response = progress(profile_id, token, window="all", requested_metrics="all",
                        include_excluded=True, include_exploratory=True)
    if format == "json":
        with db.connect() as connection:
            quality = [dict(row) for row in connection.execute(
                "SELECT q.* FROM take_quality q JOIN takes t ON t.id=q.take_id"
                " WHERE t.profile_id=%s ORDER BY q.take_id", (profile_id,)).fetchall()]
            metric_rows = [dict(row) for row in db.load_metrics(connection, profile_id)]
        content = json.dumps({"progress": json_model(response), "takeQuality": quality,
                              "takeMetrics": metric_rows}, ensure_ascii=False, default=str)
        return content, f"progress-{profile_id}.json", "application/json"
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["takeId", "recordedAt", "metricId", "metricVersion", "value", "unit",
                     "eligible", "exclusionReasons", "goalDirection", "goalTarget",
                     "goalTargetMin", "goalTargetMax"])
    for series in response.series:
        goal = series.goal
        for point in series.points:
            writer.writerow([_csv_safe(point.take_id), _csv_safe(point.recorded_at.isoformat()),
                             _csv_safe(series.metric_id), series.metric_version,
                             "" if point.value is None else point.value, series.unit,
                             str(point.eligible).lower(), _csv_safe(";".join(point.exclusion_reasons)),
                             "" if goal is None else goal.direction,
                             "" if goal is None or goal.target_value is None else goal.target_value,
                             "" if goal is None or goal.target_min is None else goal.target_min,
                             "" if goal is None or goal.target_max is None else goal.target_max])
    return output.getvalue(), f"progress-{profile_id}.csv", "text/csv"


def _csv_safe(value):
    text = str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@")) else text

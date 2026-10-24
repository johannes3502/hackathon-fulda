"""Profile, goal and deterministic progress operations."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from uuid import UUID, uuid5, NAMESPACE_URL

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
        return db.authenticate(connection, profile_id, token)


def require_profile_token(profile_id, token):
    return _require_token(profile_id, token)


def authorize_resource(params, token, *, deleting=False):
    """Anonymous reviews keep their existing access; linked resources require the profile token."""
    queries = {
        "session_id": "SELECT profile_id FROM sessions WHERE id=%s",
        "take_id": "SELECT profile_id FROM takes WHERE id=%s",
        "job_id": "SELECT t.profile_id FROM jobs j JOIN takes t ON t.id=j.take_id WHERE j.id=%s",
    }
    with db.connect() as connection:
        for name, query in queries.items():
            if name not in params:
                continue
            try:
                resource_id = UUID(str(params[name]))
            except ValueError:
                return  # Let FastAPI report invalid UUIDs as 422.
            row = connection.execute(query, (resource_id,)).fetchone()
            if row is not None and row["profile_id"] is not None:
                db.authenticate(connection, row["profile_id"], token, allow_expired=deleting)
            break


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
    request_hash = db.digest({"profileId": str(profile_id), **request.model_dump(mode="json", by_alias=True, exclude_unset=True)})
    scope = f"profiles:{profile_id}:patch"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        db.authenticate(connection, profile_id, token, lock=True)
        if previous:
            return 200, previous["response"]
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
        db.authenticate(connection, profile_id, token, allow_expired=True, lock=True)
        db.delete_profile(connection, profile_id)
        db.remember(connection, scope, key, request_hash, None, 204, None)
        return 204, None


def rotate_token(profile_id, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "rotate": True})
    scope = f"profiles:{profile_id}:rotate-token"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        db.authenticate(connection, profile_id, token, lock=True)
        if previous:
            return 200, {"token": None, "tokenIssued": False}
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
    rule_versions = sorted({item for item in ((metric_row or {}).get("rule_version") or "").split(",") if item})
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
    if trend.n < 5 or trend.trend_status in {"insufficient", "unclear"}:
        return "unknown"
    if goal["direction"] == "target_band":
        low, high = goal["target_min"], goal["target_max"]
        distances = [0.0 if low <= value <= high else min(abs(value - low), abs(value - high))
                     for value in values[-6:]]
        if len(distances) < 2:
            return "unknown"
        distance_trend = stats.analyse(distances)
        if distance_trend.trend_status not in {"early_signal", "trend_up", "trend_down"}:
            return "unknown"
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
    result = stats.analyse(values, positions=[point.sequence for point in eligible],
                           total_n=len(points), version_break=version_break)
    baseline_ids = [point.take_id for point in eligible[:3]] if not version_break else []
    baseline = ProgressBaseline(
        kind="first_3_eligible" if baseline_ids else "none", value=result.baseline,
        n=len(baseline_ids), take_ids=baseline_ids)
    latest_point = eligible[-1] if eligible else None
    latest = None
    if latest_point:
        latest = ProgressLatest(
            take_id=latest_point.take_id, recorded_at=latest_point.recorded_at,
            value=latest_point.value,
            change_vs_baseline=None if result.baseline is None else latest_point.value - result.baseline,
            relative_change=None if result.baseline in (None, 0)
            else (latest_point.value - result.baseline) / result.baseline,
            z_score=None if not result.noise_band or result.noise_band < 1e-6
            or result.baseline is None
            else (latest_point.value - result.baseline) / result.noise_band,
            reliable_change=bool(result.n >= 5 and result.minimum_detectable_change
                                 and result.baseline is not None
                                 and abs(latest_point.value - result.baseline) >= result.minimum_detectable_change))
    window = TrendWindow(
        from_take_id=points[0].take_id if points else None,
        to_take_id=points[-1].take_id if points else None,
        from_recorded_at=points[0].recorded_at if points else None,
        to_recorded_at=points[-1].recorded_at if points else None)
    trend = ProgressTrend(
        status=result.trend_status, direction=result.direction,
        method="theil-sen+mann-kendall+cusum", algorithm_version=definitions.ALGORITHM_VERSION,
        n=result.n, window=window, slope_per_take=result.slope,
        slope_per_10_takes=result.slope_per_10, slope_ci95=result.slope_ci,
        relative_change=result.relative_change, effect_size=result.effect_size,
        noise_band=result.noise_band,
        minimum_detectable_change=result.minimum_detectable_change,
        mann_kendall_p=result.mann_kendall_p, adjusted_p=None,
        reliable_slope=result.reliable_slope, confidence=result.confidence)
    has_gaps = any(b.sequence != a.sequence + 1 for a, b in zip(eligible, eligible[1:]))
    change = None if version_break or has_gaps else _change_point(profile_id, metric, eligible, values, result, goal)
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
    if has_gaps:
        limitations.append(ProgressLimitation(code="gaps-no-change-points",
            message="Die Messreihe enthält Lücken; Change-Points werden deshalb nicht bestimmt."))
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
    ids = list(dict.fromkeys(item.strip() for item in requested.split(",") if item.strip()))
    unknown = [item for item in ids if item not in definitions.BY_ID]
    if unknown:
        raise ReviewError(422, "E_METRIC_UNKNOWN", "Unbekannte Metrik.", {"metrics": unknown})
    if not include_exploratory:
        ids = [item for item in ids if item in definitions.PRIMARY_IDS or
               db.goal_for(connection, profile_id, item) is not None]
    return ids


def _ensure_metrics(connection, takes):
    """Refresh changed takes once; review revisions invalidate the derived values."""
    if not takes:
        return {}
    rows = db.load_metrics(connection, takes[0]["profile_id"])
    stored = {(row["take_id"], row["metric_id"]): row for row in rows
              if row["metric_id"] in definitions.BY_ID
              and row["metric_version"] == definitions.BY_ID[row["metric_id"]].version}
    for row in takes:
        dirty = any(
            (item := stored.get((row["id"], definition.metric_id))) is None
            or item["quality"].get("sourceRevision") != row["revision"]
            or item["computation_version"] != definitions.COMPUTATION_VERSION
            for definition in definitions.ALL)
        if not dirty:
            continue
        take = review_db.take_from(row)
        quality, values = metrics.extract(take, db.events(connection, take.take_id))
        db.upsert_quality(connection, take.take_id, quality)
        for metric_id, item in values.items():
            item["quality"]["sourceRevision"] = row["revision"]
            version = definitions.BY_ID[metric_id].version
            db.upsert_metric(connection, take.take_id, metric_id, version,
                             item["value"], item["unit"], item["n"], item["denominator"],
                             item["rule_version"], item["quality"])
            stored[(take.take_id, metric_id)] = {**item, "metric_version": version}
    # Re-evaluate device gates after deletions or backdated inserts as well.
    for definition in definitions.ALL:
        if not definition.device_sensitive:
            continue
        baseline_device = None
        for row in takes:
            item = stored[(row["id"], definition.metric_id)]
            quality = dict(item["quality"])
            reasons = set(quality["exclusionReasons"]) - {"device-unknown", "device-changed"}
            if not reasons and item["value"] is not None:
                device = row["device_key"]
                if device is None:
                    reasons.add("device-unknown")
                elif baseline_device is None:
                    baseline_device = device
                elif device != baseline_device:
                    reasons.add("device-changed")
            quality.update(eligible=not reasons and item["value"] is not None,
                           exclusionReasons=sorted(reasons))
            if quality != item["quality"]:
                db.upsert_metric(connection, row["id"], definition.metric_id, definition.version,
                                 item["value"], item["unit"], item["n"], item["denominator"],
                                 item["rule_version"], quality)
                item["quality"] = quality
    return stored


def _snapshot(profile_id, series, result, window):
    return {
        "profile_id": profile_id, "metric_id": series.metric_id,
        "metric_version": series.metric_version, "window_kind": window,
        "window_end_take_id": series.points[-1].take_id,
        "total_n": series.quality.total_points, "eligible_n": result.n,
        "baseline_value": result.baseline, "latest_value": result.latest,
        "recent_value": result.recent, "noise_band": result.noise_band,
        "trend_status": series.trend.status, "goal_status": series.goal_status,
        "slope_per_take": result.slope, "slope_per_10_takes": result.slope_per_10,
        "slope_ci_low": result.slope_ci[0] if result.slope_ci else None,
        "slope_ci_high": result.slope_ci[1] if result.slope_ci else None,
        "relative_change": result.relative_change, "effect_size": result.effect_size,
        "minimum_detectable_change": result.minimum_detectable_change,
        "mann_kendall_p": result.mann_kendall_p, "adjusted_p": series.trend.adjusted_p,
        "method": series.trend.method, "algorithm_version": definitions.ALGORITHM_VERSION,
        "rule_versions": series.quality.rule_versions, "version_break": series.quality.version_break,
        "input_hash": db.digest({"points": [json_model(point) for point in series.points],
                                 "goal": json_model(series.goal) if series.goal else None}),
    }


def _validate_filters(window, from_at, to_at, presentation_mode):
    if window not in WINDOWS:
        raise ReviewError(422, "E_WINDOW_INVALID", "Unbekanntes Fenster.")
    if any(value is not None and value.tzinfo is None for value in (from_at, to_at)):
        raise ReviewError(422, "E_RANGE_INVALID", "Zeitraum muss eine Zeitzone enthalten.")
    if from_at is not None and to_at is not None and from_at > to_at:
        raise ReviewError(422, "E_RANGE_INVALID", "Der Beginn muss vor dem Ende liegen.")
    if presentation_mode not in (None, "startup", "thesis", "school", "nonprofit"):
        raise ReviewError(422, "E_PRESENTATION_MODE_INVALID", "Unbekannter Präsentationstyp.")


def recompute_profile(profile_id, connection):
    """Worker-only rebuild, using the worker's transaction and profile lock."""
    row = db.require_profile(connection, profile_id, lock=True)
    if row["retention_until"] is not None and row["retention_until"] <= datetime.now(timezone.utc):
        raise ReviewError(410, "E_PROFILE_EXPIRED", "Die Aufbewahrungsfrist dieses Profils ist abgelaufen.")
    db.clear_metrics(connection, profile_id)
    return _progress(connection, row, window="all", requested_metrics="all", include_exploratory=True)


def progress(profile_id, token, *, window="last_20", requested_metrics="primary",
             from_at=None, to_at=None, presentation_mode=None, include_excluded=True,
             include_exploratory=False):
    _validate_filters(window, from_at, to_at, presentation_mode)
    with db.connect() as connection, connection.transaction():
        row = db.authenticate(connection, profile_id, token, lock=True)
        return _progress(connection, row, window=window, requested_metrics=requested_metrics,
                         from_at=from_at, to_at=to_at, presentation_mode=presentation_mode,
                         include_excluded=include_excluded, include_exploratory=include_exploratory)


def _progress(connection, profile_row, *, window="last_20", requested_metrics="primary",
              from_at=None, to_at=None, presentation_mode=None, include_excluded=True,
              include_exploratory=False):
    profile_id = profile_row["id"]
    selected = _selected_ids(connection, profile_id, requested_metrics, include_exploratory)
    all_takes = db.take_rows(connection, profile_id)
    metric_rows = _ensure_metrics(connection, all_takes)
    take_rows = [row for row in all_takes
                 if (from_at is None or row["recorded_at"] >= from_at)
                 and (to_at is None or row["recorded_at"] <= to_at)
                 and (presentation_mode is None or row["presentation_mode"] == presentation_mode)]
    window_size = None if window == "all" else int(window.split("_")[1])
    if window_size is not None:
        take_rows = take_rows[-window_size:]
    sequence_by_id = {row["id"]: index for index, row in enumerate(all_takes, 1)}
    goals = {row["metric_id"]: row for row in db.goals(connection, profile_id)}
    series, results, changes = {}, {}, {}
    # Keep the diagnostic BH family fixed when the client selects one metric.
    analysis_ids = list(dict.fromkeys([*definitions.PRIMARY_IDS, *selected]))
    for metric_id in analysis_ids:
        metric = definitions.BY_ID[metric_id]
        points = [_point(take, metric, metric_rows.get((take["id"], metric_id)),
                         sequence_by_id[take["id"]]) for take in take_rows]
        versions = {tuple(point.context.rule_versions) for point in points if point.eligible}
        item, result, change, _ = _series(
            profile_id, metric, points, goals.get(metric_id),
            version_break=len(versions) > 1 or any(len(version) > 1 for version in versions))
        series[metric_id], results[metric_id], changes[metric_id] = item, result, change
    adjusted = stats.benjamini_hochberg({metric_id: results[metric_id].mann_kendall_p
                                        for metric_id in definitions.PRIMARY_IDS})
    can_materialize = from_at is None and to_at is None and presentation_mode is None
    for metric_id, item in series.items():
        item.trend.adjusted_p = adjusted.get(metric_id)
        change = changes[metric_id]
        if change:
            item.change_points.append(ProgressChangePoint(
                id=change["id"], metric_id=metric_id, metric_version=item.metric_version,
                take_id=change["take_id"], sequence=change["sequence"], recorded_at=change["recorded_at"],
                kind=change["kind"], from_value=change["from_value"], to_value=change["to_value"],
                magnitude=change["magnitude"], confidence=change["confidence"],
                evidence_take_ids=change["evidence_take_ids"], algorithm_version=definitions.ALGORITHM_VERSION))
            if can_materialize:
                db.insert_change_points(connection, [change])
        if item.points and can_materialize:
            db.upsert_snapshot(connection, _snapshot(profile_id, item, results[metric_id], window))
    eligible_takes = len({take_id for (take_id, metric_id), row in metric_rows.items()
                          if metric_id in definitions.PRIMARY_IDS and row["quality"].get("eligible")})
    profile = ProgressProfile(**_profile(profile_row).model_dump(), total_takes=len(all_takes),
                              eligible_takes=eligible_takes,
                              first_recorded_at=all_takes[0]["recorded_at"] if all_takes else None,
                              last_recorded_at=all_takes[-1]["recorded_at"] if all_takes else None)
    selected_series = [series[metric_id] for metric_id in selected]
    limitations = list(PRIMARY_LIMITATIONS)
    if any(item.quality.version_break for item in selected_series):
        limitations.append(ProgressLimitation(code="version-break",
                                              message="Mindestens eine Reihe überschreitet eine Regelversion."))
    highlights = _highlights(selected_series)
    if not include_excluded:
        for item in selected_series:
            item.points = [point for point in item.points if point.eligible]
    return ProgressResponse(
        generated_at=datetime.now(timezone.utc), profile=profile,
        range=ProgressRange(from_=from_at, to=to_at, window=window, presentation_mode=presentation_mode),
        metric_definitions=[_definition(definitions.BY_ID[item]) for item in selected],
        series=selected_series, highlights=highlights, limitations=limitations)


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
    if metric_id not in definitions.BY_ID:
        raise ReviewError(422, "E_METRIC_UNKNOWN", "Unbekannte Metrik.")
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
        db.authenticate(connection, profile_id, token, lock=True)
        if previous:
            return 200, previous["response"]
        row = db.put_goal(connection, profile_id, metric_id, request)
        body = json_model(GoalResponse(goal=_goal(row)))
        db.remember(connection, scope, key, request_hash, profile_id, 200, body)
        return 200, body


def remove_goal(profile_id, metric_id, token, key):
    request_hash = db.digest({"profileId": str(profile_id), "metric": metric_id, "delete": True})
    scope = f"profiles:{profile_id}:goals:{metric_id}:delete"
    with db.mutation(scope, key, request_hash) as (connection, previous):
        db.authenticate(connection, profile_id, token, lock=True)
        if previous:
            return 204, None
        db.delete_goal(connection, profile_id, metric_id)
        db.remember(connection, scope, key, request_hash, profile_id, 204, None)
        return 204, None


def takes(profile_id, token, *, limit=50, cursor=None):
    with db.connect() as connection:
        db.authenticate(connection, profile_id, token)
        if cursor is not None and (not cursor.isascii() or not cursor.isdecimal() or len(cursor) > 10):
            raise ReviewError(422, "E_CURSOR_INVALID", "Ungültiger Cursor.")
        offset = int(cursor or 0)
        rows = connection.execute(
            "SELECT t.*, s.presentation_mode FROM takes t JOIN sessions s ON s.id=t.session_id"
            " WHERE t.profile_id=%s ORDER BY t.recorded_at,t.created_at,t.id LIMIT %s OFFSET %s",
            (profile_id, limit + 1, offset)).fetchall()
        items = [ProfileTake.model_validate({
            "takeId": row["id"], "sessionId": row["session_id"],
            "recordedAt": row["recorded_at"], "recordedAtSource": row["recorded_at_source"],
            "durationMs": row["duration_ms"], "status": row["status"],
            "presentationMode": row["presentation_mode"]}) for row in rows[:limit]]
        return ProfileTakesResponse(takes=items,
                                    next_cursor=str(offset + len(items)) if len(rows) > limit else None)


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

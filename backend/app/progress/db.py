"""Persistence helpers for profiles, goals and the progress read model."""

from __future__ import annotations

import hashlib
import json
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from app.progress import definitions
from app.progress.schema import PROGRESS_SCHEMA
from app.review import db as review_db
from app.review.errors import ReviewError

_schema_ready = False


def connect():
    global _schema_ready
    connection = review_db.connect()
    if _schema_ready:
        return connection
    try:
        with connection.transaction():
            connection.execute("SELECT pg_advisory_xact_lock(hashtext('progress-schema-v1'))")
            connection.execute(PROGRESS_SCHEMA)
            _seed_metrics(connection)
        _schema_ready = True
        return connection
    except BaseException:
        connection.close()
        raise


def _seed_metrics(connection):
    for metric in definitions.ALL:
        connection.execute(
            "INSERT INTO metric_definitions(metric_id,version,label_de,label_en,description_de,"
            "description_en,unit,value_type,suggested_direction,is_primary,heuristic,source,"
            "noise_floor,min_duration_ms,min_pose_coverage,min_pose_valid_ratio,"
            "min_audio_active_ratio,min_word_count,min_claim_count,device_sensitive)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
            " ON CONFLICT(metric_id,version) DO NOTHING",
            (metric.metric_id, metric.version, metric.label_de, metric.label_en,
             metric.description_de, metric.description_en, metric.unit, metric.value_type,
             metric.suggested_direction, metric.is_primary, metric.heuristic, metric.source,
             metric.noise_floor, metric.min_duration_ms, metric.min_pose_coverage,
             metric.min_pose_valid_ratio, metric.min_audio_active_ratio, metric.min_word_count,
             metric.min_claim_count, metric.device_sensitive))


def digest(value) -> str:
    return "sha256:" + hashlib.sha256(json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False,
        default=str).encode()).hexdigest()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> str:
    return "pp_" + secrets.token_urlsafe(32)


def _consent_out(consent) -> dict:
    return {
        "scope": "long-term-progress",
        "version": consent.get("version", ""),
        "grantedAt": consent.get("at"),
        "retentionUntil": consent.get("retentionUntil"),
    }


def profile_identity(row) -> dict:
    return {
        "profileId": row["id"],
        "displayName": row["display_name"],
        "locale": row["locale"],
        "createdAt": row["created_at"],
        "consent": _consent_out(row["consent"]),
    }


def require_profile(connection, profile_id, *, lock=False):
    suffix = " FOR UPDATE" if lock else ""
    row = connection.execute(
        "SELECT * FROM speaker_profiles WHERE id=%s" + suffix, (profile_id,)).fetchone()
    if row is None:
        raise ReviewError(404, "E_PROFILE_NOT_FOUND", "Profil nicht gefunden.")
    return row


def authenticate(connection, profile_id, token, *, allow_expired=False, lock=False):
    if not token:
        raise ReviewError(401, "E_PROFILE_TOKEN_INVALID", "Profil-Token fehlt.")
    row = connection.execute(
        "SELECT p.*, t.id AS token_id, t.last_used_at FROM speaker_profiles p"
        " JOIN profile_tokens t ON t.profile_id=p.id"
        " WHERE p.id=%s AND t.token_hash=%s AND t.revoked_at IS NULL"
        + (" FOR UPDATE OF p" if lock else ""),
        (profile_id, token_hash(token))).fetchone()
    if row is None:
        raise ReviewError(401, "E_PROFILE_TOKEN_INVALID", "Profil-Token ist ungültig.")
    if (not allow_expired and row["retention_until"] is not None
            and row["retention_until"] <= datetime.now(timezone.utc)):
        raise ReviewError(410, "E_PROFILE_EXPIRED", "Die Aufbewahrungsfrist dieses Profils ist abgelaufen.")
    if row["last_used_at"] is None or row["last_used_at"] < datetime.now(timezone.utc) - timedelta(hours=1):
        connection.execute("UPDATE profile_tokens SET last_used_at=now() WHERE id=%s", (row["token_id"],))
    return row


def create_profile(connection, request, raw_token):
    profile_id = uuid4()
    consent = request.consent.model_dump(mode="json", by_alias=True)
    row = connection.execute(
        "INSERT INTO speaker_profiles(id,display_name,locale,consent,retention_until)"
        " VALUES (%s,%s,%s,%s,%s) RETURNING *",
        (profile_id, request.display_name, request.locale, Jsonb(consent),
         request.consent.retention_until)).fetchone()
    connection.execute(
        "INSERT INTO profile_tokens(id,profile_id,token_hash,label) VALUES (%s,%s,%s,%s)",
        (uuid4(), profile_id, token_hash(raw_token), "browser"))
    return row


def update_profile(connection, profile_id, request):
    current = require_profile(connection, profile_id, lock=True)
    display_name = current["display_name"] if request.display_name is None else request.display_name
    locale = current["locale"] if request.locale is None else request.locale
    retention = current["retention_until"]
    consent = dict(current["consent"])
    if "retention_until" in request.model_fields_set:
        retention = request.retention_until
        consent["retentionUntil"] = retention.isoformat() if retention is not None else None
    return connection.execute(
        "UPDATE speaker_profiles SET display_name=%s,locale=%s,retention_until=%s,consent=%s,"
        "updated_at=now() WHERE id=%s RETURNING *",
        (display_name, locale, retention, Jsonb(consent), profile_id)).fetchone()


def rotate_token(connection, profile_id):
    raw = new_token()
    connection.execute("UPDATE profile_tokens SET revoked_at=now()"
                       " WHERE profile_id=%s AND revoked_at IS NULL", (profile_id,))
    connection.execute("INSERT INTO profile_tokens(id,profile_id,token_hash,label)"
                       " VALUES (%s,%s,%s,%s)", (uuid4(), profile_id, token_hash(raw), "rotation"))
    return raw


def delete_profile(connection, profile_id):
    row = connection.execute("SELECT id FROM speaker_profiles WHERE id=%s FOR UPDATE",
                             (profile_id,)).fetchone()
    if row is None:
        return False
    ids = [item["id"] for item in connection.execute(
        "SELECT id FROM takes WHERE profile_id=%s", (profile_id,)).fetchall()]
    if ids:
        connection.execute("DELETE FROM take_metrics WHERE take_id = ANY(%s)", (ids,))
        connection.execute("DELETE FROM take_quality WHERE take_id = ANY(%s)", (ids,))
    connection.execute("DELETE FROM progress_change_points WHERE profile_id=%s", (profile_id,))
    connection.execute("DELETE FROM progress_snapshots WHERE profile_id=%s", (profile_id,))
    connection.execute("DELETE FROM profile_goals WHERE profile_id=%s", (profile_id,))
    connection.execute("DELETE FROM speaker_profiles WHERE id=%s", (profile_id,))
    return True


@contextmanager
def mutation(scope: str, key: str, request_hash: str):
    with connect() as connection, connection.transaction():
        connection.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", (scope + ":" + key,))
        connection.execute("DELETE FROM profile_idempotency WHERE expires_at <= now()")
        previous = connection.execute(
            "SELECT * FROM profile_idempotency WHERE scope=%s AND key=%s", (scope, key)).fetchone()
        if previous and previous["request_hash"] != request_hash:
            raise ReviewError(409, "E_IDEMPOTENCY_CONFLICT",
                              "Idempotency-Key wurde für eine andere Anfrage verwendet.")
        yield connection, previous


def remember(connection, scope, key, request_hash, profile_id, status, response):
    connection.execute(
        "INSERT INTO profile_idempotency(scope,key,request_hash,profile_id,status,response)"
        " VALUES (%s,%s,%s,%s,%s,%s)",
        (scope, key, request_hash, profile_id, status, Jsonb(response)))


def take_rows(connection, profile_id):
    return connection.execute(
        "SELECT t.*, s.presentation_mode FROM takes t JOIN sessions s ON s.id=t.session_id"
        " WHERE t.profile_id=%s ORDER BY t.recorded_at,t.created_at,t.id", (profile_id,)).fetchall()


def take_ids(connection, profile_id):
    return [item["id"] for item in connection.execute(
        "SELECT id FROM takes WHERE profile_id=%s", (profile_id,)).fetchall()]


def events(connection, take_id):
    return review_db.events(connection, take_id)


def upsert_quality(connection, take_id, quality):
    connection.execute(
        "INSERT INTO take_quality(take_id,status,global_exclusion_reasons,pose_coverage_ratio,"
        "pose_valid_ratio,audio_active_ratio,word_count,claim_count,synthetic_demo,"
        "quality_version,computed_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())"
        " ON CONFLICT(take_id) DO UPDATE SET status=EXCLUDED.status,"
        " global_exclusion_reasons=EXCLUDED.global_exclusion_reasons,"
        " pose_coverage_ratio=EXCLUDED.pose_coverage_ratio,"
        " pose_valid_ratio=EXCLUDED.pose_valid_ratio,"
        " audio_active_ratio=EXCLUDED.audio_active_ratio,word_count=EXCLUDED.word_count,"
        " claim_count=EXCLUDED.claim_count,synthetic_demo=EXCLUDED.synthetic_demo,"
        " quality_version=EXCLUDED.quality_version,computed_at=now()",
        (take_id, quality["status"], quality["global_exclusion_reasons"],
         quality["pose_coverage_ratio"], quality["pose_valid_ratio"],
         quality["audio_active_ratio"], quality["word_count"], quality["claim_count"],
         quality["synthetic_demo"], quality["quality_version"]))


def upsert_metric(connection, take_id, metric_id, version, value, unit, n, denominator,
                  rule_version, quality):
    connection.execute(
        "INSERT INTO take_metrics(take_id,metric_id,metric_version,value,unit,n,denominator,"
        "rule_version,computation_version,quality,computed_at)"
        " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())"
        " ON CONFLICT(take_id,metric_id,metric_version) DO UPDATE SET value=EXCLUDED.value,"
        " unit=EXCLUDED.unit,n=EXCLUDED.n,denominator=EXCLUDED.denominator,"
        " rule_version=EXCLUDED.rule_version,computation_version=EXCLUDED.computation_version,"
        " quality=EXCLUDED.quality,computed_at=now()",
        (take_id, metric_id, version, value, unit, n, denominator, rule_version,
         definitions.COMPUTATION_VERSION, Jsonb(quality)))


def clear_metrics(connection, profile_id):
    ids = take_ids(connection, profile_id)
    if ids:
        connection.execute("DELETE FROM take_metrics WHERE take_id = ANY(%s)", (ids,))
    connection.execute("DELETE FROM progress_snapshots WHERE profile_id=%s", (profile_id,))
    connection.execute("DELETE FROM progress_change_points WHERE profile_id=%s", (profile_id,))


def load_metrics(connection, profile_id):
    ids = take_ids(connection, profile_id)
    if not ids:
        return []
    return connection.execute(
        "SELECT m.* FROM take_metrics m WHERE m.take_id = ANY(%s)"
        " ORDER BY m.metric_id,m.metric_version,m.computed_at", (ids,)).fetchall()


def upsert_snapshot(connection, payload):
    connection.execute(
        "INSERT INTO progress_snapshots(id,profile_id,metric_id,metric_version,window_kind,"
        "window_end_take_id,total_n,eligible_n,baseline_value,latest_value,recent_value,"
        "noise_band,trend_status,goal_status,slope_per_take,slope_per_10_takes,"
        "slope_ci_low,slope_ci_high,relative_change,effect_size,minimum_detectable_change,"
        "mann_kendall_p,adjusted_p,method,algorithm_version,rule_versions,version_break,"
        "input_hash,computed_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,"
        "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())"
        " ON CONFLICT(profile_id,metric_id,metric_version,window_kind,window_end_take_id)"
        " DO UPDATE SET total_n=EXCLUDED.total_n,eligible_n=EXCLUDED.eligible_n,"
        " baseline_value=EXCLUDED.baseline_value,latest_value=EXCLUDED.latest_value,"
        " recent_value=EXCLUDED.recent_value,noise_band=EXCLUDED.noise_band,"
        " trend_status=EXCLUDED.trend_status,goal_status=EXCLUDED.goal_status,"
        " slope_per_take=EXCLUDED.slope_per_take,slope_per_10_takes=EXCLUDED.slope_per_10_takes,"
        " slope_ci_low=EXCLUDED.slope_ci_low,slope_ci_high=EXCLUDED.slope_ci_high,"
        " relative_change=EXCLUDED.relative_change,effect_size=EXCLUDED.effect_size,"
        " minimum_detectable_change=EXCLUDED.minimum_detectable_change,"
        " mann_kendall_p=EXCLUDED.mann_kendall_p,adjusted_p=EXCLUDED.adjusted_p,"
        " method=EXCLUDED.method,algorithm_version=EXCLUDED.algorithm_version,"
        " rule_versions=EXCLUDED.rule_versions,version_break=EXCLUDED.version_break,"
        " input_hash=EXCLUDED.input_hash,computed_at=now()",
        (uuid4(), payload["profile_id"], payload["metric_id"], payload["metric_version"],
         payload["window_kind"], payload["window_end_take_id"], payload["total_n"],
         payload["eligible_n"], payload["baseline_value"], payload["latest_value"],
         payload["recent_value"], payload["noise_band"], payload["trend_status"],
         payload["goal_status"], payload["slope_per_take"], payload["slope_per_10_takes"],
         payload["slope_ci_low"], payload["slope_ci_high"], payload["relative_change"],
         payload["effect_size"], payload["minimum_detectable_change"],
         payload["mann_kendall_p"], payload["adjusted_p"], payload["method"],
         payload["algorithm_version"], payload["rule_versions"], payload["version_break"],
         payload["input_hash"]))


def insert_change_points(connection, points):
    for point in points:
        connection.execute(
            "INSERT INTO progress_change_points(id,profile_id,metric_id,metric_version,take_id,"
            "change_started_at_take_id,kind,from_value,to_value,magnitude,confidence,"
            "evidence_take_ids,algorithm_version) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
            " ON CONFLICT(profile_id,metric_id,metric_version,take_id,algorithm_version)"
            " DO UPDATE SET kind=EXCLUDED.kind,from_value=EXCLUDED.from_value,"
            " to_value=EXCLUDED.to_value,magnitude=EXCLUDED.magnitude,"
            " confidence=EXCLUDED.confidence,evidence_take_ids=EXCLUDED.evidence_take_ids",
            (point["id"], point["profile_id"], point["metric_id"], point["metric_version"],
             point["take_id"], point["change_started_at_take_id"], point["kind"],
             point["from_value"], point["to_value"], point["magnitude"], point["confidence"],
             point["evidence_take_ids"], definitions.ALGORITHM_VERSION))


def goals(connection, profile_id, *, active_only=True):
    query = "SELECT * FROM profile_goals WHERE profile_id=%s"
    values = [profile_id]
    if active_only:
        query += " AND metric_version=%s"
        values.append(definitions.METRIC_VERSION)
    return connection.execute(query + " ORDER BY metric_id", values).fetchall()


def goal_for(connection, profile_id, metric_id):
    return connection.execute(
        "SELECT * FROM profile_goals WHERE profile_id=%s AND metric_id=%s"
        " ORDER BY metric_version DESC LIMIT 1", (profile_id, metric_id)).fetchone()


def put_goal(connection, profile_id, metric_id, request):
    metric = definitions.BY_ID.get(metric_id)
    if metric is None:
        raise ReviewError(422, "E_METRIC_UNKNOWN", "Unbekannte Metrik.")
    connection.execute("DELETE FROM profile_goals WHERE profile_id=%s AND metric_id=%s",
                       (profile_id, metric_id))
    return connection.execute(
        "INSERT INTO profile_goals(profile_id,metric_id,metric_version,direction,target_value,"
        "target_min,target_max) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (profile_id, metric_id, metric.version, request.direction, request.target_value,
         request.target_min, request.target_max)).fetchone()


def delete_goal(connection, profile_id, metric_id):
    cursor = connection.execute(
        "DELETE FROM profile_goals WHERE profile_id=%s AND metric_id=%s", (profile_id, metric_id))
    return cursor.rowcount > 0

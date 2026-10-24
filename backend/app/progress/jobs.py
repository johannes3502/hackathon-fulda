"""Persistent recompute jobs. Redis carries only the run ID."""

import logging
from uuid import uuid4

from app.progress import db, service
from app.progress.models import RecomputeAccepted, RecomputeRun
from app.review.errors import ReviewError


def reserve(profile_id, token, key):
    scope = f"profiles:{profile_id}:recompute"
    request_hash = db.digest({"profileId": str(profile_id), "recompute": True})
    with db.mutation(scope, key, request_hash) as (connection, previous):
        db.authenticate(connection, profile_id, token, lock=True)
        if previous:
            return previous["response"]
        active = connection.execute(
            "SELECT id FROM progress_runs WHERE profile_id=%s AND status IN ('queued','running')",
            (profile_id,)).fetchone()
        if active:
            raise ReviewError(409, "E_PROGRESS_RECOMPUTE_IN_PROGRESS", "Neuberechnung läuft bereits.",
                              {"runId": str(active["id"])})
        run_id = uuid4()
        connection.execute("INSERT INTO progress_runs(id,profile_id,status) VALUES (%s,%s,'queued')",
                           (run_id, profile_id))
        body = service.json_model(RecomputeAccepted(
            run_id=run_id, status_url=f"/api/profiles/{profile_id}/progress/runs/{run_id}"))
        db.remember(connection, scope, key, request_hash, profile_id, 202, body)
        return body


def get(profile_id, token, run_id):
    with db.connect() as connection:
        db.authenticate(connection, profile_id, token)
        row = connection.execute("SELECT * FROM progress_runs WHERE id=%s AND profile_id=%s",
                                 (run_id, profile_id)).fetchone()
        if row is None:
            raise ReviewError(404, "E_PROGRESS_RUN_NOT_FOUND", "Neuberechnung nicht gefunden.")
        return RecomputeRun(run_id=row["id"], status=row["status"], error=row["error"],
                            created_at=row["created_at"], updated_at=row["updated_at"])


def execute(run_id):
    with db.connect() as connection:
        connection.execute("UPDATE progress_runs SET status='running',updated_at=now()"
                           " WHERE id=%s AND status='queued'", (run_id,))
    try:
        with db.connect() as connection, connection.transaction():
            # Serialize redelivery, reads and deletion on the same profile row.
            row = connection.execute(
                "SELECT p.id FROM speaker_profiles p JOIN progress_runs r ON r.profile_id=p.id"
                " WHERE r.id=%s FOR UPDATE OF p", (run_id,)).fetchone()
            if row is None:
                return
            run = connection.execute("SELECT status FROM progress_runs WHERE id=%s", (run_id,)).fetchone()
            if run is None or run["status"] in {"completed", "failed"}:
                return
            service.recompute_profile(row["id"], connection)
            connection.execute("UPDATE progress_runs SET status='completed',updated_at=now() WHERE id=%s", (run_id,))
    except ReviewError as error:
        fail(run_id, error.code)


def fail(run_id, code):
    logging.getLogger(__name__).warning("Progress run=%s failed code=%s", run_id, code)
    with db.connect() as connection:
        connection.execute("UPDATE progress_runs SET status='failed',error=%s,updated_at=now() WHERE id=%s",
                           (code, run_id))

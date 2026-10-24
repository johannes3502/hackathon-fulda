"""Profile and long-term progress API. Additive to the review routes."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

import psycopg
from fastapi import APIRouter, Header, Query, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool

from app.jobs import QueueUnavailable, enqueue_task
from app.progress import jobs, service
from app.progress.models import (
    ErrorResponse, GoalInput, GoalListResponse, GoalResponse, MetricProgressResponse,
    ProfileCreate, ProfileCreateResponse, ProfileGetResponse, ProfilePatch,
    ProfileTakesResponse, ProfileTokenRotateResponse, ProgressResponse, RecomputeAccepted, RecomputeRun,
)
from app.review.errors import ReviewError
from app.tasks import recompute_progress


class ProgressRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def wrapped(request):
            request.state.request_id = str(uuid4())
            try:
                response = await handler(request)
                response.headers["X-Request-Id"] = request.state.request_id
                response.headers["Cache-Control"] = "private, no-store"
                return response
            except RequestValidationError as error:
                raise ReviewError(422, "E_REQUEST_INVALID",
                                  "Ungültige Anfrage; Schema und Idempotency-Key prüfen.") from error
            except (psycopg.Error, QueueUnavailable) as error:
                raise ReviewError(503, "E_SERVICE_UNAVAILABLE",
                                  "Datenbank oder Queue nicht verfügbar.") from error
            except ReviewError:
                raise
            except Exception as error:
                logging.getLogger(__name__).warning(
                    "Progress request=%s failed (%s)", request.state.request_id, type(error).__name__)
                raise ReviewError(500, "E_INTERNAL", "Interner Fehler bei der Verarbeitung.") from error

        return wrapped


router = APIRouter(tags=["progress"], route_class=ProgressRoute,
    responses={code: {"model": ErrorResponse} for code in (400, 401, 404, 409, 410, 422, 500, 503)})
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)]
Token = Annotated[str | None, Header(alias="X-Profile-Token")]


def checked_key(key):
    if not key.strip():
        raise ReviewError(422, "E_IDEMPOTENCY_KEY_MISSING", "Idempotency-Key darf nicht leer sein.")
    return key


def require_token(token):
    if not token:
        raise ReviewError(401, "E_PROFILE_TOKEN_INVALID", "Profil-Token fehlt.")
    return token


def mutation_response(value):
    status, body = value
    if status == 204 or body is None:
        return Response(status_code=status)
    return JSONResponse(status_code=status, content=body)


@router.post("/profiles", status_code=201, response_model=ProfileCreateResponse)
def create_profile(request: ProfileCreate, idempotency_key: Key):
    return mutation_response(service.create_profile(request, checked_key(idempotency_key)))


@router.get("/profiles/{profile_id}", response_model=ProfileGetResponse)
def get_profile(profile_id: UUID, token: Token = None):
    return service.get_profile(profile_id, require_token(token))


@router.patch("/profiles/{profile_id}", response_model=ProfileGetResponse)
def patch_profile(profile_id: UUID, request: ProfilePatch, idempotency_key: Key, token: Token = None):
    return mutation_response(service.update_profile(
        profile_id, request, require_token(token), checked_key(idempotency_key)))


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: UUID, idempotency_key: Key, token: Token = None):
    return mutation_response(service.delete_profile(
        profile_id, require_token(token), checked_key(idempotency_key)))


@router.post("/profiles/{profile_id}/rotate-token", response_model=ProfileTokenRotateResponse)
def rotate_token(profile_id: UUID, idempotency_key: Key, token: Token = None):
    return mutation_response(service.rotate_token(
        profile_id, require_token(token), checked_key(idempotency_key)))


@router.get("/profiles/{profile_id}/progress", response_model=ProgressResponse)
def get_progress(profile_id: UUID, token: Token = None,
                 window: str = Query(default="last_20"),
                 metrics: str = Query(default="primary"),
                 from_at: datetime | None = Query(default=None, alias="from"),
                 to_at: datetime | None = Query(default=None, alias="to"),
                 presentation_mode: str | None = Query(default=None, alias="presentationMode"),
                 include_excluded: bool = Query(default=True, alias="includeExcluded"),
                 include_exploratory: bool = Query(default=False, alias="includeExploratory")):
    if presentation_mode == "all":
        presentation_mode = None
    if presentation_mode not in (None, "startup", "thesis", "school", "nonprofit"):
        raise ReviewError(422, "E_PRESENTATION_MODE_INVALID", "Unbekannter Präsentationstyp.")
    return service.progress(
        profile_id, require_token(token), window=window, requested_metrics=metrics,
        from_at=from_at, to_at=to_at, presentation_mode=presentation_mode,
        include_excluded=include_excluded, include_exploratory=include_exploratory)


@router.get("/profiles/{profile_id}/progress/{metric_id}", response_model=MetricProgressResponse)
def get_metric_progress(profile_id: UUID, metric_id: str, token: Token = None,
                        window: str = Query(default="last_20"),
                        from_at: datetime | None = Query(default=None, alias="from"),
                        to_at: datetime | None = Query(default=None, alias="to"),
                        presentation_mode: str | None = Query(default=None, alias="presentationMode"),
                        include_excluded: bool = Query(default=True, alias="includeExcluded")):
    if presentation_mode == "all":
        presentation_mode = None
    return service.metric_progress(
        profile_id, require_token(token), metric_id, window=window, from_at=from_at,
        to_at=to_at, presentation_mode=presentation_mode,
        include_excluded=include_excluded, include_exploratory=True)


@router.post("/profiles/{profile_id}/progress/recompute", status_code=202, response_model=RecomputeAccepted)
async def recompute(profile_id: UUID, idempotency_key: Key, token: Token = None):
    body = await run_in_threadpool(jobs.reserve, profile_id, require_token(token), checked_key(idempotency_key))
    run = await run_in_threadpool(jobs.get, profile_id, token, UUID(body["runId"]))
    if run.status == "queued":
        await enqueue_task(recompute_progress, body["runId"])
    return JSONResponse(status_code=202, content=body)


@router.get("/profiles/{profile_id}/progress/runs/{run_id}", response_model=RecomputeRun)
def get_recompute(profile_id: UUID, run_id: UUID, token: Token = None):
    return jobs.get(profile_id, require_token(token), run_id)


@router.get("/profiles/{profile_id}/goals", response_model=GoalListResponse)
def get_goals(profile_id: UUID, token: Token = None):
    return service.goals(profile_id, require_token(token))


@router.put("/profiles/{profile_id}/goals/{metric_id}", response_model=GoalResponse)
def put_goal(profile_id: UUID, metric_id: str, request: GoalInput, idempotency_key: Key, token: Token = None):
    return mutation_response(service.set_goal(
        profile_id, metric_id, request, require_token(token), checked_key(idempotency_key)))


@router.delete("/profiles/{profile_id}/goals/{metric_id}", status_code=204)
def delete_goal(profile_id: UUID, metric_id: str, idempotency_key: Key, token: Token = None):
    return mutation_response(service.remove_goal(
        profile_id, metric_id, require_token(token), checked_key(idempotency_key)))


@router.get("/profiles/{profile_id}/takes", response_model=ProfileTakesResponse)
def get_takes(profile_id: UUID, token: Token = None, limit: int = Query(default=50, ge=1, le=200),
              cursor: str | None = Query(default=None)):
    return service.takes(profile_id, require_token(token), limit=limit, cursor=cursor)


@router.get("/profiles/{profile_id}/export")
def export(profile_id: UUID, token: Token = None, format: str = Query(default="json")):
    if format not in {"json", "csv"}:
        raise ReviewError(422, "E_FORMAT_INVALID", "Format muss json oder csv sein.")
    content, filename, media_type = service.export(profile_id, require_token(token), format=format)
    return Response(content=content, media_type=media_type,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})

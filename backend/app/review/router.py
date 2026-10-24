"""Additive API for backend-owned reviews; existing client routes are preserved."""

import logging
import os
from typing import Annotated
from uuid import UUID, uuid4

import psycopg
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.factcheck.llm import configured_llm
from app.jobs import QueueUnavailable, enqueue_task
from app.progress import service as progress_service
from app.review import db, media, service
from app.review.errors import ReviewError
from app.review.models import (TakeJobAccepted, ErrorResponse, EventBatch, EventsAccepted, EvaluationResponse, FactcheckRequest,
    JobResponse, QuestionsRequest, QuestionsResponse, ReviewRequest, ReviewResponse, ReviewReused, SessionCreate, SessionDetail,
    SessionResponse, TakeAnswerRequest, TakeCreate, TakeResponse, TimelineResponse)
from app.speech.config import AudioConfig
from app.speech.job_models import AnalysisOptions, StreamedTranscript
from app.tasks import run_take_job
from app.transcription.transcriber import configured_transcriber


class ReviewRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()
        async def wrapped(request):
            request.state.request_id = str(uuid4())
            try:
                if request.path_params:
                    await run_in_threadpool(
                        progress_service.authorize_resource, request.path_params,
                        request.headers.get("X-Profile-Token"), deleting=request.method == "DELETE")
                response = await handler(request)
                response.headers["X-Request-Id"] = request.state.request_id
                response.headers["Cache-Control"] = "private, no-store"
                return response
            except RequestValidationError as error:
                code = "E_REQUEST_INVALID"
                if any(item.get("loc", ())[-1:] in [("durationMs",), ("duration_ms",)] and item["type"] == "greater_than_equal" for item in error.errors()):
                    code = "E_DURATION_NEGATIVE"
                raise ReviewError(422, code, "Ungültige Anfrage; Schema und Idempotency-Key prüfen.") from error
            except (psycopg.Error, BotoCoreError, ClientError, QueueUnavailable) as error:
                raise ReviewError(503, "E_SERVICE_UNAVAILABLE", "Datenbank, Objektspeicher oder Queue nicht verfügbar.") from error
            except ReviewError:
                raise
            except Exception as error:
                logging.getLogger(__name__).warning("Review request=%s failed (%s)", request.state.request_id, type(error).__name__)
                raise ReviewError(500, "E_INTERNAL", "Interner Fehler bei der Verarbeitung.") from error
        return wrapped


def profile_token_header(profile_token: str | None = Header(default=None, alias="X-Profile-Token")):
    """Advertise the optional header; ReviewRoute checks linked resources before media work."""


router = APIRouter(tags=["review"], route_class=ReviewRoute, dependencies=[Depends(profile_token_header)],
    responses={code: {"model": ErrorResponse} for code in (400, 401, 404, 409, 410, 413, 422, 500, 503)})
Key = Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)]


def checked_key(key):
    if not key.strip():
        raise ReviewError(422, "E_IDEMPOTENCY_KEY_MISSING", "Idempotency-Key darf nicht leer sein.")
    return key


def mutation_response(value):
    status, body = value
    return JSONResponse(status_code=status, content=body)


def require_cloud_consent(take_id):
    session = service.session_detail(service.take_detail(take_id).take.session_id).session
    if session.consent.scope != "local-and-cloud-analysis":
        raise ReviewError(409, "E_CLOUD_CONSENT_REQUIRED", "Cloud-Verarbeitung erfordert die passende Einwilligung.")


def require_llm(take_id):
    try:
        model = configured_llm()
    except ValueError as error:
        raise ReviewError(503, "E_LLM_UNAVAILABLE", "Sprachmodell ist nicht verfügbar.") from error
    require_cloud_consent(take_id)
    return model


def review_preflight(take_id):
    try:
        require_llm(take_id)
    except ReviewError as error:
        if error.code != "E_LLM_UNAVAILABLE":
            raise
        # Missing configuration still permits a local, evidence-based review.


async def dispatch(value):
    status, body = value
    if status == 202:
        job = await run_in_threadpool(service.queued_job, UUID(body["jobId"]))
        if job["status"] == "queued":
            await enqueue_task(run_take_job, str(job["id"]))
    return mutation_response(value)


@router.post("/sessions", status_code=201, response_model=SessionResponse)
def create_session(request: SessionCreate, idempotency_key: Key,
                   profile_token: str | None = Header(default=None, alias="X-Profile-Token")):
    if request.profile_id is not None:
        progress_service.require_profile_token(request.profile_id, profile_token)
    return mutation_response(service.create_session(request, checked_key(idempotency_key)))


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def session_detail(session_id: UUID):
    return service.session_detail(session_id)


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: UUID):
    service.delete_session(session_id)
    return Response(status_code=204)


@router.post("/sessions/{session_id}/takes", status_code=201, response_model=TakeResponse)
def create_take(session_id: UUID, request: TakeCreate, idempotency_key: Key):
    return mutation_response(service.create_take(session_id, request, checked_key(idempotency_key)))


@router.get("/takes/{take_id}", response_model=TakeResponse)
def take_detail(take_id: UUID):
    return service.take_detail(take_id)


@router.post("/takes/{take_id}/events", response_model=EventsAccepted)
def events(take_id: UUID, request: EventBatch, idempotency_key: Key):
    return mutation_response(service.save_events(take_id, request, checked_key(idempotency_key)))


@router.get("/takes/{take_id}/timeline", response_model=TimelineResponse)
def timeline(take_id: UUID):
    return service.timeline(take_id)


@router.post("/takes/{take_id}/audio", status_code=202, response_model=TakeJobAccepted)
async def audio(take_id: UUID, idempotency_key: Key,
    file: UploadFile = File(description="Temporary audio or recording; deleted on success or failure"),
    transcribe: bool = Form(default=True), config: str | None = Form(default=None),
    local_only: bool = Form(default=False), live_transcript: str | None = Form(default=None)):
    key = checked_key(idempotency_key)
    if not (file.content_type or "").split("/", 1)[0] in {"audio", "video"}:
        raise ReviewError(422, "E_AUDIO_CONTENT_TYPE", "Datei muss eine Audio- oder Aufnahme-MIME-Type haben.")
    try:
        parsed = AudioConfig.model_validate_json(config) if config else AudioConfig()
        streamed = StreamedTranscript.model_validate_json(live_transcript) if live_transcript else None
    except ValidationError as error:
        raise ReviewError(422, "E_AUDIO_CONFIG_INVALID", "Ungültige Audio-Konfiguration.") from error
    if streamed is not None and (local_only or not transcribe):
        raise ReviewError(422, "E_AUDIO_CONFIG_INVALID", "Live-Transkript erfordert transcribe=true und local_only=false.")
    def preflight():
        if transcribe:
            provider = os.getenv("ASR_PROVIDER", "whisper").strip().lower()
            if local_only and provider not in {"whisper", "faster-whisper"}:
                raise ReviewError(503, "E_ASR_UNAVAILABLE", "Lokales Whisper ist nicht konfiguriert.")
            if streamed is not None or provider not in {"whisper", "faster-whisper", "json"}:
                require_cloud_consent(take_id)
            if streamed is None:
                try:
                    configured_transcriber()
                except (ValueError, KeyError) as error:
                    raise ReviewError(503, "E_ASR_UNAVAILABLE", "ASR ist nicht konfiguriert.") from error
    options = AnalysisOptions(audio=parsed, transcribe=transcribe, live_transcript=streamed)
    fingerprint = {"options": options.model_dump(mode="json"), "localOnly": local_only,
                   "contentHash": await run_in_threadpool(media.hash_upload, file.file)}
    value = await run_in_threadpool(service.reserve_job, take_id, "audio_analyze", options.model_dump(mode="json"), key, fingerprint, preflight)
    job_id = UUID(value[1]["jobId"])
    await run_in_threadpool(service.prepare_upload, job_id, file.file)
    return await dispatch(value)


@router.post("/takes/{take_id}/review", status_code=202, response_model=TakeJobAccepted,
             responses={200: {"model": ReviewReused}})
async def start_review(take_id: UUID, idempotency_key: Key, request: ReviewRequest | None = None):
    options = request or ReviewRequest()
    value = await run_in_threadpool(service.reserve_job, take_id, "review_generate", service.json_model(options), checked_key(idempotency_key),
        preflight=(lambda: review_preflight(take_id)) if options.mode == "llm" else None)
    return await dispatch(value)


@router.get("/takes/{take_id}/review", response_model=ReviewResponse)
def review(take_id: UUID):
    return service.review(take_id)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def job(job_id: UUID):
    return JobResponse(job=db.job_from(service.queued_job(job_id)))


@router.post("/takes/{take_id}/factcheck", status_code=202, response_model=TakeJobAccepted)
async def factcheck(take_id: UUID, idempotency_key: Key, request: FactcheckRequest | None = None):
    options = request or FactcheckRequest()
    def preflight():
        require_llm(take_id)
        if options.use_web:
            from app.factcheck.web import configured_web_searcher
            require_cloud_consent(take_id)
            try:
                if configured_web_searcher() is None:
                    raise ValueError("No web searcher configured")
            except ValueError as error:
                raise ReviewError(503, "E_WEB_UNAVAILABLE", "Web-Zweitquelle ist nicht konfiguriert.") from error
    return await dispatch(await run_in_threadpool(service.reserve_job, take_id, "factcheck", service.json_model(options),
        checked_key(idempotency_key), preflight=preflight))


@router.post("/takes/{take_id}/questions", status_code=202, response_model=TakeJobAccepted)
async def questions(take_id: UUID, idempotency_key: Key, request: QuestionsRequest | None = None):
    options = request or QuestionsRequest()
    return await dispatch(await run_in_threadpool(service.reserve_job, take_id, "questions_generate", service.json_model(options),
        checked_key(idempotency_key), preflight=lambda: require_llm(take_id)))


@router.get("/takes/{take_id}/questions", response_model=QuestionsResponse)
def get_questions(take_id: UUID):
    with db.connect() as connection:
        take = db.require_take(connection, take_id)
        return {"questions": take["analysis"].get("questions")}


@router.post("/takes/{take_id}/questions/answers", status_code=202, response_model=TakeJobAccepted)
async def answer(take_id: UUID, request: TakeAnswerRequest, idempotency_key: Key):
    return await dispatch(await run_in_threadpool(service.reserve_job, take_id, "answer_review", service.json_model(request),
        checked_key(idempotency_key), preflight=lambda: require_llm(take_id)))


@router.get("/takes/{take_id}/evaluation", response_model=EvaluationResponse)
def evaluation(take_id: UUID):
    return service.evaluation(take_id)

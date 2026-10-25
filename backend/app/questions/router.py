import hashlib
import io
import os
from typing import Callable
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Response
from pydantic import BaseModel, ValidationError
from redis.exceptions import RedisError
from starlette.concurrency import run_in_threadpool

from app.connections import s3_client
from app.factcheck.llm import configured_llm
from app.jobs import QueueUnavailable, enqueue_task
from app.questions.models import AnswerJob, AnswerRequest, QuestionJob, QuestionRequest, VoiceAnswerRequest
from app.questions import agent, pitch, rounds
from app import job_storage as storage
from app.speech.job_models import AcceptedJob
from app.tasks import AGENT_PREFIX, ANSWER_PREFIX, QUESTION_PREFIX, generate_questions, prepare_agent, review_answer, review_voice_answer
from app.transcription.transcriber import configured_transcriber

router = APIRouter(prefix="/questions", tags=["questions"])

MAX_VOICE_UPLOAD_BYTES = 25 * 1024 * 1024


def _store(job_id: str, request: BaseModel, prefix: str, job: BaseModel, recording=None):
    if recording is not None:
        s3_client().upload_fileobj(recording, os.environ["S3_BUCKET"], storage.key(job_id, "recording", prefix))
    storage.write_json(job_id, "request.json", request.model_dump(mode="json"), prefix)
    storage.write_json(job_id, "status.json", job.model_dump(), prefix)


def _validate_round_answer(round_id: UUID | None, question_id: str | None) -> None:
    """The HTTP boundary requires a server-issued question, never a client Question."""
    if round_id is None or not question_id:
        raise HTTPException(422, "round_id and question_id are required; a client-supplied question is not accepted.")
    try:
        rounds.validate_answer(round_id, question_id)
    except rounds.RoundError as error:
        raise HTTPException(error.status_code, error.message) from error
    except RedisError as error:
        raise HTTPException(503, "Question storage is unavailable") from error


async def _accept(request: BaseModel, prefix: str, job_model, task, status_path: str,
                  recording=None, requires_llm=True,
                  validate: Callable[[], None] | None = None) -> AcceptedJob:
    try:
        if requires_llm:
            configured_llm()
    except ValueError as error:
        raise HTTPException(503, f"Question simulator is not configured: {error}") from error
    if validate is not None:
        await run_in_threadpool(validate)
    job_id = str(uuid4())
    try:
        await run_in_threadpool(_store, job_id, request, prefix, job_model(job_id=job_id, status="queued"), recording)
        await enqueue_task(task, job_id)
    except (QueueUnavailable, BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Question storage or queue unavailable") from error
    return AcceptedJob(job_id=job_id, status_url=f"{status_path}/{job_id}")


def _status(job_id: UUID, prefix: str, job_model):
    try:
        value = storage.read_json(str(job_id), "status.json", prefix)
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Question storage unavailable") from error
    if value is None:
        raise HTTPException(404, "Unknown question job")
    return job_model.model_validate(value)


@router.get("/agent/settings")
def agent_settings() -> agent.AgentSettings:
    return agent.settings()


@router.get("/pitch")
def pitch_context(response: Response) -> pitch.PitchContext:
    """The fixed jury question and agent context; no LLM, Redis or provider needed."""
    if not pitch.enabled():
        raise HTTPException(404, "Pitch mode is disabled")
    response.headers["Cache-Control"] = "no-store"
    return pitch.context()


@router.post("/agent", status_code=202)
async def start_agent_context(request: agent.AgentRequest) -> AcceptedJob:
    if not agent.settings().available:
        raise HTTPException(503, "ElevenLabs voice practice is not configured")
    return await _accept(request, AGENT_PREFIX, agent.AgentJob, prepare_agent, "/questions/agent/jobs",
                         requires_llm=False)


@router.get("/agent/jobs/{job_id}")
def agent_context_status(job_id: UUID, response: Response) -> agent.AgentJob:
    response.headers["Cache-Control"] = "no-store"
    return _status(job_id, AGENT_PREFIX, agent.AgentJob)


@router.post("/agent/session")
async def start_agent_session(response: Response) -> agent.AgentSession:
    response.headers["Cache-Control"] = "no-store"
    return await agent.signed_session()


@router.post("", status_code=202)
async def start_questions(request: QuestionRequest) -> AcceptedJob:
    """Generate follow-up questions from transcript, fact-check findings and uploads.

    Sends transcript sentences, findings and upload passages to the configured
    OpenAI-compatible model (same as the fact-check). Questions with a spoken
    passage carry `t_ms` of the recording and appear as `question` events.
    The result includes a server-issued `round_id`; answers must use it.
    """
    return await _accept(request, QUESTION_PREFIX, QuestionJob, generate_questions, "/questions/jobs")


@router.get("/jobs/{job_id}")
def question_status(job_id: UUID) -> QuestionJob:
    return _status(job_id, QUESTION_PREFIX, QuestionJob)


@router.post("/answers", status_code=202)
async def start_answer_review(request: AnswerRequest) -> AcceptedJob:
    """Compare a typed answer with the canonical question of a server-issued round.

    `question_id` and `round_id` are required. A legacy `question` field is
    ignored and never becomes evidence. Result is a verdict with a verbatim
    quote and an optional follow-up question; no points or grades.
    """
    return await _accept(
        request, ANSWER_PREFIX, AnswerJob, review_answer, "/questions/answers",
        validate=lambda: _validate_round_answer(request.round_id, request.question_id),
    )


@router.post("/answers/voice", status_code=202)
async def start_voice_answer_review(
    recording: UploadFile = File(description="Spoken answer (WebM, MP4, WAV, ...)"),
    request: str = Form(description="VoiceAnswerRequest JSON: round_id, question_id, persona"),
) -> AcceptedJob:
    """Transcribe a spoken answer with the configured ASR, then compare it with the sources.

    Audio goes to the ASR provider (default: local Whisper), the transcript to
    the configured language model. Audio and request are deleted after
    processing. The result has the transcript in `answer` and the persona's
    reply to read aloud; poll `/questions/answers/{job_id}`.
    """
    try:
        parsed = VoiceAnswerRequest.model_validate_json(request)
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_url=False, include_context=False)) from error
    if parsed.round_id is None or not parsed.question_id:
        raise HTTPException(422, "round_id and question_id are required; a client-supplied question is not accepted.")
    try:
        configured_transcriber()
    except (ValueError, KeyError) as error:
        raise HTTPException(503, "ASR is not configured; check the local model or provider settings") from error
    if recording.size is not None and recording.size > MAX_VOICE_UPLOAD_BYTES:
        raise HTTPException(413, "Spoken answer is too large (maximum 25 MB).")
    data = await recording.read(MAX_VOICE_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(422, "Spoken answer is empty.")
    if len(data) > MAX_VOICE_UPLOAD_BYTES:
        raise HTTPException(413, "Spoken answer is too large (maximum 25 MB).")
    parsed = parsed.model_copy(update={"audio_sha256": hashlib.sha256(data).hexdigest()})
    return await _accept(
        parsed, ANSWER_PREFIX, AnswerJob, review_voice_answer, "/questions/answers",
        recording=io.BytesIO(data),
        validate=lambda: _validate_round_answer(parsed.round_id, parsed.question_id),
    )


@router.get("/answers/{job_id}")
def answer_status(job_id: UUID) -> AnswerJob:
    return _status(job_id, ANSWER_PREFIX, AnswerJob)

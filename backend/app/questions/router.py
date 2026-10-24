from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.factcheck.llm import configured_llm
from app.jobs import QueueUnavailable, enqueue_task
from app.questions.models import AnswerJob, AnswerRequest, QuestionJob, QuestionRequest
from app.speech import storage
from app.speech.job_models import AcceptedJob
from app.tasks import ANSWER_PREFIX, QUESTION_PREFIX, generate_questions, review_answer

router = APIRouter(prefix="/questions", tags=["questions"])


def _store(job_id: str, request: BaseModel, prefix: str, job: BaseModel):
    storage.write_json(job_id, "request.json", request.model_dump(mode="json"), prefix)
    storage.write_json(job_id, "status.json", job.model_dump(), prefix)


async def _accept(request: BaseModel, prefix: str, job_model, task, status_path: str) -> AcceptedJob:
    try:
        configured_llm()
    except ValueError as error:
        raise HTTPException(503, f"Question simulator is not configured: {error}") from error
    job_id = str(uuid4())
    try:
        await run_in_threadpool(_store, job_id, request, prefix, job_model(job_id=job_id, status="queued"))
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


@router.post("", status_code=202)
async def start_questions(request: QuestionRequest) -> AcceptedJob:
    """Generate follow-up questions from transcript, fact-check findings and uploads.

    Sends transcript sentences, findings and upload passages to the configured
    OpenAI-compatible model (same as the fact-check). Questions with a spoken
    passage carry `t_ms` of the recording and appear as `question` events.
    """
    return await _accept(request, QUESTION_PREFIX, QuestionJob, generate_questions, "/questions/jobs")


@router.get("/jobs/{job_id}")
def question_status(job_id: UUID) -> QuestionJob:
    return _status(job_id, QUESTION_PREFIX, QuestionJob)


@router.post("/answers", status_code=202)
async def start_answer_review(request: AnswerRequest) -> AcceptedJob:
    """Compare a typed answer with the question's evidence and upload passages.

    Result is a verdict with a verbatim quote and an optional follow-up
    question; no points or grades.
    """
    return await _accept(request, ANSWER_PREFIX, AnswerJob, review_answer, "/questions/answers")


@router.get("/answers/{job_id}")
def answer_status(job_id: UUID) -> AnswerJob:
    return _status(job_id, ANSWER_PREFIX, AnswerJob)

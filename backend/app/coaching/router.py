import os
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException, Response
from starlette.concurrency import run_in_threadpool

from app.coaching import storage
from app.coaching.models import AcceptedCoaching, AnswerRequest, CoachingJob, CoachingRequest
from app.coaching.provider import LocalCoach
from app.coaching.tasks import analyze_coaching
from app.jobs import QueueUnavailable, enqueue_task

router = APIRouter(prefix="/coaching", tags=["coaching"])


@router.get("/capabilities")
def capabilities() -> dict:
    coach = LocalCoach()
    return {"provider": "ollama", "configured": coach.available(), "model": coach.model,
            "asr_provider": os.getenv("ASR_PROVIDER", "whisper"),
            "notice": "Source comparison and questions run on the local Ollama server. No cloud fallback or API key."}


async def submit(data: dict) -> AcceptedCoaching:
    try:
        available = await run_in_threadpool(LocalCoach().available)
    except ValueError as error:
        raise HTTPException(503, "Local model configuration is invalid") from error
    if not available:
        raise HTTPException(503, "Start Ollama and download the configured local model first")
    job_id = str(uuid4())
    try:
        await run_in_threadpool(storage.write, job_id, "request.json", data)
        await run_in_threadpool(storage.write, job_id, "status.json",
                                CoachingJob(job_id=job_id, status="queued").model_dump(mode="json"))
        await enqueue_task(analyze_coaching, job_id)
    except (QueueUnavailable, BotoCoreError, ClientError) as error:
        try:
            await run_in_threadpool(storage.delete, job_id)
        except (BotoCoreError, ClientError):
            pass
        raise HTTPException(503, "Coaching storage or queue unavailable") from error
    return AcceptedCoaching(job_id=job_id, status_url=f"/coaching/jobs/{job_id}")


@router.post("/analyze", status_code=202)
async def analyze(request: CoachingRequest) -> AcceptedCoaching:
    return await submit({"kind": "analysis", "input": request.model_dump(mode="json")})


@router.get("/jobs/{job_id}")
def job_status(job_id: UUID) -> CoachingJob:
    try:
        data = storage.read(str(job_id), "status.json")
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Coaching storage unavailable") from error
    if data is None:
        raise HTTPException(404, "Unknown coaching job")
    return CoachingJob.model_validate(data)


@router.post("/jobs/{job_id}/answers", status_code=202)
async def answer(job_id: UUID, request: AnswerRequest) -> AcceptedCoaching:
    job = await run_in_threadpool(job_status, job_id)
    if job.status != "completed" or job.report is None:
        raise HTTPException(409, "Wait for the source comparison first")
    if not any(q.id == request.question_id for q in job.report.questions):
        raise HTTPException(422, "Unknown question")
    return await submit({"kind": "answer", "parent_id": str(job_id), "input": request.model_dump()})


@router.delete("/jobs/{job_id}", status_code=204)
def delete_job(job_id: UUID):
    job = job_status(job_id)
    if job.status not in ("completed", "failed"):
        raise HTTPException(409, "Wait for this job to finish before deleting it")
    try:
        storage.delete(str(job_id))
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Coaching storage unavailable") from error
    return Response(status_code=204)

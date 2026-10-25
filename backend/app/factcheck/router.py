from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.factcheck.llm import configured_llm, llm_available, llm_settings
from app.factcheck.models import FactCheckJob, FactCheckRequest, FactCheckSettings
from app.factcheck.web import configured_web_searcher, web_provider
from app.jobs import QueueUnavailable, enqueue_task
from app import job_storage as storage
from app.speech.job_models import AcceptedJob
from app.tasks import PREFIX, fact_check

router = APIRouter(prefix="/factcheck", tags=["factcheck"])


@router.get("/settings")
def settings() -> FactCheckSettings:
    """Whether the fact-check is configured and which third parties receive text."""
    llm = llm_settings()
    provider = web_provider()
    available = llm_available(llm)
    return FactCheckSettings(available=available, model=llm["model"] if llm else None,
                             llm_host=llm["host"] if llm else None,
                             web_provider=None if provider == "none" else provider)


def _store(job_id: str, request: FactCheckRequest):
    storage.write_json(job_id, "request.json", request.model_dump(mode="json"), PREFIX)
    storage.write_json(job_id, "status.json", FactCheckJob(job_id=job_id, status="queued").model_dump(), PREFIX)


@router.post("", status_code=202)
async def start_fact_check(request: FactCheckRequest) -> AcceptedJob:
    """Check claims of a transcript against the collection's uploads, then the web.

    Sends transcript sentences to the configured OpenAI-compatible model and,
    for claims not settled by the uploads, search queries to the web provider.
    Poll status_url for the result; events use `t_ms` of the recording.
    """
    try:
        configured_llm()
        if request.use_web:
            configured_web_searcher()
    except ValueError as error:
        raise HTTPException(503, f"Fact-check is not configured: {error}") from error
    job_id = str(uuid4())
    try:
        await run_in_threadpool(_store, job_id, request)
        await enqueue_task(fact_check, job_id)
    except (QueueUnavailable, BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Fact-check storage or queue unavailable") from error
    return AcceptedJob(job_id=job_id, status_url=f"/factcheck/jobs/{job_id}")


@router.get("/jobs/{job_id}")
def job_status(job_id: UUID) -> FactCheckJob:
    try:
        value = storage.read_json(str(job_id), "status.json", PREFIX)
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Fact-check storage unavailable") from error
    if value is None:
        raise HTTPException(404, "Unknown fact-check job")
    return FactCheckJob.model_validate(value)

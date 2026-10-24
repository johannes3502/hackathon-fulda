import os
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.connections import s3_client
from app.jobs import QueueUnavailable, enqueue_task
from app.speech import storage
from app.speech.config import AudioConfig
from app.speech.job_models import AcceptedJob, AnalysisJob, AnalysisOptions
from app.tasks import analyze_speech
from app.transcription.transcriber import configured_transcriber

router = APIRouter(prefix="/speech", tags=["speech"])


def _store_upload(job_id: str, recording, options: AnalysisOptions):
    s3_client().upload_fileobj(recording, os.environ["S3_BUCKET"], storage.key(job_id, "recording"))
    storage.write_json(job_id, "request.json", options.model_dump(mode="json"))
    storage.write_json(job_id, "status.json", AnalysisJob(job_id=job_id, status="queued").model_dump())


def _remove_job(job_id: str):
    for name in ("recording", "request.json", "status.json"):
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=storage.key(job_id, name))


@router.post("/analyze", status_code=202)
async def analyze(
    recording: UploadFile = File(description="Synthetic audio/video recording (WebM, MP4, WAV, ...)"),
    config: str | None = Form(default=None, description="AudioConfig JSON; first 3000 ms are calibration"),
    transcribe: bool = Form(default=True, description="Send audio to configured ASR (default: Deepgram EU). false = local signal analysis only"),
) -> AcceptedJob:
    """Store in S3 and enqueue analysis. Poll status_url for the result.

    German filler preservation is unverified. Originals are deleted after
    terminal processing. Demo recordings must be synthetic.
    """
    try:
        parsed = AudioConfig.model_validate_json(config) if config else AudioConfig()
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_url=False, include_context=False)) from error
    if transcribe:
        try:
            configured_transcriber()
        except (ValueError, KeyError) as error:
            raise HTTPException(503, "ASR is not configured; set provider credentials or transcribe=false") from error
    job_id = str(uuid4())
    try:
        await run_in_threadpool(_store_upload, job_id, recording.file, AnalysisOptions(audio=parsed, transcribe=transcribe))
        await enqueue_task(analyze_speech, job_id)
    except (QueueUnavailable, BotoCoreError, ClientError) as error:
        try:
            await run_in_threadpool(_remove_job, job_id)
        except (BotoCoreError, ClientError):
            pass  # Storage outage can also prevent cleanup; report service failure.
        raise HTTPException(503, "Analysis storage or queue unavailable") from error
    return AcceptedJob(job_id=job_id, status_url=f"/speech/jobs/{job_id}")


@router.get("/jobs/{job_id}")
def job_status(job_id: UUID) -> AnalysisJob:
    try:
        value = storage.read_json(str(job_id), "status.json")
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(503, "Analysis storage unavailable") from error
    if value is None:
        raise HTTPException(404, "Unknown analysis job")
    return AnalysisJob.model_validate(value)

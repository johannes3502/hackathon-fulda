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
from app.speech.job_models import AcceptedJob, AnalysisJob, AnalysisOptions, StreamedTranscript
from app.tasks import analyze_speech
from app.transcription.transcriber import configured_transcriber

router = APIRouter(prefix="/speech", tags=["speech"])


def _store_upload(job_id: str, recording, options: AnalysisOptions):
    s3_client().upload_fileobj(recording, os.environ["S3_BUCKET"], storage.key(job_id, "recording"))
    storage.write_json(job_id, "request.json", options.model_dump(mode="json"))
    storage.write_json(job_id, "status.json", AnalysisJob(job_id=job_id, status="queued").model_dump())


@router.post("/analyze", status_code=202)
async def analyze(
    recording: UploadFile = File(description="Synthetic audio/video recording (WebM, MP4, WAV, ...)"),
    config: str | None = Form(default=None, description="AudioConfig JSON; calibrates on voiced speech, then adapts gradually; silence does not train the reference"),
    local_only: bool = Form(default=False, description="Require local Whisper; reject hosted or synthetic ASR before storing the recording"),
    live_transcript: str | None = Form(default=None, description="Final Deepgram live transcript JSON with recording-relative word timestamps; skips repeat ASR"),
    transcribe: bool = Form(default=True, description="Run configured ASR (default: local Whisper). false = local signal analysis only"),
) -> AcceptedJob:
    """Store in S3 and enqueue analysis. Poll status_url for the result.

    Whisper runs locally; German filler preservation is model-dependent.
    Originals are deleted after terminal processing. Demo recordings must be synthetic.
    """
    try:
        parsed = AudioConfig.model_validate_json(config) if config else AudioConfig()
        streamed = StreamedTranscript.model_validate_json(live_transcript) if live_transcript is not None else None
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_url=False, include_context=False)) from error
    if streamed is not None and (local_only or not transcribe):
        raise HTTPException(422, "A cloud live transcript requires transcribe=true and local_only=false")
    if transcribe and streamed is None:
        if local_only and os.getenv("ASR_PROVIDER", "whisper").strip().lower() not in {"whisper", "faster-whisper"}:
            raise HTTPException(503, "This recording requires local Whisper; configure ASR_PROVIDER=whisper")
        try:
            configured_transcriber()
        except (ValueError, KeyError) as error:
            raise HTTPException(503, "ASR is not configured; check ASR_PROVIDER/WHISPER_* or DEEPGRAM_API_KEY, or submit transcribe=false") from error
    job_id = str(uuid4())
    try:
        await run_in_threadpool(_store_upload, job_id, recording.file, AnalysisOptions(audio=parsed, transcribe=transcribe, live_transcript=streamed))
        await enqueue_task(analyze_speech, job_id)
    except (QueueUnavailable, BotoCoreError, ClientError) as error:
        await run_in_threadpool(storage.discard_job, job_id)
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

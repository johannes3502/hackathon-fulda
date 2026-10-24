import subprocess

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.speech.analysis import analyze_upload
from app.speech.config import AudioConfig
from app.speech.models import AudioAnalysis

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/analyze")
def analyze(
    recording: UploadFile = File(description="Audio or video recording (WebM, MP4, WAV, ...)"),
    config: str | None = Form(default=None, description="Optional AudioConfig as JSON"),
) -> AudioAnalysis:
    """Time series and events from the audio signal only. Stores nothing."""
    try:
        parsed = AudioConfig.model_validate_json(config) if config else AudioConfig()
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_url=False, include_context=False)) from error
    try:
        return analyze_upload(recording.file, parsed)
    except subprocess.CalledProcessError as error:
        raise HTTPException(422, "Recording could not be decoded") from error

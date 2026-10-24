from typing import Literal

from pydantic import BaseModel, Field

from app.events import Event
from app.speech.config import AudioConfig
from app.speech.models import AudioAnalysis
from app.transcription.config import WordConfig
from app.transcription.models import Word, WordAnalysis


class AnalysisOptions(BaseModel):
    audio: AudioConfig = Field(default_factory=AudioConfig)
    words: WordConfig = Field(default_factory=WordConfig)
    transcribe: bool = True


class RecordingAnalysis(BaseModel):
    audio: AudioAnalysis
    words: list[Word]
    transcription: WordAnalysis | None
    events: list[Event]
    asr_provider: str | None
    synthetic_demo: bool = False
    notices: list[str] = Field(default_factory=list)


class AcceptedJob(BaseModel):
    job_id: str
    status_url: str


class AnalysisJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: RecordingAnalysis | None = None
    error: str | None = None

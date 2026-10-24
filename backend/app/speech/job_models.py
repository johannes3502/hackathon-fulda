from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.events import Event
from app.speech.config import AudioConfig
from app.speech.models import AudioAnalysis
from app.transcription.config import WordConfig
from app.transcription.models import Word, WordAnalysis


class StreamedTranscript(BaseModel):
    """Final, recording-relative words from a completed hosted live stream."""

    provider: Literal["deepgram"]
    words: list[Word] = Field(max_length=50000)

    @model_validator(mode="after")
    def validate_words(self) -> "StreamedTranscript":
        previous = 0
        for word in self.words:
            if not word.word.strip() or len(word.word) > 256:
                raise ValueError("Invalid transcript word")
            if word.start_ms < previous or word.end_ms > 600000:
                raise ValueError("Transcript words must be ordered and within ten minutes")
            previous = word.start_ms
        return self


class AnalysisOptions(BaseModel):
    audio: AudioConfig = Field(default_factory=AudioConfig)
    words: WordConfig = Field(default_factory=WordConfig)
    transcribe: bool = True
    live_transcript: StreamedTranscript | None = None


class RecordingAnalysis(BaseModel):
    audio: AudioAnalysis
    words: list[Word]
    text: str
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

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.speech.analysis import analyze_words
from app.speech.config import SpeechConfig
from app.speech.models import SpeechAnalysis, Word

router = APIRouter(prefix="/speech", tags=["speech"])


class AnalyzeRequest(BaseModel):
    words: list[Word] = Field(max_length=50000)
    config: SpeechConfig = Field(default_factory=SpeechConfig)


@router.post("/analyze")
def analyze(request: AnalyzeRequest) -> SpeechAnalysis:
    """Speech events from word timestamps (e.g. ASR output). Stores nothing."""
    return analyze_words(request.words, request.config)

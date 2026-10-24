from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.transcription.analysis import analyze_words
from app.transcription.config import WordConfig
from app.transcription.models import WordAnalysis, Word

router = APIRouter(prefix="/transcription", tags=["transcription"])


class AnalyzeRequest(BaseModel):
    words: list[Word] = Field(max_length=50000)
    config: WordConfig = Field(default_factory=WordConfig)


@router.post("/analyze-words")
def analyze(request: AnalyzeRequest) -> WordAnalysis:
    """Word-based events from word timestamps (e.g. ASR output). Stores nothing."""
    return analyze_words(request.words, request.config)

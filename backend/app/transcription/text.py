"""Render a readable transcript from ASR word timestamps."""

from app.transcription.models import Word


def transcript_text(words: list[Word]) -> str:
    """Join words with single spaces; punctuation stays attached as delivered."""
    return " ".join(word.word.strip() for word in words if word.word.strip())

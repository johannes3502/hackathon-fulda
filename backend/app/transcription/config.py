"""Heuristic thresholds for word-based events.

None of these values are validated. They are starting points for the
prototype and are returned with every analysis so the UI can label them as
"Heuristik". The filler list is still open (docs/01-product.md).
"""

from pydantic import BaseModel, Field

DEFAULT_FILLERS = ["äh", "ähm", "öh", "öhm", "hm", "hmm", "mhm", "uh", "um"]


class WordConfig(BaseModel):
    # Gap between two words that counts as a pause.
    pause_min_ms: int = Field(default=2000, ge=0)
    # Single tokens counted as fillers, compared case-insensitively without punctuation.
    fillers: list[str] = Field(default_factory=lambda: list(DEFAULT_FILLERS))
    # The same word twice within this gap counts as a repetition ("ich ich").
    repetition_max_gap_ms: int = Field(default=1000, ge=0)
    # Pace is measured per window and compared with the session's own median.
    pace_window_ms: int = Field(default=10000, gt=0)
    pace_min_words: int = Field(default=5, ge=1)
    pace_fast_ratio: float = Field(default=1.3, gt=1)
    pace_slow_ratio: float = Field(default=0.7, gt=0, lt=1)

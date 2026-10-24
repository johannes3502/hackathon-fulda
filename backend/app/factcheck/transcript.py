"""Word timestamps → numbered sentences, so claims get timestamps from code.

The model only references sentence numbers; `t_ms` is never taken from the
model's answer.
"""

from dataclasses import dataclass

from app.transcription.models import Word

SENTENCE_END = (".", "!", "?", "…")


@dataclass(frozen=True)
class Sentence:
    number: int  # 1-based, as shown to the model
    start_ms: int
    end_ms: int
    text: str


def sentences(words: list[Word], max_gap_ms: int = 1500, max_words: int = 40) -> list[Sentence]:
    """Split after end punctuation, at long gaps, or after `max_words` (ASR without punctuation)."""
    result: list[Sentence] = []
    current: list[Word] = []

    def close():
        if current:
            result.append(Sentence(len(result) + 1, current[0].start_ms, current[-1].end_ms,
                                   " ".join(w.word.strip() for w in current if w.word.strip())))
            current.clear()

    for word in sorted(words, key=lambda w: w.start_ms):
        if current and (word.start_ms - current[-1].end_ms > max_gap_ms or len(current) >= max_words):
            close()
        current.append(word)
        if word.word.rstrip().endswith(SENTENCE_END):
            close()
    close()
    return [s for s in result if s.text]


def clock(ms: int) -> str:
    seconds = ms // 1000
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def windows(items: list[Sentence], max_chars: int = 6000) -> list[list[Sentence]]:
    """Batches of consecutive sentences that fit one extraction prompt."""
    batches: list[list[Sentence]] = [[]]
    size = 0
    for sentence in items:
        if batches[-1] and size + len(sentence.text) > max_chars:
            batches.append([])
            size = 0
        batches[-1].append(sentence)
        size += len(sentence.text) + 12
    return [batch for batch in batches if batch]

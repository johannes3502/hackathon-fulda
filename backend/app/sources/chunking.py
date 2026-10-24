"""Split segments into retrieval chunks that keep their location.

Pages and slides are never merged, so a citation names exactly one page or
slide. Paragraphs and line blocks are small and are merged up to `max_chars`.
Long segments are split at sentence boundaries with a short overlap.
"""

import re
from dataclasses import dataclass

from app.sources.extract import LocationKind, Segment

MERGEABLE = {"paragraph", "line"}


@dataclass(frozen=True)
class Chunk:
    ordinal: int
    kind: LocationKind
    start: int
    end: int
    text: str


def _sentences(text: str, max_chars: int) -> list[str]:
    parts = [part for part in re.split(r"(?<=[.!?:;])\s+|\n", text) if part.strip()]
    result = []
    for part in parts:
        while len(part) > max_chars:  # A single overlong "sentence": cut at a word.
            cut = part.rfind(" ", 0, max_chars)
            cut = cut if cut > max_chars // 2 else max_chars
            result.append(part[:cut].strip())
            part = part[cut:].strip()
        result.append(part)
    return result


def _split(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    pieces, current = [], []
    for sentence in _sentences(text, max_chars):
        if current and len(" ".join(current + [sentence])) > max_chars:
            pieces.append(" ".join(current))
            overlap: list[str] = []
            for previous in reversed(current):
                candidate = [previous] + overlap
                if len(" ".join(candidate)) > overlap_chars or len(" ".join(candidate + [sentence])) > max_chars:
                    break
                overlap = candidate
            current = overlap
        current.append(sentence)
    if current:
        pieces.append(" ".join(current))
    return pieces


def chunk_segments(segments: list[Segment], max_chars: int = 1200, overlap_chars: int = 200) -> list[Chunk]:
    pieces: list[tuple[LocationKind, int, int, str]] = []
    for segment in segments:
        for text in _split(segment.text, max_chars, overlap_chars):
            previous = pieces[-1] if pieces else None
            if previous and segment.kind in MERGEABLE and previous[0] == segment.kind \
                    and len(previous[3]) + 1 + len(text) <= max_chars:
                pieces[-1] = (segment.kind, previous[1], segment.number, f"{previous[3]}\n{text}")
            else:
                pieces.append((segment.kind, segment.number, segment.number, text))
    return [Chunk(ordinal, kind, start, end, text) for ordinal, (kind, start, end, text) in enumerate(pieces)]

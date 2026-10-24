"""Derive speech events from word timestamps. Pure functions, no I/O."""

import re
from statistics import median

from app.speech.config import SpeechConfig
from app.speech.models import SpeechAnalysis, SpeechEvent, SpeechSummary, Word

_PUNCTUATION = re.compile(r"[^\w]+", re.UNICODE)


def normalize(token: str) -> str:
    return _PUNCTUATION.sub("", token.casefold())


def analyze_words(words: list[Word], config: SpeechConfig | None = None) -> SpeechAnalysis:
    config = config or SpeechConfig()
    words = sorted(words, key=lambda w: (w.start_ms, w.end_ms))
    fillers = {normalize(f) for f in config.fillers}

    pauses = _pauses(words, config)
    filler_events, repetition_events = _fillers_and_repetitions(words, fillers, config)
    pace_events, window_wpms = _pace(words, config)

    events = sorted(
        pauses + filler_events + repetition_events + pace_events,
        key=lambda e: (e.t_ms, e.type),
    )
    duration = words[-1].end_ms - words[0].start_ms if words else 0
    summary = SpeechSummary(
        word_count=len(words),
        speaking_duration_ms=duration,
        words_per_minute=round(len(words) / duration * 60000, 1) if duration else None,
        pause_count=len(pauses),
        filler_count=len(filler_events),
        repetition_count=len(repetition_events),
        median_window_wpm=round(median(window_wpms), 1) if window_wpms else None,
    )
    return SpeechAnalysis(summary=summary, events=events, heuristics=config.model_dump())


def _pauses(words: list[Word], config: SpeechConfig) -> list[SpeechEvent]:
    events = []
    for previous, current in zip(words, words[1:]):
        gap = current.start_ms - previous.end_ms
        if gap >= config.pause_min_ms:
            events.append(
                SpeechEvent(
                    t_ms=previous.end_ms,
                    duration_ms=gap,
                    type="pause",
                    severity="info",
                    payload={
                        "gap_ms": gap,
                        "before": previous.word,
                        "after": current.word,
                        # Only meaningful if the ASR delivers punctuation.
                        "mid_sentence": not previous.word.rstrip().endswith((".", "!", "?", ":")),
                    },
                )
            )
    return events


def _fillers_and_repetitions(
    words: list[Word], fillers: set[str], config: SpeechConfig
) -> tuple[list[SpeechEvent], list[SpeechEvent]]:
    filler_events, repetition_events = [], []
    previous: Word | None = None
    for word in words:
        token = normalize(word.word)
        if not token:
            continue
        if token in fillers:
            filler_events.append(
                SpeechEvent(
                    t_ms=word.start_ms,
                    duration_ms=word.end_ms - word.start_ms,
                    type="filler",
                    severity="hint",
                    payload={"kind": "filler", "word": word.word},
                )
            )
            continue
        if (
            previous is not None
            and normalize(previous.word) == token
            and word.start_ms - previous.end_ms <= config.repetition_max_gap_ms
        ):
            repetition_events.append(
                SpeechEvent(
                    t_ms=previous.start_ms,
                    duration_ms=word.end_ms - previous.start_ms,
                    type="filler",
                    severity="hint",
                    payload={"kind": "repetition", "word": word.word},
                )
            )
        previous = word
    return filler_events, repetition_events


def _pace(words: list[Word], config: SpeechConfig) -> tuple[list[SpeechEvent], list[float]]:
    """Words per minute per window, relative to the session's own median.

    Speaking time inside a window excludes gaps of at least `pause_min_ms`,
    so long pauses are reported as pauses rather than as slow pace.
    """
    if not words:
        return [], []
    origin = words[0].start_ms
    windows: dict[int, list[Word]] = {}
    for word in words:
        windows.setdefault((word.start_ms - origin) // config.pace_window_ms, []).append(word)

    measured: list[tuple[int, float, list[Word]]] = []
    for index in sorted(windows):
        chunk = windows[index]
        if len(chunk) < config.pace_min_words:
            continue
        speaking_ms = sum(w.end_ms - w.start_ms for w in chunk) + sum(
            gap
            for a, b in zip(chunk, chunk[1:])
            if 0 < (gap := b.start_ms - a.end_ms) < config.pause_min_ms
        )
        if speaking_ms > 0:
            measured.append((index, len(chunk) / speaking_ms * 60000, chunk))

    wpms = [wpm for _, wpm, _ in measured]
    if len(wpms) < 2:
        return [], wpms
    baseline = median(wpms)

    events: list[SpeechEvent] = []
    last: tuple[int, str] | None = None
    for index, wpm, chunk in measured:
        ratio = wpm / baseline
        direction = "fast" if ratio >= config.pace_fast_ratio else "slow" if ratio <= config.pace_slow_ratio else None
        if direction is None:
            last = None
            continue
        start, end = chunk[0].start_ms, chunk[-1].end_ms
        if last == (index - 1, direction):
            # Extend the previous event over adjacent windows with the same direction.
            event = events[-1]
            event.duration_ms = end - event.t_ms
            event.payload["window_wpm"].append(round(wpm, 1))
        else:
            events.append(
                SpeechEvent(
                    t_ms=start,
                    duration_ms=end - start,
                    type="pace",
                    severity="hint",
                    payload={
                        "direction": direction,
                        "window_wpm": [round(wpm, 1)],
                        "baseline_wpm": round(baseline, 1),
                    },
                )
            )
        last = (index, direction)
    return events, wpms

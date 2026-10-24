"""Speech analysis on synthetic word timestamps only."""

import json
import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.speech import JsonTranscriber, SpeechConfig, Word, analyze_words, run_speech_pipeline


def words_from(spec: list[tuple[str, int, int]]) -> list[Word]:
    return [Word(word=w, start_ms=s, end_ms=e) for w, s, e in spec]


def steady(count: int, start_ms: int, step_ms: int, word: str = "wort") -> list[Word]:
    """`count` distinct words, each lasting 80 % of `step_ms`."""
    return [
        Word(word=f"{word}{i}", start_ms=start_ms + i * step_ms, end_ms=start_ms + i * step_ms + step_ms * 4 // 5)
        for i in range(count)
    ]


def test_empty_transcript():
    result = analyze_words([])
    assert result.events == []
    assert result.summary.word_count == 0
    assert result.summary.words_per_minute is None


def test_pause_detected_with_context():
    words = words_from([("Erstens.", 0, 500), ("Zweitens", 3000, 3500), ("und", 3600, 3800)])
    result = analyze_words(words)
    [pause] = [e for e in result.events if e.type == "pause"]
    assert (pause.t_ms, pause.duration_ms) == (500, 2500)
    assert pause.payload["before"] == "Erstens." and pause.payload["mid_sentence"] is False


def test_pause_threshold_is_configurable():
    words = words_from([("a", 0, 500), ("b", 1500, 2000)])
    assert analyze_words(words).summary.pause_count == 0
    assert analyze_words(words, SpeechConfig(pause_min_ms=1000)).summary.pause_count == 1


def test_fillers_case_and_punctuation_insensitive():
    words = words_from([("Also,", 0, 300), ("Äh,", 400, 600), ("ähm", 700, 900), ("gut", 1000, 1200)])
    result = analyze_words(words)
    assert [e.payload["word"] for e in result.events if e.payload.get("kind") == "filler"] == ["Äh,", "ähm"]
    custom = analyze_words(words, SpeechConfig(fillers=["also"]))
    assert custom.summary.filler_count == 1


def test_repetition_ignores_filler_in_between():
    words = words_from([("ich", 0, 200), ("äh", 300, 500), ("ich", 600, 800), ("denke", 900, 1200)])
    result = analyze_words(words)
    [repetition] = [e for e in result.events if e.payload.get("kind") == "repetition"]
    assert (repetition.t_ms, repetition.duration_ms) == (0, 800)
    assert result.summary.filler_count == 1 and result.summary.repetition_count == 1


def test_repetition_requires_short_gap():
    words = words_from([("so", 0, 200), ("so", 1500, 1700)])
    assert analyze_words(words).summary.repetition_count == 0


def test_pace_relative_to_session_median_and_merged():
    # 3 normal windows (500 ms/word), then 2 fast windows (250 ms/word), then normal again.
    words = (
        steady(20, 0, 500, "n")
        + steady(20, 10000, 500, "m")
        + steady(20, 20000, 500, "o")
        + steady(40, 30000, 250, "f")
        + steady(20, 40000, 500, "p")
        + steady(20, 50000, 500, "q")
    )
    result = analyze_words(words)
    pace = [e for e in result.events if e.type == "pace"]
    assert len(pace) == 1
    assert pace[0].payload["direction"] == "fast"
    assert pace[0].t_ms == 30000 and len(pace[0].payload["window_wpm"]) == 1
    assert result.summary.median_window_wpm == pace[0].payload["baseline_wpm"]


def test_pace_excludes_long_pauses():
    # Same speaking rate in both windows; the second contains a 3 s pause.
    words = steady(20, 0, 500, "a") + steady(5, 10000, 500, "b") + steady(15, 15000, 500, "c")
    result = analyze_words(words)
    assert result.summary.pause_count == 1
    assert [e for e in result.events if e.type == "pace"] == []


def test_unsorted_input_and_heuristics_returned():
    words = words_from([("b", 3000, 3200), ("a", 0, 200)])
    result = analyze_words(words)
    assert result.events[0].payload["before"] == "a"
    assert result.heuristics["pause_min_ms"] == 2000


def test_invalid_word_rejected():
    with pytest.raises(ValueError):
        Word(word="x", start_ms=500, end_ms=100)


def test_api_analyze():
    client = TestClient(app)
    response = client.post(
        "/speech/analyze",
        json={"words": [{"word": "äh", "start_ms": 0, "end_ms": 200}, {"word": "gut", "start_ms": 2500, "end_ms": 2800}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert {e["type"] for e in body["events"]} == {"filler", "pause"}
    assert all(e["source"] == "speech" for e in body["events"])
    assert client.post("/speech/analyze", json={"words": [{"word": "x", "start_ms": 5, "end_ms": 1}]}).status_code == 422


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg not installed")
def test_pipeline_with_synthetic_recording(tmp_path):
    recording = tmp_path / "recording.webm"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=2",
         "-c:a", "libopus", str(recording)],
        check=True,
    )
    words_file = tmp_path / "words.json"
    words_file.write_text(json.dumps([{"word": "hallo", "start_ms": 0, "end_ms": 400}, {"word": "ähm", "start_ms": 500, "end_ms": 700}]))

    class RecordingCheck(JsonTranscriber):
        def transcribe(self, audio_path):
            assert audio_path.read_bytes()[:4] == b"RIFF"
            return super().transcribe(audio_path)

    words, result = run_speech_pipeline(recording, RecordingCheck(words_file))
    assert len(words) == 2 and result.summary.filler_count == 1

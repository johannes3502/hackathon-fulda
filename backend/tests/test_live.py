"""`WS /speech/live` around a fake transcriber; word identity is tone-coded.

Each 500 ms audio chunk encodes one word "w<i>": 400 ms sine at
`200 + 10·i` Hz, then 100 ms silence. The fake only sees window samples, so
window-relative detections at stable absolute times are realistic —
overlapping windows re-detect old words, exercising the cursor dedup.
"""

import asyncio

import numpy as np
import pytest
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

from app.main import app
from app.speech import live
from app.transcription.models import Word
from app.transcription.streaming import WhisperStreamingTranscriber

SAMPLE_RATE = 16_000
FRAME_BYTES = 3200  # 100 ms of Int16 mono PCM per binary frame.
CHUNK_SAMPLES = 8_000  # One 500 ms audio chunk.
WORD_SAMPLES = 6_400  # Tone part of a chunk.
FREQ_BASE, FREQ_STEP = 200.0, 10.0


def encode_words(total_chunks: int) -> np.ndarray:
    samples = np.arange(total_chunks * CHUNK_SAMPLES, dtype=np.float32)
    chunk_index = samples // CHUNK_SAMPLES
    position = samples % CHUNK_SAMPLES
    frequency = np.where(position < WORD_SAMPLES, FREQ_BASE + FREQ_STEP * chunk_index, 0.0)
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    return np.where(frequency > 0, 0.5 * np.sin(phase), 0.0).astype(np.float32)


class WordStreamTranscriber:
    """Detects the encoded 400 ms tones; skips words clipped by a window edge."""

    def transcribe_window(self, samples: np.ndarray, sample_rate: int) -> list[Word]:
        frame = sample_rate // 100  # 10 ms RMS frames.
        frames = samples[: len(samples) // frame * frame].reshape(-1, frame)
        speech = np.sqrt((frames**2).mean(axis=1)) > 0.1
        words: list[Word] = []
        index = 0
        while index < len(speech):
            if not speech[index]:
                index += 1
                continue
            end = index
            while end < len(speech) and speech[end]:
                end += 1
            if end - index == WORD_SAMPLES // frame and (index == 0 or index >= 10) and end <= len(speech) - 10:
                chunk = self._chunk_from_frequency(frames[index:end], sample_rate)
                if chunk is not None:
                    words.append(Word(word=f"w{chunk}", start_ms=index * 10, end_ms=end * 10))
            index = end
        return words

    @staticmethod
    def _chunk_from_frequency(word: np.ndarray, sample_rate: int) -> int | None:
        samples = word.ravel()
        crossings = int(np.count_nonzero(np.diff(np.signbit(samples))))
        frequency = crossings / 2 / (len(samples) / sample_rate)
        chunk = round((frequency - FREQ_BASE) / FREQ_STEP)
        # One lost/gained zero crossing shifts the estimate by 2.5 Hz; chunk
        # spacing is 10 Hz, so a 4 Hz gate cannot misclassify a chunk.
        return chunk if abs(frequency - FREQ_BASE - FREQ_STEP * chunk) <= 4.0 else None


def expected_words(last_chunk: int) -> list[dict]:
    return [
        {"word": f"w{i}", "start_ms": i * 500, "end_ms": i * 500 + 400}
        for i in range(last_chunk + 1)
    ]


def fake_transcriber(monkeypatch) -> None:
    monkeypatch.setattr(live, "configured_streaming_transcriber", lambda: WordStreamTranscriber())


def test_live_streams_words_and_cumulative_text(monkeypatch):
    fake_transcriber(monkeypatch)
    audio = encode_words(24)  # 12 s of speech, 24 word chunks.
    pcm = (audio * 32767).astype("<i2").tobytes()

    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        ws.send_text('{"type": "start", "sample_rate": 16000}')
        assert ws.receive_json() == {"type": "ready", "sample_rate": SAMPLE_RATE}
        for offset in range(0, len(pcm), FRAME_BYTES):
            ws.send_bytes(pcm[offset : offset + FRAME_BYTES])
        streamed = [ws.receive_json() for _ in range(12)]  # words+text per 2 s window.
        ws.send_text('{"type": "stop"}')

        final_words = ws.receive_json()
        final_text = ws.receive_json()
        done = ws.receive_json()
        with pytest.raises(WebSocketDisconnect):
            ws.receive_json()

    word_frames, text_frames = streamed[::2], streamed[1::2]
    assert [len(frame["words"]) for frame in word_frames] == [4, 4, 4, 4, 4, 4]
    assert all(frame["type"] == "words" and frame["final"] is False for frame in word_frames)
    assert [len(frame["text"].split()) for frame in text_frames] == [4, 8, 12, 16, 20, 24]

    assert final_words == {"type": "words", "final": True, "words": expected_words(23)}
    assert final_text == {"type": "text", "final": True, "text": " ".join(f"w{i}" for i in range(24))}
    assert done == {"type": "done"}


def test_live_decode_skips_words_beyond_window():
    # A 1.25 s window fits two full words; the third starts at 1.0 s and is clipped.
    audio = encode_words(6)
    words = WordStreamTranscriber().transcribe_window(audio[: 20_000], SAMPLE_RATE)
    assert [word.word for word in words] == ["w0", "w1"]


def test_live_stop_without_audio_finishes_empty(monkeypatch):
    fake_transcriber(monkeypatch)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        ws.send_text('{"type": "start", "sample_rate": 16000}')
        assert ws.receive_json() == {"type": "ready", "sample_rate": SAMPLE_RATE}
        ws.send_text('{"type": "stop"}')
        final_text = ws.receive_json()
        done = ws.receive_json()
    assert final_text == {"type": "text", "final": True, "text": ""}
    assert done == {"type": "done"}


def test_live_idle_timeout_finalizes(monkeypatch):
    fake_transcriber(monkeypatch)
    monkeypatch.setattr(live, "_MAX_IDLE_SECONDS", 0.05)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        ws.send_text('{"type": "start", "sample_rate": 16000}')
        ws.receive_json()  # ready
        final_text = ws.receive_json()
        done = ws.receive_json()
    assert final_text["final"] is True and done == {"type": "done"}


@pytest.mark.parametrize(
    ("action", "message"),
    [
        ("start_rate", "Only 16 kHz mono Int16 PCM is supported"),
        ("start_missing", 'First message must be {"type": "start", "sample_rate": 16000}'),
        ("binary_first", 'First message must be {"type": "start", "sample_rate": 16000}'),
        ("not_json", "Control frames must be JSON:"),
    ],
)
def test_live_rejects_malformed_sessions(monkeypatch, action, message):
    fake_transcriber(monkeypatch)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        if action == "start_rate":
            ws.send_text('{"type": "start", "sample_rate": 48000}')
        elif action == "start_missing":
            ws.send_text('{"type": "stop"}')
        elif action == "not_json":
            ws.send_text("hello")
        else:
            ws.send_bytes(b"\0\0")
        error = ws.receive_json()
    assert error["type"] == "error"
    assert message in error["message"]


def test_live_rejects_unknown_control_frame(monkeypatch):
    fake_transcriber(monkeypatch)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        ws.send_text('{"type": "start", "sample_rate": 16000}')
        ws.receive_json()  # ready
        ws.send_text('{"type": "pause"}')
        error = ws.receive_json()
    assert error["type"] == "error"


def test_live_second_session_is_rejected(monkeypatch):
    fake_transcriber(monkeypatch)
    monkeypatch.setattr(live, "_SLOT_ACQUIRE_TIMEOUT", 0.05)
    monkeypatch.setattr(live, "_STREAM_SLOTS", asyncio.Semaphore(0))
    with pytest.raises(WebSocketDisconnect):
        with TestClient(app).websocket_connect("/speech/live"):
            pass


def test_streaming_env_precedence(monkeypatch):
    monkeypatch.setenv("WHISPER_LIVE_MODEL", "tiny")
    monkeypatch.setenv("WHISPER_MODEL", "small")
    monkeypatch.setenv("WHISPER_LIVE_BEAM_SIZE", "2")
    transcriber = WhisperStreamingTranscriber.from_env()
    assert transcriber.model == "tiny" and transcriber.beam_size == 2


def test_streaming_rejects_invalid_beam(monkeypatch):
    monkeypatch.delenv("WHISPER_LIVE_MODEL", raising=False)
    monkeypatch.setenv("WHISPER_MODEL", "tiny")
    monkeypatch.setenv("WHISPER_LIVE_BEAM_SIZE", "0")
    with pytest.raises(ValueError):
        WhisperStreamingTranscriber.from_env()

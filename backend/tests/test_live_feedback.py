import asyncio

import numpy as np
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.speech import live
from app.speech.analysis import analyze_samples


def test_feedback_before_stop_preserves_calibration_and_requires_no_whisper(monkeypatch):
    monkeypatch.setattr(live, "configured_streaming_transcriber", lambda: pytest.fail("No ASR in signal preview"))
    # Pure tones test signal rules, not Silero's ability to recognise speech.
    monkeypatch.setattr(live, "analyze_samples", lambda samples, config:
                        analyze_samples(samples, config.model_copy(update={"activity_detector": "energy"})))
    t = np.arange(16000 * 10) / 16000
    audio = np.sin(2 * np.pi * 150 * t) * np.where(t < 5, 0.3, 0.05)
    pcm = (audio * 32767).astype("<i2").tobytes()
    with TestClient(app).websocket_connect("/speech/feedback") as ws:
        ws.send_json({"type": "start", "sample_rate": 16000})
        assert ws.receive_json()["type"] == "ready"
        for offset in range(0, len(pcm), 3200):
            ws.send_bytes(pcm[offset:offset + 3200])
        first, second = ws.receive_json(), ws.receive_json()
        assert first["position_ms"] == 5000 and second["position_ms"] == 10000
        quiet = [e for e in second["events"] if e["type"] == "volume"]
        assert quiet and quiet[0]["payload"]["direction"] == "quiet"
        assert quiet[0]["t_ms"] >= 4000
        assert all(e["t_ms"] + e["duration_ms"] <= 10000 for e in second["events"])
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "done"}


@pytest.mark.parametrize("raw", [b"x", bytes(32002)])
def test_feedback_rejects_unaligned_or_oversized_frames_and_releases_slot(raw):
    with TestClient(app).websocket_connect("/speech/feedback") as ws:
        ws.send_json({"type": "start", "sample_rate": 16000})
        ws.receive_json()
        ws.send_bytes(raw)
        assert ws.receive_json()["type"] == "error"
    assert not live._FEEDBACK_SLOTS.locked()


def test_feedback_capacity_is_separate_from_captions(monkeypatch):
    monkeypatch.setattr(live, "_STREAM_SLOTS", asyncio.Semaphore(0))
    with TestClient(app).websocket_connect("/speech/feedback") as ws:
        ws.send_json({"type": "start", "sample_rate": 16000})
        assert ws.receive_json()["type"] == "ready"
        ws.send_json({"type": "stop"})
        assert ws.receive_json()["type"] == "done"
    monkeypatch.setattr(live, "_FEEDBACK_SLOTS", asyncio.Semaphore(0))
    monkeypatch.setattr(live, "_SLOT_ACQUIRE_TIMEOUT", 0.01)
    with pytest.raises(WebSocketDisconnect):
        with TestClient(app).websocket_connect("/speech/feedback"):
            pass

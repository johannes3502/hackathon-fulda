"""Hosted protocol tests with synthetic PCM and an in-memory upstream; no paid calls."""

import asyncio
import json
from threading import Event as ThreadEvent
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.main import app
from app.transcription import deepgram_live


class Upstream:
    def __init__(self, fail=False, early_close=False):
        self.incoming = asyncio.Queue()
        self.sent = []
        self.fail = fail
        self.early_close = early_close
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        self.closed = True

    async def send(self, raw):
        self.sent.append(raw)
        if isinstance(raw, bytes):
            if self.fail:
                await self.incoming.put(json.dumps({"type": "Error", "description": "private-provider-detail"}))
            elif self.early_close:
                await self.incoming.put(None)
            else:
                await self.incoming.put(json.dumps({
                    "type": "Results", "is_final": False,
                    "channel": {"alternatives": [{"transcript": "Hallo", "words": []}]},
                }))
        else:
            assert json.loads(raw) == {"type": "CloseStream"}
            if any(isinstance(item, bytes) for item in self.sent):
                # Deliver the last word only when the audio buffer is flushed.
                await self.incoming.put(json.dumps({
                    "type": "Results", "is_final": True,
                    "channel": {"alternatives": [{"transcript": "Hallo.", "words": [
                        {"word": "hallo", "punctuated_word": "Hallo.", "start": 0.0, "end": 0.15},
                    ]}]},
                }))
            await self.incoming.put(json.dumps({"type": "Metadata", "duration": 0.2}))
            await self.incoming.put(None)

    def __aiter__(self):
        return self

    async def __anext__(self):
        raw = await self.incoming.get()
        if raw is None:
            raise StopAsyncIteration
        return raw


def setup(monkeypatch, **kwargs):
    upstream = Upstream(**kwargs)
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-only-secret")
    connect = Mock(return_value=upstream)
    monkeypatch.setattr(deepgram_live, "connect", connect)
    return upstream, connect


def start(ws):
    ws.send_json({"type": "start", "sample_rate": 16000, "provider": "deepgram"})
    assert ws.receive_json() == {"type": "ready", "sample_rate": 16000, "provider": "deepgram"}


def test_relay_delivers_partial_text_and_drains_final_words(monkeypatch):
    upstream, connect = setup(monkeypatch)
    pcm = b"\0\0" * 3200
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        start(ws)
        ws.send_bytes(pcm)
        assert ws.receive_json() == {"type": "text", "final": False, "text": "Hallo"}
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "text", "final": False, "text": "Hallo."}
        assert ws.receive_json() == {"type": "words", "final": True, "words": [
            {"word": "Hallo.", "start_ms": 0, "end_ms": 150},
        ]}
        assert ws.receive_json() == {"type": "text", "final": True, "text": "Hallo."}
        assert ws.receive_json() == {"type": "done"}
    assert upstream.closed
    assert upstream.sent == [pcm, '{"type": "CloseStream"}']
    url = urlsplit(connect.call_args.args[0])
    assert url.scheme == "wss" and url.netloc == "api.eu.deepgram.com"
    params = parse_qs(url.query)
    assert params["language"] == ["de"]
    assert params["model"] == ["nova-3"]
    assert params["encoding"] == ["linear16"] and params["sample_rate"] == ["16000"]
    assert "filler_words" not in params
    assert connect.call_args.kwargs["additional_headers"] == {"Authorization": "Token test-only-secret"}


def test_empty_stream_is_a_complete_empty_transcript(monkeypatch):
    setup(monkeypatch)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        start(ws)
        ws.send_json({"type": "stop"})
        assert ws.receive_json() == {"type": "words", "final": True, "words": []}
        assert ws.receive_json()["final"] is True
        assert ws.receive_json() == {"type": "done"}


@pytest.mark.parametrize("failure", ["error", "early_close", "invalid_pcm", "limit"])
def test_incomplete_streams_never_emit_reusable_final_words(monkeypatch, failure):
    upstream, _ = setup(monkeypatch, fail=failure == "error", early_close=failure == "early_close")
    if failure == "limit":
        monkeypatch.setattr("app.speech.live._MAX_SECONDS", 0)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        start(ws)
        ws.send_bytes(b"\0" if failure == "invalid_pcm" else b"\0\0" * 3200)
        error = ws.receive_json()
        assert error["type"] == "error"
        assert "test-only-secret" not in error["message"]
        assert "private-provider-detail" not in error["message"]
    assert upstream.closed


def test_missing_key_is_reported_without_connecting(monkeypatch):
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    connect = Mock(side_effect=AssertionError("must not connect"))
    monkeypatch.setattr(deepgram_live, "connect", connect)
    with TestClient(app) as client, client.websocket_connect("/speech/live") as ws:
        ws.send_json({"type": "start", "sample_rate": 16000, "provider": "deepgram"})
        error = ws.receive_json()
        assert error["type"] == "error" and "DEEPGRAM_API_KEY" in error["message"]
    connect.assert_not_called()


def test_disconnect_releases_upstream_and_live_slot(monkeypatch):
    upstream, _ = setup(monkeypatch)
    disconnected = ThreadEvent()
    original = deepgram_live.stream_deepgram
    async def observe_disconnect(*args, **kwargs):
        try:
            return await original(*args, **kwargs)
        finally:
            disconnected.set()
    monkeypatch.setattr(deepgram_live, "stream_deepgram", observe_disconnect)
    with TestClient(app) as client:
        with client.websocket_connect("/speech/live") as ws:
            start(ws)
            # Exercise protocol disconnect before TestClient cancels its app
            # scope on __exit__; otherwise recent Starlette races cleanup.
            ws.close()
            assert disconnected.wait(timeout=2)
        assert upstream.closed
        with client.websocket_connect("/speech/live") as ws:
            start(ws)
            ws.send_json({"type": "stop"})
            assert ws.receive_json()["type"] == "words"
            assert ws.receive_json()["type"] == "text"
            assert ws.receive_json()["type"] == "done"

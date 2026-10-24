"""WebSocket live transcription (`WS /speech/live`).

Client protocol: JSON text frames for control, binary frames for audio.

1. Client → server: `{"type": "start", "sample_rate": 16000}` (16 kHz required).
2. Server → client: `{"type": "ready", "sample_rate": 16000}`.
3. Client → server: binary frames of mono Int16 PCM at the agreed rate.
4. After each transcription window the server sends
   `{"type": "words", "final": false, "words": [...]}` (absolute ms since
   session start) and a cumulative `{"type": "text", "final": false, ...}`.
5. Client → server: `{"type": "stop"}` to finalize (30 s of silence finalizes
   implicitly, as does `WHISPER_LIVE_MAX_SECONDS` of audio).
6. Server → client: final `words`/`text` frames, then `{"type": "done"}`.

Errors answer with `{"type": "error", "message": "..."}` and close the socket.
The default is local Whisper; start with provider="deepgram" for hosted streaming.
Tests inject a fake `StreamingTranscriber` or upstream instead of paid services.
"""

import asyncio
import json
from typing import Any

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.speech.analysis import analyze_samples
from app.speech.config import AudioConfig
from app.transcription.models import Word
from app.transcription.streaming import (
    LiveDoneMessage,
    LiveErrorMessage,
    LiveReadyMessage,
    LiveTextMessage,
    LiveWordsMessage,
    StreamingTranscriber,
    configured_streaming_transcriber,
)
from app.transcription.text import transcript_text
from app.transcription.transcriber import _env_int

router = APIRouter(prefix="/speech", tags=["speech"])

SAMPLE_RATE = 16000
_CHUNK_MS = _env_int("WHISPER_LIVE_CHUNK_MS", 2000)
_MAX_WINDOW_MS = _env_int("WHISPER_LIVE_MAX_WINDOW_MS", 10000)
_MAX_SECONDS = _env_int("WHISPER_LIVE_MAX_SECONDS", 600)
_MAX_IDLE_SECONDS = _env_int("WHISPER_LIVE_MAX_IDLE_SECONDS", 30)
_STREAM_SLOTS = asyncio.Semaphore(1)
_FEEDBACK_SLOTS = asyncio.Semaphore(1)
_SLOT_ACQUIRE_TIMEOUT = 5.0

_STOP = object()  # Sentinel: stop received or a finalization limit was reached.


@router.websocket("/feedback")
async def live_feedback(ws: WebSocket) -> None:
    """Signal-only preview, independent of Whisper. PCM lives only in memory."""
    try:
        await asyncio.wait_for(_FEEDBACK_SLOTS.acquire(), timeout=_SLOT_ACQUIRE_TIMEOUT)
    except TimeoutError:
        await ws.close(code=1013, reason="Live speech feedback is at capacity")
        return
    try:
        await ws.accept()
        await asyncio.wait_for(_await_start(ws), timeout=10)
        await _send(ws, LiveReadyMessage(sample_rate=SAMPLE_RATE))
        pcm = bytearray()
        checked_ms = 0
        config = AudioConfig()
        minimum = {"volume": config.volume_window_ms, "pitch": config.pitch_window_ms,
                   "pace": config.pace_window_ms, "pause": config.pause_min_ms}
        # Replay the causal adaptive reference for preview/batch consistency.
        # Use incremental DSP beyond five minutes.
        limit = 300 * SAMPLE_RATE * 2
        while len(pcm) < limit:
            raw = await _receive(ws)
            if not isinstance(raw, bytes):
                break
            if len(raw) % 2 or len(raw) > SAMPLE_RATE * 2:
                raise ValueError("Send aligned Int16 PCM frames of at most one second")
            pcm.extend(raw[:limit - len(pcm)])
            position_ms = len(pcm) * 1000 // (SAMPLE_RATE * 2)
            if position_ms - checked_ms < 5000:
                continue
            result = await run_in_threadpool(analyze_samples, _pcm_to_float32(bytes(pcm)), config)
            checked_ms = position_ms
            events = [e.model_dump() for e in result.events
                      if e.duration_ms >= minimum[e.type]
                      and e.t_ms + e.duration_ms > position_ms - 5000]
            await ws.send_json({"type": "feedback", "position_ms": position_ms, "events": events})
        await _send(ws, LiveDoneMessage())
        await ws.close(code=1000)
    except WebSocketDisconnect:
        pass
    except Exception as error:
        try:
            await _send(ws, LiveErrorMessage(message=str(error) or error.__class__.__name__))
            await ws.close(code=1011)
        except (WebSocketDisconnect, RuntimeError):
            pass
    finally:
        _FEEDBACK_SLOTS.release()


def _pcm_to_float32(raw: bytes) -> np.ndarray:
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


async def _acquire_slot(websocket: WebSocket) -> bool:
    """At most one live session per process keeps near-realtime latency honest."""
    try:
        await asyncio.wait_for(_STREAM_SLOTS.acquire(), timeout=_SLOT_ACQUIRE_TIMEOUT)
    except TimeoutError:
        await websocket.close(code=1013, reason="Live transcription is at capacity")
        return False
    return True


class _Session:
    """One live client: PCM buffer, transcription cursor, emitted words."""

    def __init__(self):
        self.pcm = bytearray()
        self.words: list[Word] = []  # Emitted in absolute ms; basis for dedup and text.
        self.cursor_ms = 0  # Absolute end of the last emitted word; dedup boundary.
        self.window_checked_ms = 0  # PCM length covered by the last transcribe call.

    @property
    def position_ms(self) -> int:
        return round(len(self.pcm) / 2 / SAMPLE_RATE * 1000)

    def append(self, raw: bytes) -> None:
        if len(raw) % 2:
            raw = raw[:-1]  # Tolerate a stray byte instead of failing the session.
        self.pcm.extend(raw)

    def window(self) -> tuple[int, np.ndarray]:
        """Start ms and PCM samples of the transcription window (session-relative)."""
        start = max(0, len(self.pcm) - _MAX_WINDOW_MS * SAMPLE_RATE * 2 // 1000) & ~1
        return self.position_ms_of(start), _pcm_to_float32(bytes(self.pcm[start:]))

    def position_ms_of(self, sample_count: int) -> int:
        return round(sample_count / 2 / SAMPLE_RATE * 1000)

    def absorb(self, window_start_ms: int, words: list[Word]) -> list[Word]:
        """Map window words to absolute ms and emit those past the cursor."""
        emitted: list[Word] = []
        for word in words:
            start_ms = window_start_ms + word.start_ms
            if start_ms < self.cursor_ms:
                continue  # Already part of the previous, overlapping window.
            absolute = Word(word=word.word, start_ms=start_ms, end_ms=window_start_ms + word.end_ms)
            self.words.append(absolute)
            self.cursor_ms = max(self.cursor_ms, absolute.end_ms)
            emitted.append(absolute)
        self.window_checked_ms = self.position_ms
        return emitted


@router.websocket("/live")
async def live_speech(websocket: WebSocket) -> None:
    if not await _acquire_slot(websocket):
        return
    try:
        await _run_session(websocket)
    except WebSocketDisconnect:
        pass  # Client went away mid-session; the slot is released regardless.
    finally:
        _STREAM_SLOTS.release()


async def _run_session(ws: WebSocket) -> None:
    await ws.accept()
    session = _Session()
    try:
        start = await asyncio.wait_for(_await_start(ws), timeout=10)
        if start.get("provider") == "deepgram":
            from app.transcription.deepgram_live import stream_deepgram
            await stream_deepgram(ws, _receive, max_seconds=_MAX_SECONDS)
            return
        if start.get("provider", "whisper") != "whisper":
            raise ValueError("Unsupported live transcription provider")
        transcriber = await run_in_threadpool(configured_streaming_transcriber)
        await _send(ws, LiveReadyMessage(sample_rate=SAMPLE_RATE))
        while True:
            raw = await _receive(ws)
            if not isinstance(raw, bytes):  # stop, idle/audio limit, or disconnect.
                break
            session.append(raw)
            if session.position_ms >= _MAX_SECONDS * 1000:
                break
            if session.position_ms - session.window_checked_ms >= _CHUNK_MS:
                message = await _transcribe(session, transcriber, final=False)
                if message is not None:
                    await _send(ws, message)
                    await _send(ws, _text_message(session, final=False))
        await _finish(ws, session, transcriber)
    except WebSocketDisconnect:
        raise
    except Exception as error:
        try:
            await _send(ws, LiveErrorMessage(message=str(error) or error.__class__.__name__))
            await ws.close(code=1011)
        except (WebSocketDisconnect, RuntimeError):
            pass  # The client left first; the disconnect above is the truth.


async def _await_start(ws: WebSocket) -> dict[str, Any]:
    while True:
        message = await ws.receive()
        if "text" not in message:
            raise ValueError('First message must be {"type": "start", "sample_rate": 16000}')
        payload = _parse_control(message["text"])
        if payload.get("type") != "start":
            raise ValueError('First message must be {"type": "start", "sample_rate": 16000}')
        if payload.get("sample_rate") != SAMPLE_RATE:
            raise ValueError("Only 16 kHz mono Int16 PCM is supported")
        return payload


def _parse_control(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text)
    except ValueError as error:
        raise ValueError(f"Control frames must be JSON: {error}") from error
    if not isinstance(payload, dict):
        raise ValueError("Control frames must be JSON objects")
    return payload


async def _receive(ws: WebSocket) -> str | bytes:
    try:
        message = await asyncio.wait_for(ws.receive(), timeout=_MAX_IDLE_SECONDS)
    except TimeoutError:
        return _STOP  # Silence finalizes like an explicit stop.
    if message["type"] == "websocket.disconnect":
        raise WebSocketDisconnect(message.get("code", 1000))
    if "text" in message:
        payload = _parse_control(message["text"])
        if payload.get("type") != "stop":
            raise ValueError('Control frames must be {"type": "stop"} during streaming')
        return _STOP
    return message.get("bytes") or _STOP


async def _finish(ws: WebSocket, session: _Session, transcriber: StreamingTranscriber) -> None:
    if session.position_ms != session.window_checked_ms:
        message = await _transcribe(session, transcriber, final=False)
        if message is not None:
            await _send(ws, message)
    if session.words:
        await _send(ws, LiveWordsMessage(final=True, words=session.words))
    await _send(ws, _text_message(session, final=True))
    await _send(ws, LiveDoneMessage())
    await ws.close(code=1000)


async def _transcribe(session: _Session, transcriber: StreamingTranscriber, *, final: bool) -> LiveWordsMessage | None:
    window_start_ms, samples = session.window()
    words = await run_in_threadpool(transcriber.transcribe_window, samples, SAMPLE_RATE)
    emitted = session.absorb(window_start_ms, words)
    if not emitted:
        return None  # Silence or pure re-detection; the client already knows.
    return LiveWordsMessage(final=final, words=emitted)


def _text_message(session: _Session, *, final: bool) -> LiveTextMessage:
    return LiveTextMessage(text=transcript_text(session.words), final=final)


async def _send(ws: WebSocket, message: LiveWordsMessage | LiveTextMessage | LiveReadyMessage | LiveErrorMessage | LiveDoneMessage) -> None:
    await ws.send_text(message.model_dump_json())

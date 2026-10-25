"""Measure near-realtime latency of `WS /speech/live` against a running API.

`python -m scripts.smoke_live <recording.wav>` converts the recording to 16 kHz
mono Int16 PCM via FFmpeg and streams it in real time (100 ms frames). Latency
is measured against the last delivered word's timestamp (including pauses),
or the analysed PCM position with --feedback. It never uses the sender's
latest position, which hides a server backlog. Run against Compose:
`docker compose up backend` in another terminal, then this script. Synthetic
fixtures only, never real microphone captures.
"""

import argparse
import asyncio
import json
import math
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
import websockets

SAMPLE_RATE = 16_000
FRAME_MS = 100
FRAME_BYTES = FRAME_MS * SAMPLE_RATE // 1000 * 2


def pcm_frames(recording: Path) -> list[bytes]:
    """Mono s16 16 kHz PCM split into 100 ms frames (FFmpeg normalizes input)."""
    with wave.open(str(recording), "rb") as wav:
        raw = wav.readframes(wav.getnframes())
        matches = wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == SAMPLE_RATE
    if not matches:
        raw = subprocess.run(
            ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(recording),
             "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "pipe:1"],
            check=True, capture_output=True,
        ).stdout
    assert raw and len(raw) % 2 == 0, "recording produced no usable PCM"
    return [raw[i : i + FRAME_BYTES] for i in range(0, len(raw), FRAME_BYTES)]


def delivery_delay_ms(elapsed_ms: float, audio_position_ms: float) -> float:
    return max(0.0, elapsed_ms - audio_position_ms)


async def measure(ws_url: str, frames: list[bytes], *, connect_timeout: float = 15, receive_timeout: float = 60) -> None:
    async with websockets.connect(ws_url, open_timeout=connect_timeout) as ws:
        await ws.send('{"type": "start", "sample_rate": 16000}')
        assert json.loads(await asyncio.wait_for(ws.recv(), timeout=receive_timeout)) == {"type": "ready", "sample_rate": 16000}
        started = time.monotonic()
        state = {"latency_ms": [], "texts": [], "events": []}

        async def sender() -> None:
            sent_bytes = 0
            for frame in frames:
                sent_bytes += len(frame)
                due = started + sent_bytes / (SAMPLE_RATE * 2)
                delay = due - time.monotonic()
                if delay > 0:
                    await asyncio.sleep(delay)
                await ws.send(frame)
            await ws.send('{"type": "stop"}')

        reader = asyncio.create_task(sender())
        done = False
        while not done:
            payload = await asyncio.wait_for(ws.recv(), timeout=receive_timeout)
            if isinstance(payload, bytes):
                raise AssertionError("Unexpected binary frame from the server")
            message = json.loads(payload)
            if message["type"] == "words" and message["words"] and not message["final"]:
                position = max(word["end_ms"] for word in message["words"])
                state["latency_ms"].append(delivery_delay_ms((time.monotonic() - started) * 1000, position))
            elif message["type"] == "feedback":
                delay = delivery_delay_ms((time.monotonic() - started) * 1000, message["position_ms"])
                state["latency_ms"].append(delay)
                state["events"].extend(message["events"])
                print(f"Feedback at {message['position_ms']} ms: {delay:.0f} ms delay, "
                      f"{len(message['events'])} events", flush=True)
            elif message["type"] == "text":
                state["texts"].append(message["text"])
            elif message["type"] == "error":
                raise AssertionError(f"Server error: {message['message']}")
            elif message["type"] == "done":
                done = True
        await reader

    delays = np.array(state["latency_ms"])
    final = state["texts"][-1].split() if state["texts"] else []
    if not ws_url.endswith("/feedback"):
        print(f"Final transcript ({len(final)} words): {' '.join(final) if final else '<empty>'}")
    if len(delays):
        print(f"Delivery delay ms: p50={np.percentile(delays, 50):.0f} "
              f"p95={np.percentile(delays, 95):.0f} max={delays.max():.0f} (n={len(delays)})")
    if ws_url.endswith("/feedback"):
        assert len(delays), "No live feedback updates received"
        print(f"PASS live signal analysis: {len(delays)} updates, {len(state['events'])} event observations")
    else:
        assert final, "No live transcript received"
        print(f"PASS live transcription returned {len(final)} words")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recording", type=Path, help="Synthetic German recording")
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--feedback", action="store_true", help="Measure signal feedback instead of captions")
    parser.add_argument("--connect-timeout", type=float, default=15, help="WebSocket connection timeout in seconds (default: 15)")
    parser.add_argument("--receive-timeout", type=float, default=60, help="Maximum wait per server message in seconds, including ready (default: 60)")
    args = parser.parse_args()
    for name in ("connect_timeout", "receive_timeout"):
        value = getattr(args, name)
        if not math.isfinite(value) or value <= 0:
            parser.error(f"--{name.replace('_', '-')} must be a finite number greater than zero")
    ws_url = args.url.replace("https://", "wss://").replace("http://", "ws://").rstrip("/")
    ws_url += "/speech/feedback" if args.feedback else "/speech/live"
    frames = pcm_frames(args.recording)
    print(f"Streaming {len(frames)} frames ({len(frames) * FRAME_MS / 1000:.1f} s) in real time...")
    asyncio.run(measure(ws_url, frames, connect_timeout=args.connect_timeout, receive_timeout=args.receive_timeout))


if __name__ == "__main__":
    main()

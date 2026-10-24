"""Measure near-realtime latency of `WS /speech/live` against a running API.

`python -m scripts.smoke_live <recording.wav>` converts the recording to 16 kHz
mono Int16 PCM via FFmpeg and streams it in real time (100 ms frames). Latency
is the delay between the audio position being fed and the delivery moment of
the corresponding `words` message; a value near zero means the server keeps up
with real-time speech. Run against Compose:
`docker compose up backend` in another terminal, then this script. Synthetic
fixtures only, never real microphone captures.
"""

import argparse
import asyncio
import json
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
    return [raw[i : i + FRAME_BYTES] for i in range(0, len(raw) - FRAME_BYTES // 2, FRAME_BYTES)] or [raw]


async def measure(ws_url: str, frames: list[bytes]) -> None:
    async with websockets.connect(ws_url, open_timeout=15) as ws:
        await ws.send('{"type": "start", "sample_rate": 16000}')
        assert json.loads(await ws.recv()) == {"type": "ready", "sample_rate": 16000}
        started = time.monotonic()
        state = {"sent_ms": 0, "latency_ms": [], "texts": []}

        async def sender() -> None:
            for index, frame in enumerate(frames):
                due = started + index * FRAME_MS / 1000
                delay = due - time.monotonic()
                if delay > 0:
                    await asyncio.sleep(delay)
                await ws.send(frame)
                state["sent_ms"] += FRAME_MS
            await ws.send('{"type": "stop"}')

        reader = asyncio.create_task(sender())
        done = False
        while not done:
            payload = await ws.recv()
            if isinstance(payload, bytes):
                raise AssertionError("Unexpected binary frame from the server")
            message = json.loads(payload)
            if message["type"] == "words":
                delay_ms = (time.monotonic() - started) * 1000 - state["sent_ms"]
                state["latency_ms"].append(max(0.0, delay_ms))
            elif message["type"] == "text":
                state["texts"].append(message["text"])
            elif message["type"] == "error":
                raise AssertionError(f"Server error: {message['message']}")
            elif message["type"] == "done":
                done = True
        await reader

    delays = np.array(state["latency_ms"])
    final = state["texts"][-1].split() if state["texts"] else []
    print(f"Final transcript ({len(final)} words): {' '.join(final) if final else '<empty>'}")
    if len(delays):
        print(f"Window latency ms: p50={np.percentile(delays, 50):.0f} "
              f"p95={np.percentile(delays, 95):.0f} max={delays.max():.0f} (n={len(delays)})")
    print(f"{'PASS' if len(final) else 'WARN'} live transcription returned {len(final)} words")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recording", type=Path, help="Synthetic German recording")
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    ws_url = args.url.replace("https://", "wss://").replace("http://", "ws://").rstrip("/") + "/speech/live"
    frames = pcm_frames(args.recording)
    print(f"Streaming {len(frames)} frames ({len(frames) * FRAME_MS / 1000:.1f} s) in real time...")
    asyncio.run(measure(ws_url, frames))


if __name__ == "__main__":
    main()

"""Relay 16 kHz PCM to Deepgram EU. Credentials never leave the backend.

No retries: reconnecting would reset the audio clock and can bill twice.
Only a CloseStream acknowledged by final metadata yields a reusable transcript.
"""

import asyncio
import json
import os
from urllib.parse import urlencode

from fastapi import WebSocket, WebSocketDisconnect
from websockets.asyncio.client import connect

from app.transcription.models import Word
from app.transcription.text import transcript_text

SAMPLE_RATE = 16000
FINAL_TIMEOUT = 8
SEND_TIMEOUT = 5


async def stream_deepgram(ws: WebSocket, receive, *, max_seconds: int) -> None:
    key = os.getenv("DEEPGRAM_API_KEY", "").strip()
    if not key:
        raise ValueError("Deepgram is not configured. Set DEEPGRAM_API_KEY on the backend; local transcription remains available after stopping.")
    query = urlencode({
        "model": os.getenv("DEEPGRAM_MODEL", "nova-3").strip() or "nova-3",
        "language": "de", "encoding": "linear16", "sample_rate": SAMPLE_RATE,
        "channels": 1, "interim_results": "true", "punctuate": "true",
        "endpointing": 300,
    })
    tasks: list[asyncio.Task] = []
    try:
        async with connect(
            f"wss://api.eu.deepgram.com/v1/listen?{query}",
            additional_headers={"Authorization": f"Token {key}"},
            open_timeout=10, close_timeout=2, max_size=1024 * 1024,
            max_queue=16,
        ) as upstream:
            words: list[Word] = []
            sent_bytes = 0
            stopping = False
            acknowledged = False
            await ws.send_json({"type": "ready", "sample_rate": SAMPLE_RATE, "provider": "deepgram"})

            async def send_audio():
                nonlocal sent_bytes, stopping
                while True:
                    raw = await receive(ws)
                    if not isinstance(raw, bytes):
                        break
                    if len(raw) % 2 or len(raw) > SAMPLE_RATE * 2:
                        raise ValueError("Send aligned Int16 PCM frames of at most one second")
                    sent_bytes += len(raw)
                    if sent_bytes > max_seconds * SAMPLE_RATE * 2:
                        raise ValueError("Live transcription audio limit exceeded")
                    await asyncio.wait_for(upstream.send(raw), timeout=SEND_TIMEOUT)
                stopping = True
                await asyncio.wait_for(upstream.send(json.dumps({"type": "CloseStream"})), timeout=SEND_TIMEOUT)

            async def read_results():
                nonlocal acknowledged
                async for raw in upstream:
                    message = json.loads(raw)
                    if message.get("type") == "Error":
                        raise ValueError("Deepgram rejected the stream")
                    if message.get("type") == "Metadata":
                        # Summary metadata is sent after CloseStream. Treat an early
                        # close as incomplete, even if a few final words arrived.
                        acknowledged = stopping
                        continue
                    if message.get("type") != "Results":
                        continue
                    alternative = message["channel"]["alternatives"][0]
                    final = message.get("is_final") is True
                    if final:
                        for item in alternative.get("words", []):
                            word = Word(
                                word=item.get("punctuated_word") or item["word"],
                                start_ms=round(float(item["start"]) * 1000),
                                end_ms=round(float(item["end"]) * 1000),
                            )
                            if not word.word.strip() or len(word.word) > 256:
                                raise ValueError("Invalid Deepgram word")
                            if words and word.start_ms < words[-1].start_ms:
                                raise ValueError("Unordered Deepgram words")
                            if word.end_ms > sent_bytes * 1000 // (SAMPLE_RATE * 2) + 250:
                                raise ValueError("Deepgram word exceeds sent audio")
                            words.append(word)
                        if len(words) > 50000:
                            raise ValueError("Live transcription word limit exceeded")
                    text = transcript_text(words)
                    if not final:
                        text = " ".join(part for part in (text, alternative.get("transcript", "")) if part)
                    await ws.send_json({"type": "text", "text": text, "final": False})

            sender = asyncio.create_task(send_audio())
            reader = asyncio.create_task(read_results())
            tasks = [sender, reader]
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            if reader in done:
                await reader  # Preserve an upstream error, rather than waiting for more audio.
                if not sender.done():
                    raise ValueError("Deepgram closed before recording stopped")
            await sender
            await asyncio.wait_for(reader, timeout=FINAL_TIMEOUT)
            if not acknowledged:
                raise ValueError("Deepgram did not acknowledge the complete stream")
            await ws.send_json({"type": "words", "final": True, "words": [word.model_dump() for word in words]})
            await ws.send_json({"type": "text", "final": True, "text": transcript_text(words)})
            await ws.send_json({"type": "done"})
            await ws.close(code=1000)
    except (WebSocketDisconnect, asyncio.CancelledError):
        raise
    except Exception:
        # Provider exceptions can contain request headers or responses. Never
        # expose those (or credentials) to the browser or application logs.
        raise ValueError("Deepgram live transcription failed. Local transcription will run after stopping; check the backend key and connection.") from None
    finally:
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

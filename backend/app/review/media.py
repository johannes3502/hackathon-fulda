"""Audio-only temporary storage and timestamp probing; no server-side playback."""

import hashlib
import json
import os
import subprocess
from pathlib import Path

from app.connections import s3_client
from app.review.errors import ReviewError

MAX_UPLOAD_BYTES = 128 * 1024 * 1024


def hash_upload(file) -> str:
    digest, size = hashlib.sha256(), 0
    file.seek(0)
    while block := file.read(1 << 20):
        size += len(block)
        if size > MAX_UPLOAD_BYTES:
            raise ReviewError(413, "E_UPLOAD_TOO_LARGE", "Audio-Upload ist zu groß.")
        digest.update(block)
    file.seek(0)
    if not size:
        raise ReviewError(422, "E_AUDIO_EMPTY", "Audio-Upload ist leer.")
    return digest.hexdigest()


def upload(file, object_key: str):
    file.seek(0)
    s3_client().upload_fileobj(file, os.environ["S3_BUCKET"], object_key,
                             ExtraArgs={"ContentType": "application/octet-stream"})


def delete(object_key: str | None):
    if object_key:
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=object_key)


def download(object_key: str, target: Path):
    s3_client().download_file(os.environ["S3_BUCKET"], object_key, str(target))


def probe(path: Path) -> dict:
    result = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_entries",
        "format=start_time,duration", "-show_entries", "stream=index,codec_type,codec_name,start_time,duration",
        str(path)], capture_output=True, check=True, timeout=30)
    raw = json.loads(result.stdout)
    streams, format_data = raw.get("streams", []), raw.get("format", {})
    def milliseconds(value):
        return round(float(value) * 1000) if value not in (None, "N/A") else None
    audio = next((item for item in streams if item.get("codec_type") == "audio"), None)
    video = next((item for item in streams if item.get("codec_type") == "video"), None)
    if audio is None:
        raise ReviewError(422, "E_AUDIO_STREAM_MISSING", "Die Aufnahme enthält keine Audiospur.")
    return {"format_start_ms": milliseconds(format_data.get("start_time")),
            "duration_ms": milliseconds(format_data.get("duration")),
            "audio_start_ms": milliseconds(audio.get("start_time")),
            "video_start_ms": milliseconds(video.get("start_time")) if video else None}


def offset_ms(probed: dict, timebase: dict) -> int:
    audio = probed.get("audio_start_ms")
    video = probed.get("video_start_ms")
    if audio is None:
        audio = timebase.get("audioStartMs")
    if video is None:
        video = timebase.get("firstVideoPtsMs")
    if audio is not None and video is not None:
        return round(audio - video)
    return round(timebase.get("avOffsetMs") or 0)

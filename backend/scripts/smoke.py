"""Run against Compose: python -m scripts.smoke. Uses only synthetic data."""

import io
import json
import os
import subprocess
import urllib.request
import uuid
import wave
from contextlib import closing
from urllib.error import HTTPError

import mediapipe
from botocore.exceptions import ClientError
from mediapipe.tasks.python import vision

from app.connections import connect_db, s3_client


def main() -> None:
    with urllib.request.urlopen("http://127.0.0.1:8000/health/ready", timeout=15) as response:
        assert json.load(response) == {"status": "ok", "postgres": "ok", "storage": "ok"}
    assert vision.PoseLandmarker and vision.HandLandmarker and vision.FaceLandmarker
    subprocess.run(["ffmpeg", "-version"], check=True, stdout=subprocess.DEVNULL)
    print(f"PASS API readiness, MediaPipe {mediapipe.__version__} Tasks imports, FFmpeg")

    # A short silent WAV generated in memory, never a microphone recording.
    audio = io.BytesIO()
    with wave.open(audio, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * 1600)
    payload = audio.getvalue()
    object_key = f"smoke/{uuid.uuid4()}.wav"
    bucket = os.environ["S3_BUCKET"]
    client = s3_client()

    try:
        client.upload_fileobj(io.BytesIO(payload), bucket, object_key, ExtraArgs={"ContentType": "audio/wav"})
        result = client.get_object(Bucket=bucket, Key=object_key)
        with closing(result["Body"]) as body:
            assert body.read() == payload
        assert result["ContentType"] == "audio/wav"
        result = client.get_object(Bucket=bucket, Key=object_key, Range="bytes=0-43")
        with closing(result["Body"]) as body:
            assert body.read() == payload[:44]
        assert result["ResponseMetadata"]["HTTPStatusCode"] == 206

        try:
            with urllib.request.urlopen(
                f"{os.environ['S3_ENDPOINT_URL']}/{bucket}/{object_key}", timeout=10
            ):
                raise AssertionError("Object is readable without credentials")
        except HTTPError as error:
            assert error.code == 403
            error.close()

        with connect_db() as connection:
            connection.execute("CREATE TEMP TABLE smoke_media (object_key text, size_bytes integer)")
            connection.execute("INSERT INTO smoke_media VALUES (%s, %s)", (object_key, len(payload)))
            assert connection.execute("SELECT object_key, size_bytes FROM smoke_media").fetchone() == (object_key, len(payload))
        print("PASS PostgreSQL metadata round trip; S3 upload, download, range read and anonymous access denial")
    finally:
        client.delete_object(Bucket=bucket, Key=object_key)

    try:
        client.head_object(Bucket=bucket, Key=object_key)
    except ClientError as error:
        assert error.response["ResponseMetadata"]["HTTPStatusCode"] == 404
    else:
        raise AssertionError("Synthetic audio was not deleted")
    print("PASS cleanup; no synthetic test object or table retained")


if __name__ == "__main__":
    main()

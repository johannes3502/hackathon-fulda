"""Exercise upload → Redis → worker → Silero → S3 with a synthetic WAV."""

import argparse
import os
import time
from pathlib import Path

import httpx
from botocore.exceptions import ClientError

from app.connections import s3_client
from app.speech.storage import key


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recording", type=Path, help="Synthetic fixture only")
    parser.add_argument("--transcribe", action="store_true", help="Use configured ASR (may call paid provider)")
    args = parser.parse_args()
    job_id = None
    with httpx.Client(base_url="http://localhost:8000", timeout=15) as client:
        try:
            with args.recording.open("rb") as recording:
                response = client.post("/speech/analyze", files={"recording": recording},
                                       data={"transcribe": str(args.transcribe).lower()})
            assert response.status_code == 202, response.text
            accepted = response.json()
            job_id = accepted["job_id"]
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                response = client.get(accepted["status_url"])
                response.raise_for_status()
                status = response.json()
                if status["status"] in ("completed", "failed"):
                    break
                assert client.get("/health/live").status_code == 200
                time.sleep(0.25)
            assert status["status"] == "completed", status.get("error") or status["status"]
            result = status["result"]
            assert result["audio"]["heuristics"]["activity_detector"] == "silero"
            assert result["audio"]["summary"]["active_ms"] > 0
            if args.transcribe:
                assert result["words"]
            # Completion can become visible just before deletion; wait briefly.
            for attempt in range(20):
                try:
                    s3_client().head_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, "recording"))
                except ClientError as error:
                    assert error.response["Error"]["Code"] in ("404", "NoSuchKey")
                    break
                time.sleep(0.1)
            else:
                raise AssertionError("Original not deleted")
            print(f"Audio smoke passed: Silero, ASR={result['asr_provider']}, synthetic_demo={result['synthetic_demo']}")
        finally:
            if job_id:
                for name in ("recording", "request.json", "status.json"):
                    s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name))


if __name__ == "__main__":
    main()

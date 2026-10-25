"""Exercise upload → Redis → worker → Silero → S3 with a synthetic WAV."""

import argparse
import math
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
    parser.add_argument("--url", default=os.getenv("API_URL", "http://localhost:8000"), help="API base URL (default: API_URL or localhost:8000)")
    parser.add_argument("--request-timeout", type=float, default=15, help="HTTP request timeout in seconds (default: 15)")
    parser.add_argument("--job-timeout", type=float, default=60, help="Maximum job polling time in seconds (default: 60)")
    parser.add_argument("--poll-interval", type=float, default=0.25, help="Seconds between job status requests (default: 0.25)")
    args = parser.parse_args()
    for name in ("request_timeout", "job_timeout", "poll_interval"):
        value = getattr(args, name)
        if not math.isfinite(value) or value <= 0:
            parser.error(f"--{name.replace('_', '-')} must be a finite number greater than zero")
    job_id = None
    with httpx.Client(base_url=args.url, timeout=args.request_timeout) as client:
        try:
            with args.recording.open("rb") as recording:
                response = client.post("/speech/analyze", files={"recording": recording},
                                       data={"transcribe": str(args.transcribe).lower()})
            assert response.status_code == 202, response.text
            accepted = response.json()
            job_id = accepted["job_id"]
            deadline = time.monotonic() + args.job_timeout
            while time.monotonic() < deadline:
                response = client.get(accepted["status_url"])
                response.raise_for_status()
                status = response.json()
                if status["status"] in ("completed", "failed"):
                    break
                assert client.get("/health/live").status_code == 200
                time.sleep(min(args.poll_interval, max(0, deadline - time.monotonic())))
            else:
                raise RuntimeError(f"Audio job exceeded {args.job_timeout:g}s smoke deadline")
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

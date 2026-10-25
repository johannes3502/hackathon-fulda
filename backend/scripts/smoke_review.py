"""Synthetic HTTP → Celery → Postgres/S3 review smoke, without a frontend or cloud API."""

import argparse
from array import array
from datetime import datetime, timezone
from io import BytesIO
import json
import math
import os
import time
from uuid import uuid4
import wave

import httpx


def audio_bytes():
    # Leave more than pause_min_ms of silence after the overlapping frame edges.
    samples = array("h", (round(5000 * math.sin(2 * math.pi * 180 * index / 16000))
                          if index < 32000 or index >= 72000 else 0 for index in range(128000)))
    data = BytesIO()
    with wave.open(data, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(samples.tobytes())
    return data.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=os.getenv("API_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--llm", action="store_true", help="Also exercise the configured writer (explicit opt-in)")
    parser.add_argument("--request-timeout", type=float, default=20, help="HTTP request timeout in seconds (default: 20)")
    parser.add_argument("--job-timeout", type=float, help="Maximum polling time per job in seconds (default: 30, or 180 with --llm)")
    parser.add_argument("--poll-interval", type=float, default=0.2, help="Seconds between job status requests (default: 0.2)")
    args = parser.parse_args()
    if args.job_timeout is None:
        args.job_timeout = 180 if args.llm else 30
    for name in ("request_timeout", "job_timeout", "poll_interval"):
        value = getattr(args, name)
        if not math.isfinite(value) or value <= 0:
            parser.error(f"--{name.replace('_', '-')} must be a finite number greater than zero")
    with httpx.Client(base_url=args.url, timeout=args.request_timeout, trust_env=False) as client:
        session_id = None
        def post(path, body=None, key=None, **kwargs):
            result = client.post(path, json=body, headers={"Idempotency-Key": key or str(uuid4())}, **kwargs)
            result.raise_for_status()
            return result
        def wait(job_id):
            deadline = time.monotonic() + args.job_timeout
            while time.monotonic() < deadline:
                response = client.get(f"/jobs/{job_id}")
                response.raise_for_status()
                job = response.json()["job"]
                if job["status"] in {"completed", "failed"}:
                    return job
                time.sleep(min(args.poll_interval, max(0, deadline - time.monotonic())))
            raise RuntimeError(f"Synthetic job exceeded {args.job_timeout:g}s smoke deadline")
        try:
            client.get("/health/ready").raise_for_status()
            created = post("/sessions", {"title": "Synthetischer Backend-Smoke", "consent": {
                "granted": True, "at": datetime.now(timezone.utc).isoformat(), "version": "smoke.v1",
                "scope": "local-and-cloud-analysis" if args.llm else "local-analysis"}})
            session_id = created.json()["session"]["sessionId"]
            take = post(f"/sessions/{session_id}/takes", {"durationMs": 8000, "mimeType": "audio/wav",
                "timebase": {"onstartPerfMs": 0, "firstVideoPtsMs": 0, "audioStartMs": 0, "avOffsetMs": 0},
                "coverage": [{"tMs": 0, "durationMs": 8000, "evaluable": True}]}).json()["take"]
            take_id = take["takeId"]
            event = {"eventId": "pose:synthetic:R1", "tMs": 1000, "peakMs": 1500, "durationMs": 2000,
                "type": "posture", "severity": "hint", "source": "browser", "stage": "final",
                "payload": {"schema": "pose.event.v1", "category": "posture", "kind": "trunk-lateral",
                    "metric": {"metricId": "trunkLean", "valueAtPeak": 14.2, "baseline": 2.1, "delta": 12.1, "unit": "deg"},
                    "rule": {"ruleId": "R1", "version": 1, "evidence": "C", "confidence": "medium", "thresholdsStatus": "heuristic-unvalidated"},
                    "evidence": {"sampleCount": 20, "validRatio": 1},
                    "message": {"key": "posture.trunk-lateral", "params": {"deltaDeg": 12.1}}}}
            post(f"/takes/{take_id}/events", {"events": [event]})
            audio_key = str(uuid4())
            raw_audio = audio_bytes()
            upload_args = {"files": {"file": ("synthetic.wav", raw_audio, "audio/wav")},
                           "data": {"transcribe": "false", "config": '{"activity_detector":"energy"}'}}
            audio = post(f"/takes/{take_id}/audio", key=audio_key, **upload_args).json()
            assert post(f"/takes/{take_id}/audio", key=audio_key, **upload_args).json() == audio
            audio_job = wait(audio["jobId"])
            assert audio_job["status"] == "completed", audio_job.get("error")
            storage_checked = False
            if os.getenv("POSTGRES_HOST"):
                from botocore.exceptions import ClientError
                from app.connections import s3_client
                from app.review import service
                from uuid import UUID
                assert service.queued_job(UUID(audio["jobId"]))["object_key"] is None
                try:
                    s3_client().head_object(Bucket=os.environ["S3_BUCKET"],
                        Key=f"review-audio/{session_id}/{take_id}/{audio['jobId']}/upload")
                except ClientError as error:
                    assert error.response["Error"]["Code"] in {"404", "NoSuchKey"}
                else:
                    raise AssertionError("Temporary audio survived completion")
                storage_checked = True
            started, review_key = time.monotonic(), str(uuid4())
            request = {"mode": "llm" if args.llm else "template"}
            accepted = post(f"/takes/{take_id}/review", request, review_key).json()
            assert post(f"/takes/{take_id}/review", request, review_key).json() == accepted
            job = wait(accepted["jobId"])
            assert job["status"] == "completed", job.get("error")
            report = client.get(f"/takes/{take_id}/review").json()["review"]
            elapsed = time.monotonic() - started
            assert report["schemaVersion"] == "review.v1" and report["findings"]
            reused = post(f"/takes/{take_id}/review", request)
            assert reused.status_code == 200 and reused.json()["reviewId"] == report["reviewId"]
            timeline = client.get(f"/takes/{take_id}/timeline").json()["timeline"]
            assert any(event["source"] == "speech" for event in timeline["events"])
            assert report["coverage"]["evaluableMs"] == 8000
            assert "clipUrl" not in json.dumps(report) and "snapshotUrl" not in json.dumps(report)
            # Include HTTP, Celery and DB in the five-minute/sixty-event budget.
            performance_take = post(f"/sessions/{session_id}/takes", {"durationMs": 300000, "mimeType": "video/webm",
                "timebase": {"onstartPerfMs": 0}, "coverage": []}).json()["take"]["takeId"]
            many = [{**event, "eventId": f"pose:performance:{index}", "tMs": index * 4500,
                     "peakMs": index * 4500 + 1000} for index in range(60)]
            assert post(f"/takes/{performance_take}/events", {"events": many}).json()["accepted"] == 60
            performance_start = time.monotonic()
            performance_job = post(f"/takes/{performance_take}/review", {"mode": "template"}).json()["jobId"]
            assert wait(performance_job)["status"] == "completed"
            performance_seconds = time.monotonic() - performance_start
            assert performance_seconds < 10
            performance_report = client.get(f"/takes/{performance_take}/review").json()["review"]
            assert performance_report["coverage"]["eventsTotal"] == 60
            assert performance_report["coverage"]["notEvaluableMs"] == 300000
            client.delete(f"/sessions/{session_id}").raise_for_status()
            assert client.get(f"/takes/{take_id}").status_code == 404
            assert client.get(f"/jobs/{audio['jobId']}").status_code == 404
            assert client.delete(f"/sessions/{session_id}").status_code == 204
            print(json.dumps({"synthetic": True, "events": len(timeline["events"]), "findings": len(report["findings"]),
                "reviewSeconds": round(elapsed, 3), "mode": report["generator"]["mode"],
                "fiveMinuteSixtyEventSeconds": round(performance_seconds, 3),
                "s3DeletionChecked": storage_checked, "sessionDeletionChecked": True}))
        finally:
            if session_id:
                client.delete(f"/sessions/{session_id}").raise_for_status()


if __name__ == "__main__":
    main()

"""Worker tasks; only IDs and small references go through Redis."""

import logging
import os
import tempfile
import time
from pathlib import Path
from uuid import UUID

from celery.exceptions import SoftTimeLimitExceeded

from app.celery_app import celery_app
from app.connections import s3_client
from app.speech import storage
from app.speech.job_models import AnalysisJob, AnalysisOptions
from app.speech.pipeline import run_analysis


@celery_app.task(bind=True)
def worker_probe(self, token: str, delay_seconds: float = 0) -> dict[str, str]:
    """Synthetic infrastructure check, invoked by the smoke script, not HTTP."""
    if not 0 <= delay_seconds <= 10:
        raise ValueError("Probe delay must be between 0 and 10 seconds")
    time.sleep(delay_seconds)
    return {"token": token, "worker": self.request.hostname}


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def ingest_source(self, source_id: str) -> dict[str, str]:
    """Extract, chunk and embed one uploaded source; status lives in PostgreSQL."""
    from app.connections import redis_client
    from app.sources.ingest import ingest_source as run_ingest

    lock = redis_client().lock(f"source-ingest-lock:{source_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=30)
    try:
        run_ingest(UUID(source_id))
        return {"source_id": source_id}
    finally:
        lock.release()


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def analyze_speech(self, job_id: str) -> dict[str, str]:
    """Reuse terminal results on redelivery; remove originals after processing."""
    from app.connections import redis_client

    # Lease exceeds hard task timeout. Prevent concurrent duplicate paid requests.
    lock = redis_client().lock(f"speech-job-lock:{job_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=30)
    try:
        previous = storage.read_json(job_id, "status.json")
        if previous and previous["status"] in ("completed", "failed"):
            storage.delete_input(job_id)
            return {"job_id": job_id, "status_key": storage.key(job_id, "status.json")}
        request = storage.read_json(job_id, "request.json")
        if request is None:
            raise ValueError("Missing analysis request")
        storage.write_json(job_id, "status.json", AnalysisJob(job_id=job_id, status="running").model_dump())
        try:
            with tempfile.TemporaryDirectory() as workdir:
                recording = Path(workdir) / "recording"
                s3_client().download_file(os.environ["S3_BUCKET"], storage.key(job_id, "recording"), str(recording))
                result = run_analysis(recording, AnalysisOptions.model_validate(request))
            status = AnalysisJob(job_id=job_id, status="completed", result=result)
        except (Exception, SoftTimeLimitExceeded) as error:
            # Never put provider responses, transcripts or credentials into Redis.
            logging.getLogger(__name__).warning("Audio job %s failed (%s)", job_id, type(error).__name__)
            status = AnalysisJob(job_id=job_id, status="failed", error="Audioanalyse fehlgeschlagen. Modell, Aufnahme und ASR-Konfiguration prüfen.")
        storage.write_json(job_id, "status.json", status.model_dump(mode="json"))
        storage.delete_input(job_id)
        return {"job_id": job_id, "status_key": storage.key(job_id, "status.json")}
    finally:
        lock.release()


PREFIX = "factcheck-jobs"


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def fact_check(self, job_id: str) -> dict[str, str]:
    """Reuse terminal results on redelivery; delete the stored transcript afterwards."""
    from app.connections import redis_client
    from app.factcheck.llm import configured_llm
    from app.factcheck.models import FactCheckJob, FactCheckRequest
    from app.factcheck.pipeline import run_fact_check
    from app.factcheck.web import configured_web_searcher

    # Lease exceeds hard task timeout. Prevent concurrent duplicate paid requests.
    lock = redis_client().lock(f"factcheck-job-lock:{job_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=30)
    try:
        previous = storage.read_json(job_id, "status.json", PREFIX)
        if not (previous and previous["status"] in ("completed", "failed")):
            request = storage.read_json(job_id, "request.json", PREFIX)
            if request is None:
                raise ValueError("Missing fact-check request")
            storage.write_json(job_id, "status.json", FactCheckJob(job_id=job_id, status="running").model_dump(), PREFIX)
            try:
                parsed = FactCheckRequest.model_validate(request)
                result = run_fact_check(parsed, configured_llm(), configured_web_searcher() if parsed.use_web else None,
                                        workers=int(os.getenv("LLM_CONCURRENCY", "4")))
                status = FactCheckJob(job_id=job_id, status="completed", result=result)
            except (Exception, SoftTimeLimitExceeded) as error:
                # Never put model answers, transcripts or credentials into logs or Redis.
                logging.getLogger(__name__).warning("Fact-check job %s failed (%s)", job_id, type(error).__name__)
                status = FactCheckJob(job_id=job_id, status="failed", error="Faktencheck fehlgeschlagen. LLM-Konfiguration und Erreichbarkeit prüfen.")
            storage.write_json(job_id, "status.json", status.model_dump(mode="json"), PREFIX)
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=storage.key(job_id, "request.json", PREFIX))
        return {"job_id": job_id, "status_key": storage.key(job_id, "status.json", PREFIX)}
    finally:
        lock.release()

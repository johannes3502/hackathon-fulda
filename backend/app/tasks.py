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


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def run_take_job(self, job_id: str) -> dict[str, str]:
    """Persistent take jobs; duplicate deliveries cannot execute concurrently."""
    from app.connections import redis_client
    from app.review.worker import execute

    lock = redis_client().lock(f"take-job-lock:{job_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=30)
    try:
        try:
            execute(UUID(job_id))
        except Exception as failure:
            # Retry infrastructure/cleanup only. Model failures are already terminal in Postgres.
            logging.getLogger(__name__).warning("Take job %s interrupted (%s)", job_id, type(failure).__name__)
            raise self.retry(countdown=30) from failure
        return {"job_id": job_id}
    finally:
        lock.release()


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
QUESTION_PREFIX = "question-jobs"
ANSWER_PREFIX = "answer-jobs"


def _model_job(task, job_id: str, prefix: str, job_model, run, error: str,
               inputs: tuple[str, ...] = ("request.json",)) -> dict[str, str]:
    """Shared body of LLM jobs: lock, reuse terminal results, delete the stored inputs.

    `run(request)` maps the stored request JSON to the result model.
    """
    from app.connections import redis_client

    # Lease exceeds hard task timeout. Prevent concurrent duplicate paid requests.
    lock = redis_client().lock(f"{prefix}-lock:{job_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise task.retry(countdown=30)
    try:
        previous = storage.read_json(job_id, "status.json", prefix)
        if not (previous and previous["status"] in ("completed", "failed")):
            request = storage.read_json(job_id, "request.json", prefix)
            if request is None:
                raise ValueError("Missing job request")
            storage.write_json(job_id, "status.json", job_model(job_id=job_id, status="running").model_dump(), prefix)
            try:
                status = job_model(job_id=job_id, status="completed", result=run(request))
            except (Exception, SoftTimeLimitExceeded) as failure:
                # Never put model answers, transcripts or credentials into logs or Redis.
                logging.getLogger(__name__).warning("%s job %s failed (%s)", prefix, job_id, type(failure).__name__)
                status = job_model(job_id=job_id, status="failed", error=error)
            storage.write_json(job_id, "status.json", status.model_dump(mode="json"), prefix)
        for name in inputs:
            s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=storage.key(job_id, name, prefix))
        return {"job_id": job_id, "status_key": storage.key(job_id, "status.json", prefix)}
    finally:
        lock.release()


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def fact_check(self, job_id: str) -> dict[str, str]:
    """Reuse terminal results on redelivery; delete the stored transcript afterwards."""
    from app.factcheck.llm import configured_llm
    from app.factcheck.models import FactCheckJob, FactCheckRequest
    from app.factcheck.pipeline import run_fact_check
    from app.factcheck.web import configured_web_searcher

    def run(request: dict):
        parsed = FactCheckRequest.model_validate(request)
        return run_fact_check(parsed, configured_llm(), configured_web_searcher() if parsed.use_web else None,
                              workers=int(os.getenv("LLM_CONCURRENCY", "4")))

    return _model_job(self, job_id, PREFIX, FactCheckJob, run,
                      "Faktencheck fehlgeschlagen. LLM-Konfiguration und Erreichbarkeit prüfen.")


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def generate_questions(self, job_id: str) -> dict[str, str]:
    """Follow-up questions; same redelivery and deletion rules as the fact-check."""
    from app.factcheck.llm import configured_llm
    from app.questions import pipeline
    from app.questions.models import QuestionJob, QuestionRequest

    return _model_job(self, job_id, QUESTION_PREFIX, QuestionJob,
                      lambda request: pipeline.generate_questions(QuestionRequest.model_validate(request), configured_llm()),
                      "Fragen konnten nicht erzeugt werden. LLM-Konfiguration und Erreichbarkeit prüfen.")


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def review_answer(self, job_id: str) -> dict[str, str]:
    """Compare one typed answer with the sources; the answer text is deleted afterwards."""
    from app.factcheck.llm import configured_llm
    from app.questions import pipeline
    from app.questions.models import AnswerJob, AnswerRequest

    return _model_job(self, job_id, ANSWER_PREFIX, AnswerJob,
                      lambda request: pipeline.review_answer(AnswerRequest.model_validate(request), configured_llm()),
                      "Antwort konnte nicht verglichen werden. LLM-Konfiguration und Erreichbarkeit prüfen.")


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def review_voice_answer(self, job_id: str) -> dict[str, str]:
    """Transcribe one spoken answer and compare it with the sources; audio and request are deleted afterwards."""
    from app.factcheck.llm import configured_llm
    from app.questions import pipeline
    from app.questions.models import AnswerJob, VoiceAnswerRequest
    from app.transcription.transcriber import configured_transcriber

    def run(request: dict):
        with tempfile.TemporaryDirectory() as workdir:
            recording = Path(workdir) / "recording"
            s3_client().download_file(os.environ["S3_BUCKET"], storage.key(job_id, "recording", ANSWER_PREFIX),
                                      str(recording))
            return pipeline.review_voice_answer(VoiceAnswerRequest.model_validate(request), recording,
                                                configured_transcriber(), configured_llm())

    return _model_job(self, job_id, ANSWER_PREFIX, AnswerJob, run,
                      "Gesprochene Antwort konnte nicht verarbeitet werden. ASR- und LLM-Konfiguration prüfen.",
                      inputs=("request.json", "recording"))

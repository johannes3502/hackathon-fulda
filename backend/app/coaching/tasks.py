import logging

from celery.exceptions import SoftTimeLimitExceeded

from app.celery_app import celery_app
from app.coaching import storage
from app.coaching.models import AnswerRequest, CoachingJob, CoachingReport, CoachingRequest
from app.coaching.pipeline import review_answer, run_coaching
from app.connections import redis_client


@celery_app.task(bind=True, reject_on_worker_lost=True, max_retries=24)
def analyze_coaching(self, job_id: str):
    lock = redis_client().lock(f"coaching-job-lock:{job_id}", timeout=660, blocking=False)
    if not lock.acquire(blocking=False):
        raise self.retry(countdown=30)
    try:
        previous = storage.read(job_id, "status.json")
        if not previous:
            return {"job_id": job_id}  # A removed/unpublished job does not restart.
        if previous["status"] in ("completed", "failed"):
            return {"job_id": job_id}
        if previous["status"] == "running":
            # A lost worker may have completed inference. Do not silently start the full analysis again.
            storage.write(job_id, "status.json", CoachingJob(
                job_id=job_id, status="failed", error="Analysis was interrupted. Start a new check to retry."
            ).model_dump(mode="json"))
            return {"job_id": job_id}
        storage.write(job_id, "status.json", CoachingJob(job_id=job_id, status="running").model_dump(mode="json"))
        try:
            request = storage.read(job_id, "request.json")
            if request is None:
                raise ValueError("Missing coaching input")
            if request["kind"] == "analysis":
                report = run_coaching(CoachingRequest.model_validate(request["input"]))
                status = CoachingJob(job_id=job_id, status="completed", report=report)
            else:
                parent = storage.read(request["parent_id"], "status.json")
                if not parent or parent["status"] != "completed" or not parent.get("report"):
                    raise ValueError("The original report is unavailable")
                review = review_answer(CoachingReport.model_validate(parent["report"]),
                                       AnswerRequest.model_validate(request["input"]))
                status = CoachingJob(job_id=job_id, status="completed", answer=review)
        except (Exception, SoftTimeLimitExceeded) as error:
            logging.getLogger(__name__).warning("Coaching job %s failed (%s)", job_id, type(error).__name__)
            status = CoachingJob(job_id=job_id, status="failed",
                                 error="Source comparison failed. Check model access, sources and configuration; your recording is preserved.")
        storage.write(job_id, "status.json", status.model_dump(mode="json"))
        return {"job_id": job_id}
    finally:
        lock.release()

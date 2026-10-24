"""Worker tasks. Product transcription/analysis tasks are not implemented yet."""

import time

from app.celery_app import celery_app


@celery_app.task(bind=True)
def worker_probe(self, token: str, delay_seconds: float = 0) -> dict[str, str]:
    """Synthetic infrastructure check, invoked by the smoke script, not HTTP."""
    if not 0 <= delay_seconds <= 10:
        raise ValueError("Probe delay must be between 0 and 10 seconds")
    time.sleep(delay_seconds)
    return {"token": token, "worker": self.request.hostname}

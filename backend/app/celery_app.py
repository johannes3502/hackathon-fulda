"""Shared queue configuration for API producers and separate worker processes."""

import os

from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "presentation_trainer",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
    include=["app.tasks"],
)
celery_app.conf.update(
    task_default_queue="background",
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    task_track_started=True,
    result_expires=3600,
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "retention-sweep": {
            "task": "app.tasks.retention_sweep",
            "schedule": crontab(hour=3, minute=15),
        },
    },
    # Long jobs run in prefork children; reserve only one job per process.
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_cancel_long_running_tasks_on_connection_loss=True,
    # Bound model jobs so a stalled analysis cannot occupy the worker indefinitely.
    task_soft_time_limit=540,
    task_time_limit=600,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        "visibility_timeout": 3600,  # Must exceed the maximum task runtime.
        "socket_connect_timeout": 3,
        "socket_timeout": 3,
        "max_retries": 0,
    },
    # Publishing should fail promptly if Redis is down, not retry in a request.
    task_publish_retry=False,
    result_backend_transport_options={"retry_policy": {"max_retries": 0}},
    redis_socket_connect_timeout=3,
    redis_socket_timeout=3,
)

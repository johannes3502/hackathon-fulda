"""Enqueue from async API handlers without blocking the event loop on Redis."""

from celery import Task
from kombu.exceptions import OperationalError
from redis.exceptions import RedisError
from starlette.concurrency import run_in_threadpool


class QueueUnavailable(RuntimeError):
    """Publishing failed; the API should respond with HTTP 503."""


async def enqueue_task(task: Task, *args, **kwargs) -> str:
    """Return a task ID after publishing; never wait for the job's result.

    QueueUnavailable propagates to the caller; an API route should return HTTP 503
    rather than reporting a job as accepted when publishing failed.
    """
    try:
        result = await run_in_threadpool(task.apply_async, args=args, kwargs=kwargs)
    except (OperationalError, RedisError) as error:
        raise QueueUnavailable("Background queue is unavailable") from error
    except RuntimeError as error:
        # Celery wraps exhausted result-consumer connection retries this way.
        if isinstance(error.__cause__, RedisError):
            raise QueueUnavailable("Background queue is unavailable") from error
        raise
    return result.id

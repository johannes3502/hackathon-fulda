import os

import psycopg
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from redis.exceptions import RedisError

from app.connections import connect_db, redis_client, s3_client
from app.factcheck.router import router as factcheck_router
from app.progress.router import router as progress_router
from app.questions.router import router as questions_router
from app.review.errors import ReviewError, handle_review_error
from app.review.router import router as review_router
from app.speech.live import router as live_router
from app.sources.router import router as sources_router
from app.speech.router import router as speech_router
from app.transcription.router import router as transcription_router

app = FastAPI(title="Presentation Trainer API", version="0.1.0")
app.include_router(speech_router)
app.include_router(live_router)
app.include_router(transcription_router)
app.include_router(sources_router)
app.include_router(factcheck_router)
app.include_router(questions_router)
app.include_router(review_router)
app.include_router(progress_router)
app.add_exception_handler(ReviewError, handle_review_error)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Idempotency-Key", "X-Profile-Token"],
    expose_headers=["X-Request-Id"],
)


@app.get("/health/live", tags=["health"])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def ready(response: Response) -> dict[str, str]:
    checks = {"postgres": "unavailable", "storage": "unavailable", "redis": "unavailable"}
    try:
        with connect_db() as connection:
            connection.execute("SELECT 1").fetchone()
        checks["postgres"] = "ok"
    except psycopg.Error:
        pass

    try:
        s3_client().head_bucket(Bucket=os.environ["S3_BUCKET"])
        checks["storage"] = "ok"
    except (BotoCoreError, ClientError):
        pass

    try:
        redis_client().ping()
        checks["redis"] = "ok"
    except RedisError:
        pass

    healthy = all(value == "ok" for value in checks.values())
    response.status_code = 200 if healthy else 503
    return {"status": "ok" if healthy else "unavailable", **checks}

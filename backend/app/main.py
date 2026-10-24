import os

import psycopg
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.connections import connect_db, s3_client
from app.speech.router import router as speech_router

app = FastAPI(title="Presentation Trainer API", version="0.1.0")
app.include_router(speech_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/health/live", tags=["health"])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def ready(response: Response) -> dict[str, str]:
    checks = {"postgres": "unavailable", "storage": "unavailable"}
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

    healthy = all(value == "ok" for value in checks.values())
    response.status_code = 200 if healthy else 503
    return {"status": "ok" if healthy else "unavailable", **checks}

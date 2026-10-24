"""Small connection helpers; no product schema or recording persistence yet."""

import os
from functools import lru_cache

import boto3
import psycopg
from botocore.config import Config
from redis import Redis


def connect_db() -> psycopg.Connection:
    return psycopg.connect(
        host=os.environ["POSTGRES_HOST"],
        port=int(os.environ["POSTGRES_PORT"]),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        connect_timeout=3,
        options="-c statement_timeout=3000",
    )


@lru_cache(maxsize=1)
def redis_client() -> Redis:
    return Redis.from_url(
        os.environ["CELERY_BROKER_URL"],
        socket_connect_timeout=3,
        socket_timeout=3,
    )


@lru_cache(maxsize=1)
def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"],
        region_name=os.environ["S3_REGION"],
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            connect_timeout=3,
            read_timeout=3,
            retries={"total_max_attempts": 1},
        ),
    )

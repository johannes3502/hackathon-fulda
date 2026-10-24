"""Coaching inputs and reports live in S3, never in queue messages."""

import json
import os

from botocore.exceptions import ClientError

from app.connections import s3_client


def key(job_id: str, name: str) -> str:
    return f"coaching-jobs/{job_id}/{name}"


def read(job_id: str, name: str) -> dict | None:
    try:
        response = s3_client().get_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name))
    except ClientError as error:
        if error.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise
    with response["Body"] as body:
        return json.loads(body.read())


def write(job_id: str, name: str, data: dict):
    s3_client().put_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name),
                           Body=json.dumps(data, ensure_ascii=False, allow_nan=False).encode(),
                           ContentType="application/json")


def delete(job_id: str):
    for name in ("request.json", "status.json"):
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name))

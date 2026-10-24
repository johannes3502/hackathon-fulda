"""Media, configuration and analysis stay in S3; Redis receives only IDs."""

import json
import os

from botocore.exceptions import ClientError

from app.connections import s3_client


def key(job_id: str, name: str) -> str:
    return f"speech-jobs/{job_id}/{name}"


def read_json(job_id: str, name: str) -> dict | None:
    try:
        response = s3_client().get_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name))
    except ClientError as error:
        if error.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise
    with response["Body"] as body:
        return json.loads(body.read())


def write_json(job_id: str, name: str, value: dict):
    s3_client().put_object(
        Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name),
        Body=json.dumps(value, ensure_ascii=False, allow_nan=False).encode(), ContentType="application/json",
    )


def delete_input(job_id: str):
    s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, "recording"))

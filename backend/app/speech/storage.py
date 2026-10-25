"""Media, configuration and analysis stay in S3; Redis receives only IDs.

`prefix` separates job kinds (`speech-jobs`, `factcheck-jobs`).
"""

import json
import logging
import os

from botocore.exceptions import BotoCoreError, ClientError

from app.connections import s3_client


def key(job_id: str, name: str, prefix: str = "speech-jobs") -> str:
    return f"{prefix}/{job_id}/{name}"


def read_json(job_id: str, name: str, prefix: str = "speech-jobs") -> dict | None:
    try:
        response = s3_client().get_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name, prefix))
    except ClientError as error:
        if error.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise
    with response["Body"] as body:
        return json.loads(body.read())


def write_json(job_id: str, name: str, value: dict, prefix: str = "speech-jobs"):
    s3_client().put_object(
        Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name, prefix),
        Body=json.dumps(value, ensure_ascii=False, allow_nan=False).encode(), ContentType="application/json",
    )


def delete_input(job_id: str):
    for name in ("recording", "request.json"):
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name))


def discard_job(job_id: str, prefix: str = "speech-jobs"):
    """Remove partially stored, unaccepted jobs, including any voice upload."""
    for name in ("recording", "request.json", "status.json"):
        try:
            s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name, prefix))
        except (BotoCoreError, ClientError):
            # shortcut: simultaneous queue/storage outages need the retention sweeper in docs/14-open-todos.md.
            logging.getLogger(__name__).warning("Could not discard %s/%s/%s", prefix, job_id, name)

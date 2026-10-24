from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse


class ReviewError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        self.status, self.code, self.message, self.details = status, code, message, details or {}
        super().__init__(code)


async def handle_review_error(request: Request, error: ReviewError):
    return JSONResponse(status_code=error.status, content={"error": {
        "code": error.code, "message": error.message, "details": error.details,
        "requestId": getattr(request.state, "request_id", str(uuid4())),
    }})

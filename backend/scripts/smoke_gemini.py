"""One real Gemini JSON call through the backend adapter; no synthetic fallback."""
import json
import time

from pydantic import BaseModel

from app.factcheck.llm import configured_llm, llm_settings, structured_json


class Probe(BaseModel):
    ok: bool
    answer: str


def main():
    settings = llm_settings()
    if settings is None:
        raise SystemExit("LLM_BASE_URL and LLM_MODEL are not configured")
    try:
        model = configured_llm()
    except ValueError as error:
        raise SystemExit(str(error)) from None
    started = time.monotonic()
    result = Probe.model_validate(structured_json(
        model,
        "Return only the requested JSON object.",
        'Return exactly this object for ping: {"ok": true, "answer": "pong"}',
        Probe,
    ))
    print(json.dumps({
        "ok": result.ok,
        "answer": result.answer,
        "model": settings["model"],
        "host": settings["host"],
        "provider": settings["provider"],
        "seconds": round(time.monotonic() - started, 2),
    }, ensure_ascii=False), flush=True)
    if not result.ok or result.answer != "pong":
        raise SystemExit("Gemini probe returned an unexpected object")


if __name__ == "__main__":
    main()

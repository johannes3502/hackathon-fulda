"""Real local fact-check → questions → answer, with synthetic data and cleanup."""
import json
import os
import time
from uuid import uuid4

import httpx

from app.connections import s3_client
from app.speech.storage import key


def wait(client, path, terminal):
    deadline = time.monotonic() + 500
    while time.monotonic() < deadline:
        result = client.get(path).raise_for_status().json()
        if result["status"] in terminal:
            return result
        time.sleep(1)
    raise TimeoutError(path)


def main():
    collection, source_id, jobs = str(uuid4()), None, []
    text = "Das Lernlabor hat zwanzig Plätze. Es öffnet um acht Uhr. Das Lernlabor hat einen Swimmingpool."
    words = [{"word": word, "start_ms": i * 400, "end_ms": i * 400 + 350} for i, word in enumerate(text.split())]
    source = "Synthetische Beispieldaten: Das Lernlabor hat zwanzig Plätze. Es öffnet um neun Uhr."
    with httpx.Client(base_url="http://localhost:8000", timeout=60) as client:
        def run(path, body, prefix):
            start = time.monotonic()
            accepted = client.post(path, json=body).raise_for_status().json()
            jobs.append((accepted["job_id"], prefix))
            job = wait(client, accepted["status_url"], {"completed", "failed"})
            assert job["status"] == "completed", job
            print(json.dumps({"path": path, "seconds": round(time.monotonic() - start, 1), "result": job["result"]}, ensure_ascii=False), flush=True)
            return job["result"]
        try:
            settings = client.get("/factcheck/settings").raise_for_status().json()
            assert settings["available"] and settings["web_provider"] is None, settings
            assert "gemini" in settings["model"].lower(), settings
            accepted = client.post("/sources", data={"collection_id": collection}, files={"file": ("synthetisches-lernlabor.txt", source.encode(), "text/plain")}).raise_for_status().json()
            source_id = accepted["source"]["id"]
            assert wait(client, accepted["status_url"], {"ready", "failed"})["status"] == "ready"
            facts = run("/factcheck", {"collection_id": collection, "words": words, "use_web": False}, "factcheck-jobs")
            assert {c["verdict"] for c in facts["claims"]} == {"supports", "contradicts", "not_found"}
            assert all(c["evidence"] for c in facts["claims"] if c["verdict"] in {"supports", "contradicts"})
            questions = run("/questions", {"collection_id": collection, "words": words, "claims": facts["claims"]}, "question-jobs")
            question = next(q for q in questions["questions"] if q["kind"] == "contradiction")
            review = run("/questions/answers", {"round_id": questions["round_id"], "question_id": question["id"],
                         "answer": "Ich korrigiere die Uhrzeit: Das Lernlabor öffnet um neun Uhr."}, "answer-jobs")
            assert review["verdict"] == "supports" and review["evidence"]
        finally:
            for job_id, prefix in jobs:
                for name in ("request.json", "status.json"):
                    s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=key(job_id, name, prefix))
            if source_id:
                assert client.delete(f"/sources/{source_id}").status_code in (204, 404)
    print("Local coaching integration passed; synthetic sources and jobs removed.")


if __name__ == "__main__":
    main()

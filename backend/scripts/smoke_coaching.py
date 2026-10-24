"""Real local-model check on synthetic facts, plus answer review and deletion.

Run with: docker compose exec -T backend python - < backend/scripts/smoke_coaching.py
This is a small integration acceptance check, not an accuracy benchmark.
"""
import json
import time
from uuid import uuid4

import httpx


def wait(client, path, terminal, timeout=500):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        result = client.get(path).raise_for_status().json()
        if result["status"] in terminal:
            return result
        time.sleep(1)
    raise TimeoutError(path)


def main():
    collection, source_id, jobs = str(uuid4()), None, []
    transcript = "Das Lernlabor hat zwanzig Plätze. Es öffnet um acht Uhr. Das Lernlabor hat einen Swimmingpool."
    words = [{"word": word, "start_ms": i * 400, "end_ms": i * 400 + 350}
             for i, word in enumerate(transcript.split())]
    source = "Synthetische Beispieldaten: Das Lernlabor hat zwanzig Plätze. Es öffnet um neun Uhr."
    with httpx.Client(base_url="http://localhost:8000", timeout=60) as client:
        try:
            caps = client.get("/coaching/capabilities").raise_for_status().json()
            assert caps["configured"] and caps["provider"] == "ollama", caps
            accepted = client.post("/sources", data={"collection_id": collection},
                                   files={"file": ("synthetisches-lernlabor.txt", source.encode(), "text/plain")})
            accepted.raise_for_status()
            source_id = accepted.json()["source"]["id"]
            ready = wait(client, f"/sources/{source_id}", {"ready", "failed"}, 120)
            assert ready["status"] == "ready", ready
            start = time.monotonic()
            accepted = client.post("/coaching/analyze", json={
                "collection_id": collection, "words": words, "duration_ms": 6500,
            }).raise_for_status().json()
            jobs.append(accepted["job_id"])
            job = wait(client, accepted["status_url"], {"completed", "failed"})
            assert job["status"] == "completed", job
            elapsed = time.monotonic() - start
            report = job["report"]
            print(json.dumps({"seconds": round(elapsed, 1), "model": report["model"],
                              "checks": report["checks"], "questions": report["questions"]}, ensure_ascii=False), flush=True)
            assert any(c["verdict"] == "supports" and "zwanzig" in c["statement"] for c in report["checks"])
            assert any(c["verdict"] == "contradicts" and "acht" in c["statement"] for c in report["checks"])
            assert any(c["verdict"] == "not_found" and "Swimmingpool" in c["statement"] for c in report["checks"])
            assert all(c["citations"] for c in report["checks"] if c["verdict"] in {"supports", "contradicts"})
            contradiction = next(c for c in report["checks"] if c["verdict"] == "contradicts")
            question = next(q for q in report["questions"] if q["claim_id"] == contradiction["id"])
            start = time.monotonic()
            accepted_answer = client.post(f"/coaching/jobs/{jobs[0]}/answers", json={
                "question_id": question["id"], "answer": "Ich korrigiere die Uhrzeit: Das Lernlabor öffnet um neun Uhr.",
            }).raise_for_status().json()
            jobs.append(accepted_answer["job_id"])
            answered = wait(client, accepted_answer["status_url"], {"completed", "failed"})
            assert answered["status"] == "completed", answered
            print(json.dumps({"answer_seconds": round(time.monotonic() - start, 1), "answer": answered["answer"]}, ensure_ascii=False))
            assert answered["answer"]["verdict"] == "supports" and answered["answer"]["citations"]
        finally:
            for job_id in reversed(jobs):
                deleted = client.delete(f"/coaching/jobs/{job_id}")
                assert deleted.status_code in (204, 404), deleted.text
                assert client.get(f"/coaching/jobs/{job_id}").status_code == 404
            if source_id:
                assert client.delete(f"/sources/{source_id}").status_code in (204, 404)
    print("Local coaching smoke passed; synthetic sources, report and answer deleted.")


if __name__ == "__main__":
    main()

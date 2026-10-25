"""CLI overrides without live services, model downloads or provider calls."""

import asyncio
import json
import sys
from types import SimpleNamespace

from botocore.exceptions import ClientError
import httpx
import pytest

from scripts import benchmark_embedding, export_openapi, smoke_audio, smoke_live, smoke_review


@pytest.mark.parametrize("module,positionals,flag", [
    (smoke_audio, ["synthetic.wav"], "--request-timeout"),
    (smoke_audio, ["synthetic.wav"], "--job-timeout"),
    (smoke_audio, ["synthetic.wav"], "--poll-interval"),
    (smoke_review, [], "--request-timeout"),
    (smoke_review, [], "--job-timeout"),
    (smoke_review, [], "--poll-interval"),
    (smoke_live, ["synthetic.wav"], "--connect-timeout"),
    (smoke_live, ["synthetic.wav"], "--receive-timeout"),
    (benchmark_embedding, [], "--query-reps"),
    (benchmark_embedding, [], "--num-chunks"),
    (benchmark_embedding, [], "--chunk-chars"),
])
@pytest.mark.parametrize("value", ["0", "-1", "nan", "inf"])
def test_invalid_limits_fail_before_io(monkeypatch, module, positionals, flag, value):
    monkeypatch.setattr(sys, "argv", [module.__name__, *positionals, flag, value])
    with pytest.raises(SystemExit) as error:
        module.main()
    assert error.value.code == 2


def test_audio_overrides_reach_http_and_polling(monkeypatch, tmp_path):
    recording = tmp_path / "synthetic.wav"
    recording.write_bytes(b"synthetic fixture")
    monkeypatch.setattr(sys, "argv", ["smoke_audio", str(recording), "--url", "http://demo:9000",
                                      "--request-timeout", "7", "--job-timeout", "9",
                                      "--poll-interval", "0.4"])
    polls, sleeps, deleted = [], [], []

    def handler(request):
        assert request.url.host == "demo" and request.url.port == 9000
        assert request.extensions["timeout"]["read"] == 7
        if request.url.path == "/speech/analyze":
            return httpx.Response(202, json={"job_id": "synthetic-job", "status_url": "/speech/jobs/synthetic-job"})
        if request.url.path == "/health/live":
            return httpx.Response(200)
        polls.append(request)
        result = {"audio": {"heuristics": {"activity_detector": "silero"}, "summary": {"active_ms": 1}},
                  "asr_provider": "none", "synthetic_demo": True}
        return httpx.Response(200, json={"status": "queued"} if len(polls) == 1 else
                              {"status": "completed", "result": result})

    real_client = httpx.Client
    monkeypatch.setattr(smoke_audio.httpx, "Client", lambda **kw: real_client(**kw, transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(smoke_audio.time, "sleep", sleeps.append)
    monkeypatch.setenv("S3_BUCKET", "synthetic")

    def missing(**kwargs):
        raise ClientError({"Error": {"Code": "404"}}, "HeadObject")

    monkeypatch.setattr(smoke_audio, "s3_client", lambda: SimpleNamespace(
        head_object=missing, delete_object=lambda **kwargs: deleted.append(kwargs)))
    smoke_audio.main()
    assert sleeps == [0.4]
    assert len(deleted) == 3


@pytest.mark.parametrize("module,positionals", [(smoke_audio, ["synthetic.wav"]), (smoke_review, [])])
def test_expired_job_has_clear_error_and_cleans_up(monkeypatch, tmp_path, module, positionals):
    recording = tmp_path / "synthetic.wav"
    recording.write_bytes(b"synthetic fixture")
    if positionals:
        positionals = [str(recording)]
    monkeypatch.setattr(sys, "argv", [module.__name__, *positionals, "--job-timeout", "0.01"])
    clock = iter([0, 1])
    # Replace the module binding, without altering httpx's own time module.
    monkeypatch.setattr(module, "time", SimpleNamespace(monotonic=lambda: next(clock)))
    deleted = []

    def handler(request):
        path = request.url.path
        if request.method == "DELETE":
            deleted.append(path)
            return httpx.Response(204)
        if path == "/health/ready":
            return httpx.Response(200)
        if path == "/sessions":
            return httpx.Response(201, json={"session": {"sessionId": "session"}})
        if path.endswith("/takes"):
            return httpx.Response(201, json={"take": {"takeId": "take"}})
        if path.endswith("/events"):
            return httpx.Response(200)
        if path.endswith("/audio"):
            return httpx.Response(202, json={"jobId": "job"})
        return httpx.Response(202, json={"job_id": "job", "status_url": "/speech/jobs/job"})

    real_client = httpx.Client
    monkeypatch.setattr(module.httpx, "Client", lambda **kw: real_client(**kw, transport=httpx.MockTransport(handler)))
    if module is smoke_audio:
        monkeypatch.setenv("S3_BUCKET", "synthetic")
        monkeypatch.setattr(module, "s3_client", lambda: SimpleNamespace(
            delete_object=lambda **kwargs: deleted.append(kwargs)))
    with pytest.raises(RuntimeError, match="0.01s smoke deadline"):
        module.main()
    assert len(deleted) == (3 if module is smoke_audio else 1)


def test_live_timeout_overrides_reach_connection_and_each_receive(monkeypatch):
    received_timeouts = []
    messages = iter([{"type": "ready", "sample_rate": 16000},
                     {"type": "text", "text": "synthetic transcript"}, {"type": "done"}])

    class Socket:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def send(self, data):
            pass

        async def recv(self):
            return json.dumps(next(messages))

    def connect(url, *, open_timeout):
        assert url == "ws://demo/speech/live" and open_timeout == 4
        return Socket()

    real_wait_for = asyncio.wait_for

    async def wait_for(awaitable, *, timeout):
        received_timeouts.append(timeout)
        return await real_wait_for(awaitable, timeout=timeout)

    monkeypatch.setattr(smoke_live.websockets, "connect", connect)
    monkeypatch.setattr(smoke_live.asyncio, "wait_for", wait_for)
    monkeypatch.setattr(smoke_live, "pcm_frames", lambda _: [])
    monkeypatch.setattr(sys, "argv", ["smoke_live", "synthetic.wav", "--url", "http://demo",
                                      "--connect-timeout", "4", "--receive-timeout", "8"])
    smoke_live.main()
    assert received_timeouts == [8, 8, 8]


def test_export_custom_path_can_be_checked_for_staleness(monkeypatch, tmp_path):
    output = tmp_path / "nested" / "openapi.json"
    monkeypatch.setattr(sys, "argv", ["export_openapi", "--output", str(output)])
    export_openapi.main()
    assert json.loads(output.read_text())["openapi"]
    monkeypatch.setattr(sys, "argv", ["export_openapi", "--output", str(output), "--check"])
    export_openapi.main()
    output.write_text("{}")
    with pytest.raises(SystemExit, match="stale"):
        export_openapi.main()


def test_benchmark_output_directory_without_model_download(monkeypatch, tmp_path):
    class Embedder:
        def __init__(self, *args):
            pass

        def embed_query(self, text):
            return [1.0]

        def embed_documents(self, texts):
            return [[1.0] for _ in texts]

    monkeypatch.setattr(benchmark_embedding, "FastEmbedEmbedder", Embedder)
    monkeypatch.setattr(sys, "argv", ["benchmark_embedding", "--query-reps", "1", "--num-chunks", "1",
                                      "--chunk-chars", "50", "--output-dir", str(tmp_path / "results")])
    benchmark_embedding.main()
    reports = list((tmp_path / "results").glob("*.json"))
    assert len(reports) == 1
    assert json.loads(reports[0].read_text())["document_embedding"]["chunks_total"] == 1
    assert reports[0].with_suffix(".md").is_file()

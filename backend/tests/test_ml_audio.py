"""Provider contract, real ONNX smoke, queue lifecycle. Synthetic data only."""

import io
import os
from pathlib import Path
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import numpy as np
import pytest
from botocore.exceptions import ClientError
from fastapi.testclient import TestClient

from app.main import app
from app.jobs import QueueUnavailable
from app.speech import storage
from app.speech.config import AudioConfig
from app.speech.job_models import AnalysisOptions
from app.speech.pipeline import run_analysis
from app.speech.signal import decode_audio
from app.speech.vad import speech_activity
from app.transcription.transcriber import DeepgramTranscriber

FIXTURE = Path(__file__).parent / "fixtures" / "speech-de.wav"


def test_deepgram_contract(tmp_path):
    audio = tmp_path / "synthetic.wav"
    audio.write_bytes(b"RIFF-synthetic")

    def handle(request):
        assert request.url.host == "api.eu.deepgram.com"
        assert request.url.params["language"] == "de"
        assert request.url.params["model"] == "nova-3"
        assert "filler_words" not in request.url.params  # No German support promised.
        assert request.headers["authorization"] == "Token test-only"
        assert request.read() == b"RIFF-synthetic"
        return httpx.Response(200, json={"results": {"channels": [{"alternatives": [{"words": [
            {"word": "hallo", "punctuated_word": "Hallo.", "start": 1.125, "end": 1.75},
        ]}]}]}})

    result = DeepgramTranscriber("test-only", transport=httpx.MockTransport(handle)).transcribe(audio)
    assert result[0].model_dump() == {"word": "Hallo.", "start_ms": 1125, "end_ms": 1750}
    provider = DeepgramTranscriber("test-only", transport=httpx.MockTransport(lambda request: httpx.Response(401)))
    with pytest.raises(httpx.HTTPStatusError):
        provider.transcribe(audio)


@pytest.mark.skipif(not Path(os.getenv("SILERO_MODEL_PATH", "/app/models/silero_vad.onnx")).is_file(), reason="Install pinned Silero model and set SILERO_MODEL_PATH")
def test_real_silero_synthetic_speech_pause_and_noise():
    speech = decode_audio(FIXTURE, 16000)
    noise = np.random.default_rng(42).normal(0, 0.15, 32000).astype(np.float32)
    # Loud noise and silence before speech exercise the difference from a level gate.
    samples = np.concatenate([noise, np.zeros(16000), speech, np.zeros(48000), speech])
    times = np.arange(0, len(samples) * 1000 // 16000, 10)
    active = speech_activity(samples, times, AudioConfig())
    assert active[times < 1500].mean() < 0.1
    speech_end = 3000 + len(speech) * 1000 // 16000
    assert active[(times >= 3200) & (times < speech_end - 200)].mean() > 0.5
    assert not active[(times > speech_end + 500) & (times < speech_end + 2500)].any()
    # Session state must reset for every recording.
    assert np.array_equal(active, speech_activity(samples, times, AudioConfig()))
    assert not speech_activity(np.zeros(16000, np.float32), np.arange(0, 1000, 10), AudioConfig()).any()


def test_combined_pipeline_uses_asr_tempo_and_audio_pauses(monkeypatch):
    monkeypatch.setenv("ASR_PROVIDER", "json")
    monkeypatch.setenv("ASR_DEMO_WORDS_PATH", str(Path(__file__).parents[1] / "app/demo/words.json"))
    result = run_analysis(FIXTURE, AnalysisOptions(audio=AudioConfig(activity_detector="energy")))
    assert result.synthetic_demo
    assert result.asr_provider == "json"
    assert result.transcription.summary.filler_count == 1
    assert any(event.type == "filler" and event.t_ms == 1200 for event in result.events)
    assert all(event.source == "asr" for event in result.events if event.type == "pace")
    assert all(event.source == "speech" for event in result.events if event.type == "pause")


@pytest.fixture
def fake_storage(monkeypatch):
    """Small S3 fake; route and worker share the actual JSON persistence helper."""
    objects = {}

    class FakeS3:
        def put_object(self, *, Bucket, Key, Body, **kwargs):
            objects[Key] = Body

        def get_object(self, *, Bucket, Key):
            if Key not in objects:
                raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
            return {"Body": io.BytesIO(objects[Key])}

        def upload_fileobj(self, file, bucket, key):
            objects[key] = file.read()

        def download_file(self, bucket, key, filename):
            Path(filename).write_bytes(objects[key])

        def delete_object(self, *, Bucket, Key):
            objects.pop(Key, None)

    client = FakeS3()
    monkeypatch.setenv("S3_BUCKET", "synthetic-test")
    monkeypatch.setattr(storage, "s3_client", lambda: client)
    monkeypatch.setattr("app.speech.router.s3_client", lambda: client)
    monkeypatch.setattr("app.tasks.s3_client", lambda: client)
    lock = Mock()
    lock.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: Mock(lock=Mock(return_value=lock)))
    return objects


def test_job_lifecycle_idempotency_and_no_media_in_redis(monkeypatch, fake_storage):
    from app.tasks import analyze_speech

    enqueue = AsyncMock(return_value="celery-id")
    monkeypatch.setattr("app.speech.router.enqueue_task", enqueue)
    client = TestClient(app)
    response = client.post("/speech/analyze", files={"recording": ("synthetic.wav", FIXTURE.read_bytes())},
                           data={"transcribe": "false", "config": '{"activity_detector":"energy"}'})
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    assert enqueue.call_args.args == (analyze_speech, job_id)
    assert client.get(response.json()["status_url"]).json()["status"] == "queued"
    pointer = analyze_speech.run(job_id)
    assert set(pointer) == {"job_id", "status_key"}
    status = client.get(response.json()["status_url"]).json()
    assert status["status"] == "completed"
    assert status["result"]["audio"]["summary"]["duration_ms"] > 0
    assert storage.key(job_id, "recording") not in fake_storage
    # No model, media, ASR or analysis access on a redelivery after completion.
    monkeypatch.setattr("app.tasks.run_analysis", Mock(side_effect=AssertionError("must not rerun")))
    assert analyze_speech.run(job_id) == pointer
    assert client.get(f"/speech/jobs/{uuid4()}").status_code == 404
    assert client.get("/speech/jobs/invalid").status_code == 422


def test_queue_outage_cleans_upload(monkeypatch, fake_storage):
    monkeypatch.setattr("app.speech.router.enqueue_task", AsyncMock(side_effect=QueueUnavailable()))
    response = TestClient(app).post("/speech/analyze", files={"recording": ("synthetic.wav", b"data")},
                                    data={"transcribe": "false"})
    assert response.status_code == 503
    assert fake_storage == {}


def test_missing_asr_credentials_does_not_upload(monkeypatch, fake_storage):
    monkeypatch.setenv("ASR_PROVIDER", "deepgram")
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    response = TestClient(app).post("/speech/analyze", files={"recording": ("synthetic.wav", b"data")})
    assert response.status_code == 503
    assert fake_storage == {}


def test_failed_job_is_reported_and_original_deleted(monkeypatch, fake_storage):
    from app.tasks import analyze_speech

    monkeypatch.setattr("app.speech.router.enqueue_task", AsyncMock(return_value="celery-id"))
    response = TestClient(app).post("/speech/analyze", files={"recording": ("synthetic.wav", b"invalid")},
                                    data={"transcribe": "false"})
    job_id = response.json()["job_id"]
    analyze_speech.run(job_id)
    status = TestClient(app).get(response.json()["status_url"]).json()
    assert status["status"] == "failed"
    assert status["result"] is None
    assert storage.key(job_id, "recording") not in fake_storage


def test_invalid_signal_config_is_rejected():
    for config in ({"sample_rate": 44100}, {"frame_ms": 1}, {"f0_max_hz": 20}):
        with pytest.raises(ValueError):
            AudioConfig(**config)


def test_concurrent_redelivery_retries_without_processing(monkeypatch):
    from celery.exceptions import Retry
    from app.tasks import analyze_speech

    lock = Mock()
    lock.acquire.return_value = False
    monkeypatch.setattr("app.connections.redis_client", lambda: Mock(lock=Mock(return_value=lock)))
    analyze = Mock(side_effect=AssertionError("Concurrent copy must not process"))
    monkeypatch.setattr("app.tasks.run_analysis", analyze)
    with pytest.raises(Retry):
        analyze_speech.run(str(uuid4()))
    analyze.assert_not_called()
    lock.release.assert_not_called()

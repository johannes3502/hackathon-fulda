import wave

from scripts.smoke_live import delivery_delay_ms, pcm_frames


def test_latency_exposes_backlog_instead_of_comparing_to_sender():
    # At wall time 10 s the server has only reached audio at 2 s.
    assert delivery_delay_ms(10000, 2000) == 8000
    assert delivery_delay_ms(1999, 2000) == 0


def test_pcm_frames_preserve_short_final_frame(tmp_path):
    path = tmp_path / "tail.wav"
    raw = bytes(3300)
    with wave.open(str(path), "wb") as wav:
        wav.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        wav.writeframes(raw)
    assert b"".join(pcm_frames(path)) == raw

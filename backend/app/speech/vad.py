"""Silero v6.2 ONNX inference, with per-recording recurrent state.

The model is installed at build time, never downloaded during a request.
See THIRD_PARTY.md for source/license. Chunk/context layout follows Silero's
OnnxWrapper; segmentation thresholds remain configurable heuristics.
"""

import hashlib
import os
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.speech.config import AudioConfig

MODEL_SHA256 = "1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3"
MODEL_URL = "https://raw.githubusercontent.com/snakers4/silero-vad/v6.2/src/silero_vad/data/silero_vad.onnx"


@lru_cache(maxsize=2)
def _session(model_path: str):
    import onnxruntime as ort

    path = Path(model_path)
    if hashlib.sha256(path.read_bytes()).hexdigest() != MODEL_SHA256:
        raise RuntimeError("Silero model checksum mismatch")
    options = ort.SessionOptions()
    options.inter_op_num_threads = options.intra_op_num_threads = 1
    return ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])


def speech_activity(samples: np.ndarray, t_ms: np.ndarray, config: AudioConfig) -> np.ndarray:
    if not len(samples):
        return np.zeros(len(t_ms), dtype=bool)
    session = _session(os.getenv("SILERO_MODEL_PATH", "/app/models/silero_vad.onnx"))
    sr = config.sample_rate
    chunk_size, context_size = (512, 64) if sr == 16000 else (256, 32)
    state = np.zeros((2, 1, 128), dtype=np.float32)
    context = np.zeros((1, context_size), dtype=np.float32)
    probabilities = []
    for start in range(0, len(samples), chunk_size):
        chunk = np.zeros((1, chunk_size), dtype=np.float32)
        tail = samples[start:start + chunk_size]
        chunk[0, :len(tail)] = tail
        model_input = np.concatenate((context, chunk), axis=1)
        probability, state = session.run(None, {
            "input": model_input, "state": state, "sr": np.array(sr, dtype=np.int64),
        })
        probabilities.append(float(probability.item()))
        context = model_input[:, -context_size:]

    # Hysteresis plus minimum speech/silence durations prevents frame flicker.
    segments = []
    speech_start = silence_start = None
    for index, probability in enumerate(probabilities):
        position = index * chunk_size
        if probability >= config.vad_threshold:
            silence_start = None
            if speech_start is None:
                speech_start = position
        elif speech_start is not None and probability < max(0.01, config.vad_threshold - 0.15):
            if silence_start is None:
                silence_start = position
            if position + chunk_size - silence_start >= sr * config.vad_min_silence_ms / 1000:
                if silence_start - speech_start >= sr * config.vad_min_speech_ms / 1000:
                    segments.append((speech_start, silence_start))
                speech_start = silence_start = None
    if speech_start is not None:
        end = silence_start if silence_start is not None else len(samples)
        if end - speech_start >= sr * config.vad_min_speech_ms / 1000:
            segments.append((speech_start, end))
    positions = t_ms * sr // 1000
    active = np.zeros(len(t_ms), dtype=bool)
    for start, end in segments:
        active |= (positions >= start) & (positions < end)
    return active

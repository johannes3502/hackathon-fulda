"""Low-level signal functions on mono float samples in [-1, 1]."""

import subprocess
from pathlib import Path

import numpy as np


def decode_audio(recording: Path, sample_rate: int) -> np.ndarray:
    """Decode any FFmpeg-readable recording (WebM/MP4/WAV) to mono float32."""
    result = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(recording),
         "-vn", "-ac", "1", "-ar", str(sample_rate), "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    )
    return np.frombuffer(result.stdout, dtype="<i2").astype(np.float32) / 32768.0


def frame_signal(samples: np.ndarray, frame_len: int, hop: int) -> np.ndarray:
    """Frames centred on multiples of `hop` (frame i is centred at sample i * hop)."""
    count = len(samples) // hop + 1 if len(samples) else 0
    padded = np.pad(samples, (frame_len // 2, frame_len))
    starts = np.arange(count) * hop
    return padded[starts[:, None] + np.arange(frame_len)]


def level_db(frames: np.ndarray) -> np.ndarray:
    """RMS level per frame in dBFS, floored at -100 dB."""
    rms = np.sqrt(np.mean(np.square(frames, dtype=np.float64), axis=1))
    return np.maximum(20 * np.log10(rms + 1e-10), -100.0)


def yin_f0(frames: np.ndarray, sample_rate: int, f0_min: float, f0_max: float, threshold: float) -> np.ndarray:
    """Fundamental frequency per frame (de Cheveigné & Kawahara, YIN); NaN if unvoiced."""
    tau_min = max(1, int(sample_rate / f0_max))
    tau_max = int(sample_rate / f0_min)
    width = frames.shape[1] - tau_max
    if width <= 0:
        raise ValueError("frame too short for f0_min")
    f0 = np.full(len(frames), np.nan)
    if not len(frames):
        return f0

    diff = np.zeros((len(frames), tau_max + 1))
    head = frames[:, :width]
    for tau in range(1, tau_max + 1):
        delta = head - frames[:, tau:tau + width]
        diff[:, tau] = np.einsum("ij,ij->i", delta, delta)
    cmnd = np.ones_like(diff)
    cumulative = np.cumsum(diff[:, 1:], axis=1)
    cmnd[:, 1:] = diff[:, 1:] * np.arange(1, tau_max + 1) / np.maximum(cumulative, 1e-12)

    for i, row in enumerate(cmnd):
        below = np.flatnonzero(row[tau_min:] < threshold)
        if not below.size:
            continue
        tau = tau_min + below[0]
        while tau < tau_max and row[tau + 1] < row[tau]:
            tau += 1
        shift = 0.0
        if tau_min < tau < tau_max:
            a, b, c = row[tau - 1], row[tau], row[tau + 1]
            if (denominator := a - 2 * b + c) != 0:
                shift = 0.5 * (a - c) / denominator
        f0[i] = sample_rate / (tau + shift)
    return f0


def envelope_peaks(level: np.ndarray, active: np.ndarray, half_width: int, prominence_db: float) -> np.ndarray:
    """Indices of local level maxima within ±half_width frames that rise at
    least `prominence_db` above the lowest frame in that range."""
    if not len(level):
        return np.array([], dtype=int)
    window = 2 * half_width + 1
    maxima = np.lib.stride_tricks.sliding_window_view(np.pad(level, half_width, constant_values=-np.inf), window).max(axis=1)
    minima = np.lib.stride_tricks.sliding_window_view(np.pad(level, half_width, constant_values=np.inf), window).min(axis=1)
    rising = np.concatenate(([True], level[1:] > level[:-1]))
    return np.flatnonzero(active & rising & (level == maxima) & (level - minima >= prominence_db))

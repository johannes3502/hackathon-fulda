from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

PROMO = Path(__file__).resolve().parents[1]
VOICE = PROMO / "public" / "voice"
TRIM = VOICE / "trim"
FIT = VOICE / "fit"
TRIM.mkdir(parents=True, exist_ok=True)
FIT.mkdir(parents=True, exist_ok=True)

SR = 24000

FILMS = {
    "progress": {
        "total": 4.8 + 32.233333 + 6.6,
        "blocks": [
            ("progress-01-intro", 0.50, 1.00),
            ("progress-02-hero", 4.95, 1.00),
            ("progress-03-overview", 8.70, 1.22),
            ("progress-04-metrics", 13.70, 1.05),
            ("progress-05-click", 17.20, 1.00),
            ("progress-06-history", 19.40, 1.20),
            ("progress-07-focus", 22.50, 1.05),
            ("progress-08-why", 25.85, 1.18),
            ("progress-09-changes", 30.05, 1.08),
            ("progress-10-limits", 34.10, 1.00),
            ("progress-11-outro", 37.43, 1.00),
        ],
    },
    "review": {
        "total": 3.0 + 29.3 + 5.8,
        "blocks": [
            ("review-01-intro", 0.50, 1.00),
            ("review-02-scores", 3.75, 1.20),
            ("review-03-method", 8.90, 1.12),
            ("review-04-fact-a", 14.80, 1.10),
            ("review-04-fact-b", 18.30, 1.12),
            ("review-05-jump", 21.20, 1.05),
            ("review-06-graph", 26.40, 1.00),
            ("review-07-outro", 32.70, 1.00),
        ],
    },
}


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return float(out)


def trim_silence(src: Path, dst: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(src),
            "-af",
            "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
            "areverse,"
            "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,"
            "areverse",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ]
    )


def apply_tempo(src: Path, dst: Path, tempo: float) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(src),
            "-af",
            f"atempo={tempo:.4f}",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ]
    )


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getframerate() != SR:
            raise ValueError(f"unexpected format: {path}")
        data = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    return data.astype(np.float32)


def write_wav(path: Path, samples: np.ndarray) -> None:
    clipped = np.clip(samples, -32768, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes(clipped.tobytes())


report = {}
for film, spec in FILMS.items():
    total = spec["total"]
    length = int(round(total * SR))
    mix = np.zeros(length, dtype=np.float32)
    cues = []
    previous_end = 0.0
    for block_id, start, tempo in spec["blocks"]:
        src = VOICE / f"{block_id}.wav"
        if not src.exists():
            raise FileNotFoundError(src)
        trimmed = TRIM / f"{block_id}.wav"
        fitted = FIT / f"{block_id}.wav"
        trim_silence(src, trimmed)
        apply_tempo(trimmed, fitted, tempo)
        dur = duration(fitted)
        end = start + dur
        if start < previous_end - 0.001:
            raise SystemExit(
                f"{film}: overlap at {block_id}: start {start:.2f} < previous end {previous_end:.2f}"
            )
        previous_end = end
        if end > total + 0.001:
            raise SystemExit(
                f"{film}: {block_id} ends at {end:.2f}, beyond total {total:.2f}"
            )
        offset = int(round(start * SR))
        samples = read_wav(fitted)
        if offset + len(samples) > length:
            raise SystemExit(f"{film}: {block_id} exceeds mix length")
        mix[offset : offset + len(samples)] += samples
        cues.append(
            {
                "id": block_id,
                "start": round(start, 3),
                "duration": round(dur, 3),
                "end": round(end, 3),
                "atempo": tempo,
            }
        )

    peak = float(np.max(np.abs(mix))) if length else 0.0
    if peak > 32767:
        mix *= 32767 / peak
    raw = VOICE / f"{film}-mix-raw.wav"
    out = VOICE / f"{film}-mix.wav"
    write_wav(raw, mix)
    run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(raw),
            "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar",
            str(SR),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(out),
        ]
    )
    report[film] = {
        "total": round(total, 3),
        "audio": str(out.relative_to(PROMO / "public")),
        "cues": cues,
    }
    print(f"\n{film}: total {total:.2f}s, peak {peak:.0f}")
    for cue in cues:
        print(
            f"  {cue['start']:6.2f}  {cue['duration']:5.2f}s  "
            f"{cue['id']:<26} tempo {cue['atempo']:.2f}"
        )

(PROMO / "voiceover" / "mix.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
)
print("\nwrote promo/voiceover/mix.json")

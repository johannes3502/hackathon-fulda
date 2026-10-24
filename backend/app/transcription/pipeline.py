"""Recording → ASR-ready audio → word timestamps → word-based events."""

import subprocess
import tempfile
from pathlib import Path

from app.transcription.analysis import analyze_words
from app.transcription.config import WordConfig
from app.transcription.models import WordAnalysis, Word
from app.transcription.transcriber import Transcriber


def extract_audio(recording: Path, target: Path) -> Path:
    """Convert a browser recording (WebM/MP4) to 16 kHz mono WAV with FFmpeg."""
    subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(recording),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(target)],
        check=True,
    )
    return target


def run_transcription_pipeline(
    recording: Path, transcriber: Transcriber, config: WordConfig | None = None
) -> tuple[list[Word], WordAnalysis]:
    with tempfile.TemporaryDirectory() as workdir:
        audio = extract_audio(recording, Path(workdir) / "audio.wav")
        words = transcriber.transcribe(audio)
    return words, analyze_words(words, config)

"""Combined post-recording analysis; timestamps retain the original origin."""

import os
from pathlib import Path

from app.events import merge_timeline
from app.speech.analysis import analyze_recording
from app.speech.job_models import AnalysisOptions, RecordingAnalysis
from app.transcription.pipeline import run_transcription_pipeline
from app.transcription.transcriber import configured_transcriber


def run_analysis(recording: Path, options: AnalysisOptions) -> RecordingAnalysis:
    audio = analyze_recording(recording, options.audio)
    words, transcription = [], None
    provider = None
    notices = ["Schwellenwerte und signalbasierte Silbenrate sind ungeprüfte Heuristiken."]
    if options.audio.baseline_ms is not None:
        notices.append(f"Kalibrierung: die ersten {options.audio.baseline_ms} ms normal sprechen.")
        if not any(active and t < options.audio.baseline_ms
                   for t, active in zip(audio.series.t_ms, audio.series.active)):
            notices.append("Keine Sprache in der Kalibrierung erkannt; Lautstärke- und Tempovergleich nicht verfügbar.")
    if options.transcribe:
        provider = os.getenv("ASR_PROVIDER", "deepgram")
        words, transcription = run_transcription_pipeline(recording, configured_transcriber(), options.words)
        notices.append("Füllwortanzahl zählt nur im Transkript enthaltene Wörter; deutsche äh/ähm-Erkennung ist ungeprüft.")
        if provider == "json":
            notices.append("Synthetische Demo: Wort-Timestamps sind vorberechnet, keine ASR-Erkennung.")
    # ASR supplies tempo; acoustic speech segments supply pauses. Preserve raw
    # events on each pipeline, but expose no duplicates on the merged timeline.
    audio_events = [event for event in audio.events if transcription is None or event.type != "pace"]
    word_events = [event for event in transcription.events if event.type != "pause"] if transcription else []
    return RecordingAnalysis(
        audio=audio, words=words, transcription=transcription,
        events=merge_timeline(audio_events, word_events), asr_provider=provider,
        synthetic_demo=provider == "json", notices=notices,
    )

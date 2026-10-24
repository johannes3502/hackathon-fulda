"""Combined post-recording analysis; timestamps retain the original origin."""

import os
from pathlib import Path

from app.events import merge_timeline
from app.speech.analysis import analyze_recording
from app.speech.job_models import AnalysisOptions, RecordingAnalysis
from app.transcription.analysis import analyze_words
from app.transcription.pipeline import run_transcription_pipeline
from app.transcription.text import transcript_text
from app.transcription.transcriber import configured_transcriber


def run_analysis(recording: Path, options: AnalysisOptions) -> RecordingAnalysis:
    audio = analyze_recording(recording, options.audio)
    words, transcription = [], None
    provider = None
    notices = ["Schwellenwerte und signalbasierte Silbenrate sind ungeprüfte Heuristiken."]
    if options.audio.baseline_ms is not None:
        notices.append(f"Stimmreferenz: zunächst {options.audio.baseline_ms} ms erkannte stimmhafte Sprache sammeln; danach langsam nachführen. Stille zählt nicht.")
        if not audio.heuristics.get("baseline_ready", False):
            notices.append("Nicht genug stimmhafte Sprache für die Kalibrierung; Lautstärke- und Tempovergleich nicht verfügbar.")
    if options.transcribe:
        if options.live_transcript is not None:
            provider = options.live_transcript.provider
            words = options.live_transcript.words
            if any(word.end_ms > audio.summary.duration_ms + 100 for word in words):
                raise ValueError("Live transcript extends beyond the recording")
            transcription = analyze_words(words, options.words)
            notices.append("Deepgram EU: finales Live-Transkript übernommen; keine erneute ASR-Anfrage.")
        else:
            provider = os.getenv("ASR_PROVIDER", "whisper").strip().lower() or "whisper"
            words, transcription = run_transcription_pipeline(recording, configured_transcriber(), options.words)
        notices.append("Füllwortanzahl zählt nur im Transkript enthaltene Wörter; deutsche äh/ähm-Erkennung ist ungeprüft.")
        if provider == "json":
            notices.append("Synthetische Demo: Wort-Timestamps sind vorberechnet, keine ASR-Erkennung.")
        elif provider in {"whisper", "faster-whisper"}:
            notices.append("Lokale Whisper-Transkription: Füllwörter und Wortgrenzen sind modellabhängig.")
    # Keep ASR pause context for the review. Only replace acoustic pauses that
    # actually overlap a word-based pause; acoustic-only gaps remain available.
    # Both raw pipelines stay intact, and ASR remains the source for word pace.
    word_events = transcription.events if transcription else []
    word_pauses = [event for event in word_events if event.type == "pause"]
    audio_events = [event for event in audio.events
        if not (transcription is not None and event.type == "pace")
        and not (event.type == "pause" and any(
            event.t_ms < pause.t_ms + pause.duration_ms and pause.t_ms < event.t_ms + event.duration_ms
            for pause in word_pauses))]
    return RecordingAnalysis(
        audio=audio, words=words, text=transcript_text(words), transcription=transcription,
        events=merge_timeline(audio_events, word_events), asr_provider=provider,
        synthetic_demo=provider == "json", notices=notices,
    )

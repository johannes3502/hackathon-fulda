"use client";
import { useEffect, useRef, useState } from "react";
import type { LiveRecording } from "@/features/live/contracts";
import { analysisResult, parseWords, request } from "@/features/live/analysis";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";

export function TranscriptAnalysis({
  recording,
}: {
  recording: LiveRecording;
}) {
  const { save } = useLiveSessions();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function analyze(file: File) {
    const active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    setBusy(true);
    setNotice(null);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a transcript smaller than 5 MB.");
      const words = parseWords(
        JSON.parse(await file.text()),
        recording.durationMs,
      );
      if (active.signal.aborted) return;
      const result = analysisResult(
        await request(
          recording.config.endpoint,
          "/transcription/analyze-words",
          active.signal,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words }),
          },
        ),
        "words",
        recording.durationMs,
      );
      if (active.signal.aborted) return;
      save({
        ...recording,
        words,
        factCheck: undefined,
        feedback: [
          ...recording.feedback.filter(
            (f) => !f.id.startsWith("words-") && !f.id.startsWith("fact-"),
          ),
          ...result.feedback,
        ].sort((a, b) => a.startMs - b.startMs),
        metrics: [
          ...recording.metrics.filter((m) => !m.id.startsWith("words-")),
          ...result.metrics,
        ],
      });
      setNotice("Transcript analysis added to this take.");
    } catch (error) {
      if (!active.signal.aborted)
        setNotice(
          error instanceof Error
            ? error.message
            : "Transcript analysis failed.",
        );
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Analyze a timestamped transcript</h2>
      <p>
        {recording.words?.length
          ? `This take has a transcript with ${recording.words.length} words. Importing another one replaces it and clears the fact-check.`
          : "This take has no transcript. Turn on transcription before recording, or upload words from this take to analyze pauses, fillers and pace and to enable the fact-check."}
      </p>
      <label htmlFor="transcript-file">Word timestamps (JSON)</label>
      <input
        id="transcript-file"
        type="file"
        accept="application/json,.json"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void analyze(file);
        }}
      />
      <p className="field-hint">
        Array format: {`[{"word":"Hello","start_ms":0,"end_ms":400}]`}. Times
        are relative to recording start. This sends the transcript to the same
        backend.
      </p>
      <p role="status">{busy ? "Analyzing transcript…" : notice}</p>
    </section>
  );
}

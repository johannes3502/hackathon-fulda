"use client";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { time } from "@/lib/utils";

export function RecordedTranscript({
  recording,
  onSelect,
}: {
  recording: LiveRecording;
  onSelect: (item: LiveFeedback) => void;
}) {
  const transcript = recording.transcript;
  if (!transcript) return null;
  return (
    <section className="panel recorded-transcript">
      <h2>Your transcript</h2>
      <p className="field-hint">
        {transcript.provider} · Click a word to replay it. Check recognition
        errors before comparing statements with sources.
      </p>
      {transcript.notices.map((notice) => (
        <p className="field-hint" key={notice}>
          {notice}
        </p>
      ))}
      {transcript.words.length ? (
        <div className="transcript-words">
          {transcript.words.map((word, index) => (
            <button
              key={index}
              title={time(word.start_ms)}
              onClick={() =>
                onSelect({
                  id: `transcript-${index}`,
                  category: "Transcript",
                  kind: "observation",
                  startMs: word.start_ms,
                  endMs: word.end_ms,
                  title: word.word,
                  detail:
                    "Automatically recognized words can be wrong. Compare this word with the recording.",
                  action:
                    "Listen to the surrounding sentence before relying on it.",
                })
              }
            >
              {word.word}{" "}
            </button>
          ))}
        </div>
      ) : (
        <p>
          No words were recognized. You can still review your video and camera
          observations.
        </p>
      )}
    </section>
  );
}

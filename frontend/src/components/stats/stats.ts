import type { LiveRecording } from "@/features/live/contracts";

export const STAT_LABELS = {
  gesture: "Gestik",
  knowledge: "Fachwissen",
  flow: "Flow",
} as const;

/** Counts and durations from captured takes; observations are not quality scores. */
export function summarizeRecordings(
  recordings: Pick<LiveRecording, "durationMs" | "feedback" | "words">[],
) {
  return {
    sessions: recordings.length,
    durationMs: recordings.reduce((sum, take) => sum + take.durationMs, 0),
    moments: recordings.reduce((sum, take) => sum + take.feedback.length, 0),
    transcripts: recordings.filter((take) => (take.words?.length ?? 0) > 0)
      .length,
  };
}

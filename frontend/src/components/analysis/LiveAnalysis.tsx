"use client";

import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { MissingRecording } from "@/components/live/shared";
import { ReviewAnalysis } from "./ReviewAnalysis";
import { recordingReviewData } from "./review-data";

export function LiveAnalysis({ sessionId }: { sessionId: string }) {
  const { recordings } = useLiveSessions();
  const recording = recordings[sessionId];
  if (!recording) return <MissingRecording />;
  return (
    <ReviewAnalysis
      key={recording.id}
      backHref={`/live/${sessionId}/review`}
      backLabel="Zur Aufnahmeübersicht"
      data={recordingReviewData(recording)}
      recording={recording}
    />
  );
}

"use client";

import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { MissingRecording } from "@/components/live/shared";
import { ReviewAnalysis } from "./ReviewAnalysis";
import { feedbackToMoment } from "./review-data";

export function LiveAnalysis({ sessionId }: { sessionId: string }) {
  const { recordings } = useLiveSessions();
  const recording = recordings[sessionId];
  if (!recording) return <MissingRecording />;
  return (
    <ReviewAnalysis
      key={recording.id}
      backHref={`/live/${sessionId}/review`}
      backLabel="Zur Aufnahmeübersicht"
      data={{
        title: recording.config.title,
        durationMs: recording.durationMs,
        videoUrl: recording.videoUrl,
        demo: false,
        performance: [],
        claims: recording.factCheck?.claims,
        moments: recording.feedback.map((item) => {
          const factIndex = /^fact-(\d+)$/.exec(item.id);
          const claim = factIndex
            ? recording.factCheck?.claims[Number(factIndex[1])]
            : undefined;
          return feedbackToMoment(item, claim);
        }),
      }}
    />
  );
}

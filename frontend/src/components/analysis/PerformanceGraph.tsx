"use client";

import { FeedbackGraph } from "@/components/live/FeedbackGraph";
import type { ReviewMoment } from "./review-data";

export function PerformanceGraph({
  durationMs,
  moments,
  positionMs,
  selectedId,
  onSeek,
  onSelect,
}: {
  durationMs: number;
  moments: ReviewMoment[];
  positionMs: number;
  selectedId?: string;
  onSeek: (tMs: number) => void;
  onSelect: (moment: ReviewMoment) => void;
}) {
  return (
    <div className="review418-graph-panel">
      <FeedbackGraph
        durationMs={durationMs}
        positionMs={positionMs}
        selectedId={selectedId}
        language="de"
        onSeek={onSeek}
        onSelect={(item) => {
          const moment = moments.find((moment) => moment.id === item.id);
          if (moment) onSelect(moment);
        }}
        feedback={moments.map((moment) => ({
          id: moment.id,
          category: moment.criterion ?? "note",
          kind: moment.assessment
            ? moment.assessment === "neutral"
              ? "observation"
              : moment.assessment
            : moment.kind === "note"
              ? "observation"
              : moment.kind,
          startMs: moment.tMs,
          endMs: moment.tMs + moment.durationMs,
          title: moment.title,
          detail: moment.detail,
          action: moment.action,
        }))}
      />
    </div>
  );
}

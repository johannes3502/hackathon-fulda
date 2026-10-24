"use client";
import { useEffect, useRef } from "react";
import {
  coachMessage,
  poseFeedback,
  type PoseTestResult,
} from "@/features/pose/testPoses";
import { CoachCue } from "./CoachCue";

export type PoseView = "coach" | "status";

export function PoseDevMode({
  results,
  handModel,
  view,
}: {
  results: PoseTestResult[];
  handModel: boolean | null;
  view: PoseView;
}) {
  const { state, id, label, detail } = poseFeedback(results);
  const logged = useRef("");
  // Console trace for tuning: log each new dominant pose once.
  useEffect(() => {
    const key = `${state}|${id}|${detail}`;
    if (key === logged.current) return;
    logged.current = key;
    console.log(`[pose] ${state} ${label} (${detail})`);
  }, [state, id, label, detail]);
  if (view === "coach")
    return (
      <CoachCue
        message={coachMessage(id)}
        detail={handModel === false ? "hand model unavailable" : detail}
        state={state}
        className="live-pose-cue-lab"
      />
    );
  return (
    <div
      className="live-pose-lab"
      data-state={state}
      aria-label="Pose test lab"
      aria-live="assertive"
    >
      <span className="pose-status-kicker">Pose lab</span>
      <strong>{label}</strong>
      <span className="pose-status-detail">{detail}</span>
      {handModel === false && (
        <span className="pose-status-warning">Hand model unavailable</span>
      )}
      <small>Dev only · heuristics, not validated · no events</small>
    </div>
  );
}

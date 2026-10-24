"use client";
import { useEffect, useRef } from "react";
import {
  backendLabel,
  fallbackLabel,
  type PoseBackend,
} from "@/features/pose/backend";
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
  handError,
  hands,
  backend,
  view,
}: {
  results: PoseTestResult[];
  handModel: boolean | null;
  handError: string | null;
  hands: number;
  backend: PoseBackend | null;
  view: PoseView;
}) {
  const { state, id, label, detail, failing } = poseFeedback(results);
  const failingText = failing.join(", ");
  const fallback = fallbackLabel(backend);
  const acceleration = backendLabel(backend, handModel);
  const logged = useRef("");
  // Console trace for tuning: log each new dominant pose once.
  useEffect(() => {
    const key = `${state}|${id}|${detail}|${failingText}|${hands}`;
    if (key === logged.current) return;
    logged.current = key;
    console.log(
      `[pose] ${state} ${label} (${detail}) failing=[${failingText}] hands=${hands}`,
    );
  }, [state, id, label, detail, failingText, hands]);
  if (view === "coach")
    return (
      <CoachCue
        message={coachMessage(id)}
        detail={
          handModel === false
            ? `${acceleration}${handError ? `: ${handError}` : ""}`
            : `${detail} · ${hands} hands · ${acceleration}`
        }
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
      {!!failing.length && (
        <span className="pose-status-failing">
          failing: {failingText}
        </span>
      )}
      <span className="pose-status-backend" data-delegate={backend?.pose}>
        {backend ? acceleration : "Detecting acceleration…"}
      </span>
      {!!backend?.renderer && (
        <span className="pose-status-hands" title={backend.renderer}>
          {backend.renderer}
        </span>
      )}
      {!!fallback && (
        <span className="pose-status-warning">CPU fallback: {fallback}</span>
      )}
      <span className="pose-status-hands">
        {handModel === null
          ? "Hand model loading"
          : handModel
            ? `Hands detected: ${hands}`
            : `Hand model unavailable${handError ? `: ${handError}` : ""}`}
      </span>
      <small>Dev only · heuristics, not validated · no events</small>
    </div>
  );
}

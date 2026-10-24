import type { LiveFeedback } from "../live/contracts";
import type { PoseEvent } from "./evaluation";

export function poseFeedback(event: PoseEvent): LiveFeedback {
  return {
    id: event.id,
    category:
      event.type === "posture"
        ? "Posture"
        : event.type === "gaze"
          ? "Head"
          : "Gestures",
    kind: "observation",
    startMs: event.t_ms,
    endMs: event.t_ms + event.duration_ms,
    title: event.payload.title,
    detail: `${event.payload.detail} Prototype heuristic; review the context.`,
    action: event.payload.action,
    evidence: event,
  };
}

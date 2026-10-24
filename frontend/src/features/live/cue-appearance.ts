import type { PoseEvaluation } from "../pose/evaluation";
import type { LiveFeedback } from "./contracts";
import {
  AudioLines,
  CameraOff,
  CheckCircle2,
  EyeOff,
  Gauge,
  Hand,
  Handshake,
  Lightbulb,
  MessageCircle,
  MoveHorizontal,
  Pause,
  PersonStanding,
  Scan,
  ScanLine,
  UnfoldHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";

type State = PoseEvaluation["phase"] | "hidden" | "unavailable";
const icons: Record<string, LucideIcon> = {
  hand_raised: Hand,
  hands_together: Handshake,
  arms_crossed: UnfoldHorizontal,
  torso_lean: PersonStanding,
  body_shift: MoveHorizontal,
  hand_in_pocket: Hand,
  hands_hidden: EyeOff,
  hand_near_face: Hand,
  legs_crossed: PersonStanding,
  shoulder_tilt: PersonStanding,
  volume: Volume2,
  pitch: AudioLines,
  pace: Gauge,
  pause: Pause,
  filler: MessageCircle,
};

export function cueAppearance(
  feedback: LiveFeedback | null | undefined,
  state: State,
) {
  if (state === "hidden")
    return { tone: "neutral", label: "Hints hidden", Icon: EyeOff };
  if (feedback) {
    const key =
      feedback.evidence?.payload.rule ?? feedback.category.toLowerCase();
    const Icon = icons[key] ?? Lightbulb;
    if (feedback.kind === "positive")
      return { tone: "positive", label: "Good", Icon };
    // A raised hand or a pause is not inherently a presentation problem.
    const adjustment =
      feedback.kind === "suggestion" ||
      feedback.kind === "attention" ||
      [
        "arms_crossed",
        "torso_lean",
        "hand_in_pocket",
        "hand_near_face",
        "legs_crossed",
        "shoulder_tilt",
        "volume",
        "pitch",
        "pace",
        "filler",
      ].includes(key);
    return {
      tone: adjustment ? "attention" : "neutral",
      label: adjustment ? "Try adjusting" : "Observation",
      Icon,
    };
  }
  if (state === "unavailable")
    return {
      tone: "attention",
      label: "Tracking unavailable",
      Icon: CameraOff,
    };
  if (state === "ready")
    return { tone: "positive", label: "Tracking ready", Icon: CheckCircle2 };
  return {
    tone: "neutral",
    label: state === "calibrating" ? "Calibrating" : "Check framing",
    Icon: state === "calibrating" ? ScanLine : Scan,
  };
}

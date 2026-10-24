import type { PoseRuleMode } from "../pose/evaluation";
import { LIVE_RULE_IDS, type LiveRule } from "../pose/lab-events";
import { POSE_TESTS, type PoseTestId } from "../pose/testPoses";

export type PoseFeedbackSettings = {
  rules: Record<LiveRule, PoseRuleMode>;
  lab: Record<PoseTestId, boolean>;
};

const STORAGE_KEY = "pitchcoach.poseFeedback";
const MODES: readonly PoseRuleMode[] = ["on", "review", "off"];

export function defaultPoseFeedback(): PoseFeedbackSettings {
  return {
    rules: Object.fromEntries(LIVE_RULE_IDS.map((id) => [id, "on"])) as Record<
      LiveRule,
      PoseRuleMode
    >,
    lab: Object.fromEntries(POSE_TESTS.map((t) => [t.id, true])) as Record<
      PoseTestId,
      boolean
    >,
  };
}

/** Saved switches; unknown or invalid entries stay at their default (on). */
export function loadPoseFeedback(): PoseFeedbackSettings {
  const settings = defaultPoseFeedback();
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (!saved || typeof saved !== "object") return settings;
    const { rules, lab } = saved as Record<string, unknown>;
    if (rules && typeof rules === "object")
      for (const id of LIVE_RULE_IDS) {
        const mode = (rules as Record<string, unknown>)[id];
        if (MODES.includes(mode as PoseRuleMode))
          settings.rules[id] = mode as PoseRuleMode;
      }
    if (lab && typeof lab === "object")
      for (const { id } of POSE_TESTS) {
        const on = (lab as Record<string, unknown>)[id];
        if (typeof on === "boolean") settings.lab[id] = on;
      }
  } catch {}
  return settings;
}

export function savePoseFeedback(settings: PoseFeedbackSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export const disabledLabTests = (settings: PoseFeedbackSettings) =>
  POSE_TESTS.filter((t) => !settings.lab[t.id]).map((t) => t.id);

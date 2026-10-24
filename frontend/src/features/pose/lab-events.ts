import {
  POSE_RULE_IDS,
  POSE_RULES,
  RULE_COPY,
  type PoseEvent,
  type PoseRuleMode,
} from "./evaluation";
import type { PoseTestId, PoseTestResult } from "./testPoses";

// Pose lab tests without a calibrated live rule. They reach live feedback and
// the review with the same per-frame logic as the Pose lab panel.
export const LAB_RULES = {
  pocket: "hand_in_pocket",
  "hands-hidden": "hands_hidden",
  "self-touch": "hand_near_face",
  "crossed-legs": "legs_crossed",
  "shoulder-tilt": "shoulder_tilt",
  "head-tilt": "head_tilt",
} as const satisfies Partial<Record<PoseTestId, string>>;
type LabTest = keyof typeof LAB_RULES;
export type LabRule = (typeof LAB_RULES)[LabTest];

// Event type, title, detail and action per rule.
export const LAB_COPY: Record<
  LabRule,
  readonly [PoseEvent["type"], string, string, string]
> = {
  hand_in_pocket: [
    "gesture",
    "Hand in pocket",
    "A wrist stayed close to its hip while the hand model found no hand there in the camera image. A hand in a pocket is not free for gestures; the hand model can also miss a visible hand.",
    "Replay this moment: was your hand in your pocket? Take it out if you want it free for a gesture.",
  ],
  hands_hidden: [
    "gesture",
    "Hands out of view",
    "Neither wrist nor hand was visible in the camera image. Hands behind your back or below the frame cannot support an explanation; framing can also cause this.",
    "Check your framing and where your hands were. Keep them in view if you want to use gestures.",
  ],
  hand_near_face: [
    "gesture",
    "Hand near face",
    "A hand stayed close to your face in the camera image. A hand at the chin or cheek can cover your mouth; it says nothing about personality or emotion.",
    "Replay this moment: was the touch intentional? Keep your hands below your chin while speaking if comfortable.",
  ],
  legs_crossed: [
    "posture",
    "Legs crossed",
    "Your thighs crossed or closed in the camera image. A crossed stance narrows your base; check whether it was comfortable.",
    "Check the moment in context. Try standing with both feet apart for a stable base if comfortable.",
  ],
  shoulder_tilt: [
    "posture",
    "Shoulders uneven",
    "One shoulder stayed clearly lower than the other in the camera image. A held tilt can shift your balance; the camera angle can also cause this.",
    "Replay this moment and compare it with your comfortable starting position.",
  ],
  head_tilt: [
    "gaze",
    "Head tilted to the side",
    "Your head stayed tilted towards one shoulder in the camera image. Check whether it was intentional. Eye contact is not measured.",
    "Replay this moment: was the tilt intentional? Return to an upright head position if comfortable.",
  ],
};

// Every rule with a live hint, in admin order: calibrated first, then lab.
export const LIVE_RULE_IDS = [
  ...POSE_RULE_IDS,
  ...Object.values(LAB_RULES),
] as const;
export type LiveRule = (typeof LIVE_RULE_IDS)[number];
export type LiveRuleModes = Partial<Record<LiveRule, PoseRuleMode>>;

/** Title and detail for the admin list. */
export const ruleCopy = (rule: LiveRule): readonly [string, string] =>
  rule in LAB_COPY
    ? (LAB_COPY[rule as LabRule].slice(1, 3) as [string, string])
    : (RULE_COPY[rule as keyof typeof RULE_COPY].slice(0, 2) as [
        string,
        string,
      ]);

const isLabTest = (id: PoseTestId): id is LabTest => id in LAB_RULES;

/**
 * Turns recognized Pose lab alerts into one event per episode. The lab tracker
 * already applies the admin hold and its own release times; this adds the
 * live cooldown and the shared recording time axis.
 */
export class LabEventTracker {
  private open = new Map<LabTest, PoseEvent>();
  private cooldown = new Map<LabTest, number>();
  private events: PoseEvent[] = [];
  constructor(
    private sessionId = "preview",
    // Admin switches per rule; missing rules are on.
    private modes: LiveRuleModes = {},
  ) {}

  setModes(modes: LiveRuleModes) {
    this.modes = modes;
  }

  update(results: PoseTestResult[], t: number) {
    const active = new Set<LabTest>();
    for (const result of results) {
      if (!isLabTest(result.id) || result.state !== "recognized") continue;
      const test = result.id;
      if (this.modes[LAB_RULES[test]] === "off") continue;
      let event = this.open.get(test);
      if (!event && t < (this.cooldown.get(test) ?? 0)) continue;
      active.add(test);
      event = this.event(test, result, t, event);
      this.open.set(test, event);
      this.events = this.events.some((e) => e.id === event.id)
        ? this.events.map((e) => (e.id === event.id ? event : e))
        : [...this.events, event];
    }
    for (const [test, event] of this.open)
      if (!active.has(test)) {
        this.open.delete(test);
        this.cooldown.set(
          test,
          event.t_ms + event.duration_ms + POSE_RULES.cooldownMs,
        );
      }
    // Review only keeps the timeline event without a live hint.
    const cue = [...this.open.values()]
      .filter((e) => this.modes[e.payload.rule as LabRule] !== "review")
      .at(-1);
    return { cue: cue ?? null, events: this.events };
  }

  private event(
    test: LabTest,
    result: PoseTestResult,
    t: number,
    previous: PoseEvent | undefined,
  ): PoseEvent {
    const rule = LAB_RULES[test];
    const [type, title, detail, action] = LAB_COPY[rule];
    // A pose held through its cooldown starts when the cooldown ends.
    const start =
      previous?.t_ms ??
      Math.max(this.cooldown.get(test) ?? 0, Math.round(t - result.heldMs));
    return {
      session_id: this.sessionId,
      id: previous?.id ?? `${this.sessionId}-${rule}-${start}`,
      t_ms: start,
      duration_ms: Math.max(0, Math.round(t - start)),
      type,
      severity: "info",
      source: "browser",
      payload: {
        rule,
        rule_version: POSE_RULES.version,
        heuristic: true,
        title,
        detail,
        action,
        measurement: result.value,
        initial_measurement:
          previous?.payload.initial_measurement ?? result.value,
        baseline: null,
        threshold: null,
        unit: null,
        confirmed_at_ms: previous?.payload.confirmed_at_ms ?? Math.round(t),
        calibration: null,
        values: result.values,
      },
    };
  }
}

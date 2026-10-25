import type {
  AnswerChoice,
  EventPayload,
  SessionConfig,
} from "../../contracts";
export const defaults: SessionConfig = {
  title: "Learning by explaining · seminar presentation",
  context:
    "A synthetic seminar presentation about learning by explaining. It explores how oral questions can reveal understanding, why claims need evidence, and how a teacher can guide reflection.",
  audience: "examiner",
  targetDurationMs: 180000,
  mode: "coach",
  criteria: ["Clarity", "Supporting evidence", "Delivery"],
};
export const answers: AnswerChoice[] = [
  {
    id: "vague",
    label: "Vague answer",
    text: "We have seen really promising results. People liked it, so we think 50 percent is a reasonable estimate.",
  },
  {
    id: "direct",
    label: "Direct answer",
    text: "The 50 percent figure is a hypothesis, not a measured result. We have not run a controlled pilot yet. We will compare explanation quality before and after practice using the same rubric.",
  },
];
const segment = (
  id: string,
  text: string,
  startMs: number,
  endMs: number,
  revision = 1,
  isFinal = true,
): EventPayload => ({
  type: "transcript.updated",
  segment: {
    id,
    revision,
    speaker: "presenter",
    startMs,
    endMs,
    text,
    isFinal,
  },
});
export const presentation: { offset: number; payload: EventPayload }[] = [
  {
    offset: 2000,
    payload: segment(
      "opening",
      "What if a polished essay",
      3000,
      5000,
      1,
      false,
    ),
  },
  {
    offset: 4000,
    payload: segment(
      "opening",
      "What if a polished essay no longer tells us what a student understands?",
      3000,
      7000,
      2,
    ),
  },
  { offset: 5000, payload: { type: "coverage.updated", items: ["Topic"] } },
  {
    offset: 6000,
    payload: {
      type: "metrics.updated",
      patch: {
        paceWpm: { value: 148, quality: "good" },
        fillerCount: { value: 1, quality: "good" },
        posture: { value: "steady", quality: "good" },
        vocalVariation: { value: "varied", quality: "good" },
        gestures: { value: "visible", quality: "good" },
      },
    },
  },
  {
    offset: 10000,
    payload: segment(
      "solution",
      "Explaining a topic reveals how we reason. The AI asks questions; the teacher decides.",
      8000,
      13000,
    ),
  },
  {
    offset: 10000,
    payload: {
      type: "metrics.updated",
      patch: {
        paceWpm: { value: 182, quality: "good" },
        fillerCount: { value: 3, quality: "good" },
      },
    },
  },
  {
    offset: 10000,
    payload: {
      type: "cue.created",
      cue: {
        id: "pace",
        category: "delivery",
        message: "Give your idea room. Pause after the next sentence.",
        priority: 2,
        expiresAtMs: 22000,
      },
    },
  },
  {
    offset: 11000,
    payload: { type: "coverage.updated", items: ["Topic", "Explanation"] },
  },
  {
    offset: 18000,
    payload: segment(
      "claim",
      "Explaining a topic improves student understanding by 50 percent.",
      17000,
      21000,
    ),
  },
  {
    offset: 18000,
    payload: {
      type: "cue.created",
      cue: {
        id: "evidence",
        category: "content",
        message: "Make the number credible. Explain what you measured.",
        priority: 1,
        expiresAtMs: 32000,
      },
    },
  },
  {
    offset: 22000,
    payload: {
      type: "metrics.updated",
      patch: {
        gestures: {
          value: null,
          quality: "unavailable",
          reason: "Hands outside the sample frame",
        },
        vocalVariation: {
          value: "limited",
          quality: "limited",
          reason: "Short sample; not enough variation to interpret reliably",
        },
      },
    },
  },
  {
    offset: 26000,
    payload: segment(
      "close",
      "To test this claim, we could compare explanations before and after practice using the same rubric.",
      25000,
      29000,
    ),
  },
  {
    offset: 28000,
    payload: {
      type: "metrics.updated",
      patch: {
        gestures: { value: "visible", quality: "good" },
        paceWpm: { value: 154, quality: "good" },
        vocalVariation: { value: "varied", quality: "good" },
      },
    },
  },
  {
    offset: 28000,
    payload: {
      type: "coverage.updated",
      items: ["Topic", "Explanation", "Conclusion"],
    },
  },
];

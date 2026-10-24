import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Hand, Pause, UnfoldHorizontal, Volume2 } from "lucide-react";
import { expect, it } from "vitest";
import { cueAppearance } from "./cue-appearance";
import type { LiveFeedback } from "./contracts";
import type { PoseEvent } from "../pose/evaluation";

const feedback = (
  category: string,
  kind: LiveFeedback["kind"] = "observation",
): LiveFeedback => ({
  id: "cue",
  category,
  kind,
  startMs: 0,
  endMs: 1000,
  title: "Observed cue",
  detail: "Measured during this take",
  action: "Review the context",
});

it.each(["volume", "pitch", "pace", "filler"])(
  "marks the existing %s correction as an adjustment",
  (category) => {
    expect(cueAppearance(feedback(category), "ready")).toMatchObject({
      tone: "attention",
      label: "Try adjusting",
    });
  },
);

it("uses the measured pose rule to distinguish crossed arms from a raised hand", () => {
  const pose = (rule: PoseEvent["payload"]["rule"]) => ({
    ...feedback("Gestures"),
    evidence: { payload: { rule } } as PoseEvent,
  });
  expect(cueAppearance(pose("arms_crossed"), "ready")).toMatchObject({
    tone: "attention",
    Icon: UnfoldHorizontal,
  });
  expect(cueAppearance(pose("hand_raised"), "ready")).toMatchObject({
    tone: "neutral",
    Icon: Hand,
  });
});

it("does not turn pauses or unknown observations into bad or good performance", () => {
  expect(cueAppearance(feedback("pause"), "ready")).toMatchObject({
    tone: "neutral",
    Icon: Pause,
  });
  expect(cueAppearance(feedback("unknown"), "ready")).toMatchObject({
    tone: "neutral",
    label: "Observation",
  });
});

it("honors explicit positive and corrective feedback", () => {
  expect(cueAppearance(feedback("volume", "positive"), "ready")).toMatchObject({
    tone: "positive",
    label: "Good",
    Icon: Volume2,
  });
  expect(cueAppearance(feedback("unknown", "suggestion"), "ready").tone).toBe(
    "attention",
  );
  expect(cueAppearance(feedback("unknown", "attention"), "ready").tone).toBe(
    "attention",
  );
});

it("labels green readiness as tracking status rather than good performance", () => {
  expect(cueAppearance(null, "ready")).toMatchObject({
    tone: "positive",
    label: "Tracking ready",
  });
  for (const state of [
    "framing",
    "calibrating",
    "unavailable",
    "hidden",
  ] as const)
    expect(cueAppearance(null, state).tone).not.toBe("positive");
  expect(cueAppearance(feedback("volume"), "hidden")).toMatchObject({
    tone: "neutral",
    label: "Hints hidden",
  });
});

it("renders contextual icons as SVGs", () => {
  for (const category of ["volume", "pitch", "pace", "pause", "filler"]) {
    const { Icon } = cueAppearance(feedback(category), "ready");
    expect(renderToStaticMarkup(createElement(Icon))).toMatch(/^<svg /);
  }
});

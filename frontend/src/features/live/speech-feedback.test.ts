import { expect, it } from "vitest";
import { speechCue } from "./speech-feedback";
import type { LiveFeedback } from "./contracts";

const event: LiveFeedback = {
  id: "speech-0",
  category: "volume",
  kind: "suggestion",
  startMs: 3000,
  endMs: 5000,
  title: "volume · quiet",
  detail: "Heuristic",
  action: "Review",
};

it("shows one actionable hint and cools down each category", () => {
  const shown = new Map<string, number>();
  expect(speechCue([event], 5100, shown)?.title).toBe("Your voice is quieter");
  expect(speechCue([event], 6000, shown)).toBeNull();
  expect(speechCue([{ ...event, endMs: 20000 }], 20100, shown)).not.toBeNull();
});

it("does not revive stale observations or invent cues for unknown findings", () => {
  expect(speechCue([event], 15000, new Map())).toBeNull();
  expect(
    speechCue([{ ...event, title: "unknown" }], 5000, new Map()),
  ).toBeNull();
});

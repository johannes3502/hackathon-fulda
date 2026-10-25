import { describe, expect, it } from "vitest";
import { clipRange, upsertFeedback } from "./protocol";
import type { LiveFeedback } from "./contracts";

const feedback: LiveFeedback = {
  id: "f1",
  category: "Gestures",
  kind: "suggestion",
  startMs: 4000,
  endMs: 6000,
  title: "A gesture",
  detail: "Review this moment.",
  action: "Try again.",
};
describe("live feedback", () => {
  it("revises observations by ID and bounds replay context to recorded media", () => {
    const earlier = { ...feedback, id: "f0", startMs: 500, endMs: 2500 };
    const items = upsertFeedback([feedback], earlier);
    expect(items.map((f) => f.id)).toEqual(["f0", "f1"]);
    expect(
      upsertFeedback(items, { ...feedback, title: "Updated" }),
    ).toHaveLength(2);
    expect(clipRange(earlier, 7000)).toEqual({ start: 0, end: 4.5 });
    expect(clipRange(feedback, 6500)).toEqual({ start: 2, end: 6.5 });
  });
});

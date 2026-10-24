import { describe, expect, it } from "vitest";
import type { LiveFeedback } from "./contracts";
import { feedbackGraph } from "./feedback-graph";

const event = (
  id: string,
  kind: LiveFeedback["kind"],
  startMs: number,
  endMs: number,
): LiveFeedback => ({
  id,
  kind,
  startMs,
  endMs,
  category: "Gestures",
  title: id,
  detail: "Synthetic",
  action: "Replay",
});

describe("feedback graph", () => {
  it("keeps praise and adjustments separate without grading ordinary gestures", () => {
    const graph = feedbackGraph(
      [
        event("good", "positive", 1000, 2000),
        event("adjust", "attention", 3000, 4000),
        event("hand", "observation", 5000, 6000),
      ],
      8000,
    );
    expect(graph.moments.map((item) => item.direction)).toEqual([-1, 1, 0]);
    expect(graph.samples).toContainEqual({ tMs: 1000, balance: -1 });
    expect(graph.samples).toContainEqual({ tMs: 2000, balance: 0 });
    expect(graph.samples).toContainEqual({ tMs: 3000, balance: 1 });
    expect(graph.samples.at(-1)).toEqual({ tMs: 8000, balance: 0 });
  });
  it("counts overlapping feedback and balances simultaneous opposite directions", () => {
    const graph = feedbackGraph(
      [
        event("a", "attention", 1000, 4000),
        event("b", "suggestion", 2000, 3000),
        event("c", "positive", 2000, 3000),
      ],
      5000,
    );
    expect(graph.extent).toBe(1);
    expect(graph.samples).toContainEqual({ tMs: 2000, balance: 1 });
    const doubled = feedbackGraph(
      [
        event("a", "attention", 1000, 4000),
        event("b", "attention", 2000, 3000),
      ],
      5000,
    );
    expect(doubled.extent).toBe(2);
  });
  it("clamps recorded intervals, ignores malformed and question events and retains simultaneous moments", () => {
    const graph = feedbackGraph(
      [
        event("a", "positive", -20, 200),
        event("b", "positive", 0, 200),
        event("late", "attention", 3000, 4000),
        event("nan", "attention", NaN, 1000),
        event("reverse", "attention", 1000, 500),
        { ...event("q", "attention", 0, 200), category: "question" },
      ],
      1000,
    );
    expect(graph.moments.map((item) => item.feedback.id)).toEqual(["a", "b"]);
    expect(graph.moments[0].atMs).toBe(0);
    expect(feedbackGraph([], NaN)).toMatchObject({
      durationMs: 0,
      extent: 1,
      moments: [],
    });
    expect(
      feedbackGraph([event("instant", "attention", 0, 0)], 0).moments,
    ).toHaveLength(1);
  });
});

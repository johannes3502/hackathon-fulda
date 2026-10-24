import { describe, expect, it } from "vitest";
import type { LiveFeedback } from "./contracts";
import {
  feedbackGraph,
  feedbackLinePath,
  lineSamples,
  lineValueAt,
  playbackGradient,
} from "./feedback-graph";

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
  it("draws sharp straight segments through unique evidence knots without overshoot", () => {
    const knots = lineSamples([
      { tMs: 0, balance: 0 },
      { tMs: 1000, balance: 0 },
      { tMs: 1000, balance: -1 },
      { tMs: 2000, balance: 1 },
    ]);
    expect(knots).toHaveLength(3);
    const path = feedbackLinePath(knots, 2000, 1);
    expect(path).toBe("M0,120 L500,32 L1000,208");
    expect(path.match(/M/g)).toHaveLength(1);
    expect(path).not.toContain("C");
    expect(lineValueAt(knots, 1000)).toBe(-1);
    expect(lineValueAt(knots, 1500)).toBe(0);
    expect(lineValueAt(knots, 1250)).toBe(-0.5);
    expect(lineValueAt(knots, -1)).toBe(0);
    expect(lineValueAt(knots, 3000)).toBe(1);
    for (let t = 0; t <= 2000; t += 10)
      expect(Math.abs(lineValueAt(knots, t))).toBeLessThanOrEqual(1);
    expect(feedbackLinePath([], 0, 0)).toBe("");
  });
  it("colors playback like the graph, splitting at exact neutral crossings", () => {
    expect(
      playbackGradient(
        [
          { tMs: 0, balance: 0 },
          { tMs: 1000, balance: 0 },
          { tMs: 2000, balance: -1 },
          { tMs: 4000, balance: 3 },
          { tMs: 5000, balance: 0 },
        ],
        5000,
      ),
    ).toBe(
      "linear-gradient(to right, var(--muted) 0% 20%, var(--success) 20% 40%, var(--success) 40% 50%, var(--error) 50% 80%, var(--error) 80% 100%)",
    );
    expect(playbackGradient([], 1000)).toBe("var(--muted)");
    expect(playbackGradient([], 0)).toBe("var(--muted)");
    expect(playbackGradient([], NaN)).toBe("var(--muted)");
  });
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

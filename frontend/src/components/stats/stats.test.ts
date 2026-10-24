import { describe, expect, it } from "vitest";
import {
  DEMO_STATS,
  MONTHLY_STATS,
  metricValue,
  summarizeMonthlyProgress,
  summarizeStats,
} from "./stats";

describe("stats summary", () => {
  it("uses the equally weighted mean, rounded only after aggregation", () => {
    expect(summarizeStats(DEMO_STATS)).toBe(82);
    expect(
      summarizeStats({ gesture: 1, knowledge: 2, flow: 3, structure: 100 }),
    ).toBe(27);
  });
  it("accepts the inclusive limits", () => {
    expect(
      summarizeStats({ gesture: 1, knowledge: 1, flow: 1, structure: 1 }),
    ).toBe(1);
    expect(
      summarizeStats({
        gesture: 100,
        knowledge: 100,
        flow: 100,
        structure: 100,
      }),
    ).toBe(100);
  });
  it.each([0, -1, 101, NaN, Infinity, undefined])(
    "does not fabricate an overall score for invalid input %s",
    (value) => {
      expect(
        summarizeStats({ ...DEMO_STATS, gesture: value as number }),
      ).toBeNull();
    },
  );
  it("summarizes monthly progression across overall and individual criteria", () => {
    const overall = summarizeMonthlyProgress(MONTHLY_STATS, "overall");
    expect(overall.points).toHaveLength(6);
    expect(overall.startValue).toBe(64);
    expect(overall.previousValue).toBe(79);
    expect(overall.currentValue).toBe(82);
    expect(overall.totalDelta).toBe(18);
    expect(overall.monthDelta).toBe(3);
    expect(overall.totalSessions).toBe(40);
    expect(overall.totalMinutes).toBe(191);

    const flow = summarizeMonthlyProgress(MONTHLY_STATS, "flow");
    expect(flow.startValue).toBe(65);
    expect(flow.currentValue).toBe(84);
    expect(flow.totalDelta).toBe(19);
    expect(metricValue(DEMO_STATS, "knowledge")).toBe(88);
  });
});


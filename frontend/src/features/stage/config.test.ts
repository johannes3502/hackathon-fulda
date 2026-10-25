import { describe, expect, it } from "vitest";
import { STAGE_ANSWER_MS, stageAnalysisMode, stageModeEnabled } from "./config";
import { formatAnswerCountdown } from "./timing";

describe("stage configuration", () => {
  it("enables the stage by default and hides it only for an explicit zero", () => {
    expect(stageModeEnabled(undefined)).toBe(true);
    expect(stageModeEnabled("")).toBe(true);
    expect(stageModeEnabled("1")).toBe(true);
    expect(stageModeEnabled("false")).toBe(true);
    expect(stageModeEnabled("0")).toBe(false);
    expect(stageModeEnabled(" 0 ")).toBe(false);
  });

  it("defaults to local and requires an explicit live opt-in", () => {
    expect(stageAnalysisMode(undefined)).toBe("local");
    expect(stageAnalysisMode("live")).toBe("live");
    expect(stageAnalysisMode(" LIVE ")).toBe("live");
    expect(stageAnalysisMode("other")).toBe("local");
    expect(stageAnalysisMode("local")).toBe("local");
    expect(stageAnalysisMode(" LOCAL ")).toBe("local");
  });

  it("keeps the answer window at 90 seconds", () => {
    expect(STAGE_ANSWER_MS).toBe(90_000);
  });
});

describe("answer countdown", () => {
  it("formats the full 90-second window and clamps overruns", () => {
    expect(formatAnswerCountdown(90_000)).toBe("01:30");
    expect(formatAnswerCountdown(89_001)).toBe("01:30");
    expect(formatAnswerCountdown(65_000)).toBe("01:05");
    expect(formatAnswerCountdown(0)).toBe("00:00");
    expect(formatAnswerCountdown(-100)).toBe("00:00");
    expect(formatAnswerCountdown(Number.NaN)).toBe("00:00");
  });
});

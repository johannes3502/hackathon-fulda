import { describe, expect, it } from "vitest";
import { summarizeRecordings } from "./stats";

describe("recording overview", () => {
  it("starts empty without synthetic history or scores", () => {
    expect(summarizeRecordings([])).toEqual({
      sessions: 0,
      durationMs: 0,
      moments: 0,
      transcripts: 0,
    });
  });
  it("counts only supplied recordings and available transcripts", () => {
    const result = summarizeRecordings([
      { durationMs: 60000, feedback: [], words: [] },
      {
        durationMs: 30000,
        feedback: [],
        words: [{ word: "Hallo", start_ms: 0, end_ms: 500 }],
      },
    ]);
    expect(result).toEqual({
      sessions: 2,
      durationMs: 90000,
      moments: 0,
      transcripts: 1,
    });
  });
});

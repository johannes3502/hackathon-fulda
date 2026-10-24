import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  AdaptiveSpeechBaseline,
  type BaselineFrame,
  type SpeechReference,
} from "./speech-baseline";

const normal: BaselineFrame = {
  levelDb: -25,
  f0Hz: 200,
  active: true,
  peak: false,
  duration: 40,
};
function feed(
  tracker: AdaptiveSpeechBaseline,
  ms: number,
  changes: Partial<BaselineFrame> = {},
) {
  for (let i = 0; i < ms / 40; i++) tracker.observe({ ...normal, ...changes });
  return tracker.current;
}
function ready() {
  const tracker = new AdaptiveSpeechBaseline();
  feed(tracker, 3000);
  return tracker;
}

it("matches the backend on the same causal speech/noise/pause sequence", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../../../backend/tests/fixtures/adaptive-baseline.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    frameMs: number;
    segments: {
      durationMs: number;
      levelDb: number;
      f0Hz: number | null;
      active: boolean;
      peakEveryFrames: number;
      expected: SpeechReference | null;
    }[];
  };
  const tracker = new AdaptiveSpeechBaseline();
  for (const segment of fixture.segments) {
    for (let i = 0; i < segment.durationMs / fixture.frameMs; i++)
      tracker.observe({
        ...segment,
        duration: fixture.frameMs,
        peak: segment.peakEveryFrames > 0 && i % segment.peakEveryFrames === 0,
      });
    if (segment.expected === null) expect(tracker.current).toBeNull();
    else
      for (const key of ["level", "pitch", "rate"] as const)
        expect(tracker.current![key]).toBeCloseTo(segment.expected[key], 9);
  }
});

it("ignores silence, unpitched room noise and invalid pitches during calibration", () => {
  const tracker = new AdaptiveSpeechBaseline();
  for (const f0Hz of [null, NaN, Infinity, 0, -100, 1000]) {
    feed(tracker, 10000, { levelDb: -45, f0Hz });
    expect(tracker.current).toBeNull();
    expect(tracker.progress).toBe(0);
  }
  expect(feed(tracker, 3000)).toMatchObject({ level: -25, pitch: 200 });
});

it("uses voiced levels even when each block contains mostly quiet room noise", () => {
  const tracker = new AdaptiveSpeechBaseline();
  for (let second = 0; second < 10; second++) {
    feed(tracker, 680, { levelDb: -45, f0Hz: null });
    feed(tracker, 320);
  }
  expect(tracker.current?.level).toBe(-25);
});

it("rejects isolated spikes and bounds sustained reference changes", () => {
  const tracker = ready();
  tracker.observe({ ...normal, levelDb: 0 });
  feed(tracker, 960);
  expect(tracker.current?.level).toBe(-25);
  feed(tracker, 1000, { levelDb: 0 });
  expect(tracker.current!.level).toBeGreaterThan(-25);
  expect(tracker.current!.level).toBeLessThan(-24.7);
});

it("holds the reference through pauses and resumes without a wall-clock jump", () => {
  const tracker = ready();
  const before = tracker.current;
  feed(tracker, 60000, { active: false, levelDb: -100, f0Hz: null });
  feed(tracker, 60000, { levelDb: -45, f0Hz: null });
  expect(tracker.current).toBe(before);
  feed(tracker, 1000, { levelDb: -13 });
  expect(tracker.current!.level).toBeLessThan(-24.7);
});

it("discards incomplete audio at a gap, retaining only a completed calibration", () => {
  const tracker = new AdaptiveSpeechBaseline();
  feed(tracker, 2000);
  tracker.discardPending();
  expect(tracker.progress).toBe(0);
  feed(tracker, 3000);
  const before = tracker.current;
  feed(tracker, 400, { levelDb: 0 });
  tracker.discardPending();
  feed(tracker, 600);
  expect(tracker.current).toBe(before);
});

it("can learn rhythm later when calibration contained no envelope peaks", () => {
  const tracker = ready();
  expect(tracker.current?.rate).toBe(0);
  for (let i = 0; i < 25; i++)
    tracker.observe({ ...normal, peak: i % 5 === 0 });
  expect(tracker.current?.rate).toBe(5);
});

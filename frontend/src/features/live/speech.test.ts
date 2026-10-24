import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, it, vi } from "vitest";
import { DEFAULT_FEATURE_FLAGS } from "./feature-flags";
import {
  SpeechEvaluator,
  mergeSpeechFeedback,
  type SpeechState,
} from "./speech";

function feed(
  engine: SpeechEvaluator,
  start: number,
  end: number,
  levelDb = -25,
  f0Hz: number | null = 220,
) {
  let state!: SpeechState;
  for (let tMs = start; tMs <= end; tMs += 40)
    state = engine.update({ tMs, levelDb, f0Hz });
  return state;
}
function ready(flags = DEFAULT_FEATURE_FLAGS) {
  const engine = new SpeechEvaluator(flags, "take");
  expect(feed(engine, 0, 3000).phase).toBe("ready");
  return engine;
}
it("does not calibrate on silence or label initial silence as a pause", () => {
  const engine = new SpeechEvaluator();
  expect(feed(engine, 0, 10000, -100, null).calibrationProgress).toBe(0);
  expect(engine.events).toEqual([]);
});
it("confirms a live pause after two seconds, grows one marker and respects flags", () => {
  const e = ready();
  expect(feed(e, 3040, 4960, -100, null).events).toEqual([]);
  const state = feed(e, 5000, 6040, -100, null);
  expect(state.cue?.category).toBe("pause");
  expect(state.events).toHaveLength(1);
  expect(state.events[0]).toMatchObject({
    startMs: 3000,
    endMs: 6040,
    category: "pause",
  });
  const off = ready({ ...DEFAULT_FEATURE_FLAGS, pauseFeedback: false });
  expect(feed(off, 3040, 8000, -100, null).events).toEqual([]);
});
it("does not bridge a microphone gap or advance dwell with duplicate measurements", () => {
  const e = ready();
  feed(e, 3040, 4400, -100, null);
  for (let i = 0; i < 100; i++)
    e.update({ tMs: 4400, levelDb: -100, f0Hz: null });
  expect(feed(e, 5200, 8000, -100, null).events).toEqual([]);
});
it("detects sustained volume changes relative to normal speech and keeps one episode", () => {
  const e = ready();
  expect(feed(e, 3040, 4920, -13).events).toEqual([]);
  expect(
    feed(e, 4960, 9000, -13).events.filter((e) => e.category === "volume"),
  ).toHaveLength(1);
  const off = ready({ ...DEFAULT_FEATURE_FLAGS, speechFeedback: false });
  expect(feed(off, 3040, 9000, -13).events).toEqual([]);
});
it("requires voiced pitch and enough evidence for a pitch-variation observation", () => {
  const e = ready();
  expect(feed(e, 3040, 6800, -25, null).events).toEqual([]);
  expect(
    feed(e, 6840, 11000, -25, 220).events.some((e) => e.category === "pitch"),
  ).toBe(true);
  const noPitch = ready({ ...DEFAULT_FEATURE_FLAGS, pitchFeedback: false });
  expect(feed(noPitch, 3040, 9000).events).toEqual([]);
});
it("keeps live markers on backend failure but deduplicates overlapping full-recording observations", () => {
  const live = feed(ready(), 3040, 6040, -100, null).events;
  expect(mergeSpeechFeedback([], live)).toEqual(live);
  const analyzed = [{ ...live[0], id: "speech-0" }];
  expect(mergeSpeechFeedback(analyzed, live)).toEqual(analyzed);
});
it.each([16000, 48000])(
  "runs the actual worklet on synthetic 220 Hz audio at %i Hz without microphone monitoring",
  (sampleRate) => {
    let Processor!: new () => { process(inputs: Float32Array[][]): boolean };
    const sent: { tMs: number; levelDb: number; f0Hz: number | null }[] = [];
    const scope = {
      sampleRate,
      currentFrame: 0,
      AudioWorkletProcessor: class {
        port = {
          postMessage: (value: (typeof sent)[number]) => sent.push(value),
        };
      },
      registerProcessor: (_name: string, type: typeof Processor) =>
        (Processor = type),
    };
    vm.runInNewContext(
      readFileSync(
        new URL("../../../public/audio/feedback-worklet.js", import.meta.url),
        "utf8",
      ),
      scope,
    );
    const node = new Processor();
    for (let block = 0; block < Math.ceil((sampleRate * 0.3) / 128); block++) {
      scope.currentFrame = block * 128;
      const samples = Float32Array.from(
        { length: 128 },
        (_, i) =>
          0.1 * Math.sin((2 * Math.PI * 220 * (block * 128 + i)) / sampleRate),
      );
      expect(node.process([[samples]])).toBe(true);
    }
    expect(sent.length).toBeGreaterThan(4);
    expect(sent[0].tMs).toBeCloseTo(40, 1);
    expect(
      sent.every(
        (f) => Math.abs(f.levelDb + 23) < 1 && Math.abs(f.f0Hz! - 220) < 3,
      ),
    ).toBe(true);
    const silentScope = { ...scope, currentFrame: 0 };
    vm.runInNewContext(
      readFileSync(
        new URL("../../../public/audio/feedback-worklet.js", import.meta.url),
        "utf8",
      ),
      silentScope,
    );
    const silent = new Processor();
    sent.length = 0;
    for (let i = 0; i < Math.ceil((sampleRate * 0.1) / 128); i++) {
      silentScope.currentFrame = i * 128;
      silent.process([[new Float32Array(128)]]);
    }
    expect(sent.every((f) => f.levelDb === -100 && f.f0Hz === null)).toBe(true);
  },
);

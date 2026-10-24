import { afterEach, expect, it, vi } from "vitest";
import { PoseCapture } from "./capture";
import { syntheticPoints } from "./fixtures";
class FakeWorker {
  static latest: FakeWorker;
  onmessage?: (e: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.latest = this;
  }
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("forwards selected model/mode and exports the actual delegate per recording frame", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const video = { paused: false, ended: false, readyState: 0, srcObject: { getVideoTracks: () => [{ readyState: "live" }] } } as unknown as HTMLVideoElement;
  const options = { model: "heavy", runningMode: "IMAGE", devMode: false } as const;
  const capture = new PoseCapture(video, vi.fn(), options);
  capture.start();
  const worker = FakeWorker.latest;
  expect(worker.postMessage).toHaveBeenCalledWith({ type: "init", options });
  const backend = { pose: "GPU", hand: null, model: "heavy", runningMode: "IMAGE" };
  worker.onmessage?.({ data: { type: "ready", backend, hands: false } });
  capture.beginRecording(1000, "take-config");
  const message = { type: "sample", width: 640, height: 360, points: syntheticPoints("neutral"), hands: null };
  worker.onmessage?.({ data: { ...message, timestamp: 1100 } });
  worker.onmessage?.({ data: { type: "backend", backend: { ...backend, pose: "CPU", runtimeFallback: true } } });
  worker.onmessage?.({ data: { ...message, timestamp: 1200 } });
  const samples = (await capture.log.blob()!.text()).trim().split("\n").map(line => JSON.parse(line));
  expect(samples.map(s => s.t_ms)).toEqual([100, 200]);
  expect(samples.map(s => s.runtime)).toEqual([
    { model: "heavy", runningMode: "IMAGE", delegate: "GPU" },
    { model: "heavy", runningMode: "IMAGE", delegate: "CPU" },
  ]);
  capture.dispose();
});
it("keeps landmarks live when the bounded log is full and clears a lost pose", () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const update = vi.fn();
  const capture = new PoseCapture({} as HTMLVideoElement, update);
  vi.spyOn(capture.log, "full", "get").mockReturnValue(true);
  capture.start();
  const worker = FakeWorker.latest;
  const sample = {
    type: "sample",
    width: 640,
    height: 360,
    timestamp: 1000,
    points: Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.99,
    })),
  };
  worker.onmessage?.({ data: sample });
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({ phase: "running", latest: expect.any(Object) }),
  );
  expect(capture.log.count).toBe(0);
  expect(worker.terminate).not.toHaveBeenCalled();
  worker.onmessage?.({ data: { ...sample, points: [] } });
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({ phase: "running", latest: null }),
  );
  capture.dispose();
});
it("terminates loading and ignores late worker results", () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const update = vi.fn();
  const capture = new PoseCapture({} as HTMLVideoElement, update);
  capture.start();
  const worker = FakeWorker.latest;
  capture.dispose();
  worker.onmessage?.({ data: { type: "ready" } });
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(update).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("reports a bounded initialization failure and releases the worker", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const update = vi.fn();
  const capture = new PoseCapture({} as HTMLVideoElement, update);
  capture.start();
  await vi.advanceTimersByTimeAsync(30000);
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({ phase: "error" }),
  );
});
it("resumes a browser-paused preview so a live camera does not silently stop sampling", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const play = vi.fn(async () => {});
  const video = {
    paused: true,
    ended: false,
    play,
    srcObject: { getVideoTracks: () => [{ readyState: "live" }] },
  } as unknown as HTMLVideoElement;
  const capture = new PoseCapture(video, vi.fn());
  capture.start();
  FakeWorker.latest.onmessage?.({ data: { type: "ready" } });
  expect(play).toHaveBeenCalledOnce();
  await Promise.resolve();
  capture.dispose();
});

it("ignores in-flight preview results after the recorder anchor, even with a full log", () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const update = vi.fn();
  const capture = new PoseCapture({} as HTMLVideoElement, update);
  capture.start();
  capture.beginRecording(1000, "take-2");
  vi.spyOn(capture.log, "full", "get").mockReturnValue(true);
  FakeWorker.latest.onmessage?.({
    data: {
      type: "sample",
      width: 640,
      height: 360,
      timestamp: 999,
      points: [],
    },
  });
  expect(update).toHaveBeenCalledTimes(1);
  expect(capture.events).toEqual([]);
  capture.dispose();
});

it("fails a stalled inference, clears current landmarks and releases its frame watchdog", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ close: vi.fn() })),
  );
  const update = vi.fn();
  const video = {
    paused: false,
    ended: false,
    readyState: 2,
    currentTime: 1,
    srcObject: { getVideoTracks: () => [{ readyState: "live" }] },
  } as unknown as HTMLVideoElement;
  const capture = new PoseCapture(video, update);
  capture.start();
  FakeWorker.latest.onmessage?.({ data: { type: "ready" } });
  await vi.advanceTimersByTimeAsync(5000);
  expect(update).toHaveBeenLastCalledWith(
    expect.objectContaining({
      phase: "error",
      latest: null,
      message: expect.stringContaining("stalled"),
    }),
  );
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

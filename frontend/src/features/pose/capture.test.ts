import { afterEach, expect, it, vi } from "vitest";
import { PoseCapture } from "./capture";
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

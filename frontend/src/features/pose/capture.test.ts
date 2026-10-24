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
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

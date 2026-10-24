import { afterEach, expect, it, vi } from "vitest";
import { LiveRecorder } from "./recorder";
import type { LiveRecording, VideoTransport } from "./contracts";

class Recorder {
  static isTypeSupported = () => true;
  state = "inactive";
  mimeType = "video/webm";
  onstart?: () => void;
  onstop?: () => void;
  ondataavailable?: (event: { data: Blob }) => void;
  start() {
    this.state = "recording";
    this.onstart?.();
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["captured video"]) });
    this.onstop?.();
  }
}
function setup(transport: VideoTransport) {
  vi.useFakeTimers();
  vi.stubGlobal("MediaRecorder", Recorder);
  const stopTrack = vi.fn();
  const track = Object.assign(new EventTarget(), {
    readyState: "live",
    stop: stopTrack,
  });
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  const complete = vi.fn<(recording: LiveRecording) => void>();
  const recorder = new LiveRecorder(
    stream,
    { title: "Practice", targetMs: 60000, mode: "demo", endpoint: "" },
    transport,
    vi.fn(),
    complete,
  );
  return { recorder, complete, stopTrack };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("automatically stops at the recording limit and finalizes captured media", async () => {
  const transport = {
    connect: vi.fn(async () => {}),
    send: vi.fn(async () => {}),
    finish: vi.fn(async () => {}),
    close: vi.fn(),
  };
  const { recorder, complete, stopTrack } = setup(transport);
  await recorder.start();
  await vi.advanceTimersByTimeAsync(60000);
  expect(stopTrack).toHaveBeenCalled();
  expect(transport.send).toHaveBeenCalledWith(
    expect.any(Blob),
    expect.objectContaining({ startMs: 0, endMs: 60000, seq: 1 }),
  );
  expect(transport.finish).toHaveBeenCalledWith(60000);
  expect(complete).toHaveBeenCalledOnce();
  const recording = complete.mock.calls[0][0];
  expect(recording.durationMs).toBe(60000);
  expect(await recording.video.text()).toBe("captured video");
  expect(recording.completion).toBe("complete");
  URL.revokeObjectURL(recording.videoUrl);
  recorder.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("a late backend acknowledgement cannot start recording after disposal", async () => {
  let acknowledge!: () => void;
  const transport = {
    connect: () =>
      new Promise<void>((resolve) => {
        acknowledge = resolve;
      }),
    send: vi.fn(async () => {}),
    finish: vi.fn(async () => {}),
    close: vi.fn(),
  };
  const { recorder, complete, stopTrack } = setup(transport);
  const start = expect(recorder.start()).rejects.toThrow("cancelled");
  recorder.dispose();
  acknowledge();
  await start;
  await vi.advanceTimersByTimeAsync(60000);
  expect(stopTrack).toHaveBeenCalled();
  expect(transport.send).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

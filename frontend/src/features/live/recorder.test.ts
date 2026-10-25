import { afterEach, expect, it, vi } from "vitest";
import { LiveRecorder } from "./recorder";
import type { LiveConfig, LiveRecording, VideoTransport } from "./contracts";

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
function setup(
  transport: VideoTransport,
  mode: LiveConfig["mode"] = "local",
  onStart?: (timestamp: number) => void,
  options: {
    audio?: boolean;
    config?: Partial<LiveConfig>;
    onCaptured?: (recording: LiveRecording) => void;
  } = {},
) {
  vi.useFakeTimers();
  vi.stubGlobal("MediaRecorder", Recorder);
  const stopTrack = vi.fn();
  const track = Object.assign(new EventTarget(), {
    readyState: "live",
    stop: stopTrack,
  });
  const audioTrack = options.audio
    ? Object.assign(new EventTarget(), {
        readyState: "live",
        stop: stopTrack,
      })
    : undefined;
  const stream = {
    getVideoTracks: () => [track],
    getAudioTracks: () => (audioTrack ? [audioTrack] : []),
    getTracks: () => (audioTrack ? [track, audioTrack] : [track]),
  } as unknown as MediaStream;
  const complete = vi.fn<(recording: LiveRecording) => void>();
  const recorder = new LiveRecorder(
    stream,
    {
      title: "Practice",
      targetMs: 60000,
      mode,
      endpoint: "",
      ...options.config,
    },
    transport,
    vi.fn(),
    complete,
    onStart,
    options.onCaptured,
  );
  return { recorder, complete, stopTrack, track, audioTrack };
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
  expect(transport.finish).toHaveBeenCalledWith(60000, expect.any(Blob));
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
it("preserves captured media when post-recording analysis fails", async () => {
  const { recorder, complete } = setup({
    connect: async () => {},
    send: async () => {},
    finish: async () => {
      throw new Error("Analysis unavailable");
    },
    close: () => {},
  });
  await recorder.start();
  await vi.advanceTimersByTimeAsync(60000);
  const recording = complete.mock.calls[0][0];
  expect(await recording.video.text()).toBe("captured video");
  expect(recording.notice).toBe("Analysis unavailable");
  URL.revokeObjectURL(recording.videoUrl);
});

it("requires a microphone for backend analysis before contacting the API", async () => {
  const transport = {
    connect: vi.fn(async () => {}),
    send: async () => {},
    finish: async () => {},
    close: () => {},
  };
  const { recorder } = setup(transport, "backend");
  await expect(recorder.start()).rejects.toThrow("microphone");
  expect(transport.connect).not.toHaveBeenCalled();
  recorder.dispose();
});

it("anchors pose capture on the actual recorder start, after connection completes", async () => {
  let connect!: () => void;
  const onStart = vi.fn();
  const transport = {
    connect: () =>
      new Promise<void>((resolve) => {
        connect = resolve;
      }),
    send: async () => {},
    finish: async () => {},
    close: () => {},
  };
  const { recorder } = setup(transport, "local", onStart);
  const starting = recorder.start();
  await vi.advanceTimersByTimeAsync(5000);
  expect(onStart).not.toHaveBeenCalled();
  connect();
  await starting;
  expect(onStart).toHaveBeenCalledExactlyOnceWith(5000);
  recorder.dispose();
});

it("captures media before a stalled analysis and completes with it at the deadline", async () => {
  const captured = vi.fn();
  const transport = {
    connect: async () => {},
    send: async () => {},
    finish: () => new Promise<void>(() => {}),
    close: vi.fn(),
  };
  const { recorder, complete } = setup(transport, "backend", undefined, {
    audio: true,
    config: { stage: true, analysisTimeoutMs: 90000 },
    onCaptured: captured,
  });
  await recorder.start();
  await vi.advanceTimersByTimeAsync(1000);
  recorder.stop();
  await vi.advanceTimersByTimeAsync(0);
  expect(captured).toHaveBeenCalledOnce();
  expect(complete).not.toHaveBeenCalled();
  expect(await captured.mock.calls[0][0].video.text()).toBe("captured video");
  await vi.advanceTimersByTimeAsync(90000);
  expect(complete).toHaveBeenCalledOnce();
  const recording = complete.mock.calls[0][0];
  expect(recording.videoUrl).toBe(captured.mock.calls[0][0].videoUrl);
  expect(recording.durationMs).toBe(1000);
  expect(recording.notice).toContain("taking too long");
  expect(recording.analysisUploaded).not.toBe(true);
  expect(transport.close).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  URL.revokeObjectURL(recording.videoUrl);
});

it("opening an early review cancels the deadline without revoking its captured video", async () => {
  const captured = vi.fn();
  const { recorder, complete } = setup(
    {
      connect: async () => {},
      send: async () => {},
      finish: () => new Promise<void>(() => {}),
      close: vi.fn(),
    },
    "backend",
    undefined,
    {
      audio: true,
      config: { analysisTimeoutMs: 90000 },
      onCaptured: captured,
    },
  );
  await recorder.start();
  recorder.stop();
  await vi.advanceTimersByTimeAsync(0);
  const { videoUrl } = captured.mock.calls[0][0];
  recorder.dispose();
  await vi.advanceTimersByTimeAsync(0);
  expect(vi.getTimerCount()).toBe(0);
  expect(complete).not.toHaveBeenCalled();
  expect(await (await fetch(videoUrl)).text()).toBe("captured video");
  URL.revokeObjectURL(videoUrl);
});

it("preserves video when the microphone ends during a recording", async () => {
  const { recorder, complete, audioTrack } = setup(
    {
      connect: async () => {},
      send: async () => {},
      finish: async () => {},
      close: () => {},
    },
    "local",
    undefined,
    { audio: true },
  );
  await recorder.start();
  audioTrack!.dispatchEvent(new Event("ended"));
  await vi.advanceTimersByTimeAsync(0);
  expect(complete).toHaveBeenCalledOnce();
  expect(complete.mock.calls[0][0].completion).toBe("interrupted");
  expect(complete.mock.calls[0][0].notice).toContain(
    "Microphone capture ended",
  );
  expect(await complete.mock.calls[0][0].video.text()).toBe("captured video");
  URL.revokeObjectURL(complete.mock.calls[0][0].videoUrl);
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { LiveCaptions } from "./captions";

class Socket {
  static OPEN = 1;
  static latest: Socket;
  readyState = 1;
  bufferedAmount = 0;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  onclose?: () => void;
  send = vi.fn();
  close = vi.fn();
  constructor(public url: string) {
    Socket.latest = this;
  }
  receive(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}
const disconnect = vi.fn();
const closeAudio = vi.fn().mockResolvedValue(undefined);
const connect = vi.fn();
let port: { onmessage: ((event: { data: ArrayBuffer }) => void) | null };
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal(
    "AudioContext",
    class {
      sampleRate = 16000;
      state = "running";
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      close = closeAudio;
      audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
      createMediaStreamSource = vi.fn(() => ({ connect, disconnect }));
    },
  );
  vi.stubGlobal(
    "AudioWorkletNode",
    class {
      port = (port = { onmessage: null });
      connect = connect;
      disconnect = disconnect;
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("streams PCM only after ready, replaces cumulative text and releases audio without stopping camera tracks", async () => {
  const update = vi.fn(),
    stopTrack = vi.fn();
  const captions = new LiveCaptions(update);
  await captions.start(
    { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream,
    "https://coach.example/api",
  );
  const socket = Socket.latest;
  expect(String(socket.url)).toBe("wss://coach.example/api/speech/live");
  socket.onopen?.();
  expect(socket.send).toHaveBeenCalledWith(
    '{"type":"start","sample_rate":16000}',
  );
  expect(connect).not.toHaveBeenCalled();
  socket.receive({ type: "ready", sample_rate: 16000 });
  const pcm = new ArrayBuffer(3200);
  port.onmessage?.({ data: pcm });
  expect(socket.send).toHaveBeenLastCalledWith(pcm);
  socket.receive({ type: "text", text: "Hello", final: false });
  socket.receive({ type: "text", text: "Hello world", final: false });
  expect(update).toHaveBeenLastCalledWith(
    "Hello world",
    "Live captions · preview",
  );
  captions.stop();
  captions.stop();
  expect(socket.send).toHaveBeenLastCalledWith('{"type":"stop"}');
  expect(closeAudio).toHaveBeenCalledTimes(1);
  expect(stopTrack).not.toHaveBeenCalled();
});

it.each(["timeout", "capacity", "invalid", "backpressure"])(
  "degrades safely on %s without an unbounded audio queue",
  async (failure) => {
    const update = vi.fn(),
      captions = new LiveCaptions(update);
    await captions.start({} as MediaStream, "http://localhost/api");
    const socket = Socket.latest;
    if (failure === "timeout") await vi.advanceTimersByTimeAsync(20000);
    if (failure === "capacity") socket.onclose?.();
    if (failure === "invalid") socket.receive({ type: "text", text: 9 });
    if (failure === "backpressure") {
      socket.receive({ type: "ready", sample_rate: 16000 });
      socket.bufferedAmount = 320001;
      port.onmessage?.({ data: new ArrayBuffer(3200) });
    }
    expect(update).toHaveBeenLastCalledWith(
      "",
      expect.stringContaining("Recording continues"),
    );
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(closeAudio).toHaveBeenCalledTimes(1);
  },
);

it("does not open a socket if stopped while the worklet loads", async () => {
  const captions = new LiveCaptions(vi.fn());
  const previous = Socket.latest;
  const starting = captions.start({} as MediaStream, "http://localhost/api");
  captions.stop();
  await starting;
  expect(Socket.latest).toBe(previous);
  expect(closeAudio).toHaveBeenCalledTimes(1);
});

it("streams signal feedback without captions and aligns events to recording start", async () => {
  const update = vi.fn(),
    feedback = vi.fn();
  const preview = new LiveCaptions(update, feedback);
  const start = performance.now();
  await preview.start({} as MediaStream, "http://localhost/api", start);
  const socket = Socket.latest;
  expect(String(socket.url)).toBe("ws://localhost/api/speech/feedback");
  await vi.advanceTimersByTimeAsync(250);
  socket.receive({ type: "ready", sample_rate: 16000 });
  for (let i = 0; i < 50; i++)
    port.onmessage?.({ data: new ArrayBuffer(3200) });
  socket.receive({
    type: "feedback",
    position_ms: 5000,
    events: [
      {
        type: "volume",
        t_ms: 3000,
        duration_ms: 2000,
        source: "speech",
        severity: "hint",
        payload: { direction: "quiet" },
      },
    ],
  });
  expect(feedback).toHaveBeenCalledWith([
    expect.objectContaining({ startMs: 3250, endMs: 5250 }),
  ]);
  expect(update).toHaveBeenLastCalledWith(
    "",
    expect.stringContaining("heuristic"),
  );
  preview.stop();
});

it("stops signal preview when the server accepts audio but stops analysing it", async () => {
  const update = vi.fn();
  const preview = new LiveCaptions(update, vi.fn());
  await preview.start({} as MediaStream, "http://localhost/api");
  Socket.latest.receive({ type: "ready", sample_rate: 16000 });
  for (let i = 0; i < 151; i++)
    port.onmessage?.({ data: new ArrayBuffer(3200) });
  expect(update).toHaveBeenLastCalledWith(
    "",
    expect.stringContaining("behind"),
  );
  expect(Socket.latest.close).toHaveBeenCalledOnce();
});

it("rejects feedback claiming audio that was never sent", async () => {
  const feedback = vi.fn();
  const preview = new LiveCaptions(vi.fn(), feedback);
  await preview.start({} as MediaStream, "http://localhost/api");
  Socket.latest.receive({ type: "feedback", position_ms: 5000, events: [] });
  expect(feedback).not.toHaveBeenCalled();
  expect(Socket.latest.close).toHaveBeenCalledOnce();
});

it("worklet packs clipped little-endian PCM into 100 ms frames across render blocks", () => {
  const postMessage = vi.fn();
  let Processor: new () => { process: (inputs: Float32Array[][]) => boolean };
  runInNewContext(readFileSync("public/audio/pcm-worklet.js", "utf8"), {
    AudioWorkletProcessor: class {
      port = { postMessage };
    },
    registerProcessor: (_: string, value: typeof Processor) => {
      Processor = value;
    },
  });
  const processor = new Processor!();
  processor.process([[new Float32Array(1599).fill(-2)]]);
  expect(postMessage).not.toHaveBeenCalled();
  processor.process([[new Float32Array([2])]]);
  const pcm = new DataView(postMessage.mock.calls[0][0]);
  expect(pcm.byteLength).toBe(3200);
  expect(pcm.getInt16(0, true)).toBe(-32768);
  expect(pcm.getInt16(3198, true)).toBe(32767);
});

it("preconnects Deepgram before recording and waits for the final words after flushing the audio tail", async () => {
  const captions = new LiveCaptions(vi.fn(), undefined, true);
  await captions.start(
    {} as MediaStream,
    "https://coach.example/api",
    performance.now(),
    true,
  );
  const socket = Socket.latest;
  socket.onopen?.();
  expect(JSON.parse(socket.send.mock.calls[0][0]).provider).toBe("deepgram");
  socket.receive({ type: "ready", sample_rate: 16000, provider: "deepgram" });
  expect(await captions.ready()).toBe(true);
  // Only processor -> destination is connected; microphone starts at recorder.onstart.
  expect(connect).toHaveBeenCalledTimes(1);
  captions.beginRecording();
  expect(connect).toHaveBeenCalledTimes(2);
  const sendControl = vi.fn();
  (port as typeof port & { postMessage: typeof sendControl }).postMessage =
    sendControl;
  port.onmessage?.({ data: new ArrayBuffer(3200) });
  const finishing = captions.finish(200);
  expect(sendControl).toHaveBeenCalledWith({ type: "flush" });
  expect(socket.close).not.toHaveBeenCalled();
  const tail = new ArrayBuffer(1600);
  port.onmessage?.({ data: tail });
  (port.onmessage as (event: { data: unknown }) => void)({
    data: { type: "flushed" },
  });
  expect(socket.send.mock.calls.slice(-2).map(([raw]) => raw)).toEqual([
    tail,
    '{"type":"stop"}',
  ]);
  expect(socket.close).not.toHaveBeenCalled();
  socket.receive({
    type: "words",
    final: true,
    words: [{ word: "Hallo.", start_ms: 0, end_ms: 150 }],
  });
  socket.receive({ type: "done" });
  expect(await finishing).toMatchObject({
    provider: "deepgram",
    words: [{ word: "Hallo.", start_ms: 0, end_ms: 150 }],
  });
  expect(socket.close).toHaveBeenCalledOnce();
});

it.each(["disconnect", "timeout", "early_done", "missing_words"])(
  "falls back instead of reusing an incomplete live transcript: %s",
  async (failure) => {
    const captions = new LiveCaptions(vi.fn(), undefined, true);
    await captions.start(
      {} as MediaStream,
      "http://localhost/api",
      performance.now(),
      true,
    );
    const socket = Socket.latest;
    socket.receive({ type: "ready", sample_rate: 16000, provider: "deepgram" });
    captions.beginRecording();
    if (failure === "early_done") socket.receive({ type: "done" });
    (port as typeof port & { postMessage: () => void }).postMessage = vi.fn();
    const finishing = captions.finish(1000);
    if (failure === "disconnect") socket.onclose?.();
    if (failure === "timeout") await vi.advanceTimersByTimeAsync(12000);
    if (failure === "missing_words") socket.receive({ type: "done" });
    expect(await finishing).toBeNull();
  },
);

it("worklet flushes a short final PCM frame before acknowledging stop", () => {
  const postMessage = vi.fn();
  let Processor: new () => {
    port: { onmessage: (event: { data: { type: string } }) => void };
    process: (inputs: Float32Array[][]) => boolean;
  };
  runInNewContext(readFileSync("public/audio/pcm-worklet.js", "utf8"), {
    AudioWorkletProcessor: class {
      port = { postMessage, onmessage: null };
    },
    registerProcessor: (_: string, value: typeof Processor) => {
      Processor = value;
    },
  });
  const processor = new Processor!();
  processor.process([[new Float32Array(37).fill(0.5)]]);
  processor.port.onmessage({ data: { type: "flush" } });
  expect(postMessage.mock.calls[0][0].byteLength).toBe(74);
  expect(postMessage.mock.calls[1][0]).toEqual({ type: "flushed" });
  processor.port.onmessage({ data: { type: "flush" } });
  expect(postMessage.mock.calls).toHaveLength(3); // No duplicated tail.
});

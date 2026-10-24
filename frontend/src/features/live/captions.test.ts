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

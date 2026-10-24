import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clipRange,
  parseLiveMessage,
  upsertFeedback,
  validateEndpoint,
} from "./protocol";
import { DemoVideoTransport, WebSocketVideoTransport } from "./transport";
import type { LiveFeedback, LiveMessage } from "./contracts";

const feedback: LiveFeedback = {
  id: "f1",
  category: "Gestures",
  kind: "suggestion",
  startMs: 4000,
  endMs: 6000,
  title: "A gesture",
  detail: "Review this moment.",
  action: "Try again.",
};
const session = { sessionId: "s1", title: "Practice", mimeType: "video/webm" };
const meta = {
  type: "video.chunk" as const,
  sessionId: "s1",
  seq: 1,
  startMs: 0,
  endMs: 6000,
  byteLength: 3,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("live protocol", () => {
  it("accepts secure endpoints and rejects credentials, mixed content and other schemes", () => {
    expect(validateEndpoint("ws://localhost:8000/live", false)).toBe(
      "ws://localhost:8000/live",
    );
    expect(validateEndpoint("wss://example.com/live", true)).toBe(
      "wss://example.com/live",
    );
    for (const url of [
      "bad",
      "https://example.com",
      "ws://user:pass@example.com",
      "ws://example.com/#x",
    ])
      expect(() => validateEndpoint(url, false)).toThrow();
    expect(() => validateEndpoint("ws://localhost/live", true)).toThrow(
      "secure",
    );
  });
  it("rejects invalid, cross-session and future observations at the network boundary", () => {
    const message = { type: "feedback", sessionId: "s1", feedback };
    expect(parseLiveMessage(JSON.stringify(message), "s1", 6000)).toEqual(
      message,
    );
    for (const value of [
      "{",
      "[]",
      JSON.stringify({ ...message, sessionId: "other" }),
      JSON.stringify({ ...message, feedback: { ...feedback, startMs: 7000 } }),
      JSON.stringify({ ...message, feedback: { ...feedback, title: "" } }),
      "x".repeat(64001),
    ])
      expect(parseLiveMessage(value, "s1", 6000)).toBeNull();
    expect(parseLiveMessage(JSON.stringify(message), "s1", 5999)).toBeNull();
    expect(
      parseLiveMessage(
        JSON.stringify({
          type: "metrics",
          sessionId: "s1",
          atMs: 1000,
          metrics: [{ id: "x", label: "Visibility", value: null }],
        }),
        "s1",
        6000,
      )?.type,
    ).toBe("metrics");
    expect(
      parseLiveMessage(
        JSON.stringify({
          type: "metrics",
          sessionId: "s1",
          atMs: 1000,
          metrics: [{ id: "x", label: "Visibility", value: {} }],
        }),
        "s1",
        6000,
      ),
    ).toBeNull();
  });
  it("revises observations by ID and bounds replay context to recorded media", () => {
    const earlier = { ...feedback, id: "f0", startMs: 500, endMs: 2500 };
    const items = upsertFeedback([feedback], earlier);
    expect(items.map((f) => f.id)).toEqual(["f0", "f1"]);
    expect(
      upsertFeedback(items, { ...feedback, title: "Updated" }),
    ).toHaveLength(2);
    expect(clipRange(earlier, 7000)).toEqual({ start: 0, end: 4.5 });
    expect(clipRange(feedback, 6500)).toEqual({ start: 2, end: 6.5 });
  });
  it("emits each scripted marker once, on the real chunk timeline", async () => {
    const transport = new DemoVideoTransport();
    const receive = vi.fn();
    await transport.connect(session, receive);
    await transport.send(new Blob(), { ...meta, endMs: 2400 });
    expect(receive).not.toHaveBeenCalled();
    await transport.send(new Blob(), meta);
    await transport.send(new Blob(), meta);
    expect(receive).toHaveBeenCalledTimes(2);
    expect(receive.mock.calls[1][0].feedback.endMs).toBe(6000);
    transport.close();
    await transport.send(new Blob(), { ...meta, endMs: 11000 });
    expect(receive).toHaveBeenCalledTimes(2);
  });
});

class Socket {
  static OPEN = 1;
  static latest: Socket;
  readyState = 1;
  bufferedAmount = 0;
  sent: (string | ArrayBuffer)[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  constructor() {
    Socket.latest = this;
  }
  send(value: string | ArrayBuffer) {
    this.sent.push(value);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  message(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}
async function connected() {
  vi.stubGlobal("WebSocket", Socket);
  const receive = vi.fn<(message: LiveMessage) => void>();
  const transport = new WebSocketVideoTransport("ws://localhost/live");
  const ready = transport.connect(session, receive);
  const socket = Socket.latest;
  socket.onopen?.();
  socket.message({ type: "session.ready", sessionId: "s1" });
  await ready;
  return { transport, receive, socket };
}
describe("WebSocket video transport", () => {
  it("handshakes, sends metadata then binary bytes, receives bounded feedback and completes", async () => {
    const { transport, socket, receive } = await connected();
    expect(JSON.parse(socket.sent[0] as string)).toMatchObject({
      type: "session.start",
      audio: false,
      version: 1,
    });
    await transport.send(new Blob(["abc"]), meta);
    expect(JSON.parse(socket.sent[1] as string)).toEqual(meta);
    expect(new TextDecoder().decode(socket.sent[2] as ArrayBuffer)).toBe("abc");
    socket.message({ type: "feedback", sessionId: "s1", feedback });
    expect(receive).toHaveBeenLastCalledWith({
      type: "feedback",
      sessionId: "s1",
      feedback,
    });
    const done = transport.finish(6200);
    socket.message({ type: "session.complete", sessionId: "s1" });
    await done;
    transport.close();
    expect(receive.mock.calls.some(([m]) => m.type === "error")).toBe(false);
  });
  it("stops on backpressure instead of dropping encoded chunks", async () => {
    const { transport, socket } = await connected();
    socket.bufferedAmount = 4 * 1024 * 1024;
    await expect(transport.send(new Blob(["abc"]), meta)).rejects.toThrow(
      "too slowly",
    );
    expect(socket.sent).toHaveLength(1);
    transport.close();
  });
  it("surfaces disconnects and bounds the wait for final feedback", async () => {
    vi.useFakeTimers();
    const { transport, socket, receive } = await connected();
    const done = expect(transport.finish(6200)).rejects.toThrow(
      "did not finish",
    );
    await vi.advanceTimersByTimeAsync(10000);
    await done;
    socket.close();
    expect(receive).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "error" }),
    );
    transport.close();
  });
  it("cancels an unacknowledged connection and clears its timer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", Socket);
    const transport = new WebSocketVideoTransport("ws://localhost/live");
    const ready = expect(transport.connect(session, vi.fn())).rejects.toThrow(
      "cancelled",
    );
    transport.close();
    await ready;
    expect(vi.getTimerCount()).toBe(0);
  });
});

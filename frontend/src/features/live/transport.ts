import type {
  LiveConfig,
  LiveMessage,
  VideoChunkMeta,
  VideoTransport,
} from "./contracts";
import { parseLiveMessage } from "./protocol";

export class WebSocketVideoTransport implements VideoTransport {
  private socket: WebSocket | null = null;
  private sessionId = "";
  private lastSentMs = 0;
  private closed = false;
  private ready = false;
  private rejectConnect?: (error: Error) => void;
  private finishResolve?: () => void;
  private finishReject?: (error: Error) => void;
  constructor(private endpoint: string) {}
  connect(
    session: { sessionId: string; title: string; mimeType: string },
    receive: (message: LiveMessage) => void,
  ) {
    this.sessionId = session.sessionId;
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            "The backend did not acknowledge the session within 10 seconds.",
          ),
        );
        this.close();
      }, 10000);
      this.rejectConnect = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      const socket = (this.socket = new WebSocket(this.endpoint));
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "session.start",
            version: 1,
            ...session,
            audio: false,
          }),
        );
      socket.onmessage = (event) => {
        if (this.closed || typeof event.data !== "string") return;
        const message = parseLiveMessage(
          event.data,
          this.sessionId,
          this.lastSentMs,
        );
        if (!message) return;
        if (message.type === "session.ready" && !this.ready) {
          this.ready = true;
          clearTimeout(timeout);
          this.rejectConnect = undefined;
          resolve();
        }
        if (message.type === "session.complete") this.finishResolve?.();
        if (message.type === "error") {
          if (!this.ready) this.rejectConnect?.(new Error(message.message));
          this.finishReject?.(new Error(message.message));
        }
        receive(message);
      };
      socket.onerror = () => {
        if (!this.ready)
          this.rejectConnect?.(
            new Error(
              "Could not connect to the video backend. Check its URL and availability.",
            ),
          );
      };
      socket.onclose = () => {
        if (this.closed) return;
        const message =
          "The backend connection closed. Your local recording is preserved; start a new session to reconnect.";
        this.rejectConnect?.(new Error(message));
        this.finishReject?.(new Error(message));
        receive({ type: "error", sessionId: this.sessionId, message });
      };
    });
  }
  async send(chunk: Blob, meta: VideoChunkMeta) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN || !this.ready)
      throw new Error("The video connection is not ready.");
    // Encoded chunks depend on earlier chunks. Stop on congestion instead of dropping part of the video stream.
    if (socket.bufferedAmount + chunk.size > 4 * 1024 * 1024)
      throw new Error(
        "The backend is receiving video too slowly. Streaming stopped to keep the video sequence intact.",
      );
    const bytes = await chunk.arrayBuffer();
    if (this.closed || socket.readyState !== WebSocket.OPEN)
      throw new Error("The video connection closed before the chunk was sent.");
    socket.send(JSON.stringify(meta));
    socket.send(bytes);
    this.lastSentMs = meta.endMs;
  }
  finish(durationMs: number) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.finishResolve = undefined;
        this.finishReject = undefined;
        reject(
          new Error(
            "The backend did not finish in time. Available feedback and the local recording are still ready to review.",
          ),
        );
      }, 10000);
      this.finishResolve = () => {
        clearTimeout(timer);
        this.finishResolve = undefined;
        this.finishReject = undefined;
        resolve();
      };
      this.finishReject = (error) => {
        clearTimeout(timer);
        this.finishResolve = undefined;
        this.finishReject = undefined;
        reject(error);
      };
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.finishReject(
          new Error("The backend disconnected before final feedback arrived."),
        );
        return;
      }
      this.socket.send(
        JSON.stringify({
          type: "session.stop",
          sessionId: this.sessionId,
          durationMs,
        }),
      );
    });
  }
  close() {
    this.closed = true;
    this.rejectConnect?.(new Error("Connection cancelled."));
    this.rejectConnect = undefined;
    this.finishReject?.(new Error("Connection cancelled."));
    this.socket?.close();
    this.socket = null;
  }
}

export class DemoVideoTransport implements VideoTransport {
  private receive: ((message: LiveMessage) => void) | undefined;
  private sessionId = "";
  private next = 0;
  async connect(
    session: { sessionId: string },
    receive: (message: LiveMessage) => void,
  ) {
    this.sessionId = session.sessionId;
    this.receive = receive;
  }
  async send(_chunk: Blob, meta: VideoChunkMeta) {
    const examples = [
      {
        at: 2500,
        category: "Framing",
        kind: "positive" as const,
        title: "Your opening moment",
        detail:
          "This demo marker shows how a positive backend observation appears beside your video.",
        action: "Replay the opening and decide what you want to keep.",
      },
      {
        at: 6000,
        category: "Gestures",
        kind: "suggestion" as const,
        title: "Review this gesture moment",
        detail:
          "This is a scripted gesture marker, not a detected issue in your recording.",
        action:
          "Check whether your hands supported your explanation at this moment.",
      },
      {
        at: 10000,
        category: "Posture",
        kind: "attention" as const,
        title: "A moment to check your stance",
        detail:
          "This demo marker illustrates a posture alert. No posture analysis has run.",
        action: "Watch the surrounding seconds and make your own assessment.",
      },
    ];
    while (
      this.next < examples.length &&
      meta.endMs >= examples[this.next].at
    ) {
      const item = examples[this.next++];
      this.receive?.({
        type: "feedback",
        sessionId: this.sessionId,
        feedback: {
          id: `demo-${this.next}`,
          startMs: Math.max(0, item.at - 2000),
          endMs: item.at,
          category: item.category,
          kind: item.kind,
          title: item.title,
          detail: item.detail,
          action: item.action,
        },
      });
    }
  }
  async finish() {}
  close() {
    this.receive = undefined;
  }
}
export function createVideoTransport(config: LiveConfig): VideoTransport {
  return config.mode === "demo"
    ? new DemoVideoTransport()
    : new WebSocketVideoTransport(config.endpoint);
}

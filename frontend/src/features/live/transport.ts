import type {
  LiveConfig,
  LiveMessage,
  VideoChunkMeta,
  VideoTransport,
} from "./contracts";
import { analysisResult, request, waitForAudioJob } from "./analysis";

export class AnalysisTransport implements VideoTransport {
  private controller = new AbortController();
  private receive?: (message: LiveMessage) => void;
  private sessionId = "";
  constructor(private endpoint: string) {}
  async connect(
    session: { sessionId: string },
    receive: (message: LiveMessage) => void,
  ) {
    this.sessionId = session.sessionId;
    this.receive = receive;
    await request(this.endpoint, "/health/live", this.controller.signal);
  }
  async send() {} // Full MediaRecorder output is uploaded only after stopping.
  async finish(durationMs: number, recording?: Blob) {
    if (!recording?.size) throw new Error("No recording was captured.");
    const body = new FormData();
    body.append(
      "recording",
      recording,
      recording.type.includes("mp4") ? "take.mp4" : "take.webm",
    );
    // Preserve this UI's local signal-analysis mode; paid ASR is opt-in via API.
    body.append("transcribe", "false");
    const accepted = await request(
      this.endpoint,
      "/speech/analyze",
      this.controller.signal,
      {
        method: "POST",
        body,
      },
    );
    const result = analysisResult(
      await waitForAudioJob(this.endpoint, accepted, this.controller.signal),
      "speech",
      durationMs,
    );
    for (const feedback of result.feedback)
      this.receive?.({ type: "feedback", sessionId: this.sessionId, feedback });
    this.receive?.({
      type: "metrics",
      sessionId: this.sessionId,
      atMs: durationMs,
      metrics: result.metrics,
    });
  }
  close() {
    this.controller.abort();
    this.receive = undefined;
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
    : new AnalysisTransport(config.endpoint);
}

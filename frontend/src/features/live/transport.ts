import type { LiveConfig, LiveMessage, VideoTransport } from "./contracts";
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

// Local recordings receive only actual browser observations. No scripted markers.
export class LocalVideoTransport implements VideoTransport {
  async connect() {}
  async send() {}
  async finish() {}
  close() {}
}
export function createVideoTransport(config: LiveConfig): VideoTransport {
  return config.mode === "local"
    ? new LocalVideoTransport()
    : new AnalysisTransport(config.endpoint);
}

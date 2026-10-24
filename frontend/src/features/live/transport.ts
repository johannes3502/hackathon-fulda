import type {
  LiveConfig,
  LiveMessage,
  LiveTranscript,
  VideoTransport,
} from "./contracts";
import type { FeatureFlags } from "./feature-flags";
import {
  analysisResult,
  parseTranscript,
  request,
  waitForAudioJob,
} from "./analysis";

export class AnalysisTransport implements VideoTransport {
  private controller = new AbortController();
  private receive?: (message: LiveMessage) => void;
  private sessionId = "";
  constructor(
    private endpoint: string,
    private transcribe = false,
    private flags?: FeatureFlags,
    private finishTranscript?: (
      durationMs: number,
    ) => Promise<LiveTranscript | null>,
  ) {}
  async connect(
    session: { sessionId: string },
    receive: (message: LiveMessage) => void,
  ) {
    this.sessionId = session.sessionId;
    this.receive = receive;
    try {
      await request(
        this.endpoint,
        "/health/ready",
        AbortSignal.any([this.controller.signal, AbortSignal.timeout(10000)]),
      );
    } catch (error) {
      this.controller.signal.throwIfAborted();
      throw new Error(
        "Speech analysis is unavailable. Nothing has been recorded. Start the backend or set Speech analysis to Off, then enable the camera and try again." +
          (error instanceof Error ? ` (${error.message})` : ""),
      );
    }
  }
  async send() {} // Full MediaRecorder output is uploaded only after stopping.
  async finish(durationMs: number, recording?: Blob) {
    if (!recording?.size) throw new Error("No recording was captured.");
    const liveTranscript = this.transcribe
      ? await this.finishTranscript?.(durationMs)
      : null;
    this.controller.signal.throwIfAborted();
    const body = new FormData();
    body.append(
      "recording",
      recording,
      recording.type.includes("mp4") ? "take.mp4" : "take.webm",
    );
    body.append("transcribe", String(this.transcribe));
    body.append("local_only", liveTranscript ? "false" : "true");
    if (liveTranscript)
      body.append(
        "live_transcript",
        JSON.stringify({
          provider: liveTranscript.provider,
          words: liveTranscript.words,
        }),
      );
    const accepted = await request(
      this.endpoint,
      "/speech/analyze",
      this.controller.signal,
      {
        method: "POST",
        body,
      },
    );
    const raw = await waitForAudioJob(
      this.endpoint,
      accepted,
      this.controller.signal,
    );
    const result = analysisResult(raw, "speech", durationMs, this.flags);
    if (this.transcribe) {
      const transcript = parseTranscript(raw, durationMs);
      this.receive?.({
        type: "transcript",
        sessionId: this.sessionId,
        transcript,
      });
      if (raw.transcription && typeof raw.transcription === "object") {
        const wordMetrics = analysisResult(
          { ...raw.transcription, events: [] },
          "words",
          durationMs,
        );
        result.metrics.push(...wordMetrics.metrics);
      }
    }
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
export function createVideoTransport(
  config: LiveConfig,
  finishTranscript?: (durationMs: number) => Promise<LiveTranscript | null>,
): VideoTransport {
  return config.mode === "local"
    ? new LocalVideoTransport()
    : new AnalysisTransport(
        config.endpoint,
        config.transcribe,
        config.featureFlags,
        finishTranscript,
      );
}

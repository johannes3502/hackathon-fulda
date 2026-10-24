import type {
  LiveConfig,
  LiveMessage,
  LiveProgress,
  LiveRecording,
  VideoTransport,
} from "./contracts";
import { upsertFeedback } from "./protocol";

export function recordingMimeType() {
  if (typeof MediaRecorder === "undefined")
    throw new Error(
      "This browser cannot record video. Try a current Chrome, Edge, or Safari browser.",
    );
  return (
    ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? ""
  );
}
export class LiveRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private lastChunkMs = 0;
  private seq = 0;
  private timer?: ReturnType<typeof setInterval>;
  private queue: Promise<void> = Promise.resolve();
  private queuedBytes = 0;
  private totalBytes = 0;
  private disposed = false;
  private stopping = false;
  private failed = false;
  private latestMetricMs = -1;
  private progress: LiveProgress = {
    phase: "connecting",
    elapsedMs: 0,
    chunksSent: 0,
    bytesSent: 0,
    feedback: [],
    metrics: [],
    notice: null,
  };
  readonly id = crypto.randomUUID();
  constructor(
    private stream: MediaStream,
    private config: LiveConfig,
    private transport: VideoTransport,
    private onProgress: (state: LiveProgress) => void,
    private onComplete: (recording: LiveRecording) => void,
  ) {}
  private publish() {
    if (!this.disposed) this.onProgress({ ...this.progress });
  }
  private receive = (message: LiveMessage) => {
    if (this.disposed || message.sessionId !== this.id) return;
    if (message.type === "feedback")
      this.progress.feedback = upsertFeedback(
        this.progress.feedback,
        message.feedback,
      );
    if (message.type === "metrics" && message.atMs >= this.latestMetricMs) {
      this.latestMetricMs = message.atMs;
      this.progress.metrics = message.metrics;
    }
    if (message.type === "error") this.fail(message.message);
    this.publish();
  };
  private fail(message: string) {
    if (this.disposed) return;
    this.failed = true;
    this.progress.notice ??= message;
    if (this.recorder?.state === "recording") this.stop();
    this.publish();
  }
  async start() {
    if (this.recorder || this.disposed)
      throw new Error("Start a new recording to try again.");
    if (
      ![60000, 180000, 300000].includes(this.config.targetMs) ||
      !this.config.title.trim() ||
      this.config.title.length > 100
    )
      throw new Error("Add a title and choose a supported recording length.");
    if (
      this.config.mode === "backend" &&
      !this.stream.getAudioTracks().some((track) => track.readyState === "live")
    )
      throw new Error(
        "Enable microphone access before recording for audio analysis.",
      );
    const mimeType = recordingMimeType();
    if (
      !this.stream.getVideoTracks().some((track) => track.readyState === "live")
    )
      throw new Error("Enable your camera before starting a recording.");
    const recorder = (this.recorder = new MediaRecorder(this.stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1200000,
    }));
    this.publish();
    try {
      await this.transport.connect(
        {
          sessionId: this.id,
          title: this.config.title,
          mimeType: recorder.mimeType,
        },
        this.receive,
      );
    } catch (error) {
      this.transport.close();
      throw error;
    }
    if (this.disposed || this.failed) {
      this.transport.close();
      throw new Error(
        "The video session was cancelled before recording started.",
      );
    }
    recorder.ondataavailable = (event) => {
      if (this.disposed || !event.data.size) return;
      this.chunks.push(event.data);
      this.totalBytes += event.data.size;
      const endMs = this.stopping
        ? this.progress.elapsedMs
        : performance.now() - this.startedAt;
      const meta = {
        type: "video.chunk" as const,
        sessionId: this.id,
        seq: ++this.seq,
        startMs: this.lastChunkMs,
        endMs,
        byteLength: event.data.size,
      };
      this.lastChunkMs = endMs;
      this.queuedBytes += event.data.size;
      if (this.queuedBytes > 8 * 1024 * 1024)
        this.fail(
          "Video processing fell behind. Recording stopped; the local video is still available.",
        );
      this.queue = this.queue.then(async () => {
        try {
          if (this.disposed || this.failed) return;
          await this.transport.send(event.data, meta);
          if (this.config.mode === "demo") {
            this.progress.chunksSent++;
            this.progress.bytesSent += event.data.size;
          }
        } catch (error) {
          this.fail(
            error instanceof Error ? error.message : "Video streaming failed.",
          );
        } finally {
          this.queuedBytes -= event.data.size;
          this.publish();
        }
      });
      if (this.totalBytes >= 150 * 1024 * 1024)
        this.fail(
          "The local recording reached its memory limit. Save this video and start a new session.",
        );
    };
    recorder.onstart = () => {
      if (this.disposed) return;
      this.startedAt = performance.now();
      this.progress.phase = "recording";
      this.publish();
      this.timer = setInterval(() => {
        this.progress.elapsedMs = performance.now() - this.startedAt;
        this.publish();
        if (this.progress.elapsedMs >= this.config.targetMs) this.stop();
      }, 100);
    };
    recorder.onerror = () =>
      this.fail(
        "The browser recorder encountered an error. Any captured video will remain available.",
      );
    recorder.onstop = () => {
      void this.finalize();
    };
    this.stream
      .getVideoTracks()
      .forEach((track) =>
        track.addEventListener(
          "ended",
          () =>
            this.fail(
              "Camera capture ended. Any recorded video is ready to review.",
            ),
          { once: true },
        ),
      );
    recorder.start(500);
  }
  stop() {
    if (
      this.stopping ||
      this.disposed ||
      !this.recorder ||
      this.recorder.state === "inactive"
    )
      return;
    this.stopping = true;
    clearInterval(this.timer);
    this.progress.elapsedMs = Math.max(0, performance.now() - this.startedAt);
    this.progress.phase = "finishing";
    this.publish();
    this.recorder.stop();
    this.stream.getTracks().forEach((track) => track.stop());
  }
  private async finalize() {
    clearInterval(this.timer);
    this.stream.getTracks().forEach((track) => track.stop());
    if (!this.stopping) {
      this.stopping = true;
      this.progress.elapsedMs = Math.max(0, performance.now() - this.startedAt);
      this.progress.phase = "finishing";
    }
    await this.queue;
    if (this.disposed) return;
    const video = new Blob(this.chunks, {
      type: this.recorder?.mimeType || "video/webm",
    });
    if (!this.failed) {
      try {
        await this.transport.finish(this.progress.elapsedMs, video);
        if (this.config.mode === "backend") {
          this.progress.chunksSent = 1;
          this.progress.bytesSent = video.size;
        }
      } catch (error) {
        this.failed = true;
        this.progress.notice =
          error instanceof Error
            ? error.message
            : "Final feedback could not be loaded.";
      }
    }
    this.transport.close();
    if (this.disposed) return;
    this.chunks = [];
    this.onComplete({
      id: this.id,
      config: this.config,
      createdAt: new Date().toISOString(),
      durationMs: this.progress.elapsedMs,
      video,
      videoUrl: URL.createObjectURL(video),
      mimeType: video.type,
      feedback: this.progress.feedback,
      metrics: this.progress.metrics,
      chunksSent: this.progress.chunksSent,
      bytesSent: this.progress.bytesSent,
      completion: this.failed ? "interrupted" : "complete",
      notice: this.progress.notice,
    });
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    this.transport.close();
    if (this.recorder && this.recorder.state !== "inactive")
      this.recorder.stop();
    this.stream.getTracks().forEach((track) => track.stop());
    this.chunks = [];
  }
}

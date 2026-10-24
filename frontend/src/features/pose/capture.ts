import { PoseLog, poseSample, type PoseSample } from "./sample";
import { PoseEvaluator, POSE_RULES, type PoseEvaluation } from "./evaluation";
export type PoseTiming = {
  frameMs: number | null;
  inferenceMs: number | null;
  samplesPerSecond: number | null;
};
export type PoseState = {
  phase: "loading" | "running" | "stopped" | "error";
  count: number;
  message: string;
  latest: PoseSample | null;
  evaluation: PoseEvaluation | null;
  timing: PoseTiming;
};
export class PoseCapture {
  readonly log = new PoseLog();
  private worker: Worker | null = null;
  private frame = 0;
  private pending = false;
  private lastVideoTime = -1;
  private lastFrame = -Infinity;
  private timeout?: ReturnType<typeof setTimeout>;
  private latest: PoseSample | null = null;
  private evaluator = new PoseEvaluator();
  private origin: number | null = null;
  private evaluation: PoseEvaluation | null = null;
  private frameTimeout?: ReturnType<typeof setTimeout>;
  private timing: PoseTiming = {
    frameMs: null,
    inferenceMs: null,
    samplesPerSecond: null,
  };
  private timestamps: number[] = [];
  constructor(
    private video: HTMLVideoElement,
    private update: (state: PoseState) => void,
  ) {}
  private publish(phase: PoseState["phase"], message: string) {
    this.update({
      phase,
      message,
      count: this.log.count,
      latest: this.latest,
      evaluation: this.evaluation,
      timing: this.timing,
    });
  }
  start() {
    this.publish("loading", "Loading the local pose model…");
    try {
      const worker = (this.worker = new Worker("/pose/worker.js"));
      this.timeout = setTimeout(
        () => this.fail("Pose model loading timed out. Try again."),
        30000,
      );
      worker.onerror = () =>
        this.fail(
          "Pose capture could not start. Check browser support and model assets.",
        );
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker) return;
        if (data.type === "ready") {
          clearTimeout(this.timeout);
          this.publish(
            "running",
            "Waiting for a visible pose. Keep your upper body in frame.",
          );
          this.tick();
        } else if (data.type === "error") {
          this.fail(
            "Pose detection failed. You can download any samples already captured and retry.",
          );
        } else if (data.type === "sample") {
          clearTimeout(this.frameTimeout);
          this.pending = false;
          // A delayed preview inference must never affect a new take.
          if (this.origin !== null && data.timestamp < this.origin) return;
          const elapsed = performance.now() - data.timestamp;
          this.timestamps = [...this.timestamps, data.timestamp].slice(-20);
          const duration = this.timestamps.at(-1)! - this.timestamps[0];
          this.timing = {
            frameMs:
              Number.isFinite(elapsed) && elapsed >= 0
                ? Math.round(elapsed)
                : null,
            inferenceMs:
              Number.isFinite(data.inferenceMs) && data.inferenceMs >= 0
                ? Math.round(data.inferenceMs)
                : null,
            samplesPerSecond:
              duration > 0
                ? ((this.timestamps.length - 1) * 1000) / duration
                : null,
          };
          const origin = this.origin ?? Number(data.timestamp);
          this.origin = origin;
          const liveSample = poseSample(
            data.points,
            data.width,
            data.height,
            data.timestamp - origin,
          );
          // A frame captured before the recording anchor must not enter its log.
          const sample = this.log.full
            ? liveSample
            : this.log.add(
                data.points,
                data.width,
                data.height,
                data.timestamp,
              );
          this.latest = sample;
          this.evaluation = this.evaluator.update(
            liveSample,
            data.timestamp - origin,
          );
          this.publish(
            "running",
            this.log.full
              ? "Log limit reached. Landmarks remain live; start a take to reset the log."
              : sample
                ? "Pose samples stay in this browser."
                : "No usable pose. Keep your upper body in frame.",
          );
        }
      };
      worker.postMessage({ type: "init" });
    } catch {
      this.fail("Pose capture is unavailable in this browser.");
    }
  }
  private tick = () => {
    const worker = this.worker;
    if (!worker) return;
    this.frame = requestAnimationFrame(this.tick);
    const timestamp = performance.now();
    if (
      this.latest &&
      timestamp - this.lastFrame > POSE_RULES.staleFrameMs &&
      this.origin !== null
    ) {
      this.latest = null;
      this.evaluation = this.evaluator.update(null, timestamp - this.origin);
      this.publish(
        "running",
        "Waiting for a fresh camera frame. Evaluation paused.",
      );
    }
    if (
      this.video.ended ||
      !(this.video.srcObject as MediaStream | null)
        ?.getVideoTracks()
        .some((t) => t.readyState === "live")
    ) {
      this.stop("Camera stopped. Your captured samples are ready to download.");
      return;
    }
    // Browsers may pause an autoplay preview when it scrolls out of view.
    if (this.video.paused && !this.pending) {
      this.pending = true;
      void this.video
        .play()
        .then(() => {
          if (this.worker === worker) this.pending = false;
        })
        .catch(() => {
          if (this.worker === worker)
            this.fail(
              "Camera preview could not resume. Enable the camera and retry pose capture.",
            );
        });
      return;
    }
    if (
      this.pending ||
      this.video.readyState < 2 ||
      timestamp - this.lastFrame < 100 ||
      this.video.currentTime === this.lastVideoTime
    )
      return;
    this.pending = true;
    this.frameTimeout = setTimeout(() => {
      if (this.worker === worker)
        this.fail(
          "Pose detection stalled. Retry landmarks or open the synthetic walkthrough.",
        );
    }, POSE_RULES.inferenceTimeoutMs);
    this.lastFrame = timestamp;
    this.lastVideoTime = this.video.currentTime;
    void createImageBitmap(this.video)
      .then((bitmap) => {
        if (this.worker !== worker) {
          bitmap.close();
          return;
        }
        try {
          worker.postMessage({ type: "frame", frame: bitmap, timestamp }, [
            bitmap,
          ]);
        } catch {
          bitmap.close();
          this.fail("Could not read a camera frame for pose capture.");
        }
      })
      .catch(() => {
        if (this.worker === worker)
          this.fail("Could not read a camera frame for pose capture.");
      });
  };
  beginRecording(timestamp: number, sessionId = "recording") {
    this.log.reset(timestamp);
    this.origin = timestamp;
    this.evaluator = new PoseEvaluator(sessionId);
    this.evaluation = null;
    this.latest = null;
  }
  recalibrate() {
    this.evaluator = new PoseEvaluator();
    this.evaluation = null;
    this.publish("running", "Calibration reset. Hold your neutral position.");
  }
  get events() {
    return this.evaluation?.events ?? [];
  }
  private fail(message: string) {
    this.dispose();
    this.latest = null;
    this.evaluation = this.evaluation
      ? { ...this.evaluation, phase: "framing", cue: null, message }
      : null;
    this.publish("error", message);
  }
  stop(message = "Pose capture stopped. Your samples are ready to download.") {
    this.dispose();
    this.publish("stopped", message);
  }
  dispose() {
    clearTimeout(this.timeout);
    clearTimeout(this.frameTimeout);
    cancelAnimationFrame(this.frame);
    this.worker?.terminate();
    this.worker = null;
  }
}

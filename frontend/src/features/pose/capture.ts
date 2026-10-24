import { CrossArmsCue, armsCrossed } from "./cues";
import { PoseLog, poseSample, type PoseSample } from "./sample";
export type PoseState = {
  phase: "loading" | "running" | "stopped" | "error";
  count: number;
  message: string;
  latest: PoseSample | null;
  armsCrossed: boolean;
};
export class PoseCapture {
  readonly log = new PoseLog();
  private crossArms = new CrossArmsCue();
  private armsCrossed = false;
  private worker: Worker | null = null;
  private frame = 0;
  private pending = false;
  private lastVideoTime = -1;
  private lastFrame = -Infinity;
  private timeout?: ReturnType<typeof setTimeout>;
  private latest: PoseSample | null = null;
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
      armsCrossed: this.armsCrossed,
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
          this.pending = false;
          // A frame captured before the recording anchor must not enter its log.
          const sample = this.log.full
            ? poseSample(data.points, data.width, data.height, 0)
            : this.log.add(
                data.points,
                data.width,
                data.height,
                data.timestamp,
              );
          this.latest = sample;
          // Uses the frame clock, so preview and recording share one episode.
          this.armsCrossed = this.crossArms.update(
            armsCrossed(sample),
            data.timestamp,
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
  beginRecording(timestamp: number) {
    this.log.reset(timestamp);
    this.latest = null;
  }
  private fail(message: string) {
    this.dispose();
    this.publish("error", message);
  }
  stop(message = "Pose capture stopped. Your samples are ready to download.") {
    this.dispose();
    this.publish("stopped", message);
  }
  dispose() {
    clearTimeout(this.timeout);
    cancelAnimationFrame(this.frame);
    this.worker?.terminate();
    this.worker = null;
  }
}

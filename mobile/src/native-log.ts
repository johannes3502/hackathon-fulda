import {
  poseSample,
  type Landmark,
} from "../../frontend/src/features/pose/sample";
export class NativePoseLog {
  private origin: number | null = null;
  private lines: string[] = [];
  private last = -Infinity;
  get count() {
    return this.lines.length;
  }
  get full() {
    return this.count >= 3000;
  }
  start(timestamp: number) {
    this.origin = timestamp;
    this.lines = [];
    this.last = -Infinity;
  }
  add(points: Landmark[], width: number, height: number, timestamp: number) {
    if (
      !Number.isFinite(timestamp) ||
      timestamp <= this.last ||
      this.full ||
      timestamp < (this.origin ?? timestamp)
    )
      return null;
    const sample = poseSample(
      points,
      width,
      height,
      timestamp - (this.origin ?? timestamp),
    );
    if (sample) {
      this.origin ??= timestamp;
      this.last = timestamp;
      this.lines.push(
        JSON.stringify({
          ...sample,
          timebase: "recording-request",
          alignment: "approximate",
          model_mode: "IMAGE",
        }),
      );
    }
    return sample;
  }
  text() {
    return this.lines.length ? this.lines.join("\n") + "\n" : "";
  }
}

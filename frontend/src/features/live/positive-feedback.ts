import type { LiveFeedback } from "./contracts";

/** Review evidence from consecutive matching measurements, never from idle time. */
export class PositiveFeedback {
  private previous: number | null = null;
  private intervals: LiveFeedback[] = [];
  constructor(
    private copy: Omit<LiveFeedback, "kind" | "startMs" | "endMs">,
    private maxGapMs: number,
    private holdMs: number,
  ) {}

  update(t: number, matches: boolean) {
    if (!Number.isFinite(t) || t < 0) return;
    if (this.previous !== null && t <= this.previous) return;
    if (!matches) {
      this.previous = null;
      return;
    }
    const last = this.intervals.at(-1);
    if (this.previous !== null && t - this.previous <= this.maxGapMs) {
      if (last?.endMs === this.previous) last.endMs = t;
      else
        this.intervals.push({
          ...this.copy,
          id: `${this.copy.id}-${this.previous}`,
          kind: "positive",
          startMs: this.previous,
          endMs: t,
        });
    }
    this.previous = t;
  }

  get feedback() {
    return this.intervals
      .filter((item) => item.endMs - item.startMs >= this.holdMs)
      .map((item) => ({ ...item }));
  }
}

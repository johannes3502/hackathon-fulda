import { useEffect, useRef, useState } from "react";
import { POSE_RULES } from "../pose/evaluation";
import { loadLiveHintSettings } from "../admin/settings";
import type { LiveFeedback } from "./contracts";

export type CuePacing = { minDisplayMs: number; minDisplayGapMs: number };
type Cue = { id: string };

// One live hint at a time across pose and voice. A shown hint stays for the
// minimum display time even after its observation ended; the next hint waits
// for the blank gap. Hints skipped meanwhile still reach the timeline.
export class CuePacer<T extends Cue = LiveFeedback> {
  private shown: { cue: T; since: number } | null = null;
  private blankUntil = -Infinity;
  constructor(private pacing: CuePacing = POSE_RULES) {}

  update(candidate: T | null, now: number) {
    if (this.shown) {
      if (candidate?.id === this.shown.cue.id) this.shown.cue = candidate;
      else if (now >= this.shown.since + this.pacing.minDisplayMs) {
        this.shown = null;
        this.blankUntil = now + this.pacing.minDisplayGapMs;
      }
    }
    if (!this.shown && candidate && now >= this.blankUntil)
      this.shown = { cue: candidate, since: now };
    // The next moment the result can change without a new candidate.
    const wakeAt = this.shown
      ? this.shown.since + this.pacing.minDisplayMs
      : this.blankUntil;
    return {
      cue: this.shown?.cue ?? null,
      wakeAt: wakeAt > now ? wakeAt : null,
    };
  }

  reset() {
    this.shown = null;
    this.blankUntil = -Infinity;
  }
}

export function usePacedCue<T extends Cue>(
  candidate: T | null,
  enabled: boolean,
) {
  const pacer = useRef<CuePacer<T> | null>(null);
  const [cue, setCue] = useState<T | null>(null);
  useEffect(() => {
    const pacing = (pacer.current ??= new CuePacer<T>(loadLiveHintSettings()));
    if (!enabled) {
      pacing.reset();
      return;
    }
    // Re-run at each display deadline so a hint can end without a new frame.
    const sync = () => {
      const now = performance.now();
      const next = pacing.update(candidate, now);
      // Only a different hint re-renders; the same hint keeps its fresh copy.
      setCue((previous) =>
        previous?.id === next.cue?.id ? previous : next.cue,
      );
      if (next.wakeAt !== null) timer = setTimeout(sync, next.wakeAt - now);
    };
    let timer = setTimeout(sync, 0);
    return () => clearTimeout(timer);
  }, [candidate, enabled]);
  if (!enabled) return null;
  return cue && candidate?.id === cue.id ? candidate : cue;
}

import { describe, expect, it } from "vitest";
import { CuePacer } from "./cue-pacing";
import type { LiveFeedback } from "./contracts";

const hint = (id: string, endMs = 0): LiveFeedback => ({
  id,
  category: "Posture",
  kind: "observation",
  startMs: 0,
  endMs,
  title: id,
  detail: "",
  action: "",
});

describe("live hint pacing", () => {
  const pacing = { minDisplayMs: 3000, minDisplayGapMs: 2000 };

  it("keeps a short hint for the minimum display time, then leaves a blank gap", () => {
    const pacer = new CuePacer(pacing);
    expect(pacer.update(hint("a"), 0)).toEqual({
      cue: hint("a"),
      wakeAt: 3000,
    });
    expect(pacer.update(null, 500).cue?.id).toBe("a");
    expect(pacer.update(hint("b"), 2999).cue?.id).toBe("a");
    expect(pacer.update(hint("b"), 3000)).toEqual({ cue: null, wakeAt: 5000 });
    expect(pacer.update(hint("b"), 4999).cue).toBeNull();
    expect(pacer.update(hint("b"), 5000).cue?.id).toBe("b");
  });

  it("keeps an active hint beyond the minimum and refreshes its content", () => {
    const pacer = new CuePacer(pacing);
    pacer.update(hint("a"), 0);
    expect(pacer.update(hint("a", 9000), 9000)).toEqual({
      cue: hint("a", 9000),
      wakeAt: null,
    });
  });

  it("applies the gap to voice and pose hints alike and allows back-to-back swaps at 0", () => {
    const pacer = new CuePacer(pacing);
    pacer.update(hint("pose"), 0);
    pacer.update({ ...hint("voice"), category: "volume" }, 3000);
    expect(pacer.update(hint("voice"), 4000).cue).toBeNull();
    const swap = new CuePacer({ ...pacing, minDisplayGapMs: 0 });
    swap.update(hint("a"), 0);
    expect(swap.update(hint("b"), 3000).cue?.id).toBe("b");
  });

  it("drops a hint that ended during the gap and resets cleanly", () => {
    const pacer = new CuePacer(pacing);
    pacer.update(hint("a"), 0);
    pacer.update(hint("b"), 3000);
    expect(pacer.update(null, 5000)).toEqual({ cue: null, wakeAt: null });
    pacer.reset();
    pacer.update(hint("a"), 0);
    pacer.update(null, 3000);
    pacer.reset();
    expect(pacer.update(hint("c"), 3100).cue?.id).toBe("c");
  });
});

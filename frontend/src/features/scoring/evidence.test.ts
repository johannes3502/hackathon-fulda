import { describe, expect, it } from "vitest";
import {
  countEvidence,
  intersectIntervals,
  mergeIntervals,
  timeEvidence,
  unionLength,
} from "./evidence";

const interval = (startMs: number, endMs: number) => ({ startMs, endMs });

describe("interval evidence engine", () => {
  it("merges duplicates, clips to the take and intersects overlapping evidence", () => {
    expect(
      mergeIntervals(
        [
          interval(0, 2000),
          interval(1000, 3000),
          interval(5000, 6000),
        ],
        5500,
      ),
    ).toEqual([interval(0, 3000), interval(5000, 5500)]);
    expect(
      intersectIntervals(
        [interval(0, 3000), interval(5000, 6000)],
        [interval(1000, 5500)],
      ),
    ).toEqual([interval(1000, 3000), interval(5000, 5500)]);
    expect(unionLength([interval(0, 2000), interval(1000, 3000)])).toBe(3000);
  });

  it("returns no estimate without enough assessed time", () => {
    const empty = timeEvidence([], [], 60_000);
    expect(empty).toMatchObject({
      value: null,
      rawValue: null,
      low: null,
      high: null,
      status: "insufficient",
      coverage: 0,
      assessedMs: 0,
    });
    const short = timeEvidence([interval(0, 4000)], [], 60_000);
    expect(short.value).toBeNull();
    expect(short.status).toBe("insufficient");
    expect(short.rawValue).toBeNull();
  });

  it("smooths small time samples and keeps endpoint values for enough evidence", () => {
    const small = timeEvidence([interval(0, 10_000)], [], 60_000);
    expect(small).toMatchObject({
      value: 92,
      rawValue: 99,
      status: "provisional",
    });
    expect(small.low).not.toBeNull();
    expect(small.high).not.toBeNull();
    expect(small.low).toBeLessThanOrEqual(small.value!);
    expect(small.high).toBeGreaterThanOrEqual(small.value!);

    const enough = timeEvidence([interval(0, 30_000)], [], 60_000);
    expect(enough.status).toBe("reportable");
    expect(enough.value).toBe(97);
    expect(enough.rawValue).toBe(100);

    const endpoint = timeEvidence([interval(0, 200_000)], [], 200_000);
    expect(endpoint.status).toBe("reportable");
    expect(endpoint.value).toBe(100);
  });

  it("balances contradictory evidence inside the same interval", () => {
    const evidence = timeEvidence(
      [interval(0, 10_000)],
      [interval(0, 10_000)],
      40_000,
    );
    expect(evidence).toMatchObject({
      value: 50,
      rawValue: 50,
      positiveMs: 10_000,
      concernMs: 10_000,
      assessedMs: 10_000,
      overlapMs: 10_000,
      coverage: 0.25,
      status: "provisional",
    });
  });

  it("deduplicates overlap and is symmetric and monotone", () => {
    const base = timeEvidence(
      [interval(0, 10_000)],
      [interval(10_000, 20_000)],
      60_000,
    );
    const duplicated = timeEvidence(
      [interval(0, 10_000), interval(0, 10_000)],
      [interval(10_000, 20_000), interval(15_000, 20_000)],
      60_000,
    );
    expect(duplicated).toMatchObject({
      value: base.value,
      assessedMs: 20_000,
      coverage: base.coverage,
    });
    const swapped = timeEvidence(
      [interval(10_000, 20_000)],
      [interval(0, 10_000)],
      60_000,
    );
    expect(Math.abs((swapped.value ?? 0) - (100 - (base.value ?? 0)))).toBeLessThanOrEqual(1);

    const morePositive = timeEvidence(
      [interval(0, 10_000), interval(20_000, 25_000)],
      [interval(10_000, 20_000)],
      60_000,
    );
    const moreConcern = timeEvidence(
      [interval(0, 10_000)],
      [interval(10_000, 20_000), interval(20_000, 25_000)],
      60_000,
    );
    expect(morePositive.value!).toBeGreaterThan(base.value!);
    expect(moreConcern.value!).toBeLessThan(base.value!);
  });

  it("clips evidence instead of inventing time outside the take", () => {
    const evidence = timeEvidence(
      [interval(-1000, 2000), interval(9000, 12000)],
      [],
      10_000,
    );
    expect(evidence).toMatchObject({
      positiveMs: 3000,
      assessedMs: 3000,
      coverage: 0.3,
      value: null,
      status: "insufficient",
    });
  });

  it("uses count evidence for verified source decisions", () => {
    expect(countEvidence({ supports: 0, contradicts: 0 })).toMatchObject({
      value: null,
      status: "insufficient",
      decided: 0,
    });
    expect(
      countEvidence({ supports: 1, contradicts: 0, unassessed: 2 }),
    ).toMatchObject({
      value: 67,
      rawValue: 99,
      status: "provisional",
      coverage: 1 / 3,
      decided: 1,
      total: 3,
    });
    expect(
      countEvidence({ supports: 4, contradicts: 1, unassessed: 4 }),
    ).toMatchObject({
      value: 71,
      rawValue: 80,
      status: "reportable",
      coverage: 5 / 9,
      decided: 5,
    });
    const endpoint = countEvidence({ supports: 300, contradicts: 0 });
    expect(endpoint.value).toBe(100);
    expect(endpoint.status).toBe("reportable");
  });

  it("keeps count estimates monotone and reports missing decisions separately", () => {
    const base = countEvidence({ supports: 3, contradicts: 2 });
    expect(
      countEvidence({ supports: 4, contradicts: 2 }).value!,
    ).toBeGreaterThan(base.value!);
    expect(
      countEvidence({ supports: 3, contradicts: 3 }).value!,
    ).toBeLessThan(base.value!);
    const missing = countEvidence({
      supports: 5,
      contradicts: 5,
      unassessed: 90,
    });
    expect(missing.coverage).toBe(0.1);
    expect(missing.unassessed).toBe(90);
    expect(missing.value).not.toBeNull();
  });
});

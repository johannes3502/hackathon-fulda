import { describe, expect, it } from "vitest";
import { demoProgress } from "./demo";
import {
  changeSentence,
  formatDelta,
  formatPercent,
  formatValue,
  goalTargetLabel,
  highlightSentence,
  pointStatus,
} from "./format";

describe("demo progress fixture", () => {
  it("uses the documented profile totals and primary series", () => {
    expect(demoProgress.schemaVersion).toBe("progress.v1");
    expect(demoProgress.profile.totalTakes).toBe(24);
    expect(demoProgress.profile.eligibleTakes).toBe(20);
    expect(demoProgress.series).toHaveLength(7);
    expect(demoProgress.series.every((series) => series.isPrimary)).toBe(true);
  });

  it("marks missing values as unknown instead of zero and keeps reasons", () => {
    for (const series of demoProgress.series) {
      expect(series.quality.totalPoints).toBe(series.points.length);
      expect(series.quality.eligiblePoints).toBe(
        series.points.filter((point) => point.eligible).length,
      );
      expect(series.quality.excludedPoints).toBe(
        series.points.filter((point) => !point.eligible).length,
      );
      expect(series.quality.missingPoints).toBe(
        series.points.filter((point) => point.value == null).length,
      );
      for (const point of series.points) {
        if (point.eligible) {
          expect(point.value).not.toBeNull();
        } else {
          expect(point.eligible).toBe(false);
          expect(point.exclusionReasons.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("contains no total score field", () => {
    expect(JSON.stringify(demoProgress)).not.toMatch(/"score"/);
    expect(demoProgress.limitations.map((item) => item.code)).toContain(
      "no-score",
    );
  });
});

describe("progress formatting", () => {
  it("renders missing values as unknown, not as zero", () => {
    expect(formatValue(null, "WPM")).toBe("–");
    expect(formatPercent(null)).toBe("–");
    expect(formatDelta(null, "per100w")).toBeNull();
  });

  it("formats the contract units in German", () => {
    expect(formatValue(130, "WPM")).toBe("130 WPM");
    expect(formatValue(0.12, "ratio")).toBe("12 %");
    expect(formatValue(3.94, "per100w")).toBe("3,9 / 100");
    expect(formatDelta(-3.5, "per100w")).toBe("−3,5 / 100");
    expect(formatPercent(0.68)).toBe("68 %");
  });

  it("labels goals and point states without a grade", () => {
    expect(
      goalTargetLabel(
        {
          direction: "target_band",
          targetValue: null,
          targetMin: 0.05,
          targetMax: 0.08,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        "ratio",
      ),
    ).toBe("5 % bis 8 %");
    expect(pointStatus({ ...demoProgress.series[0].points[0], value: null })).toBe(
      "Nicht berechenbar",
    );
  });

  it("describes change points as direction, not as success", () => {
    const series = demoProgress.series.find(
      (item) => item.metricId === "speech.filler_rate_per_100_words",
    );
    expect(series).toBeDefined();
    const change = series?.changePoints[0];
    expect(change).toBeDefined();
    if (!series || !change) return;
    const sentence = changeSentence(change, series);
    expect(sentence).toContain("Ab Aufnahme 13:");
    expect(sentence).toContain("niedriger als zuvor");
    expect(sentence).toContain("(6,1 / 100 → 4,6 / 100)");
    expect(sentence).not.toMatch(/besser|schlechter|Note/i);
  });

  it("keeps highlight copy tied to the own goal", () => {
    const highlight = demoProgress.highlights.find(
      (item) => item.kind === "goal_on_track",
    );
    const series = demoProgress.series.find(
      (item) => item.metricId === highlight?.metricId,
    );
    expect(highlight).toBeDefined();
    if (!highlight) return;
    const sentence = highlightSentence(highlight, series);
    expect(sentence).toContain("auf Kurs");
    expect(sentence).not.toMatch(/Score|Punkte|Ranking/i);
  });
});

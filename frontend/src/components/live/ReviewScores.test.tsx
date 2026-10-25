import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { StructureAnalysis } from "@/features/structure/types";
import { reviewScores } from "@/features/live/review-scores";
import { ReviewScores } from "./ReviewScores";

const structure: StructureAnalysis = {
  version: "structure-rubric-v1",
  language: "de",
  wordCount: 120,
  sentenceCount: 10,
  components: {
    opening: { available: true, score: 1, reason: "Einstieg.", evidence: [] },
    closing: { available: true, score: 1, reason: "Abschluss.", evidence: [] },
    sections: {
      available: true,
      score: 1,
      reason: "Abschnitte.",
      evidence: [],
    },
    transitions: {
      available: true,
      score: 0,
      reason: "Keine Übergänge.",
      evidence: [],
    },
  },
  sections: [],
  markers: [],
  score: 75,
  dataCoverage: 1,
  confidence: "medium",
  limitations: [],
};

it("renders the German evidence profile with ranges, statuses and structure signals", () => {
  const scores = reviewScores(
    [
      { criterion: "flow", kind: "positive", tMs: 0, durationMs: 30_000 },
      { criterion: "gesture", kind: "attention", tMs: 0, durationMs: 10_000 },
    ],
    60_000,
    [
      {
        verdict: "supports",
        evidence: {
          kind: "upload",
          label: "Synthetic",
          quote: "A verified source passage.",
          passage: "A verified source passage.",
          quote_verified: "exact",
        },
      },
    ],
    structure,
  );
  const html = renderToStaticMarkup(
    <ReviewScores scores={scores} demo recordingTitle="Testaufnahme" />,
  );
  expect(html).toContain('data-score-version="evidence-share-v2"');
  expect(html).toContain("Evidenzprofil dieser Aufnahme");
  expect(html).toContain("Aufbau");
  expect(html).toContain("Quellenbezug");
  expect(html).toContain("Sprechfluss");
  expect(html).toContain("Körper &amp; Gesten");
  expect(html).toContain("Spanne");
  expect(html).toContain("vorläufig");
  expect(html).toContain("ausreichend Daten");
  expect(html).toContain("4/4 Signale");
  expect(html).toContain("Einstieg");
  expect(html).toContain("Abschluss");
  expect(html).toContain("Abschnitte");
  expect(html).toContain("Übergänge");
  expect(html).toContain("Demo");
  expect(html).not.toContain("Deine vier Kriterien");
  expect(html).not.toContain("Fachwissen");
});

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { FactCheckResult } from "@/features/factcheck/api";
import { PerformanceEvaluation } from "./PerformanceEvaluation";

const factCheck = (
  verdict: "supports" | "contradicts",
  evidence = true,
): FactCheckResult => ({
  claims: [
    {
      claim: "Synthetic statement",
      transcript: "Synthetic statement",
      t_ms: 0,
      duration_ms: 1000,
      verdict,
      explanation: "Synthetic comparison",
      checked: ["upload"],
      evidence: evidence
        ? {
            kind: "upload",
            label: "Synthetic source",
            quote: "A verified source passage.",
            passage: "A verified source passage.",
            quote_verified: "exact",
          }
        : undefined,
    },
  ],
  config: {
    max_claims: 6,
    min_quote_chars: 12,
    top_k: 5,
    web_results: 4,
  },
  events: [],
  model: "test",
  notices: [],
  sources_checked: true,
  web_provider: null,
});

it("states that there is no overall score instead of displaying one", () => {
  const html = renderToStaticMarkup(
    <PerformanceEvaluation input={{ durationMs: 60000 }} />,
  );
  expect(html).toContain("Evidence profile");
  expect(html).toContain(
    "No overall score: these rows measure different things.",
  );
  expect(html).not.toContain('class="performance-score"');
  expect(html).not.toContain("No overall score available");
  expect(html).not.toContain("Strong");
});

it("shows an estimate with a range, status and counts for source grounding", () => {
  const html = renderToStaticMarkup(
    <PerformanceEvaluation
      input={{
        durationMs: 60000,
        factCheck: factCheck("supports"),
      }}
    />,
  );
  expect(html).toContain(
    `class="performance-category-score">67<small> /100</small>`,
  );
  expect(html).toContain("Range ");
  expect(html).toContain("provisional");
  expect(html).toContain("1 supported");
});

it("keeps unverified source verdicts as counts only without an estimate", () => {
  const html = renderToStaticMarkup(
    <PerformanceEvaluation
      input={{
        durationMs: 60000,
        factCheck: factCheck("supports", false),
      }}
    />,
  );
  expect(html).toContain("limited evidence");
  expect(html).toContain("0 supported");
  expect(html).not.toContain(
    `class="performance-category-score">67<small> /100</small>`,
  );
});

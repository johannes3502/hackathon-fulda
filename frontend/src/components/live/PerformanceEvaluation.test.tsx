import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PerformanceEvaluation } from "./PerformanceEvaluation";

it("explains a missing overall score instead of displaying an empty scale", () => {
  const html = renderToStaticMarkup(
    <PerformanceEvaluation input={{ durationMs: 60000 }} />,
  );
  expect(html).toContain("No overall score available");
  expect(html).toContain("Record feedback or run a source check");
  expect(html).not.toContain('class="performance-score"');
});

it.each([
  { verdict: "supports", score: 100 },
  { verdict: "contradicts", score: 0 },
] as const)(
  "displays an available overall score of $score",
  ({ verdict, score }) => {
    const html = renderToStaticMarkup(
      <PerformanceEvaluation
        input={{
          durationMs: 60000,
          factCheck: {
            claims: [
              {
                claim: "Synthetic statement",
                transcript: "Synthetic statement",
                t_ms: 0,
                duration_ms: 1000,
                verdict,
                explanation: "Synthetic comparison",
                checked: ["upload"],
                evidence: {
                  passage: "Synthetic statement",
                  kind: "upload",
                  label: "Synthetic source",
                  quote: "Synthetic statement",
                  quote_verified: "exact",
                },
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
          },
        }}
      />,
    );
    expect(html).toContain(
      `class="performance-score">${score}<small>/100</small>`,
    );
    expect(html).not.toContain("No overall score available");
  },
);

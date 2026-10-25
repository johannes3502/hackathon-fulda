"use client";
import { Gauge } from "lucide-react";
import {
  evaluatePerformance,
  type PerformanceInput,
} from "@/features/evaluation/performance";
import type { EvidenceStatus } from "@/features/scoring/evidence";

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  insufficient: "limited evidence",
  provisional: "provisional",
  reportable: "sufficient evidence",
};

export function PerformanceEvaluation({ input }: { input: PerformanceInput }) {
  const evaluation = evaluatePerformance(input);
  return (
    <section
      className="panel performance-evaluation"
      aria-labelledby="performance-evaluation-title"
    >
      <div className="panel-title-row">
        <h2 id="performance-evaluation-title" tabIndex={-1}>
          <Gauge size={18} /> Evidence profile
        </h2>
        <span className="badge">{evaluation.method}</span>
      </div>
      <p className="field-hint">
        Measured evidence from this take, not a validated grade.
      </p>
      <p className="performance-notice">{evaluation.notice}</p>
      <ul className="performance-categories">
        {evaluation.categories.map((category) => {
          const hasEstimate = category.estimate !== null;
          return (
            <li key={category.category} className="performance-category">
              <div className="performance-category-head">
                <strong>{category.label}</strong>
                <span className="performance-category-score">
                  {hasEstimate ? (
                    <>
                      {category.estimate}
                      <small> /100</small>
                    </>
                  ) : (
                    "counts only"
                  )}
                </span>
              </div>
              <p className="performance-category-meta">
                {hasEstimate &&
                category.low !== null &&
                category.high !== null
                  ? `Range ${category.low}–${category.high}`
                  : "No numeric estimate"}
                {category.status
                  ? ` · ${STATUS_LABELS[category.status]}`
                  : " · counts only"}
                {category.coverage !== null
                  ? ` · ${Math.round(category.coverage * 100)}% decided`
                  : ""}
              </p>
              <p>{category.summary}</p>
              {category.limitation && (
                <p className="muted small">{category.limitation}</p>
              )}
              {category.counts.length > 0 && (
                <ul className="performance-counts">
                  {category.counts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {category.evidence.length > 0 && (
                <ul className="performance-evidence">
                  {category.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="performance-lists">
        <div>
          <h3>What worked</h3>
          {evaluation.strengths.length ? (
            <ul>
              {evaluation.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              No evidence-backed strengths were measured in this take.
            </p>
          )}
        </div>
        <div>
          <h3>Practice next</h3>
          {evaluation.improvements.length ? (
            <ul>
              {evaluation.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              No adjustments were measured. Keep rehearsing.
            </p>
          )}
        </div>
      </div>
      <details className="review-details">
        <summary>Limitations and method</summary>
        <ul className="fact-notices">
          {evaluation.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="field-hint">
          Method: {evaluation.method}. Source grounding uses a smoothed share:
          (supported + 1) ÷ (supported + contradicted + 2), with a Wilson 95%
          range. An estimate stays provisional below five decided statements and
          is withheld without any decided statement. Speech and pose rows count
          measured prototype markers only; they are not converted to a score.
          The rows measure different things, so they are not combined into an
          overall score.
        </p>
      </details>
    </section>
  );
}

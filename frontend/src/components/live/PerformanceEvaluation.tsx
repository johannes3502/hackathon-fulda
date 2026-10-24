"use client";
import { Gauge } from "lucide-react";
import {
  evaluatePerformance,
  type PerformanceInput,
} from "@/features/evaluation/performance";

export function PerformanceEvaluation({ input }: { input: PerformanceInput }) {
  const evaluation = evaluatePerformance(input);
  return (
    <section
      className="panel performance-evaluation"
      aria-labelledby="performance-evaluation-title"
    >
      <div className="panel-title-row">
        <h2 id="performance-evaluation-title" tabIndex={-1}>
          <Gauge size={18} /> Your take at a glance
        </h2>
        {evaluation.score !== null && (
          <span className="badge">{evaluation.label}</span>
        )}
      </div>
      <p className="field-hint">
        Heuristic summary from measured moments, not a validated grade.
      </p>
      <div className="performance-overall">
        <span className="performance-score">
          {evaluation.score === null ? "—" : evaluation.score}
          <small>/100</small>
        </span>
        <span className="performance-label">{evaluation.label}</span>
      </div>
      <ul className="performance-categories">
        {evaluation.categories.map((category) => (
          <li key={category.category} className="performance-category">
            <div className="performance-category-head">
              <strong>{category.label}</strong>
              <span className="performance-category-score">
                {category.score === null ? "—" : category.score}
                <small>
                  {" "}
                  /100 · weight {category.weight}
                </small>
              </span>
            </div>
            <p>{category.summary}</p>
            {category.limitation && (
              <p className="muted small">{category.limitation}</p>
            )}
            {category.evidence.length > 0 && (
              <ul className="performance-evidence">
                {category.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
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
          Method: {evaluation.method}. Content averages verdict points
          (supported = 1, differed = 0, not settled = 0.5); voice and gesture
          deduct 15 points per adjustment per minute from 100, with a floor of
          40. Weights: content 0.5, voice 0.25, gesture 0.25, renormalized when
          a category has no data.
        </p>
      </details>
    </section>
  );
}

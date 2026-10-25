"use client";

import {
  REVIEW_SCORE_VERSION,
  SCORE_LABELS,
  SCORE_STATUS_LABELS,
  type ReviewScore,
  type ScoreCriterion,
} from "@/features/live/review-scores";
import "./review-scores.css";

const seconds = (ms: number) =>
  (ms / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 });
const percent = (value: number) => Math.round(value * 100);

function evidenceText(score: ReviewScore) {
  if (score.value === null && score.source === "moments")
    return score.reason;
  if (score.source === "claims") {
    if (score.supported + score.contradicted === 0)
      return score.unassessed
        ? `${score.unassessed} Aussagen offen · keine entscheidbare Aussage`
        : "Keine Aussagen im Quellencheck";
    return `${score.supported} von ${score.supported + score.contradicted} entscheidbaren Aussagen gestützt · ${percent(score.coverage)} % entscheidbar`;
  }
  if (score.source === "structure") {
    if (score.value === null) return score.reason;
    const available = score.components?.filter((item) => item.available).length;
    return `${available ?? 0}/4 Signale · ${percent(score.coverage)} % Datenabdeckung`;
  }
  if (score.value === null)
    return score.assessedMs > 0
      ? `${seconds(score.assessedMs)} s bewertet · ${percent(score.coverage)} % der Aufnahme`
      : "Noch keine bewertbare Zeit";
  return `${seconds(score.positiveMs)} s positiv · ${seconds(score.attentionMs)} s kritisch · ${percent(score.coverage)} % der Aufnahme`;
}

function unknownText(score: ReviewScore) {
  if (
    score.source !== "claims" ||
    score.unassessed === 0 ||
    score.supported + score.contradicted === 0
  )
    return null;
  return `${score.unassessed} Aussagen offen · nicht als falsch gewertet`;
}

export function ReviewScores({
  scores,
  selected,
  onSelect,
  demo = false,
  recordingTitle,
}: {
  scores: Record<ScoreCriterion, ReviewScore>;
  selected?: ScoreCriterion | null;
  onSelect?: (criterion: ScoreCriterion) => void;
  demo?: boolean;
  recordingTitle?: string;
}) {
  return (
    <section
      data-score-version={REVIEW_SCORE_VERSION}
      className="review-scores"
      aria-label="Evidenzprofil der vier Kriterien"
      lang="de"
    >
      <div className="review-scores-heading">
        <h2>Evidenzprofil dieser Aufnahme</h2>
        <span>
          {demo ? "Demo · " : ""}Prototyp-Evidenzprofil ·{" "}
          {REVIEW_SCORE_VERSION}
        </span>
      </div>
      {recordingTitle && (
        <p className="review-score-origin">
          Daten aus dieser Aufnahme: <strong>{recordingTitle}</strong>. Die vier
          Kriterien messen unterschiedliche Evidenz und werden nicht zu einer
          Gesamtnote verrechnet. Fehlende Messungen bleiben offen.
        </p>
      )}
      <div className="review-score-grid">
        {(Object.entries(SCORE_LABELS) as [ScoreCriterion, string][]).map(
          ([key, label]) => {
            const score = scores[key];
            const unknown = unknownText(score);
            const content = (
              <>
                <span className="review-score-label">{label}</span>
                <strong className="review-score-value">
                  {score.value ?? "–"}
                  {score.value !== null && <small>/100</small>}
                </strong>
                <span className="review-score-range">
                  {score.low !== null && score.high !== null
                    ? `Spanne ${score.low}–${score.high}`
                    : score.status === "insufficient"
                      ? "keine belastbare Schätzung"
                      : "Spanne nicht verfügbar"}
                </span>
                <span
                  className={`review-score-status ${score.status}`}
                  title={`Status: ${SCORE_STATUS_LABELS[score.status]}`}
                >
                  {SCORE_STATUS_LABELS[score.status]}
                </span>
                <span className="review-score-bar" aria-hidden="true">
                  <i style={{ width: `${score.value ?? 0}%` }} />
                </span>
                <span className="review-score-evidence">
                  {evidenceText(score)}
                </span>
                {score.source === "moments" && (
                  <span className="review-score-unknown">
                    Demo · aus vorhandenen Aufbaumomenten, keine neue Analyse
                  </span>
                )}
                {unknown && (
                  <span className="review-score-unknown">{unknown}</span>
                )}
                {score.components && (
                  <span
                    className="review-score-components"
                    role="group"
                    aria-label={`Signale für ${label}`}
                  >
                    {score.components.map((component) => (
                      <span
                        key={component.key}
                        className={
                          component.available ? "available" : "unavailable"
                        }
                        title={component.reason}
                      >
                        <span>{component.label}</span>
                        <small>
                          {component.available && component.score !== null
                            ? `${component.score}/100 · ${component.evidenceCount} ${component.evidenceCount === 1 ? "Beleg" : "Belege"}`
                            : "keine Daten"}
                        </small>
                      </span>
                    ))}
                  </span>
                )}
              </>
            );
            return onSelect ? (
              <button
                key={key}
                type="button"
                className={`review-score-card review418-criterion${selected === key ? " active" : ""}`}
                aria-pressed={selected === key}
                onClick={() => onSelect(key)}
              >
                {content}
              </button>
            ) : (
              <article
                key={key}
                className="review-score-card"
                aria-label={`Evidenzprofil ${label}`}
              >
                {content}
              </article>
            );
          },
        )}
      </div>
      <details className="review-score-method">
        <summary>Wie wird das Evidenzprofil berechnet?</summary>
        <p>
          Sprechfluss und Körper &amp; Gesten: positiv und kritisch bewertete
          Sekunden werden zeitlich zusammengeführt; Überlappungen zählen nur
          einmal. Die geglättete Schätzung ist (positive ms + 1000) ÷ (bewertete
          ms + 2000). Quellenbezug: (gestützte Aussagen + 1) ÷ (gestützte +
          widersprochene Aussagen + 2), nur mit geprüftem Quellenzitat. Die
          Spanne ist ein Wilson-95%-Intervall um die Schätzung.
        </p>
        <p>
          Aufbau: Einstieg, Abschluss, Abschnitte und markierte Übergänge zählen
          gleich. Ein Score entsteht nur mit mindestens drei verfügbaren
          Signalen, 50 Wörtern und 45 Sekunden. Die Abschnittserkennung nutzt
          Wortähnlichkeit und Marker; Folien und Betonung werden nicht geprüft.
          Ohne Transkript bleibt Aufbau offen.
        </p>
        <p>
          Unter 5 Sekunden bewerteter Zeit oder 10 % Abdeckung bzw. ohne
          entscheidbare Aussage steht „–“ statt einer Zahl. Vorläufig bleibt eine
          Schätzung unter 30 Sekunden, unter 30 % Abdeckung oder mit weniger als
          fünf entscheidbaren Aussagen. 0 und 100 werden nur bei mindestens 30
          Sekunden bzw. zehn entscheidbaren Aussagen zugelassen. Die vier
          Kriterien werden nicht zu einem Gesamtscore verrechnet; sie messen
          unterschiedliche Dinge. Der Prototyp ist keine validierte Benotung.
        </p>
      </details>
    </section>
  );
}

"use client";

import {
  REVIEW_SCORE_VERSION,
  SCORE_LABELS,
  type ScoreCriterion,
  type ReviewScore,
} from "@/features/live/review-scores";
import "./review-scores.css";

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
      aria-label="Bewertung der drei Kriterien"
      lang="de"
    >
      <div className="review-scores-heading">
        <h2>Deine drei Kriterien</h2>
        <span>{demo ? "Demo · " : ""}Prototyp-Score · 0–100</span>
      </div>
      {recordingTitle && (
        <p className="review-score-origin">
          Daten aus dieser Aufnahme: <strong>{recordingTitle}</strong>. Kamera-
          und Sprachhinweise sowie vorhandene Quellenchecks bilden die
          Grundlage. Fehlende Messungen bleiben offen.
        </p>
      )}
      <div className="review-score-grid">
        {(Object.entries(SCORE_LABELS) as [ScoreCriterion, string][]).map(
          ([key, label]) => {
            const score = scores[key];
            const content = (
              <>
                <span className="review-score-label">{label}</span>
                <strong className="review-score-value">
                  {score.value ?? "–"}
                  {score.value !== null && <small>/100</small>}
                </strong>
                <span className="review-score-bar" aria-hidden="true">
                  <i style={{ width: `${score.value ?? 0}%` }} />
                </span>
                <span className="review-score-evidence">
                  {score.value === null
                    ? score.source === "claims"
                      ? "Keine entscheidbaren Aussagen"
                      : key === "knowledge"
                        ? "Quellencheck mit geprüftem Zitat erforderlich"
                        : "Noch keine bewertbaren Daten"
                    : score.source === "claims"
                      ? `${score.supported} von ${score.supported + score.contradicted} Aussagen gestützt`
                      : `${(score.assessedMs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s bewertet · ${Math.round(score.coverage * 100)} % der Aufnahme`}
                </span>
                {score.source === "claims" && score.unassessed > 0 && (
                  <span className="review-score-unknown">
                    {score.unassessed} Aussagen offen · nicht als falsch
                    gewertet
                  </span>
                )}
                {score.source === "time" && score.value === 0 && (
                  <span className="review-score-unknown">
                    Nur kritische Evidenz erfasst · kein Gesamturteil
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
                aria-label={`Bewertung ${label}`}
              >
                {content}
              </article>
            );
          },
        )}
      </div>
      <details className="review-score-method">
        <summary>Wie wird der Score berechnet?</summary>
        <p>
          Gestik und Flow: 100 × positiv bewertete Sekunden ÷ (positive +
          kritische Sekunden). Überlappende Hinweise derselben Art zählen
          zeitlich nur einmal. Neutrale Beobachtungen und nicht beobachtete Zeit
          fließen nicht ein.
        </p>
        <p>
          Fachwissen: Wenn ein Quellencheck vorliegt, zählt der Anteil
          gestützter Aussagen an allen gestützten oder widersprochenen Aussagen
          mit geprüftem Quellenzitat. „Nicht gefunden“ und ungeprüfte Aussagen
          bleiben offen. Ohne Quellencheck gelten die bewerteten Zeitanteile.
        </p>
        <p>
          Positive Kamera-Evidenz: gemessener stabiler Oberkörper nahe der
          kalibrierten Referenz. Positive Sprach-Evidenz: gemessener Stimmpegel
          im Referenzbereich während erkannter stimmhafter Sprache. Beide
          brauchen mindestens 2 s zusammenhängende Messungen. Kalibrierung,
          Stille und Messlücken zählen nicht als positive Evidenz. Ältere
          Aufnahmen enthalten diese Messabschnitte möglicherweise noch nicht.
        </p>
        <p>
          Der Score bewertet die erfasste Evidenz dieses Takes. Er ist eine
          offengelegte Prototyp-Heuristik, keine validierte Benotung der
          gesamten Präsentation. Ohne ausreichende Daten steht „–“ statt einer
          erfundenen Zahl.
        </p>
      </details>
    </section>
  );
}

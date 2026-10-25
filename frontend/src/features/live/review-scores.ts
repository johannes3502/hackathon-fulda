import { evidenceVerdict, type ClaimResult } from "../factcheck/api";
import {
  countEvidence,
  timeEvidence,
  wilsonInterval,
  type EvidenceEstimate,
  type EvidenceInterval,
  type EvidenceStatus,
} from "../scoring/evidence";
import type {
  StructureAnalysis,
  StructureComponent,
  StructureComponentKey,
} from "../structure/types";

export const REVIEW_SCORE_VERSION = "evidence-share-v2";
export const SCORE_LABELS = {
  gesture: "Körper & Gesten",
  knowledge: "Quellenbezug",
  flow: "Sprechfluss",
  structure: "Aufbau",
} as const;
export const SCORE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  insufficient: "begrenzte Evidenz",
  provisional: "vorläufig",
  reportable: "ausreichend Daten",
};
export const STRUCTURE_COMPONENT_LABELS: Record<
  StructureComponentKey,
  string
> = {
  opening: "Einstieg",
  closing: "Abschluss",
  sections: "Abschnitte",
  transitions: "Übergänge",
};
export type ScoreCriterion = keyof typeof SCORE_LABELS;
export type ScoreMoment = {
  criterion: ScoreCriterion | null;
  tMs: number;
  durationMs: number;
  kind: "positive" | "attention" | "note";
  assessment?: "positive" | "attention" | "neutral";
};
export type ReviewScoreComponent = {
  key: StructureComponentKey;
  label: string;
  available: boolean;
  score: number | null;
  reason: string;
  evidenceCount: number;
};
export type ReviewScore = EvidenceEstimate & {
  positiveMs: number;
  attentionMs: number;
  assessedMs: number;
  supported: number;
  contradicted: number;
  unassessed: number;
  source: "time" | "claims" | "structure" | "moments";
  reason: string;
  components?: ReviewScoreComponent[];
};

function momentsFor(
  moments: ScoreMoment[],
  criterion: ScoreCriterion,
): ScoreMoment[] {
  return moments.filter((moment) => moment.criterion === criterion);
}

function intervalsFor(moments: ScoreMoment[]) {
  const positive: EvidenceInterval[] = [];
  const concern: EvidenceInterval[] = [];
  for (const moment of moments) {
    if (
      !Number.isFinite(moment.tMs) ||
      !Number.isFinite(moment.durationMs) ||
      moment.durationMs <= 0
    )
      continue;
    const kind = moment.assessment ?? moment.kind;
    if (kind === "positive")
      positive.push({
        startMs: moment.tMs,
        endMs: moment.tMs + moment.durationMs,
      });
    else if (kind === "attention")
      concern.push({
        startMs: moment.tMs,
        endMs: moment.tMs + moment.durationMs,
      });
  }
  return { positive, concern };
}

function timeReason(status: EvidenceStatus) {
  if (status === "insufficient")
    return "Zu wenig bewertete Zeit für eine Schätzung.";
  if (status === "provisional")
    return "Vorläufige Schätzung aus begrenzter bewerteter Zeit.";
  return "Schätzung aus positiv und kritisch bewerteter Zeit.";
}

function timeScore(
  moments: ScoreMoment[],
  durationMs: number,
): ReviewScore {
  const { positive, concern } = intervalsFor(moments);
  const estimate = timeEvidence(positive, concern, durationMs);
  return {
    ...estimate,
    positiveMs: estimate.positiveMs,
    attentionMs: estimate.concernMs,
    assessedMs: estimate.assessedMs,
    supported: 0,
    contradicted: 0,
    unassessed: 0,
    source: "time",
    reason: timeReason(estimate.status),
  };
}

function claimReason(status: EvidenceStatus, claimCount: number) {
  if (!claimCount) return "Keine Aussagen im Quellencheck.";
  if (status === "insufficient")
    return "Keine entscheidbare Aussage mit geprüftem Quellenzitat.";
  if (status === "provisional")
    return "Vorläufige Schätzung aus wenigen entscheidbaren Aussagen.";
  return "Anteil gestützter Aussagen an entscheidbaren Aussagen mit geprüftem Quellenzitat.";
}

function knowledgeScore(
  claims?: Pick<ClaimResult, "verdict" | "evidence">[],
): ReviewScore {
  const verdicts = (claims ?? []).map(evidenceVerdict);
  const supports = verdicts.filter((verdict) => verdict === "supports").length;
  const contradicts = verdicts.filter(
    (verdict) => verdict === "contradicts",
  ).length;
  const unassessed = verdicts.length - supports - contradicts;
  const estimate = countEvidence({
    supports,
    contradicts,
    unassessed,
  });
  return {
    ...estimate,
    positiveMs: 0,
    attentionMs: 0,
    assessedMs: 0,
    supported: supports,
    contradicted: contradicts,
    unassessed,
    source: "claims",
    reason: claims
      ? claimReason(estimate.status, claims.length)
      : "Kein Quellencheck vorhanden.",
  };
}

function structureComponents(
  structure: StructureAnalysis,
): ReviewScoreComponent[] {
  return (
    Object.entries(structure.components) as [
      StructureComponentKey,
      StructureComponent,
    ][]
  ).map(([key, component]) => ({
    key,
    label: STRUCTURE_COMPONENT_LABELS[key],
    available: component.available,
    score: component.available ? Math.round(component.score * 100) : null,
    reason: component.reason,
    evidenceCount: component.evidence.length,
  }));
}

function structureGateReason(structure: StructureAnalysis) {
  const available = Object.values(structure.components).filter(
    (component) => component.available,
  ).length;
  if (structure.wordCount < 50)
    return "Zu wenige Wörter für die Aufbauanalyse (mindestens 50).";
  if (available < 3)
    return "Weniger als drei auswertbare Aufbau-Signale.";
  return "Die Aufnahme ist für eine Aufbau-Schätzung zu kurz (mindestens 45 Sekunden).";
}

function structureScore(
  structure: StructureAnalysis | undefined,
  structureFromMoments: boolean,
  moments: ScoreMoment[],
  durationMs: number,
): ReviewScore {
  if (structure) {
    const components = structureComponents(structure);
    const available = components.filter((component) => component.available);
    if (structure.score !== null && available.length >= 3) {
      const interval = wilsonInterval(
        (structure.score / 100) * available.length,
        available.length,
      );
      return {
        value: structure.score,
        rawValue: structure.score,
        low: Math.round(interval.low * 100),
        high: Math.round(interval.high * 100),
        status:
          structure.confidence === "low" ? "provisional" : "reportable",
        coverage: structure.dataCoverage,
        positiveMs: 0,
        attentionMs: 0,
        assessedMs: 0,
        supported: 0,
        contradicted: 0,
        unassessed: 0,
        source: "structure",
        reason: `${available.length} von 4 Signalen verfügbar: ${available.map((component) => component.label).join(", ")}.`,
        components,
      };
    }
    return {
      value: null,
      rawValue: null,
      low: null,
      high: null,
      status: "insufficient",
      coverage: structure.dataCoverage,
      positiveMs: 0,
      attentionMs: 0,
      assessedMs: 0,
      supported: 0,
      contradicted: 0,
      unassessed: 0,
      source: "structure",
      reason: structureGateReason(structure),
      components,
    };
  }
  if (structureFromMoments) {
    const derived = timeScore(moments, durationMs);
    if (derived.value !== null)
      return {
        ...derived,
        source: "moments",
        reason:
          "Demo: Aufbaumomente aus der Beispielaufnahme, keine neue Analyse.",
      };
    return {
      ...derived,
      source: "moments",
      reason:
        "Demo: Zu wenige Aufbaumomente für eine Schätzung; das Beispiel bleibt bei den Momenten.",
    };
  }
  return {
    value: null,
    rawValue: null,
    low: null,
    high: null,
    status: "insufficient",
    coverage: 0,
    positiveMs: 0,
    attentionMs: 0,
    assessedMs: 0,
    supported: 0,
    contradicted: 0,
    unassessed: 0,
    source: "structure",
    reason: "Keine Aufbauanalyse für diese Aufnahme verfügbar.",
  };
}

export function reviewScores(
  moments: ScoreMoment[],
  durationMs: number,
  claims?: Pick<ClaimResult, "verdict" | "evidence">[],
  structure?: StructureAnalysis,
  options: { structureFromMoments?: boolean } = {},
): Record<ScoreCriterion, ReviewScore> {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const structureMoments = momentsFor(moments, "structure");
  return {
    gesture: timeScore(momentsFor(moments, "gesture"), duration),
    knowledge: knowledgeScore(claims),
    flow: timeScore(momentsFor(moments, "flow"), duration),
    structure: structureScore(
      structure,
      options.structureFromMoments === true,
      structureMoments,
      duration,
    ),
  };
}

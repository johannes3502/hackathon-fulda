import type { LiveFeedback, LiveRecording } from "./contracts";
import { cueAppearance } from "./cue-appearance";
import { factFeedback } from "../factcheck/api";
import { analyzeStructure } from "../structure/analyze";
import type { StructureAnalysis } from "../structure/types";

export const needsPractice = (item: LiveFeedback) =>
  cueAppearance(item, "ready").tone === "attention";

export function reviewMoments(feedback: LiveFeedback[]) {
  return feedback
    .filter((item) => item.category !== "question")
    .sort((a, b) => a.startMs - b.startMs);
}

export function structureForRecording(
  recording: Pick<LiveRecording, "words" | "durationMs" | "structure">,
) {
  if (recording.structure) return recording.structure;
  if (!recording.words?.length) return undefined;
  return analyzeStructure(recording.words, recording.durationMs);
}

function momentRange(
  startMs: number,
  endMs: number,
  durationMs: number,
  minimumMs = 1200,
) {
  if (!(durationMs > 0)) return null;
  const minimum = Math.max(1, Math.min(minimumMs, durationMs));
  let start = Math.max(0, Math.min(startMs, durationMs));
  if (start >= durationMs) start = Math.max(0, durationMs - minimum);
  const end = Math.max(
    start + minimum,
    Math.min(durationMs, Math.max(start, endMs)),
  );
  return end > start ? { startMs: start, endMs: end } : null;
}

function structureMoment(
  id: string,
  kind: LiveFeedback["kind"],
  range: { startMs: number; endMs: number },
  title: string,
  detail: string,
  action: string,
): LiveFeedback {
  return {
    id,
    category: "structure",
    kind,
    startMs: range.startMs,
    endMs: range.endMs,
    title,
    detail,
    action,
  };
}

/** Timeline moments from the deterministic structure rubric, never a new analysis. */
export function structureFeedback(
  structure: StructureAnalysis,
  durationMs: number,
): LiveFeedback[] {
  const moments: LiveFeedback[] = [];
  const opening = structure.components.opening;
  const closing = structure.components.closing;
  const transitions = structure.components.transitions;
  const sections = structure.components.sections;
  const openingEvidence = opening.evidence[0];
  const closingEvidence = closing.evidence[0];
  const openingRange = openingEvidence
    ? momentRange(
        openingEvidence.startMs,
        openingEvidence.endMs,
        durationMs,
      )
    : null;
  if (opening.available && opening.score > 0 && openingRange)
    moments.push(
      structureMoment(
        "structure-opening",
        "positive",
        openingRange,
        "Einstieg erkannt",
        `Der Einstieg enthält „${openingEvidence?.label.replace(/^Einstieg: /, "")}“. Die Analyse prüft nur Wörter und Zeitstempel; prüfe im Video, ob der Einstieg zum Publikum passt.`,
        "Behalte den kurzen Wegweiser bei und kündige Thema und Ablauf weiter an.",
      ),
    );
  else if (opening.available && opening.score === 0) {
    const range = momentRange(0, 2000, durationMs, 600);
    if (range)
      moments.push(
        structureMoment(
          "structure-opening",
          "attention",
          range,
          "Kein Einstiegssignal erkannt",
          "In den ersten zwei Sätzen wurde kein typisches Einstiegssignal gefunden. Das ist eine Heuristik und kein Fehler.",
          "Kündige Thema und Ablauf in einem Satz an, bevor du ins Detail gehst.",
        ),
      );
  }

  if (closing.available && closing.score > 0 && closingEvidence) {
    const range = momentRange(
      closingEvidence.startMs,
      closingEvidence.endMs,
      durationMs,
    );
    if (range)
      moments.push(
        structureMoment(
          "structure-closing",
          "positive",
          range,
          "Abschluss erkannt",
          `Der Abschluss enthält „${closingEvidence.label.replace(/^Abschluss: /, "")}“. Prüfe, ob Kernaussage und nächster Schritt beim Publikum ankommen.`,
          "Behalte den Abschluss bei und lass die letzte Aussage kurz stehen.",
        ),
      );
  } else if (closing.available && closing.score === 0) {
    const range = momentRange(
      Math.max(0, durationMs - 2000),
      durationMs,
      durationMs,
      600,
    );
    if (range)
      moments.push(
        structureMoment(
          "structure-closing",
          "attention",
          range,
          "Kein Abschlusssignal erkannt",
          "In den letzten zwei Sätzen wurde kein typisches Abschlusssignal gefunden. Das ist eine Heuristik und kein Fehler.",
          "Fasse Kernaussage und nächsten Schritt in einem Satz zusammen.",
        ),
      );
  }

  if (transitions.available && transitions.evidence.length)
    transitions.evidence
      .slice(0, 4)
      .forEach((evidence, index) => {
        const range = momentRange(
          evidence.startMs,
          evidence.endMs,
          durationMs,
        );
        if (range)
          moments.push(
            structureMoment(
              `structure-transition-${index}`,
              "positive",
              range,
              "Markierter Übergang",
              `„${evidence.label.replace(/^Übergang: /, "")}“ markiert einen Übergang. Ob er inhaltlich passt, zeigt erst der Kontext.`,
              "Prüfe im Video, ob der Übergang den nächsten Gedanken ankündigt.",
            ),
          );
      });

  if (sections.available && sections.score > 0)
    structure.sections.slice(1).forEach((section) => {
      const range = momentRange(
        section.startMs,
        section.startMs + 1600,
        durationMs,
        1200,
      );
      if (range)
        moments.push(
          structureMoment(
            `structure-section-${section.index}`,
            "observation",
            range,
            `Abschnitt ${section.index}`,
            `Ab hier beginnt ein neuer Abschnitt (${section.sentenceCount} Sätze). Die Grenze wurde aus Wortähnlichkeit oder einem Marker geschätzt.`,
            "Prüfe im Video, ob der Abschnitt an dieser Stelle beginnt.",
          ),
        );
    });

  return reviewMoments(moments);
}

/** Keep saved source-check annotations aligned with the take's latest verdicts. */
export function recordingFeedback(
  recording: Pick<
    LiveRecording,
    "feedback" | "factCheck" | "durationMs" | "words" | "structure"
  >,
) {
  const base = !recording.factCheck
    ? reviewMoments(recording.feedback)
    : reviewMoments([
        ...recording.feedback.filter(
          (item) =>
            item.category.toLowerCase() !== "fact" &&
            !/^fact-\d+$/.test(item.id),
        ),
        ...factFeedback(recording.factCheck, recording.durationMs),
      ]);
  const structure = structureForRecording(recording);
  return structure
    ? reviewMoments([...base, ...structureFeedback(structure, recording.durationMs)])
    : base;
}

export function playbackAnnotation(
  feedback: LiveFeedback[],
  positionMs: number,
  selected: LiveFeedback | null,
) {
  const active = (item: LiveFeedback) =>
    positionMs >= item.startMs && positionMs <= item.endMs;
  return selected && active(selected)
    ? selected
    : (reviewMoments(feedback).find(
        (item) => active(item) && needsPractice(item),
      ) ?? null);
}

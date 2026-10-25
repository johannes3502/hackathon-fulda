import { stageFetch } from "./http";

export type StagePitchEvidence = {
  label: string;
  quote: string;
};

export type StagePitchQuestion = {
  id: string;
  question: string;
  reason: string;
  evidence?: StagePitchEvidence;
  answer_points: string[];
};

export type StagePitchContext = {
  question: StagePitchQuestion;
  prompt: string;
  notices: string[];
};

export type PitchSource = "backend" | "fallback";

export const PITCH_ENDPOINTS = [
  "/api/questions/pitch",
  "/questions/pitch",
] as const;

export const PITCH_QUESTION_TEXT =
  "Eure Demo verarbeitet Kamera- und Mikrofonaufnahmen. Welche Daten verlassen den Laptop, und was passiert mit der Originalaufnahme?";

/**
 * Identical offline copy of the backend's fixed jury context. The stage must
 * never depend on the backend, an LLM, sources or ElevenLabs to ask its one
 * prepared question.
 */
export const PITCH_FALLBACK: StagePitchContext = {
  question: {
    id: "pitch-privacy",
    question: PITCH_QUESTION_TEXT,
    reason: "Die Frage prüft die Datenschutz-Aussage der Demo.",
    evidence: {
      label: "418 Pitch · Datenschutz",
      quote:
        "Die Aufnahme bleibt im Browser. Für die Analyse geht der Take an den lokalen Backend-Server; die Originaldatei wird nach der Verarbeitung gelöscht.",
    },
    answer_points: [
      "Das Review-Video bleibt lokal im Browser und wird nicht als Server-Clip gespeichert.",
      "Der Take geht für die Analyse an den lokalen Backend-Server; die Originaldatei wird nach der Verarbeitung gelöscht.",
      "Transkript, Events und geprüfte Quellen bleiben in Postgres bzw. im lokalen Objektspeicher.",
      "Deepgram und ElevenLabs sind optionale Cloud-Anbieter und standardmäßig aus; ohne Schlüssel bleibt Whisper lokal.",
      "Für die Jury werden nur synthetische Demo-Daten verwendet, keine echten Personenaufnahmen an Cloud-APIs.",
    ],
  },
  prompt: [
    "Du bist die Jury im Finale des 8. Hackathon Fulda 2026 und sprichst Deutsch.",
    "Das Produkt ist ein lokaler Prototyp für Präsentationstraining. Die Präsentation ist beendet.",
    "Stelle genau die folgende eine Frage und keine andere:",
    PITCH_QUESTION_TEXT,
    "Warte auf die Antwort. Stelle keine Nachfrage, wiederhole die Frage nicht und frage nicht nach einer Quelle. Bewerte nicht, gib keine Punkte, keine Note und keine Aussage über die Person. Wenn die Antwort kommt, bedanke dich kurz und beende das Gespräch.",
    "Die Antwortpunkte sind nur internes Referenzmaterial. Lies sie nicht vor und verrate sie nicht, bevor die Person geantwortet hat.",
  ].join("\n"),
  notices: [
    "Vorbereitete Jury-Frage · genau eine Frage, keine Nachfrage, keine Bewertung.",
    "Der Kontext ist fest hinterlegt und benötigt weder LLM noch Quellenabruf.",
  ],
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Accept only the documented contract and discard provider-specific fields. */
export function parsePitchContext(value: unknown): StagePitchContext | null {
  if (!isObject(value) || !isObject(value.question)) return null;
  const question = value.question;
  if (
    typeof question.id !== "string" ||
    !question.id ||
    typeof question.question !== "string" ||
    !question.question ||
    typeof question.reason !== "string" ||
    !Array.isArray(question.answer_points) ||
    !question.answer_points.every((point) => typeof point === "string") ||
    typeof value.prompt !== "string" ||
    !Array.isArray(value.notices) ||
    !value.notices.every((notice) => typeof notice === "string")
  )
    return null;

  let evidence: StagePitchEvidence | undefined;
  if (question.evidence != null) {
    if (
      !isObject(question.evidence) ||
      typeof question.evidence.label !== "string" ||
      typeof question.evidence.quote !== "string"
    )
      return null;
    evidence = {
      label: question.evidence.label,
      quote: question.evidence.quote,
    };
  }

  return {
    question: {
      id: question.id,
      question: question.question,
      reason: question.reason,
      ...(evidence ? { evidence } : {}),
      answer_points: [...question.answer_points],
    },
    prompt: value.prompt,
    notices: [...value.notices],
  };
}

/**
 * The browser first asks the proxied API path and then a root path for
 * deployments that expose the API directly. Any failure falls back to the
 * identical local question.
 */
export async function loadPitchContext(
  signal: AbortSignal,
): Promise<{ context: StagePitchContext; source: PitchSource }> {
  for (const endpoint of PITCH_ENDPOINTS) {
    try {
      const response = await stageFetch(endpoint, signal, 5_000);
      if (!response.ok) continue;
      const context = parsePitchContext(await response.json().catch(() => null));
      if (context) return { context, source: "backend" };
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return { context: PITCH_FALLBACK, source: "fallback" };
}

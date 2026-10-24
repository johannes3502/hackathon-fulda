import type { components } from "../../../../api/schema";
import { isObject, runBackendJob } from "../../lib/backend-job";
import type { ClaimResult } from "../factcheck/api";
import type { LiveFeedback, Word } from "../live/contracts";

export type Question = components["schemas"]["Question"];
export type QuestionKind = Question["kind"];
export type QuestionResult = components["schemas"]["QuestionResult"];
export type AnswerReview = components["schemas"]["AnswerReview"];
export type QuestionAnswer = { answer: string; review: AnswerReview };
export type Persona = QuestionResult["persona"];

export const PERSONA_LABELS: Record<Persona, { name: string; detail: string }> =
  {
    student: {
      name: "Curious student",
      detail: "Asks naive, direct questions about terms, reasons and examples.",
    },
    tutor: {
      name: "Professor / tutor",
      detail: "Probes precisely and critically, asks for reasons and sources.",
    },
  };

export const KIND_LABELS: Record<QuestionKind, string> = {
  contradiction: "Source says otherwise",
  unsupported: "Not backed by your sources",
  gap: "Missing from your talk",
  clarification: "Needs clarification",
  follow_up: "Follow-up",
};

export const ANSWER_LABELS: Record<AnswerReview["verdict"], string> = {
  supports: "Your answer matches the source",
  contradicts: "Source says otherwise",
  not_found: "Not found in sources",
  unchecked: "Could not be compared",
};

const validQuestion = (q: unknown): q is Question =>
  isObject(q) &&
  typeof q.id === "string" &&
  typeof q.question === "string" &&
  typeof q.kind === "string" &&
  q.kind in KIND_LABELS &&
  (q.t_ms === null || q.t_ms === undefined || typeof q.t_ms === "number");

function validResult(value: unknown): value is QuestionResult {
  return (
    isObject(value) &&
    Array.isArray(value.questions) &&
    Array.isArray(value.notices) &&
    value.questions.every(validQuestion)
  );
}

function validReview(value: unknown): value is AnswerReview {
  return (
    isObject(value) &&
    typeof value.verdict === "string" &&
    value.verdict in ANSWER_LABELS &&
    (value.follow_up == null || validQuestion(value.follow_up))
  );
}

/** Generate follow-up questions from transcript, fact-check findings and sources. */
export function generateQuestions(
  endpoint: string,
  input: {
    words: Word[];
    collectionId: string | null;
    claims: ClaimResult[];
    persona: Persona;
  },
  signal: AbortSignal,
  pollMs = 1500,
): Promise<QuestionResult> {
  return runBackendJob(
    endpoint,
    {
      path: "/questions",
      statusPath: "/questions/jobs",
      body: {
        words: input.words,
        collection_id: input.collectionId,
        claims: input.claims,
        persona: input.persona,
      },
      label: "question simulator",
      valid: validResult,
    },
    signal,
    pollMs,
  );
}

/** Compare a typed answer with the question's evidence and the uploaded sources. */
export function reviewAnswer(
  endpoint: string,
  input: {
    question: Question;
    answer: string;
    collectionId: string | null;
    persona: Persona;
  },
  signal: AbortSignal,
  pollMs = 1000,
): Promise<AnswerReview> {
  return runBackendJob(
    endpoint,
    {
      path: "/questions/answers",
      statusPath: "/questions/answers",
      body: {
        question: input.question,
        answer: input.answer,
        collection_id: input.collectionId,
        persona: input.persona,
      },
      label: "answer review",
      valid: validReview,
    },
    signal,
    pollMs,
  );
}

/** Upload a spoken answer; the backend transcribes it, then compares it like a typed one. */
export function reviewVoiceAnswer(
  endpoint: string,
  input: {
    question: Question;
    recording: Blob;
    collectionId: string | null;
    persona: Persona;
  },
  signal: AbortSignal,
  pollMs = 1000,
): Promise<AnswerReview> {
  const body = new FormData();
  body.append(
    "recording",
    input.recording,
    input.recording.type.includes("mp4") ? "answer.mp4" : "answer.webm",
  );
  body.append(
    "request",
    JSON.stringify({
      question: input.question,
      collection_id: input.collectionId,
      persona: input.persona,
    }),
  );
  return runBackendJob(
    endpoint,
    {
      path: "/questions/answers/voice",
      statusPath: "/questions/answers",
      body,
      label: "spoken answer",
      valid: validReview,
    },
    signal,
    pollMs,
  );
}

/** Insert a follow-up right after the question it was asked about. */
export function withFollowUp(
  questions: Question[],
  parentId: string,
  followUp: Question,
): Question[] {
  if (questions.some((q) => q.id === followUp.id)) return questions;
  const index = questions.findIndex((q) => q.id === parentId);
  const next = [...questions];
  next.splice(index < 0 ? next.length : index + 1, 0, followUp);
  return next;
}

const KIND: Record<QuestionKind, LiveFeedback["kind"]> = {
  contradiction: "attention",
  unsupported: "suggestion",
  gap: "suggestion",
  clarification: "suggestion",
  follow_up: "suggestion",
};

/** Timeline moments for questions about a spoken passage; ids start with `question-`. */
export function questionFeedback(
  questions: Question[],
  durationMs: number,
): LiveFeedback[] {
  return questions.flatMap((q) => {
    if (q.t_ms === null || q.t_ms === undefined) return [];
    const startMs = Math.min(Math.max(0, q.t_ms), durationMs);
    return [
      {
        id: `question-${q.id}`,
        category: "question",
        kind: KIND[q.kind],
        startMs,
        endMs: Math.min(durationMs, startMs + (q.duration_ms ?? 0)),
        title: `Question: ${q.question}`,
        detail: q.reason || KIND_LABELS[q.kind],
        action:
          "Rewatch this passage, then answer the question in the question simulator.",
      },
    ];
  });
}

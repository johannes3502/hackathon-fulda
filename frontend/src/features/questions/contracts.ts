import type { components } from "../../../../api/schema";

// Retained for saved takes and evidence-based post-round evaluation. New web
// conversations use the ElevenLabs adapter in agent.ts; typed rounds remain
// available through the backend API.
export type Question = components["schemas"]["Question"];
export type QuestionResult = components["schemas"]["QuestionResult"] & {
  roundId: string | null;
};
export type AnswerReview = components["schemas"]["AnswerReview"];
export type QuestionAnswer = { answer: string; review: AnswerReview };

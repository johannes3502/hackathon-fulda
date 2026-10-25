import type { components } from "../../../../api/schema";

// Saved takes can still contain results from the retired typed practice UI.
export type Question = components["schemas"]["Question"];
export type QuestionResult = components["schemas"]["QuestionResult"];
export type AnswerReview = components["schemas"]["AnswerReview"];
export type QuestionAnswer = { answer: string; review: AnswerReview };

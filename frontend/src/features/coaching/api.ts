import type { components } from "../../../../api/schema";
import type { LiveFeedback } from "../live/contracts";
import { request } from "../live/analysis";
import { UUID } from "../sources/api";

export type CoachingReport = components["schemas"]["CoachingReport"];
export type AnswerReview = components["schemas"]["AnswerReview"];
export type FactCheck = components["schemas"]["FactCheck"];
export type Citation = components["schemas"]["Citation"];
export type CoachingState = {
  jobId: string;
  report: CoachingReport | null;
  error: string | null;
  answers: AnswerReview[];
  answerJobs: {
    id: string;
    questionId: string;
    status: "pending" | "complete" | "failed";
    error: string | null;
  }[];
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const verdict = (v: unknown) =>
  v === null || ["supports", "contradicts", "not_found"].includes(String(v));
const citations = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.every(
    (c) =>
      object(c) &&
      typeof c.quote === "string" &&
      typeof c.filename === "string" &&
      typeof c.source_id === "string" &&
      Number.isInteger(c.chunk_id) &&
      object(c.location) &&
      ["page", "slide", "paragraph", "line"].includes(
        String(c.location.kind),
      ) &&
      Number.isInteger(c.location.start) &&
      Number.isInteger(c.location.end),
  );

export function acceptedJob(value: unknown): string {
  if (
    !object(value) ||
    typeof value.job_id !== "string" ||
    !UUID.test(value.job_id)
  )
    throw new Error("The server returned an invalid coaching job.");
  return value.job_id;
}

export function parseCoachingJob(
  value: unknown,
  id: string,
): components["schemas"]["CoachingJob"] {
  if (
    !object(value) ||
    value.job_id !== id ||
    !["queued", "running", "completed", "failed"].includes(String(value.status))
  )
    throw new Error("The server returned an invalid coaching job.");
  if (value.status === "completed") {
    const report = value.report,
      answer = value.answer;
    if (object(report)) {
      if (
        typeof report.model !== "string" ||
        typeof report.collection_id !== "string" ||
        !Array.isArray(report.notices) ||
        !report.notices.every((n) => typeof n === "string") ||
        !Array.isArray(report.checks) ||
        !report.checks.every(
          (c) =>
            object(c) &&
            typeof c.id === "string" &&
            typeof c.statement === "string" &&
            typeof c.explanation === "string" &&
            typeof c.t_ms === "number" &&
            Number.isFinite(c.t_ms) &&
            c.t_ms >= 0 &&
            typeof c.duration_ms === "number" &&
            Number.isFinite(c.duration_ms) &&
            c.duration_ms >= 0 &&
            verdict(c.verdict) &&
            citations(c.citations),
        ) ||
        !Array.isArray(report.questions) ||
        !report.questions.every(
          (q) =>
            object(q) &&
            typeof q.id === "string" &&
            typeof q.text === "string" &&
            typeof q.reason === "string" &&
            typeof q.t_ms === "number" &&
            Number.isFinite(q.t_ms) &&
            q.t_ms >= 0,
        )
      )
        throw new Error("The server returned an invalid source review.");
    } else if (
      !object(answer) ||
      typeof answer.question_id !== "string" ||
      typeof answer.answer !== "string" ||
      typeof answer.explanation !== "string" ||
      typeof answer.model !== "string" ||
      !(answer.follow_up === null || typeof answer.follow_up === "string") ||
      !verdict(answer.verdict) ||
      !citations(answer.citations)
    )
      throw new Error("The server returned an invalid answer review.");
  }
  return value as unknown as components["schemas"]["CoachingJob"];
}

export async function waitForCoaching(
  endpoint: string,
  id: string,
  signal: AbortSignal,
) {
  const active = AbortSignal.any([signal, AbortSignal.timeout(660000)]);
  while (true) {
    const job = parseCoachingJob(
      await request(endpoint, `/coaching/jobs/${id}`, active),
      id,
    );
    if (job.status === "failed")
      throw new Error(
        job.error || "Source review failed. Your recording is preserved.",
      );
    if (job.status === "completed") return job;
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(active.reason);
      };
      const timer = setTimeout(() => {
        active.removeEventListener("abort", abort);
        resolve();
      }, 1000);
      active.addEventListener("abort", abort, { once: true });
      if (active.aborted) abort();
    });
  }
}

export function verdictLabel(value: FactCheck["verdict"]) {
  return value === null
    ? "Citation needs review"
    : {
        supports: "Supported by sources",
        contradicts: "Conflicts with sources",
        not_found: "Not found in sources",
      }[value];
}

export function factFeedback(
  check: FactCheck,
  durationMs: number,
): LiveFeedback {
  return {
    id: `fact-${check.id}`,
    category: "Sources",
    kind: check.verdict === "contradicts" ? "attention" : "observation",
    startMs: Math.min(durationMs, check.t_ms),
    endMs: Math.min(durationMs, check.t_ms + check.duration_ms),
    title: verdictLabel(check.verdict),
    detail: check.explanation,
    action:
      "Compare the statement and cited passage in context. A source comparison is not a truth score.",
  };
}

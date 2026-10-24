import type { components } from "../../../../api/schema";
import type { LiveFeedback, Word } from "../live/contracts";

export type FactCheckSettings = components["schemas"]["FactCheckSettings"];
export type FactCheckResult = components["schemas"]["FactCheckResult"];
export type ClaimResult = components["schemas"]["ClaimResult"];
export type Verdict = ClaimResult["verdict"];

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export const VERDICT_LABELS: Record<Verdict, string> = {
  supports: "Supported by source",
  contradicts: "Source says otherwise",
  not_found: "Not found in sources",
  unchecked: "Could not be checked",
};

async function call(
  endpoint: string,
  path: string,
  signal: AbortSignal,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = `: ${body.detail}`;
    } catch {}
    throw new Error(
      `Backend ${path} failed (HTTP ${response.status})${detail}`,
    );
  }
  return response.json();
}

export async function factCheckSettings(endpoint: string, signal: AbortSignal) {
  const value = await call(endpoint, "/factcheck/settings", signal);
  if (!object(value) || typeof value.available !== "boolean")
    throw new Error("The backend returned invalid fact-check settings.");
  return value as FactCheckSettings;
}

function validResult(value: unknown): value is FactCheckResult {
  return (
    object(value) &&
    Array.isArray(value.claims) &&
    Array.isArray(value.notices) &&
    value.claims.every(
      (c) =>
        object(c) &&
        typeof c.claim === "string" &&
        typeof c.t_ms === "number" &&
        typeof c.duration_ms === "number" &&
        typeof c.verdict === "string" &&
        c.verdict in VERDICT_LABELS,
    )
  );
}

/** Start the backend job and poll until it finishes (at most 11 minutes). */
export async function runFactCheck(
  endpoint: string,
  input: { words: Word[]; collectionId: string | null; useWeb: boolean },
  signal: AbortSignal,
  pollMs = 1500,
): Promise<FactCheckResult> {
  const accepted = await call(endpoint, "/factcheck", signal, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      words: input.words,
      collection_id: input.collectionId,
      use_web: input.useWeb,
    }),
  });
  if (
    !object(accepted) ||
    typeof accepted.job_id !== "string" ||
    !UUID.test(accepted.job_id)
  )
    throw new Error("The backend returned an invalid fact-check job.");
  const active = AbortSignal.any([signal, AbortSignal.timeout(660000)]);
  while (true) {
    active.throwIfAborted();
    const job = await call(
      endpoint,
      `/factcheck/jobs/${accepted.job_id}`,
      active,
    );
    if (!object(job) || job.job_id !== accepted.job_id)
      throw new Error("The backend returned an invalid fact-check job.");
    if (job.status === "failed")
      throw new Error(
        typeof job.error === "string" ? job.error : "The fact-check failed.",
      );
    if (job.status === "completed") {
      if (!validResult(job.result))
        throw new Error("The backend returned an invalid fact-check.");
      return job.result;
    }
    if (job.status !== "queued" && job.status !== "running")
      throw new Error("The backend returned an invalid fact-check job.");
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(active.reason);
      };
      const timer = setTimeout(() => {
        active.removeEventListener("abort", abort);
        resolve();
      }, pollMs);
      active.addEventListener("abort", abort, { once: true });
    });
  }
}

const KIND: Record<Verdict, LiveFeedback["kind"]> = {
  supports: "positive",
  contradicts: "attention",
  not_found: "suggestion",
  unchecked: "suggestion",
};

/** Timeline moments; ids start with `fact-` so a re-run replaces them. */
export function factFeedback(
  result: FactCheckResult,
  durationMs: number,
): LiveFeedback[] {
  return result.claims.map((claim, index) => {
    const startMs = Math.min(Math.max(0, claim.t_ms), durationMs);
    const evidence = claim.evidence
      ? ` ${claim.evidence.label}: “${claim.evidence.quote}”`
      : "";
    return {
      id: `fact-${index}`,
      category: "fact",
      kind: KIND[claim.verdict],
      startMs,
      endMs: Math.min(durationMs, startMs + claim.duration_ms),
      title: `${VERDICT_LABELS[claim.verdict]}: ${claim.claim}`,
      detail: `${claim.explanation || "No explanation from the model."}${evidence}`,
      action:
        claim.verdict === "contradicts"
          ? "Compare what you said with the quoted source and decide which is correct."
          : claim.verdict === "supports"
            ? "The quoted passage backs this statement; you could cite it."
            : "Consider adding a source for this statement or rephrasing it.",
    };
  });
}

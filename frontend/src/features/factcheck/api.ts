import type { components } from "../../../../api/schema";
import { callBackend, isObject, runBackendJob } from "../../lib/backend-job";
import type { LiveFeedback, Word } from "../live/contracts";

export type FactCheckSettings = components["schemas"]["FactCheckSettings"];
export type FactCheckResult = components["schemas"]["FactCheckResult"];
export type ClaimResult = components["schemas"]["ClaimResult"];
export type Verdict = ClaimResult["verdict"];

export const VERDICT_LABELS: Record<Verdict, string> = {
  supports: "Supported by source",
  contradicts: "Source says otherwise",
  not_found: "Not found in sources",
  unchecked: "Could not be checked",
};

export async function factCheckSettings(endpoint: string, signal: AbortSignal) {
  const value = await callBackend(endpoint, "/factcheck/settings", signal);
  if (!isObject(value) || typeof value.available !== "boolean")
    throw new Error("The backend returned invalid fact-check settings.");
  return value as FactCheckSettings;
}

function validResult(value: unknown): value is FactCheckResult {
  return (
    isObject(value) &&
    Array.isArray(value.claims) &&
    Array.isArray(value.notices) &&
    value.claims.every(
      (c) =>
        isObject(c) &&
        typeof c.claim === "string" &&
        typeof c.t_ms === "number" &&
        typeof c.duration_ms === "number" &&
        typeof c.verdict === "string" &&
        c.verdict in VERDICT_LABELS,
    )
  );
}

/** Start the backend job and poll until it finishes (at most 11 minutes). */
export function runFactCheck(
  endpoint: string,
  input: { words: Word[]; collectionId: string | null; useWeb: boolean },
  signal: AbortSignal,
  pollMs = 1500,
): Promise<FactCheckResult> {
  return runBackendJob(
    endpoint,
    {
      path: "/factcheck",
      statusPath: "/factcheck/jobs",
      body: {
        words: input.words,
        collection_id: input.collectionId,
        use_web: input.useWeb,
      },
      label: "fact-check",
      valid: validResult,
    },
    signal,
    pollMs,
  );
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

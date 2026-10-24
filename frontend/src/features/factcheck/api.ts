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
  unchecked: "observation",
};
const EXPLANATION: Record<Verdict, string> = {
  supports:
    "The quoted passage supports this specific statement according to the source comparison; this does not assess the whole talk.",
  contradicts:
    "The talk and cited passage contain different information. Resolve the difference before reusing the statement; sources can also be wrong.",
  not_found:
    "No evidence was found in the checked sources. This does not mean the statement is false; its basis remains unresolved.",
  unchecked:
    "The source comparison did not complete technically. This does not establish a content error.",
};

/** Timeline moments; ids start with `fact-` so a re-run replaces them. */
export function factFeedback(
  result: FactCheckResult,
  durationMs: number,
): LiveFeedback[] {
  return result.claims.map((claim, index) => {
    const verdict =
      claim.verdict === "supports" && !claim.evidence?.quote_verified
        ? "unchecked"
        : claim.verdict;
    const startMs = Math.min(Math.max(0, claim.t_ms), durationMs);
    const evidence = claim.evidence
      ? ` ${claim.evidence.label}: “${claim.evidence.quote}”`
      : "";
    return {
      id: `fact-${index}`,
      category: "fact",
      kind: KIND[verdict],
      startMs,
      endMs: Math.min(durationMs, startMs + claim.duration_ms),
      title: `${VERDICT_LABELS[verdict]}: ${claim.claim}`,
      detail: `${verdict === claim.verdict && claim.explanation ? `${claim.explanation} ` : ""}${EXPLANATION[verdict]}${evidence}`,
      action:
        verdict === "contradicts"
          ? "Compare wording, numbers and scope. Correct the statement or explain with evidence why the source differs."
          : verdict === "supports"
            ? "Keep the supported wording and name the source and page or slide with this statement."
            : verdict === "unchecked"
              ? "Check the statement against your material yourself and retry the source comparison when the service is available."
              : "Add a relevant source or label the statement as an assumption and narrow its scope.",
    };
  });
}

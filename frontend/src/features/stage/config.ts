export type StageAnalysisMode = "live" | "local";

export const STAGE_ANSWER_MS = 90_000;

export const STAGE_LINKS = {
  live: "/live?stage=1",
  local: "/live?stage=1&local=1",
  review: "/review-preview",
} as const;

/**
 * `/stage` is a demo surface and enabled by default. Only an explicit `0`
 * hides it, so a forgotten variable cannot remove the jury path.
 */
export function stageModeEnabled(value: string | undefined): boolean {
  return value?.trim() !== "0";
}

/** Backend analysis is opt-in; a missing setting keeps the instant local path. */
export function stageAnalysisMode(
  value: string | undefined,
): StageAnalysisMode {
  return value?.trim().toLowerCase() === "live" ? "live" : "local";
}

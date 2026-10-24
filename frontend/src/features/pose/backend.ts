import type { PoseOptions } from "./options";
export type PoseDelegate = "GPU" | "CPU";

export type PoseBackend = {
  pose: PoseDelegate;
  hand: PoseDelegate | null;
  renderer: string | null;
  fallback: string | null;
  handFallback: string | null;
  handError: string | null;
  runtimeFallback: boolean;
  model?: PoseOptions["model"];
  runningMode?: PoseOptions["runningMode"];
};

const delegate = (value: unknown): PoseDelegate | null =>
  value === "GPU" || value === "CPU" ? value : null;

const note = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

export function poseBackend(value: unknown): PoseBackend | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const pose = delegate(record.pose);
  if (!pose) return null;
  return {
    ...(record.model === "lite" || record.model === "heavy"
      ? { model: record.model }
      : {}),
    ...(record.runningMode === "IMAGE" || record.runningMode === "VIDEO"
      ? { runningMode: record.runningMode }
      : {}),
    pose,
    hand: delegate(record.hand),
    renderer: note(record.renderer),
    fallback: note(record.fallback),
    handFallback: note(record.handFallback),
    handError: note(record.handError),
    runtimeFallback: record.runtimeFallback === true,
  };
}

export function backendLabel(
  backend: PoseBackend | null,
  handModel: boolean | null,
) {
  if (!backend) return "detecting acceleration";
  const hand =
    handModel === false || !backend.hand
      ? "hands off"
      : `hands ${backend.hand}`;
  const model =
    backend.model && backend.runningMode
      ? ` · ${backend.model} / ${backend.runningMode}`
      : "";
  return `pose ${backend.pose} · ${hand}${model}`;
}

export function fallbackLabel(backend: PoseBackend | null) {
  if (!backend) return null;
  return backend.fallback ?? backend.handFallback;
}

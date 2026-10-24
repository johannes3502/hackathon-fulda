export type PoseDelegate = "GPU" | "CPU";

export type PoseBackend = {
  pose: PoseDelegate;
  hand: PoseDelegate | null;
  renderer: string | null;
  fallback: string | null;
  handFallback: string | null;
  handError: string | null;
  runtimeFallback: boolean;
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
  return `pose ${backend.pose} · ${hand}`;
}

export function fallbackLabel(backend: PoseBackend | null) {
  if (!backend) return null;
  return backend.fallback ?? backend.handFallback;
}

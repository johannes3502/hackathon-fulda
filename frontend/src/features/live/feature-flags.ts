import { DEFAULT_POSE_OPTIONS, type PoseOptions } from "../pose/options";

export type FeatureFlags = PoseOptions & {
  liveSpeechFeedback: boolean;
  speechFeedback: boolean;
  pauseFeedback: boolean;
  paceFeedback: boolean;
  fillerFeedback: boolean;
  volumeFeedback: boolean;
  pitchFeedback: boolean;
};

// These flags select feedback markers; the studio always uses backend analysis.
export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  ...DEFAULT_POSE_OPTIONS,
  liveSpeechFeedback: true,
  speechFeedback: true,
  pauseFeedback: true,
  paceFeedback: true,
  fillerFeedback: true,
  volumeFeedback: true,
  pitchFeedback: true,
});

export const SPEECH_FEEDBACK_FLAGS = [
  ["pauseFeedback", "Pauses"],
  ["paceFeedback", "Speaking pace"],
  ["fillerFeedback", "Filler words"],
  ["volumeFeedback", "Volume"],
  ["pitchFeedback", "Pitch variation"],
] as const;

const categories = {
  pause: "pauseFeedback",
  pace: "paceFeedback",
  filler: "fillerFeedback",
  volume: "volumeFeedback",
  pitch: "pitchFeedback",
} as const;

export function feedbackEnabled(
  category: string,
  flags: FeatureFlags = DEFAULT_FEATURE_FLAGS,
) {
  const flag = categories[category.toLowerCase() as keyof typeof categories];
  return !flag || (flags.speechFeedback && flags[flag]);
}

// Admin-managed options persist per browser; Pose lab resets on reload.
const STORAGE_KEY = "pitchcoach.featureFlags";
const ALLOWED: {
  [K in keyof FeatureFlags]?: readonly FeatureFlags[K][];
} = {
  runningMode: ["VIDEO", "IMAGE"],
  model: ["lite", "heavy"],
  handTracking: [true, false],
  speechFeedback: [true, false],
  pauseFeedback: [true, false],
  paceFeedback: [true, false],
  fillerFeedback: [true, false],
  volumeFeedback: [true, false],
  pitchFeedback: [true, false],
};
let current: Readonly<FeatureFlags> | null = null;
const listeners = new Set<() => void>();

function stored(): Readonly<FeatureFlags> {
  const flags: Record<string, unknown> = { ...DEFAULT_FEATURE_FLAGS };
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (saved && typeof saved === "object")
      for (const [key, values] of Object.entries(ALLOWED)) {
        const value = (saved as Record<string, unknown>)[key];
        if ((values as readonly unknown[]).includes(value)) flags[key] = value;
      }
  } catch {}
  return Object.freeze(flags as FeatureFlags);
}

export function featureFlagsSnapshot() {
  return (current ??= stored());
}

export function subscribeFeatureFlags(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function storeFeatureFlags(flags: FeatureFlags) {
  current = Object.freeze({ ...flags });
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(
          Object.keys(ALLOWED).map((k) => [
            k,
            current![k as keyof FeatureFlags],
          ]),
        ),
      ),
    );
  } catch {}
  listeners.forEach((listener) => listener());
}

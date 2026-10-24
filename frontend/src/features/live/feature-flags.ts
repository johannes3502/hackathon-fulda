import { DEFAULT_POSE_OPTIONS, type PoseOptions } from "../pose/options";

export type FeatureFlags = PoseOptions & {
  speechFeedback: boolean;
  pauseFeedback: boolean;
  paceFeedback: boolean;
  fillerFeedback: boolean;
  volumeFeedback: boolean;
  pitchFeedback: boolean;
};

// Speech analysis itself remains opt-in. These flags select its feedback types.
export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  ...DEFAULT_POSE_OPTIONS,
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

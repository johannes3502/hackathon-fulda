import { POSE_RULES } from "../pose/evaluation";

export type LiveHintSettings = {
  stabilizeHoldMs: number;
  minDisplayMs: number;
  minDisplayGapMs: number;
};

export const DEFAULT_LIVE_HINT_SETTINGS: Readonly<LiveHintSettings> =
  Object.freeze({
    stabilizeHoldMs: POSE_RULES.stabilizeHoldMs,
    minDisplayMs: POSE_RULES.minDisplayMs,
    minDisplayGapMs: POSE_RULES.minDisplayGapMs,
  });

// Bounds keep a typo from disabling or flooding the live hints.
export const LIVE_HINT_FIELDS = [
  {
    key: "stabilizeHoldMs",
    label: "Hold before a pose hint",
    hint: "Duration a pose must hold before it becomes an event and a hint.",
    min: 0,
    max: 10000,
  },
  {
    key: "minDisplayMs",
    label: "Minimum hint display",
    hint: "Minimum display time for a live hint, pose or voice.",
    min: 0,
    max: 15000,
  },
  {
    key: "minDisplayGapMs",
    label: "Gap between hints",
    hint: "Blank gap between two consecutive hints. 0 swaps hints back to back.",
    min: 0,
    max: 15000,
  },
] as const satisfies readonly {
  key: keyof LiveHintSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
}[];

const STORAGE_KEY = "pitchcoach.liveHintSettings";

export function settingError(key: keyof LiveHintSettings, value: number) {
  const field = LIVE_HINT_FIELDS.find((f) => f.key === key)!;
  return Number.isInteger(value) && value >= field.min && value <= field.max
    ? null
    : `Enter a whole number from ${field.min} to ${field.max}.`;
}

/** Saved browser settings; invalid or missing values fall back to defaults. */
export function loadLiveHintSettings(): LiveHintSettings {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (parsed && typeof parsed === "object")
      stored = parsed as Record<string, unknown>;
  } catch {}
  const settings = { ...DEFAULT_LIVE_HINT_SETTINGS };
  for (const { key } of LIVE_HINT_FIELDS) {
    const value = stored[key];
    if (typeof value === "number" && settingError(key, value) === null)
      settings[key] = value;
  }
  return settings;
}

export function saveLiveHintSettings(settings: LiveHintSettings) {
  for (const { key } of LIVE_HINT_FIELDS) {
    const problem = settingError(key, settings[key]);
    if (problem) throw new Error(problem);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetLiveHintSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

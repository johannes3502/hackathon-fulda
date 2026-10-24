import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LIVE_HINT_SETTINGS,
  loadLiveHintSettings,
  resetLiveHintSettings,
  saveLiveHintSettings,
} from "./settings";
import { POSE_RULES } from "../pose/evaluation";

const STORAGE_KEY = "pitchcoach.liveHintSettings";

describe("admin live-hint settings", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });

  it("defaults to POSE_RULES and round-trips saved values", () => {
    expect(loadLiveHintSettings()).toEqual({
      stabilizeHoldMs: POSE_RULES.stabilizeHoldMs,
      minDisplayMs: POSE_RULES.minDisplayMs,
      minDisplayGapMs: POSE_RULES.minDisplayGapMs,
      praiseAfterMs: POSE_RULES.praiseAfterMs,
    });
    const custom = {
      stabilizeHoldMs: 1000,
      minDisplayMs: 4000,
      minDisplayGapMs: 0,
      praiseAfterMs: 5000,
    };
    saveLiveHintSettings(custom);
    expect(loadLiveHintSettings()).toEqual(custom);
    resetLiveHintSettings();
    expect(loadLiveHintSettings()).toEqual(DEFAULT_LIVE_HINT_SETTINGS);
  });

  it("rejects out-of-range values and ignores corrupt storage per field", () => {
    expect(() =>
      saveLiveHintSettings({
        ...DEFAULT_LIVE_HINT_SETTINGS,
        minDisplayGapMs: -1,
      }),
    ).toThrow("0 to 15000");
    expect(() =>
      saveLiveHintSettings({
        ...DEFAULT_LIVE_HINT_SETTINGS,
        stabilizeHoldMs: 1.5,
      }),
    ).toThrow();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stabilizeHoldMs: 99999,
        minDisplayMs: "5",
        minDisplayGapMs: 500,
      }),
    );
    expect(loadLiveHintSettings()).toEqual({
      ...DEFAULT_LIVE_HINT_SETTINGS,
      minDisplayGapMs: 500,
    });
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadLiveHintSettings()).toEqual(DEFAULT_LIVE_HINT_SETTINGS);
  });
});

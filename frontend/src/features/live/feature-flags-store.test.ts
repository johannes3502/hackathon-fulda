import { beforeEach, expect, it, vi } from "vitest";

const STORAGE_KEY = "pitchcoach.featureFlags";
let store: Map<string, string>;

// The store caches its snapshot, so each load gets a fresh module.
const load = async () => {
  vi.resetModules();
  return import("./feature-flags");
};

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

it("persists admin options per browser but keeps studio-only switches in memory", async () => {
  const flags = await load();
  const listener = vi.fn();
  flags.subscribeFeatureFlags(listener);
  flags.storeFeatureFlags({
    ...flags.DEFAULT_FEATURE_FLAGS,
    model: "heavy",
    pauseFeedback: false,
    liveSpeechFeedback: false,
    devMode: true,
  });
  expect(listener).toHaveBeenCalledOnce();
  expect(flags.featureFlagsSnapshot()).toMatchObject({
    model: "heavy",
    liveSpeechFeedback: false,
  });
  const reloaded = await load();
  expect(reloaded.featureFlagsSnapshot()).toEqual({
    ...reloaded.DEFAULT_FEATURE_FLAGS,
    model: "heavy",
    pauseFeedback: false,
  });
});

it("ignores unknown or invalid stored values per option", async () => {
  store.set(
    STORAGE_KEY,
    JSON.stringify({ model: "huge", runningMode: "IMAGE", handTracking: "no" }),
  );
  const flags = await load();
  expect(flags.featureFlagsSnapshot()).toEqual({
    ...flags.DEFAULT_FEATURE_FLAGS,
    runningMode: "IMAGE",
  });
  store.set(STORAGE_KEY, "{broken");
  expect((await load()).featureFlagsSnapshot()).toEqual(
    flags.DEFAULT_FEATURE_FLAGS,
  );
});

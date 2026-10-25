import { afterEach, beforeEach, expect, it, vi } from "vitest";

let storage: Map<string, string>;
const load = async () => {
  vi.resetModules();
  return import("./presentation");
};

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it.each(["startup", "thesis", "school", "nonprofit"] as const)(
  "shares and restores the %s mode selected during preparation",
  async (mode) => {
    const presentation = await load();
    const listener = vi.fn();
    const unsubscribe = presentation.subscribePresentationMode(listener);
    presentation.storePresentationMode(mode);
    expect(presentation.presentationModeSnapshot()).toBe(mode);
    expect(listener).toHaveBeenCalledOnce();
    expect((await load()).presentationModeSnapshot()).toBe(mode);
    unsubscribe();
    presentation.storePresentationMode("startup");
    expect(listener).toHaveBeenCalledOnce();
  },
);

it.each(["invalid", "toString", "__proto__"])(
  "ignores an invalid stored mode: %s",
  async (value) => {
    storage.set("pitchcoach.presentationMode", value);
    expect((await load()).presentationModeSnapshot()).toBe("startup");
  },
);

it("keeps the selection usable when browser storage is blocked", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("Storage blocked");
    },
    setItem: () => {
      throw new Error("Storage blocked");
    },
  });
  const presentation = await load();
  expect(presentation.presentationModeSnapshot()).toBe("startup");
  presentation.storePresentationMode("school");
  expect(presentation.presentationModeSnapshot()).toBe("school");
});

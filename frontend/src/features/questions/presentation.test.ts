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

it.each(["school", "thesis"] as const)(
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
    presentation.storePresentationMode("school");
    expect(listener).toHaveBeenCalledOnce();
  },
);

it.each(["invalid", "toString", "__proto__", "nonprofit", "startup"])(
  "ignores an invalid stored mode: %s",
  async (value) => {
    storage.set("pitchcoach.presentationMode", value);
    expect((await load()).presentationModeSnapshot()).toBe("school");
  },
);

it("retains retired mode details for saved recordings without offering it for new takes", async () => {
  const presentation = await load();
  const progress = await import("../progress/contract");
  expect(presentation.PRESENTATION_MODE_OPTIONS).toEqual(["school", "thesis"]);
  expect(progress.PRESENTATION_MODES).toEqual(
    presentation.PRESENTATION_MODE_OPTIONS,
  );
  expect(presentation.PRESENTATION_MODES.nonprofit.listener).toBe(
    "Potential supporter",
  );
  expect(presentation.PRESENTATION_MODES.startup.listener).toBe("Investor");
});

it("starts new sessions with classroom questions", async () => {
  expect((await load()).presentationModeSnapshot()).toBe("school");
});

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
  expect(presentation.presentationModeSnapshot()).toBe("school");
  presentation.storePresentationMode("school");
  expect(presentation.presentationModeSnapshot()).toBe("school");
});

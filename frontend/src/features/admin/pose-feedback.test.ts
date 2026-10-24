import { beforeEach, expect, it, vi } from "vitest";
import {
  defaultPoseFeedback,
  disabledLabTests,
  loadPoseFeedback,
  savePoseFeedback,
} from "./pose-feedback";

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

it("defaults every rule and lab test to on and round-trips changes", () => {
  const defaults = loadPoseFeedback();
  expect(Object.values(defaults.rules).every((m) => m === "on")).toBe(true);
  expect(disabledLabTests(defaults)).toEqual([]);
  savePoseFeedback({
    rules: { ...defaults.rules, head_down: "off", torso_lean: "review" },
    lab: { ...defaults.lab, pocket: false },
  });
  const loaded = loadPoseFeedback();
  expect(loaded.rules).toMatchObject({
    head_down: "off",
    torso_lean: "review",
  });
  expect(disabledLabTests(loaded)).toEqual(["pocket"]);
});

it("ignores invalid saved entries per switch", () => {
  store.set(
    "pitchcoach.poseFeedback",
    JSON.stringify({
      rules: { head_down: "maybe", hand_raised: "off" },
      lab: { pocket: "no", neutral: false },
    }),
  );
  const loaded = loadPoseFeedback();
  expect(loaded.rules.head_down).toBe("on");
  expect(loaded.rules.hand_raised).toBe("off");
  expect(loaded.lab.pocket).toBe(true);
  expect(loaded.lab.neutral).toBe(false);
  store.set("pitchcoach.poseFeedback", "{oops");
  expect(loadPoseFeedback()).toEqual(defaultPoseFeedback());
});

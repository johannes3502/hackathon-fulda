import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("opts SDK 57 into the scene lifecycle required to launch on iOS and iPadOS 27", () => {
  const { expo } = JSON.parse(readFileSync("app.json", "utf8"));
  expect(expo.ios.supportsTablet).toBe(true);
  expect(
    expo.plugins.find(
      (p: unknown) => Array.isArray(p) && p[0] === "expo-build-properties",
    )[1].ios.enableSceneSupport,
  ).toBe(true);
});

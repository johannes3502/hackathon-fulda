import { ESLint } from "eslint";
import { expect, it } from "vitest";

it("ignores custom Next build directories while still checking source files", async () => {
  const eslint = new ESLint();
  expect(await eslint.isPathIgnored(".next-hero-check/dev/server.js")).toBe(
    true,
  );
  expect(await eslint.isPathIgnored(".next-playwright/server.js")).toBe(true);
  expect(await eslint.isPathIgnored("src/lib/backend-job.ts")).toBe(false);
});

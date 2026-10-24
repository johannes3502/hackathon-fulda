import { expect, test } from "@playwright/test";

test("shared loading and stats dependencies do not break page loading", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const path of ["/", "/live", "/loading-preview", "/stats-preview"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("body")).not.toContainText("Module not found");
  }
  expect(errors).toEqual([]);
});

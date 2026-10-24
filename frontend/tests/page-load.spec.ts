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
    await expect(page.locator("body")).not.toContainText(
      "Error evaluating Node.js code",
    );
    if (path === "/live") {
      await expect(
        page.getByRole("button", { name: "Enable camera", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".live-camera-stage")).toHaveCSS(
        "background-color",
        "rgb(28, 28, 31)",
      );
    } else if (path !== "/loading-preview") {
      await expect(page.locator("header .brand-logo")).toHaveCSS(
        "width",
        "72px",
      );
      await expect(page.locator("header .brand-logo")).toHaveCSS(
        "height",
        "72px",
      );
    }
  }
  expect(errors).toEqual([]);
});

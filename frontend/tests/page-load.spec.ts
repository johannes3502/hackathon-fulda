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
      await expect(
        page.getByRole("region", { name: "Live camera preview" }),
      ).toHaveCSS("background-color", "rgb(28, 28, 31)");
    } else if (path !== "/loading-preview") {
      const logo = page
        .getByRole("link", { name: "418 home", exact: true })
        .locator(".brand-logo");
      await expect(logo).toHaveCSS("width", "72px");
      await expect(logo).toHaveCSS("height", "72px");
    }
  }
  expect(errors).toEqual([]);
});

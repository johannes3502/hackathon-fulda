import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("presentation introduction leads into preparation and recording", async ({
  page,
}, info) => {
  await page.goto("/");
  const intro = page.getByRole("region", {
    name: "Deine Idee verdient einen starken Auftritt.",
  });
  await expect(intro).toBeVisible();
  await expect(
    intro.getByRole("link", { name: "Neue Präsentation" }),
  ).toHaveAttribute("href", "/sources");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: "Deine Aufnahmen im Überblick.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("home-light.png"),
    fullPage: true,
  });
  await intro.getByRole("link", { name: "Neue Präsentation" }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(
    page.getByRole("heading", { name: "Your sources", exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  const journey = page.getByRole("navigation", {
    name: "Presentation workflow",
  });
  await expect(journey.getByRole("link", { name: /Prepare/ })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await journey.getByRole("link", { name: /Record/ }).click();
  await expect(page).toHaveURL(/\/live$/);
  await expect(journey).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("studio-light.png"),
    fullPage: true,
  });
  await page.goBack();
  await expect(page).toHaveURL(/\/sources$/);
  await journey.getByRole("link", { name: /Review example/ }).click();
  await expect(page).toHaveURL(/\/review-preview$/);
  await expect(journey.getByRole("link", { name: /Review/ })).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("saved appearance overrides the system across routes and reloads", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const appearance = page.getByRole("combobox", {
    name: "Appearance",
    exact: true,
  });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await appearance.selectOption("light");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.reload();
  await expect(appearance).toHaveValue("light");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  for (const path of ["/sources", "/live", "/demo", "/review-preview"]) {
    await page.goto(path);
    if (path !== "/live") await expect(appearance).toHaveValue("light");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ colorScheme: "light" });
  await appearance.selectOption("dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.screenshot({
    path: info.outputPath("review-dark.png"),
    fullPage: true,
  });
  await page.goto("/");
  await page.screenshot({
    path: info.outputPath("home-dark.png"),
    fullPage: true,
  });
  await appearance.selectOption("system");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
});

test("navigation drawer contains keyboard focus and restores its trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Menü", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(drawer).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    expect(
      await drawer.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

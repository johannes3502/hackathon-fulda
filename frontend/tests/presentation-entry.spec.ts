import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("header links to past recordings from Home and another page", async ({
  page,
}, info) => {
  await page.goto("/");
  const intro = page.getByRole("region", {
    name: "Deine Idee verdient einen starken Auftritt.",
  });
  await expect(
    intro.getByRole("link", { name: "Vergangene Aufnahmen", exact: true }),
  ).toHaveCount(0);
  const header = page.getByRole("banner");
  const link = header.getByRole("link", {
    name: "Vergangene Aufnahmen",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", "/#past-recordings");
  await expect(link).toBeVisible();
  await header.screenshot({
    path: info.outputPath("header-past-recordings.png"),
  });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/#past-recordings$/);
  const recordings = page.getByRole("region", {
    name: "Deine Takes",
    exact: true,
  });
  await expect(recordings).toBeFocused();
  await expect(recordings.getByRole("heading")).toBeInViewport();
  await expect(
    recordings.getByText(
      "Hier erscheinen deine aufgenommenen Präsentationen.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/sources");
  await link.click();
  await expect(page).toHaveURL(/\/#past-recordings$/);
  await expect(recordings.getByRole("heading")).toBeInViewport();
});

test("Home returns to the overview from the simplified header", async ({
  page,
}) => {
  await page.goto("/sources");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const home = navigation.getByRole("link", { name: "Home", exact: true });
  await expect(home).toHaveAttribute("href", "/");
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(home).toHaveAttribute("aria-current", "page");
});

test("presentation introduction leads into preparation and recording", async ({
  page,
}, info) => {
  let uploaded = false;
  const material = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    collection_id: "",
    filename: "presentation-notes.txt",
    status: "ready",
    size_bytes: 100,
    chunk_count: 1,
    error: null,
  };
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: uploaded ? [material] : [] }),
  );
  await page.route("**/api/sources", async (route) => {
    material.collection_id = /name="collection_id"\r\n\r\n([^\r]+)/.exec(
      route.request().postData()!,
    )![1];
    uploaded = true;
    await route.fulfill({ status: 202, json: { source: material } });
  });
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
  await page.locator('input[type="file"]').setInputFiles({
    name: material.filename,
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic presentation notes"),
  });
  await expect(
    page.getByText(material.filename, { exact: true }),
  ).toBeVisible();
  const sourceBounds = (await page
    .locator(".sources-workspace")
    .boundingBox())!;
  await page.screenshot({
    path: info.outputPath("sources-light.png"),
    fullPage: true,
  });
  const journey = page.getByRole("navigation", {
    name: "Presentation workflow",
  });
  await expect(journey.getByRole("link", { name: /Prepare/ })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await page
    .getByRole("link", { name: "Continue to recording", exact: true })
    .click();
  await expect(page).toHaveURL(/\/live$/);
  await expect(journey).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(
    page.getByRole("heading", {
      name: "Record your presentation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  const studioBounds = (await page.locator(".live-workspace").boundingBox())!;
  expect(studioBounds.x).toBeCloseTo(sourceBounds.x, 0);
  expect(studioBounds.width).toBeCloseTo(sourceBounds.width, 0);
  await page.screenshot({
    path: info.outputPath("studio-light.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Back to sources", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(
    page.getByText(material.filename, { exact: true }),
  ).toBeVisible();
  await journey.getByRole("link", { name: /Record/ }).click();
  await expect(page).toHaveURL(/\/live$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/sources$/);
  await expect(
    page.getByText(material.filename, { exact: true }),
  ).toBeVisible();
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

test("header shows the logo, Home, past recordings, Admin and utility controls", async ({
  page,
}, info) => {
  await page.goto("/sources");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "418 home" })).toBeVisible();
  await expect(
    header.getByRole("button", { name: "Menü", exact: true }),
  ).toHaveCount(0);
  await expect(header).not.toContainText("Presentation studio");
  const navigation = header.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(navigation.getByRole("link")).toHaveText([
    "Home",
    "Vergangene Aufnahmen",
    "Admin",
  ]);
  const admin = navigation.getByRole("link", { name: "Admin", exact: true });
  await admin.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(admin).toHaveAttribute("aria-current", "page");
  await expect(
    header.getByRole("combobox", { name: "Appearance" }),
  ).toBeVisible();
  await expect(
    header.getByRole("button", { name: "How it works" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await header.screenshot({ path: info.outputPath("simplified-header.png") });
});

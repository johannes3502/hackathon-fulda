import { expect, test } from "@playwright/test";

test("review connects annotations, evidence and video timestamps", async ({
  page,
}) => {
  await page.goto("/review-preview");
  // Metadata can load before React hydration; the section button must still enable.
  await expect(
    page.getByRole("button", { name: "Stelle ansehen" }),
  ).toBeEnabled();
  await page
    .locator(".review418-moment")
    .filter({ hasText: "Diese Zahl passt nicht zur Quelle" })
    .click();
  const video = page.locator("video");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBe(43);
  await expect(page.locator(".review418-source")).toContainText(
    "12 Teilnehmende",
  );
  await expect(page.locator(".review418-source a")).toHaveAttribute(
    "href",
    "/review-demo/source.txt",
  );
  await page
    .locator(".review418-criterion")
    .filter({ hasText: "Gestik" })
    .click();
  await expect(page.locator(".review418-moment")).toHaveCount(1);
  await expect(page.locator(".review418-plot-moment")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Alle Kriterien", exact: true })
    .click();
  await expect(page.locator(".review418-moment")).toHaveCount(7);
  await page.getByRole("slider", { name: "Zeitpunkt im Video" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeCloseTo(43.1, 1);
  await page.getByRole("button", { name: "Stelle ansehen" }).click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(false);
  // Advance to the end of the selected context instead of waiting nine seconds.
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 49.9;
  });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("review annotations survive a failed video and missing live recording", async ({
  page,
}) => {
  await page.route("**/review-demo/presentation.mp4", (route) => route.abort());
  await page.goto("/review-preview");
  await expect(page.getByRole("status")).toContainText(
    "Das Video konnte nicht geladen werden",
  );
  await page
    .locator(".review418-moment")
    .filter({ hasText: "Hier stockt der Sprechfluss" })
    .click();
  await expect(
    page.getByRole("region", { name: "Ausgewählte Anmerkung" }),
  ).toContainText("Mach eine kurze Pause");
  await page.goto("/live/missing/analysis");
  await expect(
    page.getByRole("heading", {
      name: "This recording isn’t in this workspace.",
    }),
  ).toBeVisible();
});

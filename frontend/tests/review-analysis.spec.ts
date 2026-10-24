import { expect, test } from "@playwright/test";

test("review graph places strengths above neutral, adjustments below and seeks the video", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/review-preview");
    const graph = page.getByRole("region", {
      name: "Dein Performance-Verlauf",
    });
    await expect(graph).toBeVisible();
    await expect(graph.locator(".feedback-graph-baseline")).toHaveAttribute(
      "y1",
      "120",
    );
    const positive = graph.locator(".feedback-graph-dot.positive").first();
    const adjustment = graph.locator(".feedback-graph-dot.attention").first();
    expect(
      await positive.evaluate((element) =>
        parseFloat((element as HTMLElement).style.top),
      ),
    ).toBeLessThan(50);
    expect(
      await adjustment.evaluate((element) =>
        parseFloat((element as HTMLElement).style.top),
      ),
    ).toBeGreaterThan(50);
    const videoBounds = await page.locator("video").boundingBox();
    const plot = graph.locator("svg");
    const plotBounds = await plot.boundingBox();
    expect(plotBounds!.y).toBeGreaterThan(videoBounds!.y + videoBounds!.height);
    await expect(
      page.getByRole("button", { name: "Stelle ansehen" }),
    ).toBeEnabled();
    await plot.click({
      position: { x: (plotBounds!.width * 43) / 90, y: plotBounds!.height / 2 },
    });
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBe(43);
    await graph.getByText("Alle 7 Zeitmarken", { exact: true }).click();
    const target = graph.getByRole("button", { name: /0:08.*Ein Einstieg/ });
    await target.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() =>
        page
          .locator("video")
          .evaluate((element: HTMLVideoElement) => element.currentTime),
      )
      .toBe(8);
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await graph.locator("summary").click();
    await graph.screenshot({
      path: info.outputPath(`review-graph-${colorScheme}.png`),
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

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
  await expect(page.locator(".feedback-graph-dot")).toHaveCount(1);
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

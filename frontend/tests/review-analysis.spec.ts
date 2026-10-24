import { expect, test } from "@playwright/test";

test("four evidence-based scores sit above the video and the curve is continuous", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/review-preview");
  const scores = page.getByRole("region", {
    name: "Bewertung der vier Kriterien",
  });
  await expect(scores.locator(".review-score-card")).toHaveCount(4);
  await expect(scores.locator(".review-score-value")).toHaveText([
    "100/100",
    "0/100",
    "43/100",
    "100/100",
  ]);
  const values = await scores.locator(".review-score-value").allTextContents();
  expect(
    (await scores.boundingBox())!.y + (await scores.boundingBox())!.height,
  ).toBeLessThan((await page.locator("video").boundingBox())!.y);
  await scores.getByRole("button").filter({ hasText: "Flow" }).click();
  await expect(page.locator(".review418-moment")).toHaveCount(2);
  await expect(scores.locator(".review-score-value")).toHaveText(values);
  await page
    .getByRole("button", { name: "Alle Kriterien", exact: true })
    .click();
  const graph = page.getByRole("region", { name: "Dein Performance-Verlauf" });
  const path = await graph
    .locator(".feedback-graph-context-line")
    .getAttribute("d");
  expect(path).toContain("L");
  expect(path!.match(/M/g)).toHaveLength(1);
  expect(path).not.toContain("C");
  const slider = graph.getByRole("slider", { name: "Zeitpunkt im Video" });
  await slider.focus();
  await page.keyboard.press("Home");
  const cursor = graph.locator(".feedback-graph-cursor");
  await expect(cursor).toHaveCSS("left", "0px");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() =>
      cursor.evaluate((element) =>
        parseFloat((element as HTMLElement).style.left),
      ),
    )
    .toBeGreaterThan(0);
  await scores
    .getByText("Wie wird der Score berechnet?", { exact: true })
    .click();
  await expect(scores).toContainText(
    "Neutrale Beobachtungen und nicht beobachtete Zeit fließen nicht ein",
  );
  await scores.locator("summary").click();
  await page.screenshot({
    path: info.outputPath("scores-and-line.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("colored playback stays aligned with video, graph, keyboard seeking and play/pause", async ({
  page,
}, info) => {
  await page.goto("/review-preview");
  const graph = page.getByRole("region", { name: "Dein Performance-Verlauf" });
  const playback = graph.getByRole("group", { name: "Wiedergabe zum Verlauf" });
  const slider = playback.getByRole("slider", { name: "Zeitpunkt im Video" });
  const player = page.locator("video");
  const progress = playback.locator(".feedback-playback-progress");
  const cursor = graph.locator(".feedback-graph-cursor");
  await expect(
    playback.getByRole("button", { name: "Video abspielen" }),
  ).toBeEnabled();
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(progress).toHaveCSS("clip-path", "inset(0px 100% 0px 0px)");
  // A native video seek must move both indicators to exactly the same fraction.
  await player.evaluate((video: HTMLVideoElement) => {
    video.currentTime = 45;
  });
  await expect(slider).toHaveValue("45000");
  await expect(progress).toHaveCSS("clip-path", "inset(0px 50% 0px 0px)");
  expect(
    await cursor.evaluate((element) => (element as HTMLElement).style.left),
  ).toBe("50%");
  const gradient = await progress.evaluate(
    (element) => (element as HTMLElement).style.background,
  );
  expect(gradient).toContain("var(--success)");
  expect(gradient).toContain("var(--error)");
  const track = await playback
    .locator(".feedback-playback-track")
    .boundingBox();
  const plot = await graph.locator(".feedback-graph-plot").boundingBox();
  expect(Math.abs(track!.x - plot!.x)).toBeLessThan(2);
  expect(Math.abs(track!.width - plot!.width)).toBeLessThan(2);
  expect(track!.y).toBeGreaterThan(plot!.y + plot!.height);
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeCloseTo(45.1, 1);
  await playback.getByRole("button", { name: "Video abspielen" }).click();
  await expect
    .poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThan(45.2);
  await playback.getByRole("button", { name: "Video pausieren" }).click();
  await expect
    .poll(() => player.evaluate((video: HTMLVideoElement) => video.paused))
    .toBe(true);
  await expect(
    playback.getByRole("button", { name: "Video abspielen" }),
  ).toBeVisible();
  await graph.screenshot({ path: info.outputPath("colored-playback.png") });
});

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
    const plot = graph.getByRole("img", { name: /Feedback-Verlauf/ });
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

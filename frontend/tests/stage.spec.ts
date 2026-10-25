import { expect, test, type Page } from "@playwright/test";
import { syntheticCamera, syntheticPose } from "./helpers/capture";

test.beforeEach(async ({ page }) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/ready", (route) =>
    route.fulfill({
      json: { status: "ok", postgres: "ok", storage: "ok", redis: "ok" },
    }),
  );
  await page.route("**/api/factcheck/settings", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/questions/pitch", (route) =>
    route.fulfill({ status: 503, json: { detail: "offline" } }),
  );
  await page.routeWebSocket("**/api/speech/feedback", (socket) => {
    socket.onMessage((raw) => {
      if (typeof raw === "string" && JSON.parse(raw).type === "start")
        socket.send(JSON.stringify({ type: "ready", sample_rate: 16000 }));
    });
  });
});

async function record(page: Page, local = true) {
  await page.goto(local ? "/live?stage=1&local=1" : "/live?stage=1");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page.getByRole("button", { name: "Demo starten", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Demo beenden & Review", exact: true }),
  ).toBeVisible();
}

test("preflight needs no camera permission and keeps local capture primary when backend is down", async ({
  page,
}, info) => {
  await page.route("**/api/health/ready", (route) =>
    route.fulfill({ status: 503, json: { status: "unavailable" } }),
  );
  await page.goto("/stage");
  await expect(
    page.getByRole("button", { name: "Preflight erneut prüfen" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: /Lokale Sofortaufnahme/ }),
  ).toHaveAttribute("data-primary", "true");
  await expect(
    page.getByText("Lokal hinterlegt – funktioniert ohne Backend."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mediaConstraints?: unknown }).mediaConstraints,
    ),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("stage-preflight.png"),
    fullPage: true,
  });
});

test("local stage records without analysis traffic, restores its review, and ends the answer timer", async ({
  page,
}, info) => {
  const uploads: string[] = [];
  const sockets: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") uploads.push(request.url());
  });
  page.on("websocket", (socket) => {
    if (new URL(socket.url()).pathname !== "/_next/hmr")
      sockets.push(socket.url());
  });
  await page.route("**/api/health/ready", (route) => route.abort());
  await record(page);
  await expect(page.locator(".live-audio-hint")).toContainText(
    "Kein Analyse-Upload",
  );
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: "Demo beenden & Review", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?stage=1$/);
  await expect(page.locator("[data-stage-question]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Practice questions", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  // Past-session links omit the query; the saved config must retain the stage.
  await page.goto(new URL(page.url()).pathname);
  await expect(page.locator("[data-stage-question]")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded pitch video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Kernpunkte zeigen" }).click();
  await expect(page.locator("[data-stage-question]")).toContainText("Gemini");
  await page.clock.install();
  await page.getByRole("button", { name: "Antwortfenster 90 s" }).click();
  await expect(page.getByRole("timer")).toContainText("01:30");
  await page.clock.fastForward(90000);
  await expect(page.getByRole("timer")).toContainText("00:00");
  await expect(
    page.getByText("Antwortfenster beendet.", { exact: true }),
  ).toBeVisible();
  expect(uploads).toEqual([]);
  expect(sockets).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("stage-local-review.png"),
    fullPage: true,
  });
});

test("early review retains hidden-overlay pose observations and their evidence across reload", async ({
  page,
}) => {
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({
      status: 202,
      json: { job_id: "10000000-0000-4000-8000-000000000001" },
    }),
  );
  await page.route(
    "**/api/speech/jobs/10000000-0000-4000-8000-000000000001",
    (route) =>
      route.fulfill({
        json: {
          job_id: "10000000-0000-4000-8000-000000000001",
          status: "running",
        },
      }),
  );
  await record(page, false);
  await page.getByRole("button", { name: "Hide landmarks" }).click();
  await expect(
    page.getByRole("button", { name: "Show landmarks" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() =>
    (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
      type: "test-start",
      timestamp: performance.now(),
      kind: "crossed",
    }),
  );
  await expect(page.locator(".cue-message")).toHaveText(
    "Arms crossed in front of torso",
    { timeout: 15000 },
  );
  await expect(
    page.getByRole("img", { name: "Live pose and hand landmarks" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Demo beenden & Review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review jetzt öffnen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?stage=1$/);
  const moment = page
    .locator(".review-clip-list button")
    .filter({ hasText: "Arms crossed in front of torso" });
  await expect(moment).toBeVisible();
  await expect(
    page.getByText("Backend analysis was stopped.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(moment).toBeVisible();
  await moment.click();
  await expect(page.getByLabel("Recorded pitch video")).toBeVisible();
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download pose JSONL" }),
  ).toBeVisible();
});

test("microphone denial offers a usable video-only stage fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const capture = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = (constraints) =>
      constraints?.audio
        ? Promise.reject(
            new DOMException("Synthetic microphone denial", "NotAllowedError"),
          )
        : capture(constraints);
  });
  await page.goto("/live?stage=1");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zum lokalen Videomodus wechseln" })
    .click();
  await expect(
    page.getByText("Die Aufnahme enthält kein Audio.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demo starten", exact: true }).click();
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: "Demo beenden & Review", exact: true })
    .click();
  await expect(page.locator("[data-stage-question]")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded pitch video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("stage narration never selects an available cloud voice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    speechSynthesis.getVoices = () => [
      { lang: "de-DE", localService: false } as SpeechSynthesisVoice,
    ];
    speechSynthesis.speak = () => {
      throw new Error("Cloud speech must not be called");
    };
  });
  await record(page);
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: "Demo beenden & Review", exact: true })
    .click();
  await page.getByRole("button", { name: "Frage vorlesen" }).click();
  await expect(
    page.getByText("Keine lokale deutsche Stimme verfügbar.", { exact: false }),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home opens monitoring directly and keeps the sample optional", async ({
  page,
}, info) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Standard view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "Live camera preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Start recording", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Feedback source")).toBeHidden();
  await expect(
    page
      .locator(".stage-placeholder")
      .getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nothing is recorded until you press Start recording.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live feedback", exact: true }),
  ).toHaveCount(0);
  const monitor = await page
    .getByRole("region", { name: "Live camera preview" })
    .boundingBox();
  if (info.project.name === "desktop")
    expect(monitor!.width).toBeGreaterThan(1000);
  await page.screenshot({
    path: info.outputPath("monitoring-entry.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Standard view", exact: true })
    .click();
  await page.getByRole("link", { name: "Sample demo", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("button", { name: "Try sample demo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Pitch title")).toBeHidden();
  await page
    .getByText("Customize the sample rehearsal", { exact: true })
    .click();
  await expect(page.getByLabel("Pitch title")).toBeVisible();
  await expect(page.getByLabel("Who’s listening?")).toBeHidden();
  await page.getByText("Practice options", { exact: true }).click();
  await expect(page.getByLabel("Who’s listening?")).toBeVisible();

  for (const path of ["/", "/live", "/sources", "/review-preview"]) {
    await page.goto(path);
    if (path === "/" || path === "/live")
      await page
        .getByRole("button", { name: "Standard view", exact: true })
        .click();
    await expect(page.getByRole("link", { name: "418 home" })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${path.replaceAll("/", "") || "home"}.png`),
      fullPage: true,
    });
  }
});

test("recording consent stays visible while diagnostics and server details are optional", async ({
  page,
}) => {
  await page.goto("/live");
  await page
    .getByRole("button", { name: "Standard view", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pose debug", exact: true }),
  ).toBeHidden();
  await page.getByText("Recording options", { exact: true }).click();
  await page.getByLabel("Feedback source").selectOption("backend");
  await expect(
    page.getByText("By starting, you agree", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Transcribe speech for word analysis and fact-check"),
  ).toBeVisible();
  await expect(page.getByLabel("Backend API URL")).toBeHidden();
  await page.getByText("Server connection", { exact: true }).click();
  await expect(page.getByLabel("Backend API URL")).toBeVisible();
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pose debug", exact: true }),
  ).toBeVisible();

  await page.getByText("Recording options", { exact: true }).click();
  await expect(page.locator(".recording-consent")).toContainText(
    "By starting, you agree to send your video and microphone audio",
  );
  await expect(page.locator(".recording-consent")).toBeVisible();
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "captures video and microphone audio",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "No microphone is captured",
  );
});

test("sources explain their connected purpose and lead into recording", async ({
  page,
}) => {
  await page.route("**/sources?collection_id=*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/sources");
  await expect(
    page.getByRole("heading", { name: "Your sources", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "check claims and prepare questions",
  );
  await expect(page.locator("main")).not.toContainText("not connected yet");
  await page.getByRole("link", { name: "Continue to recording" }).click();
  await expect(page).toHaveURL(/\/live$/);
});

test("camera permission is requested only on click, with a clear retry after denial", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      cameraRequests: number;
      denyCamera: () => void;
    };
    state.cameraRequests = 0;
    navigator.mediaDevices.getUserMedia = () => {
      state.cameraRequests++;
      return new Promise<MediaStream>((_, reject) => {
        state.denyCamera = () =>
          reject(new DOMException("Denied", "NotAllowedError"));
      });
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { cameraRequests: number }).cameraRequests,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Waiting for camera permission…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start recording", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { denyCamera: () => void }).denyCamera(),
  );
  await expect(
    page.getByText("Camera permission was denied.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Standard view", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Sample demo", exact: true }),
  ).toBeVisible();
});

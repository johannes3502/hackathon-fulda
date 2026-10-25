import { syntheticCamera, syntheticPose } from "./helpers/capture";
import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { POSE_RULES } from "../src/features/pose/evaluation";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 202, json: { job_id: "synthetic-analysis" } }),
  );
  await page.route("**/api/speech/jobs/synthetic-analysis", (route) =>
    route.fulfill({
      json: {
        job_id: "synthetic-analysis",
        status: "completed",
        result: {
          audio: { summary: {} },
          events: [],
          words: [],
          synthetic_demo: true,
        },
      },
    }),
  );
  await page.routeWebSocket("**/api/speech/live", (socket) => socket.close());
  await page.routeWebSocket("**/api/speech/feedback", (socket) => {
    socket.onMessage((raw) => {
      if (typeof raw === "string" && JSON.parse(raw).type === "start")
        socket.send(JSON.stringify({ type: "ready", sample_rate: 16000 }));
    });
  });
});

async function startPoseSequence(page: Page, kind = "raised") {
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeVisible();
  await page.evaluate(
    (kind) =>
      (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
        type: "test-start",
        timestamp: performance.now(),
        kind,
      }),
    kind,
  );
}
async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    overflowing: [...document.querySelectorAll("body *")]
      .filter(
        (element) => element.getBoundingClientRect().right > innerWidth + 1,
      )
      .slice(0, 8)
      .map((element) => `${element.tagName}.${element.getAttribute("class")}`),
  }));
  expect(layout.width, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.viewport,
  );
}
async function enable(page: Page) {
  await page.goto("/live");
  await page
    .getByRole("region", { name: "Studio options" })
    .getByText("Recording options", { exact: true })
    .click();
  await page.getByLabel("Create a transcript").uncheck();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await expect(
    page.getByRole("button", { name: "Turn camera off" }),
  ).toBeVisible();
}

for (const mode of ["native", "viewport"] as const) {
  test(`${mode} recording fullscreen keeps the take running and shows compact edge hints`, async ({
    page,
  }, info) => {
    await syntheticCamera(page);
    await syntheticPose(page);
    if (mode === "viewport") {
      await page.addInitScript(() => {
        Element.prototype.requestFullscreen = async () => {
          throw new DOMException("Fullscreen unavailable", "NotAllowedError");
        };
      });
    }
    await enable(page);
    const video = page.getByLabel("Your local camera feed");
    const stage = page.getByRole("region", { name: "Live camera preview" });
    const cue = page.locator(".fullscreen-cue");
    await video.evaluate((element) =>
      element.setAttribute("data-original-preview", "true"),
    );
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await expect(stage).toHaveClass(/recording-fullscreen/);
    expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(
      mode === "native",
    );
    await expect(page.locator(".fullscreen-consent")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start recording", exact: true }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "Start recording", exact: true })
      .click();
    await startPoseSequence(page, "crossed");
    await expect(cue.locator("strong")).toHaveText(
      "Arms crossed in front of torso",
      { timeout: 15000 },
    );
    await expect(cue).toHaveAttribute("data-feedback", "attention");
    await expect(cue.locator(".lucide-unfold-horizontal")).toBeVisible();
    await expect(page.locator(".fullscreen-time")).not.toHaveText("0:00");
    await noOverflow(page);
    const bounds = (await stage.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(viewport.width);
    expect(bounds.height).toBe(viewport.height);
    await page.screenshot({ path: info.outputPath(`fullscreen-${mode}.png`) });
    await page.getByRole("button", { name: "Hide hints", exact: true }).click();
    await expect(cue).toContainText("Hints hidden");
    await expect(cue).toHaveAttribute("data-feedback", "neutral");
    await page.getByRole("button", { name: "Show hints", exact: true }).click();
    await expect(cue).not.toContainText("Hints hidden");

    // Both the browser's exit and the viewport fallback must restore the normal studio.
    if (mode === "viewport") await page.keyboard.press("Escape");
    else await page.evaluate(() => document.exitFullscreen());
    await expect(stage).not.toHaveClass(/recording-fullscreen/);
    await expect(
      page.getByRole("button", { name: "Finish & review", exact: true }),
    ).toBeVisible();
    await expect(video).toHaveAttribute("data-original-preview", "true");
    expect(
      await page.evaluate(
        () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await page.getByRole("button", { name: "Exit fullscreen" }).click();
    await expect(stage).not.toHaveClass(/recording-fullscreen/);
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await expect(stage).toHaveClass(/recording-fullscreen/);
    await page
      .getByRole("region", { name: "Live camera preview" })
      .getByRole("button", { name: "Finish & review", exact: true })
      .click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.getByLabel("Recorded presentation video")).toBeVisible();
    await expect(
      page
        .locator(".review-clip-list button")
        .filter({ hasText: "Arms crossed in front of torso" }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  });
}

test("normal preview displays all finger points without enabling the lab, including a hand-only frame", async ({
  page,
}) => {
  await syntheticCamera(page);
  await page.route("**/pose/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `onmessage=({data})=>{
    if(data.type==='init') postMessage({type:'ready',hands:true});
    if(data.type==='frame') { postMessage({type:'sample',timestamp:data.timestamp,width:640,height:360,points:[],hands:[{label:'Left',score:.99,landmarks:Array.from({length:21},(_,i)=>[.3+i*.01,.4+i*.005,0])}]});data.frame.close(); }
  }`,
    }),
  );
  await enable(page);
  await expect(
    page.locator('[data-hand="Left"] [data-hand-landmark]'),
  ).toHaveCount(21);
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pose lab", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("every recording uses microphone, live backend feedback and a full upload without a mode selector", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pitchcoach.featureFlags",
      JSON.stringify({ liveSpeechFeedback: false }),
    ),
  );
  await syntheticCamera(page);
  await syntheticPose(page);
  let frames = 0;
  let uploads = 0;
  await page.routeWebSocket("**/api/speech/feedback", (socket) => {
    socket.onMessage((raw) => {
      if (typeof raw === "string") {
        if (JSON.parse(raw).type === "start")
          socket.send(JSON.stringify({ type: "ready", sample_rate: 16000 }));
      } else frames++;
    });
  });
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/speech/analyze")
    )
      uploads++;
  });
  await page.goto("/live");
  await expect(page.getByLabel("Speech analysis", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator(".live-audio-hint")).toBeInViewport();
  await expect(page.locator(".recording-consent")).toContainText(
    "By starting, you agree",
  );
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mediaConstraints: MediaStreamConstraints })
          .mediaConstraints.audio,
    ),
  ).toBeTruthy();
  expect(frames).toBe(0);
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect.poll(() => frames).toBeGreaterThan(0);
  expect(uploads).toBe(0);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("fixed-backend-mode.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  expect(uploads).toBe(1);
  await expect(page.getByLabel("Recorded presentation video")).toBeVisible();
});

test("camera setup hides global navigation and full-size recording preserves the camera", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Presentation workflow" }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Back to sources", exact: true }),
  ).toHaveAttribute("href", "/sources");
  const previewWorkspace = (await page
    .locator(".live-workspace")
    .boundingBox())!;
  expect(previewWorkspace.width).toBeGreaterThanOrEqual(
    page.viewportSize()!.width - 40,
  );
  const previewCamera = (await page
    .locator(".live-camera-stage")
    .boundingBox())!;
  if (info.project.name === "desktop") {
    expect(previewCamera.height).toBeGreaterThan(480);
    await expect(
      page.getByRole("button", { name: "Start recording", exact: true }),
    ).toBeInViewport();
  } else {
    expect(previewCamera.height).toBeGreaterThanOrEqual(
      page.viewportSize()!.height / 2,
    );
  }
  await page.screenshot({
    path: info.outputPath("enabled-camera-preview.png"),
    fullPage: true,
  });
  const video = page.getByLabel("Your local camera feed");
  const originalVideo = await video.elementHandle();
  const startButton = page.getByRole("button", {
    name: "Start recording",
    exact: true,
  });
  await expect(startButton).toHaveCSS("font-size", "17px");
  expect((await startButton.boundingBox())!.height).toBeGreaterThanOrEqual(52);
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Presentation workflow" }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Back to sources", exact: true }),
  ).toHaveCount(0);
  const cue = page.locator(".cue-message");
  const finishButton = page.getByRole("button", {
    name: "Finish & review",
    exact: true,
  });
  await expect(finishButton).toHaveCSS("font-size", "17px");
  expect((await finishButton.boundingBox())!.height).toBeGreaterThanOrEqual(52);
  await expect(
    page.getByRole("button", { name: /^(Large|Standard) view$/ }),
  ).toHaveCount(0);
  if (info.project.name === "desktop") {
    const camera = (await page.locator(".live-camera-stage").boundingBox())!;
    const feedback = (await page.locator(".cue-panel").boundingBox())!;
    expect(camera.height).toBeGreaterThan(480);
    expect(feedback.x).toBeGreaterThanOrEqual(camera.x + camera.width);
    expect(feedback.y).toBeCloseTo(camera.y, 0);
    expect(feedback.height).toBeCloseTo(camera.height, 0);
    expect(feedback.width / camera.width).toBeCloseTo(1, 1);
  } else {
    const camera = (await page.locator(".live-camera-stage").boundingBox())!;
    const feedback = (await page.locator(".cue-panel").boundingBox())!;
    expect(feedback.y).toBeGreaterThanOrEqual(camera.y + camera.height);
  }
  await expect(page.locator(".live-cue-label")).toHaveText("Tracking ready", {
    timeout: 10000,
  });
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "positive",
  );
  await expect(page.locator(".live-cue-label")).toHaveCSS(
    "color",
    "rgb(37, 101, 68)",
  );
  await startPoseSequence(page);
  await expect(cue).toHaveText("Hand above shoulder", {
    timeout: 12000,
  });
  expect(
    await cue.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(info.project.name === "desktop" ? 52 : 40);
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "neutral",
  );
  await expect(page.locator("svg.live-cue-icon.lucide-hand")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("large-live-view.png"),
    fullPage: true,
  });
  if (info.project.name === "desktop") {
    await expect(
      page.getByRole("button", { name: "Finish & review" }),
    ).toBeInViewport();
    await expect(cue).toBeInViewport();
  }
  await expect(
    page.getByRole("button", { name: "Menü", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Options", exact: true }).click();
  await page.getByText("Recording options", { exact: true }).click();
  await expect(page.getByLabel("Create a transcript")).toBeDisabled();
  await page
    .getByText("Gesture guide and calibration", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recalibrate neutral position" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recalibrate neutral position" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^(Large|Standard) view$/ }),
  ).toHaveCount(0);
  expect(
    await video.evaluate((el, original) => el === original, originalVideo),
  ).toBe(true);
  expect(
    await video.evaluate(
      (el: HTMLVideoElement) =>
        (el.srcObject as MediaStream).getVideoTracks()[0].readyState,
    ),
  ).toBe("live");
  expect(
    await page.evaluate(
      () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});
for (const colorScheme of ["light", "dark"] as const) {
  test(`live feedback visibly tints green and red in ${colorScheme} appearance`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme });
    await syntheticCamera(page);
    await syntheticPose(page);
    await enable(page);
    await page.getByRole("button", { name: "Start recording" }).click();
    const workspace = page.locator(".live-workspace");
    const panel = page.locator(".cue-panel");
    const pixels = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.fillStyle = getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      });
    await expect(workspace).toHaveAttribute("data-feedback", "positive", {
      timeout: 10000,
    });
    const green = await pixels(".cue-panel");
    expect(green[1] - green[0]).toBeGreaterThanOrEqual(10);
    const greenWorkspace = await pixels(".live-workspace");
    expect(greenWorkspace[1]).toBeGreaterThan(greenWorkspace[0]);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`green-feedback-${colorScheme}.png`),
    });

    await startPoseSequence(page, "crossed");
    await expect(workspace).toHaveAttribute("data-feedback", "attention", {
      timeout: 12000,
    });
    await expect(page.locator(".live-cue-label")).toHaveText("Try adjusting");
    const red = await pixels(".cue-panel");
    expect(red[0] - red[1]).toBeGreaterThanOrEqual(10);
    const redWorkspace = await pixels(".live-workspace");
    expect(redWorkspace[0]).toBeGreaterThan(redWorkspace[1]);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`red-feedback-${colorScheme}.png`),
    });

    await page.evaluate(() =>
      (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
        type: "test-kind",
        kind: "neutral",
      }),
    );
    await expect(workspace).toHaveAttribute("data-feedback", "positive");
    await expect(page.locator(".live-cue-label")).toHaveText("Tracking ready");
    await page.getByLabel("Show live hints").uncheck();
    await expect(workspace).toHaveAttribute("data-feedback", "neutral");
    expect((await pixels(".live-workspace"))[3]).toBe(0);
    await page.getByRole("button", { name: "Finish & review" }).click();
    await expect(page).toHaveURL(/\/review$/);
  });
}

test("raw camera recording, stats, filtered video sections, download and refresh recovery", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  await page.getByRole("button", { name: "Start recording" }).click();
  await startPoseSequence(page);
  await expect(page.getByText("Hand above shoulder").first()).toBeVisible({
    timeout: 12000,
  });
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-studio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/live\/[^/]+\/review$/);
  await expect(
    page.getByRole("heading", { name: "Make your next take stronger." }),
  ).toBeVisible();
  const video = page.getByLabel("Recorded presentation video");
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(await video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBe(
    640,
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
    ),
  ).toBe(2);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mediaConstraints: MediaStreamConstraints })
          .mediaConstraints.audio,
    ),
  ).toBeTruthy();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-review-${info.project.name}.png`,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download video" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.webm$/);
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  const evidenceDownload = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download gesture evidence JSON" })
    .click();
  const evidenceStream = await (await evidenceDownload).createReadStream();
  const evidenceChunks: Buffer[] = [];
  for await (const chunk of evidenceStream!) evidenceChunks.push(chunk);
  const evidence = JSON.parse(Buffer.concat(evidenceChunks).toString());
  expect(evidence).toHaveLength(1);
  expect(evidence[0].session_id).toBe(page.url().split("/").at(-2));
  expect(evidence[0].payload).toMatchObject({
    rule: "hand_raised",
    heuristic: true,
    rule_version: POSE_RULES.version,
  });
  expect(evidence[0].t_ms).toBeGreaterThanOrEqual(4000);
  expect(
    evidence[0].payload.confirmed_at_ms - evidence[0].t_ms,
  ).toBeGreaterThanOrEqual(800);
  await expect(page.locator(".review-clip-list button")).toHaveCount(1);
  await page.locator(".review-clip-list button").click();
  await expect(page.locator(".review-observation h3")).toHaveText(
    "Hand above shoulder",
  );
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThanOrEqual(2);
  await page.getByLabel("Loop this section").check();
  await page
    .getByRole("button", { name: "Replay section", exact: true })
    .click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeLessThan(4);
  // Observe a real loop instead of polling a short, accelerated section at
  // intervals that can repeatedly miss its latter half.
  const loop = await video.evaluate(
    (el: HTMLVideoElement) =>
      new Promise<{ from: number; to: number; paused: boolean }>(
        (resolve, reject) => {
          let previous = el.currentTime;
          const timeout = setTimeout(() => {
            el.removeEventListener("timeupdate", observe);
            reject(new Error("Recorded feedback section did not loop"));
          }, 6000);
          function observe() {
            const current = el.currentTime;
            if (previous - current > 0.5) {
              clearTimeout(timeout);
              el.removeEventListener("timeupdate", observe);
              resolve({ from: previous, to: current, paused: el.paused });
            }
            previous = current;
          }
          el.addEventListener("timeupdate", observe);
          el.playbackRate = 4;
        },
      ),
  );
  expect(loop.from).toBeGreaterThan(loop.to + 0.5);
  expect(loop.to).toBeCloseTo(Math.max(0, evidence[0].t_ms / 1000 - 2), 0);
  expect(loop.paused).toBe(false);
  await video.evaluate((el: HTMLVideoElement) => {
    el.playbackRate = 1;
  });
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-moments-${info.project.name}.png`,
    fullPage: true,
  });
  const reviewUrl = page.url().replace(/\/moments$/, "/review");
  await page.getByRole("link", { name: "418 home", exact: true }).click();
  const resume = page.getByRole("link", {
    name: "Aufnahme ansehen",
    exact: true,
  });
  await expect(resume).toHaveAttribute("href", new URL(reviewUrl).pathname);
  await resume.click();
  await expect(page).toHaveURL(reviewUrl);
  await expect(
    page
      .getByRole("navigation", { name: "Presentation workflow" })
      .getByRole("link", { name: /Review/ }),
  ).toHaveAttribute("href", new URL(reviewUrl).pathname);
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Make your next take stronger." }),
  ).toBeVisible();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

async function backend(
  page: Page,
  transcribe = false,
  configure?: () => Promise<void>,
) {
  await syntheticCamera(page);
  await page.route("**/api/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page.goto("/live");
  // Scope to the visible main; Next can briefly retain hidden streamed markup.
  const studio = page.getByRole("main");
  await studio.getByText("Recording options", { exact: true }).click();
  await expect(
    studio.getByText("analysis results remain stored", { exact: false }),
  ).toBeVisible();
  await studio
    .getByRole("checkbox", { name: "Create a transcript", exact: true })
    .setChecked(transcribe);
  if (transcribe)
    await studio
      .getByRole("checkbox", {
        name: "Stream transcription with Deepgram (EU)",
        exact: true,
      })
      .uncheck();
  await configure?.();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
}

test("review promotes practice questions and keeps record again as a back link", async ({
  page,
}, info) => {
  const jobId = "12345678-1234-1234-1234-123456789abc";
  await syntheticPose(page);
  await page.route("**/api/sources?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 202, json: { job_id: jobId } }),
  );
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: { audio: { summary: {} }, events: [], notices: [] },
      },
    }),
  );
  await page.route("**/api/questions/agent/settings", (route) =>
    route.fulfill({ json: { available: false, reason: "Synthetic UI test" } }),
  );
  await backend(page);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  const heading = page.locator(".review-workspace .workspace-heading");
  const questions = heading.getByRole("button", {
    name: "Practice questions",
    exact: true,
  });
  await expect(questions).toHaveClass(/button-primary/);
  await expect(questions).toBeInViewport();
  const back = page
    .locator(".review-workspace .workspace-back")
    .getByRole("link", { name: "Record again", exact: true });
  await expect(back).toHaveAttribute("href", "/live");
  await expect(back).not.toHaveClass(/button/);
  await expect(back).toHaveCSS("min-height", "48px");
  await expect(back.locator("svg")).toHaveClass(/lucide-arrow-left/);
  expect((await back.boundingBox())!.y).toBeLessThan(
    (await heading.boundingBox())!.y,
  );
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("review-top-actions.png") });
  await questions.click();
  await expect(
    page
      .getByRole("group", { name: "Review steps" })
      .getByRole("button", { name: "Practice questions", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "Practice questions", exact: true }),
  ).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/live$/);
});

test("admin feature options persist, filter speech markers and lock the take", async ({
  page,
}, info) => {
  await syntheticPose(page);
  const jobId = "12345678-1234-1234-1234-123456789abc";
  const events = ["pause", "pitch"].map((type) => ({
    t_ms: 100,
    duration_ms: 200,
    type,
    severity: "hint",
    source: "speech",
    payload: {},
  }));
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 202, json: { job_id: jobId } }),
  );
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: { audio: { summary: { pause_count: 1 } }, events },
      },
    }),
  );
  await page.route("**/api/transcription/analyze-words", (route) =>
    route.fulfill({
      json: {
        summary: { pause_count: 1 },
        events: events.map((e) => ({ ...e, source: "asr" })),
      },
    }),
  );
  await page.goto("/admin");
  await expect(page.getByLabel("Pose processing")).toHaveValue("VIDEO");
  await expect(page.getByLabel("Pose model")).toHaveValue("lite");
  await page.getByLabel("Pose processing").selectOption("IMAGE");
  await page.getByLabel("Pose model").selectOption("heavy");
  await page.getByLabel("Pauses", { exact: true }).uncheck();
  await backend(page, false, async () => {
    await expect(
      page.getByRole("link", { name: "Admin" }).last(),
    ).toBeVisible();
    await page.getByText("Camera diagnostics", { exact: true }).click();
  });
  await expect(
    page.getByRole("button", { name: "Pose lab", exact: true }),
  ).toBeDisabled();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("feature-options.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText("pause", { exact: true })).toHaveCount(0);
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  await expect(
    page.getByText("Audio: pause count", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".review-clip-list")).toContainText("pitch");
  await page
    .getByText("Recording details and exports", { exact: true })
    .locator("..")
    .evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  await page
    .getByText("Replace transcript timestamps", { exact: true })
    .click();
  await page.getByLabel("Word timestamps (JSON)").setInputFiles({
    name: "words.json",
    mimeType: "application/json",
    buffer: Buffer.from('[{"word":"Test","start_ms":100,"end_ms":300}]'),
  });
  await expect(
    page.getByText("Transcript analysis added to this take."),
  ).toBeVisible();
  await expect(page.getByText("pause", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Record again" }).click();
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.reload();
  await expect(page.getByLabel("Pose processing")).toHaveValue("IMAGE");
  await expect(page.getByLabel("Pose model")).toHaveValue("heavy");
  await expect(page.getByLabel("Pauses", { exact: true })).not.toBeChecked();
  await page.getByLabel("Speech feedback", { exact: true }).uncheck();
  await expect(page.getByLabel("Pitch variation")).toBeDisabled();
});

test("REST analysis uploads recorded audio/video and merges word feedback into review", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  let uploads = 0;
  await page.route("**/api/speech/analyze", async (route) => {
    uploads++;
    expect(route.request().headers()["content-type"]).toContain(
      "multipart/form-data",
    );
    expect(route.request().postDataBuffer()!.length).toBeGreaterThan(1000);
    await route.fulfill({
      status: 202,
      json: {
        job_id: "12345678-1234-1234-1234-123456789abc",
        status_url: "/speech/jobs/12345678-1234-1234-1234-123456789abc",
      },
    });
  });
  let polls = 0;
  await page.route("**/api/speech/jobs/*", async (route) => {
    polls++;
    await route.fulfill({
      json: {
        job_id: "12345678-1234-1234-1234-123456789abc",
        status: polls === 1 ? "running" : "completed",
        result:
          polls === 1
            ? null
            : {
                audio: { summary: { pause_count: 1 } },
                events: [
                  {
                    t_ms: 100,
                    duration_ms: 400,
                    type: "pause",
                    severity: "info",
                    payload: {},
                  },
                ],
              },
      },
    });
  });
  await page.route("**/api/transcription/analyze-words", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      words: [{ word: "um", start_ms: 100, end_ms: 300 }],
    });
    await route.fulfill({
      json: {
        summary: { filler_count: 1 },
        events: [
          {
            t_ms: 100,
            duration_ms: 200,
            type: "filler",
            severity: "hint",
            payload: { word: "um" },
          },
        ],
      },
    });
  });
  await backend(page);
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  expect(uploads).toBe(1);
  await page
    .getByText("Recording details and exports", { exact: true })
    .locator("..")
    .evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
  await expect(page.getByText("Audio: pause count")).toBeVisible();
  await page
    .getByText("Replace transcript timestamps", { exact: true })
    .click();
  await page.getByLabel("Word timestamps (JSON)").setInputFiles({
    name: "words.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([{ word: "um", start_ms: 100, end_ms: 300 }]),
    ),
  });
  await expect(
    page.getByText("Transcript analysis added to this take."),
  ).toBeVisible();
  await expect(page.getByText("Transcript: filler count")).toBeVisible();
  // Both events begin at 100 ms: duration bars used to obscure each other.
  await page.getByText("All 2 timestamped moments", { exact: true }).click();
  const timeline = page.getByRole("group", { name: "Feedback timeline" });
  const jumps = timeline.getByRole("button");
  await expect(jumps).toHaveCount(2);
  const bounds = [];
  for (const jump of await jumps.all()) {
    await expect(jump.locator(".timeline-time")).toHaveText("0:01");
    await expect(jump.locator(".timeline-time")).toBeVisible();
    const title = await jump.locator(".timeline-title").innerText();
    await jump.focus();
    await page.keyboard.press("Enter");
    await expect(jump).toHaveAttribute("aria-pressed", "true");
    await expect(jump).toHaveAttribute(
      "data-feedback",
      title.startsWith("pause") ? "neutral" : "attention",
    );
    await expect(page.locator(".review-observation h3")).toHaveText(title);
    bounds.push((await jump.boundingBox())!);
  }
  const [first, second] = bounds;
  expect(first.height).toBeGreaterThanOrEqual(44);
  expect(second.height).toBeGreaterThanOrEqual(44);
  expect(
    second.x >= first.x + first.width || second.y >= first.y + first.height,
  ).toBe(true);
  await noOverflow(page);
  await timeline.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("readable-timestamp-jumps.png"),
  });
});

test("data-based review keeps strengths and actionable feedback when the model is unavailable", async ({
  page,
}, info) => {
  const jobId = "12345678-1234-1234-1234-123456789abc";
  await page.route("**/api/factcheck/settings", (route) =>
    route.fulfill({
      json: {
        available: false,
        model: null,
        llm_host: null,
        web_provider: null,
      },
    }),
  );
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 202, json: { job_id: jobId } }),
  );
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: {
          audio: { summary: { pause_count: 1 } },
          transcription: { summary: { filler_count: 1 } },
          words: [
            { word: "Gedanke.", start_ms: 0, end_ms: 100 },
            { word: "Danach", start_ms: 400, end_ms: 600 },
          ],
          asr_provider: "synthetic-fixture",
          synthetic_demo: true,
          notices: [],
          events: [
            {
              type: "pause",
              source: "asr",
              severity: "info",
              t_ms: 100,
              duration_ms: 300,
              payload: {
                gap_ms: 300,
                before: "Gedanke.",
                after: "Danach",
                mid_sentence: false,
              },
            },
            {
              type: "filler",
              source: "asr",
              severity: "hint",
              t_ms: 700,
              duration_ms: 200,
              payload: { kind: "filler", word: "ähm" },
            },
          ],
        },
      },
    }),
  );
  await backend(page, true);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  const list = page.locator(".review-clip-list");
  await expect(list).toContainText("Keep doing this");
  await expect(list).toContainText("Try an adjustment");
  await list.getByRole("button").filter({ hasText: "filler" }).click();
  await expect(page.locator(".review-observation")).toContainText(
    "Occasional fillers are normal",
  );
  await expect(page.locator(".review-next-action")).toContainText(
    "silent thinking pause",
  );
  await list.getByRole("button").filter({ hasText: "pause" }).click();
  await expect(page.locator(".review-observation")).toContainText(
    "What worked and why",
  );
  await expect(page.locator(".review-observation")).toContainText(
    "sentence-ending punctuation",
  );
  await expect(page.locator(".review-next-action")).toContainText(
    "keep this space",
  );
  await expect(
    page.getByRole("button", { name: "Replay section" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("grounded-fallback-review.png"),
    fullPage: true,
  });
});

test("analysis failure preserves playable recording", async ({ page }) => {
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 503 }),
  );
  await backend(page);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText("HTTP 503", { exact: false })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("local pose worker loads real assets and runs on synthetic camera frames", async ({
  page,
}) => {
  await syntheticCamera(page);
  await enable(page);
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByText("No usable pose. Keep your upper body in frame."),
  ).toBeVisible({ timeout: 45000 });
  await page
    .getByRole("button", { name: "Turn camera off", exact: true })
    .click();
  await expect(
    page.getByText(
      "Camera stopped. Your captured samples are ready to download.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download pose JSONL" }),
  ).toHaveCount(0);
});

test("pose JSONL stays local, resets for recording and survives review navigation", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") uploads.push(request.url());
  });
  await page.route("**/pose/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    onmessage = ({data}) => {
      if (data.type === 'init') postMessage({type:'ready'});
      if (data.type === 'frame') {
        const points = Array.from({length:33}, (_,i) => ({x:.4+(i%2)*.2,y:.2+i*.01,z:-.1,visibility:i>=25?.1:.99,presence:.99}));
        postMessage({type:'sample',timestamp:data.timestamp,width:data.frame.width,height:data.frame.height,points});
        data.frame.close();
      }
    };
  `,
    }),
  );
  await enable(page);
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByText("Pose samples stay in this browser."),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  await page
    .getByLabel("Your local camera feed")
    .evaluate((v: HTMLVideoElement) => v.pause());
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByLabel("Local pose capture")).toContainText(
    /[1-9]\d* pose samples/,
  );
  await page.waitForTimeout(700);
  await page.screenshot({
    path: info.outputPath("pose-studio.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download pose JSONL" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const buffers = [];
  for await (const chunk of stream!) buffers.push(chunk);
  const samples = Buffer.concat(buffers)
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(samples.length).toBeGreaterThan(0);
  expect(samples[0].t_ms).toBeLessThan(500);
  expect(samples.at(-1).t_ms).toBeLessThan(1200);
  expect(Object.keys(samples[0].pose)).toHaveLength(21);
  expect(samples[0].pose.left_knee).toBeNull();
  expect(samples[0].quality).toMatchObject({
    pose_present: true,
    legs_visible: false,
    hips_visible: true,
  });
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toMatch(/\/speech\/analyze$/);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("pose-review.png"),
    fullPage: true,
  });
});

test("automatic landmarks align with the full-size mirrored video and clear when lost", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("/pose/worker.js"))
          (window as unknown as { poseWorker: Worker }).poseWorker = this;
      }
    };
  });
  await page.route("**/pose/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `let visible = true;
      onmessage = ({data}) => {
        if (data.type === 'init') postMessage({type:'ready'});
        if (data.type === 'visible') visible = data.value;
        if (data.type === 'frame') {
          const points = Array.from({length:33}, (_,i) => ({x:.4+(i%2)*.2,y:.2+i*.01,z:0,visibility:i>=25?.1:.99,presence:.99}));
          points[13].visibility = .1;
          postMessage({type:'sample',timestamp:data.timestamp,width:data.frame.width,height:data.frame.height,points:visible?points:[]});
          data.frame.close();
        }
      };`,
    }),
  );
  await enable(page);
  const overlay = page.getByRole("img", {
    name: "Live pose and hand landmarks",
  });
  await expect(overlay).toBeVisible();
  await expect(overlay.locator("circle")).toHaveCount(16);
  await expect(overlay.locator('[data-landmark="left_elbow"]')).toHaveCount(0);
  await expect(overlay.locator('[data-landmark="left_knee"]')).toHaveCount(0);
  const expected = await page
    .getByLabel("Your local camera feed")
    .evaluate((video: HTMLVideoElement) => {
      const rect = video.getBoundingClientRect();
      const scale =
        getComputedStyle(video).objectFit === "contain"
          ? Math.min(
              rect.width / video.videoWidth,
              rect.height / video.videoHeight,
            )
          : Math.max(
              rect.width / video.videoWidth,
              rect.height / video.videoHeight,
            );
      return {
        x: rect.x + rect.width / 2 + 0.1 * video.videoWidth * scale,
        y: rect.y + rect.height / 2 - 0.3 * video.videoHeight * scale,
      };
    });
  const nose = (await overlay.locator('[data-landmark="nose"]').boundingBox())!;
  expect(nose.x + nose.width / 2).toBeCloseTo(expected.x, 0);
  expect(nose.y + nose.height / 2).toBeCloseTo(expected.y, 0);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("landmarks-full-size.png"),
    fullPage: true,
  });
  await page.evaluate(() =>
    (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
      type: "visible",
      value: false,
    }),
  );
  await expect(overlay).toHaveCount(0);
  await expect(
    page.getByText("No pose in frame", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
      type: "visible",
      value: true,
    }),
  );
  await expect(overlay).toBeVisible();
  await page.getByRole("button", { name: "Turn camera off" }).click();
  await expect(overlay).toHaveCount(0);
  await page.getByRole("button", { name: "Enable camera" }).click();
  await expect(overlay).toBeVisible();
});

test("pose model failure preserves camera recording controls", async ({
  page,
}) => {
  await syntheticCamera(page);
  await page.route("**/pose/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "onmessage=()=>postMessage({type:'error'});",
    }),
  );
  await enable(page);
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await expect(
    page.getByText("Pose detection failed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start recording" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Retry landmarks" }),
  ).toBeEnabled();
});

test("sideways motion and crossed arms reach review while live hints can be muted", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  await page.getByRole("button", { name: "Start recording" }).click();
  await startPoseSequence(page, "shift");
  await expect(page.locator(".cue-message")).toHaveText(
    "Sideways position change",
    { timeout: 12000 },
  );
  await page.getByText("Camera diagnostics", { exact: true }).click();
  await page.getByRole("button", { name: "Pose debug" }).click();
  await expect(page.getByLabel("Pose debug readout")).toContainText(
    "Sideways shift: 0.50",
  );
  await page.getByLabel("Show live hints").uncheck();
  await expect(page.locator(".cue-message")).toHaveText("Live hints hidden");
  await page.evaluate(() =>
    (window as unknown as { poseWorker: Worker }).poseWorker.postMessage({
      type: "test-kind",
      kind: "crossed",
    }),
  );
  await page.getByText("Session observations", { exact: true }).first().click();
  await expect(page.locator(".event-feed")).toContainText(
    "Arms crossed in front of torso",
    { timeout: 7000 },
  );
  await expect(page.locator(".cue-message")).toHaveText("Live hints hidden");
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "neutral",
  );
  await page.getByLabel("Show live hints").check();
  await expect(page.locator(".cue-message")).toHaveText(
    "Arms crossed in front of torso",
  );
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "attention",
  );
  await expect(
    page.locator("svg.live-cue-icon.lucide-unfold-horizontal"),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("pose-debug.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByText("All 2 timestamped moments", { exact: true }).click();
  await expect(
    page.getByLabel("Feedback timeline").getByRole("button"),
  ).toHaveCount(2);
  await page
    .locator(".review-clip-list button")
    .filter({ hasText: "Arms crossed in front of torso" })
    .click();
  await expect(page.locator(".review-observation h3")).toHaveText(
    "Arms crossed in front of torso",
  );
});

test("transcribed take is fact-checked against sources and links back to the video", async ({
  page,
}, info) => {
  const jobId = "12345678-1234-1234-1234-123456789abc";
  const factJob = "87654321-4321-4321-4321-cba987654321";
  const words = [
    { word: "Wir", start_ms: 200, end_ms: 400 },
    { word: "haben", start_ms: 450, end_ms: 700 },
    { word: "9000", start_ms: 750, end_ms: 1000 },
    { word: "Studierende.", start_ms: 1050, end_ms: 1150 },
  ];
  await page.route("**/api/speech/analyze", async (route) => {
    expect(route.request().postData()).toContain(
      'name="transcribe"\r\n\r\ntrue',
    );
    await route.fulfill({
      status: 202,
      json: { job_id: jobId, status_url: `/speech/jobs/${jobId}` },
    });
  });
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: {
          audio: { summary: { pause_count: 0 } },
          events: [],
          words,
          asr_provider: "whisper",
          synthetic_demo: false,
          notices: [],
          transcription: { summary: { word_count: 4 }, events: [] },
        },
      },
    }),
  );
  await page.route("**/api/factcheck/settings", (route) =>
    route.fulfill({
      json: {
        available: true,
        model: "synthetic-model",
        llm_host: "llm.example",
        web_provider: "wikipedia",
      },
    }),
  );
  await page.route("**/api/sources?*", (route) =>
    route.fulfill({
      json: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          collection_id: "00000000-0000-4000-8000-000000000002",
          filename: "folien.pdf",
          content_type: "application/pdf",
          size_bytes: 10,
          status: "ready",
          chunk_count: 3,
          created_at: "2026-10-24T12:00:00Z",
        },
      ],
    }),
  );
  let request: Record<string, unknown> | null = null;
  await page.route("**/api/factcheck", async (route) => {
    request = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      json: { job_id: factJob, status_url: `/factcheck/jobs/${factJob}` },
    });
  });
  await page.route(`**/api/factcheck/jobs/${factJob}`, (route) =>
    route.fulfill({
      json: {
        job_id: factJob,
        status: "completed",
        result: {
          claims: [
            {
              claim: "Die Hochschule hat 9000 Studierende.",
              transcript: "Wir haben 9000 Studierende.",
              t_ms: 200,
              duration_ms: 1200,
              verdict: "contradicts",
              explanation: "Die Folie nennt rund 9.500 Studierende.",
              evidence: {
                kind: "upload",
                label: "folien.pdf, Seite 2",
                quote: "rund 9.500 Studierende in acht Fachbereichen",
                passage:
                  "Die Hochschule hat rund 9.500 Studierende in acht Fachbereichen.",
                filename: "folien.pdf",
                quote_verified: "exact",
                similarity: 0.2,
                weak: true,
                location: { kind: "page", start: 2, end: 2 },
              },
              checked: ["upload"],
              notes: [],
            },
          ],
          events: [],
          model: "synthetic-model",
          web_provider: "wikipedia",
          sources_checked: true,
          config: {
            max_claims: 12,
            min_quote_chars: 12,
            top_k: 5,
            web_results: 4,
          },
          notices: ["Synthetic notice."],
        },
      },
    }),
  );
  await backend(page, true);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByText("Transcript and source checks", { exact: true }).click();
  const factCheck = page.locator('[aria-labelledby="fact-check-title"]');
  const inputs = factCheck.locator(".fact-check-inputs");
  await expect(inputs).toContainText("4 words");
  await expect(inputs).toContainText("1 ready");
  await expect(
    factCheck.getByText("llm.example", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check facts" }).click();
  await expect(page.locator(".fact-verdict")).toHaveText(
    "Source says otherwise",
  );
  await expect(page.locator(".review-clip-list")).toContainText(
    "Source says otherwise",
  );
  await expect(page.locator(".fact-claim blockquote")).toContainText(
    "“rund 9.500 Studierende in acht Fachbereichen”folien.pdf, Page 2",
  );
  await expect(page.locator(".fact-claim blockquote")).toContainText(
    "Quoted text found in the cited source; short quotes may include surrounding context.",
  );
  await expect(page.locator(".fact-claim blockquote")).toContainText(
    "Retrieval similarity 0.20 (uncalibrated signal). Weak retrieval match: check the passage.",
  );
  expect(request).toMatchObject({ words, use_web: false });
  expect(request!.collection_id).toMatch(/^[0-9a-f-]{36}$/);
  await page.locator(".fact-claim-head button").click();
  await expect(page.locator(".review-observation")).toContainText(
    "Source says otherwise",
  );
  await noOverflow(page);
  await factCheck.screenshot({
    path: `test-results/fact-check-${info.project.name}.png`,
  });
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Practice questions" })
    .click();
  await expect(
    page.getByRole("button", { name: "Practice by typing", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Answer method" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Start voice questions", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("live captions send PCM only during recording and a disconnect keeps the take usable", async ({
  page,
}) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 503 }),
  );
  let frames = 0;
  await page.routeWebSocket("**/api/speech/live", (socket) => {
    socket.onMessage((message) => {
      if (typeof message === "string") {
        expect(JSON.parse(message)).toEqual({
          type: "start",
          sample_rate: 16000,
          provider: "deepgram",
        });
        socket.send(
          JSON.stringify({
            type: "ready",
            sample_rate: 16000,
            provider: "deepgram",
          }),
        );
      } else {
        expect(message.byteLength).toBe(3200);
        frames++;
        socket.send(
          JSON.stringify({
            type: "text",
            text: "Synthetic live caption",
            final: false,
          }),
        );
        if (frames === 3)
          socket.close({ code: 1013, reason: "Synthetic capacity failure" });
      }
    });
  });
  await backend(page, true, async () => {
    await page.getByLabel("Stream transcription with Deepgram (EU)").check();
    await expect(page.locator(".recording-consent")).toContainText("Deepgram");
    expect(frames).toBe(0);
  });
  await expect(page.getByLabel("Live captions", { exact: true })).toContainText(
    "Recording continues",
  );
  expect(frames).toBe(3);
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  expect(frames).toBe(3);
});

test("signal feedback appears during recording without captions and failure preserves the take", async ({
  page,
}) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 503 }),
  );
  let frames = 0;
  let disconnect = () => {};
  await page.routeWebSocket("**/api/speech/feedback", (socket) => {
    disconnect = () =>
      socket.close({ code: 1013, reason: "Synthetic capacity failure" });
    socket.onMessage((message) => {
      if (typeof message === "string") {
        if (JSON.parse(message).type === "start")
          socket.send(JSON.stringify({ type: "ready", sample_rate: 16000 }));
      } else if (++frames === 50) {
        socket.send(
          JSON.stringify({
            type: "feedback",
            position_ms: 5000,
            events: [
              {
                t_ms: 3000,
                duration_ms: 2000,
                type: "volume",
                severity: "hint",
                source: "speech",
                payload: { direction: "quiet" },
              },
            ],
          }),
        );
      }
    });
  });
  await page.goto("/live");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  expect(frames).toBe(0);
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect(page.locator(".cue-message")).toHaveText(
    "Your voice is quieter",
    { timeout: 15000 },
  );
  await expect(page.locator(".live-cue-detail")).toHaveText(
    "Check your speaking volume and microphone distance.",
  );
  disconnect();
  await expect(page.locator(".camera-message")).toContainText(
    "Recording continues",
  );
  await expect(
    page.getByText("Your voice is quieter", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("unavailable backend blocks recording until the backend recovers", async ({
  page,
}) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/ready", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto("/live");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect(page.locator(".status-error")).toContainText(
    "Nothing has been recorded",
  );
  await expect(page.locator(".status-error")).not.toContainText(
    "recording is preserved",
  );
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toHaveCount(0);
  await expect(page.locator(".status-error")).toContainText(
    "Start the backend",
  );
  await expect(page.getByLabel("Speech analysis", { exact: true })).toHaveCount(
    0,
  );
  await page.route("**/api/health/ready", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("Deepgram streaming waits for the last word and reuses the final transcript in review", async ({
  page,
}) => {
  await syntheticPose(page);
  let frames = 0;
  let stopped = false;
  let uploaded = false;
  const words = [
    { word: "Hallo,", start_ms: 0, end_ms: 150 },
    { word: "Fulda.", start_ms: 500, end_ms: 650 },
  ];
  await page.routeWebSocket("**/api/speech/live", (socket) => {
    socket.onMessage((message) => {
      if (typeof message === "string") {
        const control = JSON.parse(message);
        if (control.type === "start") {
          expect(control.provider).toBe("deepgram");
          expect(frames).toBe(0);
          socket.send(
            JSON.stringify({
              type: "ready",
              sample_rate: 16000,
              provider: "deepgram",
            }),
          );
        } else {
          expect(control.type).toBe("stop");
          expect(frames).toBeGreaterThan(0);
          stopped = true;
          socket.send(JSON.stringify({ type: "words", final: true, words }));
          socket.send(
            JSON.stringify({
              type: "text",
              final: true,
              text: "Hallo, Fulda.",
            }),
          );
          socket.send(JSON.stringify({ type: "done" }));
        }
      } else {
        expect(stopped).toBe(false);
        expect(message.byteLength).toBeLessThanOrEqual(3200);
        expect(message.byteLength % 2).toBe(0);
        frames++;
        socket.send(
          JSON.stringify({ type: "text", text: "Hallo,", final: false }),
        );
      }
    });
  });
  const job = "12345678-1234-1234-1234-123456789abc";
  await page.route("**/api/speech/analyze", async (route) => {
    expect(stopped).toBe(true);
    const body = route.request().postDataBuffer()!.toString();
    const transcript = body.match(/name="live_transcript"\r\n\r\n([^\r]+)\r\n/);
    expect(transcript).not.toBeNull();
    expect(JSON.parse(transcript![1])).toEqual({ provider: "deepgram", words });
    expect(body).toContain('name="local_only"\r\n\r\nfalse');
    uploaded = true;
    await route.fulfill({
      status: 202,
      json: { job_id: job, status_url: `/speech/jobs/${job}` },
    });
  });
  await page.route(`**/api/speech/jobs/${job}`, (route) =>
    route.fulfill({
      json: {
        job_id: job,
        status: "completed",
        result: {
          audio: { summary: {}, events: [] },
          events: [],
          words,
          asr_provider: "deepgram",
          synthetic_demo: false,
          notices: [],
          transcription: { summary: { word_count: 2 }, events: [] },
        },
      },
    }),
  );
  await backend(page, true, () =>
    page.getByLabel("Stream transcription with Deepgram (EU)").check(),
  );
  await expect(page.getByLabel("Live captions", { exact: true })).toContainText(
    "Hallo,",
  );
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  expect(uploaded).toBe(true);
  await page.getByText("Transcript and source checks", { exact: true }).click();
  await expect(page.locator(".recorded-transcript")).toContainText("deepgram");
  await expect(
    page
      .locator(".recorded-transcript")
      .getByRole("button", { name: "Fulda." }),
  ).toBeVisible();
});

test("ElevenLabs receives the presentation, asks for readiness and opens final stats when ended", async ({
  page,
}, info) => {
  const jobId = "12345678-1234-1234-1234-123456789abc";
  const sourceId = "87654321-4321-4321-4321-cba987654321";
  let material: Record<string, unknown> | null = null;
  let savedCollection = "";
  await page.route("**/api/sources?*", (route) =>
    route.fulfill({ json: material ? [material] : [] }),
  );
  await page.route("**/api/sources", async (route) => {
    expect(route.request().postData()).toContain("Synthetic thesis notes");
    savedCollection = /name="collection_id"\r\n\r\n([^\r]+)/.exec(
      route.request().postData()!,
    )![1];
    material = {
      id: sourceId,
      collection_id: savedCollection,
      filename: "thesis.txt",
      status: "ready",
      chunk_count: 1,
      size_bytes: 22,
      content_type: "text/plain",
      created_at: "2026-10-24T12:00:00Z",
    };
    await route.fulfill({ status: 202, json: { source: material } });
  });
  await page.route("**/api/speech/analyze", (route) =>
    route.fulfill({ status: 202, json: { job_id: jobId } }),
  );
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: {
          audio: { summary: {} },
          events: [],
          words: [
            { word: "Synthetic thesis result.", start_ms: 0, end_ms: 500 },
          ],
          asr_provider: "whisper",
          synthetic_demo: true,
          notices: [],
        },
      },
    }),
  );
  await page.route("**/api/questions/agent/settings", (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route("**/api/questions/agent", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      presentation_mode: "thesis",
      collection_id: savedCollection,
      words: [{ word: "Synthetic thesis result.", start_ms: 0, end_ms: 500 }],
    });
    await route.fulfill({ status: 202, json: { job_id: jobId } });
  });
  await page.route("**/api/questions/agent/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: {
          prompt: "Synthetic thesis context with source notes",
          source_count: 1,
          notices: [],
        },
      },
    }),
  );
  await page.route("**/api/questions/agent/session", (route) =>
    route.fulfill({
      json: {
        signed_url:
          "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=synthetic",
      },
    }),
  );
  const closed = new Set<WebSocketRoute>();
  let override = "";
  let kickoffs = 0;
  let endFromAgent = () => {};
  let sendUserAnswer = () => {};
  let playAgentAudio: (seconds: number) => void = () => {};
  const microphonePackets: boolean[] = [];
  let audioEventId = 0;
  await page.routeWebSocket("wss://api.elevenlabs.io/**", (socket) => {
    playAgentAudio = (seconds) =>
      socket.send(
        JSON.stringify({
          type: "audio",
          audio_event: {
            audio_base_64: Buffer.alloc(16000 * 2 * seconds).toString("base64"),
            event_id: ++audioEventId,
          },
        }),
      );
    endFromAgent = () => socket.close({ code: 1000 });
    sendUserAnswer = () =>
      socket.send(
        JSON.stringify({
          type: "user_transcript",
          user_transcription_event: {
            user_transcript: "Synthetic spoken answer.",
          },
        }),
      );
    socket.onClose(() => closed.add(socket));
    socket.onMessage((raw) => {
      if (typeof raw !== "string") return;
      const message = JSON.parse(raw);
      if (message.user_audio_chunk) {
        microphonePackets.push(
          Buffer.from(message.user_audio_chunk, "base64").some(
            (byte) => byte !== 0,
          ),
        );
      }
      if (message.type === "conversation_initiation_client_data") {
        override = message.conversation_config_override.agent.prompt.prompt;
        expect(message.conversation_config_override.agent.first_message).toBe(
          "Ich habe noch ein paar Fragen. Bist du bereit?",
        );
        socket.send(
          JSON.stringify({
            type: "conversation_initiation_metadata",
            conversation_initiation_metadata_event: {
              conversation_id: "synthetic-conversation",
              agent_output_audio_format: "pcm_16000",
              user_input_audio_format: "pcm_16000",
            },
          }),
        );
        socket.send(
          JSON.stringify({
            type: "agent_response",
            agent_response_event: {
              // Provider-supplied tags must still be hidden in the transcript.
              agent_response:
                "[rushed] Ich habe noch ein paar Fragen. Bist du bereit?",
            },
          }),
        );
      }
      if (message.type === "user_message") kickoffs++;
    });
  });
  await page.goto("/admin");
  const savedProtection = page.getByRole("checkbox", {
    name: "Protect agent speech",
  });
  await expect(savedProtection).not.toBeChecked();
  await savedProtection.check();
  await page.reload();
  await expect(savedProtection).toBeChecked();
  await page.goto("/sources");
  await expect(page.locator('input[type="file"]')).toBeEnabled();
  await page.getByLabel("What are you preparing for?").selectOption("thesis");
  await expect(page.locator("#presentation-mode-focus")).toContainText(
    "University professor",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "thesis.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic thesis notes"),
  });
  await expect(
    page.getByRole("region", { name: "Uploaded sources" }),
  ).toContainText("Ready");
  await backend(page, true);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  // A later browser collection choice must not retarget an already recorded take.
  await page.evaluate(() =>
    localStorage.setItem(
      "pitchcoach.sourceCollection",
      "00000000-0000-4000-8000-000000000099",
    ),
  );
  await page.evaluate(() =>
    localStorage.setItem("pitchcoach.presentationMode", "school"),
  );
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Practice questions" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meet your university professor." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start voice questions" }).click();
  await expect(
    page.getByRole("button", { name: "End conversation" }),
  ).toBeVisible({ timeout: 15000 });
  expect(override).toBe("Synthetic thesis context with source notes");
  await expect(
    page.getByRole("heading", {
      name: "Ich habe noch ein paar Fragen. Bist du bereit?",
    }),
  ).toBeVisible();
  expect(kickoffs).toBe(0);
  const protection = page.getByRole("checkbox", {
    name: "Protect agent speech",
  });
  await expect(protection).toBeChecked();
  async function expectMicrophoneAudio(nonzero: boolean) {
    const before = microphonePackets.length;
    await expect
      .poll(() => microphonePackets.length)
      .toBeGreaterThan(before + 2);
    await expect
      .poll(() => microphonePackets.slice(-2))
      .toEqual([nonzero, nonzero]);
  }
  // Use the actual SDK and AudioWorklet: agent playback sends only silent
  // microphone PCM, despite the synthetic microphone's continuous tone.
  await expectMicrophoneAudio(true);
  playAgentAudio(3);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "microphone automatically muted" }),
  ).toBeVisible();
  await expectMicrophoneAudio(false);
  await expect(
    page.getByRole("status").filter({ hasText: "Listening to your answer" }),
  ).toBeVisible();
  await expectMicrophoneAudio(true);

  playAgentAudio(10);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "microphone automatically muted" }),
  ).toBeVisible();
  await protection.uncheck();
  await expectMicrophoneAudio(true);
  // Changing the saved setting in Admin must reach an already open round.
  const adminTab = await page.context().newPage();
  await adminTab.goto("/admin");
  await adminTab
    .getByRole("checkbox", { name: "Protect agent speech" })
    .check();
  await expect(protection).toBeChecked();
  await expectMicrophoneAudio(false);
  await adminTab.close();
  await page
    .getByRole("button", { name: "Mute microphone", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unmute microphone", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Microphone muted" }),
  ).toBeVisible();
  await expectMicrophoneAudio(false);
  await page
    .getByRole("button", { name: "Unmute microphone", exact: true })
    .click();
  await expectMicrophoneAudio(true);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("professor-question.png"),
    fullPage: true,
  });
  const stoppedBeforeEnd = await page.evaluate(
    () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
  );
  await page
    .getByRole("button", { name: "End conversation", exact: true })
    .click();
  await expect.poll(() => closed.size).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
      ),
    )
    .toBeGreaterThan(stoppedBeforeEnd);
  const stats = page.getByRole("heading", { name: "Your take at a glance" });
  await expect(stats).toBeVisible();
  await expect(stats).toBeFocused();
  await expect(page.locator(".performance-score")).toHaveText("100/100");
  const practiceAgain = page.getByRole("link", {
    name: "Practice again",
    exact: true,
  });
  await expect(practiceAgain).toBeVisible();
  await expect(practiceAgain).toHaveAttribute("href", "/live");
  await expect(practiceAgain).toHaveClass(/button-primary/);
  await page.screenshot({
    path: info.outputPath("final-overall-score.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Meet your university professor." }),
  ).not.toBeVisible();
  await expect(
    page.getByText(
      "No checked statements or answered questions were available.",
    ),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .getByRole("button", { name: "Back to questions", exact: true })
    .click();
  await expect(stats).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meet your university professor." }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Start a new conversation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "End conversation", exact: true }),
  ).toBeVisible();
  endFromAgent();
  await expect(stats).toBeVisible();
  await expect(stats).toBeFocused();
  await expect.poll(() => closed.size).toBe(2);
  const savedReviewUrl = page.url();
  await practiceAgain.click();
  await expect(page).toHaveURL(/\/live$/);
  await expect(
    page.getByRole("button", { name: "Enable camera", exact: true }),
  ).toBeVisible();
  // Starting another practice must retain the completed take and its questions.
  await page.goto(savedReviewUrl);
  await expect(page.getByLabel("Recorded presentation video")).toBeVisible();
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Practice questions" })
    .click();
  await page.getByText("Conversation transcript", { exact: true }).click();
  await expect(page.locator(".conversation-transcript")).toContainText(
    "Ich habe noch ein paar Fragen. Bist du bereit?",
  );
  await page
    .getByRole("button", { name: "Start a new conversation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "End conversation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Review moments" })
    .click();
  await expect.poll(() => closed.size).toBe(3);
  expect(kickoffs).toBe(0);
  await expect(page.getByLabel("Recorded presentation video")).toBeVisible();
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Practice questions" })
    .click();
  await page.getByText("Conversation transcript", { exact: true }).click();
  await expect(page.locator(".conversation-transcript")).toContainText(
    "Ich habe noch ein paar Fragen. Bist du bereit?",
  );
  expect(closed.size).toBe(3);

  // Exercise the actual SDK connection and microphone cleanup at both limits.
  await page
    .getByRole("button", { name: "Start a new conversation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "End conversation", exact: true }),
  ).toBeVisible();
  const stoppedBeforeLimit = await page.evaluate(
    () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
  );
  for (let turn = 0; turn < 12; turn++) sendUserAnswer();
  await expect(
    page.getByRole("button", { name: "Session limit reached", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => closed.size).toBe(4);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
      ),
    )
    .toBeGreaterThan(stoppedBeforeLimit);
  await expect(page.locator(".conversation-transcript li")).toHaveCount(13);

  await page
    .getByRole("button", { name: "Start a new round", exact: true })
    .click();
  await page.clock.install();
  await page
    .getByRole("button", { name: "Start voice questions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "End conversation", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(600_000);
  await expect(
    page.getByRole("button", { name: "Session limit reached", exact: true }),
  ).toBeDisabled();
  await expect.poll(() => closed.size).toBe(5);

  // The same deadline must cancel context preparation, before a socket exists.
  await page
    .getByRole("button", { name: "Start a new round", exact: true })
    .click();
  await page.route("**/api/questions/agent/jobs/*", (route) =>
    route.fulfill({ json: { job_id: jobId, status: "running" } }),
  );
  await page
    .getByRole("button", { name: "Start voice questions", exact: true })
    .click();
  await expect(
    page.getByText("Reading your presentation and material…", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(600_000);
  await expect(
    page.getByRole("button", { name: "Session limit reached", exact: true }),
  ).toBeDisabled();
  expect(closed.size).toBe(5);
});

test("past sessions keep video and updated feedback across reload and can be deleted", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  const reviewUrl = page.url();
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  const originalUrl = await page
    .getByLabel("Recorded presentation video")
    .getAttribute("src");
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  await page
    .getByText("Replace transcript timestamps", { exact: true })
    .click();
  await page.route("**/api/transcription/analyze-words", (route) =>
    route.fulfill({
      json: { events: [], summary: {} },
    }),
  );
  await page.getByLabel("Word timestamps (JSON)").setInputFiles({
    name: "words.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([{ word: "Saved transcript", start_ms: 0, end_ms: 100 }]),
    ),
  });
  await expect(
    page.getByText("Transcript analysis added to this take."),
  ).toBeVisible();
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await page.reload();
  const video = page.getByLabel("Recorded presentation video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(await video.getAttribute("src")).not.toBe(originalUrl);
  await page.getByText("Transcript and source checks", { exact: true }).click();
  await expect(
    page.getByText("Saved transcript", { exact: false }).first(),
  ).toBeVisible();
  await page.goto("/live");
  await expect(
    page.getByRole("heading", { name: "Past sessions" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("past-sessions.png"),
    fullPage: true,
  });
  await page.locator(".recent-recordings a").click();
  await expect(page).toHaveURL(reviewUrl);
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  await page.getByRole("button", { name: "Delete saved session" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/live$/);
  await page.reload();
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".recent-recordings a")).toHaveCount(0);
  await page.goto(reviewUrl);
  await expect(
    page.getByRole("heading", {
      name: "This recording isn’t available in this browser.",
    }),
  ).toBeVisible();
});

test("failed browser storage keeps the current video playable and shows a warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Synthetic quota failure", "QuotaExceededError");
    };
  });
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(
    page.getByText("Could not save this session", { exact: false }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded presentation video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("review scores and statistics follow each recorded take across views and reload", async ({
  page,
}, info) => {
  const jobId = "12345678-1234-1234-1234-123456789abc";
  const factJobId = "87654321-4321-4321-4321-cba987654321";
  let uploads = 0;
  const words = [
    { word: "Demo.", start_ms: 100, end_ms: 200 },
    { word: "ähm", start_ms: 500, end_ms: 600 },
  ];
  await syntheticPose(page);
  await page.route("**/api/sources?*", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/speech/analyze", (route) => {
    uploads++;
    expect(route.request().postDataBuffer()!.length).toBeGreaterThan(1000);
    return route.fulfill({ status: 202, json: { job_id: jobId } });
  });
  await page.route("**/api/speech/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: jobId,
        status: "completed",
        result: {
          audio: { summary: { pause_count: uploads === 1 ? 1 : 0 } },
          words: uploads === 1 ? words : [],
          asr_provider: "synthetic-test",
          synthetic_demo: true,
          notices: [],
          events:
            uploads === 1
              ? [
                  {
                    t_ms: 200,
                    duration_ms: 300,
                    type: "pause",
                    source: "asr",
                    severity: "info",
                    payload: { before: "Demo.", mid_sentence: false },
                  },
                  {
                    t_ms: 500,
                    duration_ms: 100,
                    type: "filler",
                    source: "asr",
                    severity: "hint",
                    payload: { word: "ähm" },
                  },
                ]
              : [
                  {
                    t_ms: 200,
                    duration_ms: 400,
                    type: "pitch",
                    source: "speech",
                    severity: "hint",
                    payload: {},
                  },
                ],
          transcription: {
            summary: { word_count: 2, filler_count: 1 },
            events: [],
          },
        },
      },
    }),
  );
  await page.route("**/api/factcheck/settings", (route) =>
    route.fulfill({
      json: {
        available: true,
        model: "synthetic-test",
        llm_host: "synthetic.invalid",
        web_provider: null,
      },
    }),
  );
  await page.route("**/api/factcheck", (route) => {
    expect(route.request().postDataJSON().words).toEqual(words);
    return route.fulfill({ status: 202, json: { job_id: factJobId } });
  });
  await page.route("**/api/factcheck/jobs/*", (route) =>
    route.fulfill({
      json: {
        job_id: factJobId,
        status: "completed",
        result: {
          claims: ["supports", "contradicts", "supports", "not_found"].map(
            (verdict, index) => ({
              claim: `Synthetic claim ${index}`,
              transcript: "Demo.",
              t_ms: 100,
              duration_ms: 100,
              verdict,
              explanation: "Synthetic source comparison.",
              checked: ["upload"],
              evidence:
                verdict === "not_found"
                  ? null
                  : {
                      kind: "upload",
                      label: "Synthetic test source",
                      quote: "Demo source passage.",
                      passage: "Demo source passage.",
                      quote_verified: index === 2 ? null : "exact",
                    },
            }),
          ),
          events: [],
          notices: [],
          model: "synthetic-test",
          web_provider: null,
          sources_checked: true,
          config: {
            max_claims: 6,
            top_k: 5,
            web_results: 4,
            min_quote_chars: 12,
          },
        },
      },
    }),
  );

  await backend(page, true, async () => {
    await page.getByText("Title and duration", { exact: true }).click();
    await page.getByLabel("Recording title").fill("First recorded take");
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  const firstReview = page.url();
  const scores = page.getByRole("region", {
    name: "Bewertung der drei Kriterien",
  });
  const values = scores.locator(".review-score-value");
  await expect(values).toHaveText(["–", "–", "75/100"]);
  await expect(scores.locator(".review-score-origin")).toContainText(
    "First recorded take",
  );
  await expect(scores).toContainText("0,4 s bewertet");
  await page
    .getByText("Recording details and exports", { exact: true })
    .click();
  const metric = page
    .locator(".backend-metrics > div")
    .filter({ hasText: "Transcript: word count" });
  await expect(metric.locator("dd")).toHaveText("2");

  await page.getByText("Transcript and source checks", { exact: true }).click();
  await page.getByRole("button", { name: "Check facts", exact: true }).click();
  const expected = ["–", "50/100", "75/100"];
  await expect(values).toHaveText(expected);
  await expect(scores).toContainText("1 von 2 Aussagen gestützt");
  await expect(scores).toContainText("2 Aussagen offen");
  await expect(page.locator(".fact-verdict")).toHaveText([
    "Supported by source",
    "Source says otherwise",
    "Could not be checked",
    "Not found in sources",
  ]);
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Detailed timeline", exact: true })
    .click();
  await expect(page).toHaveURL(/\/analysis$/);
  await expect(values).toHaveText(expected);
  await expect(page.locator(".review418-moment")).toHaveCount(6);
  await expect(page.locator("video")).toHaveAttribute("src", /^blob:/);
  await page.reload();
  await expect(values).toHaveText(expected);
  await expect(scores.locator(".review-score-origin")).toContainText(
    "First recorded take",
  );
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("recorded-review-scores.png"),
    fullPage: true,
  });

  await backend(page, false, async () => {
    await page.getByText("Title and duration", { exact: true }).click();
    await page.getByLabel("Recording title").fill("Second recorded take");
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  const secondReview = page.url();
  expect(secondReview).not.toBe(firstReview);
  expect(uploads).toBe(2);
  await expect(values).toHaveText(["–", "–", "0/100"]);
  await expect(scores.locator(".review-score-origin")).toContainText(
    "Second recorded take",
  );
  await expect(
    page.getByText("Sessions are saved in this browser", { exact: false }),
  ).toBeVisible();
  await page.goto(firstReview);
  await expect(values).toHaveText(expected);
  await page.goto("/");
  const statistics = page.getByRole("definition");
  await expect(statistics.nth(0)).toHaveText("2");
  await expect(statistics.nth(2)).toHaveText("7");
  await expect(statistics.nth(3)).toHaveText("1");
  await page.goto("/sources");
  await expect(
    page
      .getByRole("navigation", { name: "Presentation workflow" })
      .getByRole("link", { name: /Review/ }),
  ).toHaveAttribute("href", new URL(secondReview).pathname);
});

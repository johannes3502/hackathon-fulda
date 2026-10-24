import { expect, test, type Page } from "@playwright/test";

async function syntheticCamera(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as {
      stoppedTracks: number;
      mediaConstraints: MediaStreamConstraints | undefined;
    };
    state.stoppedTracks = 0;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      state.mediaConstraints = constraints;
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d")!;
      let frame = 0;
      const paint = () => {
        ctx.fillStyle = "#192e46";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#9dc4fb";
        ctx.beginPath();
        ctx.arc(320 + Math.sin(frame / 15) * 70, 160, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "22px sans-serif";
        ctx.fillText(`Synthetic test video · frame ${frame++}`, 100, 290);
      };
      paint();
      const timer = setInterval(paint, 100);
      const stream = canvas.captureStream(10);
      if (constraints?.audio) {
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const destination = audio.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        const track = destination.stream.getAudioTracks()[0];
        track.addEventListener("ended", () => void audio.close());
        stream.addTrack(track);
      }
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          if (track.readyState === "live") state.stoppedTracks++;
          clearInterval(timer);
          stop();
        };
      }
      return stream;
    };
  });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function enable(page: Page) {
  await page.goto("/live");
  await page.getByRole("button", { name: "Enable camera preview" }).click();
  await expect(
    page.getByRole("button", { name: "Turn camera off" }),
  ).toBeVisible();
}
test("large view scales feedback and preserves an active recording", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await enable(page);
  const video = page.getByLabel("Your local camera feed");
  const originalVideo = await video.elementHandle();
  const originalWidth = (await video.boundingBox())!.width;
  const cue = page.locator(".cue-message");
  const originalFontSize = await cue.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  await page.getByRole("button", { name: "Large view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Standard view" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await cue.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThan(originalFontSize * 1.5);
  if (info.project.name === "desktop") {
    expect((await video.boundingBox())!.width).toBeGreaterThan(
      originalWidth * 1.5,
    );
  }
  await page.getByRole("button", { name: "Record with demo feedback" }).click();
  await expect(cue).toHaveText("Review this gesture moment", {
    timeout: 12000,
  });
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
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Large view", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Large view", exact: true }).click();
  await page.getByRole("button", { name: "Standard view" }).click();
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
        .getByLabel("Recorded pitch video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});
test("raw camera recording, stats, filtered video sections, download and refresh recovery", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await syntheticCamera(page);
  await enable(page);
  await page.getByRole("button", { name: "Record with demo feedback" }).click();
  await expect(
    page.getByText("Review this gesture moment").first(),
  ).toBeVisible({ timeout: 12000 });
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-studio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/live\/[^/]+\/review$/);
  await expect(
    page.getByRole("heading", { name: "A closer look at your take." }),
  ).toBeVisible();
  const video = page.getByLabel("Recorded pitch video");
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
  ).toBe(1);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mediaConstraints: MediaStreamConstraints })
          .mediaConstraints.audio,
    ),
  ).toBe(false);
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-review-${info.project.name}.png`,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download video" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.webm$/);
  await page.getByRole("link", { name: "Rewatch feedback sections" }).click();
  await page.getByLabel("Filter by category").selectOption("Gestures");
  await expect(page.locator(".moment-browser-list button")).toHaveCount(1);
  await expect(page.locator(".replay-detail h2")).toHaveText(
    "Review this gesture moment",
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
  // The last section reaches the file's end; MediaRecorder's clock can be slightly longer than the encoded video.
  await video.evaluate((el: HTMLVideoElement) => {
    el.playbackRate = 4;
  });
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(4);
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime), {
      timeout: 5000,
    })
    .toBeLessThan(4);
  await video.evaluate((el: HTMLVideoElement) => {
    el.playbackRate = 1;
  });
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/live-moments-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "This recording isn’t in this workspace.",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

async function backend(page: Page) {
  await syntheticCamera(page);
  await page.route("http://localhost:8000/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await page.goto("/live");
  await page.getByLabel("Feedback source").selectOption("backend");
  await expect(
    page.getByText("analysis results remain stored", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable camera preview" }).click();
  await page.getByRole("button", { name: "Record & analyze audio" }).click();
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
}

test("REST analysis uploads recorded audio/video and merges word feedback into review", async ({
  page,
}) => {
  let uploads = 0;
  await page.route("http://localhost:8000/speech/analyze", async (route) => {
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
  await page.route("http://localhost:8000/speech/jobs/*", async (route) => {
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
  await page.route(
    "http://localhost:8000/transcription/analyze-words",
    async (route) => {
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
    },
  );
  await backend(page);
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  expect(uploads).toBe(1);
  await expect(page.getByText("Audio: pause count")).toBeVisible();
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
});

test("analysis failure preserves playable recording", async ({ page }) => {
  await page.route("http://localhost:8000/speech/analyze", (route) =>
    route.fulfill({ status: 503 }),
  );
  await backend(page);
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText("HTTP 503", { exact: false })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded pitch video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("local pose worker loads real assets and runs on synthetic camera frames", async ({
  page,
}) => {
  await syntheticCamera(page);
  await enable(page);
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
  await expect(
    page.getByText("Pose samples stay in this browser."),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  await page
    .getByLabel("Your local camera feed")
    .evaluate((v: HTMLVideoElement) => v.pause());
  await page.getByRole("button", { name: "Record with demo feedback" }).click();
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
  expect(samples[0].quality).toEqual({
    pose_present: true,
    legs_visible: false,
  });
  expect(uploads).toEqual([]);
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("pose-review.png"),
    fullPage: true,
  });
});

test("automatic landmarks align with the mirrored video in both sizes and clear when lost", async ({
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
  const overlay = page.getByRole("img", { name: "Live pose landmarks" });
  await expect(overlay).toBeVisible();
  await expect(overlay.locator("circle")).toHaveCount(16);
  await expect(overlay.locator('[data-landmark="left_elbow"]')).toHaveCount(0);
  await expect(overlay.locator('[data-landmark="left_knee"]')).toHaveCount(0);
  for (const large of [false, true]) {
    if (large)
      await page
        .getByRole("button", { name: "Large view", exact: true })
        .click();
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
    const nose = (await overlay
      .locator('[data-landmark="nose"]')
      .boundingBox())!;
    expect(nose.x + nose.width / 2).toBeCloseTo(expected.x, 0);
    expect(nose.y + nose.height / 2).toBeCloseTo(expected.y, 0);
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`landmarks-${large ? "large" : "standard"}.png`),
      fullPage: true,
    });
  }
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
  await page.getByRole("button", { name: "Enable camera preview" }).click();
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
  await expect(
    page.getByText("Pose detection failed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record with demo feedback" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Retry landmarks" }),
  ).toBeEnabled();
});

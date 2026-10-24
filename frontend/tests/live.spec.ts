import { expect, test, type Page } from "@playwright/test";

async function syntheticCamera(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as {
      stoppedTracks: number;
      mediaConstraints: MediaStreamConstraints | undefined;
      speechGain: GainNode;
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
        const gain = audio.createGain();
        gain.gain.value = 0.05;
        state.speechGain = gain;
        const destination = audio.createMediaStreamDestination();
        oscillator.connect(gain);
        gain.connect(destination);
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
// Controlled landmarks exercise the real evaluator, recording and UI, not model accuracy.
async function syntheticPose(page: Page) {
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
      body: `let origin = null, kind = 'raised';
      onmessage = ({data}) => {
        if (data.type === 'init') postMessage({type:'ready'});
        if (data.type === 'test-start') { origin = data.timestamp; kind = data.kind ?? 'raised'; }
        if (data.type === 'test-kind') kind = data.kind;
        if (data.type === 'frame') {
          const points = Array.from({length:33}, () => ({x:.5,y:.2,z:0,visibility:.99,presence:.99}));
          const set = (i,x,y) => Object.assign(points[i],{x,y});
          set(11,.38,.38); set(12,.62,.38); set(13,.34,.55); set(14,.66,.55);
          set(15,.34,.72); set(16,.66,.72); set(23,.41,.82); set(24,.59,.82);
          if (origin !== null && data.timestamp - origin >= 4000) {
            if (kind === 'raised') { set(14,.73,.35); set(16,.72,.12); }
            if (kind === 'shift') for (const point of points) point.x += .12;
            if (kind === 'crossed') { set(15,.59,.49); set(16,.41,.49); }
          }
          for(let i=25;i<33;i++) points[i].visibility=.1;
          postMessage({type:'sample',timestamp:data.timestamp,width:data.frame.width,height:data.frame.height,points});
          data.frame.close();
        }
      };`,
    }),
  );
}
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function enable(page: Page) {
  await page.goto("/live");
  await page.getByLabel("Speech analysis").selectOption("local");
  await page.getByRole("button", { name: "Enable camera" }).click();
  await expect(
    page.getByRole("button", { name: "Turn camera off" }),
  ).toBeVisible();
}
test("local microphone feedback emits live volume/pause markers and preserves them in review without an analysis upload", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  let uploads = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/speech/"))
      uploads++;
  });
  await page.goto("/live");
  await expect(page.getByLabel("Speech analysis")).toHaveValue("live");
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  await expect(page.getByLabel("Tracking status")).toContainText(
    "Live voice feedback ready",
    { timeout: 10000 },
  );
  await page.evaluate(() => {
    (window as unknown as { speechGain: GainNode }).speechGain.gain.value = 0.2;
  });
  await expect(page.locator(".cue-message")).toHaveText(
    "Voice louder than your baseline",
    { timeout: 7000 },
  );
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "attention",
  );
  await expect(page.locator(".live-cue-label")).toHaveText("Try adjusting");
  await expect(page.locator("svg.live-cue-icon.lucide-volume-2")).toBeVisible();
  await expect(page.locator(".cue-message")).toHaveCSS(
    "color",
    "rgb(180, 35, 50)",
  );
  await page.evaluate(() => {
    (window as unknown as { speechGain: GainNode }).speechGain.gain.value = 0;
  });
  await expect(page.locator(".cue-message")).toHaveText("Pause in speaking", {
    timeout: 7000,
  });
  await expect(page.locator(".cue-panel")).toHaveAttribute(
    "data-feedback",
    "neutral",
  );
  await expect(page.locator("svg.live-cue-icon.lucide-pause")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("live-pause-feedback.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await page.getByRole("button", { name: /All observations/ }).click();
  await expect(page.locator(".review-clip-list")).toContainText(
    "Pause in speaking",
  );
  await expect(page.locator(".review-clip-list")).toContainText(
    "Voice louder than your baseline",
  );
  expect(uploads).toBe(0);
});

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

test("speech analysis is visible above the full-size camera", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/**", (route) =>
    route.fulfill({ json: { status: "ok" } }),
  );
  await enable(page);
  const speech = page.getByLabel("Speech analysis", { exact: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(speech).toBeInViewport();
  await expect(speech).toBeInViewport();
  await speech.selectOption("backend");
  await expect(
    page.getByRole("button", { name: "Enable camera" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable camera" }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { mediaConstraints: MediaStreamConstraints })
          .mediaConstraints.audio,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Start recording" }),
  ).toBeEnabled();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("speech-analysis-visible.png"),
    fullPage: true,
  });
});

test("full-size view is the default and options preserve an active recording", async ({
  page,
}, info) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await enable(page);
  const video = page.getByLabel("Your local camera feed");
  const originalVideo = await video.elementHandle();
  await page
    .getByRole("button", { name: "Start recording", exact: true })
    .click();
  const cue = page.locator(".cue-message");
  await expect(
    page.getByRole("button", { name: /^(Large|Standard) view$/ }),
  ).toHaveCount(0);
  expect(
    await cue.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(info.project.name === "desktop" ? 52 : 40);
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
  await expect(cue).toHaveCSS("color", "rgb(37, 101, 68)");
  await startPoseSequence(page);
  await expect(cue).toHaveText("Hand above shoulder", {
    timeout: 12000,
  });
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
  await page.getByText("Analysis features", { exact: true }).click();
  await expect(page.getByLabel("Track fingers")).toBeVisible();
  await expect(page.getByLabel("Track fingers")).toBeDisabled();
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
        .getByLabel("Recorded pitch video")
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
    rule_version: "pose-rules-v5",
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
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "This recording isn’t in this workspace.",
    }),
  ).toBeVisible();
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
  await page.getByText("Recording options", { exact: true }).click();
  await page.getByLabel("Speech analysis").selectOption("backend");
  await expect(
    page.getByText("analysis results remain stored", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Create a transcript").setChecked(transcribe);
  if (transcribe)
    await page.getByLabel("Stream transcription with Deepgram (EU)").uncheck();
  await configure?.();
  await page.getByRole("button", { name: "Enable camera" }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(
    page.getByRole("button", { name: "Finish & review" }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
}

test("feature options lock per take, filter speech markers and survive review navigation", async ({
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
  await backend(page, false, async () => {
    await page.getByText("Analysis features", { exact: true }).click();
    await expect(page.getByLabel("Pose processing")).toHaveValue("VIDEO");
    await expect(page.getByLabel("Pose model")).toHaveValue("lite");
    await page.getByLabel("Pose processing").selectOption("IMAGE");
    await page.getByLabel("Pose model").selectOption("heavy");
    await page.getByLabel("Pauses", { exact: true }).uncheck();
    await page.getByText("Camera diagnostics", { exact: true }).click();
  });
  await expect(page.getByLabel("Pose processing")).toBeDisabled();
  await expect(page.getByLabel("Pose model")).toBeDisabled();
  await expect(
    page.getByLabel("Speech feedback", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Pauses", { exact: true })).toBeDisabled();
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
  await page.getByText("Analysis features", { exact: true }).click();
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
    await expect(jump).toHaveAttribute("data-feedback", "attention");
    await expect(jump.locator(".timeline-time")).toHaveCSS(
      "color",
      "rgb(255, 171, 180)",
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
  expect(uploads).toEqual([]);
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
  const questionJob = "77654321-4321-4321-4321-cba987654321";
  const answerJob = "67654321-4321-4321-4321-cba987654321";
  const question = {
    id: "q1",
    kind: "contradiction",
    question: "Wie viele Studierende sind es laut Quelle?",
    reason: "Die Zahlen weichen ab.",
    t_ms: 200,
    duration_ms: 900,
    transcript: "Wir haben 9000 Studierende.",
    claim: "9000 Studierende",
    evidence: null,
    query: "Studierende",
  };
  await page.route("**/api/questions", (route) =>
    route.fulfill({ status: 202, json: { job_id: questionJob } }),
  );
  await page.route(`**/api/questions/jobs/${questionJob}`, (route) =>
    route.fulfill({
      json: {
        job_id: questionJob,
        status: "completed",
        result: {
          questions: [question],
          events: [],
          notices: [],
          model: "synthetic-model",
          sources_used: true,
        },
      },
    }),
  );
  await page.route("**/api/questions/answers", async (route) => {
    expect(route.request().postDataJSON().answer).toBe("9500 Studierende.");
    await route.fulfill({ status: 202, json: { job_id: answerJob } });
  });
  await page.route(`**/api/questions/answers/${answerJob}`, (route) =>
    route.fulfill({
      json: {
        job_id: answerJob,
        status: "completed",
        result: {
          verdict: "supports",
          explanation: "Die korrigierte Zahl steht in der Quelle.",
          evidence: {
            kind: "upload",
            label: "Synthetische Folie 2",
            quote: "9500 Studierende",
            passage: "9500 Studierende",
          },
          checked: ["upload"],
          follow_up: null,
          model: "synthetic-model",
          notes: [],
        },
      },
    }),
  );
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
  await page
    .getByRole("button", { name: "Practice by typing", exact: true })
    .click();
  await page.getByRole("button", { name: "Start question round" }).click();
  await expect(
    page.getByText(question.question, { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("9500 Studierende.");
  await page
    .getByRole("button", { name: "Compare with sources", exact: true })
    .click();
  await expect(
    page.getByText("Your answer matches the source", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page
    .locator(".question-practice")
    .screenshot({ path: info.outputPath("local-question-answer.png") });
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
        .getByLabel("Recorded pitch video")
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
  await page.getByLabel("Speech analysis").selectOption("backend");
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
    "Try speaking at your starting volume.",
  );
  disconnect();
  await expect(page.locator(".camera-message")).toContainText(
    "Recording continues",
  );
  await expect(page.locator(".cue-message")).not.toHaveText(
    "Your voice is quieter",
  );
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded pitch video")
        .evaluate((video: HTMLVideoElement) => video.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("unavailable backend never starts recording and offers a working local retry", async ({
  page,
}) => {
  await syntheticCamera(page);
  await syntheticPose(page);
  await page.route("**/api/health/ready", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto("/live");
  await page.getByLabel("Speech analysis").selectOption("backend");
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
  await page.getByLabel("Speech analysis").selectOption("local");
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
        .getByLabel("Recorded pitch video")
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

test("material upload and thesis mode reach ElevenLabs; leaving review ends the voice session", async ({
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
  let closed = 0;
  let override = "";
  await page.routeWebSocket("wss://api.elevenlabs.io/**", (socket) => {
    socket.onClose(() => closed++);
    socket.onMessage((raw) => {
      if (typeof raw !== "string") return;
      const message = JSON.parse(raw);
      if (message.type === "conversation_initiation_client_data") {
        override = message.conversation_config_override.agent.prompt.prompt;
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
        setTimeout(
          () =>
            socket.send(
              JSON.stringify({
                type: "agent_response",
                agent_response_event: {
                  agent_response: "Why did you choose this research method?",
                },
              }),
            ),
          600,
        );
      }
    });
  });
  await backend(page, true, async () => {
    await page.getByText("Presentation & material", { exact: false }).click();
    await page.getByLabel("What are you preparing for?").selectOption("thesis");
    await page.getByLabel("Upload presentation material").setInputFiles({
      name: "thesis.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Synthetic thesis notes"),
    });
    await expect(
      page.getByLabel("Presentation material", { exact: true }),
    ).toContainText("Ready");
  });
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  // A later browser collection choice must not retarget an already recorded take.
  await page.evaluate(() =>
    localStorage.setItem(
      "pitchcoach.sourceCollection",
      "00000000-0000-4000-8000-000000000099",
    ),
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
      name: "Why did you choose this research method?",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mute microphone", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unmute microphone", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  await page.screenshot({
    path: info.outputPath("professor-question.png"),
    fullPage: true,
  });
  await page
    .getByRole("group", { name: "Review steps" })
    .getByRole("button", { name: "Review moments" })
    .click();
  await expect.poll(() => closed).toBe(1);
  await expect(page.getByLabel("Recorded pitch video")).toBeVisible();
});

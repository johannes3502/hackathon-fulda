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

test("backend receives contiguous binary video and supplies live feedback and statistics", async ({
  page,
}) => {
  await syntheticCamera(page);
  let sessionId = "";
  let seq = 0;
  let bytes = 0;
  let pendingSize = 0;
  let endMs = 0;
  await page.routeWebSocket("ws://localhost:8000/live", (socket) => {
    socket.onMessage((raw) => {
      if (typeof raw !== "string") {
        expect(raw.byteLength).toBe(pendingSize);
        bytes += raw.byteLength;
        if (endMs >= 1000) {
          socket.send(
            JSON.stringify({
              type: "feedback",
              sessionId,
              feedback: {
                id: "backend-1",
                category: "Framing",
                kind: "positive",
                startMs: 0,
                endMs,
                title: "Visible in frame",
                detail: "A test backend observation.",
                action: "Keep this framing.",
              },
            }),
          );
          socket.send(
            JSON.stringify({
              type: "metrics",
              sessionId,
              atMs: endMs,
              metrics: [
                {
                  id: "visibility",
                  label: "Frame visibility",
                  value: 96,
                  unit: "%",
                },
              ],
            }),
          );
        }
        return;
      }
      const message = JSON.parse(raw);
      if (message.type === "session.start") {
        sessionId = message.sessionId;
        expect(message.audio).toBe(false);
        socket.send(JSON.stringify({ type: "session.ready", sessionId }));
      }
      if (message.type === "video.chunk") {
        expect(message.seq).toBe(++seq);
        expect(message.startMs).toBe(endMs);
        pendingSize = message.byteLength;
        endMs = message.endMs;
      }
      if (message.type === "session.stop")
        socket.send(JSON.stringify({ type: "session.complete", sessionId }));
    });
  });
  await enable(page);
  await page.getByLabel("Feedback source").selectOption("backend");
  await page
    .getByLabel("Backend WebSocket URL")
    .fill("ws://localhost:8000/live");
  await page
    .getByRole("button", { name: "Start streaming & recording" })
    .click();
  await expect(page.getByText("Visible in frame").first()).toBeVisible();
  await expect(page.getByText("Frame visibility")).toBeVisible();
  await page.getByRole("button", { name: "Finish & review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByText("Frame visibility")).toBeVisible();
  expect(bytes).toBeGreaterThan(1000);
  expect(seq).toBeGreaterThan(1);
  await expect(page.getByText("Demo feedback, real recording.")).toHaveCount(0);
});

test("backend disconnect preserves playable partial recording", async ({
  page,
}) => {
  await syntheticCamera(page);
  await page.routeWebSocket("ws://localhost:8000/live", (socket) => {
    socket.onMessage((raw) => {
      if (typeof raw !== "string") {
        socket.close({ code: 1011, reason: "Test interruption" });
        return;
      }
      const message = JSON.parse(raw);
      if (message.type === "session.start")
        socket.send(
          JSON.stringify({
            type: "session.ready",
            sessionId: message.sessionId,
          }),
        );
    });
  });
  await enable(page);
  await page.getByLabel("Feedback source").selectOption("backend");
  await page
    .getByLabel("Backend WebSocket URL")
    .fill("ws://localhost:8000/live");
  await page
    .getByRole("button", { name: "Start streaming & recording" })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(
    page.getByText("Interrupted recording", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("The backend connection closed.", { exact: false }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Recorded pitch video")
        .evaluate((el: HTMLVideoElement) => el.readyState),
    )
    .toBeGreaterThanOrEqual(2);
});

test("invalid destination and cancelled handshake do not leave a camera running", async ({
  page,
}) => {
  await syntheticCamera(page);
  await page.routeWebSocket("ws://localhost:8000/live", () => {});
  await enable(page);
  await page.getByLabel("Feedback source").selectOption("backend");
  await page.getByLabel("Backend WebSocket URL").fill("https://localhost");
  await page
    .getByRole("button", { name: "Start streaming & recording" })
    .click();
  await expect(page.locator(".status-error[role=alert]")).toContainText(
    "ws:// or wss://",
  );
  await page
    .getByLabel("Backend WebSocket URL")
    .fill("ws://localhost:8000/live");
  await page
    .getByRole("button", { name: "Start streaming & recording" })
    .click();
  await page.getByRole("button", { name: "Cancel connection" }).click();
  await expect(
    page.getByRole("button", { name: "Enable camera preview" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
    ),
  ).toBe(1);
});

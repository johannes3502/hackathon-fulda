import { execFile } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import sharp from "sharp";

const run = promisify(execFile);
const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3100";
const profile = {
  profileId: process.env.SHOWCASE_PROFILE_ID,
  token: process.env.SHOWCASE_PROFILE_TOKEN,
  displayName: process.env.SHOWCASE_PROFILE_NAME ?? "Alex Winter",
  createdAt: "2026-01-12T18:30:00+00:00",
};
if (!profile.profileId || !profile.token) {
  throw new Error(
    "Set SHOWCASE_PROFILE_ID and SHOWCASE_PROFILE_TOKEN (see seed_progress_demo --showcase).",
  );
}

const output = path.resolve("public/landing");
const work = path.resolve("../.playwright-mcp/capture");
await mkdir(output, { recursive: true });
await mkdir(work, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  locale: "de-DE",
  colorScheme: "light",
});
await context.addInitScript((stored) => {
  try {
    window.localStorage.setItem(
      "pitchcoach.progress-profile.v1",
      JSON.stringify(stored),
    );
  } catch {
    // Storage can be unavailable before the first document is committed.
  }
}, profile);

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

async function settle(extra = 500) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(extra);
}

async function hideDevOverlay() {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
  });
}

async function shotFactcheckDetail() {
  await hideDevOverlay();
  const png = path.join(work, "factcheck-quote-full.png");
  await page.screenshot({ path: png, caret: "initial" });
  await sharp(png)
    .extract({ left: 1520, top: 0, width: 1680, height: 1050 })
    .resize({ width: 1600, height: 1000, fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(output, "factcheck-quote.webp"));
  console.log("captured factcheck-quote.webp (detail crop)");
}

async function shot(name) {
  await hideDevOverlay();
  const png = path.join(work, `${name}.png`);
  await page.screenshot({ path: png, caret: "initial" });
  await sharp(png)
    .resize({ width: 1600, height: 1000, fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(output, `${name}.webp`));
  console.log(`captured ${name}.webp`);
}

async function shotProgress() {
  await hideDevOverlay();
  const detail = await page.locator(".progress-detail").boundingBox();
  const height =
    detail && detail.y > 400
      ? Math.min(1000, Math.round(detail.y - 16))
      : 1000;
  const png = path.join(work, "progress-series.png");
  await page.screenshot({
    path: png,
    caret: "initial",
    clip: { x: 0, y: 0, width: 1600, height },
  });
  const { data } = await sharp(png)
    .extract({ left: 4, top: height * 2 - 8, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2], alpha: 1 };
  await sharp(png)
    .resize({
      width: 1600,
      height: 1000,
      fit: "contain",
      position: "top",
      background,
    })
    .webp({ quality: 82 })
    .toFile(path.join(output, "progress-series.webp"));
  console.log(`captured progress-series.webp (${height}px, padded)`);
}

function assertNoDemoLabels(label) {
  return page
    .locator("body")
    .innerText()
    .then((text) => {
      const hit = /\bDemo\b|Synthetisch|Simulated|synthetisch/i.exec(text);
      if (hit) {
        throw new Error(`${label} still shows "${hit[0]}" in visible text`);
      }
    });
}

await page.goto(`${baseUrl}/gestures?capture=1`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(1_200);
await page.getByRole("button", { name: /Play 22-second example/i }).click();
await page.getByRole("button", { name: /Restart example/i }).waitFor({
  timeout: 20_000,
});
await page.waitForFunction(
  () => {
    const text = document
      .querySelector(".cue-panel .cue-message")
      ?.textContent?.trim();
    return (
      !!text &&
      ![
        "Ready for the next movement",
        "Calibrate first",
        "Evaluation paused",
      ].includes(text)
    );
  },
  undefined,
  { timeout: 45_000 },
);
await page.waitForTimeout(350);
await settle(200);
await assertNoDemoLabels("gestures capture");
await shot("live-review");

await page.goto(`${baseUrl}/review-preview?capture=1`, {
  waitUntil: "domcontentloaded",
});
await page.locator(".review418-moment-list").waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await settle();
await hideDevOverlay();
await page.screenshot({
  path: path.join(work, "review-timeline-poster.png"),
  caret: "initial",
});
await sharp(path.join(work, "review-timeline-poster.png"))
  .resize({ width: 1600, height: 1000, fit: "cover" })
  .webp({ quality: 82 })
  .toFile(path.join(output, "review-timeline-poster.webp"));
console.log("captured review-timeline-poster.webp");

await page
  .locator(".review418-moment", { hasText: "Diese Zahl passt nicht zur Quelle" })
  .click();
await page.evaluate(() => {
  document
    .querySelector(".review418-layout")
    ?.scrollIntoView({ block: "start" });
});
await settle(700);
await assertNoDemoLabels("review capture");
await shotFactcheckDetail();

await page.goto(`${baseUrl}/progress`, { waitUntil: "domcontentloaded" });
await page.locator(".progress-grid").waitFor();
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const heading = document.querySelector("#progress-metrics-heading");
  if (!heading) return;
  window.scrollTo({
    top: heading.getBoundingClientRect().top + window.scrollY - 28,
  });
});
await settle(700);
await assertNoDemoLabels("progress capture");
await shotProgress();
console.log(`captured progress for ${profile.displayName}`);

await context.close();

const videoContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "de-DE",
  colorScheme: "light",
  recordVideo: { dir: work, size: { width: 1440, height: 900 } },
});
await videoContext.addInitScript((stored) => {
  try {
    window.localStorage.setItem(
      "pitchcoach.progress-profile.v1",
      JSON.stringify(stored),
    );
  } catch {
    // Ignore storage restrictions; the review page does not require it.
  }
}, profile);
const videoPage = await videoContext.newPage();
await videoPage.goto(`${baseUrl}/review-preview?capture=1`, {
  waitUntil: "domcontentloaded",
});
await videoPage.locator(".review418-moment-list").waitFor();
await videoPage.evaluate(() => {
  document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
});
await videoPage.evaluate(() => {
  const style = document.createElement("style");
  style.textContent = `
    #capture-cursor {
      position: fixed;
      left: 0;
      top: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3803bf;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 4px rgba(56, 3, 191, 0.22);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: left 320ms ease, top 320ms ease;
    }
    .capture-ripple {
      position: fixed;
      width: 22px;
      height: 22px;
      margin: -11px 0 0 -11px;
      border-radius: 50%;
      border: 2px solid rgba(56, 3, 191, 0.55);
      pointer-events: none;
      z-index: 9998;
      animation: capture-ripple 520ms ease-out forwards;
    }
    @keyframes capture-ripple {
      from { transform: scale(0.4); opacity: 0.7; }
      to { transform: scale(2); opacity: 0; }
    }
  `;
  document.head.append(style);
  const cursor = document.createElement("div");
  cursor.id = "capture-cursor";
  document.body.append(cursor);
  document.addEventListener(
    "click",
    (event) => {
      const ripple = document.createElement("span");
      ripple.className = "capture-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.append(ripple);
      window.setTimeout(() => ripple.remove(), 600);
    },
    true,
  );
  const move = (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  };
  document.addEventListener("mousemove", move);
});

const videoHandle = videoPage.video();
if (!videoHandle) throw new Error("Playwright did not start a video recording.");
await videoPage.waitForTimeout(1_500);
await videoPage.evaluate(() => {
  document
    .querySelector(".review418-layout")
    ?.scrollIntoView({ block: "start", behavior: "smooth" });
});
await videoPage.waitForTimeout(1_100);
const fact = videoPage.locator(".review418-moment", {
  hasText: "Diese Zahl passt nicht zur Quelle",
});
let box = await fact.boundingBox();
await videoPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
  steps: 20,
});
await videoPage.waitForTimeout(500);
await videoPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await videoPage.waitForTimeout(2_600);
await videoPage.evaluate(() => {
  document
    .querySelector(".review418-graph-panel")
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
});
await videoPage.waitForTimeout(1_100);
const graph = videoPage.locator(".review418-graph-panel");
box = await graph.boundingBox();
await videoPage.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.55, {
  steps: 20,
});
await videoPage.waitForTimeout(500);
await videoPage.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.55);
await videoPage.waitForTimeout(2_000);
await videoPage.evaluate(() => {
  document
    .querySelector(".review418-annotation")
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
});
await videoPage.waitForTimeout(1_100);
box = await videoPage
  .locator(".review418-annotation")
  .boundingBox();
await videoPage.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4, {
  steps: 14,
});
await videoPage.waitForTimeout(1_400);

await videoContext.close();
const recording = await videoHandle.path();
const trimmed = path.join(work, "review-timeline.mp4");
await run("ffmpeg", [
  "-y",
  "-ss",
  "0.6",
  "-i",
  recording,
  "-t",
  "11.4",
  "-vf",
  "scale=1440:900:flags=lanczos",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "24",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-an",
  trimmed,
]);
await copyFile(trimmed, path.join(output, "review-timeline.mp4"));
console.log("captured review-timeline.mp4");

await browser.close();
if (consoleErrors.length) {
  console.warn("Console errors:", consoleErrors);
}

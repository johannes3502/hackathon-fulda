// Read-only route and asset checks against the built jury stack.
const baseURL = process.env.SMOKE_URL ?? "http://localhost:3000";
const paths = [
  "/",
  "/demo",
  "/gestures",
  "/sources",
  "/progress",
  "/admin",
  "/live",
  "/live/healthcheck/review",
  "/review-preview",
  "/api/health/ready",
  "/pose/worker.js",
  "/pose/pose_landmarker_lite.task",
  "/pose/pose_landmarker_heavy.task",
  "/pose/hand_landmarker.task",
  "/audio/pcm-worklet.js",
  "/audio/feedback-worklet.js",
  "/review-demo/presentation.mp4",
];
if (process.env.NEXT_PUBLIC_STAGE_MODE !== "0") paths.push("/stage");

for (const path of paths) {
  const response = await fetch(new URL(path, baseURL), {
    signal: AbortSignal.timeout(15000),
  });
  // Cancel large model/video bodies; this check verifies that they are served.
  await response.body?.cancel();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  console.log(`OK ${path}`);
}

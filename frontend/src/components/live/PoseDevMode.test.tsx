import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { poseBackend } from "@/features/pose/backend";
import { PoseTestTracker } from "@/features/pose/testPoses";
import { PoseDevMode } from "./PoseDevMode";

const results = new PoseTestTracker().update(null, 0, []);
const gpu = poseBackend({
  pose: "GPU",
  hand: "GPU",
  renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, D3D11)",
  fallback: null,
  handFallback: null,
  handError: null,
  runtimeFallback: false,
})!;

it("shows the active delegate and renderer in the status view", () => {
  const html = renderToStaticMarkup(
    <PoseDevMode
      results={results}
      handModel
      handError={null}
      hands={0}
      backend={gpu}
      view="status"
    />,
  );
  expect(html).toContain("pose GPU · hands GPU");
  expect(html).toContain("Iris(R) Xe Graphics");
  expect(html).toContain("Hands detected: 0");
});

it("shows why the worker fell back to CPU", () => {
  const cpu = poseBackend({
    ...gpu,
    pose: "CPU",
    hand: "CPU",
    fallback: "WebGL2 unavailable",
  })!;
  const html = renderToStaticMarkup(
    <PoseDevMode
      results={results}
      handModel
      handError={null}
      hands={0}
      backend={cpu}
      view="status"
    />,
  );
  expect(html).toContain("pose CPU · hands CPU");
  expect(html).toContain("CPU fallback: WebGL2 unavailable");
});

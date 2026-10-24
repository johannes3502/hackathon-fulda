import { expect, it } from "vitest";
import { backendLabel, fallbackLabel, poseBackend } from "./backend";

const workerBackend = {
  pose: "GPU",
  hand: "GPU",
  renderer: "ANGLE (NVIDIA GeForce RTX 3060, D3D11)",
  fallback: null,
  handFallback: null,
  handError: null,
  runtimeFallback: false,
};

it("parses the backend reported by the pose worker", () => {
  expect(poseBackend(workerBackend)).toEqual(workerBackend);
});

it("rejects backend messages without a pose delegate", () => {
  expect(poseBackend({ ...workerBackend, pose: "WebGPU" })).toBeNull();
  expect(poseBackend(null)).toBeNull();
});

it("labels GPU and CPU acceleration", () => {
  expect(backendLabel(poseBackend(workerBackend), true)).toBe(
    "pose GPU · hands GPU",
  );
  expect(
    backendLabel(
      poseBackend({ ...workerBackend, pose: "CPU", hand: "CPU" }),
      true,
    ),
  ).toBe("pose CPU · hands CPU");
});

it("marks an unavailable hand model", () => {
  expect(
    backendLabel(poseBackend({ ...workerBackend, hand: null }), false),
  ).toBe("pose GPU · hands off");
});

it("surfaces the first fallback reason", () => {
  const backend = poseBackend({
    ...workerBackend,
    pose: "CPU",
    fallback: "WebGL2 unavailable",
    handFallback: "GPU unavailable",
  });
  expect(fallbackLabel(backend)).toBe("WebGL2 unavailable");
  expect(fallbackLabel(null)).toBeNull();
});

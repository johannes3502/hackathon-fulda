import { cp, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const source = dirname(require.resolve("@mediapipe/tasks-vision"));
const target = resolve(root, "public/pose/runtime");
await mkdir(target, { recursive: true });
await cp(
  resolve(source, "vision_bundle.js"),
  resolve(target, "vision_bundle.js"),
);
await cp(resolve(source, "wasm"), resolve(target, "wasm"), { recursive: true });
assert(
  (await stat(resolve(target, "wasm/vision_wasm_internal.wasm"))).size > 0,
);
assert(
  (await stat(resolve(root, "public/pose/pose_landmarker_lite.task"))).size > 0,
);
assert((await stat(resolve(root, "public/pose/hand_landmarker.task"))).size > 0);

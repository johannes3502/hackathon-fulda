import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { expect, it } from "vitest";
it("applies the pinned native bridge patch idempotently and preserves timestamps on both platforms", () => {
  execFileSync(process.execPath, ["scripts/patch-native.cjs"]);
  execFileSync(process.execPath, ["scripts/patch-native.cjs"]);
  const root = dirname(
    createRequire(import.meta.url).resolve(
      "react-native-mediapipe/package.json",
    ),
  );
  const ios = readFileSync(
    resolve(root, "ios/posedetection/PoseDetectorHelper.swift"),
    "utf8",
  );
  const android = readFileSync(
    resolve(
      root,
      "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectorHelper.kt",
    ),
    "utf8",
  );
  expect(ios.match(/if runningMode == .image/g)).toHaveLength(1);
  expect(ios).toContain("captureTimestampMs: Double(timeStamps)");
  expect(ios).toContain("try createPoseLandmarker()");
  expect(ios).toContain("onResults: nil, error: error");
  expect(
    readFileSync(
      resolve(
        root,
        "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectionModule.kt",
      ),
      "utf8",
    ),
  ).toContain("if (helper.isClosed())");
  expect(android.match(/captureTimestampMs: Long\?/g)).toHaveLength(1);
  expect(android).toContain("poseLandmarker?.detect(mpImage, options)");
});

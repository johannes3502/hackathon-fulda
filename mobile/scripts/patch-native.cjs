// Narrow, version-guarded bridge fixes for unsmoothed frame samples and capture timestamps.
const fs = require("node:fs");
const path = require("node:path");
let root;
try {
  root = path.dirname(require.resolve("react-native-mediapipe/package.json"));
} catch {
  // Workspace-filtered installs (e.g. `npm i` inside frontend/) skip mobile deps.
  console.log("react-native-mediapipe not installed; skipping native pose patches.");
  return;
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
if (pkg.version !== "0.6.0")
  throw new Error(
    "Review native pose patches before upgrading react-native-mediapipe.",
  );
function replace(file, before, after) {
  const p = path.join(root, file);
  const text = fs.readFileSync(p, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before))
    throw new Error(`Native patch no longer matches ${file}`);
  fs.writeFileSync(p, text.replace(before, after));
}
replace(
  "ios/posedetection/PoseDetectionFrameProcessorPlugin.swift",
  "timeStamps: Int(Date().timeIntervalSince1970 * 1000))",
  'timeStamps: Int(arguments?["timestampMs"] as? Double ?? Date().timeIntervalSince1970 * 1000))',
);
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "try poseLandmarker?.detectAsync(image: image, timestampInMilliseconds: timeStamps)",
  `if runningMode == .image {
        let start = Date()
        let result = try poseLandmarker?.detect(image: image)
        liveStreamDelegate?.poseDetectorHelper(self, onResults: PoseDetectionResultBundle(
          inferenceTime: Date().timeIntervalSince(start) * 1000,
          poseDetectorResults: [result], size: livestreamImageSize, captureTimestampMs: Double(timeStamps)), error: nil)
      } else {
        try poseLandmarker?.detectAsync(image: image, timestampInMilliseconds: timeStamps)
      }`,
);
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "var size: CGSize",
  "var size: CGSize\n  var captureTimestampMs: Double? = nil",
);
replace(
  "ios/posedetection/PdConvertHelpers.swift",
  "var map = [String: Any]()",
  'var map = [String: Any]()\n  map["timestampMs"] = resultBundle.captureTimestampMs',
);
replace(
  "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectionFrameProcessorPlugin.kt",
  "detector.detectLiveStream(mpImage, mappedOrientation)",
  'detector.detectLiveStream(mpImage, mappedOrientation, (params["timestampMs"] as? Double)?.toLong() ?: System.currentTimeMillis())',
);
replace(
  "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectorHelper.kt",
  "fun detectLiveStream(mpImage: MPImage, orientation: Orientation) {",
  `fun detectLiveStream(mpImage: MPImage, orientation: Orientation, captureTimestampMs: Long) {
    if (runningMode == RunningMode.IMAGE) {
      val start = SystemClock.uptimeMillis()
      val options = ImageProcessingOptions.builder().setRotationDegrees(orientationToDegrees(orientation)).build()
      try {
        poseLandmarker?.detect(mpImage, options)?.let { result ->
          poseDetectorListener?.onResults(ResultBundle(listOf(result), SystemClock.uptimeMillis() - start, mpImage.height, mpImage.width, captureTimestampMs))
        }
      } catch (error: Exception) { poseDetectorListener?.onError(error.message ?: "Pose detection failed") }
      return
    }`,
);
replace(
  "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectorHelper.kt",
  "val inputImageWidth: Int,",
  "val inputImageWidth: Int,\n          val captureTimestampMs: Long? = null,",
);
replace(
  "android/src/main/java/com/reactnativemediapipe/posedetection/ConvertHelpers.kt",
  "val map = Arguments.createMap()",
  'val map = Arguments.createMap()\n  resultBundle.captureTimestampMs?.let { map.putDouble("timestampMs", it.toDouble()) }',
);
console.log("Applied native pose IMAGE-mode/timestamp patches.");
// Surface model initialization/inference errors instead of showing an empty pose forever.
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "    createPoseLandmarker()\n",
  "    try createPoseLandmarker()\n",
);
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "private func createPoseLandmarker() {",
  "private func createPoseLandmarker() throws {",
);
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "    do {\n      poseLandmarker = try PoseLandmarker(options: poseLandmarkerOptions)\n    }\n    catch {\n      print(error)\n    }",
  "    poseLandmarker = try PoseLandmarker(options: poseLandmarkerOptions)",
);
replace(
  "ios/posedetection/PoseDetectorHelper.swift",
  "    } catch {\n      print(error)\n    }\n  }\n\n  func detect(",
  "    } catch {\n      liveStreamDelegate?.poseDetectorHelper(self, onResults: nil, error: error)\n    }\n  }\n\n  func detect(",
);
replace(
  "android/src/main/java/com/reactnativemediapipe/posedetection/PoseDetectionModule.kt",
  "    PoseDetectorMap.detectorMap[id] = helper",
  '    if (helper.isClosed()) { promise.reject("POSE_INIT_FAILED", "Pose model could not start"); return }\n    PoseDetectorMap.detectorMap[id] = helper',
);

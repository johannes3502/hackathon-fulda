/* MediaPipe runs off the UI thread; frames and landmarks never leave this worker/browser. */
globalThis.importScripts("/pose/runtime/vision_bundle.js");
let landmarker;
let hands = null;
globalThis.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const files =
        await globalThis.Vision.FilesetResolver.forVisionTasks(
          "/pose/runtime/wasm",
        );
      landmarker = await globalThis.Vision.PoseLandmarker.createFromOptions(
        files,
        {
          baseOptions: {
            modelAssetPath: "/pose/pose_landmarker_lite.task",
            delegate: "CPU",
          },
          canvas: new OffscreenCanvas(1, 1),
          // IMAGE avoids the VIDEO graph's temporal landmark smoothing in the raw log.
          runningMode: "IMAGE",
          numPoses: 1,
          outputSegmentationMasks: false,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
        },
      );
      // Hands are optional: pose capture keeps working if this model fails.
      try {
        hands = await globalThis.Vision.HandLandmarker.createFromOptions(
          files,
          {
            baseOptions: {
              modelAssetPath: "/pose/hand_landmarker.task",
              delegate: "CPU",
            },
            canvas: new OffscreenCanvas(1, 1),
            runningMode: "IMAGE",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
          },
        );
      } catch {
        hands = null;
      }
      globalThis.postMessage({ type: "ready", hands: !!hands });
    } else if (data.type === "frame") {
      const result = landmarker.detect(data.frame);
      const found = hands?.detect(data.frame);
      globalThis.postMessage({
        type: "sample",
        timestamp: data.timestamp,
        width: data.frame.width,
        height: data.frame.height,
        points: result.landmarks[0] ?? [],
        // null = hand model unavailable; [] = it ran and found no hands.
        hands: found
          ? found.landmarks.map((points, i) => ({
              points,
              score: found.handedness[i]?.[0]?.score ?? null,
            }))
          : null,
      });
    }
  } catch (error) {
    globalThis.postMessage({
      type: "error",
      message:
        error instanceof Error ? error.message : "Pose detection failed.",
    });
  } finally {
    data.frame?.close();
  }
};

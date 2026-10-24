/* MediaPipe runs off the UI thread; frames and landmarks never leave this worker/browser. */
globalThis.importScripts("/pose/runtime/vision_bundle.js");
let landmarker;
let handLandmarker;

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
      let hands = false;
      let handError;
      try {
        handLandmarker =
          await globalThis.Vision.HandLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: "/pose/hand_landmarker.task?v=1",
              delegate: "CPU",
            },
            runningMode: "IMAGE",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
          });
        hands = true;
      } catch (error) {
        handError =
          error instanceof Error ? error.message : "Hand model failed.";
      }
      globalThis.postMessage({ type: "ready", hands, handError });
    } else if (data.type === "frame") {
      const result = landmarker.detect(data.frame);
      const points = result.landmarks[0] ?? [];
      let hands = null;
      if (handLandmarker) {
        const found = handLandmarker.detect(data.frame);
        hands = (found.landmarks ?? []).map((landmarks, i) => ({
          label: found.handednesses?.[i]?.[0]?.categoryName ?? "",
          score: found.handednesses?.[i]?.[0]?.score ?? 0,
          landmarks: landmarks.map(({ x, y, z }) => [x, y, z]),
        }));
      }
      globalThis.postMessage({
        type: "sample",
        timestamp: data.timestamp,
        width: data.frame.width,
        height: data.frame.height,
        points,
        hands,
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

/* MediaPipe runs off the UI thread; frames and landmarks stay in this browser. */
globalThis.importScripts("/pose/runtime/vision_bundle.js");
const CONFIDENCE = 0.5;
let options = {
  runningMode: "VIDEO",
  model: "lite",
  devMode: false,
  handTracking: true,
};
let files;
let poseLandmarker = null;
let handLandmarker = null;
let poseDelegate = "CPU";
let handDelegate = null;
let handError = null;
let renderer = null;
let poseFallback = null;
let handFallback = null;
let runtimeFallback = false;
let lastTimestamp = -Infinity;
let lastInferenceTimestamp = 0;
let lastHandTimestamp = -Infinity;
let latestHands = null;
const HAND_INTERVAL_MS = 200;

const text = (error) =>
  error instanceof Error ? error.message : String(error);
const close = (task) => {
  try {
    task?.close();
  } catch {}
};

function probeWebGl() {
  if (typeof OffscreenCanvas === "undefined")
    return { ok: false, reason: "OffscreenCanvas unavailable" };
  try {
    const gl = new OffscreenCanvas(1, 1).getContext("webgl2");
    if (!gl) return { ok: false, reason: "WebGL2 unavailable" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = info
      ? String(gl.getParameter(info.UNMASKED_VENDOR_WEBGL))
      : "";
    const device = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return {
      ok: true,
      renderer: device || vendor || null,
      software: /swiftshader|llvmpipe|software|basic render/i.test(
        `${vendor} ${device}`,
      ),
    };
  } catch (error) {
    return { ok: false, reason: text(error) };
  }
}

function detect(task, frame, timestamp) {
  return options.runningMode === "VIDEO"
    ? task.detectForVideo(frame, timestamp)
    : task.detect(frame);
}

async function createTask(kind, delegate) {
  const isPose = kind === "pose";
  const Task = isPose
    ? globalThis.Vision.PoseLandmarker
    : globalThis.Vision.HandLandmarker;
  const task = await Task.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: isPose
        ? `/pose/pose_landmarker_${options.model}.task`
        : "/pose/hand_landmarker.task",
      delegate,
    },
    ...(typeof OffscreenCanvas !== "undefined"
      ? { canvas: new OffscreenCanvas(1, 1) }
      : {}),
    runningMode: options.runningMode,
    ...(isPose
      ? {
          numPoses: 1,
          outputSegmentationMasks: false,
          minPoseDetectionConfidence: CONFIDENCE,
          minPosePresenceConfidence: CONFIDENCE,
          minTrackingConfidence: CONFIDENCE,
        }
      : {
          numHands: 2,
          minHandDetectionConfidence: CONFIDENCE,
          minHandPresenceConfidence: CONFIDENCE,
          minTrackingConfidence: CONFIDENCE,
        }),
  });
  // Creation may succeed while the first inference fails. Warm CPU and GPU,
  // using the selected running mode. Every new task starts at timestamp zero.
  let bitmap;
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(64, 64);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 64, 64);
      bitmap = canvas.transferToImageBitmap();
      detect(task, bitmap, 0);
    } else {
      detect(task, new ImageData(64, 64), 0);
    }
    return task;
  } catch (error) {
    close(task);
    throw error;
  } finally {
    bitmap?.close();
  }
}

function backend() {
  return {
    pose: poseDelegate,
    hand: handDelegate,
    renderer,
    model: options.model,
    runningMode: options.runningMode,
    fallback: poseFallback,
    handFallback,
    handError,
    runtimeFallback,
  };
}
const publishBackend = () =>
  globalThis.postMessage({ type: "backend", backend: backend() });

async function init(config = {}) {
  options = {
    model: config.model ?? "lite",
    runningMode: config.runningMode ?? "VIDEO",
    devMode: config.devMode === true,
    handTracking: config.handTracking !== false,
  };
  if (
    !["lite", "heavy"].includes(options.model) ||
    !["IMAGE", "VIDEO"].includes(options.runningMode)
  )
    throw new Error("Unsupported pose configuration.");
  files =
    await globalThis.Vision.FilesetResolver.forVisionTasks(
      "/pose/runtime/wasm",
    );
  const probe = probeWebGl();
  renderer = probe.ok ? probe.renderer : null;
  if (!probe.ok) poseFallback = probe.reason;
  else if (probe.software)
    poseFallback = `Software WebGL renderer: ${probe.renderer ?? "unknown"}`;
  if (probe.ok && !probe.software) {
    try {
      poseLandmarker = await createTask("pose", "GPU");
      poseDelegate = "GPU";
    } catch (error) {
      poseFallback = `GPU unavailable: ${text(error)}`;
    }
  }
  if (!poseLandmarker) {
    poseLandmarker = await createTask("pose", "CPU");
    poseDelegate = "CPU";
  }
  // Finger tracking is independent of the diagnostic Pose Lab.
  if (options.handTracking) {
    try {
      handLandmarker = await createTask("hand", poseDelegate);
      handDelegate = poseDelegate;
    } catch (error) {
      if (poseDelegate === "GPU") {
        handFallback = `GPU unavailable: ${text(error)}`;
        try {
          handLandmarker = await createTask("hand", "CPU");
          handDelegate = "CPU";
        } catch (fallbackError) {
          handError = text(fallbackError);
        }
      } else {
        handError = text(error);
      }
    }
  }
  globalThis.postMessage({
    type: "ready",
    hands: !!handLandmarker,
    handError,
    backend: backend(),
  });
}

function handResult(result) {
  return (result.landmarks ?? []).map((landmarks, i) => ({
    label: result.handednesses?.[i]?.[0]?.categoryName ?? "",
    score: result.handednesses?.[i]?.[0]?.score ?? 0,
    landmarks: landmarks.map(({ x, y, z }) => [x, y, z]),
  }));
}

async function inferHands(frame, timestamp) {
  if (!handLandmarker) return null;
  try {
    return handResult(detect(handLandmarker, frame, timestamp));
  } catch (error) {
    close(handLandmarker);
    handLandmarker = null;
    if (handDelegate === "GPU") {
      runtimeFallback = true;
      handFallback = `Runtime fallback: ${text(error)}`;
      handDelegate = null;
      try {
        handLandmarker = await createTask("hand", "CPU");
        handDelegate = "CPU";
        const result = handResult(detect(handLandmarker, frame, timestamp));
        publishBackend();
        return result;
      } catch (fallbackError) {
        handError = text(fallbackError);
      }
    } else {
      handError = text(error);
    }
    close(handLandmarker);
    handLandmarker = null;
    handDelegate = null;
    publishBackend();
    return null; // unavailable is distinct from a successful detection of no hands
  }
}

globalThis.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      await init(data.options);
    } else if (data.type === "frame") {
      const started = performance.now();
      const frame = data.frame;
      // Never feed duplicate/backwards timestamps into temporal tracking.
      if (
        !Number.isFinite(data.timestamp) ||
        data.timestamp < 0 ||
        data.timestamp <= lastTimestamp
      ) {
        globalThis.postMessage({ type: "dropped", timestamp: data.timestamp });
        return;
      }
      lastTimestamp = data.timestamp;
      const timestamp = Math.max(
        data.timestamp,
        lastInferenceTimestamp + 0.001,
      );
      lastInferenceTimestamp = timestamp;
      let result;
      try {
        result = detect(poseLandmarker, frame, timestamp);
      } catch (error) {
        if (poseDelegate !== "GPU") throw error;
        runtimeFallback = true;
        poseFallback = `Runtime fallback: ${text(error)}`;
        close(poseLandmarker);
        poseLandmarker = null;
        // Keep the same model and mode; delegate fallback is not model fallback.
        poseLandmarker = await createTask("pose", "CPU");
        poseDelegate = "CPU";
        publishBackend();
        // Clear the observation across this interruption; resume on the next frame.
        result = { landmarks: [] };
      }
      // Hands can be visible even when the torso is cropped. Bound the extra
      // model to 5 Hz; intermediate pose frames reuse at most 200 ms of hands.
      if (timestamp - lastHandTimestamp >= HAND_INTERVAL_MS) {
        lastHandTimestamp = timestamp;
        latestHands = await inferHands(frame, timestamp);
      }
      globalThis.postMessage({
        type: "sample",
        timestamp: data.timestamp,
        width: frame.width,
        height: frame.height,
        points: result.landmarks[0] ?? [],
        hands: latestHands,
        inferenceMs: performance.now() - started,
      });
    }
  } catch (error) {
    globalThis.postMessage({ type: "error", message: text(error) });
  } finally {
    data.frame?.close();
  }
};

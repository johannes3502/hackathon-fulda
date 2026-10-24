/* MediaPipe runs off the UI thread; frames and landmarks never leave this worker/browser. */
globalThis.importScripts("/pose/runtime/vision_bundle.js");

// Same assets and inference settings as hassan-poselog; only the delegate differs.
const MODELS = {
  pose: "/pose/pose_landmarker_lite.task",
  hand: "/pose/hand_landmarker.task",
};
const CONFIDENCE = 0.5;

let files = null;
let poseLandmarker = null;
let handLandmarker = null;
let poseDelegate = "CPU";
// null while the hand model is unavailable.
let handDelegate = null;
let handError = null;
let renderer = null;
let poseFallback = null;
let handFallback = null;
let runtimeFallback = false;

const text = (error) =>
  error instanceof Error ? error.message : String(error);

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
      // SwiftShader/llvmpipe are CPU rasterizers, not a useful GPU delegate.
      software: /swiftshader|llvmpipe|software|basic render/i.test(
        `${vendor} ${device}`,
      ),
    };
  } catch (error) {
    return { ok: false, reason: text(error) };
  }
}

function createPose(delegate) {
  return globalThis.Vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: MODELS.pose,
      delegate,
    },
    canvas: new OffscreenCanvas(1, 1),
    // IMAGE avoids the VIDEO graph's temporal landmark smoothing in the raw log.
    runningMode: "IMAGE",
    numPoses: 1,
    outputSegmentationMasks: false,
    minPoseDetectionConfidence: CONFIDENCE,
    minPosePresenceConfidence: CONFIDENCE,
  });
}

function createHand(delegate) {
  return globalThis.Vision.HandLandmarker.createFromOptions(files, {
    baseOptions: {
      modelAssetPath: MODELS.hand,
      delegate,
    },
    canvas: new OffscreenCanvas(1, 1),
    runningMode: "IMAGE",
    numHands: 2,
    minHandDetectionConfidence: CONFIDENCE,
    minHandPresenceConfidence: CONFIDENCE,
  });
}

// Creation alone can succeed while the first inference fails. Warm both paths.
function warmup(task) {
  const canvas = new OffscreenCanvas(64, 64);
  const context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, 64, 64);
  const bitmap = canvas.transferToImageBitmap();
  try {
    task.detect(bitmap);
  } finally {
    bitmap.close();
  }
}

function backend() {
  return {
    pose: poseDelegate,
    hand: handDelegate,
    renderer,
    fallback: poseFallback,
    handFallback,
    handError,
    runtimeFallback,
  };
}

function handResult(found) {
  return (found.landmarks ?? []).map((landmarks, i) => ({
    label: found.handednesses?.[i]?.[0]?.categoryName ?? "",
    score: found.handednesses?.[i]?.[0]?.score ?? 0,
    landmarks: landmarks.map(({ x, y, z }) => [x, y, z]),
  }));
}

async function switchToCpu(reason) {
  const previousPose = poseLandmarker;
  const previousHand = handLandmarker;
  poseLandmarker = null;
  handLandmarker = null;
  poseDelegate = "CPU";
  handDelegate = null;
  runtimeFallback = true;
  poseFallback = reason;
  try {
    previousPose?.close();
  } catch {}
  try {
    previousHand?.close();
  } catch {}
  poseLandmarker = await createPose("CPU");
  if (previousHand) {
    try {
      handLandmarker = await createHand("CPU");
      handDelegate = "CPU";
    } catch (error) {
      handError = text(error);
    }
  }
  globalThis.postMessage({ type: "backend", backend: backend() });
}

async function init() {
  files = await globalThis.Vision.FilesetResolver.forVisionTasks(
    "/pose/runtime/wasm",
  );
  const probe = probeWebGl();
  renderer = probe.ok ? probe.renderer : null;
  if (!probe.ok) poseFallback = probe.reason;
  else if (probe.software)
    poseFallback = `software WebGL renderer${probe.renderer ? `: ${probe.renderer}` : ""}`;
  let gpu = probe.ok && !probe.software;
  if (gpu) {
    let candidate = null;
    try {
      candidate = await createPose("GPU");
      warmup(candidate);
      poseLandmarker = candidate;
      poseDelegate = "GPU";
    } catch (error) {
      poseFallback = `GPU unavailable: ${text(error)}`;
      try {
        candidate?.close();
      } catch {}
      gpu = false;
    }
  }
  if (!poseLandmarker) {
    poseLandmarker = await createPose("CPU");
    poseDelegate = "CPU";
  }
  const handCost = gpu && poseDelegate === "GPU" ? "GPU" : "CPU";
  try {
    const candidate = await createHand(handCost);
    warmup(candidate);
    handLandmarker = candidate;
    handDelegate = handCost;
  } catch (error) {
    handFallback = `GPU unavailable: ${text(error)}`;
    if (handCost === "GPU") {
      try {
        const candidate = await createHand("CPU");
        warmup(candidate);
        handLandmarker = candidate;
        handDelegate = "CPU";
      } catch (fallbackError) {
        handError = text(fallbackError);
      }
    } else {
      handError = text(error);
      handFallback = null;
    }
  }
  globalThis.postMessage({
    type: "ready",
    hands: !!handLandmarker,
    handError,
    backend: backend(),
  });
}

globalThis.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      await init();
    } else if (data.type === "frame") {
      const frame = data.frame;
      let result;
      try {
        result = poseLandmarker.detect(frame);
      } catch (error) {
        if (poseDelegate === "GPU" && !runtimeFallback) {
          await switchToCpu(`runtime fallback: ${text(error)}`);
          // The frame is dropped; the next one runs on CPU and clears the caller.
          globalThis.postMessage({
            type: "sample",
            timestamp: data.timestamp,
            width: frame.width,
            height: frame.height,
            points: [],
            // No hand inference ran on this dropped frame; don't claim "no hands".
            hands: null,
          });
          return;
        }
        throw error;
      }
      let hands = null;
      if (handLandmarker) {
        try {
          hands = handResult(handLandmarker.detect(frame));
        } catch (error) {
          if (handDelegate === "GPU" && !runtimeFallback) {
            handFallback = `runtime fallback: ${text(error)}`;
            try {
              handLandmarker.close();
            } catch {}
            handLandmarker = null;
            handDelegate = null;
            try {
              handLandmarker = await createHand("CPU");
              handDelegate = "CPU";
              hands = handResult(handLandmarker.detect(frame));
            } catch (fallbackError) {
              handError = text(fallbackError);
            }
            globalThis.postMessage({ type: "backend", backend: backend() });
          }
        }
      }
      globalThis.postMessage({
        type: "sample",
        timestamp: data.timestamp,
        width: frame.width,
        height: frame.height,
        points: result.landmarks[0] ?? [],
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

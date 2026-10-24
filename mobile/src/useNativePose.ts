import { useEffect, useState } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import {
  VisionCameraProxy,
  runAtTargetFps,
  useFrameProcessor,
} from "react-native-vision-camera";
import { NativePoseLog } from "./native-log";
import type { Landmark } from "../../frontend/src/features/pose/sample";
const plugin = VisionCameraProxy.initFrameProcessorPlugin("poseDetection", {});
export function useNativePose(enabled: boolean) {
  const [log] = useState(() => new NativePoseLog());
  const [handle, setHandle] = useState<number>();
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("Loading local pose model…");
  useEffect(() => {
    if (!enabled) return;
    const native = NativeModules.PoseDetection;
    if (!native || !plugin) return;
    let disposed = false;
    let detector: number | undefined;
    const events = new NativeEventEmitter(native);
    const results = events.addListener(
      "onResults",
      (data: {
        handle: number;
        timestampMs?: number;
        inputImageWidth: number;
        inputImageHeight: number;
        results: { landmarks: Landmark[][] }[];
      }) => {
        if (disposed || data.handle !== detector) return;
        const sample = log.add(
          data.results[0]?.landmarks[0] ?? [],
          data.inputImageWidth,
          data.inputImageHeight,
          data.timestampMs ?? NaN,
        );
        setCount(log.count);
        setStatus(
          log.full
            ? "Sample limit reached. Stop and share this take."
            : sample
              ? "Pose landmarks captured locally."
              : "Keep your upper body in frame.",
        );
      },
    );
    const errors = events.addListener(
      "onError",
      (error: { handle: number; message: string }) => {
        if (!disposed && error.handle === detector)
          setStatus(`Pose unavailable: ${error.message}`);
      },
    );
    native
      .createDetector(
        1,
        0.5,
        0.5,
        0.5,
        false,
        "pose_landmarker_lite.task",
        0,
        0,
      )
      .then((id: number) => {
        if (disposed) {
          void native.releaseDetector(id);
          return;
        }
        detector = id;
        setHandle(id);
      })
      .catch(() => {
        if (!disposed)
          setStatus(
            "Pose model could not start. Recording is still available.",
          );
      });
    return () => {
      disposed = true;
      results.remove();
      errors.remove();
      if (detector !== undefined) void native.releaseDetector(detector);
    };
  }, [enabled, log]);
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (handle === undefined || !enabled) return;
      runAtTargetFps(10, () => {
        plugin?.call(frame, {
          detectorHandle: handle,
          orientation: frame.orientation,
          timestampMs: Date.now(),
        });
      });
    },
    [handle, enabled],
  );
  return {
    frameProcessor,
    count,
    status: !enabled
      ? "Pose capture off"
      : !NativeModules.PoseDetection || !plugin
        ? "Native pose unavailable. Rebuild the development client."
        : status,
    log,
    start: (timestamp: number) => {
      log.start(timestamp);
      setCount(0);
    },
  };
}

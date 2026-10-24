import { useEffect, useState } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import {
  VisionCameraProxy,
  runAtTargetFps,
  useFrameProcessor,
} from "react-native-vision-camera";
import { NativePoseLog } from "./native-log";
import {
  CrossArmsCue,
  armsCrossed,
} from "../../frontend/src/features/pose/cues";
import {
  poseSample,
  type PoseSample,
  type Landmark,
} from "../../frontend/src/features/pose/sample";
const plugin = VisionCameraProxy.initFrameProcessorPlugin("poseDetection", {});
export function useNativePose(enabled: boolean) {
  const [log] = useState(() => new NativePoseLog());
  const [handle, setHandle] = useState<number>();
  const [latest, setLatest] = useState<PoseSample | null>(null);
  const [crossed, setCrossed] = useState(false);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("Loading local pose model…");
  useEffect(() => {
    if (!enabled) return;
    const native = NativeModules.PoseDetection;
    if (!native || !plugin) return;
    log.start(Date.now(), "preview-start");
    const cue = new CrossArmsCue();
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
        const visible =
          sample ??
          (log.full
            ? poseSample(
                data.results[0]?.landmarks[0] ?? [],
                data.inputImageWidth,
                data.inputImageHeight,
                0,
              )
            : null);
        setLatest(visible);
        setCrossed(
          cue.update(armsCrossed(visible), data.timestampMs ?? Date.now()),
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
        if (!disposed && error.handle === detector) {
          setLatest(null);
          setCrossed(false);
          setStatus(`Pose unavailable: ${error.message}`);
        }
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
    latest: enabled ? latest : null,
    crossed: enabled && crossed,
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

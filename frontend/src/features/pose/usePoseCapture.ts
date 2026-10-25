"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { PoseCapture, type PoseState } from "./capture";
import { DEFAULT_POSE_OPTIONS, type PoseOptions } from "./options";
export function usePoseCapture(
  video: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  {
    model,
    runningMode,
    devMode,
    handTracking,
  }: PoseOptions = DEFAULT_POSE_OPTIONS,
) {
  const owner = useRef<PoseCapture | null>(null);
  const recording = useRef(false);
  const [state, setState] = useState<PoseState | null>(null);
  const [download, setDownload] = useState<Blob>();
  const start = useCallback(() => {
    if (!video.current) return;
    owner.current?.dispose();
    recording.current = false;
    const capture = new PoseCapture(
      video.current,
      (next) => {
        setState(next);
        if (next.phase === "loading") setDownload(undefined);
        if (next.phase === "stopped" || next.phase === "error")
          setDownload(capture.log.blob());
      },
      { model, runningMode, devMode, handTracking },
    );
    owner.current = capture;
    capture.start();
  }, [video, model, runningMode, devMode, handTracking]);
  useEffect(() => {
    if (!enabled) return;
    start();
    return () =>
      owner.current?.stop(
        "Camera stopped. Your captured samples are ready to download.",
      );
  }, [enabled, start]);
  function beginRecording(timestamp: number, sessionId?: string) {
    recording.current = false;
    if (owner.current) {
      recording.current = true;
      owner.current.beginRecording(timestamp, sessionId);
      setState((previous) =>
        previous
          ? {
              ...previous,
              count: 0,
              latest: null,
              evaluation: null,
              hands: [],
              tests: [],
            }
          : previous,
      );
      setDownload(undefined);
    }
  }
  return {
    state,
    download,
    start,
    beginRecording,
    recalibrate: () => owner.current?.recalibrate(),
    recordingEvents: () =>
      recording.current ? (owner.current?.events ?? []) : [],
    recordingPositiveFeedback: () =>
      recording.current ? (owner.current?.positiveFeedback ?? []) : [],
    stop: () => owner.current?.stop(),
    recordingBlob: () =>
      recording.current ? owner.current?.log.blob() : undefined,
  };
}

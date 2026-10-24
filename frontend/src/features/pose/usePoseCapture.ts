"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { PoseCapture, type PoseState } from "./capture";
export function usePoseCapture(
  video: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const owner = useRef<PoseCapture | null>(null);
  const recording = useRef(false);
  const [state, setState] = useState<PoseState | null>(null);
  const [download, setDownload] = useState<Blob>();
  const start = useCallback(() => {
    if (!video.current) return;
    owner.current?.dispose();
    recording.current = false;
    const capture = new PoseCapture(video.current, (next) => {
      setState(next);
      if (next.phase === "loading") setDownload(undefined);
      if (next.phase === "stopped" || next.phase === "error")
        setDownload(capture.log.blob());
    });
    owner.current = capture;
    capture.start();
  }, [video]);
  useEffect(() => {
    if (!enabled) return;
    start();
    return () =>
      owner.current?.stop(
        "Camera stopped. Your captured samples are ready to download.",
      );
  }, [enabled, start]);
  function beginRecording(timestamp: number) {
    recording.current = false;
    if (
      owner.current &&
      (state?.phase === "running" || state?.phase === "loading")
    ) {
      recording.current = true;
      owner.current.beginRecording(timestamp);
      setState((previous) =>
        previous ? { ...previous, count: 0, latest: null } : previous,
      );
      setDownload(undefined);
    }
  }
  return {
    state,
    download,
    start,
    beginRecording,
    stop: () => owner.current?.stop(),
    recordingBlob: () =>
      recording.current ? owner.current?.log.blob() : undefined,
  };
}

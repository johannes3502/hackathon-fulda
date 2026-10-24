"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { PoseCapture, type PoseState } from "./capture";
export function usePoseCapture(video: RefObject<HTMLVideoElement | null>) {
  const owner = useRef<PoseCapture | null>(null);
  const recording = useRef(false);
  const [state, setState] = useState<PoseState | null>(null);
  const [download, setDownload] = useState<Blob>();
  useEffect(() => () => owner.current?.dispose(), []);
  function start() {
    if (!video.current) return;
    owner.current?.dispose();
    setDownload(undefined);
    recording.current = false;
    const capture = new PoseCapture(video.current, (next) => {
      setState(next);
      if (next.phase === "stopped" || next.phase === "error")
        setDownload(capture.log.blob());
    });
    owner.current = capture;
    capture.start();
  }
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

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export type CameraStatus =
  "idle" | "pending" | "active" | "denied" | "unavailable" | "failed";
export function useCameraPreview() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const release = useCallback(() => {
    generation.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => release, [release]);
  const stop = () => {
    release();
    setStatus("idle");
  };
  const enable = async (audio = false) => {
    release();
    const request = generation.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: audio
          ? {
              autoGainControl: false,
              noiseSuppression: false,
              echoCancellation: false,
            }
          : false,
      });
      if (request !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("active");
    } catch (e) {
      if (request !== generation.current) return;
      setStatus(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "denied"
          : e instanceof DOMException && e.name === "NotFoundError"
            ? "unavailable"
            : "failed",
      );
    }
  };
  const getStream = () => streamRef.current;
  return { status, videoRef, enable, stop, getStream };
}

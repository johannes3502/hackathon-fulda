"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export type CameraStatus =
  "idle" | "pending" | "active" | "denied" | "unavailable" | "failed";
export function useCameraPreview() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);
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
    setAudioAvailable(null);
  };
  const enable = async (audio = false) => {
    release();
    const request = generation.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("pending");
    const videoConstraints: MediaTrackConstraints = { facingMode: "user" };
    const audioConstraints: MediaTrackConstraints = {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    };
    let stream: MediaStream;
    let audioReady = audio;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audio ? audioConstraints : false,
      });
    } catch (error) {
      // A denied or busy microphone must not take the camera and pose preview
      // down with it. Retry video-only; backend recording still refuses to
      // start without audio, but the local fallback can record the picture.
      if (!audio) {
        if (request !== generation.current) return;
        setAudioAvailable(null);
        setStatus(mediaError(error));
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
        audioReady = false;
      } catch {
        if (request !== generation.current) return;
        setAudioAvailable(null);
        setStatus(mediaError(error));
        return;
      }
    }
    if (request !== generation.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setAudioAvailable(audioReady);
    setStatus("active");
  };
  const getStream = () => streamRef.current;
  return { status, audioAvailable, videoRef, enable, stop, getStream };
}
function mediaError(error: unknown): CameraStatus {
  return error instanceof DOMException && error.name === "NotAllowedError"
    ? "denied"
    : error instanceof DOMException && error.name === "NotFoundError"
      ? "unavailable"
      : "failed";
}

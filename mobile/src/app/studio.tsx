import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform, View } from "react-native";
import { router, Stack } from "expo-router";
import { useIsFocused, usePreventRemove } from "expo-router/react-navigation";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useMicrophonePermission,
  type VideoFile,
} from "react-native-vision-camera";
import { randomUUID } from "expo-crypto";
import {
  Action,
  Columns,
  Copy,
  Page,
  Section,
  Symbol,
  time,
  useColors,
} from "../ui";
import { useSessions, writePose, shareFile, type Take } from "../session";
import { useNativePose } from "../useNativePose";
import { PoseOverlay } from "../components/pose-overlay";
import { PoseReadout } from "../components/pose-readout";
import { api, endpoint } from "../api";
export default function Studio() {
  const { save, options, practice } = useSessions();
  const { title, poseEnabled, backend, url } = options;
  const colors = useColors();
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("front");
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 },
  ]);
  const focused = useIsFocused();
  const cam = useCameraPermission();
  const mic = useMicrophonePermission();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const recordingActive = useRef(false);
  const [recording, setRecording] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const busy = useRef(false);
  const startTime = useRef(0);
  const id = useRef("");
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pending = useRef<AbortController | undefined>(undefined);
  const pose = useNativePose(
    enabled && focused && foreground && poseEnabled && !finishing,
  );
  const poseText = useRef("");
  usePreventRemove(recording || finishing, () =>
    Alert.alert(
      "Finish this take first",
      "Stop recording to keep your video and pose log before leaving.",
    ),
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.abort();
      clearInterval(timer.current);
      // The camera mounts only after permission; use the current instance on exit.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (busy.current) void camera.current?.stopRecording().catch(() => {});
    };
  }, []);
  const stop = async () => {
    if (!recordingActive.current || finishing) return;
    recordingActive.current = false;
    setRecording(false);
    setFinishing(true);
    clearInterval(timer.current);
    poseText.current = pose.log.text();
    try {
      await camera.current?.stopRecording();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording could not stop.");
      setFinishing(false);
      busy.current = false;
    }
  };
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") {
        pending.current?.abort();
        if (recordingActive.current) void stopRef.current();
      }
    });
    return () => sub.remove();
  }, []);
  async function enable() {
    setError(undefined);
    const cameraAllowed = await cam.requestPermission();
    const audioAllowed = await mic.requestPermission();
    if (!cameraAllowed || !audioAllowed) {
      setError(
        "Camera and microphone permissions are required. You can enable them in Settings.",
      );
      return;
    }
    setEnabled(true);
  }
  async function start() {
    if (busy.current || !camera.current || !ready) return;
    if (!title.trim()) {
      setError("Give this take a title.");
      return;
    }
    busy.current = true;
    setPreparing(true);
    setError(undefined);
    pending.current = undefined;
    let base = "";
    try {
      if (backend) {
        base = endpoint(url);
        const controller = new AbortController();
        pending.current = controller;
        await api(base, "/health/ready", controller.signal);
      }
    } catch (e) {
      busy.current = false;
      setError(e instanceof Error ? e.message : "Backend not ready.");
      return;
    } finally {
      setPreparing(false);
    }
    if (!alive.current || pending.current?.signal.aborted) {
      busy.current = false;
      return;
    }
    busy.current = true;
    id.current = randomUUID();
    startTime.current = Date.now();
    pose.start(startTime.current);
    poseText.current = "";
    setElapsed(0);
    recordingActive.current = true;
    setRecording(true);
    const take: Omit<Take, "uri" | "durationMs" | "poseCount"> = {
      id: id.current,
      title: title.trim(),
      feedback: [],
      metrics: [],
      mode: backend ? "backend" : "local",
      endpoint: base,
    };
    const done = (video: VideoFile) => {
      clearInterval(timer.current);
      recordingActive.current = false;
      busy.current = false;
      const text = poseEnabled ? poseText.current || pose.log.text() : "";
      let poseUri: string | undefined;
      let notice: string | undefined;
      try {
        poseUri = writePose(take.id, text);
      } catch {
        notice = "Recording saved, but the pose file could not be written.";
      }
      save({
        ...take,
        uri: video.path.startsWith("file:")
          ? video.path
          : `file://${video.path}`,
        durationMs: Math.round(video.duration * 1000),
        poseUri,
        notice,
        poseCount: text ? text.trim().split("\n").length : 0,
      });
      if (alive.current) {
        setRecording(false);
        setFinishing(false);
        setEnabled(false);
        setTimeout(
          () =>
            router.replace({ pathname: "/review", params: { id: take.id } }),
          0,
        );
      }
    };
    try {
      camera.current.startRecording({
        fileType: "mp4",
        onRecordingFinished: done,
        onRecordingError: (e) => {
          recordingActive.current = false;
          busy.current = false;
          clearInterval(timer.current);
          if (alive.current) {
            setRecording(false);
            setFinishing(false);
            setError(e.message);
          }
        },
      });
      timer.current = setInterval(() => {
        const ms = Date.now() - startTime.current;
        setElapsed(ms);
        if (ms >= practice.targetDurationMs) void stopRef.current();
      }, 100);
    } catch (e) {
      busy.current = false;
      setRecording(false);
      setError(e instanceof Error ? e.message : "Recording failed.");
    }
  }
  return (
    <>
      <Page>
        <Columns
          main={
            <>
              <View
                style={{
                  width: "100%",
                  aspectRatio: 3 / 4,
                  maxHeight: 520,
                  borderRadius: 24,
                  borderCurve: "continuous",
                  overflow: "hidden",
                  backgroundColor: "#171719",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {enabled && device ? (
                  <Camera
                    ref={camera}
                    style={{ width: "100%", height: "100%" }}
                    device={device}
                    format={format}
                    fps={30}
                    isMirrored
                    isActive={focused && foreground}
                    video
                    audio
                    pixelFormat="yuv"
                    frameProcessor={
                      poseEnabled ? pose.frameProcessor : undefined
                    }
                    onInitialized={() => setReady(true)}
                    onError={(e) => setError(e.message)}
                  />
                ) : (
                  <View style={{ alignItems: "center", padding: 28, gap: 16 }}>
                    <Symbol name="video" size={44} muted />
                    <Copy title style={{ color: "white", textAlign: "center" }}>
                      {device ? "Ready when you are" : "Camera Unavailable"}
                    </Copy>
                    <Copy style={{ color: "#b4b4bb", textAlign: "center" }}>
                      {device
                        ? "Keep your upper body in view."
                        : "Use a physical device to record, or explore the sample rehearsal."}
                    </Copy>
                  </View>
                )}
                {enabled && pose.latest && <PoseOverlay sample={pose.latest} />}
              </View>
              {pose.crossed && (
                <Copy accessibilityLiveRegion="polite">
                  Arms crossed. Try an open stance. · Heuristic
                </Copy>
              )}
              <View style={{ alignItems: "center", gap: 8 }}>
                <Copy
                  style={{
                    fontSize: 40,
                    lineHeight: 48,
                    fontWeight: "300",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {time(elapsed)}
                </Copy>
                <Copy caption muted>
                  {recording
                    ? "Recording"
                    : finishing
                      ? "Saving recording…"
                      : `Up to ${practice.targetDurationMs / 60000} minutes`}
                </Copy>
              </View>
              {!enabled ? (
                <Action
                  label="Enable Camera & Microphone"
                  icon="video.fill"
                  disabled={!device}
                  onPress={() => void enable()}
                />
              ) : recording || finishing ? (
                <Action
                  label={finishing ? "Saving…" : "Stop Recording"}
                  icon="stop.circle.fill"
                  recording
                  disabled={finishing}
                  onPress={() => void stop()}
                />
              ) : (
                <Action
                  label={preparing ? "Connecting…" : "Start Recording"}
                  icon="record.circle"
                  recording
                  disabled={!ready || preparing}
                  onPress={() => void start()}
                />
              )}
              {enabled && !recording && !finishing && !preparing && (
                <Action
                  secondary
                  label="Turn Camera Off"
                  icon="video.slash"
                  onPress={() => {
                    setEnabled(false);
                    setReady(false);
                  }}
                />
              )}
              <Copy caption muted style={{ textAlign: "center" }}>
                Your recording stays on this device until you choose to share or
                upload it.
              </Copy>
              {error && (
                <Copy accessibilityRole="alert" style={{ color: colors.error }}>
                  {error}
                </Copy>
              )}
              {!device && (
                <Action
                  secondary
                  label="Try Sample Rehearsal"
                  onPress={() => router.push("/demo")}
                />
              )}
              {error && (!cam.hasPermission || !mic.hasPermission) && (
                <Action
                  secondary
                  label="Open Settings"
                  onPress={() => void Linking.openSettings()}
                />
              )}
            </>
          }
          side={
            <>
              <Section title="Recording">
                <Copy title>{title}</Copy>
                <Copy caption muted>
                  {backend
                    ? "Server analysis available after recording"
                    : "On-device recording"}
                </Copy>
                <Action
                  secondary
                  label="Recording Options"
                  icon="slider.horizontal.3"
                  disabled={recording || finishing || preparing}
                  onPress={() => router.push("/settings")}
                />
              </Section>
              <Section
                title="Pose tracking"
                footer="Landmarks stay on your device. No scores or ratings."
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Symbol name="figure.stand" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Copy>
                      {poseEnabled ? "On-device tracking" : "Tracking Off"}
                    </Copy>
                    <Copy caption muted>
                      {poseEnabled
                        ? pose.status
                        : "Turn on tracking in Recording Options."}
                    </Copy>
                  </View>
                </View>
                {poseEnabled && (
                  <Copy caption muted>
                    {pose.count} samples captured
                  </Copy>
                )}
              </Section>
              {pose.latest && (
                <PoseReadout sample={pose.latest} active={pose.crossed} />
              )}
              {!enabled && pose.count > 0 && (
                <Action
                  secondary
                  label="Share Preview Pose Log"
                  icon="square.and.arrow.up"
                  onPress={() =>
                    void (async () => {
                      try {
                        const uri = writePose(randomUUID(), pose.log.text());
                        if (uri) await shareFile(uri);
                      } catch (e) {
                        setError(String(e));
                      }
                    })()
                  }
                />
              )}
            </>
          }
        />
      </Page>
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="slider.horizontal.3"
            accessibilityLabel="Recording options"
            disabled={recording || finishing || preparing}
            onPress={() => router.push("/settings")}
          />
        </Stack.Toolbar>
      )}
    </>
  );
}

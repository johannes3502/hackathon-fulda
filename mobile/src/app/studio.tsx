import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Switch, View } from "react-native";
import { router } from "expo-router";
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
import { Action, Columns, Copy, Field, Page, Panel, time } from "../ui";
import { useSessions, writePose, type Take } from "../session";
import { useNativePose } from "../useNativePose";
import { api, endpoint } from "../api";
export default function Studio() {
  const { save } = useSessions();
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
  const [poseEnabled, setPoseEnabled] = useState(true);
  const [title, setTitle] = useState("My pitch rehearsal");
  const [backend, setBackend] = useState(false);
  const [url, setUrl] = useState(process.env.EXPO_PUBLIC_API_URL ?? "");
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
        if (ms >= 180000) void stopRef.current();
      }, 100);
    } catch (e) {
      busy.current = false;
      setRecording(false);
      setError(e instanceof Error ? e.message : "Recording failed.");
    }
  }
  return (
    <Page>
      <Columns
        main={
          <>
            <View
              style={{
                height: 360,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#111827",
                justifyContent: "center",
              }}
            >
              {enabled && device ? (
                <Camera
                  ref={camera}
                  style={{ flex: 1 }}
                  device={device}
                  format={format}
                  fps={30}
                  isActive={focused && foreground}
                  video
                  audio
                  pixelFormat="yuv"
                  frameProcessor={poseEnabled ? pose.frameProcessor : undefined}
                  onInitialized={() => setReady(true)}
                  onError={(e) => setError(e.message)}
                />
              ) : (
                <Copy style={{ color: "white", textAlign: "center" }}>
                  {device
                    ? "Camera preview is off."
                    : "No camera available. Try the sample rehearsal on a simulator."}
                </Copy>
              )}
            </View>
            <Copy title>{time(elapsed)} · 3-minute limit</Copy>
            {!enabled ? (
              <Action
                label="Enable camera & microphone"
                onPress={() => void enable()}
              />
            ) : recording || finishing ? (
              <Action
                label={finishing ? "Saving take…" : "Finish & review"}
                disabled={finishing}
                onPress={() => void stop()}
              />
            ) : (
              <Action
                label={preparing ? "Checking backend…" : "Start recording"}
                disabled={!ready || preparing}
                onPress={() => void start()}
              />
            )}
            <Copy muted>
              {backend
                ? "Recording stays local until you explicitly upload it from review."
                : "Local capture. Nothing is uploaded."}
            </Copy>
            {error && (
              <Copy accessibilityRole="alert" style={{ color: "#a3261f" }}>
                {error}
              </Copy>
            )}
            {(!cam.hasPermission || !mic.hasPermission) && (
              <Action
                secondary
                label="Open permission settings"
                onPress={() => void Linking.openSettings()}
              />
            )}
          </>
        }
        side={
          <>
            <Panel>
              <Field
                label="Recording title"
                value={title}
                maxLength={100}
                editable={!recording && !finishing && !preparing}
                onChangeText={setTitle}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Copy>Native pose capture</Copy>
                <Switch
                  accessibilityLabel="Native pose capture"
                  value={poseEnabled}
                  disabled={recording || finishing || preparing}
                  onValueChange={setPoseEnabled}
                />
              </View>
              <Copy muted>
                {poseEnabled ? pose.status : "Pose capture off"}
              </Copy>
              <Copy>{pose.count} pose samples</Copy>
              <Copy muted>
                Pose stays on this device. Head angles are uncalibrated
                heuristics, not gaze or performance scores.
              </Copy>
            </Panel>
            <Panel>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Copy>Backend audio analysis</Copy>
                <Switch
                  accessibilityLabel="Backend audio analysis"
                  value={backend}
                  disabled={recording || finishing || preparing}
                  onValueChange={setBackend}
                />
              </View>
              {backend && (
                <>
                  <Field
                    label="Backend API URL"
                    placeholder="https://your-server.example"
                    value={url}
                    editable={!recording && !finishing && !preparing}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Copy muted>
                    Use a reachable LAN or HTTPS address. Localhost on a phone
                    refers to the phone, not your laptop.
                  </Copy>
                  <Copy muted>
                    Uploading from review sends the full video and audio. The
                    backend stores the upload until processing and retains
                    results. This mode does not request paid ASR.
                  </Copy>
                </>
              )}
              <Copy muted>
                Automatic transcription, fact-checking and questions remain
                scripted in the sample rehearsal.
              </Copy>
            </Panel>
          </>
        }
      />
    </Page>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Play,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Eye,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Radio,
  ShieldCheck,
  Square,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { useCameraPreview } from "@/hooks/useCameraPreview";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { LiveCaptions } from "@/features/live/captions";
import {
  LiveSpeech,
  mergeSpeechFeedback,
  type SpeechState,
} from "@/features/live/speech";
import { LiveRecorder } from "@/features/live/recorder";
import { createVideoTransport } from "@/features/live/transport";
import { apiEndpoint, request } from "@/features/live/analysis";
import type { LiveConfig, LiveProgress } from "@/features/live/contracts";
import { time } from "@/lib/utils";
import { usePoseCapture } from "@/features/pose/usePoseCapture";
import { poseFeedback } from "@/features/pose/feedback";
import { GestureGuide } from "./GestureGuide";
import { PoseDownload } from "./PoseDownload";
import { PoseDevMode, type PoseView } from "./PoseDevMode";
import { poseFeedback as labFeedback } from "@/features/pose/testPoses";
import { PoseDebug } from "./PoseDebug";
import { PoseOverlay } from "./PoseOverlay";
import { LiveBadge } from "./shared";
import { FeatureOptions } from "./FeatureOptions";
import { backendLabel, fallbackLabel } from "@/features/pose/backend";

const cameraCopy = {
  idle: "Enable your camera to check your framing. Then start recording when you’re ready.",
  pending: "Waiting for camera permission. Nothing is being recorded or sent.",
  active:
    "Local camera preview. Keep your upper body in view, then choose Start recording.",
  denied:
    "Camera permission was denied. Allow camera access in your browser, then try again.",
  unavailable:
    "No camera is available. Use HTTPS or localhost and connect a camera.",
  failed: "The camera could not start. Close other camera apps and try again.",
};
export function LiveStudio() {
  const router = useRouter();
  const { save, recordings, featureFlags, setFeatureFlags } = useLiveSessions();
  const {
    status: cameraStatus,
    videoRef,
    enable,
    stop: stopCamera,
    getStream,
  } = useCameraPreview();
  const pose = usePoseCapture(
    videoRef,
    cameraStatus === "active",
    featureFlags,
  );
  const [title, setTitle] = useState("My pitch rehearsal");
  const [targetMs, setTargetMs] = useState(180000);
  const [mode, setMode] = useState<LiveConfig["mode"]>("local");
  const microphone = mode === "backend" || featureFlags.liveSpeechFeedback;
  const speechChoice =
    mode === "backend"
      ? "backend"
      : featureFlags.liveSpeechFeedback
        ? "live"
        : "local";
  const [speech, setSpeech] = useState<SpeechState | null>(null);
  const voice = useRef<LiveSpeech | null>(null);
  const voiceStream = cameraStatus === "active" ? getStream() : null;
  const [transcribe, setTranscribe] = useState(true);
  const [liveCaptions, setLiveCaptions] = useState(false);
  const [caption, setCaption] = useState({ text: "", status: "" });
  const captions = useRef<LiveCaptions | null>(null);
  const [endpoint, setEndpoint] = useState(
    process.env.NEXT_PUBLIC_API_URL ?? "/api",
  );
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [largeView, setLargeView] = useState(true);
  const [showCues, setShowCues] = useState(true);
  const [poseDebug, setPoseDebug] = useState(false);
  const poseLab = featureFlags.devMode;
  const setPoseLab = (devMode: boolean) =>
    setFeatureFlags({ ...featureFlags, devMode });
  const [poseView, setPoseView] = useState<PoseView>("coach");
  const poseAlert =
    poseLab &&
    pose.state?.phase === "running" &&
    labFeedback(pose.state.tests).state === "alert";
  const owner = useRef<LiveRecorder | null>(null);
  const busy = useRef(false);
  useEffect(
    () => () => {
      owner.current?.dispose();
      captions.current?.stop();
      voice.current?.stop();
    },
    [],
  );
  useEffect(() => {
    if (
      !voiceStream ||
      !featureFlags.liveSpeechFeedback ||
      !featureFlags.speechFeedback
    )
      return;
    const capture = new LiveSpeech(featureFlags, setSpeech);
    voice.current = capture;
    void capture.start(voiceStream);
    return () => {
      capture.stop();
      if (voice.current === capture) voice.current = null;
    };
  }, [voiceStream, featureFlags]);
  useEffect(() => {
    if (!largeView) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLargeView(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [largeView]);
  useEffect(() => {
    if (mode !== "backend") return;
    const controller = new AbortController();
    let destination: string;
    try {
      destination = apiEndpoint(
        endpoint,
        window.location.protocol === "https:",
      );
    } catch {
      return;
    }
    request(destination, "/health/ready", controller.signal)
      .then(() => setHealth("Backend services ready."))
      .catch(() => {
        if (!controller.signal.aborted)
          setHealth(
            "Backend services are not ready. If analysis fails, your recording stays available locally.",
          );
      });
    return () => controller.abort();
  }, [mode, endpoint]);
  const start = async () => {
    if (busy.current) return;
    setError(null);
    if (!title.trim()) {
      setError("Give your recording a title.");
      document.getElementById("live-title")?.focus();
      return;
    }
    let destination = endpoint;
    try {
      if (mode === "backend")
        destination = apiEndpoint(
          endpoint,
          window.location.protocol === "https:",
        );
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const stream = getStream();
    if (!stream) {
      setError("Enable your camera before starting.");
      return;
    }
    busy.current = true;
    const config = {
      title: title.trim(),
      targetMs,
      mode,
      endpoint: destination,
      transcribe: mode === "backend" && transcribe,
      featureFlags: { ...featureFlags },
    };
    const recorder = new LiveRecorder(
      stream,
      config,
      createVideoTransport(config),
      (next) => {
        if (next.phase === "finishing") {
          pose.stop();
          captions.current?.stop();
          voice.current?.stop();
        }
        setProgress(next);
      },
      (recording) => {
        const poseEvents = pose
          .recordingEvents()
          .filter((event) => event.t_ms < recording.durationMs)
          .map((event) => ({
            ...event,
            duration_ms: Math.min(
              event.duration_ms,
              recording.durationMs - event.t_ms,
            ),
          }));
        save({
          ...recording,
          poseLog: pose.recordingBlob(),
          poseEvents,
          feedback: [
            ...mergeSpeechFeedback(
              recording.feedback,
              voice.current?.events ?? [],
            )
              .filter((item) => item.startMs < recording.durationMs)
              .map((item) => ({
                ...item,
                endMs: Math.min(item.endMs, recording.durationMs),
              })),
            ...poseEvents.map(poseFeedback),
          ].sort((a, b) => a.startMs - b.startMs),
        });
        router.push(`/live/${recording.id}/review`);
      },
      (timestamp) => {
        pose.beginRecording(timestamp, recorder.id);
        voice.current?.beginRecording(timestamp, recorder.id);
        if (mode === "backend" && transcribe && liveCaptions) {
          captions.current = new LiveCaptions((text, status) =>
            setCaption({ text, status }),
          );
          void captions.current.start(stream, destination);
        }
      },
    );
    owner.current = recorder;
    try {
      await recorder.start();
    } catch (e) {
      if (owner.current !== recorder) return;
      recorder.dispose();
      owner.current = null;
      busy.current = false;
      stopCamera();
      setProgress(null);
      setError(e instanceof Error ? e.message : "Recording could not start.");
    }
  };
  const cancel = () => {
    owner.current?.dispose();
    captions.current?.stop();
    voice.current?.stop();
    owner.current = null;
    busy.current = false;
    stopCamera();
    setProgress(null);
  };
  const evaluation =
    cameraStatus === "active" && pose.state?.phase === "running"
      ? pose.state.evaluation
      : null;
  const feedback = progress
    ? [
        ...mergeSpeechFeedback(progress.feedback, speech?.events ?? []),
        ...(pose.state?.evaluation?.events ?? []).map(poseFeedback),
      ].sort((a, b) => a.startMs - b.startMs)
    : [];
  const poseCue =
    showCues && pose.state?.phase === "running" && evaluation?.cue
      ? poseFeedback(evaluation.cue)
      : null;
  const speechEnabled =
    microphone &&
    featureFlags.liveSpeechFeedback &&
    featureFlags.speechFeedback;
  const voiceCue =
    showCues && speechEnabled && cameraStatus === "active" ? speech?.cue : null;
  const latest =
    voiceCue && (!poseCue || voiceCue.startMs >= poseCue.startMs)
      ? voiceCue
      : poseCue;
  return (
    <AppShell experience="live">
      <div
        className={`workspace live-workspace${largeView ? " live-workspace-large" : ""}`}
      >
        <div className="workspace-back">
          <nav className="studio-links" aria-label="Studio resources">
            <Link href="/sources">
              <FileText size={15} /> Sources
            </Link>
            <Link href="/demo">
              <Play size={15} /> Sample demo
            </Link>
          </nav>
          <LiveBadge mode={mode} />
        </div>
        <div className="workspace-heading">
          <div>
            <h1>Record your presentation</h1>
            <p>Enable your camera, check your framing, then start recording.</p>
          </div>
          <div className="session-time">
            <Clock3 size={18} />
            <strong>{time(progress?.elapsedMs ?? 0)}</strong>
            <span>
              {progress ? "recording time" : `${targetMs / 60000}-minute limit`}
            </span>
          </div>
        </div>
        {error && (
          <p className="status-error" role="alert">
            {error}
          </p>
        )}
        <div id="live-studio" className="studio-grid live-studio-grid">
          <div className="studio-main">
            <div className="live-control-bar">
              <fieldset className="live-analysis-choice" disabled={!!progress}>
                <div className="field">
                  <label htmlFor="live-source">Speech analysis</label>
                  <NativeSelect
                    id="live-source"
                    value={speechChoice}
                    onChange={(e) => {
                      stopCamera();
                      setMode(
                        e.target.value === "backend" ? "backend" : "local",
                      );
                      setFeatureFlags({
                        ...featureFlags,
                        liveSpeechFeedback: e.target.value !== "local",
                      });
                    }}
                  >
                    <option value="local">Off · gestures only</option>
                    <option value="live">Live · in browser</option>
                    <option value="backend">
                      Live + full backend analysis
                    </option>
                  </NativeSelect>
                </div>
              </fieldset>
              <p className="field-hint live-audio-hint">
                {mode === "backend"
                  ? "Live hints stay local. Full audio analysis runs on your server after stopping."
                  : microphone
                    ? "Camera and microphone stay in this browser. Voice hints work without a backend."
                    : "Camera only. Choose Live · in browser to enable microphone feedback."}
              </p>
              {!progress ? (
                cameraStatus === "active" && (
                  <>
                    <Button onClick={() => void start()}>
                      <Radio size={17} /> Start recording
                    </Button>
                    <Button variant="ghost" onClick={stopCamera}>
                      <CameraOff size={17} /> Turn camera off
                    </Button>
                  </>
                )
              ) : progress.phase === "connecting" ? (
                <Button variant="outline" onClick={cancel}>
                  Cancel connection
                </Button>
              ) : (
                <Button
                  disabled={progress.phase === "finishing"}
                  onClick={() => owner.current?.stop()}
                >
                  <Square size={14} fill="currentColor" />
                  {progress.phase === "finishing"
                    ? "Preparing video & feedback…"
                    : "Finish & review"}
                </Button>
              )}
              <div className="live-view-toolbar">
                <Button
                  variant="ghost"
                  aria-pressed={largeView}
                  aria-controls="live-studio"
                  onClick={() => setLargeView(!largeView)}
                >
                  {largeView ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                  {largeView ? "Standard view" : "Large view"}
                </Button>
                {largeView && progress && (
                  <strong className="live-view-time">
                    {time(progress?.elapsedMs ?? 0)}
                  </strong>
                )}
              </div>
            </div>
            <section
              className={`media-stage live-camera-stage${poseAlert ? " pose-alert" : ""}`}
              aria-label="Live camera preview"
            >
              <div className="stage-top">
                <span className="stage-status">
                  <span className="status-dot" />
                  {progress?.phase === "recording"
                    ? "Recording"
                    : progress?.phase === "connecting"
                      ? "Connecting to backend"
                      : progress?.phase === "finishing"
                        ? "Finishing recording"
                        : "Preview only"}
                </span>
                <span className="stage-demo">
                  {!microphone ? (
                    <>
                      <MicOff size={14} /> No audio
                    </>
                  ) : (
                    <>
                      <Mic size={14} /> Microphone audio
                    </>
                  )}
                </span>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={
                  cameraStatus === "active"
                    ? "camera-video"
                    : "camera-video hidden"
                }
                aria-label="Your local camera feed"
              />
              {cameraStatus === "active" &&
                pose.state?.phase === "running" &&
                (pose.state.latest || pose.state.hands.length > 0) && (
                  <PoseOverlay
                    sample={pose.state.latest}
                    image={pose.state.image}
                    largeView={largeView}
                    hands={pose.state.hands}
                    showHands={featureFlags.handTracking}
                  />
                )}
              {cameraStatus === "active" && (
                <span className="live-pose-status">
                  {pose.state?.phase === "error"
                    ? "Landmarks unavailable"
                    : pose.state?.phase === "running"
                      ? pose.state.latest
                        ? `Pose landmarks · ${featureFlags.handTracking ? `${pose.state.hands.length} hands` : "fingers off"} · local`
                        : "No pose in frame"
                      : pose.state?.phase === "stopped"
                        ? "Landmarks stopped"
                        : "Loading landmarks…"}
                </span>
              )}
              {cameraStatus === "active" &&
                poseDebug &&
                pose.state?.phase === "running" && (
                  <PoseDebug
                    sample={pose.state.latest}
                    active={evaluation?.cue?.payload.rule === "arms_crossed"}
                    evaluation={evaluation}
                    timing={pose.state.timing}
                  />
                )}
              {cameraStatus === "active" &&
                poseLab &&
                pose.state?.phase === "running" && (
                  <PoseDevMode
                    results={pose.state.tests}
                    handModel={pose.state.handModel}
                    handError={pose.state.handError}
                    hands={pose.state.hands.length}
                    backend={pose.state.backend}
                    view={poseView}
                  />
                )}
              {cameraStatus !== "active" && (
                <div className="stage-placeholder">
                  <span className="stage-camera">
                    <CameraOff size={32} />
                  </span>
                  <h2>Practice your presentation.</h2>
                  <p>
                    {cameraStatus === "pending"
                      ? "Choose Allow in your browser’s camera permission prompt."
                      : "First, enable your camera to see yourself here."}
                  </p>
                  {!progress && (
                    <Button
                      disabled={cameraStatus === "pending"}
                      onClick={() => void enable(microphone)}
                    >
                      <Camera size={18} />
                      {cameraStatus === "pending"
                        ? "Waiting for camera permission…"
                        : "Enable camera"}
                    </Button>
                  )}
                  <p>Nothing is recorded until you press Start recording.</p>
                </div>
              )}
              {progress?.phase === "recording" &&
                liveCaptions &&
                mode === "backend" &&
                transcribe && (
                  <div className="live-captions" aria-label="Live captions">
                    <small role="status">{caption.status}</small>
                    {caption.text && <p>{caption.text.slice(-500)}</p>}
                  </div>
                )}
              <div className="stage-bottom">
                <span>
                  <Video size={14} />
                  {progress?.phase === "recording"
                    ? "Recording saved locally"
                    : "Camera stays local until Start"}
                </span>
                <span>
                  {mode === "local"
                    ? microphone
                      ? "Local gestures + live voice feedback"
                      : "Local gesture observations"
                    : progress?.phase === "recording"
                      ? liveCaptions && transcribe
                        ? "Live captions · audio sent to server"
                        : "Audio analysis after stopping"
                      : "Backend mode"}
                </span>
              </div>
            </section>
            <p className="camera-message" role="status">
              {progress
                ? (progress.notice ??
                  (mode === "local"
                    ? "Video and gesture observations stay in this browser. Start each take with 3 seconds in a neutral position."
                    : `After stopping, your complete video and audio will be sent to ${endpoint} for audio analysis.`))
                : cameraCopy[cameraStatus]}
              {mode === "backend" && !progress && (
                <span className="recording-consent">
                  By starting, you agree to send your video and microphone audio
                  to <strong>{endpoint}</strong> after stopping.
                  {transcribe &&
                    liveCaptions &&
                    " Live captions also send microphone audio to this server during recording."}
                  {transcribe &&
                    " Whisper transcribes locally; no audio is sent to a cloud provider."}{" "}
                  The original is removed after processing; analysis results
                  remain stored.
                </span>
              )}
            </p>
            <details className="live-settings recording-settings">
              <summary>Recording options</summary>
              <fieldset disabled={!!progress}>
                <details className="connection-settings">
                  <summary>Title and duration</summary>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="live-title">Recording title</label>
                      <Input
                        id="live-title"
                        value={title}
                        maxLength={100}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="live-duration">Recording limit</label>
                      <NativeSelect
                        id="live-duration"
                        value={targetMs}
                        onChange={(e) => setTargetMs(Number(e.target.value))}
                      >
                        <option value={60000}>1 minute</option>
                        <option value={180000}>3 minutes</option>
                        <option value={300000}>5 minutes</option>
                      </NativeSelect>
                    </div>
                  </div>
                </details>
                {mode === "backend" && (
                  <div className="field">
                    <details className="connection-settings">
                      <summary>Server connection</summary>
                      <label htmlFor="live-endpoint">Backend API URL</label>
                      <Input
                        id="live-endpoint"
                        value={endpoint}
                        placeholder="http://localhost:8000"
                        onChange={(e) => setEndpoint(e.target.value)}
                      />
                    </details>
                    {health && (
                      <p className="field-hint" role="status">
                        {health}
                      </p>
                    )}
                    <label className="live-transcribe">
                      <input
                        type="checkbox"
                        checked={transcribe}
                        onChange={(e) => setTranscribe(e.target.checked)}
                      />
                      Create a transcript with local Whisper
                    </label>
                    {transcribe && (
                      <label className="live-transcribe">
                        <input
                          type="checkbox"
                          checked={liveCaptions}
                          onChange={(e) => setLiveCaptions(e.target.checked)}
                        />
                        Show live captions (preview)
                      </label>
                    )}
                    <p className="field-hint">
                      {transcribe
                        ? "Whisper transcribes on the backend. Review the transcript before checking claims against your sources."
                        : "Off: no speech recognition request is made. You can still import a timestamped transcript in the review."}
                    </p>
                  </div>
                )}
              </fieldset>
            </details>
            <FeatureOptions
              flags={featureFlags}
              change={setFeatureFlags}
              disabled={!!progress}
              speechEnabled={microphone}
            />
            <details className="live-settings gesture-settings">
              <summary>Gesture guide and calibration</summary>
              <GestureGuide evaluation={evaluation ?? null} />
              <Button
                variant="outline"
                disabled={
                  cameraStatus !== "active" ||
                  pose.state?.phase !== "running" ||
                  !!progress
                }
                onClick={pose.recalibrate}
              >
                Recalibrate neutral position
              </Button>
              <Link href="/gestures">Try synthetic walkthrough</Link>
            </details>
            <details
              className="live-settings studio-diagnostics"
              aria-label="Local pose capture"
            >
              <summary>Camera diagnostics</summary>
              <p role="status">
                {backendLabel(
                  pose.state?.backend ?? null,
                  pose.state?.handModel ?? null,
                )}
              </p>
              {fallbackLabel(pose.state?.backend ?? null) && (
                <p className="field-hint">
                  CPU fallback: {fallbackLabel(pose.state?.backend ?? null)}
                </p>
              )}
              <Button
                variant="outline"
                aria-pressed={poseLab}
                disabled={!!progress}
                onClick={() => {
                  setPoseLab(!poseLab);
                  setPoseDebug(false);
                }}
              >
                Pose lab
              </Button>
              {poseLab && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setPoseView(poseView === "coach" ? "status" : "coach")
                  }
                >
                  {poseView === "coach" ? "Status view" : "Coach view"}
                </Button>
              )}
              <Button
                variant="outline"
                aria-pressed={poseDebug}
                disabled={poseLab}
                onClick={() => {
                  setPoseDebug(!poseDebug);
                }}
              >
                <Eye size={18} />
                Pose debug
              </Button>

              <p>
                Landmarks appear automatically while the camera is on. No pose
                data is uploaded or used to score your presentation.
              </p>
              <p className="field-hint">
                Gesture and posture observations are prototype heuristics. Eye
                contact, emotion and presentation quality are not measured.
              </p>
              <div className="live-control-bar">
                {pose.state?.phase === "error" && (
                  <Button
                    variant="outline"
                    disabled={cameraStatus !== "active" || !!progress}
                    onClick={pose.start}
                  >
                    Retry landmarks
                  </Button>
                )}
                <PoseDownload blob={pose.download} />
              </div>
              <p role="status">
                {pose.state?.message ?? "Enable your camera to see landmarks."}
              </p>
              <p>
                {pose.state?.count ?? 0} pose samples ·{" "}
                {pose.state?.latest?.quality.legs_visible
                  ? "Legs visible"
                  : pose.state?.latest?.quality.thighs_visible
                    ? "Thighs visible"
                    : pose.state?.latest?.quality.thighs_available
                      ? "Thighs visible · lower legs estimated"
                      : "Legs not confirmed visible"}
              </p>
              <p className="field-hint">
                Turn the camera off to download preview JSONL. Starting a take
                resets the preview log and aligns timestamps to the video.
                Download preview samples first if you need them. Logs are
                released when you leave.
              </p>
              <div className="stream-summary">
                <span>
                  {progress?.chunksSent ?? 0} recording parts{" "}
                  {mode === "local"
                    ? "handled locally"
                    : "uploaded after stopping"}
                </span>
                <span>
                  {((progress?.bytesSent ?? 0) / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </details>
            <p className="local-recording-note">
              <ShieldCheck size={16} /> Video is held in browser memory for
              review. Download it before refreshing or leaving this workspace.
            </p>
          </div>
          {(cameraStatus === "active" || progress) && (
            <aside className="coaching-column">
              <section className="cue-panel">
                <div className="panel-title-row">
                  <h2>
                    <Eye size={18} /> Live feedback
                  </h2>
                  <span>Heuristic</span>
                </div>
                <div aria-live="polite" aria-atomic="true">
                  <p className="cue-message">
                    {!showCues
                      ? "Live hints hidden"
                      : (latest?.title ??
                        (pose.state?.phase === "error"
                          ? "Landmarks unavailable"
                          : evaluation?.phase === "ready"
                            ? "Ready for your next gesture"
                            : "Find your neutral position"))}
                  </p>
                  <p className="live-cue-detail">
                    {!showCues
                      ? "Observations still appear in your review."
                      : (latest?.action ??
                        evaluation?.message ??
                        "Enable your camera, then keep shoulders, hips and hands visible. Recording is optional for preview.")}
                  </p>
                </div>
                <div className="live-readiness" aria-label="Tracking status">
                  <p>
                    Pose:{" "}
                    {pose.state?.phase === "error"
                      ? "unavailable"
                      : (evaluation?.phase ?? "loading")}
                  </p>
                  {evaluation?.phase === "calibrating" && (
                    <progress
                      aria-label="Pose calibration"
                      max={1}
                      value={evaluation.calibrationProgress}
                    />
                  )}
                  <p>
                    {!featureFlags.handTracking
                      ? "Finger tracking off"
                      : pose.state?.handError
                        ? "Finger tracking unavailable"
                        : pose.state?.handModel
                          ? `Hands detected: ${pose.state.hands.length}`
                          : "Loading finger tracking…"}
                  </p>
                  {speechEnabled && (
                    <>
                      <p role="status">
                        {speech?.message ?? "Starting local voice feedback…"}
                      </p>
                      {speech?.phase === "calibrating" && (
                        <progress
                          aria-label="Voice calibration"
                          max={1}
                          value={speech.calibrationProgress}
                        />
                      )}
                      <meter
                        aria-label="Microphone level"
                        min={-100}
                        max={0}
                        value={speech?.levelDb ?? -100}
                      />
                    </>
                  )}
                </div>
                {latest && (
                  <span className="cue-caption">
                    {latest.category} · {time(latest.startMs)}–
                    {time(latest.endMs)}
                  </span>
                )}
                <label className="loop-control">
                  <input
                    type="checkbox"
                    checked={showCues}
                    onChange={(e) => setShowCues(e.target.checked)}
                  />{" "}
                  Show live hints
                </label>
              </section>
              <section className="panel live-events">
                <div className="panel-title-row">
                  <h2>Session observations</h2>
                  <span className="badge">{feedback.length}</span>
                </div>
                {feedback.length ? (
                  <div className="event-feed">
                    {feedback.toReversed().map((item) => (
                      <div key={item.id}>
                        <span className={`feedback-kind ${item.kind}`}>
                          {item.category} · {time(item.startMs)}
                        </span>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="live-empty">
                    <CheckCircle2 size={24} />
                    <p>No observations yet.</p>
                    <span>
                      Start a take to save observations for replay. No
                      observations does not imply a perfect performance.
                    </span>
                  </div>
                )}
              </section>
              {!!progress?.metrics.length && (
                <section className="panel live-events">
                  <h2>Backend metrics</h2>
                  <dl className="backend-metrics">
                    {progress.metrics.map((metric) => (
                      <div key={metric.id}>
                        <dt>{metric.label}</dt>
                        <dd>
                          {metric.value ?? "Not enough data"}{" "}
                          {metric.value !== null && metric.unit}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              <div className="stream-summary">
                <span>
                  {progress?.chunksSent ?? 0} recording parts{" "}
                  {mode === "local"
                    ? "handled locally"
                    : "uploaded after stopping"}
                </span>
                <span>
                  {((progress?.bytesSent ?? 0) / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </aside>
          )}
        </div>
        {Object.values(recordings).length > 0 && (
          <section className="recent-recordings">
            <h2>Recordings in this workspace</h2>
            {Object.values(recordings).map((recording) => (
              <Link href={`/live/${recording.id}/review`} key={recording.id}>
                <span>{recording.config.title}</span>
                <span>
                  {time(recording.durationMs)} · {recording.feedback.length}{" "}
                  moments
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}

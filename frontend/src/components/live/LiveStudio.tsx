"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock3,
  Eye,
  Maximize2,
  MessageCircle,
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
import { LiveRecorder } from "@/features/live/recorder";
import { createVideoTransport } from "@/features/live/transport";
import { apiEndpoint, request } from "@/features/live/analysis";
import type { LiveConfig, LiveProgress } from "@/features/live/contracts";
import { time } from "@/lib/utils";
import { usePoseCapture } from "@/features/pose/usePoseCapture";
import { PoseDownload } from "./PoseDownload";
import { PoseDevMode, type PoseView } from "./PoseDevMode";
import { poseFeedback } from "@/features/pose/testPoses";
import { CoachCue } from "./CoachCue";
import { PoseOverlay } from "./PoseOverlay";
import { LiveBadge } from "./shared";

const cameraCopy = {
  idle: "Camera off. Enable a preview to check your framing.",
  pending: "Waiting for camera permission. Nothing is being recorded or sent.",
  active: "Local camera preview. Recording starts only when you choose Start.",
  denied:
    "Camera permission was denied. Allow camera access in your browser, then try again.",
  unavailable:
    "No camera is available. Use HTTPS or localhost and connect a camera.",
  failed: "The camera could not start. Close other camera apps and try again.",
};
export function LiveStudio() {
  const router = useRouter();
  const { save, recordings } = useLiveSessions();
  const {
    status: cameraStatus,
    videoRef,
    enable,
    stop: stopCamera,
    getStream,
  } = useCameraPreview();
  const pose = usePoseCapture(videoRef, cameraStatus === "active");
  const [title, setTitle] = useState("My pitch rehearsal");
  const [targetMs, setTargetMs] = useState(180000);
  const [mode, setMode] = useState<LiveConfig["mode"]>("demo");
  const [endpoint, setEndpoint] = useState(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  );
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [largeView, setLargeView] = useState(false);
  const [poseLab, setPoseLab] = useState(false);
  const [poseView, setPoseView] = useState<PoseView>("coach");
  const poseAlert =
    poseLab &&
    pose.state?.phase === "running" &&
    poseFeedback(pose.state.tests).state === "alert";
  const owner = useRef<LiveRecorder | null>(null);
  const busy = useRef(false);
  useEffect(() => () => owner.current?.dispose(), []);
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
    };
    const recorder = new LiveRecorder(
      stream,
      config,
      createVideoTransport(config),
      (next) => {
        if (next.phase === "finishing") pose.stop();
        setProgress(next);
      },
      (recording) => {
        save({ ...recording, poseLog: pose.recordingBlob() });
        router.push(`/live/${recording.id}/review`);
      },
      pose.beginRecording,
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
    owner.current = null;
    busy.current = false;
    stopCamera();
    setProgress(null);
  };
  const latest = progress?.feedback.at(-1);
  return (
    <AppShell experience="live">
      <div
        className={`workspace live-workspace${largeView ? " live-workspace-large" : ""}`}
      >
        <div className="workspace-back">
          <Link href="/">
            <ArrowLeft size={15} /> Sample rehearsal
          </Link>
          <LiveBadge mode={mode} />
        </div>
        <div className="workspace-heading">
          <div>
            <h1>Your pitch. In the picture.</h1>
            <p>
              Record a take, get feedback, and revisit the moments that matter.
            </p>
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
        <div className="live-view-toolbar">
          <Button
            variant="outline"
            aria-pressed={largeView}
            aria-controls="live-studio"
            onClick={() => setLargeView(!largeView)}
          >
            {largeView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            {largeView ? "Standard view" : "Large view"}
          </Button>
          <Button
            variant="outline"
            aria-pressed={poseLab}
            onClick={() => setPoseLab(!poseLab)}
          >
            <Eye size={18} />
            Pose lab
          </Button>
          {poseLab && (
            <Button
              variant="outline"
              onClick={() =>
                setPoseView(poseView === "coach" ? "status" : "coach")
              }
            >
              {poseView === "coach" ? (
                <Eye size={18} />
              ) : (
                <MessageCircle size={18} />
              )}
              {poseView === "coach" ? "Status view" : "Coach view"}
            </Button>
          )}
          {largeView && (
            <strong className="live-view-time">
              {time(progress?.elapsedMs ?? 0)}
            </strong>
          )}
        </div>
        <div id="live-studio" className="studio-grid live-studio-grid">
          <div className="studio-main">
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
                  {mode === "demo" ? (
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
                pose.state.latest && (
                  <PoseOverlay
                    sample={pose.state.latest}
                    largeView={largeView}
                    hands={pose.state.hands}
                    showHands={poseLab}
                  />
                )}
              {cameraStatus === "active" && (
                <span className="live-pose-status">
                  {pose.state?.phase === "error"
                    ? "Landmarks unavailable"
                    : pose.state?.phase === "running"
                      ? pose.state.latest
                        ? "Pose landmarks · local"
                        : "No pose in frame"
                      : pose.state?.phase === "stopped"
                        ? "Landmarks stopped"
                        : "Loading landmarks…"}
                </span>
              )}
              {cameraStatus === "active" &&
                pose.state?.phase === "running" &&
                pose.state.armsCrossed &&
                !poseLab && (
                  <CoachCue message="Try uncrossing your arms!" />
                )}
              {cameraStatus === "active" &&
                poseLab &&
                pose.state?.phase === "running" && (
                  <PoseDevMode
                    results={pose.state.tests}
                    handModel={pose.state.handModel}
                    handError={pose.state.handError}
                    hands={pose.state.hands.length}
                    view={poseView}
                  />
                )}
              {cameraStatus !== "active" && (
                <div className="stage-placeholder">
                  <span className="stage-camera">
                    <CameraOff size={32} />
                  </span>
                  <h2>Step into your practice space.</h2>
                  <p>
                    Turn on your camera. Take a breath. Begin when you’re ready.
                  </p>
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
                  {mode === "demo"
                    ? "Scripted feedback · local landmarks"
                    : progress?.phase === "recording"
                      ? "Audio analysis after stopping"
                      : "Backend mode"}
                </span>
              </div>
            </section>
            <div className="live-control-bar">
              {!progress ? (
                <>
                  <Button
                    variant="outline"
                    disabled={cameraStatus === "pending"}
                    onClick={() =>
                      cameraStatus === "active"
                        ? stopCamera()
                        : void enable(mode === "backend")
                    }
                  >
                    {cameraStatus === "active" ? (
                      <CameraOff size={17} />
                    ) : (
                      <Camera size={17} />
                    )}
                    {cameraStatus === "active"
                      ? "Turn camera off"
                      : cameraStatus === "pending"
                        ? "Permission pending…"
                        : "Enable camera preview"}
                  </Button>
                  <Button
                    disabled={cameraStatus !== "active"}
                    onClick={() => void start()}
                  >
                    <Radio size={17} />
                    {mode === "demo"
                      ? "Record with demo feedback"
                      : "Record & analyze audio"}
                  </Button>
                </>
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
            </div>
            <p className="camera-message" role="status">
              {progress
                ? (progress.notice ??
                  (mode === "demo"
                    ? "Demo feedback is scripted. No video is uploaded. Pose landmarks and logging stay local."
                    : `After stopping, your complete video and audio will be sent to ${endpoint} for audio analysis.`))
                : cameraCopy[cameraStatus]}
            </p>
            <section
              className="panel live-settings"
              aria-label="Local pose capture"
            >
              <h2>Local pose capture</h2>
              <p>
                Landmarks appear automatically while the camera is on. No pose
                data is uploaded or used to score your presentation.
              </p>
              <p className="field-hint">
                Head angles and frontal-eye visibility are uncalibrated
                heuristics, not gaze tracking. Missing measurements stay empty.
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
                  : "Legs not confirmed visible"}
              </p>
              <p className="field-hint">
                Turn the camera off to download preview JSONL. Starting a take
                resets the preview log and aligns timestamps to the video.
                Download preview samples first if you need them. Logs are
                released when you leave.
              </p>
            </section>
            <section className="panel live-settings">
              <h2>Set up this take</h2>
              <fieldset disabled={!!progress}>
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
                <div className="field">
                  <label htmlFor="live-source">Feedback source</label>
                  <NativeSelect
                    id="live-source"
                    value={mode}
                    onChange={(e) => {
                      stopCamera();
                      setMode(e.target.value as LiveConfig["mode"]);
                    }}
                  >
                    <option value="demo">Local demo · scripted markers</option>
                    <option value="backend">
                      Backend · audio analysis after recording
                    </option>
                  </NativeSelect>
                </div>
                {mode === "backend" && (
                  <div className="field">
                    <label htmlFor="live-endpoint">Backend API URL</label>
                    <Input
                      id="live-endpoint"
                      value={endpoint}
                      placeholder="http://localhost:8000"
                      onChange={(e) => setEndpoint(e.target.value)}
                    />
                    {health && (
                      <p className="field-hint" role="status">
                        {health}
                      </p>
                    )}
                    <p className="field-hint">
                      By starting, you agree to send your complete video and
                      microphone audio to this destination after stopping. The
                      backend stores the upload for its analysis job and removes
                      the original after processing; analysis results remain
                      stored. No ASR or LLM request is made in this mode.
                    </p>
                  </div>
                )}
              </fieldset>
            </section>
            <p className="local-recording-note">
              <ShieldCheck size={16} /> Video is held in browser memory for
              review. Download it before refreshing or leaving this workspace.
            </p>
          </div>
          <aside className="coaching-column">
            <section className="cue-panel">
              <div className="panel-title-row">
                <h2>
                  <Eye size={18} />{" "}
                  {mode === "demo" ? "Live feedback" : "Audio feedback"}
                </h2>
                <span>{mode === "demo" ? "Scripted" : "From backend"}</span>
              </div>
              <div aria-live="polite" aria-atomic="true">
                <p className="cue-message">
                  {latest?.title ?? "One useful moment at a time."}
                </p>
                <p className="live-cue-detail">
                  {latest?.action ??
                    (mode === "demo"
                      ? "Start a recording to try example feedback markers and video replay."
                      : "Audio heuristics appear after you finish. Pose logging is separate from feedback. Automatic transcription is not connected yet.")}
                </p>
              </div>
              {latest && (
                <span className="cue-caption">
                  {latest.category} · {time(latest.startMs)}–
                  {time(latest.endMs)}
                </span>
              )}
            </section>
            <section className="panel live-events">
              <div className="panel-title-row">
                <h2>Session observations</h2>
                <span className="badge">{progress?.feedback.length ?? 0}</span>
              </div>
              {progress?.feedback.length ? (
                <div className="event-feed">
                  {progress.feedback.toReversed().map((item) => (
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
                    {mode === "demo"
                      ? "Three scripted markers arrive in the first 10 seconds."
                      : "No feedback does not imply a perfect performance."}
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
                {mode === "demo"
                  ? "handled locally"
                  : "uploaded after stopping"}
              </span>
              <span>
                {((progress?.bytesSent ?? 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </aside>
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

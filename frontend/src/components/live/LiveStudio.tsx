"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SessionStorageNotice } from "./shared";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Mic,
  Radio,
  Square,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { useCameraPreview } from "@/hooks/useCameraPreview";
import { useStageFullscreen } from "@/hooks/useStageFullscreen";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { LiveCaptions } from "@/features/live/captions";
import { speechCue } from "@/features/live/speech-feedback";
import { cueAppearance } from "@/features/live/cue-appearance";
import { feedbackEnabled } from "@/features/live/feature-flags";
import { upsertFeedback } from "@/features/live/protocol";
import { usePacedCue } from "@/features/live/cue-pacing";
import {
  LIVE_SPEECH,
  LiveSpeech,
  PAUSE,
  PAUSE_RATE,
  isPauseRate,
  mergeSpeechFeedback,
  type SpeechState,
} from "@/features/live/speech";
import { LiveRecorder } from "@/features/live/recorder";
import { createVideoTransport } from "@/features/live/transport";
import { apiEndpoint, request } from "@/features/live/analysis";
import type {
  LiveConfig,
  LiveProgress,
  LiveFeedback,
} from "@/features/live/contracts";
import { time } from "@/lib/utils";
import { usePoseCapture } from "@/features/pose/usePoseCapture";
import { poseFeedback } from "@/features/pose/feedback";
import { GestureGuide } from "./GestureGuide";
import { PoseDownload } from "./PoseDownload";
import { PoseDevMode } from "./PoseDevMode";
import { poseFeedback as labFeedback } from "@/features/pose/testPoses";
import { PoseDebug } from "./PoseDebug";
import { PoseOverlay } from "./PoseOverlay";
import { backendLabel, fallbackLabel } from "@/features/pose/backend";
import { PresentationSetup } from "./PresentationSetup";
import type { PresentationMode } from "@/features/questions/presentation";
import { collectionId } from "@/features/sources/api";
import "./record-accessibility.css";

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
  const { stageRef, toggleRef, fullscreen, toggle } = useStageFullscreen();
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
  const [presentationMode, setPresentationMode] =
    useState<PresentationMode>("startup");
  const [targetMs, setTargetMs] = useState(180000);
  const serverSpeech = useRef<LiveCaptions | null>(null);
  // Browser microphone measurements for the pause rules only: a pause shows
  // once it lasts 2 s, without waiting for speech and the server window. The
  // server keeps volume, pitch and pace, and its pauses reach the review.
  const pauseRate = useRef<LiveSpeech | null>(null);
  const browserPauses = useRef(false);
  const [pauseRateCue, setPauseRateCue] = useState<LiveFeedback | null>(null);
  const [pauseRateEvents, setPauseRateEvents] = useState<LiveFeedback[]>([]);
  const [pauseMonitor, setPauseMonitor] = useState<{
    phase: SpeechState["phase"];
    ready: boolean;
    count: number;
    levelDb: number | null;
  } | null>(null);
  const serverEvents = useRef<LiveFeedback[]>([]);
  const [serverFeedback, setServerFeedback] = useState<LiveFeedback[]>([]);
  const [serverStatus, setServerStatus] = useState("");
  const [serverCue, setServerCue] = useState<{
    event: LiveFeedback;
    untilMs: number;
  } | null>(null);
  const [transcribe, setTranscribe] = useState(true);
  const [liveCaptions, setLiveCaptions] = useState(true);
  const [caption, setCaption] = useState({ text: "", status: "" });
  const captions = useRef<LiveCaptions | null>(null);
  const [endpoint, setEndpoint] = useState(
    process.env.NEXT_PUBLIC_API_URL ?? "/api",
  );
  const [progress, setProgress] = useState<LiveProgress | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCues, setShowCues] = useState(true);
  const [poseDebug, setPoseDebug] = useState(false);
  const poseLab = featureFlags.devMode;
  const setPoseLab = (devMode: boolean) =>
    setFeatureFlags({ ...featureFlags, devMode });
  const poseAlert =
    poseLab &&
    pose.state?.phase === "running" &&
    labFeedback(pose.state.tests).state === "alert";
  const owner = useRef<LiveRecorder | null>(null);
  const busy = useRef(false);
  const startGeneration = useRef(0);
  useEffect(() => {
    if (cameraStatus === "active")
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [cameraStatus]);
  useEffect(
    () => () => {
      startGeneration.current++;
      owner.current?.dispose();
      captions.current?.stop();
      serverSpeech.current?.stop();
      pauseRate.current?.stop();
    },
    [],
  );
  useEffect(() => {
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
  }, [endpoint]);
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
    const generation = ++startGeneration.current;
    const config: LiveConfig = {
      presentationMode,
      sourceCollectionId: collectionId(),
      title: title.trim(),
      targetMs,
      mode: "backend",
      endpoint: destination,
      transcribe,
      featureFlags: { ...featureFlags, liveSpeechFeedback: true },
    };
    const liveTranscript =
      transcribe && liveCaptions
        ? new LiveCaptions(
            (text, status) => setCaption({ text, status }),
            undefined,
            true,
          )
        : null;
    captions.current = liveTranscript;
    if (liveTranscript) {
      setProgress({
        phase: "connecting",
        elapsedMs: 0,
        chunksSent: 0,
        bytesSent: 0,
        feedback: [],
        metrics: [],
        notice: "Connecting live transcription…",
      });
      await liveTranscript.start(stream, destination, performance.now(), true);
      await liveTranscript.ready(); // An unavailable stream falls back to local batch ASR.
      if (
        generation !== startGeneration.current ||
        captions.current !== liveTranscript
      )
        return; // Cancelled during connection setup.
    }
    const recorder = new LiveRecorder(
      stream,
      config,
      createVideoTransport(
        config,
        (durationMs) =>
          liveTranscript?.finish(durationMs) ?? Promise.resolve(null),
      ),
      (next) => {
        if (next.phase === "finishing") {
          pose.stop();
          serverSpeech.current?.stop();
          pauseRate.current?.stop();
          setPauseRateCue(null);
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
            ...mergeSpeechFeedback(recording.feedback, serverEvents.current)
              .filter((item) => item.startMs < recording.durationMs)
              .map((item) => ({
                ...item,
                endMs: Math.min(item.endMs, recording.durationMs),
              })),
            ...poseEvents.map(poseFeedback),
            // Not merged: a recorded pause must not hide the pause-rate window.
            // Single pauses come from the recorded analysis instead.
            ...(pauseRate.current?.events ?? [])
              .filter(
                (item) =>
                  isPauseRate(item) && item.startMs < recording.durationMs,
              )
              .map((item) => ({
                ...item,
                endMs: Math.min(item.endMs, recording.durationMs),
              })),
          ].sort((a, b) => a.startMs - b.startMs),
        });
        router.push(`/live/${recording.id}/review`);
      },
      (timestamp) => {
        pose.beginRecording(timestamp, recorder.id);
        serverEvents.current = [];
        setServerFeedback([]);
        setServerCue(null);
        if (featureFlags.speechFeedback) {
          const shown = new Map<string, number>();
          serverSpeech.current = new LiveCaptions(
            (_, status) => {
              setServerStatus(status);
              if (status.includes("unavailable")) setServerCue(null);
            },
            (events) => {
              const enabled = events.filter((event) =>
                feedbackEnabled(event.category, featureFlags),
              );
              for (const event of enabled)
                serverEvents.current = upsertFeedback(serverEvents.current, {
                  ...event,
                  id: `${recorder.id}-server-speech-${event.category}-${Math.round(event.startMs)}`,
                });
              setServerFeedback(serverEvents.current);
              const now = performance.now() - timestamp;
              // The browser already shows pauses as they happen.
              const event = speechCue(
                browserPauses.current
                  ? enabled.filter((item) => item.category !== "pause")
                  : enabled,
                now,
                shown,
              );
              setServerCue(event ? { event, untilMs: now + 5000 } : null);
            },
          );
          void serverSpeech.current.start(stream, destination, timestamp);
        }
        setPauseRateCue(null);
        setPauseRateEvents([]);
        setPauseMonitor(null);
        browserPauses.current = feedbackEnabled("pause", featureFlags);
        if (browserPauses.current) {
          const speech = new LiveSpeech(
            featureFlags,
            (state) => {
              // Fall back to the server's pause hints without a microphone.
              if (state.phase === "unavailable") browserPauses.current = false;
              setPauseRateCue((previous) =>
                previous?.id === state.cue?.id ? previous : state.cue,
              );
              const next = {
                phase: state.phase,
                ready: !!state.pauseReady,
                count: state.pauseCount ?? 0,
                levelDb:
                  state.levelDb === null ? null : Math.round(state.levelDb),
              };
              setPauseMonitor((previous) =>
                previous &&
                (Object.keys(next) as (keyof typeof next)[]).every(
                  (key) => previous[key] === next[key],
                )
                  ? previous
                  : next,
              );
              // Re-render only when an event starts or grows.
              setPauseRateEvents((previous) =>
                previous.length === state.events.length &&
                previous.at(-1)?.endMs === state.events.at(-1)?.endMs
                  ? previous
                  : state.events,
              );
            },
            new Set([PAUSE, PAUSE_RATE]),
          );
          pauseRate.current = speech;
          speech.beginRecording(timestamp, recorder.id);
          void speech.start(stream);
        }
        liveTranscript?.beginRecording();
      },
    );
    owner.current = recorder;
    try {
      await recorder.start();
    } catch (e) {
      if (owner.current !== recorder) return;
      recorder.dispose();
      serverSpeech.current?.stop();
      pauseRate.current?.stop();
      captions.current?.stop();
      owner.current = null;
      busy.current = false;
      stopCamera();
      setProgress(null);
      setError(e instanceof Error ? e.message : "Recording could not start.");
    }
  };
  const cancel = () => {
    startGeneration.current++;
    owner.current?.dispose();
    captions.current?.stop();
    serverSpeech.current?.stop();
    pauseRate.current?.stop();
    setPauseRateCue(null);
    owner.current = null;
    captions.current = null;
    busy.current = false;
    stopCamera();
    setProgress(null);
  };
  const evaluation =
    cameraStatus === "active" && pose.state?.phase === "running"
      ? pose.state.evaluation
      : null;
  const feedback =
    progress && progress.phase !== "connecting"
      ? [
          ...mergeSpeechFeedback(
            progress.feedback,
            featureFlags.speechFeedback ? serverFeedback : [],
          ),
          ...(pose.state?.evaluation?.events ?? []).map(poseFeedback),
          ...pauseRateEvents.filter(isPauseRate),
        ].sort((a, b) => a.startMs - b.startMs)
      : [];
  const poseCue =
    showCues && pose.state?.phase === "running" && evaluation?.cue
      ? poseFeedback(evaluation.cue)
      : null;
  const speechEnabled = featureFlags.speechFeedback;
  const voiceCue =
    showCues &&
    speechEnabled &&
    cameraStatus === "active" &&
    progress?.phase === "recording" &&
    serverCue &&
    progress.elapsedMs < serverCue.untilMs
      ? serverCue.event
      : null;
  const tooManyPauses =
    showCues && progress?.phase === "recording" ? pauseRateCue : null;
  // Browser pause hints win; a pause-rate start lies up to a window back.
  const latest = usePacedCue(
    tooManyPauses ??
      (voiceCue && (!poseCue || voiceCue.startMs >= poseCue.startMs)
        ? voiceCue
        : poseCue),
    showCues,
  );
  const appearance = cueAppearance(
    latest,
    !showCues
      ? "hidden"
      : pose.state?.phase === "error"
        ? "unavailable"
        : (evaluation?.phase ?? "framing"),
  );
  const FeedbackIcon = appearance.Icon;
  const largeView = cameraStatus === "active" || !!progress;
  return (
    <AppShell experience="live">
      <div
        className={`workspace live-workspace${largeView ? " live-workspace-large" : ""}`}
        data-feedback={appearance.tone}
      >
        {!largeView && (
          <div className="workspace-back">
            <Link href="/sources">
              <ArrowLeft size={16} aria-hidden /> Back to sources
            </Link>
          </div>
        )}
        <div className={largeView ? "sr-only" : "workspace-heading"}>
          <div>
            <h1>Record your presentation</h1>
            {!largeView && (
              <p>
                Check your camera and microphone, then start when you’re ready.
              </p>
            )}
          </div>
        </div>
        {error && (
          <p className="status-error" role="alert">
            {error}
          </p>
        )}
        <div id="live-studio" className="studio-grid live-studio-grid">
          <div className="studio-main">
            <div className="live-control-bar" aria-hidden={fullscreen}>
              {!progress && cameraStatus === "active" && (
                <Button asChild variant="outline">
                  <Link href="/sources">
                    <ArrowLeft size={16} aria-hidden /> Back to sources
                  </Link>
                </Button>
              )}
              <p className="field-hint live-audio-hint">
                Microphone audio is sent to your server for live feedback. The
                full take is uploaded after stopping.
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
                <a className="text-button" href="#live-options">
                  Options
                </a>
                {progress && (
                  <strong className="live-view-time">
                    {time(progress?.elapsedMs ?? 0)}
                  </strong>
                )}
              </div>
            </div>
            <section
              ref={stageRef}
              className={`media-stage live-camera-stage${poseAlert ? " pose-alert" : ""}${fullscreen ? " recording-fullscreen" : ""}`}
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
                <div className="stage-view-actions">
                  {fullscreen && progress && (
                    <strong className="fullscreen-time">
                      {time(progress.elapsedMs)}
                    </strong>
                  )}
                  <span className="stage-demo">
                    <Mic size={14} /> Microphone audio
                  </span>
                  {(cameraStatus === "active" || fullscreen) && (
                    <Button
                      ref={toggleRef}
                      variant="ghost"
                      size="sm"
                      aria-label={
                        fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      aria-pressed={fullscreen}
                      onClick={() => void toggle()}
                    >
                      {fullscreen ? (
                        <Minimize2 size={18} />
                      ) : (
                        <Maximize2 size={18} />
                      )}
                      {fullscreen ? "Exit fullscreen" : "Fullscreen"}
                    </Button>
                  )}
                </div>
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
                    largeView
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
                  />
                )}
              {cameraStatus !== "active" && (
                <div className="stage-placeholder">
                  <span className="stage-camera">
                    <Video size={30} strokeWidth={1.5} />
                  </span>
                  <h2>Practice your presentation.</h2>
                  <p>
                    {cameraStatus === "pending"
                      ? "Choose Allow in your browser’s camera permission prompt."
                      : "First, enable your camera to see yourself here."}
                  </p>
                  {!progress && !fullscreen && (
                    <Button
                      disabled={cameraStatus === "pending"}
                      onClick={() => void enable(true)}
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
                transcribe && (
                  <div className="live-captions" aria-label="Live captions">
                    <small role="status">{caption.status}</small>
                    {caption.text && <p>{caption.text.slice(-500)}</p>}
                  </div>
                )}
              {fullscreen && (
                <div className="fullscreen-cue-rail">
                  <div
                    className="fullscreen-cue"
                    data-feedback={appearance.tone}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    title={
                      showCues
                        ? (latest?.action ??
                          evaluation?.message ??
                          appearance.label)
                        : "Observations still appear in your review."
                    }
                  >
                    <span className="fullscreen-cue-symbol" aria-hidden="true">
                      <FeedbackIcon size={36} strokeWidth={1.7} />
                    </span>
                    <span className="fullscreen-cue-copy">
                      <small>
                        {latest && showCues
                          ? `${appearance.label} · Heuristic`
                          : "Live feedback · Heuristic"}
                      </small>
                      <strong>
                        {showCues && latest ? latest.title : appearance.label}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
              <div className="stage-bottom">
                {fullscreen ? (
                  <div className="fullscreen-controls">
                    {error && (
                      <p className="fullscreen-notice" role="alert">
                        {error}
                      </p>
                    )}
                    {!progress && (
                      <p className="fullscreen-consent">
                        Starting sends microphone audio to your server live and
                        uploads the full take after stopping.
                        {transcribe &&
                          liveCaptions &&
                          " Live transcription uses Deepgram EU."}
                      </p>
                    )}
                    {(progress?.notice ||
                      serverStatus.includes("unavailable")) && (
                      <p className="fullscreen-notice" role="status">
                        {progress?.notice || serverStatus}
                      </p>
                    )}
                    <div className="fullscreen-control-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={showCues}
                        onClick={() => setShowCues(!showCues)}
                      >
                        {showCues ? <Eye size={18} /> : <EyeOff size={18} />}
                        {showCues ? "Hide hints" : "Show hints"}
                      </Button>
                      {!progress && cameraStatus !== "active" ? (
                        <Button
                          disabled={cameraStatus === "pending"}
                          onClick={() => void enable(true)}
                        >
                          <Camera size={18} /> Enable camera
                        </Button>
                      ) : !progress ? (
                        <Button onClick={() => void start()}>
                          <Radio size={17} /> Start recording
                        </Button>
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
                  </div>
                ) : (
                  <>
                    <span>
                      <Video size={14} />
                      {progress?.phase === "recording"
                        ? "Recording saved locally"
                        : "Camera stays local until Start"}
                    </span>
                    <span>
                      {progress?.phase === "recording"
                        ? liveCaptions && transcribe
                          ? "Live speech feedback + captions"
                          : "Live speech feedback · audio sent to server"
                        : "Live + full backend analysis"}
                    </span>
                  </>
                )}
              </div>
            </section>
            <p
              className="camera-message"
              role="status"
              aria-hidden={fullscreen}
            >
              {progress
                ? (progress.notice ??
                  `${serverStatus} Speak normally for the first 3 seconds. Full analysis follows after stopping.`)
                : cameraCopy[cameraStatus]}
              {!progress && (
                <span className="recording-consent">
                  By starting, you agree to send your video and microphone audio
                  to <strong>{endpoint}</strong> after stopping. Microphone
                  audio is also sent during recording for live speech feedback
                  when enabled.
                  {transcribe &&
                    liveCaptions &&
                    " Live transcription streams microphone audio through this server to Deepgram’s EU endpoint during recording."}
                  {transcribe &&
                    " If live transcription is off or fails, Whisper transcribes locally after stopping."}{" "}
                  The original is removed after processing; analysis results
                  remain stored.
                </span>
              )}
            </p>
          </div>
          {(cameraStatus === "active" || progress) && (
            <aside className="coaching-column" aria-hidden={fullscreen}>
              <section className="cue-panel" data-feedback={appearance.tone}>
                <div className="panel-title-row">
                  <h2>
                    <Eye size={18} /> Live feedback
                  </h2>
                  <span>Heuristic</span>
                </div>
                <div aria-live="polite" aria-atomic="true">
                  <div className="live-cue-status">
                    <FeedbackIcon
                      className="live-cue-icon"
                      aria-hidden="true"
                      strokeWidth={1.5}
                    />
                    <span className="live-cue-label">{appearance.label}</span>
                  </div>
                  {/* Ready without a hint stays quiet; the status label is enough. */}
                  {(!showCues ||
                    latest ||
                    pose.state?.phase === "error" ||
                    evaluation?.phase !== "ready") && (
                    <>
                      <p className="cue-message">
                        {!showCues
                          ? "Live hints hidden"
                          : (latest?.title ??
                            (pose.state?.phase === "error"
                              ? "Landmarks unavailable"
                              : "Find your neutral position"))}
                      </p>
                      <p className="live-cue-detail">
                        {!showCues
                          ? "Observations still appear in your review."
                          : (latest?.action ??
                            evaluation?.message ??
                            "Enable your camera, then keep shoulders, hips and hands visible. Recording is optional for preview.")}
                      </p>
                    </>
                  )}
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
                    <p role="status">
                      {serverStatus ||
                        "Live voice feedback starts with recording."}
                    </p>
                  )}
                  {progress?.phase === "recording" && pauseMonitor && (
                    <p role="status">
                      {pauseMonitor.phase === "unavailable"
                        ? "Pause counting unavailable"
                        : pauseMonitor.ready
                          ? `Pauses in the last ${LIVE_SPEECH.pauseRateWindowMs / 1000} s: ${pauseMonitor.count} (hint above ${LIVE_SPEECH.pauseRateMax})`
                          : `Pause counting: speak normally to start${pauseMonitor.levelDb === null ? "" : ` (mic ${pauseMonitor.levelDb} dB)`}`}
                    </p>
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
            </aside>
          )}
        </div>
        <section
          id="live-options"
          className="live-options"
          aria-label="Studio options"
          aria-hidden={fullscreen}
          tabIndex={-1}
        >
          <PresentationSetup
            mode={presentationMode}
            onMode={setPresentationMode}
            endpoint={endpoint}
            disabled={!!progress}
            prepared={transcribe}
            onPrepare={() => {
              stopCamera();
              setTranscribe(true);
              setLiveCaptions(true);
            }}
          />
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
                  Create a transcript
                </label>
                {transcribe && (
                  <label className="live-transcribe">
                    <input
                      type="checkbox"
                      checked={liveCaptions}
                      onChange={(e) => setLiveCaptions(e.target.checked)}
                    />
                    Stream transcription with Deepgram (EU)
                  </label>
                )}
                <p className="field-hint">
                  {transcribe
                    ? "A completed live transcript is reused in your review. Local Whisper is the fallback. Review recognition errors before checking claims against your sources."
                    : "Off: no speech recognition request is made. You can still import a timestamped transcript in the review."}
                </p>
              </div>
            </fieldset>
          </details>
          <p className="field-hint">
            Pose model, finger tracking and feedback types are set in{" "}
            <Link href="/admin">Admin</Link>.
          </p>
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
              Download preview samples first if you need them. Logs are released
              when you leave.
            </p>
            <div className="stream-summary">
              <span>
                {progress?.chunksSent ?? 0} recording parts uploaded after
                stopping
              </span>
              <span>
                {((progress?.bytesSent ?? 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </details>
          <SessionStorageNotice />
          <details className="live-settings">
            <summary>Session observations</summary>
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
                {progress?.chunksSent ?? 0} recording parts uploaded after
                stopping
              </span>
              <span>
                {((progress?.bytesSent ?? 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </details>
        </section>
        {Object.values(recordings).length > 0 && (
          <section className="recent-recordings">
            <h2>Past sessions</h2>
            {Object.values(recordings)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((recording) => (
                <Link href={`/live/${recording.id}/review`} key={recording.id}>
                  <span>{recording.config.title}</span>
                  <span>
                    {new Date(recording.createdAt).toLocaleDateString()} ·{" "}
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

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CirclePause,
  CirclePlay,
  Clock3,
  Maximize2,
  MicOff,
  Play,
  ShieldCheck,
  Square,
  Video,
} from "lucide-react";
import { AppShell, DemoBadge } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useCoachSession } from "@/features/coach/useCoachSession";
import { useCameraPreview } from "@/hooks/useCameraPreview";
import { audienceNames, time } from "@/lib/utils";
import { CoachingPanel } from "./CoachingPanel";
import { TranscriptPanel } from "./TranscriptPanel";
import { JudgePanel } from "@/components/judge/JudgePanel";
import { DemoControls } from "@/components/demo/DemoControls";

const phaseLabels = {
  preflight: "Ready when you are",
  countdown: "Get ready",
  presenting: "Session running",
  judge_thinking: "Judge is thinking",
  judge_question: "Your question",
  answering: "Your answer",
  report_pending: "Preparing review",
  review: "Practice complete",
};
const cameraMessages = {
  idle: "Your camera is off",
  pending: "Waiting for camera permission. You can continue without it.",
  active: "Local preview only · not recorded or analyzed",
  denied: "Camera permission was denied. The demo works without it.",
  unavailable: "No camera is available here. Continue with the demo preview.",
  failed: "The camera could not start. Try again or use the demo preview.",
};
export function PracticeStudio() {
  const { state, send, demo, pending, error, restored, storageWarning } =
    useCoachSession();
  const router = useRouter();
  const {
    status: cameraStatus,
    videoRef,
    stop: stopCamera,
    enable: enableCamera,
  } = useCameraPreview();
  useEffect(() => {
    if (state.phase === "review")
      router.replace(`/practice/${state.ref.sessionId}/review`);
  }, [state.phase, state.ref.sessionId, router]);
  const qa = [
    "judge_thinking",
    "judge_question",
    "answering",
    "report_pending",
  ].includes(state.phase);
  const duration = state.retryTarget ? 30000 : state.config.targetDurationMs;
  const blocked =
    pending || state.isPaused || restored || state.connection !== "connected";
  return (
    <AppShell>
      <div className="workspace">
        <div className="workspace-back">
          <Link href="/demo">
            <ArrowLeft size={15} /> Start new practice
          </Link>
          <DemoBadge />
        </div>
        <div className="workspace-heading">
          <div>
            <h1>
              {state.retryTarget
                ? "A little clearer, this time."
                : state.config.title}
            </h1>
            <p>
              {audienceNames[state.config.audience]} <span>·</span>{" "}
              {state.config.mode === "coach" ? "Coach mode" : "Simulation mode"}{" "}
              <span>·</span>{" "}
              {state.retryTarget
                ? "30-second answer retry"
                : `${duration / 60000}-minute pitch`}
            </p>
          </div>
          <div className="session-time">
            <Clock3 size={18} />
            <strong>
              {time(
                duration -
                  (state.retryTarget ? state.answerMs : state.presentationMs),
              )}
            </strong>
            <span>
              {state.retryTarget ? "answer target" : "pitch remaining"}
            </span>
          </div>
        </div>
        <SessionNotice />
        {storageWarning && (
          <p className="status-warning">
            Browser storage is unavailable. This practice works, but refreshing
            will lose it.
          </p>
        )}
        {restored && (
          <div className="status-warning">
            <strong>This attempt was interrupted.</strong>
            <p>
              Your setup and completed reports were restored. The live attempt
              was not. Restart to replay the sample safely.
            </p>
            <Button
              variant="outline"
              onClick={() => void demo("reset")}
              disabled={pending}
            >
              Restart interrupted attempt
            </Button>
          </div>
        )}
        {!restored && state.connection === "interrupted" && (
          <div className="status-warning" role="status">
            <strong>Demo connection interrupted.</strong>
            <p>Your transcript and place in the sample are preserved.</p>
            <Button variant="outline" onClick={() => void demo("recover")}>
              Resume session
            </Button>
          </div>
        )}
        {error && (
          <div className="status-error" role="alert">
            {error}
          </div>
        )}
        <div className="studio-grid">
          <div className="studio-main">
            {qa ? (
              <JudgePanel key={state.question?.turnId ?? state.phase} />
            ) : (
              <>
                <section className="media-stage" aria-label="Practice preview">
                  <div className="stage-top">
                    <span className="stage-status">
                      <span className="status-dot" />{" "}
                      {state.isPaused
                        ? "Session paused"
                        : phaseLabels[state.phase]}
                    </span>
                    <span className="stage-demo">
                      <Video size={14} />{" "}
                      {cameraStatus === "active"
                        ? "Camera preview"
                        : "Demo preview"}
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
                    aria-label="Local camera preview, not recorded"
                  />
                  {cameraStatus !== "active" && (
                    <div className="stage-placeholder">
                      <span className="stage-camera">
                        <CameraOff size={32} strokeWidth={1.2} />
                      </span>
                      <h2>
                        {state.phase === "preflight"
                          ? "The floor is yours."
                          : state.isPaused
                            ? "Take your time."
                            : "Give your idea a voice."}
                      </h2>
                      <p>
                        {state.phase === "preflight"
                          ? "Get comfortable. This is your space to practice."
                          : "The prepared sample is playing. No audio is captured."}
                      </p>
                    </div>
                  )}
                  {state.phase === "countdown" && (
                    <div className="countdown-overlay" aria-live="polite">
                      <span>
                        {Math.max(
                          1,
                          3 -
                            Math.floor(
                              (state.atMs - state.phaseStartedMs) / 1000,
                            ),
                        )}
                      </span>
                      <p>One breath. Then begin.</p>
                    </div>
                  )}
                  <div className="stage-bottom">
                    <span>
                      <MicOff size={14} /> Microphone off
                    </span>
                    <span>
                      {cameraStatus === "active"
                        ? "Preview ≠ sample analysis"
                        : "No recording"}
                    </span>
                    <Tooltip text="Expand the practice stage">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Expand preview"
                        onClick={(e) => {
                          const stage = e.currentTarget.closest(".media-stage");
                          if (stage?.requestFullscreen)
                            void stage.requestFullscreen().catch(() => {});
                        }}
                      >
                        <Maximize2 size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </section>
                {state.phase === "preflight" ? (
                  <section className="preflight panel">
                    <div className="preflight-title">
                      <Check size={18} />
                      <h2>
                        {state.retryTarget
                          ? "Answer the evidence question in 30 seconds"
                          : "Ready for a low-pressure rehearsal?"}
                      </h2>
                    </div>
                    <p className="muted">
                      {state.retryTarget
                        ? state.retryTarget.finding.nextAction
                        : "The demo works without a camera. Turn yours on only if you’d like a local preview."}
                    </p>
                    <div className="preflight-actions">
                      <Button
                        disabled={blocked}
                        onClick={() => {
                          stopCamera();
                          void send({ type: "start" });
                        }}
                      >
                        Continue with demo preview <ArrowRight size={17} />
                      </Button>
                      {cameraStatus === "active" ? (
                        <Button
                          variant="outline"
                          disabled={blocked}
                          onClick={() => void send({ type: "start" })}
                        >
                          Start with camera
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled={cameraStatus === "pending"}
                          onClick={() => void enableCamera()}
                        >
                          <Camera size={17} />{" "}
                          {cameraStatus === "pending"
                            ? "Permission pending…"
                            : "Enable camera preview"}
                        </Button>
                      )}
                    </div>
                    <p className="camera-message" role="status">
                      {cameraMessages[cameraStatus]}
                    </p>
                  </section>
                ) : (
                  <div className="practice-control-bar">
                    <span className="muted small">
                      <ShieldCheck size={14} /> Simulated session · no recording
                    </span>
                    <div>
                      <Button
                        variant="outline"
                        disabled={
                          pending ||
                          restored ||
                          state.connection !== "connected"
                        }
                        onClick={() =>
                          void send({
                            type: state.isPaused ? "resume" : "pause",
                          })
                        }
                      >
                        {state.isPaused ? (
                          <CirclePlay size={18} />
                        ) : (
                          <CirclePause size={18} />
                        )}
                        {state.isPaused ? "Resume" : "Pause"}
                      </Button>
                      <Button
                        disabled={blocked || state.phase !== "presenting"}
                        onClick={() => void send({ type: "finish_pitch" })}
                      >
                        <Square size={13} fill="currentColor" /> End pitch
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            <div id="studio-transcript">
              <TranscriptPanel />
            </div>
          </div>
          <CoachingPanel />
        </div>
        {qa && (
          <div className="qa-pause">
            <Button
              variant="outline"
              disabled={pending || restored || state.connection !== "connected"}
              onClick={() =>
                void send({ type: state.isPaused ? "resume" : "pause" })
              }
            >
              {state.isPaused ? <Play size={15} /> : <CirclePause size={15} />}
              {state.isPaused ? "Resume" : "Pause"}
            </Button>
          </div>
        )}
        <DemoControls />
      </div>
    </AppShell>
  );
}
function SessionNotice() {
  const { state } = useCoachSession();
  return (
    <details className="context-disclosure">
      <summary>
        Pitch context <span className="muted">{state.config.title}</span>
      </summary>
      <p>{state.config.context}</p>
      <p className="small muted">
        Focus: {state.config.criteria.join(" · ") || "General rehearsal"}.
        Analysis follows the prepared Viva scenario, including for custom
        pitches.
      </p>
    </details>
  );
}

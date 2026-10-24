"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import type { LiveConfig, LiveFeedback } from "@/features/live/contracts";
import { time } from "@/lib/utils";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
export function SessionStorageNotice() {
  const { loaded, saving, storageError } = useLiveSessions();
  return (
    <p className={storageError ? "status-warning" : "field-hint"} role="status">
      {storageError ??
        (!loaded
          ? "Loading saved sessions…"
          : saving
            ? "Saving session in this browser… Keep this tab open until saving finishes."
            : "Sessions are saved in this browser, including video and feedback. Clearing browser data removes them; download important videos as a backup.")}
    </p>
  );
}
export function LiveBadge({ mode }: { mode: LiveConfig["mode"] }) {
  return (
    <span className={`demo-badge ${mode === "backend" ? "backend-badge" : ""}`}>
      <Radio size={13} />
      {mode === "local" ? "Local feedback" : "Local gestures + backend audio"}
    </span>
  );
}
export function MissingRecording() {
  const { loaded, storageError } = useLiveSessions();
  return (
    <AppShell experience="live">
      <div className="empty-state panel">
        <h1>
          {!loaded
            ? "Loading saved session…"
            : "This recording isn’t available in this browser."}
        </h1>
        <p role="status">
          {storageError ??
            (!loaded
              ? "Restoring your video and feedback."
              : "Open it in the browser where it was recorded. Deleted sessions and cleared browser data cannot be restored here.")}
        </p>
        <Button asChild>
          <Link href="/live">
            Open camera studio <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
export function LiveNav({
  sessionId,
  active,
  mode,
}: {
  sessionId: string;
  active: "review" | "moments";
  mode: LiveConfig["mode"];
}) {
  return (
    <>
      <div className="workspace-back">
        <Link href="/live">
          <ArrowLeft size={15} /> Camera studio
        </Link>
        <LiveBadge mode={mode} />
      </div>
      <nav className="live-tabs" aria-label="Recording views">
        <Link
          href={`/live/${sessionId}/review`}
          aria-current={active === "review" ? "page" : undefined}
        >
          Stats &amp; playback
        </Link>
        <Link
          href={`/live/${sessionId}/moments`}
          aria-current={active === "moments" ? "page" : undefined}
        >
          Feedback moments
        </Link>
        <Link href={`/live/${sessionId}/analysis`}>
          Analyse &amp; Zeitverlauf
        </Link>
      </nav>
    </>
  );
}
export function FeedbackMoment({
  feedback,
  selected,
  onClick,
}: {
  feedback: LiveFeedback;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`feedback-moment ${selected ? "selected" : ""}`}
      aria-pressed={!!selected}
      onClick={onClick}
    >
      <div className="finding-top">
        <span className={`feedback-kind ${feedback.kind}`}>
          {feedback.kind === "observation"
            ? "Observed"
            : feedback.kind === "positive"
              ? "Keep"
              : feedback.kind === "attention"
                ? "Check"
                : "Try"}{" "}
          · {feedback.category}
        </span>
        <span className="timestamp">
          {time(feedback.startMs)}–{time(feedback.endMs)}
        </span>
      </div>
      <strong>{feedback.title}</strong>
      <p>{feedback.detail}</p>
      <span className="moment-link">
        Rewatch this section <ArrowRight size={13} />
      </span>
    </button>
  );
}

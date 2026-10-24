"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical, Radio } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import type { LiveConfig, LiveFeedback } from "@/features/live/contracts";
import { time } from "@/lib/utils";
export function LiveBadge({ mode }: { mode: LiveConfig["mode"] }) {
  return (
    <span className={`demo-badge ${mode === "backend" ? "backend-badge" : ""}`}>
      {mode === "demo" ? <FlaskConical size={13} /> : <Radio size={13} />}
      {mode === "demo" ? "Scripted demo feedback" : "Backend feedback"}
    </span>
  );
}
export function MissingRecording() {
  return (
    <AppShell experience="live" step={2}>
      <div className="empty-state panel">
        <h1>This recording isn’t in this workspace.</h1>
        <p>
          Video stays in browser memory. Refreshing or leaving the live
          workspace releases it. Start a new session to record again.
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
          {feedback.kind === "positive"
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

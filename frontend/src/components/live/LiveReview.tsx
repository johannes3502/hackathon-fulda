"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  MessageSquare,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import type { LiveFeedback } from "@/features/live/contracts";
import { time } from "@/lib/utils";
import { FeedbackMoment, LiveNav, MissingRecording } from "./shared";
import { TranscriptAnalysis } from "./TranscriptAnalysis";
import { VideoPlayback } from "./VideoPlayback";

export function LiveReview({ sessionId }: { sessionId: string }) {
  const { recordings } = useLiveSessions();
  const recording = recordings[sessionId];
  const [selected, setSelected] = useState<LiveFeedback | null>(null);
  if (!recording) return <MissingRecording />;
  const groups = [
    ...new Set(recording.feedback.map((item) => item.category)),
  ].map((category) => ({
    category,
    count: recording.feedback.filter((item) => item.category === category)
      .length,
  }));
  const next =
    recording.feedback.find((item) => item.kind === "attention") ??
    recording.feedback.find((item) => item.kind === "suggestion");
  return (
    <AppShell experience="live" step={2}>
      <div className="workspace live-review">
        <LiveNav
          sessionId={sessionId}
          active="review"
          mode={recording.config.mode}
        />
        <div className="workspace-heading">
          <div>
            <h1>A closer look at your take.</h1>
            <p>
              {recording.config.title} ·{" "}
              {recording.completion === "complete"
                ? "Recording complete"
                : "Interrupted recording"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/live">
              Record another take <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        {recording.notice && (
          <p className="status-warning" role="status">
            {recording.notice}
          </p>
        )}
        {recording.config.mode === "demo" && (
          <p className="live-demo-notice">
            <strong>Demo feedback, real recording.</strong> These markers are
            scripted examples, not detections or an assessment of how you
            performed.
          </p>
        )}
        <div className="recording-stats">
          <div>
            <Clock3 size={19} />
            <strong>{time(recording.durationMs)}</strong>
            <span>Recorded time</span>
          </div>
          <div>
            <MessageSquare size={19} />
            <strong>{recording.feedback.length}</strong>
            <span>
              {recording.config.mode === "demo"
                ? "Demo markers"
                : "Feedback moments"}
            </span>
          </div>
          <div>
            <CheckCircle2 size={19} />
            <strong>
              {
                recording.feedback.filter((item) => item.kind === "positive")
                  .length
              }
            </strong>
            <span>
              {recording.config.mode === "demo"
                ? "Positive examples"
                : "Positive observations"}
            </span>
          </div>
          <div>
            <Video size={19} />
            <strong>
              {(recording.video.size / 1024 / 1024).toFixed(1)}
              <small> MB</small>
            </strong>
            <span>Local video size</span>
          </div>
        </div>
        <div className="live-review-grid">
          <div>
            <VideoPlayback
              recording={recording}
              selected={selected}
              onSelect={(item) => setSelected({ ...item })}
            />
            <div className="recording-retention">
              <Download size={16} />
              <p>
                Download this take before leaving the live workspace or
                refreshing. The full recording is held in browser memory
                {recording.config.mode === "backend"
                  ? "; a copy was submitted for temporary backend analysis"
                  : " and has not been uploaded"}
                .
              </p>
            </div>
            {selected && (
              <section className="selected-feedback panel">
                <span className={`feedback-kind ${selected.kind}`}>
                  {selected.category} · {time(selected.startMs)}
                </span>
                <h2>{selected.title}</h2>
                <p>{selected.detail}</p>
                <strong>Try this</strong>
                <p>{selected.action}</p>
              </section>
            )}
          </div>
          <aside>
            <section className="panel recording-breakdown">
              <h2>What came up?</h2>
              <p className="muted small">
                Feedback frequency, not a performance score.
              </p>
              {groups.length ? (
                <div className="category-bars">
                  {groups.map((group) => (
                    <div key={group.category}>
                      <div>
                        <span>{group.category}</span>
                        <strong>{group.count}</strong>
                      </div>
                      <div className="category-bar">
                        <span
                          style={{
                            width: `${(group.count / Math.max(...groups.map((g) => g.count))) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-findings">
                  No feedback arrived. You can still watch your recording and
                  reflect on it.
                </p>
              )}
              {!!recording.metrics.length && (
                <>
                  <h3>Latest backend measurements</h3>
                  <dl className="backend-metrics">
                    {recording.metrics.map((metric) => (
                      <div key={metric.id}>
                        <dt>{metric.label}</dt>
                        <dd>
                          {metric.value ?? "Not enough data"}{" "}
                          {metric.value !== null && metric.unit}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <p className="field-hint">
                {recording.chunksSent} recording uploads/parts{" "}
                {recording.config.mode === "demo"
                  ? "processed by the local demo"
                  : "sent to the backend"}
                . {(recording.bytesSent / 1024 / 1024).toFixed(1)} MB{" "}
                {recording.config.mode === "demo" ? "kept local" : "sent"}.
              </p>
            </section>
            <section className="next-review-step">
              <h2>
                {next ? "Start with one moment." : "Watch it with fresh eyes."}
              </h2>
              <p>
                {next?.action ??
                  "Notice what felt clear and choose one thing to practice in your next take."}
              </p>
              <Button asChild>
                <Link href={`/live/${sessionId}/moments`}>
                  Rewatch feedback sections <ArrowRight size={16} />
                </Link>
              </Button>
            </section>
          </aside>
        </div>
        {recording.config.mode === "backend" && (
          <TranscriptAnalysis recording={recording} />
        )}
        <section className="review-moments">
          <div className="panel-title-row">
            <h2>Moments to revisit</h2>
            <Link href={`/live/${sessionId}/moments`} className="text-button">
              View all moments
            </Link>
          </div>
          {recording.feedback.length ? (
            <div className="moment-grid">
              {recording.feedback.slice(0, 3).map((feedback) => (
                <FeedbackMoment
                  key={feedback.id}
                  feedback={feedback}
                  selected={selected?.id === feedback.id}
                  onClick={() => setSelected({ ...feedback })}
                />
              ))}
            </div>
          ) : (
            <p className="muted">
              No feedback sections were marked during this take.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

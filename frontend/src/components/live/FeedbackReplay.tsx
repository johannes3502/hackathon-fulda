"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ListFilter } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import type { LiveFeedback } from "@/features/live/contracts";
import { FeedbackMoment, LiveNav, MissingRecording } from "./shared";
import { VideoPlayback } from "./VideoPlayback";
import { PoseEvidence } from "./PoseEvidence";
export function FeedbackReplay({ sessionId }: { sessionId: string }) {
  const { recordings } = useLiveSessions();
  const recording = recordings[sessionId];
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<LiveFeedback | null>(null);
  if (!recording) return <MissingRecording />;
  const items = recording.feedback.filter(
    (item) => category === "all" || item.category === category,
  );
  const current =
    selected && items.some((item) => item.id === selected.id)
      ? selected
      : (items[0] ?? null);
  const index = items.findIndex((item) => item.id === current?.id);
  return (
    <AppShell experience="live" step={3}>
      <div className="workspace live-review">
        <LiveNav
          sessionId={sessionId}
          active="moments"
          mode={recording.config.mode}
        />
        <div className="workspace-heading">
          <div>
            <h1>Watch the moment. Find your next step.</h1>
            <p>
              {recording.config.title} · {recording.feedback.length} feedback
              moments
            </p>
          </div>
        </div>
        <p className="live-demo-notice">
          Local gesture observations use visible landmarks and a neutral
          baseline. They are prototype heuristics, not a quality score.
        </p>
        <div className="feedback-replay-grid">
          <aside className="moment-browser panel">
            <div className="panel-title-row">
              <h2>
                <ListFilter size={17} /> Feedback sections
              </h2>
              <span className="badge">{items.length}</span>
            </div>
            <label htmlFor="feedback-category">Filter by category</label>
            <NativeSelect
              id="feedback-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelected(null);
              }}
            >
              <option value="all">All feedback</option>
              {[
                ...new Set(recording.feedback.map((item) => item.category)),
              ].map((label) => (
                <option key={label}>{label}</option>
              ))}
            </NativeSelect>
            <div className="moment-browser-list">
              {items.length ? (
                items.map((item) => (
                  <FeedbackMoment
                    key={item.id}
                    feedback={item}
                    selected={current?.id === item.id}
                    onClick={() => setSelected({ ...item })}
                  />
                ))
              ) : (
                <p className="empty-findings">
                  No feedback moments in this category. The full recording is
                  still available.
                </p>
              )}
            </div>
          </aside>
          <div>
            <VideoPlayback
              recording={recording}
              selected={current}
              onSelect={(item) => {
                setCategory("all");
                setSelected({ ...item });
              }}
            />
            {current && (
              <section className="replay-detail panel">
                <div className="panel-title-row">
                  <span className={`feedback-kind ${current.kind}`}>
                    {current.category} · {current.kind}
                  </span>
                  <span className="small muted">
                    Moment {index + 1} of {items.length}
                  </span>
                </div>
                <h2>{current.title}</h2>
                <p>{current.detail}</p>
                <PoseEvidence event={current.evidence} />
                <div className="replay-action">
                  <strong>Your next step</strong>
                  <p>{current.action}</p>
                </div>
                <div className="moment-navigation">
                  <Button
                    variant="outline"
                    disabled={index <= 0}
                    onClick={() => setSelected({ ...items[index - 1] })}
                  >
                    <ArrowLeft size={16} /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={index >= items.length - 1}
                    onClick={() => setSelected({ ...items[index + 1] })}
                  >
                    Next moment <ArrowRight size={16} />
                  </Button>
                </div>
              </section>
            )}
            <p className="field-hint">
              Video and feedback use the same recording timeline. Each section
              includes up to two seconds before and after the marked range.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

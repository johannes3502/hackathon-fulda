"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageSquare,
  Play,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import type { LiveFeedback } from "@/features/live/contracts";
import { needsPractice, recordingFeedback } from "@/features/live/review";
import { PRESENTATION_MODES } from "@/features/questions/presentation";
import { clipRange } from "@/features/live/protocol";
import { cueAppearance } from "@/features/live/cue-appearance";
import { time } from "@/lib/utils";
import { FactCheckPanel } from "./FactCheckPanel";
import { MissingRecording, SessionStorageNotice } from "./shared";
import { RecordedTranscript } from "./RecordedTranscript";
import { PoseEvidence } from "./PoseEvidence";
import { PoseEventDownload } from "./PoseEventDownload";
import { PoseDownload } from "./PoseDownload";
import { QuestionPractice } from "./QuestionPractice";
import { TranscriptAnalysis } from "./TranscriptAnalysis";
import { VideoPlayback } from "./VideoPlayback";
import { ReviewScores } from "./ReviewScores";
import { reviewScores } from "@/features/live/review-scores";
import { recordingReviewData } from "../analysis/review-data";
import { StageQuestion } from "@/components/stage/StageQuestion";
import "./review-accessibility.css";
import "./stage-live.css";

export function LiveReview({
  sessionId,
  stage: requestedStage = false,
}: {
  sessionId: string;
  stage?: boolean;
}) {
  const { recordings, remove, update } = useLiveSessions();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const recording = recordings[sessionId];
  const stage = requestedStage || recording?.config.stage === true;
  const [selected, setSelected] = useState<LiveFeedback | null>(null);
  const [view, setView] = useState<"moments" | "questions">("moments");
  const [questionRound, setQuestionRound] = useState(0);
  const [all, setAll] = useState(true);
  if (!recording) return <MissingRecording />;
  const moments = recordingFeedback(recording);
  const reviewData = recordingReviewData(recording);
  const practice = moments.filter(needsPractice);
  const strengths = moments.filter((item) => item.kind === "positive");
  const visible = all || !practice.length ? moments : practice;
  const appearance = cueAppearance(selected, "ready");
  const mode =
    PRESENTATION_MODES[recording.config.presentationMode ?? "school"];
  const openQuestions = () => {
    if (view === "questions" && recording.conversationFinished) {
      update(recording.id, (take) => ({
        ...take,
        conversation: [],
        conversationFinished: false,
      }));
      setQuestionRound((round) => round + 1);
    }
    setView("questions");
  };
  const jump = (item: LiveFeedback) => {
    setSelected({ ...item });
    setView("moments");
  };

  return (
    <AppShell experience="live">
      <div
        className={`workspace review-workspace${stage ? " stage-live" : ""}`}
      >
        {stage ? (
          <div className="stage-live-bar">
            <div>
              <strong>418 · Pitch Mode</strong>
              <span>Jury-Review · eine vorbereitete Datenschutzfrage</span>
            </div>
            <div className="stage-live-actions">
              <Link href="/stage">Stage</Link>
            </div>
          </div>
        ) : (
          <div className="workspace-back">
            <Link href="/live">
              <ArrowLeft size={15} aria-hidden="true" /> Record again
            </Link>
          </div>
        )}
        <div className="workspace-heading">
          <div>
            <h1>
              {stage
                ? "Dein Auftritt, eine Frage."
                : "Make your next take stronger."}
            </h1>
            <p>
              {recording.config.title} · {mode.label} ·{" "}
              {time(recording.durationMs)}
              {recording.completion === "interrupted"
                ? " · Interrupted recording"
                : ""}
            </p>
          </div>
          {!stage && (
            <Button onClick={openQuestions}>
              <MessageSquare size={17} aria-hidden="true" /> Practice questions
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
        {recording.notice && (
          <p className="status-warning" role="status">
            {recording.notice}
          </p>
        )}
        <SessionStorageNotice />
        {!stage && (
          <div
            className="review-view-switch"
            role="group"
            aria-label="Review steps"
          >
            <button
              aria-pressed={view === "moments"}
              onClick={() => setView("moments")}
            >
              <Play size={17} /> Review moments
            </button>
            <button
              aria-pressed={view === "questions"}
              onClick={openQuestions}
            >
              <MessageSquare size={17} /> Practice questions
            </button>
          </div>
        )}
        {view === "moments" ? (
          <>
            <ReviewScores
              scores={reviewScores(
                reviewData.moments,
                reviewData.durationMs,
                reviewData.claims,
              )}
              demo={recording.transcript?.synthetic ?? false}
              recordingTitle={reviewData.title}
            />
            <FactCheckPanel
              key={recording.id}
              recording={recording}
              onSelect={jump}
            />
            <div className="review-stage-grid">
              <VideoPlayback
                recording={{ ...recording, feedback: moments }}
                selected={selected}
                onSelect={jump}
              />
              <aside
                className="panel review-coach"
                aria-label="Feedback on this take"
              >
                <div className="panel-title-row">
                  <h2>
                    {selected
                      ? "This moment, explained"
                      : practice.length
                        ? "Start with one adjustment"
                        : "Watch with fresh eyes"}
                  </h2>
                  <span className="badge">
                    {strengths.length}{" "}
                    {strengths.length === 1 ? "strength" : "strengths"} ·{" "}
                    {practice.length} to revisit
                  </span>
                </div>
                {selected ? (
                  <div className={`review-observation ${selected.kind}`}>
                    <appearance.Icon
                      className={`review-cue-icon ${appearance.tone}`}
                      size={40}
                      aria-hidden="true"
                    />
                    <span className={`feedback-kind ${selected.kind}`}>
                      {selected.kind === "positive"
                        ? "Keep doing this"
                        : needsPractice(selected)
                          ? "Try an adjustment"
                          : "Observation"}{" "}
                      · {time(selected.startMs)}
                    </span>
                    <h3>{selected.title}</h3>
                    <strong>
                      {selected.kind === "positive"
                        ? "What worked and why"
                        : "What happened and why it matters"}
                    </strong>
                    <p>{selected.detail}</p>
                    {selected.action && (
                      <div className="review-next-action">
                        <Check size={20} />
                        <div>
                          <strong>For your next take</strong>
                          <p>{selected.action}</p>
                        </div>
                      </div>
                    )}
                    {selected.evidence && (
                      <details>
                        <summary>Why this was marked</summary>
                        <PoseEvidence event={selected.evidence} />
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="review-intro">
                    {practice.length
                      ? "Choose a strength or an adjustment below. Watch what happened, learn why it matters, then try the next step."
                      : "No adjustments were flagged. Watch the take and decide what you want to practice; missing feedback is not an assessment."}
                  </p>
                )}
                <div className="panel-title-row review-list-heading">
                  <h3>Strengths and next steps</h3>
                  {!!practice.length && (
                    <button
                      className="text-button"
                      aria-pressed={all}
                      onClick={() => setAll(!all)}
                    >
                      {all
                        ? "Show adjustments"
                        : `All observations (${moments.length})`}
                    </button>
                  )}
                </div>
                <ol className="review-clip-list">
                  {visible.map((item) => {
                    const range = clipRange(item, recording.durationMs);
                    return (
                      <li key={item.id}>
                        <button
                          className={`review-clip ${selected?.id === item.id ? "selected" : ""}`}
                          aria-pressed={selected?.id === item.id}
                          onClick={() => jump(item)}
                        >
                          <span className="review-clip-time">
                            <Play size={15} />
                            <span>{time(item.startMs)}</span>
                          </span>
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.kind === "positive"
                                ? "Keep doing this"
                                : needsPractice(item)
                                  ? "Try an adjustment"
                                  : "Observation"}{" "}
                              · {item.category} · {time(range.start * 1000)}–
                              {time(range.end * 1000)}
                            </small>
                          </span>
                          <ArrowRight size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {!visible.length && (
                  <p className="field-hint">
                    {moments.length
                      ? "Other observations are available above."
                      : "No feedback moments were captured for this take."}
                  </p>
                )}
                <p className="field-hint">
                  {!strengths.length &&
                    "No specific strengths were established from the available data. Missing warnings are not proof that a skill was measured. "}
                  Camera and voice observations use prototype heuristics. They
                  are suggestions to review, not grades.
                </p>
              </aside>
            </div>
            {!stage && (
              <div className="review-continue">
                <div>
                  <h2>Now defend your ideas.</h2>
                  <p>Your teacher will ask about what you presented.</p>
                </div>
                <Button onClick={openQuestions}>
                  Practice questions <ArrowRight size={17} />
                </Button>
              </div>
            )}
            <details className="review-details">
              <summary>Transcript and source checks</summary>
              <RecordedTranscript recording={recording} onSelect={jump} />
            </details>
            <details className="review-details">
              <summary>Recording details and exports</summary>
              <p className="field-hint">
                This session is saved locally in this browser.{" "}
                {recording.config.mode === "backend" ||
                recording.analysisUploaded
                  ? "The backend removes its original after processing; analysis results remain stored."
                  : "The recording has not been uploaded for analysis."}
              </p>
              <PoseDownload blob={recording.poseLog} />
              <PoseEventDownload events={recording.poseEvents} />
              {!!recording.metrics.length && (
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
              )}
              <details>
                <summary>Replace transcript timestamps</summary>
                <TranscriptAnalysis recording={recording} />
              </details>
              <Link
                className="text-button"
                href={`/live/${sessionId}/analysis`}
              >
                Detailed timeline
              </Link>
              <div className="recording-delete">
                {confirmDelete ? (
                  <>
                    <p>
                      Delete this session’s local video, feedback and question
                      history? This cannot be undone. Uploaded source materials
                      are kept.
                    </p>
                    <Button
                      variant="outline"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        if (await remove(sessionId)) router.push("/live");
                        else setDeleting(false);
                      }}
                    >
                      {deleting ? "Deleting…" : "Delete permanently"}
                    </Button>{" "}
                    <Button
                      variant="outline"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete saved session
                  </Button>
                )}
              </div>
            </details>
            {stage && <StageQuestion />}
          </>
        ) : (
          <QuestionPractice key={questionRound} recording={recording} />
        )}
        <p className="review-retention field-hint">
          Saved sessions are available on this browser and device. Download your
          video in Review moments to keep a separate copy.
        </p>
      </div>
    </AppShell>
  );
}

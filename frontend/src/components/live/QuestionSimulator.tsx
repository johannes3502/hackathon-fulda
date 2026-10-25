"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CornerDownRight,
  ExternalLink,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { PerformanceEvaluation } from "./PerformanceEvaluation";
import {
  factCheckSettings,
  evidenceHint,
  factFeedback,
  runFactCheck,
} from "@/features/factcheck/api";
import {
  ANSWER_LABELS,
  generateQuestions,
  KIND_LABELS,
  questionFeedback,
  reviewAnswer,
  withFollowUp,
  type AnswerReview,
  type Persona,
  type Question,
  type QuestionResult,
} from "@/features/questions/api";
import { PRESENTATION_MODES } from "@/features/questions/presentation";
import { collectionId, listSources } from "@/features/sources/api";
import type { components } from "../../../../api/schema";
import { time } from "@/lib/utils";

type Evidence = components["schemas"]["Evidence"];
function Source({ evidence }: { evidence: Evidence }) {
  return (
    <blockquote>
      “{evidence.quote}”
      <cite>
        {evidence.url ? (
          <a href={evidence.url} target="_blank" rel="noreferrer">
            {evidence.label} <ExternalLink size={11} />
          </a>
        ) : (
          evidence.label
        )}
      </cite>
      <small className="field-hint">
        {evidenceHint(evidence)}
      </small>
    </blockquote>
  );
}

export function QuestionSimulator({
  recording,
  onSelect,
}: {
  recording: LiveRecording;
  onSelect: (feedback: LiveFeedback) => void;
}) {
  const { update } = useLiveSessions();
  const [collection] = useState(
    () => recording.config.sourceCollectionId ?? collectionId(),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [index, setIndex] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const words = recording.words ?? [];
  const result = recording.questions;
  const question = result?.questions[index];
  const persona = result?.persona ?? "tutor";
  const fullyAnswered =
    !!result &&
    result.questions.length > 0 &&
    result.questions.every((q) => recording.answers?.[q.id]);

  function withQuestions(
    current: LiveRecording,
    questions: QuestionResult,
  ): LiveRecording {
    return {
      ...current,
      questions,
      feedback: [
        ...current.feedback.filter((f) => !f.id.startsWith("question-")),
        ...questionFeedback(questions.questions, current.durationMs),
      ].sort((a, b) => a.startMs - b.startMs),
    };
  }

  async function generate() {
    if (busy) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setNotice("Reading your presentation…");
    try {
      const settings = await factCheckSettings(
        recording.config.endpoint,
        active.signal,
      );
      if (!settings.available)
        throw new Error(
          "Typed questions are unavailable. Check the backend model settings and API key, then retry.",
        );
      let claims = recording.factCheck?.claims ?? [];
      const sources = await listSources(recording.config.endpoint, collection);
      if (
        sources.some((s) => s.status === "processing" || s.status === "queued")
      )
        throw new Error(
          "Your material is still processing. Please retry when it is ready.",
        );
      if (!recording.factCheck && sources.some((s) => s.status === "ready")) {
        setNotice("Comparing your presentation with the material…");
        const checked = await runFactCheck(
          recording.config.endpoint,
          { words, collectionId: collection, useWeb: false },
          active.signal,
        );
        claims = checked.claims;
        if (active.signal.aborted) return;
        update(recording.id, (take) =>
          take.words !== words
            ? take
            : {
                ...take,
                factCheck: checked,
                feedback: [
                  ...take.feedback.filter(
                    (item) => !item.id.startsWith("fact-"),
                  ),
                  ...factFeedback(checked, take.durationMs),
                ].sort((a, b) => a.startMs - b.startMs),
              },
        );
      }
      setNotice("Preparing your questions…");
      const generated = await generateQuestions(
        recording.config.endpoint,
        {
          words,
          collectionId: collection,
          claims,
          persona: "tutor",
          presentationMode: recording.config.presentationMode ?? "startup",
        },
        active.signal,
      );
      if (active.signal.aborted) return;
      update(recording.id, (take) =>
        take.words !== words
          ? take
          : { ...withQuestions(take, generated), answers: {} },
      );
      setIndex(0);
      setNotice(
        generated.questions.length
          ? ""
          : "No grounded questions were found. Try again with more material or a longer take.",
      );
    } catch (error) {
      if (!active.signal.aborted)
        setNotice(
          error instanceof Error
            ? error.message
            : "Questions could not be prepared. Please retry.",
        );
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }

  function answered(question: Question, answer: string, review: AnswerReview) {
    update(recording.id, (take) => {
      if (
        !take.questions ||
        take.words !== recording.words ||
        !take.questions.questions.some(
          (q) => q.id === question.id && q.question === question.question,
        )
      )
        return take;
      const questions = review.follow_up
        ? withFollowUp(take.questions.questions, question.id, review.follow_up)
        : take.questions.questions;
      return {
        ...withQuestions(take, { ...take.questions, questions }),
        answers: { ...take.answers, [question.id]: { answer, review } },
      };
    });
  }

  return (
    <div className="typed-question-round">
      {!result?.questions.length && (
        <>
          <p>
            Questions use your transcript and material. Answer in your own
            words; follow-ups help you go deeper.
          </p>
          <Button
            disabled={busy || !words.length}
            onClick={() => void generate()}
          >
            {busy ? "Preparing questions…" : "Start question round"}
          </Button>
          <p className="field-hint">
            This sends your transcript, matching material and typed answers to
            the language model configured on your backend (Google Gemini by
            default).
          </p>
        </>
      )}
      <p role="status" className="field-hint">
        {notice}
      </p>
      {result && question && (
        <>
          <div className="panel-title-row">
            <span className="muted">
              Question {index + 1} of {result.questions.length}
            </span>
            <span className="badge">
              {Object.keys(recording.answers ?? {}).length} answered
            </span>
          </div>
          <ol className="fact-claims">
            <QuestionCard
              key={question.id + question.question}
              number={index + 1}
              question={question}
              recording={recording}
              persona={persona}
              collection={collection}
              disabled={busy}
              onSelect={() => {
                const moment = questionFeedback(
                  [question],
                  recording.durationMs,
                )[0];
                if (moment) onSelect(moment);
              }}
              onAnswered={(answer, review) =>
                answered(question, answer, review)
              }
            />
          </ol>
          <div className="question-navigation">
            <Button
              variant="ghost"
              disabled={index === 0 || busy}
              onClick={() => setIndex((n) => n - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </Button>
            {index + 1 < result.questions.length ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setIndex((n) => n + 1)}
              >
                Next question <ArrowRight size={16} />
              </Button>
            ) : fullyAnswered ? null : (
              <span className="field-hint">
                End of this round. Take one improvement into your next
                rehearsal.
              </span>
            )}
          </div>
          {fullyAnswered && (
            <PerformanceEvaluation
              input={{
                durationMs: recording.durationMs,
                factCheck: recording.factCheck,
                questions: result,
                answers: recording.answers,
                words: recording.words,
                feedback: recording.feedback,
                poseEvents: recording.poseEvents,
              }}
            />
          )}
          <details className="review-details">
            <summary>Sources and round details</summary>
            <ul className="fact-notices">
              {result.notices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void generate()}
            >
              Ask new questions
            </Button>
          </details>
        </>
      )}
    </div>
  );
}

function QuestionCard({
  number,
  question,
  recording,
  persona,
  collection,
  disabled,
  onSelect,
  onAnswered,
}: {
  number: number;
  question: Question;
  recording: LiveRecording;
  persona: Persona;
  collection: string | null;
  disabled: boolean;
  onSelect: () => void;
  onAnswered: (answer: string, review: AnswerReview) => void;
}) {
  const saved = recording.answers?.[question.id];
  const [draft, setDraft] = useState(saved?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const review = saved?.review;

  async function submit() {
    const answer = draft.trim();
    if (!answer) return;
    const active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    setBusy(true);
    setError(null);
    try {
      const reviewed = await reviewAnswer(
        recording.config.endpoint,
        {
          question,
          answer,
          collectionId: collection,
          persona,
          presentationMode: recording.config.presentationMode ?? "startup",
        },
        active.signal,
      );
      if (!active.signal.aborted) onAnswered(answer, reviewed);
    } catch (failure) {
      if (!active.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "The answer could not be compared.",
        );
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }

  const followUp = question.kind === "follow_up";
  return (
    <li className={`fact-claim question-card ${question.kind}`}>
      <div className="fact-claim-head">
        <span className={`fact-verdict question-kind ${question.kind}`}>
          {followUp && <CornerDownRight size={12} />}
          {followUp ? "" : `${number}. `}
          {KIND_LABELS[question.kind]}
        </span>
        {question.t_ms !== null && question.t_ms !== undefined ? (
          <button type="button" className="text-button" onClick={onSelect}>
            <Play size={12} /> {time(question.t_ms)}
          </button>
        ) : (
          <span className="muted small">Whole talk</span>
        )}
      </div>
      <strong>{question.question}</strong>
      {question.reason && <p className="muted small">Why: {question.reason}</p>}
      {question.transcript && !followUp && (
        <p className="muted small">You said: “{question.transcript}”</p>
      )}
      <label className="question-answer">
        <span className="sr-only">Your answer</span>
        <textarea
          className="textarea"
          rows={3}
          maxLength={4000}
          value={draft}
          placeholder="Answer as you would in front of the audience…"
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <div className="question-actions">
        <Button
          size="sm"
          variant={review ? "outline" : "default"}
          onClick={() => void submit()}
          disabled={busy || disabled || !draft.trim()}
        >
          {busy
            ? "Comparing with sources…"
            : review
              ? "Compare again"
              : "Compare with sources"}
        </Button>
        {error && (
          <span className="status-warning small" role="status">
            {error}
          </span>
        )}
      </div>
      {review && (
        <div className={`answer-review ${review.verdict}`} role="status">
          <span className={`fact-verdict ${review.verdict}`}>
            {ANSWER_LABELS[review.verdict]}
          </span>
          {review.reply && (
            <p>
              <strong>
                {
                  PRESENTATION_MODES[
                    recording.config.presentationMode ?? "startup"
                  ].listener
                }
                :
              </strong>{" "}
              {review.reply}
            </p>
          )}
          {review.explanation && (
            <p className="muted small">{review.explanation}</p>
          )}
          {review.evidence && <Source evidence={review.evidence} />}
          {question.evidence && !review.evidence && (
            <details>
              <summary className="small">Source behind this question</summary>
              <Source evidence={question.evidence} />
            </details>
          )}
          <p className="field-hint">
            Compared with:{" "}
            {review.checked.length
              ? review.checked
                  .map((kind) => (kind === "upload" ? "your sources" : "web"))
                  .join(", ")
              : "nothing available"}
            {review.notes?.length ? ` · ${review.notes.join(" ")}` : ""}
          </p>
          {review.follow_up && (
            <p className="muted small">
              <CornerDownRight size={12} /> A follow-up is ready. Choose Next
              question to answer it.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

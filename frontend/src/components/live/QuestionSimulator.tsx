"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CornerDownRight,
  ExternalLink,
  MessagesSquare,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import {
  factCheckSettings,
  type FactCheckSettings,
} from "@/features/factcheck/api";
import {
  ANSWER_LABELS,
  generateQuestions,
  KIND_LABELS,
  questionFeedback,
  reviewAnswer,
  withFollowUp,
  type AnswerReview,
  type Question,
  type QuestionResult,
} from "@/features/questions/api";
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
  // Async results merge into the newest recording, not the one at request time.
  const { update } = useLiveSessions();
  const endpoint = recording.config.endpoint;
  const [settings, setSettings] = useState<FactCheckSettings | null>(null);
  // Same browser collection as the /sources page; never rendered on the server.
  const [collection] = useState(collectionId);
  const [readySources, setReadySources] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const active = new AbortController();
    factCheckSettings(endpoint, active.signal)
      .then(setSettings)
      .catch(() => {
        if (!active.signal.aborted)
          setNotice("Model settings could not be loaded from the backend.");
      });
    listSources(endpoint, collection)
      .then((sources) => {
        if (!active.signal.aborted)
          setReadySources(sources.filter((s) => s.status === "ready").length);
      })
      .catch(() => {
        if (!active.signal.aborted) setReadySources(null);
      });
    return () => active.abort();
  }, [endpoint, collection]);

  const words = recording.words ?? [];
  const claims = recording.factCheck?.claims ?? [];
  const result = recording.questions;
  const canRun = !busy && !!settings?.available && words.length > 0;

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
    const active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    setBusy(true);
    setNotice(null);
    try {
      const generated = await generateQuestions(
        endpoint,
        { words, collectionId: collection, claims },
        active.signal,
      );
      if (active.signal.aborted) return;
      update(recording.id, (current) => ({
        ...withQuestions(current, generated),
        answers: {},
      }));
      setNotice(
        generated.questions.length
          ? `${generated.questions.length} ${generated.questions.length === 1 ? "question" : "questions"} ready. Questions about a passage were added to your feedback moments.`
          : "The model did not propose any well-founded questions for this transcript.",
      );
    } catch (error) {
      if (!active.signal.aborted)
        setNotice(
          error instanceof Error
            ? error.message
            : "The question simulator failed.",
        );
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }

  const answered = Object.keys(recording.answers ?? {}).length;
  return (
    <section
      className="panel fact-check questions"
      aria-labelledby="questions-title"
    >
      <div className="panel-title-row">
        <h2 id="questions-title">
          <MessagesSquare size={18} /> Question simulator
        </h2>
        {result && (
          <span className="badge">
            {answered}/{result.questions.length} answered
          </span>
        )}
      </div>
      <p>
        After your talk, a simulated audience asks follow-up questions: first
        about statements your sources contradict or don’t back, then about
        source content you left out. Your typed answers are compared with your
        sources. No points, no grades.
      </p>
      <dl className="fact-check-inputs">
        <div>
          <dt>Transcript</dt>
          <dd>
            {words.length
              ? `${words.length} words`
              : "None yet. Turn on transcription before recording or import word timestamps above."}
          </dd>
        </div>
        <div>
          <dt>Fact-check findings</dt>
          <dd>
            {recording.factCheck
              ? `${claims.length} ${claims.length === 1 ? "statement" : "statements"}`
              : "Not run yet. Run the fact-check above for sharper questions."}
          </dd>
        </div>
        <div>
          <dt>Your sources</dt>
          <dd>
            {readySources === null ? "Unavailable" : `${readySources} ready`} ·{" "}
            <Link href="/sources">Manage sources</Link>
          </dd>
        </div>
      </dl>
      {settings && !settings.available && (
        <p className="status-warning" role="status">
          The language model is not configured on the backend (LLM_BASE_URL,
          LLM_MODEL).
        </p>
      )}
      {settings?.available && (
        <p className="field-hint">
          Starting sends your transcript sentences, fact-check findings and
          matching source passages to {settings.llm_host} (model{" "}
          {settings.model}). Each answer you submit is sent there too.
        </p>
      )}
      <Button onClick={() => void generate()} disabled={!canRun}>
        {busy
          ? "Preparing questions…"
          : result
            ? "Ask new questions"
            : "Start question round"}
      </Button>
      <p role="status" className="field-hint">
        {notice}
      </p>
      {result && (
        <>
          <ol className="fact-claims">
            {result.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                number={index + 1}
                question={question}
                recording={recording}
                collection={collection}
                disabled={!settings?.available}
                onSelect={() => {
                  const moment = questionFeedback(
                    [question],
                    recording.durationMs,
                  )[0];
                  if (moment) onSelect({ ...moment });
                }}
                onAnswered={(answer, review) =>
                  update(recording.id, (current) => {
                    if (!current.questions) return current;
                    const questions = review.follow_up
                      ? withFollowUp(
                          current.questions.questions,
                          question.id,
                          review.follow_up,
                        )
                      : current.questions.questions;
                    return {
                      ...withQuestions(current, {
                        ...current.questions,
                        questions,
                      }),
                      answers: {
                        ...current.answers,
                        [question.id]: { answer, review },
                      },
                    };
                  })
                }
              />
            ))}
          </ol>
          <ul className="fact-notices">
            {result.notices.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function QuestionCard({
  number,
  question,
  recording,
  collection,
  disabled,
  onSelect,
  onAnswered,
}: {
  number: number;
  question: Question;
  recording: LiveRecording;
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
        { question, answer, collectionId: collection },
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
          {review.explanation && <p>{review.explanation}</p>}
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
              <CornerDownRight size={12} /> Follow-up added below.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

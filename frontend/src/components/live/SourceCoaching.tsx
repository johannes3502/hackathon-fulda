"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { request } from "@/features/live/analysis";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import {
  collectionId,
  listSources,
  locationLabel,
} from "@/features/sources/api";
import {
  acceptedJob,
  factFeedback,
  verdictLabel,
  waitForCoaching,
  type Citation,
} from "@/features/coaching/api";
import { time } from "@/lib/utils";

function Citations({ citations }: { citations: Citation[] }) {
  return citations.map((citation, index) => (
    <figure className="source-citation" key={`${citation.chunk_id}-${index}`}>
      <blockquote>{citation.quote}</blockquote>
      <figcaption>
        {citation.filename} · {locationLabel(citation.location)}
      </figcaption>
    </figure>
  ));
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Source review failed. Try again.";

export function SourceCoaching({
  recording,
  onSelect,
}: {
  recording: LiveRecording;
  onSelect: (feedback: LiveFeedback) => void;
}) {
  const { update } = useLiveSessions();
  const {
    id,
    config: { endpoint },
    coaching,
    transcript,
  } = recording;
  const [availability, setAvailability] = useState<{
    collection: string;
    model: string;
    ready: boolean;
    sources: number;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const refresh = useCallback(
    (signal: AbortSignal) => {
      return Promise.resolve()
        .then(async () => {
          const collection = collectionId();
          const [capabilities, sources] = await Promise.all([
            request(endpoint, "/coaching/capabilities", signal),
            listSources(endpoint, collection),
          ]);
          if (
            !capabilities ||
            typeof capabilities !== "object" ||
            !("configured" in capabilities) ||
            typeof capabilities.configured !== "boolean" ||
            !("model" in capabilities) ||
            typeof capabilities.model !== "string"
          )
            throw new Error("The local model status is unavailable.");
          return {
            collection,
            model: capabilities.model,
            ready: capabilities.configured,
            sources: sources.filter((source) => source.status === "ready")
              .length,
          };
        })
        .then((value) => {
          if (signal.aborted) return;
          setAvailability(value);
          setNotice(null);
        })
        .catch((error) => {
          if (!signal.aborted) {
            setAvailability(null);
            setNotice(message(error));
          }
        });
    },
    [endpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const pendingReport =
    coaching && !coaching.report && !coaching.error ? coaching.jobId : null;
  useEffect(() => {
    if (!pendingReport) return;
    const controller = new AbortController();
    void waitForCoaching(endpoint, pendingReport, controller.signal)
      .then((job) => {
        if (!job.report)
          throw new Error("The job did not return a source review.");
        update(id, (take) =>
          take.coaching?.jobId !== pendingReport
            ? take
            : {
                ...take,
                coaching: {
                  ...take.coaching,
                  report: job.report!,
                  error: null,
                },
                feedback: [
                  ...take.feedback.filter((f) => !f.id.startsWith("fact-")),
                  ...job.report!.checks.map((check) =>
                    factFeedback(check, take.durationMs),
                  ),
                ].sort((a, b) => a.startMs - b.startMs),
              },
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          update(id, (take) =>
            take.coaching?.jobId !== pendingReport
              ? take
              : {
                  ...take,
                  coaching: { ...take.coaching, error: message(error) },
                },
          );
      });
    return () => controller.abort();
  }, [endpoint, id, pendingReport, update]);

  const pendingAnswers = JSON.stringify(
    coaching?.answerJobs
      .filter((job) => job.status === "pending")
      .map((job) => ({ id: job.id, questionId: job.questionId })) ?? [],
  );
  useEffect(() => {
    const jobs: { id: string; questionId: string }[] =
      JSON.parse(pendingAnswers);
    const controller = new AbortController();
    for (const { id: jobId, questionId } of jobs) {
      void waitForCoaching(endpoint, jobId, controller.signal)
        .then((job) => {
          if (!job.answer || job.answer.question_id !== questionId)
            throw new Error(
              "The job did not return a review for this question.",
            );
          update(id, (take) =>
            !take.coaching?.answerJobs.some(
              (j) => j.id === jobId && j.questionId === job.answer!.question_id,
            )
              ? take
              : {
                  ...take,
                  coaching: {
                    ...take.coaching,
                    answers: [
                      ...take.coaching.answers.filter(
                        (a) => a.question_id !== job.answer!.question_id,
                      ),
                      job.answer!,
                    ],
                    answerJobs: take.coaching.answerJobs.map((j) =>
                      j.id === jobId
                        ? { ...j, status: "complete", error: null }
                        : j,
                    ),
                  },
                },
          );
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            update(id, (take) =>
              !take.coaching
                ? take
                : {
                    ...take,
                    coaching: {
                      ...take.coaching,
                      answerJobs: take.coaching.answerJobs.map((j) =>
                        j.id === jobId
                          ? {
                              ...j,
                              status: "failed",
                              error: message(error),
                            }
                          : j,
                      ),
                    },
                  },
            );
        });
    }
    return () => controller.abort();
  }, [endpoint, id, pendingAnswers, update]);

  async function start() {
    if (!transcript?.words.length || !availability || coaching || submitting)
      return;
    setSubmitting(true);
    setNotice(null);
    try {
      const jobId = acceptedJob(
        await request(
          endpoint,
          "/coaching/analyze",
          AbortSignal.timeout(30000),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collection_id: availability.collection,
              words: transcript.words,
              duration_ms: recording.durationMs,
            }),
          },
        ),
      );
      update(id, (take) => ({
        ...take,
        coaching: {
          jobId,
          report: null,
          error: null,
          answers: [],
          answerJobs: [],
        },
      }));
    } catch (error) {
      setNotice(message(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAnswer(questionId: string) {
    if (!coaching?.report || submitting || !answers[questionId]?.trim()) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const jobId = acceptedJob(
        await request(
          endpoint,
          `/coaching/jobs/${coaching.jobId}/answers`,
          AbortSignal.timeout(30000),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question_id: questionId,
              answer: answers[questionId],
            }),
          },
        ),
      );
      update(id, (take) =>
        take.coaching?.jobId !== coaching.jobId
          ? take
          : {
              ...take,
              coaching: {
                ...take.coaching,
                answerJobs: [
                  ...take.coaching.answerJobs,
                  { id: jobId, questionId, status: "pending", error: null },
                ],
              },
            },
      );
    } catch (error) {
      setNotice(message(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function clear() {
    if (!coaching || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      for (const jobId of [
        ...coaching.answerJobs.map((j) => j.id),
        coaching.jobId,
      ]) {
        try {
          await request(
            endpoint,
            `/coaching/jobs/${jobId}`,
            AbortSignal.timeout(30000),
            { method: "DELETE" },
          );
        } catch (error) {
          if (!(error instanceof Error && error.message.includes("HTTP 404")))
            throw error;
        }
      }
      update(id, (take) => ({
        ...take,
        coaching: undefined,
        feedback: take.feedback.filter((f) => !f.id.startsWith("fact-")),
      }));
      setAnswers({});
    } catch (error) {
      setNotice(message(error));
    } finally {
      setSubmitting(false);
    }
  }

  const busy =
    submitting ||
    !!pendingReport ||
    coaching?.answerJobs.some((job) => job.status === "pending");
  return (
    <section
      className="panel source-coaching"
      aria-label="Source review and questions"
    >
      <h2>Check your sources. Practice the questions.</h2>
      <p>
        Compare selected statements with your uploaded sources, then answer
        follow-up questions. The model runs locally; its interpretation can
        still be wrong.
      </p>
      {!coaching && (
        <>
          <p className="field-hint">
            {availability
              ? `${availability.sources} ready source(s) · ${availability.ready ? "Local model ready" : "Local model unavailable"}`
              : "Checking local model and sources…"}
          </p>
          {availability && !availability.ready && (
            <p role="status">
              Start the local model using the project setup guide, then refresh
              its status.
            </p>
          )}
          {!transcript?.words.length && (
            <p>
              Record with local transcription enabled or import word timestamps
              to continue.
            </p>
          )}
          {transcript?.synthetic && (
            <p>
              Synthetic demo transcripts cannot be submitted as a real
              recording.
            </p>
          )}
          <div className="coaching-actions">
            <Button
              onClick={() => void start()}
              disabled={
                busy ||
                !availability?.ready ||
                !availability.sources ||
                !transcript?.words.length ||
                transcript.synthetic
              }
            >
              Compare with my sources
            </Button>
            <Button asChild variant="outline">
              <Link href="/sources" target="_blank" rel="noopener noreferrer">
                Manage sources (new tab)
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => void refresh(AbortSignal.timeout(15000))}
            >
              Refresh status
            </Button>
          </div>
          <p className="field-hint">
            This sends the transcript to your local backend. Reports and answers
            stay there until you delete this review. Uploaded sources have a
            separate delete control.
          </p>
        </>
      )}
      {pendingReport && (
        <p role="status">
          Comparing statements and preparing questions locally… You can replay
          your take while this runs.
        </p>
      )}
      {coaching?.error && (
        <div role="alert">
          <p>{coaching.error}</p>
          <Button
            variant="outline"
            onClick={() =>
              update(id, (take) =>
                !take.coaching
                  ? take
                  : { ...take, coaching: { ...take.coaching, error: null } },
              )
            }
          >
            Check job status again
          </Button>
        </div>
      )}
      {coaching?.report && (
        <>
          <p className="field-hint">
            {coaching.report.model} · {coaching.report.checks.length} selected
            statement(s). “Not found” does not mean false.
          </p>
          {coaching.report.notices.map((text) => (
            <p className="field-hint" key={text}>
              {text}
            </p>
          ))}
          {!coaching.report.checks.length && (
            <p>
              No checkable factual statements were selected from this
              transcript.
            </p>
          )}
          <div className="coaching-checks">
            {coaching.report.checks.map((check) => (
              <article key={check.id}>
                <div className="panel-title-row">
                  <h3>{verdictLabel(check.verdict)}</h3>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onSelect(factFeedback(check, recording.durationMs))
                    }
                  >
                    Replay {time(check.t_ms)}
                  </Button>
                </div>
                <p className="coaching-statement">“{check.statement}”</p>
                <p>{check.explanation}</p>
                <Citations citations={check.citations} />
              </article>
            ))}
          </div>
          <h3>Questions for your next rehearsal</h3>
          {!coaching.report.questions.length && (
            <p>No follow-up questions were generated for this transcript.</p>
          )}
          {coaching.report.questions.map((question, index) => {
            const answer = coaching.answers.find(
              (a) => a.question_id === question.id,
            );
            const job = coaching.answerJobs
              .filter((j) => j.questionId === question.id)
              .at(-1);
            return (
              <form
                className="coaching-question"
                key={question.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAnswer(question.id);
                }}
              >
                <h4>
                  {index + 1}. {question.text}
                </h4>
                <p className="field-hint">{question.reason}</p>
                <label htmlFor={`answer-${question.id}`}>Your answer</label>
                <textarea
                  id={`answer-${question.id}`}
                  rows={3}
                  maxLength={6000}
                  required
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((prior) => ({
                      ...prior,
                      [question.id]: event.target.value,
                    }))
                  }
                />
                <Button disabled={busy || !answers[question.id]?.trim()}>
                  Compare answer with sources
                </Button>
                {job?.status === "pending" && (
                  <p role="status">Checking this answer locally…</p>
                )}
                {job?.error && <p role="alert">{job.error}</p>}
                {answer && (
                  <div className="coaching-answer">
                    <strong>{verdictLabel(answer.verdict)}</strong>
                    <p className="field-hint">
                      Reviewed answer: {answer.answer}
                    </p>
                    <p>{answer.explanation}</p>
                    <Citations citations={answer.citations} />
                    {answer.follow_up && (
                      <p>
                        <strong>Follow-up: </strong>
                        {answer.follow_up}
                      </p>
                    )}
                  </div>
                )}
              </form>
            );
          })}
        </>
      )}
      {coaching && (
        <Button variant="outline" disabled={busy} onClick={() => void clear()}>
          Delete source review and answers
        </Button>
      )}
      {notice && <p role="alert">{notice}</p>}
    </section>
  );
}

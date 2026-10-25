"use client";
import { useState } from "react";
import { ArrowRight, Check, MessageSquare, Quote } from "lucide-react";
import { useCoachSession } from "@/features/coach/useCoachSession";
import { Button } from "@/components/ui/button";
import { time } from "@/lib/utils";
export function JudgePanel() {
  const { state, send, select, pending } = useCoachSession();
  const [choice, setChoice] = useState("");
  const q = state.question;
  const blocked = pending || state.isPaused || state.connection !== "connected";
  if (state.phase === "judge_thinking" || state.phase === "report_pending")
    return (
      <section className="judge-panel panel thinking" role="status">
        <div className="judge-avatar">
          <MessageSquare size={27} />
        </div>
        <h2>
          {state.phase === "report_pending"
            ? "Connecting feedback to the evidence…"
            : "The examiner is considering your explanation…"}
        </h2>
        <p className="muted">A scripted sample response is on its way.</p>
        <span className="thinking-dots">•••</span>
      </section>
    );
  if (!q) return null;
  return (
    <section className="judge-panel panel">
      <div className="judge-top">
        <span className="judge-avatar">
          <MessageSquare size={23} />
        </span>
        <div>
          <h2>Your practice examiner</h2>
          <span className="muted small">
            {state.config.audience === "investor"
              ? "Investor"
              : state.config.audience === "examiner"
                ? "University examiner"
                : "Hackathon jury"}{" "}
            · Question {q.parentQuestionId ? "2" : "1"} of{" "}
            {state.retryTarget ? "1" : "2"}
          </span>
        </div>
        <span className="badge">Scripted Q&amp;A</span>
      </div>
      <p className="judge-question" aria-live="polite" aria-atomic="true">
        {q.text}
      </p>
      <button
        className="question-evidence"
        onClick={() => {
          select(q.evidence);
          document
            .getElementById("studio-transcript")
            ?.scrollIntoView({ behavior: "instant", block: "nearest" });
        }}
      >
        <Quote size={19} />
        <span>
          <small>WHY THIS QUESTION? · {time(q.evidence.startMs)}</small>
          <span>“{q.evidence.quote}”</span>
          <strong>
            View transcript moment <ArrowRight size={13} />
          </strong>
        </span>
      </button>
      {state.phase === "judge_question" ? (
        <div className="answer-start">
          <p className="muted">Take a moment. Start when you’re ready.</p>
          <Button
            disabled={blocked}
            onClick={() => {
              setChoice("");
              void send({ type: "start_answer", turnId: q.turnId });
            }}
          >
            Start answer <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <div className="answer-picker">
          <div className="panel-title-row">
            <h3>Choose a sample answer</h3>
            <span className="timestamp">
              {time(state.answerMs)}
              {state.retryTarget && " / 0:30 target"}
            </span>
          </div>
          <p className="muted small">
            These choices drive a scripted follow-up. No speech or typed text is
            analyzed.
          </p>
          <div className="answer-options">
            {state.answerChoices.map((answer) => (
              <button
                key={answer.id}
                disabled={blocked}
                className={
                  choice === answer.text
                    ? "answer-option selected"
                    : "answer-option"
                }
                aria-pressed={choice === answer.text}
                onClick={() => setChoice(answer.text)}
              >
                <strong>
                  {answer.label}
                  {choice === answer.text && <Check size={17} />}
                </strong>
                <span>{answer.text}</span>
              </button>
            ))}
          </div>
          <Button
            disabled={blocked || !choice}
            onClick={() =>
              void send({
                type: "submit_answer",
                turnId: q.turnId,
                text: choice,
              })
            }
          >
            Submit answer <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <button
        className="text-button finish-qa"
        disabled={blocked}
        onClick={() => void send({ type: "finish_qa" })}
      >
        Finish Q&amp;A and review
      </button>
    </section>
  );
}

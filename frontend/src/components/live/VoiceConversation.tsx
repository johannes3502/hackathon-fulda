"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Mic, SkipForward, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveRecording } from "@/features/live/contracts";
import {
  PERSONA_LABELS,
  questionErrorMessage,
  reviewVoiceAnswer,
  withFollowUp,
  type AnswerReview,
  type Persona,
  type Question,
} from "@/features/questions/api";
import {
  MAX_FOLLOW_UPS_PER_MAIN,
  MAX_VOICE_USER_TURNS,
  canAddFollowUp,
  canRecordAnswers,
  canSpeak,
  canStartVoiceRound,
  formatCountdown,
  nextQuestion,
  recordAnswer,
  remainingSeconds,
  speak,
  voiceSessionExpired,
} from "@/features/questions/voice";

type Phase = "idle" | "speaking" | "listening" | "thinking";
// Browser capabilities never change, so there is nothing to subscribe to.
const noSubscription = () => () => {};

const OPENING: Record<Persona, string> = {
  student: "Hi, danke für den Vortrag! Ich hätte da ein paar Fragen.",
  tutor: "Vielen Dank für Ihren Vortrag. Ich habe einige Rückfragen.",
};
const CLOSING: Record<Persona, string> = {
  student: "Danke, das waren alle meine Fragen!",
  tutor: "Danke, das waren meine Fragen.",
};
const PHASES: Record<Exclude<Phase, "idle">, string> = {
  speaking: "Speaking…",
  listening: "Listening – answer out loud, then press “Done”.",
  thinking: "Transcribing and comparing with your sources…",
};

/**
 * Spoken question round: the persona reads each question aloud, records the
 * answer, the backend transcribes and compares it with the sources, and the
 * persona replies. Follow-ups are asked right after their question.
 */
export function VoiceConversation({
  recording,
  persona,
  collection,
  disabled,
  onAnswered,
}: {
  recording: LiveRecording;
  persona: Persona;
  collection: string | null;
  disabled: boolean;
  onAnswered: (
    question: Question,
    answer: string,
    review: AnswerReview,
  ) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<Question | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [turns, setTurns] = useState(0);
  const [limitRoundId, setLimitRoundId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const finish = useRef<((action: "done" | "skip") => void) | null>(null);
  const turnCount = useRef(0);
  const roundId =
    recording.questions?.roundId ?? recording.questions?.round_id;
  const limitReached = limitRoundId !== null && limitRoundId === roundId;
  useEffect(() => () => controller.current?.abort(), []);
  // The server render assumes support.
  const supported = {
    speak: useSyncExternalStore(noSubscription, canSpeak, () => true),
    record: useSyncExternalStore(noSubscription, canRecordAnswers, () => true),
  };
  const running = phase !== "idle";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const value = Date.now();
      setNow(value);
      if (!voiceSessionExpired(startedAt, turns, value)) return;
      controller.current?.abort();
      controller.current = null;
      finish.current = null;
      setPhase("idle");
      setCurrent(null);
      setStartedAt(null);
      setLimitRoundId(roundId ?? null);
      setError(
        "The 10-minute / 12-answer voice round is over. Generate a new round or type your answers.",
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [running, startedAt, turns, roundId]);

  function stopForLimit() {
    controller.current?.abort();
    controller.current = null;
    finish.current = null;
    setPhase("idle");
    setCurrent(null);
    setStartedAt(null);
    setLimitRoundId(roundId ?? null);
    setError(
      "The 10-minute / 12-answer voice round is over. Generate a new round or type your answers.",
    );
  }

  async function converse() {
    if (!roundId) {
      setError("This saved round has no server id. Start a new round.");
      return;
    }
    const active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    const { signal } = active;
    let questions = recording.questions?.questions ?? [];
    const done = new Set(Object.keys(recording.answers ?? {}));
    let opening = OPENING[persona];
    let repeat = false;
    const began = Date.now();
    turnCount.current = 0;
    setStartedAt(began);
    setNow(began);
    setTurns(0);
    setError(null);
    setHeard(null);
    setReply(null);
    try {
      while (true) {
        if (voiceSessionExpired(began, turnCount.current)) {
          stopForLimit();
          break;
        }
        const question = nextQuestion(questions, done);
        setCurrent(question ?? null);
        if (!question) {
          setPhase("speaking");
          await speak(CLOSING[persona], persona, signal);
          break;
        }
        if (!repeat) {
          setPhase("speaking");
          // First call stays inside the click handler, so iOS allows speech.
          await speak(`${opening} ${question.question}`, persona, signal);
          opening = "";
        }
        repeat = false;
        setPhase("listening");
        const action = new Promise<"done" | "skip">((resolve) => {
          finish.current = resolve;
        });
        const audio = await recordAnswer(
          action.then(() => undefined),
          signal,
        );
        finish.current = null;
        if ((await action) === "skip") {
          done.add(question.id);
          continue;
        }
        if (!audio.size) {
          repeat = true; // Stopped before anything was recorded.
          continue;
        }
        setPhase("thinking");
        const review = await reviewVoiceAnswer(
          recording.config.endpoint,
          {
            roundId: roundId ?? "",
            questionId: question.id,
            recording: audio,
            collectionId: collection,
            persona,
          },
          signal,
        );
        setReply(review.reply ?? null);
        if (!review.answer) {
          // Nothing recognised: say so and listen again for the same question.
          setPhase("speaking");
          await speak(review.reply ?? "", persona, signal);
          repeat = true;
          continue;
        }
        done.add(question.id);
        turnCount.current += 1;
        setTurns(turnCount.current);
        if (review.follow_up && canAddFollowUp(questions, question.id))
          questions = withFollowUp(questions, question.id, review.follow_up);
        setHeard(review.answer);
        onAnswered(question, review.answer, review);
        setPhase("speaking");
        await speak(review.reply ?? "", persona, signal);
      }
    } catch (failure) {
      if (!signal.aborted)
        setError(
          failure instanceof DOMException && failure.name === "NotAllowedError"
            ? "Microphone access was blocked. Allow it in the browser to answer by voice."
            : questionErrorMessage(failure),
        );
    } finally {
      finish.current = null;
      if (controller.current === active) {
        setPhase("idle");
        setCurrent(null);
        setStartedAt(null);
      }
    }
  }

  function stop() {
    controller.current?.abort();
    controller.current = null;
    finish.current = null;
    setPhase("idle");
    setCurrent(null);
    setStartedAt(null);
  }

  const startAllowed = canStartVoiceRound(limitReached, supported.record);
  return (
    <div className="voice-conversation" aria-live="polite">
      <div className="question-actions">
        {running ? (
          <Button variant="outline" onClick={stop}>
            <Square size={14} /> End conversation
          </Button>
        ) : (
          <Button
            onClick={() => void converse()}
            disabled={disabled || !startAllowed}
          >
            <Mic size={14} />{" "}
            {limitReached
              ? "Round limit reached"
              : `Talk with the ${PERSONA_LABELS[persona].name.toLowerCase()}`}
          </Button>
        )}
        {!supported.record && (
          <span className="status-warning small">
            This browser cannot record the microphone here (HTTPS needed).
          </span>
        )}
        {!supported.speak && (
          <span className="muted small">
            No speech output in this browser; questions are shown as text.
          </span>
        )}
      </div>
      <p className="field-hint">
        Up to 10:00 and {MAX_VOICE_USER_TURNS} spoken answers per round, with
        at most {MAX_FOLLOW_UPS_PER_MAIN} follow-ups per main question.
      </p>
      {(running || limitReached) && (
        <p className="field-hint" role="status">
          {startedAt !== null
            ? formatCountdown(remainingSeconds(startedAt, now))
            : "00:00"}{" "}
          left · {turns}/{MAX_VOICE_USER_TURNS} answers
        </p>
      )}
      {running && (
        <div className={`voice-stage ${phase}`}>
          <p className="voice-phase">
            {phase === "speaking" && <Volume2 size={14} />}
            {phase === "listening" && <Mic size={14} />}
            {phase === "thinking" && (
              <LoaderCircle size={14} className="spin" />
            )}{" "}
            {PHASES[phase]}
          </p>
          {current && <strong>{current.question}</strong>}
          {phase === "listening" && (
            <div className="question-actions">
              <Button size="sm" onClick={() => finish.current?.("done")}>
                Done
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => finish.current?.("skip")}
              >
                <SkipForward size={12} /> Skip
              </Button>
            </div>
          )}
        </div>
      )}
      {(heard || reply) && (
        <dl className="voice-log">
          {heard && (
            <div>
              <dt>You said</dt>
              <dd>“{heard}”</dd>
            </div>
          )}
          {reply && (
            <div>
              <dt>{PERSONA_LABELS[persona].name}</dt>
              <dd>{reply}</dd>
            </div>
          )}
        </dl>
      )}
      {error && (
        <p className="status-warning small" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

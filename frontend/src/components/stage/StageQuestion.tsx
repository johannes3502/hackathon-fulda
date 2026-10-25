"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  Info,
  ListChecks,
  Quote,
  Square,
  Timer,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_ANSWER_MS } from "@/features/stage/config";
import {
  PITCH_FALLBACK,
  loadPitchContext,
  type PitchSource,
  type StagePitchContext,
} from "@/features/stage/pitch";
import { formatAnswerCountdown } from "@/features/stage/timing";
import "./StageQuestion.css";

const styles: Record<string, string> = new Proxy(
  {},
  {
    get: (_target, key) =>
      typeof key === "string" ? `stage-question-${key}` : undefined,
  },
);

export type StageQuestionProps = {
  compact?: boolean;
  className?: string;
};

function germanVoice(synth: SpeechSynthesis) {
  try {
    return synth
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("de"));
  } catch {
    return undefined;
  }
}

/**
 * The one prepared jury question. It renders the identical local fallback
 * immediately, so a missing backend, LLM and voice provider cannot block the
 * jury flow. It is independent of LiveReview and can be embedded elsewhere.
 */
export function StageQuestion({
  compact = false,
  className,
}: StageQuestionProps) {
  const headingId = useId();
  const detailsId = useId();
  const [context, setContext] = useState<StagePitchContext>(PITCH_FALLBACK);
  const [source, setSource] = useState<PitchSource>("fallback");
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [answerRemainingMs, setAnswerRemainingMs] = useState<number | null>(
    null,
  );
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerEndAt = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadPitchContext(controller.signal)
      .then((result) => {
        if (!active) return;
        setContext(result.context);
        setSource(result.source);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(
    () => () => {
      utterance.current = null;
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      if (countdown.current !== null) clearInterval(countdown.current);
      countdown.current = null;
      answerEndAt.current = null;
    },
    [],
  );

  function stopSpeech() {
    utterance.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    setSpeaking(false);
  }

  function clearAnswerTimer() {
    if (countdown.current !== null) clearInterval(countdown.current);
    countdown.current = null;
    answerEndAt.current = null;
  }

  function stopAnswerTimer() {
    clearAnswerTimer();
    setAnswerRemainingMs(null);
  }

  function readQuestion() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeechNotice(
        "Dieser Browser unterstützt die Sprachausgabe nicht. Die Frage steht als Text bereit.",
      );
      return;
    }
    if (typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechNotice(
        "Dieser Browser unterstützt die Sprachausgabe nicht. Die Frage steht als Text bereit.",
      );
      return;
    }

    const synth = window.speechSynthesis;
    stopSpeech();
    setSpeechNotice(null);
    try {
      const next = new SpeechSynthesisUtterance(
        context.question.question,
      );
      next.lang = "de-DE";
      next.rate = 0.95;
      const voice = germanVoice(synth);
      if (voice) next.voice = voice;
      next.onstart = () => {
        if (utterance.current === next) setSpeaking(true);
      };
      next.onend = () => {
        if (utterance.current !== next) return;
        utterance.current = null;
        setSpeaking(false);
      };
      next.onerror = () => {
        if (utterance.current !== next) return;
        utterance.current = null;
        setSpeaking(false);
      };
      utterance.current = next;
      setSpeaking(true);
      synth.speak(next);
    } catch {
      utterance.current = null;
      setSpeaking(false);
      setSpeechNotice(
        "Die Sprachausgabe konnte nicht gestartet werden. Die Frage bleibt als Text lesbar.",
      );
    }
  }

  function stopAll() {
    stopSpeech();
    stopAnswerTimer();
    setSpeechNotice(null);
  }

  function startAnswerWindow() {
    clearAnswerTimer();
    const end = Date.now() + STAGE_ANSWER_MS;
    answerEndAt.current = end;
    setAnswerRemainingMs(STAGE_ANSWER_MS);
    countdown.current = setInterval(() => {
      const remaining = Math.max(
        0,
        (answerEndAt.current ?? end) - Date.now(),
      );
      if (remaining <= 0) {
        clearAnswerTimer();
        setAnswerRemainingMs(0);
        return;
      }
      setAnswerRemainingMs(remaining);
    }, 250);
  }

  const answerRunning = answerRemainingMs !== null && answerRemainingMs > 0;
  const evidence = context.question.evidence;
  const sourceLabel =
    source === "backend" ? "vom lokalen Backend" : "lokal hinterlegt";

  return (
    <section
      className={cn(styles.card, compact && styles.compact, className)}
      aria-labelledby={headingId}
      data-stage-question
    >
      <div className={styles.header}>
        <div className={styles.headingGroup}>
          <p className={styles.label} id={headingId}>
            Jury-Frage · Datenschutz
          </p>
          <p className={styles.source}>Quelle: {sourceLabel}</p>
        </div>
        <span className={styles.badge}>vorbereitet</span>
      </div>

      <p className={styles.question} aria-live="polite">
        {context.question.question}
      </p>
      <p className={styles.reason}>{context.question.reason}</p>

      <div className={styles.controls}>
        <button
          type="button"
          className={cn(styles.control, styles.primaryControl)}
          onClick={readQuestion}
        >
          <Volume2 size={18} aria-hidden="true" />
          Frage vorlesen
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={stopAll}
          disabled={!speaking && !answerRunning}
        >
          <Square size={15} aria-hidden="true" />
          Stopp
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={startAnswerWindow}
          disabled={answerRunning}
        >
          <Timer size={18} aria-hidden="true" />
          Antwortfenster 90 s
        </button>
      </div>

      {answerRemainingMs !== null && (
        <div
          className={cn(
            styles.timer,
            answerRemainingMs === 0 && styles.timerEnded,
          )}
          role="timer"
          aria-label={
            answerRemainingMs === 0
              ? "Antwortfenster beendet"
              : `Antwortfenster: ${formatAnswerCountdown(answerRemainingMs)} verbleibend`
          }
        >
          <Timer size={22} aria-hidden="true" />
          <span className={styles.timerValue}>
            {formatAnswerCountdown(answerRemainingMs)}
          </span>
          <span className={styles.timerLabel}>Antwortfenster</span>
        </div>
      )}

      {speechNotice && (
        <p className={styles.statusMessage} role="status">
          {speechNotice}
        </p>
      )}
      {answerRemainingMs === 0 && (
        <p className={styles.statusMessage} role="status">
          Antwortfenster beendet.
        </p>
      )}

      <p className={styles.note}>
        <Info size={16} aria-hidden="true" />
        Genau eine Frage, keine Nachfrage, keine Bewertung.
      </p>

      <button
        type="button"
        className={styles.detailsToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        <ListChecks size={18} aria-hidden="true" />
        {expanded ? "Kernpunkte verbergen" : "Kernpunkte zeigen"}
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={cn(styles.chevron, expanded && styles.chevronOpen)}
        />
      </button>

      {expanded && (
        <div className={styles.details} id={detailsId}>
          {evidence && (
            <div className={styles.evidence}>
              <span className={styles.evidenceLabel}>
                <Quote size={14} aria-hidden="true" />
                {evidence.label}
              </span>
              <blockquote className={styles.quote}>
                {evidence.quote}
              </blockquote>
            </div>
          )}
          <h3 className={styles.pointsTitle}>Kernpunkte</h3>
          <ol className={styles.points}>
            {context.question.answer_points.map((point, index) => (
              <li key={`${index}-${point}`}>{point}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

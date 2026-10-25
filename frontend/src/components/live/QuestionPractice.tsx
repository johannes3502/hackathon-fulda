"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { AudioLines, Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import {
  agentSession,
  agentSettings,
  prepareAgent,
  transcribeTake,
  type AgentSettings,
} from "@/features/questions/agent";
import { PRESENTATION_MODES } from "@/features/questions/presentation";
import {
  MAX_VOICE_USER_TURNS,
  canStartVoiceRound,
  endSessionIfActive,
  formatCountdown,
  remainingSeconds,
  voiceSessionExpired,
} from "@/features/questions/voice";
import { collectionId } from "@/features/sources/api";
import { PerformanceEvaluation } from "./PerformanceEvaluation";

export function QuestionPractice({ recording }: { recording: LiveRecording }) {
  const { update } = useLiveSessions();
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "connecting" | "listening" | "speaking"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const session = useRef<Conversation | null>(null);
  const turnCount = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [collection] = useState(
    () => recording.config.sourceCollectionId ?? collectionId(),
  );
  const mode =
    PRESENTATION_MODES[recording.config.presentationMode ?? "startup"];
  const active = phase !== "idle";
  const connected = phase === "listening" || phase === "speaking";
  const messages = recording.conversation ?? [];
  const lastAgent = messages.findLast((item) => item.role === "agent");
  const lastUser = messages.findLast((item) => item.role === "user");
  const userTurns = messages.filter((item) => item.role === "user").length;

  const endForLimit = useCallback(() => {
    setLimitReached(true);
    setError(
      "The 10-minute / 12-answer voice session is over. The conversation was ended.",
    );
    controller.current?.abort();
    const current = session.current;
    session.current = null;
    setPhase("idle");
    setMuted(false);
    setStartedAt(null);
    void endSessionIfActive(current).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const value = Date.now();
      setNow(value);
      if (voiceSessionExpired(startedAt, turnCount.current, value))
        endForLimit();
    }, 1000);
    return () => clearInterval(timer);
  }, [active, startedAt, endForLimit]);

  useEffect(() => {
    const pending = new AbortController();
    agentSettings(recording.config.endpoint, pending.signal)
      .then(setSettings)
      .catch(() => {
        if (!pending.signal.aborted)
          setSettings({
            available: false,
            reason:
              "Voice practice could not reach the backend. Retry when it is available.",
          });
      });
    return () => pending.abort();
  }, [recording.config.endpoint, revision]);

  useEffect(
    () => () => {
      controller.current?.abort();
      void endSessionIfActive(session.current).catch(() => {});
      session.current = null;
    },
    [],
  );

  useEffect(() => {
    document
      .getElementById(
        finished ? "performance-evaluation-title" : "question-practice-title",
      )
      ?.focus();
  }, [finished]);

  async function stop(showStats = false) {
    const pending = controller.current;
    pending?.abort();
    const current = session.current;
    session.current = null;
    setPhase("idle");
    setMuted(false);
    setStartedAt(null);
    try {
      await endSessionIfActive(current);
      if (showStats && controller.current === pending) setFinished(true);
    } catch {
      if (controller.current === pending)
        setError("The connection ended unexpectedly. You can start again.");
    }
  }

  async function start() {
    if (controller.current && !controller.current.signal.aborted) return;
    if (!canStartVoiceRound(limitReached, !!settings?.available)) return;
    const pending = new AbortController();
    controller.current = pending;
    setError("");
    setNotices([]);
    update(recording.id, (take) => ({ ...take, conversation: [] }));
    const began = Date.now();
    turnCount.current = 0;
    setStartedAt(began);
    setNow(began);
    setPhase("preparing");
    try {
      const context = await prepareAgent(recording, collection, pending.signal);
      const signedUrl = await agentSession(
        recording.config.endpoint,
        pending.signal,
      );
      pending.signal.throwIfAborted();
      setNotices(context.notices);
      setPhase("connecting");
      const { Conversation } = await import("@elevenlabs/client");
      pending.signal.throwIfAborted();
      const current = await Conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        textOnly: false,
        stripAudioTags: true,
        overrides: {
          agent: {
            prompt: { prompt: context.prompt },
            firstMessage:
              "Ich habe noch ein paar Fragen. Bist du bereit?",
          },
        },
        onConversationCreated: (created) => {
          if (pending.signal.aborted)
            void endSessionIfActive(created).catch(() => {});
          else session.current = created;
        },
        onConnect: () => {
          if (!pending.signal.aborted) {
            setPhase("listening");
          }
        },
        onModeChange: ({ mode }) => {
          if (!pending.signal.aborted) setPhase(mode);
        },
        onMessage: ({ role, message }) => {
          if (!pending.signal.aborted) {
            if (role === "user") turnCount.current++;
            update(recording.id, (take) => ({
              ...take,
              conversation: [
                ...(take.conversation ?? []),
                { role: role === "user" ? "user" : "agent", text: message },
              ],
            }));
            if (voiceSessionExpired(began, turnCount.current)) endForLimit();
          }
        },
        onDisconnect: ({ reason }) => {
          if (!pending.signal.aborted) {
            pending.abort();
            session.current = null;
            setPhase("idle");
            setMuted(false);
            setStartedAt(null);
            if (reason === "agent") setFinished(true);
          }
        },
        onError: () => {
          if (!pending.signal.aborted) {
            setError(
              "Voice practice lost its connection. Check the agent settings and retry.",
            );
            void stop();
          }
        },
      });
      if (pending.signal.aborted) {
        await endSessionIfActive(current);
        return;
      }
      session.current = current;
    } catch (failure) {
      if (!pending.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Voice practice could not start. Please retry.",
        );
        pending.abort();
        const current = session.current;
        session.current = null;
        void endSessionIfActive(current).catch(() => {});
        setPhase("idle");
        setStartedAt(null);
      }
    }
  }

  async function transcribe() {
    const pending = new AbortController();
    controller.current = pending;
    setTranscribing(true);
    setError("");
    try {
      const result = await transcribeTake(recording, pending.signal);
      if (!pending.signal.aborted) {
        update(recording.id, (take) =>
          take.words !== recording.words
            ? take
            : {
                ...take,
                words: result.words,
                transcript: result.transcript,
                feedback: result.feedback,
                metrics: result.metrics,
                analysisUploaded: true,
              },
        );
        if (!result.words?.length)
          setError(
            "No speech was recognized. Try a new take with the microphone enabled.",
          );
      }
    } catch {
      if (!pending.signal.aborted)
        setError(
          "Transcription failed. Your video is still available; check the backend and retry.",
        );
    } finally {
      if (!pending.signal.aborted) {
        setTranscribing(false);
        pending.abort();
      }
    }
  }

  function resetConversation() {
    setLimitReached(false);
    setStartedAt(null);
    setFinished(false);
    setError("");
    setPhase("idle");
    update(recording.id, (take) => ({ ...take, conversation: [] }));
  }

  if (finished)
    return (
      <div className="question-practice">
        <PerformanceEvaluation input={recording} />
        <Button variant="outline" onClick={() => setFinished(false)}>
          Back to questions
        </Button>
      </div>
    );

  return (
    <section
      className="panel question-practice"
      aria-label="Practice questions"
    >
      <div className="question-practice-heading">
        <div>
          <h2 id="question-practice-title" tabIndex={-1}>
            Meet your {mode.listener.toLowerCase()}.
          </h2>
          <p>{mode.focus} One question at a time.</p>
        </div>
        <span className="badge">{mode.label}</span>
      </div>
      {!recording.words?.length ? (
        <div className="question-empty">
          <h3>First, let’s read what you said.</h3>
          <p>
            Create a transcript from this take to ask questions about your
            presentation.
          </p>
          <Button disabled={transcribing} onClick={() => void transcribe()}>
            {transcribing ? "Transcribing your take…" : "Transcribe this take"}
          </Button>
          <p className="field-hint">
            This uploads the recording to your backend for local Whisper
            transcription. The server removes the original after processing;
            your local video remains available.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`question-voice-stage ${connected ? "connected" : ""}`}
          >
            <AudioLines size={36} aria-hidden="true" />
            <p className="question-voice-status" role="status">
              {phase === "preparing"
                ? "Reading your presentation and material…"
                : phase === "connecting"
                  ? "Connecting your microphone…"
                  : phase === "speaking"
                    ? `Your ${mode.listener.toLowerCase()} is speaking`
                    : phase === "listening"
                      ? muted
                        ? "Microphone muted"
                        : "Listening to your answer"
                      : "A conversation about your ideas"}
            </p>
            <h3>
              {lastAgent?.text ?? "Explain your thinking. Defend your choices."}
            </h3>
            {lastUser && (
              <p className="question-last-answer">
                <strong>You:</strong> {lastUser.text}
              </p>
            )}
            {active ? (
              <div className="question-actions">
                <Button variant="outline" onClick={() => void stop(connected)}>
                  <Square size={16} />{" "}
                  {connected ? "End conversation" : "Cancel"}
                </Button>
                {connected && (
                  <Button
                    variant="ghost"
                    aria-pressed={muted}
                    onClick={() => {
                      session.current?.setMicMuted(!muted);
                      setMuted(!muted);
                    }}
                  >
                    {muted ? <MicOff size={17} /> : <Mic size={17} />}
                    {muted ? "Unmute microphone" : "Mute microphone"}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                disabled={
                  !canStartVoiceRound(limitReached, !!settings?.available)
                }
                onClick={() => void start()}
              >
                <Mic size={17} />{" "}
                {limitReached
                  ? "Session limit reached"
                  : messages.length
                    ? "Start a new conversation"
                    : "Start voice questions"}
              </Button>
            )}
          </div>
          {(active || limitReached) && (
            <p className="field-hint" role="status">
              {formatCountdown(
                limitReached ? 0 : remainingSeconds(startedAt, now),
              )}{" "}
              left · {userTurns}/{MAX_VOICE_USER_TURNS} spoken answers
            </p>
          )}
          {limitReached && (
            <Button variant="outline" onClick={resetConversation}>
              Start a new round
            </Button>
          )}
          {settings && !settings.available && (
            <p className="status-warning" role="status">
              {settings.reason}{" "}
              <button
                className="text-button"
                onClick={() => setRevision((n) => n + 1)}
              >
                Retry connection
              </button>
            </p>
          )}
          <p className="field-hint">
            This browser ends the session after 10 minutes or{" "}
            {MAX_VOICE_USER_TURNS} spoken answers. Starting shares your
            transcript, matching material and live microphone audio with
            ElevenLabs. When materials are insufficient, the agent sends focused
            search queries to Tavily to check public web sources. Spoken
            feedback is an AI suggestion; use source checks to verify factual
            claims. You can end the conversation at any time.
          </p>
          {notices.map((notice) => (
            <p className="field-hint" key={notice}>
              {notice}
            </p>
          ))}
          {messages.length > 0 && (
            <details className="review-details">
              <summary>Conversation transcript</summary>
              <ol className="conversation-transcript">
                {messages.map((item, index) => (
                  <li key={index}>
                    <strong>
                      {item.role === "user" ? "You" : mode.listener}
                    </strong>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="status-error">
          {error}
        </p>
      )}
    </section>
  );
}

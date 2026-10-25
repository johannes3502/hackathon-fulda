"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Conversation } from "@elevenlabs/client";
import { AudioLines, Mic, MicOff, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
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
  VOICE_ROLES,
  voiceRoleLabel,
  type VoiceRole,
} from "@/features/questions/roles";
import { VoiceMicrophone } from "@/features/questions/microphone";
import {
  storeVoiceProtection,
  subscribeVoiceProtection,
  voiceProtectionSnapshot,
} from "@/features/questions/voice-settings";
import {
  MAX_VOICE_USER_TURNS,
  canStartVoiceRound,
  endSessionIfActive,
  formatCountdown,
  remainingSeconds,
  voiceSessionExpired,
} from "@/features/questions/voice";
import { collectionId, listSources } from "@/features/sources/api";
import { factFeedback, runFactCheck } from "@/features/factcheck/api";
import { PerformanceEvaluation } from "./PerformanceEvaluation";

export function QuestionPractice({ recording }: { recording: LiveRecording }) {
  const { update } = useLiveSessions();
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "connecting" | "listening" | "speaking"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [voiceRole, setVoiceRole] = useState<VoiceRole | null>(
    () => recording.conversationRole ?? null,
  );
  const protectAgentSpeech = useSyncExternalStore(
    subscribeVoiceProtection,
    voiceProtectionSnapshot,
    () => false,
  );
  const [microphone] = useState(() => new VoiceMicrophone());
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
    PRESENTATION_MODES[recording.config.presentationMode ?? "school"];
  const listener = voiceRoleLabel(
    voiceRole,
    recording.config.presentationMode ?? "school",
  );
  const conversationListener = voiceRoleLabel(
    recording.conversationRole ?? null,
    recording.config.presentationMode ?? "school",
  );
  const active = phase !== "idle";
  const connected = phase === "listening" || phase === "speaking";
  const messages = recording.conversation ?? [];
  const lastAgent = messages.findLast((item) => item.role === "agent");
  const lastUser = messages.findLast((item) => item.role === "user");
  const userTurns = messages.filter((item) => item.role === "user").length;

  useEffect(() => {
    microphone.setProtectAgentSpeech(protectAgentSpeech);
  }, [microphone, protectAgentSpeech]);

  const endForLimit = useCallback(() => {
    setLimitReached(true);
    setError(
      "The 10-minute / 12-answer voice session is over. The conversation was ended.",
    );
    controller.current?.abort();
    const current = session.current;
    session.current = null;
    microphone.detach();
    setPhase("idle");
    setMuted(false);
    setStartedAt(null);
    void endSessionIfActive(current).catch(() => {});
  }, [microphone]);

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
      microphone.detach();
    },
    [microphone],
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
    microphone.detach();
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
    microphone.setProtectAgentSpeech(protectAgentSpeech);
    setError("");
    setNotices([]);
    update(recording.id, (take) => ({
      ...take,
      conversation: [],
      conversationRole: voiceRole,
    }));
    const began = Date.now();
    turnCount.current = 0;
    setStartedAt(began);
    setNow(began);
    setPhase("preparing");
    try {
      let prepared = recording;
      const preparationNotices: string[] = [];
      if (!recording.factCheck && recording.words?.length) {
        try {
          const sources = await listSources(
            recording.config.endpoint,
            collection,
          );
          pending.signal.throwIfAborted();
          if (sources.some((source) => source.status === "ready")) {
            const checked = await runFactCheck(
              recording.config.endpoint,
              {
                words: recording.words,
                collectionId: collection,
                useWeb: false,
              },
              pending.signal,
            );
            pending.signal.throwIfAborted();
            prepared = { ...recording, factCheck: checked };
            update(recording.id, (take) =>
              take.words !== recording.words
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
          } else {
            preparationNotices.push(
              "No ready sources were available for the content score. Upload material and wait for it to finish processing, then start again.",
            );
          }
        } catch {
          pending.signal.throwIfAborted();
          preparationNotices.push(
            "The source check failed. Voice practice can continue, but the content score is unavailable. Retry the source check in Review moments.",
          );
        }
      }
      const context = await prepareAgent(
        prepared,
        collection,
        pending.signal,
        voiceRole,
      );
      const signedUrl = await agentSession(
        recording.config.endpoint,
        pending.signal,
      );
      pending.signal.throwIfAborted();
      setNotices([...preparationNotices, ...context.notices]);
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
            firstMessage: "Ich habe noch ein paar Fragen. Bist du bereit?",
          },
        },
        onConversationCreated: (created) => {
          if (pending.signal.aborted)
            void endSessionIfActive(created).catch(() => {});
          else {
            session.current = created;
            microphone.attach(created);
          }
        },
        onConnect: () => {
          if (!pending.signal.aborted) {
            setPhase("listening");
          }
        },
        onModeChange: ({ mode }) => {
          if (!pending.signal.aborted) {
            microphone.setMode(mode);
            setPhase(mode);
          }
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
            microphone.detach();
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
      microphone.attach(current);
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
        microphone.detach();
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
        <p className="field-hint">
          Content uses source-checked presentation statements and reviewed typed
          answers. Spoken conversation answers are not scored.
        </p>
        {notices.map((notice) => (
          <p className="field-hint" key={notice}>
            {notice}
          </p>
        ))}
        <div className="question-actions">
          <Button asChild>
            <Link href="/live">
              <RotateCcw size={17} aria-hidden="true" /> Practice again
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setFinished(false)}>
            Back to questions
          </Button>
        </div>
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
            Meet your {listener.toLowerCase()}.
          </h2>
          <p>{mode.focus} One question at a time.</p>
        </div>
        <span className="badge">{mode.label}</span>
      </div>
      <div className="field">
        <label htmlFor={`questioner-role-${recording.id}`}>
          Who would you like to speak with?
        </label>
        <NativeSelect
          id={`questioner-role-${recording.id}`}
          value={voiceRole ?? "auto"}
          disabled={active || transcribing}
          aria-describedby={`questioner-role-hint-${recording.id}`}
          onChange={(event) =>
            setVoiceRole(
              event.target.value === "auto"
                ? null
                : (event.target.value as VoiceRole),
            )
          }
        >
          <option value="auto">Automatic · {mode.listener}</option>
          {Object.entries(VOICE_ROLES).map(([role, { label }]) => (
            <option key={role} value={role}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <p className="field-hint" id={`questioner-role-hint-${recording.id}`}>
          {voiceRole
            ? VOICE_ROLES[voiceRole].detail
            : "Uses the audience for your presentation type."}{" "}
          Changes the role and question style; the voice stays the same.
          {active && " End this conversation to choose another role."}
        </p>
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
                    ? `Your ${listener.toLowerCase()} is speaking${muted ? " · microphone muted" : protectAgentSpeech ? " · microphone automatically muted" : ""}`
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
                      microphone.setMuted(!muted);
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
          <label className="field-hint">
            <input
              type="checkbox"
              checked={protectAgentSpeech}
              onChange={(event) => {
                const enabled = event.target.checked;
                microphone.setProtectAgentSpeech(enabled);
                storeVoiceProtection(enabled);
              }}
            />{" "}
            Protect agent speech
          </label>
          <p className="field-hint">
            Automatically mute while the agent speaks and resume listening
            afterwards. Turn off to interrupt. Manual mute stays on until you
            unmute. Background voices can still be heard during your answer.{" "}
            Saved in this browser; also available under Admin → Voice questions.
          </p>
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
            transcript and matching material with the backend language model
            (Google Gemini by default) for a source check, and your transcript,
            matching material and live microphone audio with ElevenLabs. When
            materials are insufficient, the agent sends focused search queries
            to Tavily to check public web sources. Spoken feedback is an AI
            suggestion; use source checks to verify factual claims. You can end
            the conversation at any time.
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
                      {item.role === "user" ? "You" : conversationListener}
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

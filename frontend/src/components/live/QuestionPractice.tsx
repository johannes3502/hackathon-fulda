"use client";
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { AudioLines, Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import {
  agentSession,
  agentSettings,
  prepareAgent,
  transcribeTake,
  type AgentSettings,
} from "@/features/questions/agent";
import { PRESENTATION_MODES } from "@/features/questions/presentation";
import { collectionId } from "@/features/sources/api";
import { QuestionSimulator } from "./QuestionSimulator";

export function QuestionPractice({
  recording,
  onSelect,
}: {
  recording: LiveRecording;
  onSelect: (item: LiveFeedback) => void;
}) {
  const { update } = useLiveSessions();
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [method, setMethod] = useState<"voice" | "text">("voice");
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "connecting" | "listening" | "speaking"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [revision, setRevision] = useState(0);
  const session = useRef<Conversation | null>(null);
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
      void session.current?.endSession();
      session.current = null;
    },
    [],
  );

  async function stop() {
    controller.current?.abort();
    const current = session.current;
    session.current = null;
    setPhase("idle");
    setMuted(false);
    try {
      await current?.endSession();
    } catch {
      setError("The connection ended unexpectedly. You can start again.");
    }
  }

  async function start() {
    if (controller.current && !controller.current.signal.aborted) return;
    const pending = new AbortController();
    controller.current = pending;
    setError("");
    setNotices([]);
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
        overrides: {
          agent: { prompt: { prompt: context.prompt }, firstMessage: "" },
        },
        onConversationCreated: (created) => {
          if (pending.signal.aborted) void created.endSession();
          else session.current = created;
        },
        onConnect: () => {
          if (!pending.signal.aborted) {
            setPhase("listening");
            update(recording.id, (take) => ({ ...take, conversation: [] }));
          }
        },
        onModeChange: ({ mode }) => {
          if (!pending.signal.aborted) setPhase(mode);
        },
        onMessage: ({ role, message }) => {
          if (!pending.signal.aborted)
            update(recording.id, (take) => ({
              ...take,
              conversation: [
                ...(take.conversation ?? []),
                { role: role === "user" ? "user" : "agent", text: message },
              ],
            }));
        },
        onDisconnect: () => {
          if (!pending.signal.aborted) {
            pending.abort();
            session.current = null;
            setPhase("idle");
            setMuted(false);
          }
        },
        onError: () => {
          if (!pending.signal.aborted) {
            setError(
              "Voice practice lost its connection. Check the agent settings or try typing instead.",
            );
            void stop();
          }
        },
      });
      if (pending.signal.aborted) {
        await current.endSession();
        return;
      }
      session.current = current;
      // The saved greeting bypasses the LLM; request a generated opening after context is installed.
      current.sendUserMessage(
        "The student's presentation is complete. As their teacher, say only 'I have a few questions.' in the presentation's language, then immediately ask your first question about a specific point in the supplied presentation transcript. Do not add any other introduction.",
      );
    } catch (failure) {
      if (!pending.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Voice practice could not start. Please retry.",
        );
        pending.abort();
        setPhase("idle");
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

  return (
    <section
      className="panel question-practice"
      aria-label="Practice questions"
    >
      <div className="question-practice-heading">
        <div>
          <h2>
            Meet your{" "}
            {method === "voice" ? "teacher" : mode.listener.toLowerCase()}.
          </h2>
          <p>
            {method === "voice"
              ? "Understanding, reasoning and examples from your presentation."
              : mode.focus}{" "}
            One question at a time.
          </p>
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
            className="review-view-switch compact"
            role="group"
            aria-label="Answer method"
          >
            <button
              aria-pressed={method === "voice"}
              disabled={active}
              onClick={() => setMethod("voice")}
            >
              Speak with the agent
            </button>
            <button
              aria-pressed={method === "text"}
              disabled={active}
              onClick={() => setMethod("text")}
            >
              Practice by typing
            </button>
          </div>
          {method === "text" ? (
            <QuestionSimulator recording={recording} onSelect={onSelect} />
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
                        ? "Your teacher is speaking"
                        : phase === "listening"
                          ? muted
                            ? "Microphone muted"
                            : "Listening to your answer"
                          : "A conversation about your ideas"}
                </p>
                <h3>
                  {lastAgent?.text ??
                    "Explain your thinking. Defend your choices."}
                </h3>
                {lastUser && (
                  <p className="question-last-answer">
                    <strong>You:</strong> {lastUser.text}
                  </p>
                )}
                {active ? (
                  <div className="question-actions">
                    <Button variant="outline" onClick={() => void stop()}>
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
                    disabled={!settings?.available}
                    onClick={() => void start()}
                  >
                    <Mic size={17} />{" "}
                    {messages.length
                      ? "Start a new conversation"
                      : "Start voice questions"}
                  </Button>
                )}
              </div>
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
                Starting shares your transcript, matching material and live
                microphone audio with ElevenLabs. Spoken feedback is an AI
                suggestion; use source checks to verify factual claims. You can
                end the conversation at any time.
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
                          {item.role === "user" ? "You" : "Teacher"}
                        </strong>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
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

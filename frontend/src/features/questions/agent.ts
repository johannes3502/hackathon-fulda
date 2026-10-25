import type { components } from "../../../../api/schema";
import { callBackend, isObject, runBackendJob } from "@/lib/backend-job";
import type { LiveRecording } from "../live/contracts";
import { AnalysisTransport } from "../live/transport";
import { upsertFeedback } from "../live/protocol";

export type AgentSettings = components["schemas"]["AgentSettings"];
type AgentContext = components["schemas"]["AgentContext"];

export async function agentSettings(
  endpoint: string,
  signal: AbortSignal,
): Promise<AgentSettings> {
  const result = await callBackend(
    endpoint,
    "/questions/agent/settings",
    signal,
  );
  if (!isObject(result) || typeof result.available !== "boolean")
    throw new Error("Voice practice settings are unavailable.");
  return {
    available: result.available,
    reason: typeof result.reason === "string" ? result.reason : null,
  };
}

export function prepareAgent(
  recording: LiveRecording,
  collection: string,
  signal: AbortSignal,
  pollMs = 1500,
) {
  return runBackendJob<AgentContext>(
    recording.config.endpoint,
    {
      path: "/questions/agent",
      statusPath: "/questions/agent/jobs",
      label: "voice practice",
      body: {
        words: recording.words,
        claims: recording.factCheck?.claims ?? [],
        collection_id: collection,
        presentation_mode: recording.config.presentationMode ?? "school",
      },
      valid: (value): value is AgentContext =>
        isObject(value) &&
        typeof value.prompt === "string" &&
        typeof value.source_count === "number" &&
        Array.isArray(value.notices) &&
        value.notices.every((item) => typeof item === "string"),
    },
    signal,
    pollMs,
  );
}

export async function agentSession(endpoint: string, signal: AbortSignal) {
  const result = await callBackend(
    endpoint,
    "/questions/agent/session",
    signal,
    { method: "POST" },
  );
  if (!isObject(result) || typeof result.signed_url !== "string")
    throw new Error("The voice session was not created.");
  const url = new URL(result.signed_url);
  if (url.protocol !== "wss:" || url.hostname !== "api.elevenlabs.io")
    throw new Error("The voice session address was invalid.");
  return result.signed_url;
}

/** Reuse the recording pipeline when a local take needs a transcript for questions. */
export async function transcribeTake(
  recording: LiveRecording,
  signal: AbortSignal,
) {
  const transport = new AnalysisTransport(
    recording.config.endpoint,
    true,
    recording.config.featureFlags,
  );
  let result = recording;
  const abort = () => transport.close();
  signal.throwIfAborted();
  signal.addEventListener("abort", abort, { once: true });
  try {
    await transport.connect({ sessionId: recording.id }, (message) => {
      if (message.type === "transcript")
        result = {
          ...result,
          words: message.transcript.words,
          transcript: message.transcript,
        };
      if (message.type === "feedback")
        result = {
          ...result,
          feedback: upsertFeedback(result.feedback, message.feedback),
        };
      if (message.type === "metrics")
        result = { ...result, metrics: message.metrics };
    });
    await transport.finish(recording.durationMs, recording.video);
    return { ...result, analysisUploaded: true };
  } finally {
    signal.removeEventListener("abort", abort);
    transport.close();
  }
}

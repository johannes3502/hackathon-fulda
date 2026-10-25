import {
  callBackend,
  isObject as object,
  waitForBackendJob,
} from "../../lib/backend-job";
import type { components } from "../../../../api/schema";
import type { LiveFeedback, LiveMetric, LiveTranscript } from "./contracts";
import { feedbackEnabled, type FeatureFlags } from "./feature-flags";
import { reviewEventCopy } from "./review-copy";

type Word = components["schemas"]["Word"];
// Match the live-caption adapter's allowance for encoder/frame rounding.
// Imported timestamps remain strict; this only applies to backend results.
export const BACKEND_TIMESTAMP_TOLERANCE_MS = 250;
const time = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

export function apiEndpoint(value: string, secure: boolean) {
  const url = new URL(value, globalThis.location?.origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTP(S) backend URL without credentials, query or fragment.",
    );
  if (secure && url.protocol !== "https:")
    throw new Error("This page requires a secure HTTPS backend.");
  return url.toString().replace(/\/$/, "");
}

export { callBackend as request };

export async function waitForAudioJob(
  endpoint: string,
  accepted: unknown,
  signal: AbortSignal,
) {
  const result = await waitForBackendJob(
    endpoint,
    accepted,
    {
      statusPath: "/speech/jobs",
      label: "analysis",
      valid: (
        value,
      ): value is Record<string, unknown> & {
        audio: Record<string, unknown>;
      } => object(value) && object(value.audio),
    },
    signal,
    1000,
  );
  return {
    ...result,
    words: result.words,
    events: result.events,
    transcription: result.transcription,
    summary: result.audio.summary,
  };
}

export function parseWords(value: unknown, durationMs: number): Word[] {
  if (
    !Array.isArray(value) ||
    value.length > 50000 ||
    !value.length ||
    !value.every(
      (w) =>
        object(w) &&
        typeof w.word === "string" &&
        !!w.word.trim() &&
        time(w.start_ms) &&
        time(w.end_ms) &&
        Number.isInteger(w.start_ms) &&
        Number.isInteger(w.end_ms) &&
        w.start_ms <= w.end_ms &&
        w.end_ms <= durationMs,
    )
  )
    throw new Error(
      "Provide a JSON array of words with word, start_ms and end_ms within this recording.",
    );
  if (
    value.some(
      (word, index) => index > 0 && word.start_ms < value[index - 1].start_ms,
    )
  )
    throw new Error("Transcript words must be ordered by their start time.");
  return value as Word[];
}

export function parseTranscript(
  value: unknown,
  durationMs: number,
): LiveTranscript {
  if (
    !object(value) ||
    !Array.isArray(value.words) ||
    (value.asr_provider !== null && typeof value.asr_provider !== "string") ||
    typeof value.synthetic_demo !== "boolean" ||
    !Array.isArray(value.notices) ||
    !value.notices.every((n) => typeof n === "string")
  )
    throw new Error("The backend returned an invalid transcript.");
  const endMs = Math.floor(durationMs);
  const words = value.words.length
    ? parseWords(value.words, durationMs + BACKEND_TIMESTAMP_TOLERANCE_MS)
    : [];
  const aligned = words.some((word) => word.end_ms > endMs);
  return {
    words: words.map((word) => ({
      ...word,
      start_ms: Math.min(word.start_ms, endMs),
      end_ms: Math.min(word.end_ms, endMs),
    })),
    provider: value.asr_provider as string | null,
    synthetic: value.synthetic_demo,
    notices: [
      ...(value.notices as string[]),
      ...(aligned
        ? ["Word timestamps at the end were aligned to the recording duration."]
        : []),
    ],
  };
}

export function analysisResult(
  value: unknown,
  source: "speech" | "words",
  durationMs: number,
  flags?: FeatureFlags,
  timestampToleranceMs = 0,
) {
  if (!object(value) || !object(value.summary) || !Array.isArray(value.events))
    throw new Error("The backend returned an invalid analysis.");
  const feedback: LiveFeedback[] = value.events.map((e, i) => {
    if (
      !object(e) ||
      !time(e.t_ms) ||
      !time(e.duration_ms) ||
      e.t_ms > durationMs + timestampToleranceMs ||
      ![
        "posture",
        "gesture",
        "gaze",
        "filler",
        "pause",
        "pace",
        "volume",
        "pitch",
        "fact",
        "question",
      ].includes(String(e.type)) ||
      !["info", "hint", "warning"].includes(String(e.severity)) ||
      !object(e.payload)
    )
      throw new Error("The backend returned an invalid event.");
    const direction =
      typeof e.payload.direction === "string"
        ? ` · ${e.payload.direction}`
        : "";
    const word =
      typeof e.payload.word === "string" ? `: “${e.payload.word}”` : "";
    return {
      id: `${e.source === "asr" ? "words" : source}-${i}`,
      category: String(e.type),
      startMs: Math.min(durationMs, e.t_ms),
      endMs: Math.min(durationMs, e.t_ms + e.duration_ms),
      title: `${e.type}${direction}${word}`,
      ...reviewEventCopy({
        type: String(e.type),
        source: e.source ?? (source === "words" ? "asr" : "speech"),
        severity: String(e.severity),
        durationMs: Math.max(
          0,
          Math.min(durationMs, e.t_ms + e.duration_ms) -
            Math.min(durationMs, e.t_ms),
        ),
        payload: e.payload,
      }),
    };
  });
  const metrics: LiveMetric[] = Object.entries(value.summary).map(
    ([key, value]) => {
      if (
        value !== null &&
        (typeof value !== "number" || !Number.isFinite(value))
      )
        throw new Error("The backend returned an invalid measurement.");
      return {
        id: `${source}-${key}`,
        label: `${source === "speech" ? "Audio" : "Transcript"}: ${key.replaceAll("_", " ")}`,
        value,
      };
    },
  );
  return {
    feedback: feedback.filter((item) => feedbackEnabled(item.category, flags)),
    metrics,
  };
}

import type { components } from "../../../../api/schema";
import type { LiveFeedback, LiveMetric, LiveTranscript } from "./contracts";

type Word = components["schemas"]["Word"];
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
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

export async function request(
  endpoint: string,
  path: string,
  signal: AbortSignal,
  init?: RequestInit,
) {
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      if (typeof body.detail === "string")
        detail = ` ${body.detail.slice(0, 250)}`;
    } catch {}
    throw new Error(
      `Backend ${path} failed (HTTP ${response.status}).${detail}`,
    );
  }
  if (response.status === 204) return undefined;
  return response.json() as Promise<unknown>;
}

export async function waitForAudioJob(
  endpoint: string,
  accepted: unknown,
  signal: AbortSignal,
) {
  if (
    !object(accepted) ||
    typeof accepted.job_id !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(accepted.job_id)
  )
    throw new Error("The backend returned an invalid analysis job.");
  const active = AbortSignal.any([signal, AbortSignal.timeout(660000)]);
  while (true) {
    active.throwIfAborted();
    const job = await request(
      endpoint,
      `/speech/jobs/${accepted.job_id}`,
      active,
    );
    if (!object(job) || job.job_id !== accepted.job_id)
      throw new Error("The backend returned an invalid analysis job.");
    if (job.status === "failed")
      throw new Error(
        "Audio analysis failed. Your local recording is preserved.",
      );
    if (job.status === "completed") {
      if (!object(job.result) || !object(job.result.audio))
        throw new Error("The backend returned an invalid analysis.");
      return {
        ...job.result,
        words: job.result.words,
        summary: job.result.audio.summary,
        events: job.result.events,
        transcription: job.result.transcription,
      };
    }
    if (job.status !== "queued" && job.status !== "running")
      throw new Error("The backend returned an invalid analysis job.");
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(active.reason);
      };
      const timer = setTimeout(() => {
        active.removeEventListener("abort", abort);
        resolve();
      }, 1000);
      active.addEventListener("abort", abort, { once: true });
      if (active.aborted) abort();
    });
  }
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
  return {
    words: value.words.length ? parseWords(value.words, durationMs) : [],
    provider: value.asr_provider as string | null,
    synthetic: value.synthetic_demo,
    notices: value.notices as string[],
  };
}

export function analysisResult(
  value: unknown,
  source: "speech" | "words",
  durationMs: number,
) {
  if (!object(value) || !object(value.summary) || !Array.isArray(value.events))
    throw new Error("The backend returned an invalid analysis.");
  const feedback: LiveFeedback[] = value.events.map((e, i) => {
    if (
      !object(e) ||
      !time(e.t_ms) ||
      !time(e.duration_ms) ||
      e.t_ms > durationMs ||
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
      kind: e.severity === "warning" ? "attention" : "suggestion",
      startMs: e.t_ms,
      endMs: Math.min(durationMs, e.t_ms + e.duration_ms),
      title: `${e.type}${direction}${word}`,
      detail: `${source === "words" || e.source === "asr" ? "Word timestamp" : "Audio signal"} heuristic. Review this observation in context; it is not a performance score.`,
      action:
        "Replay the surrounding seconds and decide whether you want to practice this moment.",
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
  return { feedback, metrics };
}

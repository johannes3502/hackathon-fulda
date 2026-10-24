import type { components } from "../../../../api/schema";
import type { LiveFeedback, LiveMetric } from "./contracts";

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
  if (!response.ok)
    throw new Error(
      `Backend ${path} failed (HTTP ${response.status}). Your local recording is preserved.`,
    );
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
        summary: job.result.audio.summary,
        events: job.result.events,
        words: job.result.words,
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
  return value as Word[];
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
      id: `${source}-${i}`,
      category: String(e.type),
      kind: e.severity === "warning" ? "attention" : "suggestion",
      startMs: e.t_ms,
      endMs: Math.min(durationMs, e.t_ms + e.duration_ms),
      title: `${e.type}${direction}${word}`,
      detail: `${source === "speech" && e.source !== "asr" ? "Audio signal" : "Word timestamp"} heuristic. Review this observation in context; it is not a performance score.`,
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

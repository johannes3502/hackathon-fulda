import { requestAbort, waitForPoll } from "./abort";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import {
  analysisResult,
  parseWords,
} from "../../frontend/src/features/live/analysis";
export function endpoint(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Enter your backend HTTP(S) address without credentials or a query.",
    );
  return url.toString().replace(/\/$/, "");
}
export async function api(
  base: string,
  path: string,
  signal: AbortSignal,
  init?: RequestInit,
) {
  const pending = requestAbort(signal, 120000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: pending.signal,
    });
    if (!response.ok)
      throw new Error(
        `Analysis service returned HTTP ${response.status}. Your recording is still on this device.`,
      );
    return await response.json();
  } finally {
    pending.dispose();
  }
}
export async function analyzeTake(
  base: string,
  uri: string,
  durationMs: number,
  signal: AbortSignal,
  onStatus: (message: string) => void,
) {
  const body = new FormData();
  body.append("recording", new File(uri));
  body.append("transcribe", "false");
  onStatus("Uploading recording…");
  const accepted = await api(base, "/speech/analyze", signal, {
    method: "POST",
    body,
  });
  if (
    typeof accepted?.job_id !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(accepted.job_id)
  )
    throw new Error("The backend returned an invalid job.");
  const deadline = Date.now() + 660000;
  while (true) {
    if (signal.aborted) throw new Error("Analysis cancelled.");
    if (Date.now() > deadline)
      throw new Error(
        "Analysis timed out. Your recording is still on this device.",
      );
    const job = await api(base, `/speech/jobs/${accepted.job_id}`, signal);
    if (job?.job_id !== accepted.job_id)
      throw new Error("The backend returned the wrong job.");
    if (job.status === "completed")
      return analysisResult(
        { summary: job.result?.audio?.summary, events: job.result?.events },
        "speech",
        durationMs,
      );
    if (job.status === "failed")
      throw new Error(
        "Audio analysis failed. Your recording is still on this device.",
      );
    if (!["queued", "running"].includes(job.status))
      throw new Error("The backend returned an invalid job status.");
    onStatus(
      job.status === "queued" ? "Waiting for analysis…" : "Analyzing audio…",
    );
    await waitForPoll(signal);
  }
}
export async function analyzeTranscript(
  base: string,
  content: string,
  durationMs: number,
  signal: AbortSignal,
) {
  const words = parseWords(JSON.parse(content), durationMs);
  return analysisResult(
    await api(base, "/transcription/analyze-words", signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
    }),
    "words",
    durationMs,
  );
}

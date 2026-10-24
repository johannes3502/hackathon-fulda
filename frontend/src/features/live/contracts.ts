import type { components } from "../../../../api/schema";

export type Word = components["schemas"]["Word"];
export type FactCheckResult = components["schemas"]["FactCheckResult"];
export type FeedbackKind = "positive" | "suggestion" | "attention";
export type LiveFeedback = {
  id: string;
  category: string;
  kind: FeedbackKind;
  startMs: number;
  endMs: number;
  title: string;
  detail: string;
  action: string;
};
export type LiveMetric = {
  id: string;
  label: string;
  value: string | number | null;
  unit?: string;
};
export type LiveConfig = {
  title: string;
  targetMs: number;
  mode: "demo" | "backend";
  endpoint: string;
  /** Backend mode: send audio to the configured ASR for word timestamps. */
  transcribe?: boolean;
};
export type VideoChunkMeta = {
  type: "video.chunk";
  sessionId: string;
  seq: number;
  startMs: number;
  endMs: number;
  byteLength: number;
};
export type LiveMessage =
  | { type: "feedback"; sessionId: string; feedback: LiveFeedback }
  | { type: "metrics"; sessionId: string; atMs: number; metrics: LiveMetric[] }
  | { type: "transcript"; sessionId: string; words: Word[] }
  | { type: "error"; sessionId: string; message: string };
export type LiveProgress = {
  phase: "connecting" | "recording" | "finishing";
  elapsedMs: number;
  chunksSent: number;
  bytesSent: number;
  feedback: LiveFeedback[];
  metrics: LiveMetric[];
  words?: Word[];
  notice: string | null;
};
export type LiveRecording = {
  poseLog?: Blob;
  id: string;
  config: LiveConfig;
  createdAt: string;
  durationMs: number;
  video: Blob;
  videoUrl: string;
  mimeType: string;
  feedback: LiveFeedback[];
  metrics: LiveMetric[];
  chunksSent: number;
  bytesSent: number;
  completion: "complete" | "interrupted";
  notice: string | null;
  /** Word timestamps from ASR or an imported transcript; input of the fact-check. */
  words?: Word[];
  factCheck?: FactCheckResult;
};
export interface VideoTransport {
  connect(
    session: { sessionId: string; title: string; mimeType: string },
    receive: (message: LiveMessage) => void,
  ): Promise<void>;
  send(chunk: Blob, meta: VideoChunkMeta): Promise<void>;
  finish(durationMs: number, recording?: Blob): Promise<void>;
  close(): void;
}

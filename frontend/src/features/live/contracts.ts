import type { PoseEvent } from "../pose/evaluation";
export type FeedbackKind =
  "positive" | "suggestion" | "attention" | "observation";
export type LiveFeedback = {
  evidence?: PoseEvent;
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
  mode: "local" | "backend";
  endpoint: string;
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
  | { type: "error"; sessionId: string; message: string };
export type LiveProgress = {
  phase: "connecting" | "recording" | "finishing";
  elapsedMs: number;
  chunksSent: number;
  bytesSent: number;
  feedback: LiveFeedback[];
  metrics: LiveMetric[];
  notice: string | null;
};
export type LiveRecording = {
  poseEvents?: PoseEvent[];
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

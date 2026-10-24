export type SessionPhase =
  | "preflight"
  | "countdown"
  | "presenting"
  | "judge_thinking"
  | "judge_question"
  | "answering"
  | "report_pending"
  | "review";
export type AttemptRef = { sessionId: string; attemptId: string };
export type SessionConfig = {
  title: string;
  context: string;
  audience: "hackathon" | "investor" | "examiner";
  targetDurationMs: number;
  mode: "coach" | "simulation";
  criteria: string[];
};
export type Observation<T> = {
  value: T | null;
  quality: "good" | "limited" | "unavailable";
  reason?: string;
};
export type Metrics = {
  paceWpm: Observation<number>;
  fillerCount: Observation<number>;
  posture: Observation<"steady" | "repeated_sway">;
  gestures: Observation<"visible" | "limited_view">;
  vocalVariation: Observation<"varied" | "limited">;
};
export type TranscriptSegment = {
  id: string;
  revision: number;
  speaker: "presenter" | "judge";
  turnId?: string;
  startMs: number;
  endMs: number;
  text: string;
  isFinal: boolean;
};
export type EvidenceRef = {
  attemptId: string;
  segmentIds: string[];
  startMs: number;
  endMs: number;
  quote?: string;
};
export type CoachCue = {
  id: string;
  category: "delivery" | "content" | "capture";
  message: string;
  priority: 1 | 2 | 3;
  expiresAtMs: number;
  evidence?: EvidenceRef;
};
export type JudgeQuestion = {
  id: string;
  turnId: string;
  parentQuestionId?: string;
  text: string;
  evidence: EvidenceRef;
};
export type FeedbackItem = {
  id: string;
  category: "delivery" | "content" | "qa";
  title: string;
  observation: string;
  nextAction: string;
  priority: 1 | 2 | 3;
  evidence: EvidenceRef;
  retryable: boolean;
};
export type SessionReport = {
  ref: AttemptRef;
  completion: "complete" | "partial";
  durationMs: number;
  strengths: string[];
  findings: FeedbackItem[];
  transcript: TranscriptSegment[];
  comparison?: {
    priorAttemptId: string;
    findingId: string;
    criterion: string;
    before: string;
    after: string;
    result: "improved" | "needs_work" | "not_comparable";
  };
};
export type SessionSnapshot = {
  ref: AttemptRef;
  config: SessionConfig;
  phase: SessionPhase;
  completedReports: SessionReport[];
};
export type AnswerChoice = {
  id: "vague" | "direct";
  label: string;
  text: string;
};
export type SessionState = SessionSnapshot & {
  transcript: TranscriptSegment[];
  metrics: Metrics;
  metricUpdatedAt: Partial<Record<keyof Metrics, number>>;
  cues: CoachCue[];
  activeCue: CoachCue | null;
  coverage: string[];
  question: JudgeQuestion | null;
  answerChoices: AnswerChoice[];
  atMs: number;
  presentationMs: number;
  answerMs: number;
  phaseStartedMs: number;
  isPaused: boolean;
  connection: "connected" | "interrupted" | "closed";
  error: string | null;
  seq: number;
  eventIds: string[];
  selectedEvidence: EvidenceRef | null;
  retryTarget: { finding: FeedbackItem; priorAttemptId: string } | null;
};
export type EventPayload =
  | { type: "phase.changed"; phase: SessionPhase }
  | { type: "transcript.updated"; segment: TranscriptSegment }
  | { type: "metrics.updated"; patch: Partial<Metrics> }
  | { type: "cue.created"; cue: CoachCue }
  | { type: "coverage.updated"; items: string[] }
  | { type: "judge.question"; question: JudgeQuestion; choices: AnswerChoice[] }
  | { type: "report.ready"; report: SessionReport }
  | { type: "stream.status"; status: SessionState["connection"] }
  | { type: "session.error"; message: string; recoverable: boolean }
  | { type: "clock.updated"; presentationMs: number; answerMs: number }
  | { type: "pause.changed"; isPaused: boolean };
export type CoachEvent = AttemptRef & {
  eventId: string;
  seq: number;
  atMs: number;
  origin: "mock" | "live";
} & EventPayload;
export type CoachCommand =
  | { type: "start" | "pause" | "resume" | "finish_pitch" | "finish_qa" }
  | { type: "start_answer"; turnId: string }
  | { type: "submit_answer"; turnId: string; text: string };
export interface CoachGateway {
  createSession(config: SessionConfig): Promise<SessionSnapshot>;
  getSession(sessionId: string): Promise<SessionState>;
  subscribe(ref: AttemptRef, onEvent: (event: CoachEvent) => void): () => void;
  send(ref: AttemptRef, command: CoachCommand): Promise<void>;
  getReport(ref: AttemptRef): Promise<SessionReport>;
  createRetry(ref: AttemptRef, findingId: string): Promise<SessionState>;
}
export type DemoCommand =
  | "reset"
  | "next"
  | "qa"
  | "review"
  | "interrupt"
  | "fail"
  | "recover"
  | "speed";
export interface DemoGateway {
  demo(
    ref: AttemptRef,
    command: DemoCommand,
    speed?: number,
  ): Promise<SessionState>;
}

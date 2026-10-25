import type {
  AttemptRef,
  CoachCommand,
  CoachEvent,
  CoachGateway,
  DemoCommand,
  DemoGateway,
  EventPayload,
  EvidenceRef,
  FeedbackItem,
  SessionConfig,
  SessionReport,
  SessionState,
  TranscriptSegment,
} from "../contracts";
import { initialState, sessionReducer } from "../reducer";
import { loadSession, saveSession } from "../session-repository";
import { ActiveClock } from "./clock";
import { answers, defaults, presentation } from "./fixtures/scenario";

type Runtime = {
  state: SessionState;
  clock: ActiveClock;
  listeners: Set<(event: CoachEvent) => void>;
  timer?: ReturnType<typeof setInterval>;
  index: number;
  branch: "vague" | "direct";
  turn: number;
  failNext: boolean;
};
const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 350));
export class MockCoachGateway implements CoachGateway, DemoGateway {
  private sessions = new Map<string, Runtime>();
  constructor(
    private now: () => number = () => performance.now(),
    private newId: () => string = () => crypto.randomUUID(),
  ) {}
  getDefaults() {
    return structuredClone(defaults);
  }
  getDemoSpeed(ref: AttemptRef) {
    return this.runtime(ref).clock.getSpeed();
  }
  private make(state: SessionState): Runtime {
    const clock = new ActiveClock(this.now);
    clock.seek(state.atMs);
    return {
      state,
      clock,
      listeners: new Set(),
      index: 0,
      branch: "vague",
      turn: 0,
      failNext: false,
    };
  }
  private runtime(ref: AttemptRef) {
    const rt = this.sessions.get(ref.sessionId);
    if (!rt || rt.state.ref.attemptId !== ref.attemptId)
      throw new Error(
        "This attempt is no longer active. Open the current session or start again.",
      );
    return rt;
  }
  private emit(rt: Runtime, payload: EventPayload, atMs = rt.clock.read()) {
    const seq = rt.state.seq + 1;
    const event: CoachEvent = {
      ...rt.state.ref,
      seq,
      eventId: `${rt.state.ref.attemptId}:${seq}`,
      atMs,
      origin: "mock",
      ...payload,
    };
    rt.state = sessionReducer(rt.state, { type: "event", event });
    rt.listeners.forEach((listener) => listener(event));
    if (payload.type !== "clock.updated") saveSession(rt.state);
  }
  async createSession(config: SessionConfig) {
    if (
      !config.title.trim() ||
      !config.context.trim() ||
      config.title.length > 100 ||
      config.context.length > 2000 ||
      ![60000, 180000, 300000].includes(config.targetDurationMs) ||
      !["coach", "simulation"].includes(config.mode) ||
      !["hackathon", "investor", "examiner"].includes(config.audience)
    )
      throw new Error(
        "Add a title and context, then choose a supported practice duration.",
      );
    await delay();
    const ref = { sessionId: this.newId(), attemptId: "attempt-1" };
    const state = initialState({
      ref,
      config: {
        ...config,
        title: config.title.trim(),
        context: config.context.trim(),
      },
      phase: "preflight",
      completedReports: [],
    });
    this.sessions.set(ref.sessionId, this.make(state));
    saveSession(state);
    return state;
  }
  async getSession(id: string) {
    const existing = this.sessions.get(id);
    if (existing) return existing.state;
    const stored = loadSession(id);
    if (!stored)
      throw new Error(
        "This practice session is missing or its saved data could not be read.",
      );
    if (!["preflight", "review"].includes(stored.phase)) {
      stored.connection = "interrupted";
      stored.isPaused = true;
    }
    this.sessions.set(id, this.make(stored));
    return stored;
  }
  subscribe(ref: AttemptRef, listener: (event: CoachEvent) => void) {
    const rt = this.runtime(ref);
    rt.listeners.add(listener);
    if (!rt.timer) {
      if (
        !rt.state.isPaused &&
        !["preflight", "review"].includes(rt.state.phase)
      )
        rt.clock.resume();
      rt.timer = setInterval(() => this.tick(rt), 100);
    }
    return () => {
      rt.listeners.delete(listener);
      if (!rt.listeners.size) {
        clearInterval(rt.timer);
        rt.timer = undefined;
        rt.clock.pause();
        saveSession(rt.state);
      }
    };
  }
  private evidence(rt: Runtime, s: TranscriptSegment): EvidenceRef {
    return {
      attemptId: rt.state.ref.attemptId,
      segmentIds: [s.id],
      startMs: s.startMs,
      endMs: s.endMs,
      quote: s.text,
    };
  }
  private question(rt: Runtime) {
    const state = rt.state;
    const source =
      state.transcript.find((s) => s.id === "claim") ??
      state.transcript.find((s) => s.isFinal && s.speaker === "presenter");
    if (!source) {
      this.emit(rt, { type: "phase.changed", phase: "report_pending" });
      return;
    }
    rt.turn += 1;
    const followup = rt.turn > 1;
    const text = followup
      ? rt.branch === "vague"
        ? "You described a positive reaction, but not a measurement. What exactly improved by 50 percent, and compared with what?"
        : "You have separated the hypothesis from the evidence. How would you design a pilot that could prove your assumption wrong?"
      : source.id === "claim"
        ? "You said understanding improves by 50 percent. What does that number measure, and what evidence supports it?"
        : "How would you test this idea, and what evidence would make you change your mind?";
    const question = {
      id: `question-${rt.turn}`,
      turnId: `turn-${rt.turn}`,
      ...(followup ? { parentQuestionId: state.question!.id } : {}),
      text,
      evidence: this.evidence(rt, source),
    };
    this.emit(rt, { type: "judge.question", question, choices: answers });
    this.emit(rt, {
      type: "transcript.updated",
      segment: {
        id: question.id,
        revision: 1,
        speaker: "judge",
        turnId: question.turnId,
        startMs: rt.clock.read(),
        endMs: rt.clock.read(),
        text,
        isFinal: true,
      },
    });
    this.emit(rt, { type: "phase.changed", phase: "judge_question" });
  }
  private report(rt: Runtime): SessionReport {
    const s = rt.state;
    const claim = s.transcript.find((t) => t.id === "claim" && t.isFinal);
    const answer = s.transcript
      .filter((t) => t.id.startsWith("answer-"))
      .at(-1);
    const solution = s.transcript.find((t) => t.id === "solution" && t.isFinal);
    const findings: FeedbackItem[] = [];
    if (claim && !s.retryTarget)
      findings.push({
        id: "evidence",
        category: "content",
        title: "Give your claim a foundation",
        observation:
          "The sample presentation claims a 50% improvement without naming a measure or a baseline.",
        nextAction:
          "Separate the hypothesis from the result. Say what you will measure and what remains untested.",
        priority: 1,
        evidence: this.evidence(rt, claim),
        retryable: true,
      });
    if (answer)
      findings.push({
        id: "answer",
        category: "qa",
        title:
          rt.branch === "direct"
            ? "Keep the validation gap explicit"
            : "Answer the evidence question directly",
        observation:
          rt.branch === "direct"
            ? "The selected sample answer calls the number a hypothesis and proposes a comparison."
            : "The selected sample answer describes a positive reaction instead of a measurement.",
        nextAction:
          "Name the measure, the baseline, and one limitation in your next answer.",
        priority: 2,
        evidence: this.evidence(rt, answer),
        retryable: true,
      });
    if (solution && !s.retryTarget)
      findings.push({
        id: "pace",
        category: "delivery",
        title: "Let the central idea land",
        observation:
          "The sample pace rises to 182 words per minute around the explanation of the learning activity.",
        nextAction:
          "Pause after ‘the teacher decides’ before moving to your evidence.",
        priority: 3,
        evidence: this.evidence(rt, solution),
        retryable: false,
      });
    const report: SessionReport = {
      ref: s.ref,
      completion:
        s.presentationMs >= 28000 || (!!s.retryTarget && !!answer)
          ? "complete"
          : "partial",
      durationMs: s.atMs,
      findings,
      strengths: solution
        ? [
            "The sample clearly separates the AI’s role from the teacher’s decision.",
          ]
        : answer && rt.branch === "direct"
          ? ["The sample answer acknowledges what has not yet been validated."]
          : [],
      transcript: s.transcript.filter((t) => t.isFinal),
    };
    if (s.retryTarget) {
      const prior = s.completedReports.find(
        (r) => r.ref.attemptId === s.retryTarget!.priorAttemptId,
      );
      const baseline = prior?.transcript
        .filter((t) => t.id.startsWith("answer-"))
        .at(-1);
      const before =
        baseline?.text ??
        s.retryTarget.finding.evidence.quote ??
        "No comparable answer was captured.";
      report.comparison = {
        priorAttemptId: s.retryTarget.priorAttemptId,
        findingId: s.retryTarget.finding.id,
        criterion: "Supporting evidence and acknowledged limitations",
        before,
        after: answer?.text ?? "No answer was submitted.",
        result: !answer
          ? "not_comparable"
          : rt.branch === "direct" && before !== answer.text
            ? "improved"
            : "needs_work",
      };
    }
    return report;
  }
  private tick(rt: Runtime) {
    if (
      rt.state.isPaused ||
      rt.state.connection !== "connected" ||
      ["preflight", "review"].includes(rt.state.phase)
    )
      return;
    const now = rt.clock.read();
    if (
      rt.state.phase === "countdown" &&
      now - rt.state.phaseStartedMs >= 3000
    ) {
      const start = rt.state.phaseStartedMs + 3000;
      if (rt.state.retryTarget) {
        const prior = rt.state.completedReports.find(
          (r) => r.ref.attemptId === rt.state.retryTarget!.priorAttemptId,
        );
        const source =
          prior?.transcript.find((t) => t.id === "claim") ??
          prior?.transcript.find((t) => t.speaker === "presenter");
        if (source)
          this.emit(
            rt,
            {
              type: "transcript.updated",
              segment: {
                ...source,
                id: "claim",
                speaker: "judge",
                turnId: undefined,
                text: source.text,
                startMs: start,
                endMs: start,
                revision: 1,
                isFinal: true,
              },
            },
            start,
          );
        this.emit(
          rt,
          { type: "phase.changed", phase: "judge_thinking" },
          start,
        );
      } else
        this.emit(rt, { type: "phase.changed", phase: "presenting" }, start);
    }
    if (rt.state.phase === "presenting") {
      const start = rt.state.phaseStartedMs;
      const limit = rt.state.retryTarget
        ? 30000
        : rt.state.config.targetDurationMs;
      const elapsed = Math.min(now - start, limit);
      while (
        rt.index < presentation.length &&
        presentation[rt.index].offset <= elapsed
      ) {
        const event = presentation[rt.index++];
        this.emit(rt, event.payload, start + event.offset);
      }
      this.emit(
        rt,
        { type: "clock.updated", presentationMs: elapsed, answerMs: 0 },
        Math.min(now, start + limit),
      );
      if (elapsed >= limit)
        this.emit(
          rt,
          { type: "phase.changed", phase: "judge_thinking" },
          start + limit,
        );
    } else
      this.emit(
        rt,
        {
          type: "clock.updated",
          presentationMs: rt.state.presentationMs,
          answerMs:
            rt.state.phase === "answering"
              ? now - rt.state.phaseStartedMs
              : rt.state.answerMs,
        },
        now,
      );
    if (
      rt.state.phase === "judge_thinking" &&
      now - rt.state.phaseStartedMs >= 900
    )
      this.question(rt);
    if (
      rt.state.phase === "report_pending" &&
      now - rt.state.phaseStartedMs >= 900
    ) {
      this.emit(rt, { type: "report.ready", report: this.report(rt) });
      this.emit(rt, { type: "phase.changed", phase: "review" });
      rt.clock.pause();
    }
  }
  async send(ref: AttemptRef, command: CoachCommand) {
    const rt = this.runtime(ref);
    if (rt.failNext) {
      rt.failNext = false;
      throw new Error(
        "Simulated request failed. Your session is safe; try the action again.",
      );
    }
    if (command.type === "pause") {
      this.tick(rt);
      rt.clock.pause();
      this.emit(rt, { type: "pause.changed", isPaused: true });
      return;
    }
    if (command.type === "resume") {
      this.emit(rt, { type: "stream.status", status: "connected" });
      this.emit(rt, { type: "pause.changed", isPaused: false });
      rt.clock.resume();
      return;
    }
    if (rt.state.isPaused || rt.state.connection !== "connected")
      throw new Error("Resume the session before continuing.");
    this.tick(rt);
    const phase = rt.state.phase;
    if (command.type === "start" && phase === "preflight") {
      rt.clock.resume();
      this.emit(rt, { type: "phase.changed", phase: "countdown" });
    } else if (command.type === "finish_pitch" && phase === "presenting")
      this.emit(rt, { type: "phase.changed", phase: "judge_thinking" });
    else if (
      command.type === "start_answer" &&
      phase === "judge_question" &&
      command.turnId === rt.state.question?.turnId
    )
      this.emit(rt, { type: "phase.changed", phase: "answering" });
    else if (
      command.type === "submit_answer" &&
      phase === "answering" &&
      command.turnId === rt.state.question?.turnId
    ) {
      const choice = answers.find((a) => a.text === command.text);
      if (!choice)
        throw new Error(
          "Choose one of the labeled sample answers. This demo does not evaluate free text.",
        );
      rt.branch = choice.id;
      this.emit(rt, {
        type: "transcript.updated",
        segment: {
          id: `answer-${rt.turn}`,
          revision: 1,
          speaker: "presenter",
          turnId: command.turnId,
          startMs: rt.state.phaseStartedMs,
          endMs: rt.clock.read(),
          text: choice.text,
          isFinal: true,
        },
      });
      this.emit(rt, {
        type: "phase.changed",
        phase:
          rt.turn >= 2 || rt.state.retryTarget
            ? "report_pending"
            : "judge_thinking",
      });
    } else if (
      command.type === "finish_qa" &&
      ["judge_question", "answering"].includes(phase)
    )
      this.emit(rt, { type: "phase.changed", phase: "report_pending" });
  }
  async getReport(ref: AttemptRef) {
    const report = this.runtime(ref).state.completedReports.find(
      (r) => r.ref.attemptId === ref.attemptId,
    );
    if (!report) throw new Error("Your report is not ready yet.");
    return report;
  }
  async createRetry(ref: AttemptRef, findingId: string) {
    const rt = this.runtime(ref);
    const report = await this.getReport(ref);
    const finding = report.findings.find(
      (f) => f.id === findingId && f.retryable,
    );
    if (!finding)
      throw new Error("This finding does not have a retry scenario.");
    clearInterval(rt.timer);
    rt.clock.pause();
    const state = initialState({
      ref: {
        sessionId: ref.sessionId,
        attemptId: `attempt-${Number(ref.attemptId.split("-")[1]) + 1}`,
      },
      config: rt.state.config,
      completedReports: rt.state.completedReports,
      phase: "preflight",
    });
    state.retryTarget = { finding, priorAttemptId: ref.attemptId };
    this.sessions.set(ref.sessionId, this.make(state));
    saveSession(state);
    return state;
  }
  async demo(ref: AttemptRef, command: DemoCommand, speed = 1) {
    let rt = this.runtime(ref);
    if (command === "reset" || command === "qa" || command === "review") {
      clearInterval(rt.timer);
      rt.clock.pause();
      const state = initialState({
        ref: {
          ...ref,
          attemptId: `attempt-${Number(ref.attemptId.split("-")[1]) + 1}`,
        },
        config: rt.state.config,
        phase: "preflight",
        completedReports: rt.state.completedReports,
      });
      state.retryTarget = rt.state.retryTarget;
      rt = this.make(state);
      this.sessions.set(ref.sessionId, rt);
      if (command !== "reset") {
        await this.send(rt.state.ref, { type: "start" });
        rt.clock.seek(31000);
        this.tick(rt);
        await this.send(rt.state.ref, { type: "finish_pitch" });
        rt.clock.seek(32000);
        this.tick(rt);
        if (command === "review") {
          await this.send(rt.state.ref, {
            type: "start_answer",
            turnId: rt.state.question!.turnId,
          });
          await this.send(rt.state.ref, {
            type: "submit_answer",
            turnId: rt.state.question!.turnId,
            text: answers[0].text,
          });
          rt.clock.seek(33000);
          this.tick(rt);
          if (rt.state.phase === "judge_question")
            await this.send(rt.state.ref, { type: "finish_qa" });
          rt.clock.seek(34000);
          this.tick(rt);
        }
      }
    } else if (command === "interrupt") {
      await this.send(ref, { type: "pause" });
      this.emit(rt, { type: "stream.status", status: "interrupted" });
    } else if (command === "recover") await this.send(ref, { type: "resume" });
    else if (command === "fail") rt.failNext = true;
    else if (command === "speed") rt.clock.setSpeed(speed);
    else if (command === "next" && !rt.state.isPaused) {
      if (rt.state.phase === "preflight")
        await this.send(ref, { type: "start" });
      const s = rt.state;
      const target =
        s.phase === "presenting"
          ? s.phaseStartedMs +
            (presentation[rt.index]?.offset ?? s.config.targetDurationMs)
          : s.phase === "countdown"
            ? s.phaseStartedMs + 3000
            : ["judge_thinking", "report_pending"].includes(s.phase)
              ? s.phaseStartedMs + 900
              : s.atMs;
      rt.clock.seek(Math.max(s.atMs, target));
      this.tick(rt);
    }
    saveSession(rt.state);
    return rt.state;
  }
  /** Test hook: advance the injected monotonic clock, then flush scheduled events. */
  flush(ref: AttemptRef) {
    this.tick(this.runtime(ref));
  }
}

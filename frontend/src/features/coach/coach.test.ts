import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveClock } from "./mock/clock";
import { MockCoachGateway } from "./mock/MockCoachGateway";
import { currentObservation, initialState, sessionReducer } from "./reducer";
import type { CoachEvent, EventPayload, SessionState } from "./contracts";
import { loadSession } from "./session-repository";

let now = 0;
beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function create() {
  const gateway = new MockCoachGateway(() => now);
  const creation = gateway.createSession(gateway.getDefaults());
  await vi.advanceTimersByTimeAsync(350);
  const state = await creation;
  return { gateway, ref: state.ref };
}
describe("monotonic sample clock", () => {
  it("freezes ten seconds of pause and preserves playback speed without counting callbacks", () => {
    const clock = new ActiveClock(() => now);
    clock.resume();
    now = 1200;
    expect(clock.read()).toBe(1200);
    clock.pause();
    now += 10000;
    expect(clock.read()).toBe(1200);
    clock.resume();
    now += 800;
    expect(clock.read()).toBe(2000);
    clock.setSpeed(4);
    now += 1000;
    expect(clock.read()).toBe(6000);
  });
});
describe("event normalization", () => {
  function setup() {
    const gateway = new MockCoachGateway();
    return initialState({
      ref: { sessionId: "test", attemptId: "attempt-1" },
      config: gateway.getDefaults(),
      phase: "presenting",
      completedReports: [],
    });
  }
  function event(
    state: SessionState,
    payload: EventPayload,
    seq = state.seq + 1,
  ): CoachEvent {
    return {
      ...state.ref,
      seq,
      eventId: `e-${seq}`,
      atMs: seq * 1000,
      origin: "mock",
      ...payload,
    };
  }
  it("upserts partial revisions and commits a final segment once", () => {
    let state = setup();
    const segment = {
      id: "one",
      revision: 1,
      text: "What if",
      speaker: "presenter" as const,
      startMs: 0,
      endMs: 1000,
      isFinal: false,
    };
    state = sessionReducer(state, {
      type: "event",
      event: event(state, { type: "transcript.updated", segment }),
    });
    state = sessionReducer(state, {
      type: "event",
      event: event(state, {
        type: "transcript.updated",
        segment: {
          ...segment,
          text: "What if we practiced?",
          revision: 2,
          isFinal: true,
        },
      }),
    });
    state = sessionReducer(state, {
      type: "event",
      event: event(state, {
        type: "transcript.updated",
        segment: { ...segment, text: "late partial", revision: 3 },
      }),
    });
    expect(state.transcript).toHaveLength(1);
    expect(state.transcript[0].text).toBe("What if we practiced?");
  });
  it("rejects duplicate, out-of-order, old-attempt and old-turn events", () => {
    let state = setup();
    const e = event(state, { type: "coverage.updated", items: ["Problem"] });
    state = sessionReducer(state, { type: "event", event: e });
    expect(sessionReducer(state, { type: "event", event: e })).toBe(state);
    expect(
      sessionReducer(state, {
        type: "event",
        event: { ...e, seq: 9, attemptId: "old" },
      }),
    ).toBe(state);
    expect(
      sessionReducer(state, {
        type: "event",
        event: { ...e, seq: 0, eventId: "older" },
      }),
    ).toBe(state);
    state = {
      ...state,
      phase: "judge_thinking",
      question: {
        id: "q2",
        turnId: "turn-2",
        evidence: {
          attemptId: "attempt-1",
          segmentIds: [],
          startMs: 0,
          endMs: 0,
        },
        text: "Current",
      },
    };
    expect(
      sessionReducer(state, {
        type: "event",
        event: event(state, {
          type: "judge.question",
          question: {
            ...state.question!,
            id: "late",
            turnId: "turn-1",
            parentQuestionId: "q1",
          },
          choices: [],
        }),
      }),
    ).toBe(state);
    expect(
      sessionReducer(state, {
        type: "event",
        event: event(state, {
          type: "transcript.updated",
          segment: {
            id: "late",
            turnId: "turn-1",
            revision: 1,
            text: "Wrong answer",
            speaker: "presenter",
            startMs: 0,
            endMs: 0,
            isFinal: true,
          },
        }),
      }),
    ).toBe(state);
  });
  it("patches individual metrics and keeps null unavailable rather than zero", () => {
    let state = setup();
    state = sessionReducer(state, {
      type: "event",
      event: event(state, {
        type: "metrics.updated",
        patch: { paceWpm: { value: 148, quality: "good" } },
      }),
    });
    state = sessionReducer(state, {
      type: "event",
      event: event(state, {
        type: "metrics.updated",
        patch: { gestures: { value: null, quality: "unavailable" } },
      }),
    });
    expect(state.metrics.paceWpm.value).toBe(148);
    expect(state.metrics.gestures.value).toBeNull();
    expect(currentObservation({ ...state, atMs: 18000 }, "paceWpm")).toEqual({
      value: null,
      quality: "unavailable",
      reason: "No recent sample observation",
    });
  });
  it("expires cues on active time and suppresses equivalent cues during cooldown", () => {
    let state = setup();
    const cue = {
      id: "cue",
      category: "delivery" as const,
      message: "Pause",
      priority: 2 as const,
      expiresAtMs: 5000,
    };
    state = sessionReducer(state, {
      type: "event",
      event: event(state, { type: "cue.created", cue }),
    });
    state = sessionReducer(state, {
      type: "event",
      event: event(state, {
        type: "cue.created",
        cue: { ...cue, id: "repeat" },
      }),
    });
    expect(state.cues).toHaveLength(1);
    state = sessionReducer(state, {
      type: "event",
      event: {
        ...event(state, {
          type: "clock.updated",
          presentationMs: 5000,
          answerMs: 0,
        }),
        atMs: 5000,
      },
    });
    expect(state.activeCue).toBeNull();
  });
});
describe("mock rehearsal", () => {
  it("freezes the timer, transcript, cues and scenario during pause", async () => {
    const { gateway, ref } = await create();
    await gateway.send(ref, { type: "start" });
    now = 13000;
    gateway.flush(ref);
    await gateway.send(ref, { type: "pause" });
    const paused = await gateway.getSession(ref.sessionId);
    now += 10000;
    gateway.flush(ref);
    expect(await gateway.getSession(ref.sessionId)).toEqual(paused);
    await gateway.send(ref, { type: "resume" });
    now += 8000;
    gateway.flush(ref);
    const resumed = await gateway.getSession(ref.sessionId);
    expect(resumed.presentationMs).toBe(18000);
    expect(resumed.transcript.some((t) => t.id === "claim")).toBe(true);
  });
  it("requires user action after a question and yields distinct answer-aware branches", async () => {
    for (const branch of ["vague", "direct"] as const) {
      const { gateway, ref } = await create();
      const jump = await gateway.demo(ref, "qa");
      const active = jump.ref;
      now += 60000;
      gateway.flush(active);
      expect((await gateway.getSession(active.sessionId)).phase).toBe(
        "judge_question",
      );
      await gateway.send(active, {
        type: "start_answer",
        turnId: jump.question!.turnId,
      });
      await gateway.send(active, {
        type: "submit_answer",
        turnId: jump.question!.turnId,
        text: jump.answerChoices.find((a) => a.id === branch)!.text,
      });
      now += 1000;
      gateway.flush(active);
      const follow = await gateway.getSession(active.sessionId);
      expect(follow.question!.parentQuestionId).toBe(jump.question!.id);
      expect(follow.question!.text).toContain(
        branch === "vague"
          ? "not a measurement"
          : "prove your assumption wrong",
      );
    }
  });
  it("early finish excludes later observations and report evidence exists", async () => {
    const { gateway, ref } = await create();
    await gateway.send(ref, { type: "start" });
    now = 8000;
    gateway.flush(ref);
    await gateway.send(ref, { type: "finish_pitch" });
    now += 1000;
    gateway.flush(ref);
    await gateway.send(ref, { type: "finish_qa" });
    now += 1000;
    gateway.flush(ref);
    const report = await gateway.getReport(ref);
    expect(report.completion).toBe("partial");
    expect(report.findings).toEqual([]);
    expect(report.transcript.some((t) => t.id === "claim")).toBe(false);
  });
  it("can finish before any finalized segment without inventing a question or finding", async () => {
    const { gateway, ref } = await create();
    await gateway.send(ref, { type: "start" });
    now = 3000;
    gateway.flush(ref);
    await gateway.send(ref, { type: "finish_pitch" });
    now += 1000;
    gateway.flush(ref);
    now += 1000;
    gateway.flush(ref);
    expect((await gateway.getReport(ref)).findings).toEqual([]);
    expect((await gateway.getSession(ref.sessionId)).question).toBeNull();
  });
  it("retry targets the answer, resets attempt data and preserves baseline evidence", async () => {
    const { gateway, ref } = await create();
    const review = await gateway.demo(ref, "review");
    const baseline = await gateway.getReport(review.ref);
    expect(
      baseline.findings.every((f) =>
        f.evidence.segmentIds.every((id) =>
          baseline.transcript.some((s) => s.id === id),
        ),
      ),
    ).toBe(true);
    const retry = await gateway.createRetry(review.ref, "evidence");
    expect(retry.ref.attemptId).not.toBe(review.ref.attemptId);
    expect(retry.transcript).toEqual([]);
    expect(retry.completedReports).toContainEqual(baseline);
    await gateway.send(retry.ref, { type: "start" });
    now += 4000;
    gateway.flush(retry.ref);
    const question = await gateway.getSession(ref.sessionId);
    expect(question.phase).toBe("judge_question");
    expect(question.presentationMs).toBe(0);
    await gateway.send(retry.ref, {
      type: "start_answer",
      turnId: question.question!.turnId,
    });
    await gateway.send(retry.ref, {
      type: "submit_answer",
      turnId: question.question!.turnId,
      text: question.answerChoices.find((a) => a.id === "direct")!.text,
    });
    now += 1000;
    gateway.flush(retry.ref);
    const result = await gateway.getReport(retry.ref);
    expect(result.comparison?.result).toBe("improved");
    expect(result.comparison?.before).toContain("promising results");
    expect(result.comparison?.after).toContain("hypothesis");
    expect(result.findings.map((f) => f.id)).toEqual(["answer"]);
    expect(
      (await gateway.getSession(ref.sessionId)).completedReports[0],
    ).toEqual(baseline);
  });
  it("subscription cleanup stops timers and Strict Mode re-subscribe does not duplicate delivery", async () => {
    const { gateway, ref } = await create();
    const first = vi.fn();
    const cleanup = gateway.subscribe(ref, first);
    expect(vi.getTimerCount()).toBe(1);
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    const second = vi.fn();
    const stop = gateway.subscribe(ref, second);
    await gateway.send(ref, { type: "start" });
    now = 7000;
    await vi.advanceTimersByTimeAsync(100);
    expect(first).not.toHaveBeenCalled();
    const ids = second.mock.calls.map(([e]) => e.eventId);
    expect(new Set(ids).size).toBe(ids.length);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("interruption and failed commands preserve session context and can recover", async () => {
    const { gateway, ref } = await create();
    const qa = await gateway.demo(ref, "qa");
    await gateway.demo(qa.ref, "interrupt");
    const interrupted = await gateway.getSession(ref.sessionId);
    now += 10000;
    gateway.flush(qa.ref);
    expect((await gateway.getSession(ref.sessionId)).transcript).toEqual(
      interrupted.transcript,
    );
    await gateway.demo(qa.ref, "recover");
    await gateway.demo(qa.ref, "fail");
    await expect(
      gateway.send(qa.ref, {
        type: "start_answer",
        turnId: qa.question!.turnId,
      }),
    ).rejects.toThrow("Simulated request failed");
    expect((await gateway.getSession(ref.sessionId)).phase).toBe(
      "judge_question",
    );
    await gateway.send(qa.ref, {
      type: "start_answer",
      turnId: qa.question!.turnId,
    });
    expect((await gateway.getSession(ref.sessionId)).phase).toBe("answering");
  });
  it("restores completed reports and marks active sessions interrupted after refresh", async () => {
    const { gateway, ref } = await create();
    const qa = await gateway.demo(ref, "qa");
    const refreshed = await new MockCoachGateway().getSession(ref.sessionId);
    expect(refreshed.connection).toBe("interrupted");
    expect(refreshed.isPaused).toBe(true);
    const review = await gateway.demo(qa.ref, "review");
    const loaded = await new MockCoachGateway().getSession(ref.sessionId);
    expect(loaded.phase).toBe("review");
    expect(loaded.completedReports).toEqual(review.completedReports);
    sessionStorage.setItem("pitch-coach:v1:broken", "{broken");
    expect(loadSession("broken")).toBeNull();
  });
  it("rejects unsupported custom configuration and arbitrary answer text", async () => {
    const gateway = new MockCoachGateway();
    await expect(
      gateway.createSession({ ...gateway.getDefaults(), title: " " }),
    ).rejects.toThrow();
    const { gateway: g, ref } = await create();
    const qa = await g.demo(ref, "qa");
    await g.send(qa.ref, { type: "start_answer", turnId: qa.question!.turnId });
    await expect(
      g.send(qa.ref, {
        type: "submit_answer",
        turnId: qa.question!.turnId,
        text: "Pretend you analyzed this",
      }),
    ).rejects.toThrow("sample answers");
  });
});

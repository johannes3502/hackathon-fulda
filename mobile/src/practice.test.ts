import { afterEach, expect, it, vi } from "vitest";
import { NativePractice } from "./practice";
import { MockCoachGateway } from "../../frontend/src/features/coach/mock/MockCoachGateway";
import {
  defaults,
  answers,
} from "../../frontend/src/features/coach/mock/fixtures/scenario";

afterEach(() => vi.useRealTimers());
it("re-subscribes after question jumps, reset and focused retry, then stops on disposal", async () => {
  vi.useFakeTimers();
  const gateway = new MockCoachGateway(
    () => Date.now(),
    () => "native-integration",
  );
  const changed = vi.fn();
  const session = new NativePractice(gateway, changed);
  const start = session.start(defaults);
  await vi.advanceTimersByTimeAsync(400);
  await start;
  await session.send("qa");
  const firstQuestion = session.state!.question!;
  await session.send({ type: "start_answer", turnId: firstQuestion.turnId });
  await session.send({
    type: "submit_answer",
    turnId: firstQuestion.turnId,
    text: answers[1].text,
  });
  await vi.advanceTimersByTimeAsync(1100);
  expect(session.state!.phase).toBe("judge_question");
  expect(session.state!.question!.turnId).not.toBe(firstQuestion.turnId);
  await session.send({ type: "finish_qa" });
  await vi.advanceTimersByTimeAsync(1100);
  expect(session.state!.phase).toBe("review");
  await session.retry(
    session.state!.completedReports[0].findings.find((f) => f.retryable)!.id,
  );
  expect(session.state!.retryTarget).toBeTruthy();
  await session.send({ type: "start" });
  await vi.advanceTimersByTimeAsync(4100);
  expect(session.state!.phase).toBe("judge_question");
  await session.send("reset");
  expect(session.state!.phase).toBe("preflight");
  await session.send({ type: "start" });
  await vi.advanceTimersByTimeAsync(4100);
  expect(session.state!.phase).not.toBe("countdown");
  session.dispose();
  const count = changed.mock.calls.length;
  await vi.advanceTimersByTimeAsync(5000);
  expect(changed).toHaveBeenCalledTimes(count);
});
it("validates custom setup with the web gateway and honors pause/resume", async () => {
  vi.useFakeTimers();
  const session = new NativePractice(
    new MockCoachGateway(
      () => Date.now(),
      () => "custom",
    ),
    () => {},
  );
  await expect(session.start({ ...defaults, title: "" })).rejects.toThrow(
    "title",
  );
  const start = session.start({
    ...defaults,
    title: "My rehearsal",
    mode: "simulation",
    targetDurationMs: 60000,
  });
  await vi.advanceTimersByTimeAsync(400);
  await start;
  expect(session.state!.config.mode).toBe("simulation");
  await session.send({ type: "start" });
  await vi.advanceTimersByTimeAsync(5000);
  await session.send({ type: "pause" });
  const time = session.state!.presentationMs;
  await vi.advanceTimersByTimeAsync(5000);
  expect(session.state!.presentationMs).toBe(time);
  await session.send({ type: "resume" });
  await vi.advanceTimersByTimeAsync(1000);
  expect(session.state!.presentationMs).toBeGreaterThan(time);
  session.dispose();
});

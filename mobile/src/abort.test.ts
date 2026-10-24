import { afterEach, expect, it, vi } from "vitest";
import { requestAbort, waitForPoll } from "./abort";
afterEach(() => vi.useRealTimers());
it("uses only the basic native AbortController API for timeout and parent cancellation", () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  const request = requestAbort(parent.signal, 20);
  vi.advanceTimersByTime(20);
  expect(request.signal.aborted).toBe(true);
  request.dispose();
  const next = requestAbort(parent.signal, 1000);
  parent.abort();
  expect(next.signal.aborted).toBe(true);
  next.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("cancels an already aborted poll immediately and clears its timer", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  controller.abort();
  await expect(waitForPoll(controller.signal)).rejects.toThrow("cancelled");
  expect(vi.getTimerCount()).toBe(0);
});
it("disposes request timeouts after completion", () => {
  vi.useFakeTimers();
  const request = requestAbort(new AbortController().signal, 20);
  request.dispose();
  vi.advanceTimersByTime(20);
  expect(request.signal.aborted).toBe(false);
});

import { afterEach, expect, it, vi } from "vitest";
import { callBackend, waitForBackendJob } from "./backend-job";

const id = "12345678-1234-1234-1234-123456789abc";
const job = {
  statusPath: "/speech/jobs",
  label: "analysis",
  valid: (v: unknown): v is number => typeof v === "number",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("accepts empty deletion responses and bounds error details", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        Response.json({ detail: "x".repeat(1000) }, { status: 503 }),
      ),
  );
  await expect(
    callBackend("/api", "/sources/id", new AbortController().signal, {
      method: "DELETE",
    }),
  ).resolves.toBeUndefined();
  await expect(
    callBackend("/api", "/sources/id", new AbortController().signal),
  ).rejects.toThrow(`HTTP 503): ${"x".repeat(250)}`);
});

it.each([
  { job_id: "another-job", status: "completed", result: 1 },
  { job_id: id, status: "completed", result: "wrong shape" },
  { job_id: id, status: "unknown" },
])("rejects a mismatched or malformed job response", async (response) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(response)));
  await expect(
    waitForBackendJob(
      "/api",
      { job_id: id },
      job,
      new AbortController().signal,
    ),
  ).rejects.toThrow("invalid analysis");
});

it("cancels between a status response and the next polling timer", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => {
        controller.abort(new Error("left review"));
        return { job_id: id, status: "queued" };
      },
    })),
  );
  await expect(
    waitForBackendJob("/api", { job_id: id }, job, controller.signal),
  ).rejects.toThrow("left review");
  expect(vi.getTimerCount()).toBe(0);
});

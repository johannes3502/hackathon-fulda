import { afterEach, expect, it, vi } from "vitest";
import { analysisResult, apiEndpoint, parseWords } from "./analysis";
import { AnalysisTransport } from "./transport";
afterEach(() => vi.unstubAllGlobals());
const result = {
  summary: { pause_count: 1, median_f0_hz: null },
  events: [
    {
      t_ms: 100,
      duration_ms: 600,
      type: "pause",
      severity: "info",
      payload: { gap_ms: 600 },
    },
  ],
};
it("uploads a complete recording only after stopping and maps real feedback", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(result));
  vi.stubGlobal("fetch", fetcher);
  const transport = new AnalysisTransport("http://localhost:8000");
  const receive = vi.fn();
  await transport.connect({ sessionId: "test" }, receive);
  await transport.send();
  expect(fetcher).toHaveBeenCalledTimes(1);
  await transport.finish(
    1000,
    new Blob(["complete recording"], { type: "video/mp4" }),
  );
  expect(fetcher.mock.calls[1][0]).toBe("http://localhost:8000/speech/analyze");
  const file = fetcher.mock.calls[1][1].body.get("recording") as File;
  expect(file.name).toBe("take.mp4");
  expect(await file.text()).toBe("complete recording");
  expect(receive.mock.calls[0][0].feedback).toMatchObject({
    startMs: 100,
    endMs: 700,
    kind: "suggestion",
  });
  expect(receive.mock.calls[1][0].metrics[1].value).toBeNull();
  transport.close();
});
it("surfaces HTTP failures and aborts outstanding requests on close", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(new Response("bad", { status: 422 }));
  vi.stubGlobal("fetch", fetcher);
  const transport = new AnalysisTransport("http://localhost:8000");
  await transport.connect({ sessionId: "test" }, vi.fn());
  await expect(transport.finish(1000, new Blob(["bad"]))).rejects.toThrow(
    "HTTP 422",
  );
  transport.close();
  expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
});
it("validates destinations, imported words and backend responses", () => {
  expect(apiEndpoint("https://example.com/", true)).toBe("https://example.com");
  for (const url of [
    "ws://example.com",
    "https://user:pass@example.com",
    "http://example.com",
  ])
    expect(() => apiEndpoint(url, true)).toThrow();
  expect(
    parseWords([{ word: "Hello", start_ms: 0, end_ms: 400 }], 500),
  ).toHaveLength(1);
  for (const words of [
    [],
    [{ word: "Hi", start_ms: 10, end_ms: 0 }],
    [{ word: "Hi", start_ms: 0, end_ms: 1000 }],
  ])
    expect(() => parseWords(words, 500)).toThrow();
  expect(() =>
    analysisResult({ summary: {}, events: [{}] }, "speech", 1000),
  ).toThrow();
  expect(analysisResult(result, "words", 500).feedback[0].endMs).toBe(500);
});

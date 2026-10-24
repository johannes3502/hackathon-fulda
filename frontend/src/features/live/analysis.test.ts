import { afterEach, expect, it, vi } from "vitest";
import {
  analysisResult,
  apiEndpoint,
  parseWords,
  parseTranscript,
} from "./analysis";
import { AnalysisTransport } from "./transport";
afterEach(() => vi.unstubAllGlobals());
it("resolves the Compose API path against the current browser origin", () => {
  vi.stubGlobal("location", new URL("https://coach.example:8443/live"));
  expect(apiEndpoint("/api", true)).toBe("https://coach.example:8443/api");
  expect(apiEndpoint("http://localhost:8000/", false)).toBe(
    "http://localhost:8000",
  );
  expect(() => apiEndpoint("http://localhost:8000", true)).toThrow();
});

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
const jobId = "12345678-1234-1234-1234-123456789abc";
const accepted = { job_id: jobId, status_url: `/speech/jobs/${jobId}` };
it.each([10, 250])(
  "keeps completed analysis with %i ms of backend timestamp drift",
  async (drift) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "ok" }))
      .mockResolvedValueOnce(Response.json(accepted))
      .mockResolvedValueOnce(
        Response.json({
          job_id: jobId,
          status: "completed",
          result: {
            audio: { summary: { duration_ms: 1000 + drift, pause_count: 1 } },
            words: [{ word: "Hallo", start_ms: 900, end_ms: 1000 + drift }],
            events: result.events,
            transcription: { summary: { word_count: 1 }, events: [] },
            asr_provider: "whisper",
            synthetic_demo: false,
            notices: [],
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const receive = vi.fn();
    const transport = new AnalysisTransport("/api", true);
    await transport.connect({ sessionId: "test" }, receive);
    await transport.finish(1000.5, new Blob(["synthetic recording"]));
    const messages = receive.mock.calls.map(([message]) => message);
    expect(
      messages.find((m) => m.type === "transcript").transcript,
    ).toMatchObject({
      words: [{ word: "Hallo", start_ms: 900, end_ms: 1000 }],
      notices: [expect.stringContaining("aligned")],
    });
    expect(messages.find((m) => m.type === "feedback").feedback.startMs).toBe(
      100,
    );
    expect(messages.find((m) => m.type === "metrics").metrics).toContainEqual({
      id: "words-word_count",
      label: "Transcript: word count",
      value: 1,
    });
    // Imported timestamps must still be rejected rather than silently changed.
    expect(() =>
      parseWords(
        [{ word: "Hallo", start_ms: 900, end_ms: 1000 + drift }],
        1000,
      ),
    ).toThrow();
    transport.close();
  },
);

it("retains audio findings and measurements when the transcript is invalid", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "ok" }))
      .mockResolvedValueOnce(Response.json(accepted))
      .mockResolvedValueOnce(
        Response.json({
          job_id: jobId,
          status: "completed",
          result: {
            audio: result,
            events: result.events,
            words: [{ word: "Hallo", start_ms: 900, end_ms: 2000 }],
            asr_provider: "whisper",
            synthetic_demo: false,
            notices: [],
          },
        }),
      ),
  );
  const receive = vi.fn();
  const transport = new AnalysisTransport("/api", true);
  await transport.connect({ sessionId: "test" }, receive);
  await expect(
    transport.finish(1000, new Blob(["synthetic recording"])),
  ).rejects.toThrow();
  const messages = receive.mock.calls.map(([message]) => message);
  expect(messages.map((m) => m.type)).toEqual(["feedback", "metrics"]);
  expect(messages[1].metrics).toContainEqual({
    id: "speech-pause_count",
    label: "Audio: pause count",
    value: 1,
  });
  transport.close();
});

it("requests local-only ASR, retains words and avoids duplicate timestamp events", async () => {
  const words = [{ word: "Ähm", start_ms: 0, end_ms: 250 }];
  const event = {
    t_ms: 0,
    duration_ms: 250,
    type: "filler",
    severity: "hint",
    source: "asr",
    payload: { word: "Ähm" },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(accepted, { status: 202 }))
    .mockResolvedValueOnce(
      Response.json({
        job_id: jobId,
        status: "completed",
        result: {
          audio: { summary: { pause_count: 0 } },
          transcription: { summary: { filler_count: 1 } },
          events: [event],
          words,
          asr_provider: "whisper",
          synthetic_demo: false,
          notices: ["Check recognition errors."],
        },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const transport = new AnalysisTransport("http://localhost:8000", true),
    receive = vi.fn();
  await transport.connect({ sessionId: "test" }, receive);
  await transport.finish(1000, new Blob(["synthetic audio"]));
  expect(fetcher.mock.calls[1][1].body.get("local_only")).toBe("true");
  expect(fetcher.mock.calls[1][1].body.get("transcribe")).toBe("true");
  expect(receive.mock.calls[0][0]).toMatchObject({
    type: "transcript",
    transcript: { words, provider: "whisper", synthetic: false },
  });
  const events = receive.mock.calls.filter(
    ([message]) => message.type === "feedback",
  );
  expect(events).toHaveLength(1);
  expect(events[0][0].feedback.id).toBe("words-0");
  expect(receive.mock.calls.at(-1)?.[0].metrics).toContainEqual({
    id: "words-filler_count",
    label: "Transcript: filler count",
    value: 1,
  });
});
it("accepts an empty recognized transcript but rejects malformed words", () => {
  expect(
    parseTranscript(
      {
        words: [],
        asr_provider: "whisper",
        synthetic_demo: false,
        notices: [],
      },
      1000,
    ).words,
  ).toEqual([]);
  expect(() =>
    parseTranscript({ words: [], asr_provider: "whisper" }, 1000),
  ).toThrow();
  expect(() =>
    parseWords([{ word: " ", start_ms: 0, end_ms: 20 }], 1000),
  ).toThrow();
  expect(() =>
    parseWords(
      [
        { word: "A", start_ms: 20, end_ms: 40 },
        { word: "B", start_ms: 0, end_ms: 10 },
      ],
      1000,
    ),
  ).toThrow("ordered");
});
it("uploads a complete recording only after stopping and maps real feedback", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(accepted, { status: 202 }))
    .mockResolvedValueOnce(Response.json({ job_id: jobId, status: "running" }))
    .mockResolvedValueOnce(
      Response.json({
        job_id: jobId,
        status: "completed",
        result: { audio: result, events: result.events },
      }),
    );
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
  expect(fetcher.mock.calls[1][1].body.get("transcribe")).toBe("false");
  expect(fetcher.mock.calls[2][0]).toBe(
    `http://localhost:8000/speech/jobs/${jobId}`,
  );
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
it("requests transcription only when opted in and forwards the words", async () => {
  const words = [{ word: "Hallo.", start_ms: 100, end_ms: 400 }];
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(accepted, { status: 202 }))
    .mockResolvedValueOnce(
      Response.json({
        job_id: jobId,
        status: "completed",
        result: {
          audio: result,
          events: result.events,
          words,
          transcription: { summary: { word_count: 1 }, events: [] },
          asr_provider: "whisper",
          synthetic_demo: false,
          notices: [],
        },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const transport = new AnalysisTransport("http://localhost:8000", true);
  const receive = vi.fn();
  await transport.connect({ sessionId: "test" }, receive);
  await transport.finish(1000, new Blob(["take"], { type: "video/webm" }));
  expect(fetcher.mock.calls[1][1].body.get("transcribe")).toBe("true");
  const messages = receive.mock.calls.map((call) => call[0]);
  expect(
    messages.find((m) => m.type === "transcript").transcript.words,
  ).toEqual(words);
  expect(
    messages
      .find((m) => m.type === "metrics")
      .metrics.map((m: { id: string }) => m.id),
  ).toContain("words-word_count");
  transport.close();
});
it("reports failed jobs and cancels polling when the transport closes", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(accepted, { status: 202 }))
    .mockResolvedValueOnce(Response.json({ job_id: jobId, status: "failed" }));
  vi.stubGlobal("fetch", fetcher);
  const transport = new AnalysisTransport("http://localhost:8000");
  const receive = vi.fn();
  await transport.connect({ sessionId: "test" }, receive);
  await expect(transport.finish(1000, new Blob(["bad"]))).rejects.toThrow(
    "local recording is preserved",
  );
  expect(receive).not.toHaveBeenCalled();
  transport.close();

  const aborting = new AnalysisTransport("http://localhost:8000");
  fetcher
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json(accepted, { status: 202 }))
    .mockImplementationOnce(() => {
      setTimeout(() => aborting.close(), 0);
      return Promise.resolve(
        Response.json({ job_id: jobId, status: "queued" }),
      );
    });
  await aborting.connect({ sessionId: "test" }, receive);
  await expect(aborting.finish(1000, new Blob(["data"]))).rejects.toThrow();
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

it.each([500, 503, "network"] as const)(
  "reports a failed readiness check (%s) without claiming an uncaptured recording exists",
  async (failure) => {
    const fetcher =
      failure === "network"
        ? vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
        : vi
            .fn()
            .mockResolvedValue(
              new Response("Unavailable", { status: failure }),
            );
    vi.stubGlobal("fetch", fetcher);
    const transport = new AnalysisTransport("http://localhost:8000");
    const connection = transport.connect({ sessionId: "test" }, vi.fn());
    await expect(connection).rejects.toThrow("Nothing has been recorded");
    await expect(connection).rejects.toThrow("set Speech analysis to Off");
    await expect(connection).rejects.not.toThrow("recording is preserved");
    expect(fetcher.mock.calls[0][0]).toBe("http://localhost:8000/health/ready");
    transport.close();
  },
);

it.each([true, false])(
  "reuses only a complete live transcript and preserves local fallback: complete=%s",
  async (complete) => {
    const words = [{ word: "Hallo.", start_ms: 0, end_ms: 150 }];
    const streamed = complete
      ? { words, provider: "deepgram", synthetic: false, notices: [] }
      : null;
    const finish = vi.fn().mockResolvedValue(streamed);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "ok" }))
      .mockResolvedValueOnce(Response.json(accepted))
      .mockResolvedValueOnce(
        Response.json({
          job_id: jobId,
          status: "completed",
          result: {
            audio: { summary: {}, events: [] },
            events: [],
            words,
            asr_provider: complete ? "deepgram" : "whisper",
            synthetic_demo: false,
            notices: [],
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const transport = new AnalysisTransport(
      "http://localhost:8000",
      true,
      undefined,
      finish,
    );
    const receive = vi.fn();
    await transport.connect({ sessionId: "test" }, receive);
    await transport.finish(1000, new Blob(["take"]));
    expect(finish).toHaveBeenCalledWith(1000);
    const body = fetcher.mock.calls[1][1].body as FormData;
    expect(body.get("local_only")).toBe(complete ? "false" : "true");
    expect(body.get("live_transcript")).toBe(
      complete ? JSON.stringify({ provider: "deepgram", words }) : null,
    );
    expect(receive.mock.calls[0][0].transcript.provider).toBe(
      complete ? "deepgram" : "whisper",
    );
    transport.close();
  },
);

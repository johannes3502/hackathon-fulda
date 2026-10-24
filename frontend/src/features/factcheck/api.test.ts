import { afterEach, expect, it, vi } from "vitest";
import { factFeedback, runFactCheck, type FactCheckResult } from "./api";

afterEach(() => vi.unstubAllGlobals());

const jobId = "12345678-1234-1234-1234-123456789abc";
const words = [{ word: "Fulda", start_ms: 0, end_ms: 400 }];
const result: FactCheckResult = {
  claims: [
    {
      claim: "Die Hochschule hat 9000 Studierende.",
      transcript: "Wir haben 9000 Studierende.",
      t_ms: 5000,
      duration_ms: 1500,
      verdict: "contradicts",
      explanation: "Die Folie nennt 9.500.",
      evidence: {
        kind: "upload",
        label: "folien.pdf, Seite 2",
        quote: "rund 9.500 Studierende",
        passage: "Die Hochschule hat rund 9.500 Studierende.",
        filename: "folien.pdf",
        location: { kind: "page", start: 2, end: 2 },
      },
      checked: ["upload"],
      notes: [],
    },
    {
      claim: "Gegründet 1974.",
      transcript: "Gegründet 1974.",
      t_ms: 9800,
      duration_ms: 900,
      verdict: "not_found",
      explanation: "",
      checked: ["upload", "web"],
    },
  ],
  events: [],
  model: "test-model",
  web_provider: "wikipedia",
  sources_checked: true,
  config: { max_claims: 12, min_quote_chars: 12, top_k: 5, web_results: 4 },
  notices: ["synthetic"],
};

it("posts the transcript, polls the job and returns the result", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { job_id: jobId, status_url: `/factcheck/jobs/${jobId}` },
        { status: 202 },
      ),
    )
    .mockResolvedValueOnce(Response.json({ job_id: jobId, status: "running" }))
    .mockResolvedValueOnce(
      Response.json({ job_id: jobId, status: "completed", result }),
    );
  vi.stubGlobal("fetch", fetcher);
  const checked = await runFactCheck(
    "http://localhost:8000",
    {
      words,
      collectionId: "c0ffee00-0000-4000-8000-000000000000",
      useWeb: false,
    },
    new AbortController().signal,
    0,
  );
  expect(checked.claims).toHaveLength(2);
  expect(fetcher.mock.calls[0][0]).toBe("http://localhost:8000/factcheck");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    words,
    collection_id: "c0ffee00-0000-4000-8000-000000000000",
    use_web: false,
  });
  expect(fetcher.mock.calls[2][0]).toBe(
    `http://localhost:8000/factcheck/jobs/${jobId}`,
  );
});

it("surfaces configuration errors and failed jobs", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { detail: "Fact-check is not configured" },
          { status: 503 },
        ),
      ),
  );
  const input = { words, collectionId: null, useWeb: true };
  await expect(
    runFactCheck("", input, new AbortController().signal, 0),
  ).rejects.toThrow("(HTTP 503): Fact-check is not configured");

  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ job_id: jobId }, { status: 202 }))
      .mockResolvedValueOnce(
        Response.json({ job_id: jobId, status: "failed", error: "LLM down" }),
      ),
  );
  await expect(
    runFactCheck("", input, new AbortController().signal, 0),
  ).rejects.toThrow("LLM down");
});

it("maps verdicts to timeline moments without scores", () => {
  const [contradiction, missing] = factFeedback(result, 10000);
  expect(contradiction).toMatchObject({
    id: "fact-0",
    category: "fact",
    kind: "attention",
    startMs: 5000,
    endMs: 6500,
  });
  expect(contradiction.title).toContain("Source says otherwise");
  expect(contradiction.detail).toContain("folien.pdf, Seite 2");
  expect(missing).toMatchObject({ kind: "suggestion", endMs: 10000 });
  expect(missing.title).toContain("Not found in sources");
});

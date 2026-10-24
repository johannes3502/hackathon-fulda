import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeTake, analyzeTranscript, endpoint } from "./api";
const fetch = vi.hoisted(() => vi.fn());
vi.mock("expo/fetch", () => ({ fetch }));
vi.mock("expo-file-system", () => ({
  File: class extends Blob {
    constructor(uri: string) {
      super([uri]);
    }
  },
}));
const id = "12345678-1234-1234-1234-123456789012";
const reply = (value: unknown) => ({ ok: true, json: async () => value });
beforeEach(() => {
  fetch.mockReset();
});
describe("native analysis contract", () => {
  it("requires an absolute backend address without credentials", () => {
    expect(endpoint("https://example.test/api/")).toBe(
      "https://example.test/api",
    );
    for (const url of [
      "/api",
      "file:///etc",
      "https://user:secret@example.test",
      "https://example.test/?secret=x",
    ])
      expect(() => endpoint(url)).toThrow();
  });
  it("uploads media without ASR, polls the returned job and maps real data", async () => {
    fetch.mockResolvedValueOnce(reply({ job_id: id })).mockResolvedValueOnce(
      reply({
        job_id: id,
        status: "completed",
        result: { audio: { summary: { duration_ms: 1000 } }, events: [] },
      }),
    );
    const result = await analyzeTake(
      "https://example.test",
      "file:///take.mp4",
      1000,
      new AbortController().signal,
      () => {},
    );
    expect(fetch.mock.calls[0][0]).toBe("https://example.test/speech/analyze");
    expect(fetch.mock.calls[0][1].body.get("transcribe")).toBe("false");
    expect(fetch.mock.calls[0][1].body.get("recording")).toBeInstanceOf(Blob);
    expect(fetch.mock.calls[1][0]).toContain(`/speech/jobs/${id}`);
    expect(result.feedback).toEqual([]);
    expect(result.metrics[0].value).toBe(1000);
  });
  it("rejects mismatched jobs and failed uploads without creating mock feedback", async () => {
    fetch
      .mockResolvedValueOnce(reply({ job_id: id }))
      .mockResolvedValueOnce(reply({ job_id: "other", status: "completed" }));
    await expect(
      analyzeTake(
        "https://example.test",
        "file:///take.mp4",
        1000,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("wrong job");
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(
      analyzeTake(
        "https://example.test",
        "file:///take.mp4",
        1000,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("still on this device");
  });
  it("validates word timestamps before sending anything", async () => {
    await expect(
      analyzeTranscript(
        "https://example.test",
        '[{"word":"hello","start_ms":100,"end_ms":9000}]',
        1000,
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

it("uses the shared source endpoints with native multipart names and empty delete responses", async () => {
  const { api } = await import("./api");
  const { listSources, uploadSource, searchSources, deleteSource } =
    await import("../../frontend/src/features/sources/api");
  const request = <T>(
    base: string,
    path: string,
    init?: RequestInit,
  ): Promise<T> => api(base, path, new AbortController().signal, init);
  fetch
    .mockResolvedValueOnce(reply([]))
    .mockResolvedValueOnce(reply({ source: { id, status: "queued" } }))
    .mockResolvedValueOnce(reply([]))
    .mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: vi.fn(() => {
        throw new Error("empty body");
      }),
    });
  await listSources("https://api.test", id, request);
  await uploadSource(
    "https://api.test",
    id,
    new File(["synthetic"], "cache-file"),
    request,
    "slides.PPTX",
  );
  await searchSources(
    "https://api.test",
    id,
    "What is the evidence?",
    5,
    request,
  );
  await deleteSource("https://api.test", id, request);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    `https://api.test/sources?collection_id=${id}`,
    "https://api.test/sources",
    "https://api.test/sources/search",
    `https://api.test/sources/${id}`,
  ]);
  expect(fetch.mock.calls[1][1].body.get("file").name).toBe("slides.PPTX");
  expect(fetch.mock.calls[1][1].body.get("collection_id")).toBe(id);
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
    collection_id: id,
    query: "What is the evidence?",
    k: 5,
  });
});

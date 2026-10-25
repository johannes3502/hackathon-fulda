import { afterEach, expect, it, vi } from "vitest";
import {
  agentSession,
  agentSettings,
  prepareAgent,
  transcribeTake,
} from "./agent";
import type { LiveRecording } from "../live/contracts";

afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
const collection = "12345678-1234-1234-1234-123456789abc";
const take = {
  id: "take",
  config: {
    mode: "local",
    endpoint: "/api",
    presentationMode: "nonprofit",
    sourceCollectionId: collection,
  },
  words: [{ word: "Synthetic", start_ms: 0, end_ms: 500 }],
  durationMs: 1000,
  feedback: [],
  metrics: [],
  video: new Blob(["synthetic"]),
} as unknown as LiveRecording;

it.each(["school", "thesis", "startup", "nonprofit", undefined] as const)(
  "sends %s context (classroom by default) and the frozen collection to the agent",
  async (mode) => {
    const result = {
      prompt: "Synthetic reference material",
      source_count: 1,
      notices: [],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ job_id: collection }))
      .mockResolvedValueOnce(
        Response.json({ job_id: collection, status: "completed", result }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await prepareAgent(
        { ...take, config: { ...take.config, presentationMode: mode } },
        take.config.sourceCollectionId!,
        signal(),
        null,
        0,
      ),
    ).toEqual(result);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      presentation_mode: mode ?? "school",
      collection_id: collection,
      words: take.words,
      voice_role: null,
    });
  },
);

it.each(["student", "professor", "teacher"] as const)(
  "sends the selected %s role without changing the take's presentation context",
  async (role) => {
    const result = {
      prompt: "Synthetic role context",
      source_count: 0,
      notices: [],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ job_id: collection }))
      .mockResolvedValueOnce(
        Response.json({ job_id: collection, status: "completed", result }),
      );
    vi.stubGlobal("fetch", fetcher);
    await prepareAgent(take, collection, signal(), role, 0);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      presentation_mode: "nonprofit",
      voice_role: role,
    });
  },
);

it("rejects untrusted voice-session URLs and malformed settings", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ signed_url: "wss://attacker.example/" }),
      ),
  );
  await expect(agentSession("/api", signal())).rejects.toThrow(
    "address was invalid",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ available: "yes" })),
  );
  await expect(agentSettings("/api", signal())).rejects.toThrow("unavailable");
});

it("uses local transcription for an explicitly uploaded local take and preserves its video", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json({ job_id: collection }))
    .mockResolvedValueOnce(
      Response.json({
        job_id: collection,
        status: "completed",
        result: {
          audio: { summary: {} },
          events: [],
          words: take.words,
          asr_provider: "whisper",
          synthetic_demo: true,
          notices: [],
        },
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await transcribeTake(take, signal());
  const body = fetcher.mock.calls[1][1].body as FormData;
  expect(body.get("transcribe")).toBe("true");
  expect(body.get("local_only")).toBe("true");
  expect(result.video).toBe(take.video);
  expect(result.analysisUploaded).toBe(true);
  expect(result.words).toEqual(take.words);
});

it("never starts an upload after the review has been left", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  controller.abort();
  await expect(transcribeTake(take, controller.signal)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});

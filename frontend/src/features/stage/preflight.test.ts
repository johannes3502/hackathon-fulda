import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPreflight } from "./preflight";
import { PITCH_QUESTION_TEXT } from "./pitch";

afterEach(() => vi.unstubAllGlobals());

const pitchPayload = {
  question: {
    id: "pitch-privacy",
    question: PITCH_QUESTION_TEXT,
    reason: "Die Frage prüft die Datenschutz-Aussage der Demo.",
    evidence: {
      label: "418 Pitch · Datenschutz",
      quote: "Die Aufnahme bleibt im Browser.",
    },
    answer_points: ["Punkt eins"],
  },
  prompt: "Eine feste Frage.",
  notices: ["Vorbereitet."],
};

describe("preflight checks", () => {
  it("keeps optional providers optional while the stage stays ready", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/health/ready")
        return Response.json({
          status: "ok",
          postgres: "ok",
          storage: "ok",
          redis: "ok",
        });
      if (url === "/api/factcheck/settings")
        return Response.json({ available: false, model: null });
      if (url === "/api/questions/pitch") return Response.json(pitchPayload);
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);

    const checks = await loadPreflight(new AbortController().signal);

    expect(checks.map(({ id, status }) => [id, status])).toEqual([
      ["backend", "ready"],
      ["factcheck", "optional"],
      ["pitch", "ready"],
    ]);
  });

  it("reports unavailable backend services in plain German", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/health/ready")
        return new Response(
          JSON.stringify({
            status: "unavailable",
            postgres: "ok",
            storage: "unavailable",
            redis: "unavailable",
          }),
          { status: 503 },
        );
      if (url === "/api/factcheck/settings")
        return Response.json({ available: false });
      if (url === "/api/questions/pitch") return Response.json(pitchPayload);
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);

    const checks = await loadPreflight(new AbortController().signal);
    const backend = checks.find((item) => item.id === "backend");
    expect(backend?.status).toBe("blocked");
    expect(backend?.detail).toBe("Nicht bereit: Objektspeicher, Queue.");
  });
});

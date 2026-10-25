import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PITCH_FALLBACK,
  PITCH_QUESTION_TEXT,
  loadPitchContext,
  parsePitchContext,
} from "./pitch";

afterEach(() => vi.unstubAllGlobals());

const backendPayload = {
  question: {
    id: "pitch-privacy",
    question: PITCH_QUESTION_TEXT,
    reason: "Die Frage prüft die Datenschutz-Aussage der Demo.",
    evidence: {
      kind: "upload",
      label: "418 Pitch · Datenschutz",
      quote: "Die Aufnahme bleibt im Browser.",
      passage: "Ein längerer Provider-Text, der nicht in die UI gehört.",
      quote_verified: "exact",
    },
    answer_points: ["Punkt eins", "Punkt zwei"],
  },
  prompt: "Eine feste Frage ohne Nachfrage.",
  notices: ["Vorbereitet."],
};

describe("fixed jury question", () => {
  it("keeps the exact German privacy question in the local fallback", () => {
    expect(PITCH_QUESTION_TEXT).toBe(
      "Eure Demo verarbeitet Kamera- und Mikrofonaufnahmen. Welche Daten verlassen den Laptop, und was passiert mit der Originalaufnahme?",
    );
    expect(PITCH_FALLBACK.question.question).toBe(PITCH_QUESTION_TEXT);
    expect(PITCH_FALLBACK.question.id).toBe("pitch-privacy");
    expect(PITCH_FALLBACK.question.reason).toContain("Datenschutz");
    expect(PITCH_FALLBACK.question.evidence?.label).toBe(
      "418 Pitch · Datenschutz",
    );
    expect(PITCH_FALLBACK.question.answer_points.length).toBeGreaterThan(0);
    expect(PITCH_FALLBACK.prompt).toContain(PITCH_QUESTION_TEXT);
    expect(PITCH_FALLBACK.notices.length).toBeGreaterThan(0);
  });

  it("accepts the documented backend contract and drops provider fields", () => {
    expect(parsePitchContext(backendPayload)).toEqual({
      question: {
        id: "pitch-privacy",
        question: PITCH_QUESTION_TEXT,
        reason: "Die Frage prüft die Datenschutz-Aussage der Demo.",
        evidence: {
          label: "418 Pitch · Datenschutz",
          quote: "Die Aufnahme bleibt im Browser.",
        },
        answer_points: ["Punkt eins", "Punkt zwei"],
      },
      prompt: "Eine feste Frage ohne Nachfrage.",
      notices: ["Vorbereitet."],
    });
  });

  it("rejects malformed contracts instead of showing invented content", () => {
    expect(parsePitchContext(null)).toBeNull();
    expect(parsePitchContext({})).toBeNull();
    expect(
      parsePitchContext({
        ...backendPayload,
        question: { ...backendPayload.question, answer_points: [1] },
      }),
    ).toBeNull();
    expect(
      parsePitchContext({
        ...backendPayload,
        question: {
          ...backendPayload.question,
          evidence: { label: "Ohne Zitat" },
        },
      }),
    ).toBeNull();
  });
});

describe("loading the fixed question", () => {
  it("uses the identical fallback when no endpoint answers", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    const result = await loadPitchContext(new AbortController().signal);
    expect(result.source).toBe("fallback");
    expect(result.context).toEqual(PITCH_FALLBACK);
    expect(fetcher).toHaveBeenCalled();
    expect(fetcher.mock.calls[0][0]).toBe("/api/questions/pitch");
  });

  it("uses the first valid backend answer", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(backendPayload));
    vi.stubGlobal("fetch", fetcher);
    const result = await loadPitchContext(new AbortController().signal);
    expect(result.source).toBe("backend");
    expect(result.context.question.id).toBe("pitch-privacy");
    expect(fetcher.mock.calls[0][0]).toBe("/api/questions/pitch");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("tries the root path when the proxied API path is unavailable", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(Response.json(backendPayload));
    vi.stubGlobal("fetch", fetcher);
    const result = await loadPitchContext(new AbortController().signal);
    expect(result.source).toBe("backend");
    expect(fetcher.mock.calls[1][0]).toBe("/questions/pitch");
  });
});

import { afterEach, expect, it, vi } from "vitest";
import {
  generateQuestions,
  questionErrorMessage,
  questionFeedback,
  reviewAnswer,
  reviewVoiceAnswer,
  withFollowUp,
  type Question,
  type QuestionResult,
} from "./api";
import { nextQuestion } from "./voice";

afterEach(() => vi.unstubAllGlobals());

const jobId = "12345678-1234-1234-1234-123456789abc";
const roundId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const words = [{ word: "Fulda", start_ms: 0, end_ms: 400 }];
const moon: Question = {
  id: "q1",
  kind: "contradiction",
  question: "Woraus besteht der Mond?",
  reason: "Die Quelle widerspricht.",
  t_ms: 13000,
  duration_ms: 1200,
  transcript: "Der Mond besteht aus Käse.",
  query: "Mond Gestein",
};
const gap: Question = {
  id: "q2",
  kind: "gap",
  question: "Welche Fachbereiche gibt es?",
  reason: "Folie 3 nennt acht Fachbereiche.",
  t_ms: null,
  duration_ms: 0,
  query: "Fachbereiche",
};
const result: QuestionResult = {
  presentation_mode: "thesis",
  round_id: roundId,
  roundId,
  questions: [moon, gap],
  events: [],
  persona: "student",
  model: "test-model",
  sources_used: true,
  config: {
    max_questions: 5,
    max_follow_ups: 3,
    max_turns: 6,
    round_ttl_s: 600,
    source_passages: 6,
    source_queries: 4,
    top_k: 5,
    min_quote_chars: 12,
  },
  notices: ["synthetic"],
};

function jobFetcher(path: string, done: unknown) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { job_id: jobId, status_url: `${path}/${jobId}` },
        { status: 202 },
      ),
    )
    .mockResolvedValueOnce(Response.json({ job_id: jobId, status: "queued" }))
    .mockResolvedValueOnce(
      Response.json({ job_id: jobId, status: "completed", result: done }),
    );
}

it("posts transcript and findings, then polls the question job", async () => {
  const fetcher = jobFetcher("/questions/jobs", result);
  vi.stubGlobal("fetch", fetcher);
  const generated = await generateQuestions(
    "/api",
    {
      words,
      collectionId: null,
      claims: [],
      persona: "student",
      presentationMode: "school",
    },
    new AbortController().signal,
    0,
  );
  expect(generated.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
  expect(generated.roundId).toBe(roundId);
  expect(fetcher.mock.calls[0][0]).toBe("/api/questions");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    words,
    collection_id: null,
    claims: [],
    persona: "student",
    presentation_mode: "school",
  });
  expect(fetcher.mock.calls[2][0]).toBe(`/api/questions/jobs/${jobId}`);
});

it("sends only round and question ids with the answer and rejects invalid reviews", async () => {
  const review = {
    verdict: "supports",
    explanation: "Die Folie bestätigt das.",
    checked: ["upload"],
    model: "test-model",
    follow_up: { ...moon, id: "q1.f1", kind: "follow_up" },
  };
  const fetcher = jobFetcher("/questions/answers", review);
  vi.stubGlobal("fetch", fetcher);
  const reviewed = await reviewAnswer(
    "/api",
    {
      roundId,
      questionId: moon.id,
      answer: "Aus Gestein.",
      collectionId: null,
      persona: "tutor",
    },
    new AbortController().signal,
    0,
  );
  expect(reviewed.follow_up?.id).toBe("q1.f1");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    round_id: roundId,
    question_id: "q1",
    answer: "Aus Gestein.",
    collection_id: null,
    persona: "tutor",
    presentation_mode: "thesis",
  });
  expect(fetcher.mock.calls[2][0]).toBe(`/api/questions/answers/${jobId}`);

  vi.stubGlobal(
    "fetch",
    jobFetcher("/questions/answers", { ...review, verdict: "score: 7/10" }),
  );
  await expect(
    reviewAnswer(
      "/api",
      {
        roundId,
        questionId: moon.id,
        answer: "x",
        collectionId: null,
        persona: "tutor",
      },
      new AbortController().signal,
      0,
    ),
  ).rejects.toThrow("invalid answer review");
});

it("turns expired and over-limit round refusals into actionable copy", () => {
  expect(
    questionErrorMessage(
      new Error("Backend /questions/answers failed (HTTP 410): expired"),
    ),
  ).toContain("expired");
  expect(
    questionErrorMessage(
      new Error("Backend /questions/answers failed (HTTP 429)"),
    ),
  ).toContain("turn limit");
  expect(questionErrorMessage(new Error("offline"))).toBe("offline");
});

it("uploads a spoken answer as multipart and returns its transcript", async () => {
  const review = {
    verdict: "not_found",
    explanation: "",
    checked: ["upload"],
    model: "test-model",
    reply: "Okay, danke!",
    answer: "Aus Gestein.",
  };
  const fetcher = jobFetcher("/questions/answers", review);
  vi.stubGlobal("fetch", fetcher);
  const reviewed = await reviewVoiceAnswer(
    "/api",
    {
      roundId,
      questionId: moon.id,
      recording: new Blob(["synthetic"], { type: "audio/webm" }),
      collectionId: null,
      persona: "student",
    },
    new AbortController().signal,
    0,
  );
  expect(reviewed.answer).toBe("Aus Gestein.");
  const [path, init] = fetcher.mock.calls[0];
  expect(path).toBe("/api/questions/answers/voice");
  expect(init.headers).toBeUndefined();
  const body = init.body as FormData;
  expect((body.get("recording") as File).name).toBe("answer.webm");
  expect(JSON.parse(body.get("request") as string)).toEqual({
    round_id: roundId,
    question_id: "q1",
    collection_id: null,
    persona: "student",
    presentation_mode: "thesis",
  });
  expect(fetcher.mock.calls[2][0]).toBe(`/api/questions/answers/${jobId}`);
});

it("asks unanswered questions in list order", () => {
  const followUp = { ...moon, id: "q1.f1", kind: "follow_up" as const };
  const questions = withFollowUp([moon, gap], "q1", followUp);
  expect(nextQuestion(questions, new Set())?.id).toBe("q1");
  expect(nextQuestion(questions, new Set(["q1"]))?.id).toBe("q1.f1");
  expect(
    nextQuestion(questions, new Set(["q1", "q1.f1", "q2"])),
  ).toBeUndefined();
});

it("places follow-ups after their question and only timed questions on the timeline", () => {
  const followUp = { ...moon, id: "q1.f1", kind: "follow_up" as const };
  const questions = withFollowUp([moon, gap], "q1", followUp);
  expect(questions.map((q) => q.id)).toEqual(["q1", "q1.f1", "q2"]);
  expect(withFollowUp(questions, "q1", followUp)).toBe(questions);

  const moments = questionFeedback(questions, 10000);
  expect(moments.map((m) => [m.id, m.kind, m.startMs, m.endMs])).toEqual([
    ["question-q1", "attention", 10000, 10000],
    ["question-q1.f1", "suggestion", 10000, 10000],
  ]);
});

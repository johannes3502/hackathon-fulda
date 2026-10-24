import { expect, it } from "vitest";
import {
  acceptedJob,
  factFeedback,
  parseCoachingJob,
  verdictLabel,
} from "./api";

const id = "12345678-1234-1234-1234-123456789abc";
const check = {
  id: "claim-1",
  statement: "A synthetic claim.",
  t_ms: 100,
  duration_ms: 500,
  verdict: "not_found" as const,
  explanation: "No matching passage.",
  citations: [],
};
const report = {
  collection_id: id,
  model: "local-test",
  notices: [],
  checks: [check],
  questions: [],
  events: [],
};

it("accepts only the requested job and complete source-review contracts", () => {
  expect(acceptedJob({ job_id: id })).toBe(id);
  expect(() => acceptedJob({ job_id: "../../other" })).toThrow();
  expect(
    parseCoachingJob({ job_id: id, status: "completed", report }, id).report,
  ).toEqual(report);
  expect(() =>
    parseCoachingJob({ job_id: id, status: "completed" }, id),
  ).toThrow();
  expect(() =>
    parseCoachingJob({ job_id: "other", status: "queued" }, id),
  ).toThrow();
  expect(() =>
    parseCoachingJob(
      {
        job_id: id,
        status: "completed",
        report: { ...report, checks: [{ ...check, citations: [{}] }] },
      },
      id,
    ),
  ).toThrow();
  expect(() =>
    parseCoachingJob(
      {
        job_id: id,
        status: "completed",
        report: { ...report, checks: [{ ...check, t_ms: -10 }] },
      },
      id,
    ),
  ).toThrow();
});

it("preserves missing evidence as an observation and clamps playback to the take", () => {
  const feedback = factFeedback(check, 300);
  expect(feedback).toMatchObject({
    id: "fact-claim-1",
    kind: "observation",
    startMs: 100,
    endMs: 300,
  });
  expect(verdictLabel("not_found")).toBe("Not found in sources");
  expect(factFeedback({ ...check, verdict: "contradicts" }, 1000).kind).toBe(
    "attention",
  );
  expect(verdictLabel(null)).toBe("Citation needs review");
});

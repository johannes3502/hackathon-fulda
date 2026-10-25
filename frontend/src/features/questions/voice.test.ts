import { expect, it, vi } from "vitest";
import type { Question } from "./api";
import {
  MAX_FOLLOW_UPS_PER_MAIN,
  MAX_VOICE_USER_TURNS,
  canAddFollowUp,
  canStartVoiceRound,
  endSessionIfActive,
  followUpParent,
  formatCountdown,
  remainingSeconds,
  voiceSessionExpired,
} from "./voice";

const question = (id: string, kind: Question["kind"]): Question => ({
  id,
  kind,
  question: "Synthetic?",
  reason: "Synthetic",
  t_ms: null,
  duration_ms: 0,
  query: "Synthetic",
});

it("counts down a ten-minute round and stops at the turn cap", () => {
  const started = 1_000_000;
  expect(remainingSeconds(started, started)).toBe(600);
  expect(remainingSeconds(started, started + 65_000)).toBe(535);
  expect(remainingSeconds(started, started + 700_000)).toBe(0);
  expect(formatCountdown(535)).toBe("08:55");
  expect(formatCountdown(-5)).toBe("00:00");

  expect(voiceSessionExpired(started, MAX_VOICE_USER_TURNS - 1, started)).toBe(
    false,
  );
  expect(voiceSessionExpired(started, MAX_VOICE_USER_TURNS, started)).toBe(
    true,
  );
  expect(voiceSessionExpired(started, 0, started + 600_000)).toBe(true);
  expect(voiceSessionExpired(null, 0, started)).toBe(false);
});

it("keeps follow-ups per main question bounded by the id convention", () => {
  const first = question("q1.f1", "follow_up");
  const second = question("q1.f2", "follow_up");
  const nested = question("q1.f1.f2", "follow_up");
  expect(followUpParent("q1.f1.f2")).toBe("q1");
  expect(canAddFollowUp([first], "q1")).toBe(true);
  expect(canAddFollowUp([first, second], "q1")).toBe(false);
  expect(canAddFollowUp([first, nested], "q1")).toBe(false);
  expect(canAddFollowUp([first], "q2")).toBe(true);
  expect(MAX_FOLLOW_UPS_PER_MAIN).toBe(2);
});

it("disables a new voice start after the cap", () => {
  expect(canStartVoiceRound(false, true)).toBe(true);
  expect(canStartVoiceRound(true, true)).toBe(false);
  expect(canStartVoiceRound(false, false)).toBe(false);
});

it("ends an active provider session and tolerates a missing one", async () => {
  const endSession = vi.fn().mockResolvedValue(undefined);
  const session = { endSession };
  await Promise.all([endSessionIfActive(session), endSessionIfActive(session)]);
  await endSessionIfActive(session);
  expect(endSession).toHaveBeenCalledTimes(1);
  await expect(endSessionIfActive(null)).resolves.toBeUndefined();
});

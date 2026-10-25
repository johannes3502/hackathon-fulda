import { expect, it, vi } from "vitest";
import {
  MAX_VOICE_USER_TURNS,
  canStartVoiceRound,
  endSessionIfActive,
  formatCountdown,
  remainingSeconds,
  voiceSessionExpired,
} from "./voice";

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

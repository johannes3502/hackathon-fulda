/** Browser voice rounds are capped independently of the backend round ledger. */
export const VOICE_ROUND_LIMIT_S = 600;
export const MAX_VOICE_USER_TURNS = 12;

export function remainingSeconds(
  startedAt: number | null,
  now = Date.now(),
  limitSeconds = VOICE_ROUND_LIMIT_S,
): number {
  if (startedAt === null) return limitSeconds;
  return Math.max(0, limitSeconds - Math.floor((now - startedAt) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** Stop the ElevenLabs conversation at its browser time or turn limit. */
export function voiceSessionExpired(
  startedAt: number | null,
  userTurns: number,
  now = Date.now(),
): boolean {
  return (
    remainingSeconds(startedAt, now) === 0 || userTurns >= MAX_VOICE_USER_TURNS
  );
}

export function canStartVoiceRound(
  limitReached: boolean,
  available: boolean,
): boolean {
  return available && !limitReached;
}

/** End a provider session exactly once; safe for a missing session. */
type VoiceSession = { endSession: () => Promise<void> };
const endingSessions = new WeakMap<VoiceSession, Promise<void>>();

export function endSessionIfActive(
  session: VoiceSession | null,
): Promise<void> {
  if (!session) return Promise.resolve();
  let ending = endingSessions.get(session);
  if (!ending) {
    ending = Promise.resolve().then(() => session.endSession());
    endingSessions.set(session, ending);
  }
  return ending;
}

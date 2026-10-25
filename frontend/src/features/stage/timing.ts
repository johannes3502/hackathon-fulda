/** Format a remaining answer window as mm:ss without inventing extra seconds. */
export function formatAnswerCountdown(remainingMs: number): string {
  const totalSeconds = Number.isFinite(remainingMs)
    ? Math.max(0, Math.ceil(remainingMs / 1000))
    : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

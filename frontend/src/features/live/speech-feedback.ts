import type { LiveFeedback } from "./contracts";

const cues: Record<string, [string, string]> = {
  "volume · quiet": [
    "Your voice is quieter",
    "Try speaking at your starting volume.",
  ],
  "volume · loud": [
    "Your voice is louder",
    "Try returning to your starting volume.",
  ],
  "pitch · monotone": [
    "Little pitch variation",
    "Try emphasizing the key words.",
  ],
  "pace · fast": [
    "Your pace has increased",
    "Give the next idea a little more time.",
  ],
  "pace · slow": [
    "Your pace has slowed",
    "Check whether this pause in pace is intentional.",
  ],
  pause: [
    "A longer pause",
    "Take your time, then continue with the next idea.",
  ],
};

export function speechCue(
  events: LiveFeedback[],
  now: number,
  shown: Map<string, number>,
) {
  const event = events.find(
    (event) =>
      cues[event.title] &&
      now - event.endMs < 10000 &&
      now - (shown.get(event.category) ?? -Infinity) >= 15000,
  );
  if (!event) return null;
  shown.set(event.category, now);
  const [title, action] = cues[event.title];
  return { ...event, title, action };
}

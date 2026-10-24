import type { LiveFeedback } from "./contracts";

type Event = {
  type: string;
  source?: unknown;
  severity: string;
  durationMs: number;
  payload: Record<string, unknown>;
};

function measured(payload: Event["payload"], ...keys: string[]) {
  for (const key of keys) {
    const raw = payload[key];
    const values = (Array.isArray(raw) ? raw : [raw])
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      )
      .sort((a, b) => a - b);
    if (!values.length) continue;
    const middle = Math.floor(values.length / 2);
    const value =
      values.length % 2
        ? values[middle]
        : (values[middle - 1] + values[middle]) / 2;
    return Number(value.toFixed(1));
  }
  return null;
}

/** No model calls, new quality cutoffs or praise inferred from missing warnings. */
export function reviewEventCopy(
  event: Event,
): Pick<LiveFeedback, "kind" | "detail" | "action"> {
  const { type, payload } = event;
  const asr = event.source === "asr";
  const heuristic = asr
    ? "Word-timestamp heuristic; check recognition and punctuation against the recording."
    : "Audio-signal heuristic relative to your voice reference; review it in context.";
  const copy = (
    detail: string,
    action: string,
    kind: LiveFeedback["kind"] = "suggestion",
  ) => ({
    kind:
      event.severity === "warning" && kind !== "positive"
        ? ("attention" as const)
        : kind,
    detail: `${detail} ${heuristic}`,
    action,
  });
  if (type === "pause") {
    const duration = Number((event.durationMs / 1000).toFixed(1));
    const observation = `A ${duration} s gap was recorded.`;
    const boundary =
      asr &&
      payload.mid_sentence === false &&
      event.durationMs > 0 &&
      typeof payload.before === "string" &&
      /[.!?:]$/.test(payload.before.trim());
    if (boundary)
      return copy(
        `${observation} It follows sentence-ending punctuation in the transcript. Pauses between complete thoughts can separate ideas; this does not establish intent.`,
        "Check the sentence boundary in the audio and keep this space between ideas where it fits.",
        "positive",
      );
    if (asr && payload.mid_sentence === true)
      return copy(
        `${observation} The transcript places it inside a sentence, where an unplanned gap can interrupt the thought. An intentional pause can still be useful.`,
        "If you lost your place, note one keyword and practise the sentence as one connected thought. Put the pause after it.",
      );
    return copy(
      `${observation} A pause can leave room to think; the signal alone does not show whether it interrupted a sentence.`,
      "Listen to the phrases before and after the pause. Keep it if it fits; use a keyword cue if you lost your place.",
      "observation",
    );
  }
  if (type === "pace") {
    const rate = measured(
      payload,
      asr ? "window_wpm" : "window_syllables_per_s",
    );
    const baseline = measured(
      payload,
      asr ? "baseline_wpm" : "window_baseline_syllables_per_s",
      "baseline_syllables_per_s",
    );
    const unit = asr ? "words/min" : "syllables/s (proxy)";
    const observation =
      rate === null
        ? "A pace change was flagged."
        : `The median rate was ${rate} ${unit}${baseline === null ? "." : ` against a reference of ${baseline} ${unit}.`}`;
    if (payload.direction === "fast")
      return copy(
        `${observation} Faster phrases can blur word endings and transitions; listen for that here.`,
        "Split the sentence into thought groups. Repeat the main point and pause before the next idea.",
      );
    if (payload.direction === "slow")
      return copy(
        `${observation} Slower delivery can emphasize a point. If it was unplanned, check whether the sentence loses its flow.`,
        "Put the thought into one short sentence and say it as a connected phrase. Keep deliberate emphasis.",
      );
    return copy(
      `${observation} The direction of the change was not recorded. Check whether the pace supports your phrasing.`,
      "Listen to the sentence and repeat it in thought groups with a pause between ideas.",
    );
  }
  if (type === "volume") {
    const delta = measured(payload, "delta_db_median", "window_delta_db");
    const observation =
      delta === null
        ? "A microphone-level change was flagged."
        : `The median microphone-level difference was ${delta} dB from the voice reference.`;
    if (payload.direction === "quiet")
      return copy(
        `${observation} A quieter level can make words harder to distinguish. Microphone movement can also change it.`,
        "Keep microphone distance steady and repeat the sentence with a clear, comfortable voice. Compare both passages.",
      );
    if (payload.direction === "loud")
      return copy(
        `${observation} A louder level changes emphasis; it does not establish clipping or that the emphasis was inappropriate.`,
        "Keep the distance steady and repeat at a more relaxed volume. Compare the recording and keep intentional emphasis.",
      );
    return copy(
      `${observation} Its direction was not recorded. Check microphone distance as well as speaking volume.`,
      "Keep microphone distance steady, repeat the sentence at a comfortable volume, and compare both recordings.",
    );
  }
  if (type === "pitch") {
    const spread = measured(payload, "std_st_median", "window_std_st");
    return copy(
      `${spread === null ? "Little pitch variation was flagged." : `Measured pitch variation was ${spread} semitones.`} Limited variation can make key words less distinct. This says nothing about emotion or interest.`,
      "Choose one key word per sentence, emphasize it with your voice, and leave a short pause afterwards.",
    );
  }
  if (type === "filler") {
    const repetition = payload.kind === "repetition";
    const word = typeof payload.word === "string" ? ` “${payload.word}”` : "";
    return copy(
      repetition
        ? `The transcript marks a repeated word start${word}. It may interrupt a sentence, but can also be intentional or a recognition error.`
        : `The transcript marks a possible filler${word}. Occasional fillers are normal; check whether this one interrupts a thought. Recognition can omit fillers.`,
      repetition
        ? "Check the repeated start against the audio. If it was unplanned, pause briefly and restart with the main point."
        : "Check the word against the audio. If you want to change it, replace it with a silent thinking pause when repeating the sentence.",
    );
  }
  return copy(
    "An observation was recorded. There is not enough specific evidence to explain its effect on this passage.",
    "Replay the surrounding sentence and decide what, if anything, you want to change.",
    event.severity === "info" ? "observation" : "suggestion",
  );
}

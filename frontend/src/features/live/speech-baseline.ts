// Prototype settings, mirrored in backend/app/speech/config.py. Time advances
// only on voiced samples, so waiting, pauses and unpitched noise cannot train it.
export const SPEECH_BASELINE = Object.freeze({
  calibrationMs: 3000,
  updateMs: 1000,
  halfLifeMs: 30000,
  minimumVoicedRatio: 0.3,
  maxLevelDeltaDb: 12,
  maxPitchDeltaSt: 12,
  maxRateRatio: 2,
  minPitchHz: 75,
  maxPitchHz: 400,
});

export type BaselineFrame = {
  levelDb: number;
  f0Hz: number | null;
  active: boolean;
  peak: boolean;
  duration: number;
};
export type SpeechReference = Readonly<{
  level: number;
  pitch: number;
  rate: number;
}>;

export const voiced = (f: BaselineFrame) =>
  f.active &&
  f.f0Hz !== null &&
  Number.isFinite(f.f0Hz) &&
  f.f0Hz >= SPEECH_BASELINE.minPitchHz &&
  f.f0Hz <= SPEECH_BASELINE.maxPitchHz;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));
const rate = (frames: BaselineFrame[]) => {
  const activeMs = frames.reduce(
    (sum, f) => sum + (f.active ? f.duration : 0),
    0,
  );
  return activeMs
    ? (frames.filter((f) => f.active && f.peak).length * 1000) / activeMs
    : 0;
};

export class AdaptiveSpeechBaseline {
  private reference: SpeechReference | null = null;
  private pending: BaselineFrame[] = [];
  private pendingMs = 0;
  private calibration: BaselineFrame[] = [];
  private voicedMs = 0;

  get current() {
    return this.reference;
  }
  get progress() {
    return Math.min(1, this.voicedMs / SPEECH_BASELINE.calibrationMs);
  }

  discardPending() {
    this.pending = [];
    this.pendingMs = 0;
    if (!this.reference) {
      this.calibration = [];
      this.voicedMs = 0;
    }
  }

  observe(frame: BaselineFrame): SpeechReference | null {
    this.pending.push(frame);
    this.pendingMs += frame.duration;
    if (this.pendingMs < SPEECH_BASELINE.updateMs) return this.reference;
    const frames = this.pending;
    const speech = frames.filter(voiced);
    const speechMs = speech.reduce((sum, f) => sum + f.duration, 0);
    const qualified =
      speechMs / this.pendingMs >= SPEECH_BASELINE.minimumVoicedRatio;
    this.pending = [];
    this.pendingMs = 0;
    if (!qualified) return this.reference;

    if (!this.reference) {
      this.calibration.push(...frames);
      this.voicedMs += speechMs;
      if (this.voicedMs < SPEECH_BASELINE.calibrationMs) return null;
      const initial = this.calibration.filter(voiced);
      this.reference = {
        level: median(initial.map((f) => f.levelDb)),
        pitch: median(initial.map((f) => f.f0Hz!)),
        rate: rate(this.calibration),
      };
      this.calibration = [];
    } else {
      const prior = this.reference;
      const alpha = -Math.expm1(
        (-Math.LN2 * speechMs) / SPEECH_BASELINE.halfLifeMs,
      );
      const levelDelta = median(speech.map((f) => f.levelDb)) - prior.level;
      const pitchDelta =
        12 * Math.log2(median(speech.map((f) => f.f0Hz!)) / prior.pitch);
      const candidateRate = rate(frames);
      this.reference = {
        level:
          prior.level +
          alpha * clamp(levelDelta, SPEECH_BASELINE.maxLevelDeltaDb),
        pitch:
          prior.pitch *
          2 **
            ((alpha * clamp(pitchDelta, SPEECH_BASELINE.maxPitchDeltaSt)) / 12),
        // Zero peaks mean insufficient rhythm evidence, not a zero reference.
        rate:
          candidateRate > 0
            ? prior.rate > 0
              ? prior.rate *
                Math.exp(
                  alpha *
                    clamp(
                      Math.log(candidateRate / prior.rate),
                      Math.log(SPEECH_BASELINE.maxRateRatio),
                    ),
                )
              : candidateRate
            : prior.rate,
      };
    }
    return this.reference;
  }
}

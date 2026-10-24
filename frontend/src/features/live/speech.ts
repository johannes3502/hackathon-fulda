import type { LiveFeedback } from "./contracts";
import {
  DEFAULT_FEATURE_FLAGS,
  feedbackEnabled,
  type FeatureFlags,
} from "./feature-flags";
import { POSE_RULES } from "../pose/evaluation";
import {
  AdaptiveSpeechBaseline,
  SPEECH_BASELINE,
  voiced,
  type SpeechReference,
} from "./speech-baseline";

// Prototype settings reused from backend/app/speech/config.py. Live activity
// uses energy, not the backend's Silero VAD. No WPM or filler claims from audio.
export const LIVE_SPEECH = Object.freeze({
  baselineMs: SPEECH_BASELINE.calibrationMs,
  frameMs: 40,
  floorDb: -50,
  activityRangeDb: 30,
  pauseMs: 2000,
  volumeWindowMs: 2000,
  volumeDeltaDb: 6,
  pitchWindowMs: 4000,
  pitchSpreadSt: 1,
  paceWindowMs: 5000,
  fastRatio: 1.3,
  slowRatio: 0.7,
  peakProminenceDb: 3,
  peakDistanceMs: 100,
  minimumActiveRatio: 0.3,
  cooldownMs: POSE_RULES.cooldownMs,
  maxGapMs: POSE_RULES.maxGapMs,
});
export type SpeechFrame = { tMs: number; levelDb: number; f0Hz: number | null };
type SignalFrame = SpeechFrame & {
  active: boolean;
  peak: boolean;
  duration: number;
};
export type SpeechState = {
  phase: "loading" | "calibrating" | "ready" | "unavailable";
  message: string;
  calibrationProgress: number;
  levelDb: number | null;
  cue: LiveFeedback | null;
  events: LiveFeedback[];
};
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b),
    m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const rate = (frames: SignalFrame[]) => {
  const activeMs = frames.reduce((n, f) => n + (f.active ? f.duration : 0), 0);
  return activeMs ? frames.filter((f) => f.peak).length / (activeMs / 1000) : 0;
};

export class SpeechEvaluator {
  private baseline: SpeechReference | null = null;
  private reference = new AdaptiveSpeechBaseline();
  private frames: SignalFrame[] = [];
  private previous = -Infinity;
  private pauseStart: number | null = null;
  private spoke = false;
  private lastPeak = -Infinity;
  private activeEvents = new Map<string, LiveFeedback>();
  private cooldown = new Map<string, number>();
  private observations: LiveFeedback[] = [];
  private visibleCue: LiveFeedback | null = null;
  private cueUntil = 0;
  constructor(
    private flags: FeatureFlags = DEFAULT_FEATURE_FLAGS,
    private sessionId = "preview",
  ) {}
  get events() {
    return [...this.observations];
  }
  update(input: SpeechFrame): SpeechState {
    const state = (
      message: string,
      cue: LiveFeedback | null = null,
    ): SpeechState => ({
      phase: this.baseline ? "ready" : "calibrating",
      message,
      calibrationProgress: this.reference.progress,
      levelDb: input.levelDb,
      cue,
      events: this.events,
    });
    if (
      !Number.isFinite(input.tMs) ||
      input.tMs < 0 ||
      input.tMs <= this.previous ||
      !Number.isFinite(input.levelDb)
    )
      return state("Waiting for fresh microphone measurements.");
    const gap = input.tMs - this.previous;
    if (Number.isFinite(this.previous) && gap > LIVE_SPEECH.maxGapMs) {
      this.frames = [];
      this.pauseStart = null;
      this.spoke = false;
      this.visibleCue = null;
      this.cueUntil = 0;
      for (const key of this.activeEvents.keys())
        this.release(key, this.previous);
      this.reference.discardPending();
    }
    this.previous = input.tMs;
    const duration = Math.min(gap, LIVE_SPEECH.frameMs);
    const gate = this.baseline
      ? Math.max(
          LIVE_SPEECH.floorDb,
          this.baseline.level - LIVE_SPEECH.activityRangeDb,
        )
      : LIVE_SPEECH.floorDb;
    const f: SignalFrame = {
      ...input,
      f0Hz:
        input.f0Hz !== null &&
        Number.isFinite(input.f0Hz) &&
        input.f0Hz >= SPEECH_BASELINE.minPitchHz &&
        input.f0Hz <= SPEECH_BASELINE.maxPitchHz
          ? input.f0Hz
          : null,
      active: input.levelDb > gate,
      peak: false,
      duration,
    };
    this.frames.push(f);
    // Envelope maxima are a syllable-rate proxy, never a word count.
    const [a, b, c] = this.frames.slice(-3);
    if (
      a &&
      b &&
      c &&
      b.active &&
      b.levelDb > a.levelDb &&
      b.levelDb >= c.levelDb &&
      b.levelDb - Math.min(a.levelDb, c.levelDb) >=
        LIVE_SPEECH.peakProminenceDb &&
      b.tMs - this.lastPeak >= LIVE_SPEECH.peakDistanceMs
    ) {
      b.peak = true;
      this.lastPeak = b.tMs;
    }
    this.frames = this.frames.filter(
      (frame) => input.tMs - frame.tMs <= LIVE_SPEECH.paceWindowMs,
    );
    if (!this.baseline) {
      this.baseline = this.reference.observe(f);
      if (!this.baseline)
        return state(
          "Start speaking normally. Calibration waits for your voice; silence does not count.",
        );
      this.frames = [];
      this.spoke = true;
      return state("Live voice feedback ready. Listening locally.");
    }
    const matches = new Set<string>();
    const observe = (
      category: string,
      direction: string,
      start: number,
      title: string,
      detail: string,
      action: string,
    ) => {
      if (!feedbackEnabled(category, this.flags)) return;
      const key = `${category}-${direction}`;
      matches.add(key);
      const prior = this.activeEvents.get(key);
      if (!prior && input.tMs < (this.cooldown.get(key) ?? 0)) return;
      const event: LiveFeedback = {
        id:
          prior?.id ??
          `${this.sessionId}-browser-speech-${key}-${Math.round(start)}`,
        category,
        kind: "observation",
        startMs: prior?.startMs ?? Math.max(0, Math.round(start)),
        endMs: Math.round(input.tMs),
        title,
        detail: `${detail} Local audio heuristic; review in context.`,
        action,
      };
      this.activeEvents.set(key, event);
      if (prior)
        this.observations = this.observations.map((item) =>
          item.id === event.id ? event : item,
        );
      else this.observations.push(event);
    };
    if (f.active) {
      this.spoke = true;
      this.pauseStart = null;
    } else if (this.spoke) this.pauseStart ??= input.tMs - duration;
    if (
      this.pauseStart !== null &&
      input.tMs - this.pauseStart >= LIVE_SPEECH.pauseMs
    )
      observe(
        "pause",
        "quiet",
        this.pauseStart,
        "Pause in speaking",
        "Microphone energy stayed below the activity gate for at least 2 seconds.",
        "Take your time. Continue when you are ready.",
      );
    for (const [category, windowMs] of [
      ["volume", LIVE_SPEECH.volumeWindowMs],
      ["pitch", LIVE_SPEECH.pitchWindowMs],
      ["pace", LIVE_SPEECH.paceWindowMs],
    ] as const) {
      const window = this.frames.filter(
        (frame) => frame.tMs > input.tMs - windowMs,
      );
      if (
        !window.length ||
        input.tMs - window[0].tMs + LIVE_SPEECH.frameMs < windowMs
      )
        continue;
      const speech = window.filter(voiced);
      if (
        speech.length / window.length < LIVE_SPEECH.minimumActiveRatio ||
        !f.active
      )
        continue;
      const start = window[0].tMs - window[0].duration;
      if (category === "volume") {
        const delta =
          median(speech.map((frame) => frame.levelDb)) - this.baseline.level;
        if (Math.abs(delta) >= LIVE_SPEECH.volumeDeltaDb)
          observe(
            category,
            delta > 0 ? "loud" : "quiet",
            start,
            delta > 0
              ? "Voice louder than your baseline"
              : "Voice quieter than your baseline",
            `Median voiced microphone level differs by ${delta.toFixed(1)} dB from your adapting reference.`,
            "Check your speaking volume and microphone distance.",
          );
      } else if (category === "pitch" && this.baseline.pitch) {
        const pitches = speech;
        if (pitches.length / window.length < LIVE_SPEECH.minimumActiveRatio)
          continue;
        const st = pitches.map(
          (frame) => 12 * Math.log2(frame.f0Hz! / this.baseline!.pitch!),
        );
        const mean = st.reduce((a, b) => a + b, 0) / st.length;
        const spread = Math.sqrt(
          st.reduce((sum, v) => sum + (v - mean) ** 2, 0) / st.length,
        );
        if (spread <= LIVE_SPEECH.pitchSpreadSt)
          observe(
            category,
            "steady",
            start,
            "Little pitch variation",
            "Detected voice pitch varied little over the last 4 seconds.",
            "Try emphasizing one word if it supports your point.",
          );
      } else if (category === "pace" && this.baseline.rate > 0) {
        const ratio = rate(window) / this.baseline.rate;
        if (ratio >= LIVE_SPEECH.fastRatio || ratio <= LIVE_SPEECH.slowRatio)
          observe(
            category,
            ratio > 1 ? "fast" : "slow",
            start,
            ratio > 1
              ? "Speaking rhythm increased"
              : "Speaking rhythm decreased",
            "The rate of audio-envelope peaks changed from your adapting reference; this is not words per minute.",
            "Choose a pace that helps explain your next point.",
          );
      }
    }
    for (const key of this.activeEvents.keys())
      if (!matches.has(key)) this.release(key, input.tMs);
    // Judge against the prior reference before learning from this sample.
    this.baseline = this.reference.observe(f);
    const cue =
      [...this.activeEvents.values()].sort((a, b) =>
        a.category === "pause"
          ? -1
          : b.category === "pause"
            ? 1
            : b.startMs - a.startMs,
      )[0] ?? null;
    if (this.visibleCue && input.tMs < this.cueUntil) {
      this.visibleCue =
        this.observations.find((event) => event.id === this.visibleCue!.id) ??
        this.visibleCue;
    } else {
      this.visibleCue = cue;
      this.cueUntil = input.tMs + POSE_RULES.cueDwellMs;
    }
    return state(
      "Live voice feedback ready. Your reference adjusts gradually while you speak.",
      this.visibleCue,
    );
  }
  private release(key: string, t: number) {
    this.activeEvents.delete(key);
    this.cooldown.set(key, t + LIVE_SPEECH.cooldownMs);
  }
}

// Full-recording analysis may find the same interval again. Prefer that result
// in review, keeping live observations when no corresponding result arrived.
export function mergeSpeechFeedback(
  recorded: LiveFeedback[],
  live: LiveFeedback[],
) {
  return [
    ...recorded,
    ...live.filter(
      (item) =>
        !recorded.some(
          (other) =>
            other.category === item.category &&
            other.startMs <= item.endMs &&
            other.endMs >= item.startMs,
        ),
    ),
  ].sort((a, b) => a.startMs - b.startMs);
}

export class LiveSpeech {
  private context?: AudioContext;
  private input?: MediaStreamAudioSourceNode;
  private processor?: AudioWorkletNode;
  private disposed = false;
  private origin = performance.now();
  private engine: SpeechEvaluator;
  private timer?: ReturnType<typeof setTimeout>;
  private lastPublish = -Infinity;
  constructor(
    private flags: FeatureFlags,
    private update: (state: SpeechState) => void,
  ) {
    this.engine = new SpeechEvaluator(flags);
  }
  get events() {
    return this.engine.events;
  }
  beginRecording(timestamp: number, sessionId: string) {
    this.origin = timestamp;
    this.engine = new SpeechEvaluator(this.flags, sessionId);
    this.lastPublish = -Infinity;
    this.update({
      phase: "calibrating",
      message:
        "Start speaking normally. Calibration waits for your voice; silence does not count.",
      calibrationProgress: 0,
      levelDb: null,
      cue: null,
      events: [],
    });
  }
  async start(stream: MediaStream) {
    this.update({
      phase: "loading",
      message: "Starting local microphone measurements…",
      calibrationProgress: 0,
      levelDb: null,
      cue: null,
      events: [],
    });
    try {
      if (!stream.getAudioTracks().some((track) => track.readyState === "live"))
        throw new Error("No live microphone");
      this.timer = setTimeout(() => this.fail(), 5000);
      const context = (this.context = new AudioContext({ sampleRate: 16000 }));
      await context.resume();
      await context.audioWorklet.addModule("/audio/feedback-worklet.js");
      if (this.disposed) return;
      const clock = performance.now() - context.currentTime * 1000;
      const processor = (this.processor = new AudioWorkletNode(
        context,
        "speech-measurements",
        { channelCount: 1, channelCountMode: "explicit" },
      ));
      processor.port.onmessage = ({ data }: MessageEvent<SpeechFrame>) => {
        if (this.disposed) return;
        const frame = { ...data, tMs: clock + data.tMs - this.origin };
        if (frame.tMs < 0) return; // Discard an in-flight preview block at take start.
        const state = this.engine.update(frame);
        if (frame.tMs - this.lastPublish >= 100) {
          this.lastPublish = frame.tMs;
          this.update(state);
        }
      };
      processor.onprocessorerror = () => this.fail();
      this.input = context.createMediaStreamSource(stream);
      this.input.connect(processor);
      processor.connect(context.destination);
      clearTimeout(this.timer);
    } catch {
      if (!this.disposed) this.fail();
    }
  }
  private fail() {
    this.update({
      phase: "unavailable",
      message:
        "Live voice feedback unavailable. Check microphone access; recording can continue.",
      calibrationProgress: 0,
      levelDb: null,
      cue: null,
      events: this.events,
    });
    this.stop();
  }
  stop() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.input?.disconnect();
    this.processor?.disconnect();
    if (this.processor) this.processor.port.onmessage = null;
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
  }
}

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
import { loadLiveHintSettings } from "../admin/settings";
import { PositiveFeedback } from "./positive-feedback";

// Prototype settings reused from backend/app/speech/config.py. Live activity
// uses energy, not the backend's Silero VAD. No WPM or filler claims from audio.
export const LIVE_SPEECH = Object.freeze({
  baselineMs: SPEECH_BASELINE.calibrationMs,
  frameMs: 40,
  floorDb: -50,
  activityRangeDb: 30,
  pauseMs: 2000,
  // Too many pauses: more than pauseRateMax pauses of at least pauseMs within
  // the sliding window. User-chosen heuristic, not a validated limit.
  pauseRateWindowMs: 30000,
  pauseRateMax: 3,
  // Pause silence sits halfway between the room's noise floor and the voice,
  // as low and high level percentiles over the recent window, once they lie
  // pauseRangeDb apart. Room noise above voice - activityRangeDb then still
  // counts as silence. Engineering values, not validated.
  noiseWindowMs: 15000,
  noisePercentile: 0.1,
  voicePercentile: 0.9,
  pauseRangeDb: 8,
  pauseReadyMs: 3000,
  // Louder blips shorter than this do not end a pause.
  pauseResumeMs: 160,
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
  // Confirmed pauses in the pause-rate window, for the studio readout.
  pauseCount?: number;
  pauseReady?: boolean;
};
// Observation keys of the pause rules, for callers that only want them.
export const PAUSE = "pause-quiet";
export const PAUSE_RATE = "pause-frequent";
export const isPauseRate = (event: LiveFeedback) =>
  event.id.includes(`-${PAUSE_RATE}-`);
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
  private positive = new PositiveFeedback(
    {
      id: `${this.sessionId}-steady-volume`,
      category: "volume",
      title: "Voice level near your reference",
      detail:
        "Voiced microphone level stayed within the existing volume range of your calibrated reference. Local audio heuristic; this does not establish clarity or an appropriate speaking pace.",
      action:
        "Listen to this passage and compare its volume with a flagged passage.",
    },
    LIVE_SPEECH.maxGapMs,
    POSE_RULES.stabilizeHoldMs,
  );
  get positiveFeedback() {
    return this.positive.feedback;
  }
  private baseline: SpeechReference | null = null;
  private reference = new AdaptiveSpeechBaseline();
  private frames: SignalFrame[] = [];
  private previous = -Infinity;
  private pauseStart: number | null = null;
  // Confirmed pauses in the rate window: start and confirmation time.
  private pauses: { start: number; at: number }[] = [];
  private pauseCounted = false;
  private loudMs = 0;
  private gate: number | null = null;
  private levels: { tMs: number; levelDb: number }[] = [];
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
    private minDisplayMs: number = POSE_RULES.minDisplayMs,
    // Observation keys to report; all when omitted.
    private only?: ReadonlySet<string>,
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
      pauseCount: this.pauses.length,
      pauseReady: this.gate !== null,
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
      this.pauseCounted = false;
      this.loudMs = 0;
      this.spoke = false;
      this.visibleCue = null;
      this.cueUntil = 0;
      for (const key of this.activeEvents.keys())
        this.release(key, this.previous);
      this.reference.discardPending();
    }
    this.previous = input.tMs;
    this.levels.push({ tMs: input.tMs, levelDb: input.levelDb });
    while (input.tMs - this.levels[0].tMs > LIVE_SPEECH.noiseWindowMs)
      this.levels.shift();
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
    const volumeWindow = this.frames.filter(
      (frame) => frame.tMs > input.tMs - LIVE_SPEECH.volumeWindowMs,
    );
    const volumeSpeech = volumeWindow.filter(voiced);
    this.positive.update(
      input.tMs,
      feedbackEnabled("volume", this.flags) &&
        this.baseline !== null &&
        voiced(f) &&
        volumeWindow.length * LIVE_SPEECH.frameMs >=
          LIVE_SPEECH.volumeWindowMs &&
        volumeSpeech.length / volumeWindow.length >=
          LIVE_SPEECH.minimumActiveRatio &&
        Math.abs(
          median(volumeSpeech.map((frame) => frame.levelDb)) -
            this.baseline.level,
        ) < LIVE_SPEECH.volumeDeltaDb &&
        Math.abs(f.levelDb - this.baseline.level) < LIVE_SPEECH.volumeDeltaDb,
    );
    const matches = new Set<string>();
    const observe = (
      category: string,
      direction: string,
      start: number,
      title: string,
      detail: string,
      action: string,
      kind: LiveFeedback["kind"] = "observation",
    ) => {
      if (!feedbackEnabled(category, this.flags)) return;
      const key = `${category}-${direction}`;
      if (this.only && !this.only.has(key)) return;
      matches.add(key);
      const prior = this.activeEvents.get(key);
      if (!prior && input.tMs < (this.cooldown.get(key) ?? 0)) return;
      const event: LiveFeedback = {
        id:
          prior?.id ??
          `${this.sessionId}-browser-speech-${key}-${Math.round(start)}`,
        category,
        kind,
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
    // Pause counting needs no voice calibration: a weak microphone without
    // gain control may never pass it, while the room level range suffices.
    this.gate = this.pauseGate();
    if (this.gate === null) {
      this.pauseStart = null;
      this.loudMs = 0;
    } else if (input.levelDb >= this.gate) {
      this.loudMs += duration;
      if (this.loudMs >= LIVE_SPEECH.pauseResumeMs) {
        this.spoke = true;
        this.pauseStart = null;
        this.pauseCounted = false;
      }
    } else {
      this.loudMs = 0;
      if (this.spoke) this.pauseStart ??= input.tMs - duration;
    }
    const pauseStart = this.pauseStart;
    const pausing =
      pauseStart !== null && input.tMs - pauseStart >= LIVE_SPEECH.pauseMs;
    // A pause counts once, as soon as it is confirmed, not when speech resumes.
    if (pausing && !this.pauseCounted) {
      this.pauseCounted = true;
      this.pauses.push({ start: pauseStart, at: input.tMs });
      // Console trace for tuning, like the pose lab.
      console.log(
        `[speech] pause confirmed at ${(input.tMs / 1000).toFixed(1)} s (gate ${this.gate!.toFixed(1)} dB)`,
      );
    }
    this.pauses = this.pauses.filter(
      (pause) => input.tMs - pause.at < LIVE_SPEECH.pauseRateWindowMs,
    );
    if (this.pauses.length > LIVE_SPEECH.pauseRateMax)
      observe(
        "pause",
        "frequent",
        this.pauses[0].start,
        "Too many pauses",
        `${this.pauses.length} pauses of at least ${LIVE_SPEECH.pauseMs / 1000} seconds within the last ${LIVE_SPEECH.pauseRateWindowMs / 1000} seconds.`,
        "Note one keyword per idea so you can continue smoothly.",
        "suggestion",
      );
    if (pausing)
      observe(
        "pause",
        "quiet",
        pauseStart,
        "Pause in speaking",
        "Microphone level stayed near the room's noise level for at least 2 seconds.",
        "Take your time. Continue when you are ready.",
      );
    // Releases ended observations and picks the visible cue.
    const finish = (message: string) => {
      // Too many pauses first, then a single pause, then the newest finding.
      const rank = (key: string) =>
        key === PAUSE_RATE ? 0 : key.startsWith("pause-") ? 1 : 2;
      const cue =
        [...this.activeEvents]
          .sort(
            ([keyA, a], [keyB, b]) =>
              rank(keyA) - rank(keyB) || b.startMs - a.startMs,
          )
          .map(([, event]) => event)[0] ?? null;
      if (this.visibleCue && input.tMs < this.cueUntil) {
        this.visibleCue =
          this.observations.find((event) => event.id === this.visibleCue!.id) ??
          this.visibleCue;
      } else {
        this.visibleCue = cue;
        this.cueUntil = input.tMs + this.minDisplayMs;
      }
      return state(message, this.visibleCue);
    };
    if (!this.baseline) {
      for (const key of this.activeEvents.keys())
        if (!matches.has(key)) this.release(key, input.tMs);
      this.baseline = this.reference.observe(f);
      if (!this.baseline)
        return finish(
          "Start speaking normally. Calibration waits for your voice; silence does not count.",
        );
      this.frames = [];
      // Calibration needs voiced speech, so a following silence is a pause.
      this.spoke = true;
      return finish("Live voice feedback ready. Listening locally.");
    }
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
    return finish(
      "Live voice feedback ready. Your reference adjusts gradually while you speak.",
    );
  }
  /** Level below which a frame counts as pause silence; null if unknown. */
  private pauseGate() {
    const levels = this.levels.map((l) => l.levelDb).sort((a, b) => a - b);
    const at = (p: number) => levels[Math.floor((levels.length - 1) * p)];
    const span = this.levels.length
      ? this.levels[this.levels.length - 1].tMs - this.levels[0].tMs
      : 0;
    const noise = at(LIVE_SPEECH.noisePercentile);
    const voice = at(LIVE_SPEECH.voicePercentile);
    if (
      span >= LIVE_SPEECH.pauseReadyMs &&
      voice - noise >= LIVE_SPEECH.pauseRangeDb
    )
      return (noise + voice) / 2;
    // Without a clear room range, fall back to the calibrated voice reference.
    return this.baseline
      ? Math.max(
          LIVE_SPEECH.floorDb,
          this.baseline.level - LIVE_SPEECH.activityRangeDb,
        )
      : null;
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
    private only?: ReadonlySet<string>,
  ) {
    this.engine = new SpeechEvaluator(
      flags,
      undefined,
      loadLiveHintSettings().minDisplayMs,
      only,
    );
  }
  get events() {
    return this.engine.events;
  }
  get positiveFeedback() {
    return this.engine.positiveFeedback;
  }
  beginRecording(timestamp: number, sessionId: string) {
    this.origin = timestamp;
    this.engine = new SpeechEvaluator(
      this.flags,
      sessionId,
      loadLiveHintSettings().minDisplayMs,
      this.only,
    );
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

import { analysisResult, parseWords } from "./analysis";
import type { LiveFeedback, LiveTranscript } from "./contracts";

// Signal preview and optional Deepgram streaming; reuse only an acknowledged final transcript.
export class LiveCaptions {
  private socket?: WebSocket;
  private context?: AudioContext;
  private input?: MediaStreamAudioSourceNode;
  private processor?: AudioWorkletNode;
  private timeout?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private sentMs = 0;
  private checkedMs = 0;
  private offsetMs = 0;
  private capturing = false;
  private finishing = false;
  private durationMs = 0;
  private cloudReady = false;
  private finalWords?: unknown[];
  private resolveReady!: (ready: boolean) => void;
  private readyResult = new Promise<boolean>((resolve) => {
    this.resolveReady = resolve;
  });
  private resolveResult!: (result: LiveTranscript | null) => void;
  private result = new Promise<LiveTranscript | null>((resolve) => {
    this.resolveResult = resolve;
  });
  constructor(
    private update: (text: string, status: string) => void,
    private feedback?: (events: LiveFeedback[]) => void,
    private cloud = false,
  ) {}

  async start(
    stream: MediaStream,
    endpoint: string,
    recordingStart = performance.now(),
    deferCapture = false,
  ) {
    this.update(
      "",
      this.feedback
        ? "Connecting live speech feedback…"
        : "Connecting live captions…",
    );
    try {
      const context = (this.context = new AudioContext({ sampleRate: 16000 }));
      await context.resume();
      await context.audioWorklet.addModule("/audio/pcm-worklet.js");
      if (this.disposed) return;
      if (context.sampleRate !== 16000 || context.state !== "running")
        throw new Error("Audio capture unavailable");
      const url = new URL(
        `${endpoint}/speech/${this.feedback ? "feedback" : "live"}`,
      );
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = (this.socket = new WebSocket(url));
      this.timeout = setTimeout(() => this.fail(), 20000);
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "start",
            sample_rate: 16000,
            ...(this.cloud ? { provider: "deepgram" } : {}),
          }),
        );
      socket.onmessage = ({ data }) => {
        if (this.disposed) return;
        try {
          const message: unknown = JSON.parse(data);
          if (!message || typeof message !== "object" || !("type" in message))
            throw new Error("Invalid caption message");
          if (message.type === "ready" && !this.processor) {
            if (!("sample_rate" in message) || message.sample_rate !== 16000)
              throw new Error("Unsupported sample rate");
            clearTimeout(this.timeout);
            this.cloudReady =
              this.cloud &&
              "provider" in message &&
              message.provider === "deepgram";
            if (this.cloud && !this.cloudReady)
              throw new Error("Unexpected transcription provider");
            this.offsetMs = Math.max(
              0,
              Math.round(performance.now() - recordingStart),
            );
            this.processor = new AudioWorkletNode(context, "caption-pcm", {
              channelCount: 1,
              channelCountMode: "explicit",
            });
            this.processor.port.onmessage = ({
              data,
            }: MessageEvent<ArrayBuffer | { type: string }>) => {
              if (this.disposed || socket.readyState !== WebSocket.OPEN) return;
              if (!(data instanceof ArrayBuffer)) {
                if (data.type === "flushed" && this.finishing) {
                  if (Math.abs(this.sentMs - this.durationMs) > 250) {
                    this.fail(); // Missing audio or a suspended worklet requires full local ASR.
                    return;
                  }
                  socket.send(JSON.stringify({ type: "stop" }));
                  this.releaseAudio();
                }
                return;
              }
              // Stop the preview instead of silently dropping audio and shifting its clock.
              this.sentMs += data.byteLength / 32;
              if (
                socket.bufferedAmount > 320000 ||
                (this.feedback && this.sentMs - this.checkedMs > 15000)
              ) {
                this.fail();
                return;
              }
              socket.send(data);
            };
            this.input = context.createMediaStreamSource(stream);
            if (!deferCapture) {
              this.input.connect(this.processor);
              this.capturing = true;
            }
            this.resolveReady(true);
            this.processor.connect(context.destination); // Worklet outputs silence.
            this.update(
              "",
              this.feedback
                ? "Start speaking normally. Calibration waits for your voice, then adjusts gradually. Feedback updates every 5 seconds."
                : "Listening…",
            );
          } else if (message.type === "feedback" && this.feedback) {
            if (
              !("position_ms" in message) ||
              typeof message.position_ms !== "number" ||
              !Number.isInteger(message.position_ms) ||
              message.position_ms < this.checkedMs ||
              message.position_ms > this.sentMs ||
              !("events" in message) ||
              !Array.isArray(message.events) ||
              message.events.length > 1000
            )
              throw new Error("Invalid speech feedback");
            const result = analysisResult(
              { summary: {}, events: message.events },
              "speech",
              message.position_ms,
            );
            this.checkedMs = message.position_ms;
            this.feedback(
              result.feedback.map((event) => ({
                ...event,
                startMs: event.startMs + this.offsetMs,
                endMs: event.endMs + this.offsetMs,
              })),
            );
            this.update(
              "",
              "Live speech feedback · heuristic · updates every 5 seconds",
            );
          } else if (message.type === "words" && this.cloud) {
            if (
              !("final" in message) ||
              message.final !== true ||
              !("words" in message) ||
              !Array.isArray(message.words) ||
              message.words.length > 50000
            )
              throw new Error("Invalid final transcript");
            this.finalWords = message.words;
          } else if (message.type === "text") {
            if (
              !("text" in message) ||
              typeof message.text !== "string" ||
              message.text.length > 100000
            )
              throw new Error("Invalid caption text");
            this.update(
              message.text,
              this.cloud
                ? "Live transcript · Deepgram EU"
                : "Live captions · preview",
            );
          } else if (
            message.type === "done" &&
            this.finishing &&
            this.cloudReady &&
            this.finalWords !== undefined
          ) {
            const words = this.finalWords.length
              ? parseWords(this.finalWords, this.durationMs + 250)
              : [];
            this.resolveResult({
              words: words.map((word) => ({
                ...word,
                start_ms: Math.min(
                  this.durationMs,
                  word.start_ms + this.offsetMs,
                ),
                end_ms: Math.min(this.durationMs, word.end_ms + this.offsetMs),
              })),
              provider: "deepgram",
              synthetic: false,
              notices: [
                "Deepgram EU live transcript. Check recognition errors before using it.",
              ],
            });
            this.stop();
          } else if (message.type === "error" || message.type === "done") {
            this.fail();
          }
        } catch {
          this.fail();
        }
      };
      socket.onerror = () => this.fail();
      socket.onclose = () => this.fail();
    } catch {
      this.fail();
    }
  }

  /** Preconnect before MediaRecorder starts so the beginning isn't lost to connection setup. */
  ready() {
    return this.readyResult;
  }

  beginRecording() {
    if (this.disposed || this.capturing || !this.input || !this.processor)
      return;
    this.offsetMs = 0;
    this.input.connect(this.processor);
    this.capturing = true;
  }

  finish(durationMs: number): Promise<LiveTranscript | null> {
    if (this.finishing || this.disposed) return this.result;
    if (!this.cloudReady || !this.processor || !this.capturing) {
      this.stop();
      return this.result;
    }
    this.finishing = true;
    this.durationMs = Math.max(0, Math.floor(durationMs));
    this.input?.disconnect();
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.fail(), 12000);
    // The worklet posts its final partial frame before acknowledging this flush.
    this.processor.port.postMessage({ type: "flush" });
    return this.result;
  }

  private fail() {
    if (this.disposed) return;
    this.update(
      "",
      this.feedback
        ? "Live speech feedback unavailable or behind. Recording continues; analysis runs after stopping."
        : "Live captions unavailable. Recording continues; the full transcript is created after stopping.",
    );
    this.stop();
  }

  private releaseAudio() {
    this.input?.disconnect();
    this.input = undefined;
    this.processor?.disconnect();
    if (this.processor) this.processor.port.onmessage = null;
    this.processor = undefined;
    const context = this.context;
    this.context = undefined;
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
  }

  stop() {
    if (this.disposed) return;
    this.disposed = true;
    this.resolveReady(false);
    this.resolveResult(null);
    clearTimeout(this.timeout);
    this.releaseAudio();
    if (this.socket) {
      this.socket.onopen =
        this.socket.onmessage =
        this.socket.onerror =
        this.socket.onclose =
          null;
      if (!this.finishing && this.socket.readyState === WebSocket.OPEN)
        this.socket.send(JSON.stringify({ type: "stop" }));
      this.socket.close();
    }
  }
}

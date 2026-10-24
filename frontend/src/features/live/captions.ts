import { analysisResult } from "./analysis";
import type { LiveFeedback } from "./contracts";

// Previews only: full review analysis still comes from the complete recording.
export class LiveCaptions {
  private socket?: WebSocket;
  private context?: AudioContext;
  private input?: MediaStreamAudioSourceNode;
  private processor?: AudioWorkletNode;
  private timeout?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private sentMs = 0;
  private checkedMs = 0;
  constructor(
    private update: (text: string, status: string) => void,
    private feedback?: (events: LiveFeedback[]) => void,
  ) {}

  async start(
    stream: MediaStream,
    endpoint: string,
    recordingStart = performance.now(),
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
        socket.send(JSON.stringify({ type: "start", sample_rate: 16000 }));
      let offsetMs = 0;
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
            offsetMs = Math.max(
              0,
              Math.round(performance.now() - recordingStart),
            );
            this.processor = new AudioWorkletNode(context, "caption-pcm", {
              channelCount: 1,
              channelCountMode: "explicit",
            });
            this.processor.port.onmessage = ({
              data,
            }: MessageEvent<ArrayBuffer>) => {
              if (this.disposed || socket.readyState !== WebSocket.OPEN) return;
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
            this.input.connect(this.processor);
            this.processor.connect(context.destination); // Worklet outputs silence.
            this.update(
              "",
              this.feedback
                ? "Speak normally for 3 seconds to calibrate. Feedback updates every 5 seconds."
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
                startMs: event.startMs + offsetMs,
                endMs: event.endMs + offsetMs,
              })),
            );
            this.update(
              "",
              "Live speech feedback · heuristic · updates every 5 seconds",
            );
          } else if (message.type === "text") {
            if (
              !("text" in message) ||
              typeof message.text !== "string" ||
              message.text.length > 100000
            )
              throw new Error("Invalid caption text");
            this.update(message.text, "Live captions · preview");
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

  stop() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timeout);
    this.input?.disconnect();
    this.processor?.disconnect();
    if (this.processor) this.processor.port.onmessage = null;
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
    if (this.socket) {
      this.socket.onopen =
        this.socket.onmessage =
        this.socket.onerror =
        this.socket.onclose =
          null;
      if (this.socket.readyState === WebSocket.OPEN)
        this.socket.send(JSON.stringify({ type: "stop" }));
      this.socket.close();
    }
  }
}

// Preview only: review timestamps always come from the complete recording.
export class LiveCaptions {
  private socket?: WebSocket;
  private context?: AudioContext;
  private input?: MediaStreamAudioSourceNode;
  private processor?: AudioWorkletNode;
  private timeout?: ReturnType<typeof setTimeout>;
  private disposed = false;
  constructor(private update: (text: string, status: string) => void) {}

  async start(stream: MediaStream, endpoint: string) {
    this.update("", "Connecting live captions…");
    try {
      const context = (this.context = new AudioContext({ sampleRate: 16000 }));
      await context.resume();
      await context.audioWorklet.addModule("/audio/pcm-worklet.js");
      if (this.disposed) return;
      if (context.sampleRate !== 16000 || context.state !== "running")
        throw new Error("Audio capture unavailable");
      const url = new URL(`${endpoint}/speech/live`);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = (this.socket = new WebSocket(url));
      this.timeout = setTimeout(() => this.fail(), 20000);
      socket.onopen = () =>
        socket.send(JSON.stringify({ type: "start", sample_rate: 16000 }));
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
            this.processor = new AudioWorkletNode(context, "caption-pcm", {
              channelCount: 1,
              channelCountMode: "explicit",
            });
            this.processor.port.onmessage = ({
              data,
            }: MessageEvent<ArrayBuffer>) => {
              if (this.disposed || socket.readyState !== WebSocket.OPEN) return;
              // Stop the preview instead of silently dropping audio and shifting its clock.
              if (socket.bufferedAmount > 320000) {
                this.fail();
                return;
              }
              socket.send(data);
            };
            this.input = context.createMediaStreamSource(stream);
            this.input.connect(this.processor);
            this.processor.connect(context.destination); // Worklet outputs silence.
            this.update("", "Listening…");
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
      "Live captions unavailable. Recording continues; the full transcript is created after stopping.",
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

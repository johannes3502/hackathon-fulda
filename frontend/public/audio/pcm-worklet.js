class CaptionPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new ArrayBuffer(3200);
    this.view = new DataView(this.buffer);
    this.index = 0;
    this.port.onmessage = ({ data }) => {
      if (data?.type !== "flush") return;
      if (this.index) {
        const tail = this.buffer.slice(0, this.index * 2);
        this.port.postMessage(tail, [tail]);
        this.index = 0;
      }
      this.port.postMessage({ type: "flushed" });
    };
  }
  process(inputs) {
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    for (const sample of samples) {
      const value = Math.max(-1, Math.min(1, sample));
      this.view.setInt16(
        this.index * 2,
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true,
      );
      if (++this.index === 1600) {
        this.port.postMessage(this.buffer, [this.buffer]);
        this.buffer = new ArrayBuffer(3200);
        this.view = new DataView(this.buffer);
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor("caption-pcm", CaptionPCM);

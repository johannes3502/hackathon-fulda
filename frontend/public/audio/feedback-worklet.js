// Local signal measurements only. The node outputs silence, never microphone
// monitoring, and never sends audio to a server.
class SpeechMeasurements extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(Math.round(sampleRate * 0.04));
    this.index = 0;
  }
  pitch() {
    // Same YIN parameters as backend/app/speech/config.py. Downsample only
    // the pitch calculation if the browser chooses a higher context rate.
    const stride = Math.max(1, Math.floor(sampleRate / 16000));
    const rate = sampleRate / stride;
    const length = Math.floor(this.frame.length / stride);
    const min = Math.floor(rate / 400),
      max = Math.floor(rate / 75);
    const width = length - max;
    const difference = new Float64Array(max + 1);
    let sum = 0;
    for (let tau = 1; tau <= max; tau++) {
      let d = 0;
      for (let i = 0; i < width; i++) {
        const delta = this.frame[i * stride] - this.frame[(i + tau) * stride];
        d += delta * delta;
      }
      sum += d;
      difference[tau] = sum > 0 ? (d * tau) / sum : 1;
    }
    for (let tau = min; tau <= max; tau++) {
      if (difference[tau] >= 0.15) continue;
      while (tau < max && difference[tau + 1] < difference[tau]) tau++;
      let shift = 0;
      if (tau > min && tau < max) {
        const a = difference[tau - 1],
          b = difference[tau],
          c = difference[tau + 1];
        if (a - 2 * b + c) shift = (0.5 * (a - c)) / (a - 2 * b + c);
      }
      return rate / (tau + shift);
    }
    return null;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i] ?? 0;
      this.frame[this.index++] = value / channels.length;
      if (this.index !== this.frame.length) continue;
      let power = 0;
      for (const sample of this.frame) power += sample * sample;
      const levelDb = Math.max(
        -100,
        20 * Math.log10(Math.sqrt(power / this.frame.length) + 1e-10),
      );
      this.port.postMessage({
        tMs: ((currentFrame + i + 1) / sampleRate) * 1000,
        levelDb,
        f0Hz: levelDb > -50 ? this.pitch() : null,
      });
      this.index = 0;
    }
    return true;
  }
}
registerProcessor("speech-measurements", SpeechMeasurements);

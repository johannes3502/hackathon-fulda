export class ActiveClock {
  private elapsed = 0;
  private anchor: number;
  private paused = true;
  private speed = 1;
  constructor(private now: () => number = () => performance.now()) {
    this.anchor = now();
  }
  read() {
    return (
      this.elapsed + (this.paused ? 0 : (this.now() - this.anchor) * this.speed)
    );
  }
  getSpeed() {
    return this.speed;
  }
  pause() {
    this.elapsed = this.read();
    this.paused = true;
  }
  resume() {
    this.anchor = this.now();
    this.paused = false;
  }
  setSpeed(speed: number) {
    this.elapsed = this.read();
    this.anchor = this.now();
    this.speed = speed;
  }
  seek(time: number) {
    this.elapsed = time;
    this.anchor = this.now();
  }
}

type MicrophoneSession = { setMicMuted: (muted: boolean) => void };

/** Apply SDK mode changes synchronously, without waiting for a React render. */
export class VoiceMicrophone {
  private session: MicrophoneSession | null = null;
  private mode: "speaking" | "listening" = "listening";
  private muted = false;

  constructor(private protectAgentSpeech = false) {}

  attach(session: MicrophoneSession) {
    this.session = session;
    this.apply();
  }

  setMode(mode: "speaking" | "listening") {
    this.mode = mode;
    this.apply();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.apply();
  }

  setProtectAgentSpeech(enabled: boolean) {
    this.protectAgentSpeech = enabled;
    this.apply();
  }

  /** Forget the ended session; retain only the user's protection preference. */
  detach() {
    this.session = null;
    this.mode = "listening";
    this.muted = false;
  }

  private apply() {
    this.session?.setMicMuted(
      this.muted || (this.protectAgentSpeech && this.mode === "speaking"),
    );
  }
}

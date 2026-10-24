import type {
  CoachCommand,
  DemoCommand,
  SessionConfig,
  SessionState,
} from "../../frontend/src/features/coach/contracts";
import { MockCoachGateway } from "../../frontend/src/features/coach/mock/MockCoachGateway";
import { sessionReducer } from "../../frontend/src/features/coach/reducer";

/** Owns the subscription as the shared gateway replaces attempts on reset/retry. */
export class NativePractice {
  state?: SessionState;
  private unsubscribe?: () => void;
  private disposed = false;
  private busy = false;
  constructor(
    private gateway: MockCoachGateway,
    private changed: (state: SessionState) => void,
  ) {}
  private replace(state: SessionState) {
    if (this.disposed) return;
    this.unsubscribe?.();
    this.state = state;
    this.unsubscribe = this.gateway.subscribe(state.ref, (event) => {
      if (!this.state || this.disposed) return;
      this.state = sessionReducer(this.state, { type: "event", event });
      this.changed(this.state);
    });
    this.changed(state);
  }
  async start(config: SessionConfig) {
    const state = await this.gateway.createSession(config);
    this.replace(await this.gateway.getSession(state.ref.sessionId));
  }
  async send(command: CoachCommand | DemoCommand, speed?: number) {
    const state = this.state;
    if (!state || this.busy || this.disposed) return;
    this.busy = true;
    try {
      if (typeof command === "string")
        this.replace(await this.gateway.demo(state.ref, command, speed));
      else await this.gateway.send(state.ref, command);
    } finally {
      this.busy = false;
    }
  }
  async retry(findingId: string) {
    if (!this.state || this.busy || this.disposed) return;
    this.busy = true;
    try {
      this.replace(await this.gateway.createRetry(this.state.ref, findingId));
    } finally {
      this.busy = false;
    }
  }
  dispose() {
    this.disposed = true;
    this.unsubscribe?.();
  }
}

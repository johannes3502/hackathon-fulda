import { expect, it, vi } from "vitest";
import { MockCoachGateway } from "../../frontend/src/features/coach/mock/MockCoachGateway";
import { defaults } from "../../frontend/src/features/coach/mock/fixtures/scenario";
it("runs the shared scripted sample with a native UUID provider and without browser storage", async () => {
  vi.useFakeTimers();
  try {
    const gateway = new MockCoachGateway(
      () => 1000,
      () => "native-session",
    );
    const pending = gateway.createSession(defaults);
    await vi.runAllTimersAsync();
    const state = await pending;
    expect(state.ref.sessionId).toBe("native-session");
    const reportPending = gateway.demo(state.ref, "review");
    await vi.runAllTimersAsync();
    const report = await reportPending;
    expect(report.phase).toBe("review");
    expect(report.completedReports[0].findings.length).toBeGreaterThan(0);
  } finally {
    vi.useRealTimers();
  }
});

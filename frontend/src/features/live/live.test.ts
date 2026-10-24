import { describe, expect, it, vi } from "vitest";
import { clipRange, upsertFeedback } from "./protocol";
import { LocalVideoTransport } from "./transport";
import type { LiveFeedback } from "./contracts";

const feedback: LiveFeedback = {
  id: "f1",
  category: "Gestures",
  kind: "suggestion",
  startMs: 4000,
  endMs: 6000,
  title: "A gesture",
  detail: "Review this moment.",
  action: "Try again.",
};
const session = { sessionId: "s1", title: "Practice", mimeType: "video/webm" };
const meta = {
  type: "video.chunk" as const,
  sessionId: "s1",
  seq: 1,
  startMs: 0,
  endMs: 6000,
  byteLength: 3,
};
describe("live feedback", () => {
  it("revises observations by ID and bounds replay context to recorded media", () => {
    const earlier = { ...feedback, id: "f0", startMs: 500, endMs: 2500 };
    const items = upsertFeedback([feedback], earlier);
    expect(items.map((f) => f.id)).toEqual(["f0", "f1"]);
    expect(
      upsertFeedback(items, { ...feedback, title: "Updated" }),
    ).toHaveLength(2);
    expect(clipRange(earlier, 7000)).toEqual({ start: 0, end: 4.5 });
    expect(clipRange(feedback, 6500)).toEqual({ start: 2, end: 6.5 });
  });
  it("local transport never invents feedback from elapsed recording time", async () => {
    const transport: import("./contracts").VideoTransport =
      new LocalVideoTransport();
    const receive = vi.fn();
    await transport.connect(session, receive);
    await transport.send(new Blob(), meta);
    await transport.send(new Blob(), { ...meta, endMs: 60000 });
    await transport.finish(60000, new Blob());
    transport.close();
    expect(receive).not.toHaveBeenCalled();
  });
});

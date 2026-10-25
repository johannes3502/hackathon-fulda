import { expect, it } from "vitest";
import { PositiveFeedback } from "./positive-feedback";

it("requires sustained consecutive measurements, excludes gaps, and snapshots saved evidence", () => {
  const tracker = new PositiveFeedback(
    {
      id: "take",
      category: "volume",
      title: "Measured",
      detail: "Evidence",
      action: "Replay",
    },
    350,
    2000,
  );
  for (let t = 0; t <= 1900; t += 100) tracker.update(t, true);
  expect(tracker.feedback).toEqual([]);
  tracker.update(2000, true);
  const saved = tracker.feedback;
  tracker.update(2100, true);
  tracker.update(2200, false);
  tracker.update(2300, true);
  tracker.update(4000, true);
  tracker.update(4000, true);
  tracker.update(NaN, true);
  for (let t = 4100; t <= 6000; t += 100) tracker.update(t, true);
  expect(saved[0].endMs).toBe(2000);
  expect(
    tracker.feedback.map(({ startMs, endMs }) => [startMs, endMs]),
  ).toEqual([
    [0, 2100],
    [4000, 6000],
  ]);
});

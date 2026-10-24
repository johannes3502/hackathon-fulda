import { describe, expect, it } from "vitest";
import { NativePoseLog } from "./native-log";
const points = () =>
  Array.from({ length: 33 }, (_, i) => ({
    x: 0.3 + i / 100,
    y: 0.4,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
describe("native frame log", () => {
  it("anchors to recording request, preserves raw samples and rejects delayed frames", () => {
    const log = new NativePoseLog();
    log.add(points(), 640, 480, 500);
    log.start(1000);
    expect(log.count).toBe(0);
    expect(log.add(points(), 640, 480, 900)).toBeNull();
    log.add(points(), 640, 480, 1042);
    expect(log.add(points(), 640, 480, 1042)).toBeNull();
    expect(log.add(points(), 640, 480, NaN)).toBeNull();
    const row = JSON.parse(log.text());
    expect(row.t_ms).toBe(42);
    expect(row.pose.nose).toEqual([0.3, 0.4, 0, 1, 1]);
    expect(row.model_mode).toBe("IMAGE");
    expect(row.alignment).toBe("approximate");
    expect(Object.keys(row.pose)).toHaveLength(21);
  });
  it("keeps invisible legs null and bounds retained data", () => {
    const log = new NativePoseLog();
    log.start(0);
    const p = points();
    p[25].visibility = 0;
    for (let t = 1; t <= 3001; t++) log.add(p, 640, 480, t);
    expect(log.count).toBe(3000);
    expect(JSON.parse(log.text().split("\n")[0]).pose.left_knee).toBeNull();
  });
});
it("labels preview logs separately and resets them at recording start", () => {
  const log = new NativePoseLog();
  log.start(100, "preview-start");
  log.add(points(), 640, 480, 142);
  expect(JSON.parse(log.text()).timebase).toBe("preview-start");
  log.start(500);
  log.add(points(), 640, 480, 542);
  expect(log.count).toBe(1);
  expect(JSON.parse(log.text())).toMatchObject({
    timebase: "recording-request",
    t_ms: 42,
  });
});

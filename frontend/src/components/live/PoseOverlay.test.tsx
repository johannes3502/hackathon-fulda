import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PoseOverlay } from "./PoseOverlay";
import {
  poseSample,
  type HandSample,
  type Landmark,
} from "@/features/pose/sample";

function pose(): Landmark[] {
  return Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
}

const hand: HandSample = {
  label: "Left",
  score: 0.9,
  landmarks: Array.from(
    { length: 21 },
    (_, index) => [0.5 + index * 0.001, 0.5, 0] as [number, number, number],
  ),
};

it("draws hand landmarks only in the pose lab", () => {
  const sample = poseSample(pose(), 800, 400, 0)!;
  const hidden = renderToStaticMarkup(
    <PoseOverlay sample={sample} largeView={false} hands={[hand]} />,
  );
  expect(hidden).not.toContain("data-hand-landmark");
  const shown = renderToStaticMarkup(
    <PoseOverlay sample={sample} largeView={false} hands={[hand]} showHands />,
  );
  expect(shown).toContain('data-hand-landmark="8"');
  expect(shown).toContain("hand-connection");
});

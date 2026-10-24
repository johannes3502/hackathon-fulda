import {
  poseFeedback,
  type PoseTestResult,
} from "@/features/pose/testPoses";

export function PoseDevMode({
  results,
  handModel,
}: {
  results: PoseTestResult[];
  handModel: boolean | null;
}) {
  const feedback = poseFeedback(results);
  return (
    <div
      className="live-pose-lab"
      data-state={feedback.state}
      aria-label="Pose test lab"
      aria-live="assertive"
    >
      <span className="pose-status-kicker">Pose lab</span>
      <strong>{feedback.label}</strong>
      <span className="pose-status-detail">{feedback.detail}</span>
      {handModel === false && (
        <span className="pose-status-warning">Hand model unavailable</span>
      )}
      <small>Dev only · heuristics, not validated · no events</small>
    </div>
  );
}

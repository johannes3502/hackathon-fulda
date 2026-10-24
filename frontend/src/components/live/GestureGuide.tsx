import type { PoseEvaluation } from "@/features/pose/evaluation";

export function GestureGuide({
  evaluation,
}: {
  evaluation: PoseEvaluation | null;
}) {
  return (
    <section
      className="panel gesture-guide"
      aria-label="Gesture setup and guide"
    >
      <div className="panel-title-row">
        <h2>Try it in 30 seconds</h2>
        <span className="badge">Prototype heuristic</span>
      </div>
      <p role="status">
        {evaluation?.message ??
          "Face the camera. Keep shoulders, hips, elbows and hands in view. Use a comfortable seated or standing position."}
      </p>
      {evaluation?.phase === "calibrating" && (
        <progress
          aria-label="Neutral calibration"
          max={1}
          value={evaluation.calibrationProgress}
        />
      )}
      <ol>
        <li>
          <strong>Start neutral.</strong> Hold still for 3 seconds with hands
          apart beside your waist. Each new recording calibrates again.
        </li>
        <li>
          <strong>Raise a hand.</strong> Keep it clearly above your shoulder for
          about a second, with both hands visible.
        </li>
        <li>
          <strong>Bring hands together.</strong> Hold in front of your torso for
          about 2 seconds. Then separate them.
        </li>
        <li>
          <strong>Lean gently sideways.</strong> Hold for about 2 seconds, only
          if comfortable. Finish and click a moment to replay.
        </li>
      </ol>
      <p className="field-hint">
        Observations help you reflect; they do not judge a gesture as good or
        bad. Skip movements that are uncomfortable. Moving the camera or
        changing position requires recalibration.
      </p>
    </section>
  );
}

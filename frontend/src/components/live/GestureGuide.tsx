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
          comfortably. Hand movement does not block your posture reference. Each
          new recording calibrates again.
        </li>
        <li>
          <strong>Raise a hand.</strong> Keep it clearly above your shoulder for
          about a second, with that wrist visible.
        </li>
        <li>
          <strong>Bring hands together.</strong> Hold in front of your torso for
          about 2 seconds. Then separate them.
        </li>
        <li>
          <strong>Move sideways.</strong> With the camera fixed, shift your body
          about half a shoulder width and hold for about a second. A sideways
          lean is detected separately. Only move if comfortable; then finish and
          replay.
        </li>
      </ol>
      <p className="field-hint">
        Observations help you reflect; they do not judge a gesture as good or
        bad. Skip movements that are uncomfortable. Moving the camera or
        choosing a new neutral position requires recalibration.
      </p>
      <p className="field-hint">
        Also available: cross both arms in front of your torso for 2 seconds
        with wrists visible. Use Pose debug to inspect missing points or a
        movement below its trigger.
      </p>
    </section>
  );
}

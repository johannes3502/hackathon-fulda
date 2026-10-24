"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { PoseEvaluator, type PoseEvaluation } from "@/features/pose/evaluation";
import { syntheticSample, WALKTHROUGH } from "@/features/pose/fixtures";
import { poseFeedback } from "@/features/pose/feedback";
import { time } from "@/lib/utils";
import { PoseOverlay } from "./PoseOverlay";
import { PoseEvidence } from "./PoseEvidence";
import { GestureGuide } from "./GestureGuide";
import { PoseEventDownload } from "./PoseEventDownload";

export function GestureWalkthrough() {
  const engine = useRef(new PoseEvaluator("synthetic-walkthrough"));
  const elapsed = useRef(0);
  const [running, setRunning] = useState(false);
  const [at, setAt] = useState(0);
  const [evaluation, setEvaluation] = useState<PoseEvaluation | null>(null);
  const step = WALKTHROUGH.find((s) => at < s.until) ?? WALKTHROUGH.at(-1)!;
  const sample = syntheticSample(step.pose, at);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const t = elapsed.current;
      const pose = (WALKTHROUGH.find((s) => t < s.until) ?? WALKTHROUGH.at(-1)!)
        .pose;
      setEvaluation(engine.current.update(syntheticSample(pose, t), t));
      setAt(t);
      elapsed.current += 100;
      if (t >= 22000) setRunning(false);
    }, 100);
    return () => clearInterval(timer);
  }, [running]);
  const restart = () => {
    engine.current = new PoseEvaluator("synthetic-walkthrough");
    elapsed.current = 0;
    setAt(0);
    setEvaluation(null);
    setRunning(true);
  };
  return (
    <AppShell experience="live">
      <div className="workspace gesture-walkthrough">
        <div className="workspace-back">
          <Link href="/">Back to start</Link>
          <span className="demo-badge">Synthetic example · no camera</span>
        </div>
        <div className="workspace-heading">
          <div>
            <h1>See a gesture become a moment.</h1>
            <p>
              22 seconds: calibrate, observe, explain. Then try it yourself.
            </p>
          </div>
          <Button asChild>
            <Link href="/live">Try with your camera</Link>
          </Button>
        </div>
        <p className="live-demo-notice">
          This skeleton is hand-authored synthetic data processed by the same
          rules as the camera. It demonstrates the feedback flow; it does not
          test MediaPipe’s recognition accuracy.
        </p>
        <div className="live-review-grid">
          <div>
            <section
              className="media-stage gesture-example"
              aria-label="Synthetic gesture example"
            >
              {sample ? (
                <PoseOverlay
                  sample={sample}
                  largeView
                  label="Synthetic pose landmarks"
                />
              ) : (
                <p>No person visible. No observation inferred.</p>
              )}
            </section>
            <div className="live-control-bar">
              <Button onClick={restart}>
                {evaluation ? "Restart example" : "Play 22-second example"}
              </Button>
              <Button
                variant="outline"
                disabled={!evaluation || at >= 22000}
                onClick={() => setRunning(!running)}
              >
                {running ? "Pause example" : "Resume example"}
              </Button>
              <span>{time(at)} / 0:22</span>
            </div>
            <p>{step.label}</p>
            <GestureGuide evaluation={evaluation} />
          </div>
          <aside>
            <section className="cue-panel">
              <span className="badge">Prototype heuristic</span>
              <h2 className="cue-message" aria-live="polite">
                {evaluation?.cue?.payload.title ??
                  (evaluation?.phase === "framing"
                    ? "Evaluation paused"
                    : evaluation?.phase === "ready"
                      ? "Ready for the next movement"
                      : "Calibrate first")}
              </h2>
              <p>
                {evaluation?.message ??
                  "Play the example to follow each observation."}
              </p>
            </section>
            <section className="panel gesture-guide">
              <h2>Observed moments</h2>
              <p className="field-hint">
                A detected movement is a prompt to reflect, not a grade.
              </p>
              {(evaluation?.events ?? []).map((event) => (
                <article className="gesture-example-event" key={event.id}>
                  <strong>
                    {time(event.t_ms)} · {event.payload.title}
                  </strong>
                  <p>{poseFeedback(event).detail}</p>
                  <PoseEvidence event={event} />
                </article>
              ))}
              <PoseEventDownload events={evaluation?.events} />
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

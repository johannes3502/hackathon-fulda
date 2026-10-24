"use client";
import {
  FlaskConical,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
} from "lucide-react";
import { useCoachSession } from "@/features/coach/useCoachSession";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
export function DemoControls() {
  const { state, demo, send, pending, demoSpeed } = useCoachSession();
  return (
    <details className="demo-controls">
      <summary>
        <SlidersHorizontal size={15} /> Demo controls
      </summary>
      <div className="demo-controls-content">
        <p>
          <FlaskConical size={15} /> Deterministic sample · Viva hackathon pitch
        </p>
        <div className="demo-actions">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              void demo("reset");
            }}
          >
            <RotateCcw size={14} /> Restart attempt
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || state.isPaused || state.phase === "review"}
            onClick={() => void demo("next")}
          >
            <SkipForward size={14} /> Next event
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void demo("qa")}
          >
            Jump to Q&amp;A
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void demo("review")}
          >
            Jump to review
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || ["preflight", "review"].includes(state.phase)}
            onClick={() =>
              void send({ type: state.isPaused ? "resume" : "pause" })
            }
          >
            {state.isPaused ? "Resume demo" : "Pause demo"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || state.phase === "review"}
            onClick={() => void demo("interrupt")}
          >
            Simulate interruption
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void demo("fail")}
          >
            Fail next request
          </Button>
        </div>
        <label className="speed-label" htmlFor="demo-speed">
          Playback speed
          <NativeSelect
            id="demo-speed"
            value={demoSpeed}
            onChange={(e) => {
              void demo("speed", Number(e.target.value));
            }}
          >
            {[1, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </NativeSelect>
        </label>
        <p className="field-hint">
          Jumps replay the required sample events. Restart keeps completed
          reports; “Start new practice” creates a fresh session.
        </p>
      </div>
    </details>
  );
}

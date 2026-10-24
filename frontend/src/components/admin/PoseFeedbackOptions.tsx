"use client";
import { useSyncExternalStore } from "react";
import { NativeSelect } from "@/components/ui/input";
import {
  defaultPoseFeedback,
  loadPoseFeedback,
  savePoseFeedback,
  type PoseFeedbackSettings,
} from "@/features/admin/pose-feedback";
import {
  POSE_RULE_IDS,
  RULE_COPY,
  type PoseRuleMode,
} from "@/features/pose/evaluation";
import { POSE_TESTS, coachMessage } from "@/features/pose/testPoses";

const CHANGED = "pitchcoach:pose-feedback";
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};
// Strings keep the snapshot stable between renders.
const snapshot = () => JSON.stringify(loadPoseFeedback());
const serverSnapshot = () => JSON.stringify(defaultPoseFeedback());

export function PoseFeedbackOptions() {
  const settings = JSON.parse(
    useSyncExternalStore(subscribe, snapshot, serverSnapshot),
  ) as PoseFeedbackSettings;
  const save = (next: PoseFeedbackSettings) => {
    savePoseFeedback(next);
    window.dispatchEvent(new Event(CHANGED));
  };
  return (
    <section className="panel admin-panel" aria-labelledby="pose-feedback">
      <div className="panel-title-row">
        <h2 id="pose-feedback">Pose feedback</h2>
        <span className="badge">Saved instantly</span>
      </div>
      <p className="muted small">
        Choose which pose observations appear. Review only keeps the timeline
        marker but shows no live hint. Changes apply from the next calibration
        or recording.
      </p>
      <div className="admin-rule-list">
        {POSE_RULE_IDS.map((id) => (
          <div className="field admin-rule" key={id}>
            <label htmlFor={`pose-rule-${id}`}>{RULE_COPY[id][0]}</label>
            <NativeSelect
              id={`pose-rule-${id}`}
              value={settings.rules[id]}
              onChange={(e) =>
                save({
                  ...settings,
                  rules: {
                    ...settings.rules,
                    [id]: e.target.value as PoseRuleMode,
                  },
                })
              }
            >
              <option value="on">On · live hint and review</option>
              <option value="review">Review only · no live hint</option>
              <option value="off">Off</option>
            </NativeSelect>
          </div>
        ))}
      </div>
      <fieldset className="speech-feature-options">
        <legend>Pose lab tests (dev tool, no events)</legend>
        {POSE_TESTS.map((test) => (
          <label key={test.id} className="live-transcribe">
            <input
              type="checkbox"
              checked={settings.lab[test.id]}
              onChange={(e) =>
                save({
                  ...settings,
                  lab: { ...settings.lab, [test.id]: e.target.checked },
                })
              }
            />
            {test.label}
            <span className="muted small">· {coachMessage(test.id)}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

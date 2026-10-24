"use client";
import { useSyncExternalStore } from "react";
import { FlaskConical, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AdminSection, Segmented, SwitchTile } from "./parts";

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

const MODE_OPTIONS = [
  { value: "on", label: "On" },
  { value: "review", label: "Review only" },
  { value: "off", label: "Off" },
] as const satisfies readonly { value: PoseRuleMode; label: string }[];

function usePoseFeedback() {
  const settings = JSON.parse(
    useSyncExternalStore(subscribe, snapshot, serverSnapshot),
  ) as PoseFeedbackSettings;
  const save = (next: PoseFeedbackSettings) => {
    savePoseFeedback(next);
    window.dispatchEvent(new Event(CHANGED));
  };
  return [settings, save] as const;
}

export function PoseFeedbackOptions() {
  const [settings, save] = usePoseFeedback();
  const setAllRules = (mode: PoseRuleMode) =>
    save({
      ...settings,
      rules: Object.fromEntries(
        POSE_RULE_IDS.map((id) => [id, mode]),
      ) as PoseFeedbackSettings["rules"],
    });
  const live = POSE_RULE_IDS.filter((id) => settings.rules[id] === "on").length;

  return (
    <AdminSection
      id="pose-feedback"
      icon={PersonStanding}
      title="Pose feedback"
      badge={`${live} of ${POSE_RULE_IDS.length} live`}
      description={
        <>
          <strong>On</strong> shows a live hint and a review marker.{" "}
          <strong>Review only</strong> keeps the timeline marker without a live
          hint. Applies from the next calibration or recording.
        </>
      }
      actions={
        <div
          className="admin-bulk"
          role="group"
          aria-label="Set every pose rule"
        >
          <span className="muted small">Set all</span>
          {MODE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAllRules(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      }
    >
      <ul className="admin-rule-list">
        {POSE_RULE_IDS.map((id) => (
          <li className="admin-rule" key={id} data-mode={settings.rules[id]}>
            <div className="admin-rule-copy">
              <span className="setting-label" id={`pose-rule-${id}`}>
                {RULE_COPY[id][0]}
              </span>
              <p>{RULE_COPY[id][1]}</p>
            </div>
            <Segmented
              name={`pose-rule-${id}`}
              labelledBy={`pose-rule-${id}`}
              value={settings.rules[id]}
              options={MODE_OPTIONS}
              onChange={(mode) =>
                save({
                  ...settings,
                  rules: { ...settings.rules, [id]: mode },
                })
              }
            />
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}

export function PoseLabOptions() {
  const [settings, save] = usePoseFeedback();
  const setAllLab = (on: boolean) =>
    save({
      ...settings,
      lab: Object.fromEntries(
        POSE_TESTS.map((test) => [test.id, on]),
      ) as PoseFeedbackSettings["lab"],
    });
  const labOn = POSE_TESTS.filter((test) => settings.lab[test.id]).length;
  return (
    <AdminSection
      id="pose-lab"
      icon={FlaskConical}
      title="Pose lab tests"
      badge={`${labOn} of ${POSE_TESTS.length} on`}
      description="Developer tool in the studio. These tests show coaching text only and never create review events."
      actions={
        <div className="admin-bulk">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAllLab(true)}
          >
            Enable all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAllLab(false)}
          >
            Disable all
          </Button>
        </div>
      }
    >
      <div className="switch-grid">
        {POSE_TESTS.map((test) => (
          <SwitchTile
            key={test.id}
            id={`pose-lab-${test.id}`}
            label={test.label}
            detail={coachMessage(test.id)}
            checked={settings.lab[test.id]}
            onChange={(on) =>
              save({ ...settings, lab: { ...settings.lab, [test.id]: on } })
            }
          />
        ))}
      </div>
    </AdminSection>
  );
}

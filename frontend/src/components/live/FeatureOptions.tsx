"use client";
import { NativeSelect } from "@/components/ui/input";
import {
  SPEECH_FEEDBACK_FLAGS,
  type FeatureFlags,
} from "@/features/live/feature-flags";

export function FeatureOptions({
  flags,
  change,
  disabled,
  speechEnabled,
}: {
  flags: FeatureFlags;
  change: (flags: FeatureFlags) => void;
  disabled: boolean;
  speechEnabled: boolean;
}) {
  return (
    <details className="live-settings feature-options">
      <summary>Analysis features</summary>
      <fieldset disabled={disabled}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="pose-mode">Pose processing</label>
            <NativeSelect
              id="pose-mode"
              value={flags.runningMode}
              onChange={(e) =>
                change({
                  ...flags,
                  runningMode: e.target.value as FeatureFlags["runningMode"],
                })
              }
            >
              <option value="VIDEO">Video · tracking and smoothing</option>
              <option value="IMAGE">Image · independent frames</option>
            </NativeSelect>
          </div>
          <div className="field">
            <label htmlFor="pose-model">Pose model</label>
            <NativeSelect
              id="pose-model"
              value={flags.model}
              onChange={(e) =>
                change({
                  ...flags,
                  model: e.target.value as FeatureFlags["model"],
                })
              }
            >
              <option value="lite">Lite</option>
              <option value="heavy">Heavy</option>
            </NativeSelect>
          </div>
        </div>
        <p className="field-hint">
          Both models run locally, prefer GPU and fall back to CPU. Changing
          pose options restarts calibration. Heavy’s benefit has not been
          measured on this device.
        </p>
        <label className="live-transcribe">
          <input
            type="checkbox"
            checked={flags.speechFeedback}
            onChange={(e) =>
              change({ ...flags, speechFeedback: e.target.checked })
            }
          />
          Speech feedback
        </label>
        <fieldset
          disabled={!flags.speechFeedback}
          className="speech-feature-options"
        >
          <legend>Speech feedback types</legend>
          {SPEECH_FEEDBACK_FLAGS.map(([key, label]) => (
            <label key={key} className="live-transcribe">
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={(e) => change({ ...flags, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="field-hint">
          {speechEnabled
            ? "Speech feedback arrives after stopping. Filler words and word-based pace need a transcript."
            : "Enable Speech analysis above the camera to receive speech feedback."}{" "}
          These switches control feedback markers; analysis, measurements and
          transcription keep their own settings.
        </p>
      </fieldset>
      <p className="field-hint">
        Options are kept in this workspace until reload and saved with each
        take. Changes apply to the next recording.
      </p>
    </details>
  );
}

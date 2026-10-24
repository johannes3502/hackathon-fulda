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
        <label className="live-transcribe">
          <input
            type="checkbox"
            checked={flags.handTracking}
            onChange={(e) =>
              change({ ...flags, handTracking: e.target.checked })
            }
          />
          Track fingers
        </label>
        <p className="field-hint">
          Fingers are tracked locally, up to 5 times per second. Both models
          prefer GPU and fall back to CPU. Changing pose options restarts
          calibration. Heavy’s benefit has not been measured on this device.
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
            ? "Pauses, volume, pitch variation and speaking rhythm are shown live. Filler words and word-based pace need the transcript after stopping."
            : "Choose Live · in browser above the camera for local voice feedback."}{" "}
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

"use client";
import { Cpu, Mic } from "lucide-react";
import { NativeSelect } from "@/components/ui/input";
import {
  SPEECH_FEEDBACK_FLAGS,
  type FeatureFlags,
} from "@/features/live/feature-flags";
import { AdminSection, SettingRow, Switch, SwitchTile } from "./parts";

export function FeatureOptions({
  flags,
  change,
}: {
  flags: FeatureFlags;
  change: (flags: FeatureFlags) => void;
}) {
  const speechOn = SPEECH_FEEDBACK_FLAGS.filter(([key]) => flags[key]).length;
  return (
    <>
      <AdminSection
        id="analysis-features"
        icon={Cpu}
        title="Analysis features"
        badge="Saved instantly"
        description="How the camera is analysed. Changing pose options restarts calibration and applies to the next recording."
      >
        <SettingRow
          label="Pose processing"
          htmlFor="pose-mode"
          description="Video tracks and smooths between frames; Image treats every frame on its own."
        >
          <NativeSelect
            id="pose-mode"
            aria-describedby="pose-mode-description"
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
        </SettingRow>
        <SettingRow
          label="Pose model"
          htmlFor="pose-model"
          description="Both prefer GPU and fall back to CPU. Heavy’s benefit has not been measured on this device."
        >
          <NativeSelect
            id="pose-model"
            aria-describedby="pose-model-description"
            value={flags.model}
            onChange={(e) =>
              change({
                ...flags,
                model: e.target.value as FeatureFlags["model"],
              })
            }
          >
            <option value="lite">Lite · faster</option>
            <option value="heavy">Heavy · larger model</option>
          </NativeSelect>
        </SettingRow>
        <SettingRow
          label="Track fingers"
          htmlFor="track-fingers"
          description="Hand landmarks are tracked locally, up to 5 times per second."
        >
          <Switch
            id="track-fingers"
            describedBy="track-fingers-description"
            checked={flags.handTracking}
            onChange={(handTracking) => change({ ...flags, handTracking })}
          />
        </SettingRow>
      </AdminSection>
      <AdminSection
        id="speech-hints"
        icon={Mic}
        title="Speech hints"
        badge={
          flags.speechFeedback
            ? `${speechOn} of ${SPEECH_FEEDBACK_FLAGS.length} on`
            : "Off"
        }
        description="Which voice observations become hints and review markers. Analysis, measurements and transcription keep their own settings."
      >
        <SettingRow
          label="Speech feedback"
          htmlFor="speech-feedback-toggle"
          description="Master switch for every type below."
        >
          <Switch
            id="speech-feedback-toggle"
            describedBy="speech-feedback-toggle-description"
            checked={flags.speechFeedback}
            onChange={(speechFeedback) => change({ ...flags, speechFeedback })}
          />
        </SettingRow>
        <fieldset
          disabled={!flags.speechFeedback}
          className="switch-grid"
          aria-describedby="speech-types-hint"
        >
          <legend className="visually-hidden">Speech feedback types</legend>
          {SPEECH_FEEDBACK_FLAGS.map(([key, label]) => (
            <SwitchTile
              key={key}
              id={`speech-${key}`}
              label={label}
              checked={flags[key]}
              disabled={!flags.speechFeedback}
              onChange={(on) => change({ ...flags, [key]: on })}
            />
          ))}
        </fieldset>
        <p className="field-hint" id="speech-types-hint">
          Pauses, volume, pitch variation and rhythm appear live while speech
          analysis runs in the studio. Filler words and word-based pace need the
          transcript after stopping. Saved with each take; changes apply to the
          next recording.
        </p>
      </AdminSection>
    </>
  );
}

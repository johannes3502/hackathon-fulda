"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { FeatureOptions } from "./FeatureOptions";
import { PoseFeedbackOptions } from "./PoseFeedbackOptions";
import {
  DEFAULT_LIVE_HINT_SETTINGS,
  LIVE_HINT_FIELDS,
  loadLiveHintSettings,
  resetLiveHintSettings,
  saveLiveHintSettings,
  settingError,
  type LiveHintSettings,
} from "@/features/admin/settings";

type Key = keyof LiveHintSettings;
const CHANGED = "pitchcoach:live-hint-settings";
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};
// Strings keep the snapshot stable between renders.
const snapshot = () => JSON.stringify(loadLiveHintSettings());
const serverSnapshot = () => JSON.stringify(DEFAULT_LIVE_HINT_SETTINGS);

export function AdminPanel() {
  const saved = JSON.parse(
    useSyncExternalStore(subscribe, snapshot, serverSnapshot),
  ) as LiveHintSettings;
  const [draft, setDraft] = useState<Partial<Record<Key, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const value = (key: Key) => draft[key] ?? String(saved[key]);
  const { featureFlags, setFeatureFlags } = useLiveSessions();

  function save(event: FormEvent) {
    event.preventDefault();
    const next = { ...saved };
    const problems: Partial<Record<Key, string>> = {};
    for (const { key } of LIVE_HINT_FIELDS) {
      const raw = value(key).trim();
      const number = raw === "" ? NaN : Number(raw);
      const problem = settingError(key, number);
      if (problem) problems[key] = problem;
      else next[key] = number;
    }
    setErrors(problems);
    if (Object.keys(problems).length) {
      setStatus(null);
      return;
    }
    try {
      saveLiveHintSettings(next);
    } catch (reason) {
      setStatus(
        reason instanceof Error ? reason.message : "Could not save settings.",
      );
      return;
    }
    setDraft({});
    window.dispatchEvent(new Event(CHANGED));
    setStatus("Saved. Applies from the next calibration or recording.");
  }

  function reset() {
    resetLiveHintSettings();
    setDraft({});
    setErrors({});
    window.dispatchEvent(new Event(CHANGED));
    setStatus("Defaults restored.");
  }

  return (
    <AppShell>
      <div className="workspace admin-workspace admin-sections">
        <div className="workspace-heading">
          <div>
            <h1>Admin</h1>
            <p>
              Prototype settings for live feedback. Stored in this browser only;
              no login yet.
            </p>
          </div>
        </div>
        <section className="panel admin-panel" aria-labelledby="pose-config">
          <div className="panel-title-row">
            <h2 id="pose-config">Pose configuration</h2>
            <span className="badge">This browser</span>
          </div>
          <p className="muted small">
            Settings for pose detection and live-hint timing. The display
            settings apply to pose and voice hints alike; every observation
            still reaches the review timeline.
          </p>
          <form className="form-fields" onSubmit={save} noValidate>
            {LIVE_HINT_FIELDS.map(({ key, label, hint, min, max }) => (
              <div className="field" key={key}>
                <label htmlFor={`admin-${key}`}>{label}</label>
                <Input
                  id={`admin-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={100}
                  value={value(key)}
                  aria-invalid={!!errors[key]}
                  aria-describedby={`admin-${key}-hint${errors[key] ? ` admin-${key}-error` : ""}`}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }));
                    setStatus(null);
                  }}
                />
                <p className="field-hint" id={`admin-${key}-hint`}>
                  {hint} Default {DEFAULT_LIVE_HINT_SETTINGS[key]} ms.
                </p>
                {errors[key] && (
                  <p className="field-error" id={`admin-${key}-error`}>
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}
            <div className="admin-actions">
              <Button type="submit">Save settings</Button>
              <Button type="button" variant="outline" onClick={reset}>
                Reset to defaults
              </Button>
            </div>
            <p role="status" className="muted small">
              {status}
            </p>
          </form>
        </section>
        <PoseFeedbackOptions />
        <FeatureOptions flags={featureFlags} change={setFeatureFlags} />
      </div>
    </AppShell>
  );
}

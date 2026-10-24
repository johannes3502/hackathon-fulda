"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  Cpu,
  FlaskConical,
  Mic,
  PersonStanding,
  RotateCcw,
  Timer,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { FeatureOptions } from "./FeatureOptions";
import { PoseFeedbackOptions, PoseLabOptions } from "./PoseFeedbackOptions";
import { AdminSection } from "./parts";
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

const SECTIONS = [
  { id: "analysis-features", label: "Analysis features", icon: Cpu },
  { id: "speech-hints", label: "Speech hints", icon: Mic },
  { id: "pose-feedback", label: "Pose feedback", icon: PersonStanding },
  { id: "hint-timing", label: "Hint timing", icon: Timer },
  { id: "pose-lab", label: "Pose lab tests", icon: FlaskConical },
] as const;

const seconds = (raw: string) => {
  const number = Number(raw);
  return raw.trim() !== "" && Number.isFinite(number)
    ? `${(number / 1000).toLocaleString("en", { maximumFractionDigits: 1 })} s`
    : "—";
};

export function AdminPanel() {
  const saved = JSON.parse(
    useSyncExternalStore(subscribe, snapshot, serverSnapshot),
  ) as LiveHintSettings;
  const [draft, setDraft] = useState<Partial<Record<Key, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const value = (key: Key) => draft[key] ?? String(saved[key]);
  const dirty = LIVE_HINT_FIELDS.some(
    ({ key }) => value(key).trim() !== String(saved[key]),
  );
  const customised = LIVE_HINT_FIELDS.some(
    ({ key }) => saved[key] !== DEFAULT_LIVE_HINT_SETTINGS[key],
  );
  const { featureFlags, setFeatureFlags } = useLiveSessions();

  function edit(key: Key, raw: string) {
    setDraft((current) => ({ ...current, [key]: raw }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setStatus(null);
  }

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
      setStatus("Fix the highlighted fields before saving.");
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

  function discard() {
    setDraft({});
    setErrors({});
    setStatus(null);
  }

  function reset() {
    resetLiveHintSettings();
    discard();
    window.dispatchEvent(new Event(CHANGED));
    setStatus("Defaults restored.");
  }

  return (
    <AppShell>
      <div className="workspace admin-workspace">
        <div className="workspace-heading admin-heading">
          <div>
            <h1>Admin</h1>
            <p>
              Prototype settings for live feedback and analysis. Stored in this
              browser only; no login yet.
            </p>
          </div>
        </div>
        <div className="admin-layout">
          <nav className="admin-nav" aria-label="Admin sections">
            <ul>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`}>
                    <Icon size={16} aria-hidden />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="admin-content">
            <FeatureOptions flags={featureFlags} change={setFeatureFlags} />
            <PoseFeedbackOptions />
            <AdminSection
              id="hint-timing"
              icon={Timer}
              title="Hint timing"
              badge={customised ? "Customised" : "Defaults"}
              description="Timing for pose detection and the live-hint bubble. Display settings apply to pose and voice hints alike; every observation still reaches the review timeline."
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={reset}
                  disabled={!customised && !dirty}
                >
                  <RotateCcw size={14} aria-hidden />
                  Reset to defaults
                </Button>
              }
            >
              <form className="timing-form" onSubmit={save} noValidate>
                <div className="timing-grid">
                  {LIVE_HINT_FIELDS.map(({ key, label, hint, min, max }) => {
                    const fallback = DEFAULT_LIVE_HINT_SETTINGS[key];
                    const changed = value(key).trim() !== String(fallback);
                    return (
                      <div
                        className="field timing-field"
                        key={key}
                        data-invalid={!!errors[key]}
                      >
                        <div className="timing-label-row">
                          <label htmlFor={`admin-${key}`}>{label}</label>
                          <span className="input-preview" aria-hidden>
                            {seconds(value(key))}
                          </span>
                        </div>
                        <div className="input-with-unit">
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
                            onChange={(event) => edit(key, event.target.value)}
                          />
                          <span className="input-unit" aria-hidden>
                            ms
                          </span>
                        </div>
                        <p className="field-hint" id={`admin-${key}-hint`}>
                          {hint} Default {fallback} ms · range {min}–{max}.
                          {changed && (
                            <>
                              {" "}
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => edit(key, String(fallback))}
                              >
                                Use default
                              </button>
                            </>
                          )}
                        </p>
                        {errors[key] && (
                          <p className="field-error" id={`admin-${key}-error`}>
                            {errors[key]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="admin-savebar" data-dirty={dirty}>
                  <p role="status" className="small">
                    {status ??
                      (dirty
                        ? "You have unsaved timing changes."
                        : "All timing changes saved.")}
                  </p>
                  <div className="admin-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={discard}
                      disabled={!dirty}
                    >
                      Discard
                    </Button>
                    <Button type="submit" disabled={!dirty}>
                      Save settings
                    </Button>
                  </div>
                </div>
              </form>
            </AdminSection>
            <PoseLabOptions />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

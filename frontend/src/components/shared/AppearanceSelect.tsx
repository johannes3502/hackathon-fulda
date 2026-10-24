"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Appearance = "system" | "light" | "dark";
const storageKey = "418-appearance";
const changeEvent = "418-appearance-change";

function getAppearance(): Appearance {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "light" || value === "dark") return value;
  } catch {
    // The in-memory selection still works when browser storage is unavailable.
  }
  const value = document.documentElement.dataset.appearance;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}

function setAppearance(value: Appearance) {
  document.documentElement.dataset.appearance = value;
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // Keep the choice for this page even without storage permission.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function AppearanceSelect() {
  const appearance = useSyncExternalStore(
    subscribe,
    getAppearance,
    () => "system",
  );
  const Icon =
    appearance === "light" ? Sun : appearance === "dark" ? Moon : Monitor;
  return (
    <label className="appearance-select">
      <Icon size={17} aria-hidden="true" />
      <select
        aria-label="Appearance"
        value={appearance}
        onChange={(event) => setAppearance(event.target.value as Appearance)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

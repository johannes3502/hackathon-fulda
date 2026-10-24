"use client";

import { useSyncExternalStore } from "react";

export const PROFILE_STORAGE_KEY = "pitchcoach.progress-profile.v1";

export type StoredProfile = {
  profileId: string;
  token: string;
  displayName: string;
  createdAt: string;
};

const listeners = new Set<() => void>();
let cached: StoredProfile | null | undefined;

function read() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.profileId !== "string" ||
      typeof candidate.token !== "string" ||
      !candidate.token.startsWith("pp_") ||
      typeof candidate.createdAt !== "string"
    ) {
      return null;
    }
    return {
      profileId: candidate.profileId,
      token: candidate.token,
      displayName:
        typeof candidate.displayName === "string" ? candidate.displayName : "",
      createdAt: candidate.createdAt,
    };
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROFILE_STORAGE_KEY) {
      cached = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoredProfileSnapshot() {
  if (cached === undefined) cached = read();
  return cached;
}

export function persistProfile(profile: StoredProfile) {
  cached = profile;
  emit();
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Keep the profile for this tab even if the browser refuses storage.
  }
}

export function clearStoredProfile() {
  cached = null;
  emit();
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // The in-memory profile is already cleared.
  }
}

export function useStoredProfile() {
  return useSyncExternalStore(
    subscribe,
    getStoredProfileSnapshot,
    () => null,
  );
}

const noopSubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

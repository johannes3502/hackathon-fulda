"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { LiveRecording } from "./contracts";
import {
  deleteRecording,
  loadRecordings,
  storeRecording,
} from "./recording-storage";
import {
  DEFAULT_FEATURE_FLAGS,
  featureFlagsSnapshot,
  storeFeatureFlags,
  subscribeFeatureFlags,
  type FeatureFlags,
} from "./feature-flags";
type LiveContext = {
  featureFlags: FeatureFlags;
  setFeatureFlags: (flags: FeatureFlags) => void;
  recordings: Record<string, LiveRecording>;
  loaded: boolean;
  saving: boolean;
  storageError: string | null;
  remove: (id: string) => Promise<boolean>;
  save: (recording: LiveRecording) => void;
  /** Apply `change` to the newest stored version; for async results. */
  update: (
    id: string,
    change: (recording: LiveRecording) => LiveRecording,
  ) => void;
};
const Context = createContext<LiveContext | null>(null);
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  // Defaults on the server and during hydration; saved options afterwards.
  const featureFlags = useSyncExternalStore(
    subscribeFeatureFlags,
    featureFlagsSnapshot,
    () => DEFAULT_FEATURE_FLAGS,
  );
  const setFeatureFlags = storeFeatureFlags;
  const [recordings, setRecordings] = useState<Record<string, LiveRecording>>(
    {},
  );
  const current = useRef(recordings);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const urls = useRef(new Set<string>());
  const deleting = useRef(new Set<string>());
  const persist = useCallback((recording: LiveRecording) => {
    setPending((count) => count + 1);
    void storeRecording(recording)
      .catch(() =>
        setStorageError(
          "Could not save this session in your browser. Keep this tab open and download your video; browser storage may be full or unavailable.",
        ),
      )
      .finally(() => setPending((count) => count - 1));
  }, []);
  const save = useCallback(
    (recording: LiveRecording) => {
      urls.current.add(recording.videoUrl);
      current.current = { ...current.current, [recording.id]: recording };
      setRecordings(current.current);
      persist(recording);
    },
    [persist],
  );
  const update = useCallback(
    (id: string, change: (recording: LiveRecording) => LiveRecording) => {
      if (current.current[id] && !deleting.current.has(id))
        save(change(current.current[id]));
    },
    [save],
  );
  const remove = useCallback(async (id: string) => {
    deleting.current.add(id);
    try {
      await deleteRecording(id);
      const recording = current.current[id];
      const next = { ...current.current };
      delete next[id];
      current.current = next;
      setRecordings(next);
      if (recording) {
        URL.revokeObjectURL(recording.videoUrl);
        urls.current.delete(recording.videoUrl);
      }
      return true;
    } catch {
      setStorageError(
        "Could not delete this saved session. It is still available; try again.",
      );
      return false;
    } finally {
      deleting.current.delete(id);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    void loadRecordings()
      .then((stored) => {
        if (cancelled) return;
        const restored: Record<string, LiveRecording> = {};
        for (const recording of stored) {
          if (current.current[recording.id]) continue;
          const videoUrl = URL.createObjectURL(recording.video);
          urls.current.add(videoUrl);
          restored[recording.id] = { ...recording, videoUrl };
        }
        current.current = { ...restored, ...current.current };
        setRecordings(current.current);
      })
      .catch(() => {
        if (!cancelled)
          setStorageError(
            "Could not load saved sessions from this browser. Existing saved data has not been deleted.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  return (
    <Context.Provider
      value={{
        recordings,
        save,
        update,
        remove,
        loaded,
        saving: pending > 0,
        storageError,
        featureFlags,
        setFeatureFlags,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLiveSessions() {
  const value = useContext(Context);
  if (!value) throw new Error("Live session provider is missing.");
  return value;
}

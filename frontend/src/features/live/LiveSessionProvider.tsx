"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LiveRecording } from "./contracts";
type LiveContext = {
  recordings: Record<string, LiveRecording>;
  save: (recording: LiveRecording) => void;
  update: (
    id: string,
    change: (recording: LiveRecording) => LiveRecording,
  ) => void;
};
const Context = createContext<LiveContext | null>(null);
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  // shortcut: recordings last only in this workspace; add persistent storage when saved history is required.
  const [recordings, setRecordings] = useState<Record<string, LiveRecording>>(
    {},
  );
  const urls = useRef(new Set<string>());
  const save = useCallback((recording: LiveRecording) => {
    urls.current.add(recording.videoUrl);
    setRecordings((prior) => ({ ...prior, [recording.id]: recording }));
  }, []);
  const update = useCallback(
    (id: string, change: (recording: LiveRecording) => LiveRecording) => {
      setRecordings((prior) =>
        prior[id] ? { ...prior, [id]: change(prior[id]) } : prior,
      );
    },
    [],
  );
  useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);
  return (
    <Context.Provider value={{ recordings, save, update }}>
      {children}
    </Context.Provider>
  );
}
export function useLiveSessions() {
  const value = useContext(Context);
  if (!value) throw new Error("Live session provider is missing.");
  return value;
}

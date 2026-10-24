"use client";
import {
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { getGateway } from "./gateway";
import { sessionReducer } from "./reducer";
import type {
  CoachCommand,
  DemoCommand,
  EvidenceRef,
  SessionState,
} from "./contracts";
import { saveSession } from "./session-repository";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";

type SessionContextValue = {
  state: SessionState;
  pending: boolean;
  error: string | null;
  restored: boolean;
  storageWarning: boolean;
  demoSpeed: number;
  send: (command: CoachCommand) => Promise<void>;
  demo: (command: DemoCommand, speed?: number) => Promise<void>;
  retry: (findingId: string) => Promise<void>;
  select: (evidence: EvidenceRef) => void;
};
export const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    (
      state: SessionState | null,
      action: Parameters<typeof sessionReducer>[1],
    ) =>
      action.type === "hydrate"
        ? action.state
        : state
          ? sessionReducer(state, action)
          : null,
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const [restored, setRestored] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(1);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    Promise.resolve()
      .then(() => getGateway().getSession(sessionId))
      .then((snapshot) => {
        if (cancelled) return;
        setRestored(snapshot.connection === "interrupted");
        setStorageWarning(!saveSession(snapshot));
        setDemoSpeed(getGateway().getDemoSpeed(snapshot.ref));
        dispatch({ type: "hydrate", state: snapshot });
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message);
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [sessionId]);
  const attemptId = state?.ref.attemptId;
  useEffect(() => {
    if (!attemptId) return;
    return getGateway().subscribe({ sessionId, attemptId }, (event) =>
      dispatch({ type: "event", event }),
    );
  }, [sessionId, attemptId]);
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "The action failed. Try again.",
        );
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }, []);
  if (loadError)
    return (
      <AppShell>
        <div className="empty-state panel">
          <h1>Let’s start fresh.</h1>
          <p>{loadError}</p>
          <Button asChild>
            <Link href="/">Start new practice</Link>
          </Button>
        </div>
      </AppShell>
    );
  if (!state)
    return (
      <AppShell step={2}>
        <div className="workspace loading-state" aria-busy="true">
          <p>Opening your practice space…</p>
          <div className="skeleton" />
          <div className="skeleton short" />
        </div>
      </AppShell>
    );
  const value: SessionContextValue = {
    state,
    pending,
    error,
    restored,
    storageWarning,
    demoSpeed,
    send: (command) => run(() => getGateway().send(state.ref, command)),
    demo: (command, speed) =>
      run(async () => {
        const snapshot = await getGateway().demo(state.ref, command, speed);
        if (alive.current) {
          dispatch({ type: "hydrate", state: snapshot });
          setDemoSpeed(getGateway().getDemoSpeed(snapshot.ref));
          if (command === "reset" || command === "qa" || command === "review")
            setRestored(false);
        }
      }),
    retry: (findingId) =>
      run(async () => {
        const snapshot = await getGateway().createRetry(state.ref, findingId);
        if (alive.current) {
          dispatch({ type: "hydrate", state: snapshot });
          setDemoSpeed(1);
        }
      }),
    select: (evidence) => dispatch({ type: "select", evidence }),
  };
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  HardDriveDownload,
  Info,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { STAGE_LINKS, type StageAnalysisMode } from "@/features/stage/config";
import {
  browserPreflightChecks,
  loadPreflight,
  type StageCheck,
  type StageCheckStatus,
} from "@/features/stage/preflight";
import "./StageConsole.css";

const styles: Record<string, string> = new Proxy(
  {},
  {
    get: (_target, key) =>
      typeof key === "string" ? `stage-console-${key}` : undefined,
  },
);

const STATUS_LABEL: Record<StageCheckStatus, string> = {
  ready: "Bereit",
  optional: "Optional",
  blocked: "Nicht bereit",
};

const CHECK_ORDER = [
  "backend",
  "factcheck",
  "pitch",
  "camera",
  "secure",
  "storage",
];

function StatusIcon({ status }: { status: StageCheckStatus }) {
  if (status === "ready") return <CheckCircle2 size={20} aria-hidden="true" />;
  if (status === "optional")
    return <CircleDashed size={20} aria-hidden="true" />;
  return <AlertTriangle size={20} aria-hidden="true" />;
}

export function StageConsole({ analysis }: { analysis: StageAnalysisMode }) {
  const actionsTitleId = useId();
  const preflightTitleId = useId();
  const [serverChecks, setServerChecks] = useState<StageCheck[]>([]);
  const [browserChecks, setBrowserChecks] = useState<StageCheck[]>([]);
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [preflightError, setPreflightError] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const runPreflight = useCallback(async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setChecking(true);
    setPreflightError(false);
    setBrowserChecks(browserPreflightChecks());
    try {
      const checks = await loadPreflight(active.signal);
      if (active.signal.aborted) return;
      setServerChecks(checks);
      setCheckedAt(
        new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      if (!active.signal.aborted) setPreflightError(true);
    } finally {
      if (!active.signal.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void runPreflight();
    });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [runPreflight]);

  const checks = [...serverChecks, ...browserChecks].sort(
    (a, b) => CHECK_ORDER.indexOf(a.id) - CHECK_ORDER.indexOf(b.id),
  );
  const ready = checks.filter((item) => item.status === "ready").length;
  const optional = checks.filter((item) => item.status === "optional").length;
  const blocked = checks.filter((item) => item.status === "blocked").length;
  const backend = checks.find((item) => item.id === "backend");
  const backendBlocked =
    !checking && backend !== undefined && backend.status === "blocked";
  const livePrimary = analysis === "live";

  return (
    <div className={styles.root} lang="de">
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <span className={styles.brand}>418 · Pitch Mode</span>
          <div className={styles.topbarActions}>
            <span className={styles.juryBadge}>Jury-Demo</span>
            <Link className={styles.back} href="/">
              <ArrowLeft size={15} aria-hidden="true" />
              Zur Startseite
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            8. Hackathon Fulda · Future Education
          </p>
          <h1 className={styles.title}>Pitch Mode</h1>
          <p className={styles.lede}>
            Die Bühne für die Jury-Demo: lokal auf diesem Laptop, ohne Login.
            Aufnahme, Review und eine vorbereitete Frage.
          </p>
        </section>

        <div className={styles.layout}>
          <div className={styles.primaryColumn}>
            <section
              className={styles.actionsPanel}
              aria-labelledby={actionsTitleId}
            >
              <div className={styles.sectionHead}>
                <div>
                  <h2 id={actionsTitleId}>Demo starten</h2>
                  <p className={styles.sectionHint}>
                    Drei Wege, je nachdem wie viel Analyse die Bühne braucht.
                  </p>
                </div>
              </div>

              <div className={styles.actions}>
                <Link
                  className={styles.action}
                  href={STAGE_LINKS.live}
                  data-primary={livePrimary || undefined}
                >
                  <span className={styles.actionIcon}>
                    <Play size={21} aria-hidden="true" />
                  </span>
                  <span className={styles.actionText}>
                    <strong>Live-Demo starten</strong>
                    <span>
                      Mit Aufnahme, lokaler Analyse und Review. Das Backend
                      liefert Transkript und Hinweise.
                    </span>
                  </span>
                  <span className={styles.actionTag}>
                    {livePrimary ? "Hauptpfad" : "Analyse"}
                  </span>
                </Link>

                <Link
                  className={styles.action}
                  href={STAGE_LINKS.local}
                  data-primary={!livePrimary || undefined}
                >
                  <span className={styles.actionIcon}>
                    <HardDriveDownload size={21} aria-hidden="true" />
                  </span>
                  <span className={styles.actionText}>
                    <strong>Lokale Sofortaufnahme</strong>
                    <span>
                      Ohne Backend. Aufnahme und Review bleiben im Browser und
                      funktionieren als Fallback.
                    </span>
                  </span>
                  <span className={styles.actionTag}>
                    {livePrimary ? "Fallback" : "Hauptpfad"}
                  </span>
                </Link>

                <Link className={styles.action} href={STAGE_LINKS.review}>
                  <span className={styles.actionIcon}>
                    <ClipboardCheck size={21} aria-hidden="true" />
                  </span>
                  <span className={styles.actionText}>
                    <strong>Vorbereiteten Review öffnen</strong>
                    <span>
                      Markierte Beispielanalyse mit synthetischen Daten, ohne
                      Aufnahme.
                    </span>
                  </span>
                  <span className={styles.actionTag}>Beispiel</span>
                </Link>
              </div>

              <p className={styles.caveat}>
                <Info size={16} aria-hidden="true" />
                Stage-Aufnahmen bleiben lokal. Nur der Live-Pfad lädt zur
                Analyse hoch. Für die Jury nur synthetische Demo-Daten
                verwenden.
              </p>
              {backendBlocked && (
                <p className={styles.alert} role="status">
                  <AlertTriangle size={18} aria-hidden="true" />
                  Backend nicht bereit. Die lokale Sofortaufnahme funktioniert
                  ohne Backend.
                </p>
              )}
            </section>

            <section
              className={styles.preflightPanel}
              aria-labelledby={preflightTitleId}
            >
              <div className={styles.sectionHead}>
                <div>
                  <h2 id={preflightTitleId}>Preflight</h2>
                  <p className={styles.sectionHint}>
                    Status für Dienste und Browser. Kamera- und
                    Mikrofonberechtigungen werden erst beim Start angefragt.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.recheck}
                  onClick={() => void runPreflight()}
                  disabled={checking}
                >
                  {checking ? (
                    <Loader2
                      size={16}
                      className={styles.spin}
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshCw size={16} aria-hidden="true" />
                  )}
                  {checking ? "Prüfung läuft …" : "Preflight erneut prüfen"}
                </button>
              </div>

              <div className={styles.summary} aria-live="polite">
                <span className={styles.summaryReady}>{ready} bereit</span>
                <span className={styles.summaryOptional}>
                  {optional} optional
                </span>
                <span className={styles.summaryBlocked}>
                  {blocked} nicht bereit
                </span>
                {checkedAt && (
                  <span className={styles.checkedAt}>
                    Zuletzt geprüft: {checkedAt}
                  </span>
                )}
              </div>

              <ul className={styles.checkList} aria-busy={checking}>
                {checks.map((item) => (
                  <li
                    className={styles.checkRow}
                    data-status={item.status}
                    key={item.id}
                  >
                    <span className={styles.checkIcon}>
                      <StatusIcon status={item.status} />
                    </span>
                    <span className={styles.checkBody}>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </span>
                    <span className={styles.statusBadge}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </li>
                ))}
                {checking && serverChecks.length === 0 && (
                  <li className={styles.checkRow}>
                    <span className={styles.checkIcon}>
                      <Loader2
                        size={20}
                        className={styles.spin}
                        aria-hidden="true"
                      />
                    </span>
                    <span className={styles.checkBody}>
                      <strong>Dienste</strong>
                      <span>Prüfung läuft …</span>
                    </span>
                  </li>
                )}
                {preflightError && (
                  <li
                    className={styles.checkRow}
                    data-status="blocked"
                    role="status"
                  >
                    <span className={styles.checkIcon}>
                      <AlertTriangle size={20} aria-hidden="true" />
                    </span>
                    <span className={styles.checkBody}>
                      <strong>Preflight</strong>
                      <span>
                        Die Prüfung konnte nicht vollständig geladen werden.
                        Bitte erneut prüfen.
                      </span>
                    </span>
                    <span className={styles.statusBadge}>Nicht bereit</span>
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>

        <footer className={styles.footer}>
          <span>418 Pitch Practice · Prototyp</span>
          <span>Lokal auf diesem Laptop · nur für die Jury-Demo.</span>
        </footer>
      </main>
    </div>
  );
}

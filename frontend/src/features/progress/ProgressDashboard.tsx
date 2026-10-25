"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  Info,
  LineChart,
  Loader2,
  Lock,
  Mic,
  Minus,
  PersonStanding,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import {
  createProfile,
  deleteProfile,
  downloadExport,
  isAbortError,
  loadProgress,
  ProgressApiError,
  removeGoal,
  saveGoal,
} from "./api";
import { MetricChart, Sparkline } from "./charts";
import {
  PRESENTATION_MODES,
  PRESENTATION_MODE_LABEL,
  WINDOWS,
  WINDOW_LABEL,
  type Confidence,
  type MetricSeries,
  type MetricUnit,
  type PresentationMode,
  type ProgressHighlight,
  type ProgressPoint,
  type ProgressResponse,
  type ProgressWindow,
  type TrendStatus,
} from "./contract";
import { demoProgress } from "./demo";
import {
  clearStoredProfile,
  persistProfile,
  useMounted,
  useStoredProfile,
  type StoredProfile,
} from "./profile-store";
import {
  changeKindLabel,
  changeSentence,
  CONFIDENCE_COPY,
  exclusionReasonText,
  formatDate,
  formatDelta,
  formatNumber,
  formatPercent,
  formatPeriod,
  formatShortId,
  formatValue,
  GOAL_STATUS_COPY,
  goalTargetLabel,
  highlightSentence,
  metricStatusSentence,
  modeLabel,
  pointStatus,
  TREND_COPY,
} from "./format";
import "./progress.css";

type Query = {
  window: ProgressWindow;
  presentationMode: PresentationMode | "all";
};

type LoadError = {
  status: number;
  code?: string;
  message: string;
};

const HIGHLIGHT_ORDER: Record<ProgressHighlight["kind"], number> = {
  goal_on_track: 0,
  goal_off_track: 0,
  change_point: 1,
  trend_up: 2,
  trend_down: 2,
  quality_warning: 3,
  insufficient_data: 4,
};

const TREND_ICON: Record<TrendStatus, ReactNode> = {
  insufficient: <CircleHelp size={15} aria-hidden="true" />,
  early_signal: <CircleHelp size={15} aria-hidden="true" />,
  stable: <Minus size={15} aria-hidden="true" />,
  trend_up: <TrendingUp size={15} aria-hidden="true" />,
  trend_down: <TrendingDown size={15} aria-hidden="true" />,
  unclear: <TriangleAlert size={15} aria-hidden="true" />,
};

export function ProgressDashboard({ demo = false }: { demo?: boolean }) {
  const mounted = useMounted();
  const storedProfile = useStoredProfile();
  const profile = demo ? null : storedProfile;
  const [response, setResponse] = useState<ProgressResponse | null>(
    demo ? demoProgress : null,
  );
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<LoadError | null>(null);
  const [stale, setStale] = useState(false);
  const [query, setQuery] = useState<Query>({
    window: demo ? "all" : "last_20",
    presentationMode: "all",
  });
  const [showExcluded, setShowExcluded] = useState(true);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(
    demo ? "speech.filler_rate_per_100_words" : null,
  );
  const [selectedTakeId, setSelectedTakeId] = useState<string | null>(
    demo ? "demo-take-20" : null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [exportBusy, setExportBusy] = useState<"json" | "csv" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const hasData = useRef(false);

  useEffect(() => {
    if (demo || !profile) return;
    const controller = new AbortController();
    loadProgress(
      profile,
      {
        window: query.window,
        presentationMode: query.presentationMode,
        includeExcluded: true,
      },
      controller.signal,
    )
      .then((next) => {
        hasData.current = true;
        setResponse(next);
        setStale(false);
        setSelectedMetricId((current) =>
          current && next.series.some((item) => item.metricId === current)
            ? current
            : (next.series[0]?.metricId ?? null),
        );
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) return;
        if (hasData.current) {
          setStale(true);
          return;
        }
        if (caught instanceof ProgressApiError) {
          setError({
            status: caught.status,
            code: caught.code,
            message: caught.message,
          });
        } else {
          setError({
            status: 0,
            message:
              "Der Fortschritt konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.",
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [demo, profile, query.window, query.presentationMode, reloadToken]);

  const series = useMemo(() => response?.series ?? [], [response]);
  const selectedSeries = useMemo(
    () =>
      series.find((item) => item.metricId === selectedMetricId) ?? series[0],
    [series, selectedMetricId],
  );
  const activeTakeId = useMemo(() => {
    if (!selectedSeries) return null;
    if (
      selectedTakeId &&
      selectedSeries.points.some((point) => point.takeId === selectedTakeId)
    ) {
      return selectedTakeId;
    }
    return selectedSeries.latest?.takeId ?? null;
  }, [selectedSeries, selectedTakeId]);
  const selectedPoint = useMemo(
    () =>
      selectedSeries?.points.find((point) => point.takeId === activeTakeId) ??
      null,
    [selectedSeries, activeTakeId],
  );

  const changeQuery = useCallback((next: Query) => {
    setError(null);
    setStale(false);
    setLoading(true);
    setQuery(next);
  }, []);

  const focusMetric = useCallback(
    (metricId: string, takeId?: string | null) => {
      const target = series.find((item) => item.metricId === metricId);
      if (!target) return;
      setSelectedMetricId(metricId);
      setSelectedTakeId(
        takeId && target.points.some((point) => point.takeId === takeId)
          ? takeId
          : (target.latest?.takeId ?? null),
      );
    },
    [series],
  );

  const retry = useCallback(() => {
    setError(null);
    setStale(false);
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  const activate = useCallback(async (displayName: string) => {
    const created = await createProfile(displayName);
    hasData.current = false;
    setResponse(null);
    setError(null);
    setLoading(true);
    persistProfile(created);
  }, []);

  const resetProfile = useCallback(() => {
    clearStoredProfile();
    setResponse(null);
    setError(null);
    setLoading(false);
    hasData.current = false;
  }, []);

  const removeProfile = useCallback(async () => {
    if (!profile) return;
    await deleteProfile(profile);
    clearStoredProfile();
    setResponse(null);
    setError(null);
    setLoading(false);
    hasData.current = false;
  }, [profile]);

  const exportProgress = useCallback(
    async (format: "json" | "csv") => {
      if (!profile) return;
      setExportBusy(format);
      setExportError(null);
      try {
        await downloadExport(profile, format);
      } catch (caught) {
        setExportError(
          caught instanceof Error
            ? caught.message
            : "Der Export ist fehlgeschlagen.",
        );
      } finally {
        setExportBusy(null);
      }
    },
    [profile],
  );

  const updateGoal = useCallback(
    async (goal: {
      direction: "increase" | "decrease" | "target_band";
      targetValue?: number | null;
      targetMin?: number | null;
      targetMax?: number | null;
    }) => {
      if (!profile || !selectedSeries) return;
      setGoalBusy(true);
      setGoalError(null);
      try {
        await saveGoal(profile, selectedSeries.metricId, goal);
        setLoading(true);
        setReloadToken((token) => token + 1);
      } catch (caught) {
        setGoalError(
          caught instanceof Error
            ? caught.message
            : "Das Ziel konnte nicht gespeichert werden.",
        );
      } finally {
        setGoalBusy(false);
      }
    },
    [profile, selectedSeries],
  );

  const deleteSelectedGoal = useCallback(async () => {
    if (!profile || !selectedSeries) return;
    setGoalBusy(true);
    setGoalError(null);
    try {
      await removeGoal(profile, selectedSeries.metricId);
      setLoading(true);
      setReloadToken((token) => token + 1);
    } catch (caught) {
      setGoalError(
        caught instanceof Error
          ? caught.message
          : "Das Ziel konnte nicht entfernt werden.",
      );
    } finally {
      setGoalBusy(false);
    }
  }, [profile, selectedSeries]);

  if (!demo && !mounted) {
    return (
      <AppShell experience="live">
        <div className="progress418" lang="de">
          <LoadingState label="Fortschritt wird geladen" />
        </div>
      </AppShell>
    );
  }

  if (!demo && !profile) {
    return (
      <AppShell experience="live">
        <div className="progress418" lang="de">
          <ConsentScreen onActivate={activate} />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell experience="live">
        <div className="progress418" lang="de">
          <ProfileError
            error={error}
            onRetry={retry}
            onReset={resetProfile}
            demo={demo}
          />
        </div>
      </AppShell>
    );
  }

  if (loading && !response) {
    return (
      <AppShell experience="live">
        <div className="progress418" lang="de">
          <LoadingState label="Fortschritt wird geladen" />
        </div>
      </AppShell>
    );
  }

  if (!response) {
    return (
      <AppShell experience="live">
        <div className="progress418" lang="de">
          <ProfileError
            error={{
              status: 503,
              message: "Keine Fortschrittsdaten erhalten.",
            }}
            onRetry={retry}
            onReset={resetProfile}
            demo={demo}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell experience="live">
      <div className="progress418" lang="de">
        {demo && <DemoBanner />}
        <ProgressHeader
          response={response}
          demo={demo}
          profile={profile}
          loading={loading}
          stale={stale}
          query={query}
          showExcluded={showExcluded}
          exportBusy={exportBusy}
          exportError={exportError}
          onQuery={changeQuery}
          onShowExcluded={setShowExcluded}
          onExport={exportProgress}
          onDeleteProfile={removeProfile}
        />

        {response.profile.totalTakes === 0 ? (
          <EmptyProgress demo={demo} />
        ) : (
          <>
            <Overview response={response} />
            <Highlights response={response} onFocus={focusMetric} demo={demo} />

            <section
              className="progress-metrics"
              aria-labelledby="progress-metrics-heading"
            >
              <div className="progress-section-heading">
                <div>
                  <h2 id="progress-metrics-heading">Metriken im Vergleich</h2>
                  <p>
                    Jede Karte hat ihre eigene Skala. Die Höhe einer Karte sagt
                    nichts über die Höhe einer anderen Metrik aus.
                  </p>
                </div>
                <div className="progress-legend" aria-hidden="true">
                  <span>
                    <i className="progress-dot is-eligible" /> vergleichbar
                  </span>
                  <span>
                    <i className="progress-dot is-excluded" /> nicht
                    vergleichbar
                  </span>
                  <span>
                    <i className="progress-dot is-gap">×</i> nicht berechenbar
                  </span>
                </div>
              </div>
              <ul className="progress-grid">
                {series.map((item) => (
                  <MetricCard
                    key={item.metricId}
                    series={item}
                    selected={item.metricId === selectedSeries?.metricId}
                    onSelect={() => focusMetric(item.metricId)}
                  />
                ))}
              </ul>
            </section>

            {selectedSeries && (
              <SeriesDetail
                series={selectedSeries}
                selectedPoint={selectedPoint}
                selectedTakeId={activeTakeId}
                showExcluded={showExcluded}
                demo={demo}
                profile={profile}
                goalBusy={goalBusy}
                goalError={goalError}
                onSelectPoint={(takeId) => setSelectedTakeId(takeId)}
                onSaveGoal={updateGoal}
                onDeleteGoal={deleteSelectedGoal}
              />
            )}

            <ChangeList response={response} onFocus={focusMetric} />

            <DataQuality response={response} demo={demo} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function ProgressHeader({
  response,
  demo,
  profile,
  loading,
  stale,
  query,
  showExcluded,
  exportBusy,
  exportError,
  onQuery,
  onShowExcluded,
  onExport,
  onDeleteProfile,
}: {
  response: ProgressResponse;
  demo: boolean;
  profile: StoredProfile | null;
  loading: boolean;
  stale: boolean;
  query: Query;
  showExcluded: boolean;
  exportBusy: "json" | "csv" | null;
  exportError: string | null;
  onQuery: (query: Query) => void;
  onShowExcluded: (value: boolean) => void;
  onExport: (format: "json" | "csv") => void;
  onDeleteProfile: () => Promise<void>;
}) {
  return (
    <header className="progress-header">
      <div className="progress-heading">
        <span className="progress-eyebrow">
          <LineChart size={16} aria-hidden="true" /> Langzeit-Fortschritt
        </span>
        <h1>Was sich über deine Aufnahmen verändert.</h1>
        <p>
          Eine Beschreibung deiner eigenen Messreihe: Rohpunkte, Lücken und
          Unsicherheit. Kein Gesamtscore, keine Note und kein Vergleich mit
          anderen Personen.
        </p>
        <div className="progress-identity">
          <span className="progress-profile-name">
            {response.profile.displayName || "Mein Übungsprofil"}
          </span>
          {demo ? (
            <span className="progress-chip is-demo">
              <FlaskConical size={14} aria-hidden="true" /> Demo-Daten
            </span>
          ) : (
            <span className="progress-chip">
              <ShieldCheck size={14} aria-hidden="true" /> Pseudonymes Profil
            </span>
          )}
          {loading && (
            <span className="progress-chip is-busy">
              <Loader2 size={14} className="progress-spin" aria-hidden="true" />
              Aktualisiert
            </span>
          )}
        </div>
      </div>

      <div className="progress-toolbar">
        <div className="progress-filters" role="group" aria-label="Filter">
          <label className="progress-field">
            <span>Zeitraum</span>
            <select
              value={query.window}
              disabled={demo}
              onChange={(event) =>
                onQuery({
                  ...query,
                  window: event.target.value as ProgressWindow,
                })
              }
            >
              {WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {WINDOW_LABEL[window]}
                </option>
              ))}
            </select>
          </label>
          <label className="progress-field">
            <span>Präsentationstyp</span>
            <select
              value={query.presentationMode}
              disabled={demo}
              onChange={(event) =>
                onQuery({
                  ...query,
                  presentationMode: event.target.value as
                    PresentationMode | "all",
                })
              }
            >
              <option value="all">Alle Typen</option>
              {PRESENTATION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {PRESENTATION_MODE_LABEL[mode]}
                </option>
              ))}
            </select>
          </label>
          <label className="progress-check">
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={(event) => onShowExcluded(event.target.checked)}
            />
            <span>Nicht vergleichbare Aufnahmen zeigen</span>
          </label>
        </div>

        <div className="progress-toolbar-actions">
          {demo ? (
            <Link href="/progress" className="button button-outline button-sm">
              <Lock size={15} aria-hidden="true" /> Eigenes Profil
            </Link>
          ) : (
            <>
              <details className="progress-menu">
                <summary className="button button-outline button-sm">
                  <Download size={15} aria-hidden="true" /> Export
                  <ChevronDown size={14} aria-hidden="true" />
                </summary>
                <div className="progress-menu-body">
                  <button
                    type="button"
                    onClick={() => onExport("csv")}
                    disabled={exportBusy !== null}
                  >
                    <FileSpreadsheet size={16} aria-hidden="true" /> CSV
                    {exportBusy === "csv" && (
                      <Loader2
                        size={14}
                        className="progress-spin"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport("json")}
                    disabled={exportBusy !== null}
                  >
                    <FileJson size={16} aria-hidden="true" /> JSON
                    {exportBusy === "json" && (
                      <Loader2
                        size={14}
                        className="progress-spin"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  <small>Keine Videos, Wörter oder Landmarks.</small>
                </div>
              </details>
              <details className="progress-menu">
                <summary className="button button-outline button-sm">
                  <Database size={15} aria-hidden="true" /> Profil
                  <ChevronDown size={14} aria-hidden="true" />
                </summary>
                <ProfileMenu
                  response={response}
                  profile={profile}
                  onDelete={onDeleteProfile}
                />
              </details>
            </>
          )}
        </div>
        {exportError && (
          <p className="progress-inline-error" role="alert">
            <TriangleAlert size={15} aria-hidden="true" /> {exportError}
          </p>
        )}
        {stale && (
          <p className="progress-inline-warning" role="status">
            <RefreshCw size={15} aria-hidden="true" /> Aktualisierung
            fehlgeschlagen. Angezeigt wird der zuletzt geladene Stand.
            <button
              type="button"
              className="progress-link"
              onClick={() => window.location.reload()}
            >
              Neu laden
            </button>
          </p>
        )}
        {demo && (
          <p className="progress-demo-note">
            Filter sind im Demo-Modus fest. Die Demo zeigt alle 24 erfundenen
            Aufnahmen.
          </p>
        )}
      </div>
    </header>
  );
}

function ProfileMenu({
  response,
  profile,
  onDelete,
}: {
  response: ProgressResponse;
  profile: StoredProfile | null;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setFailure(null);
    try {
      await onDelete();
    } catch (caught) {
      setFailure(
        caught instanceof Error
          ? caught.message
          : "Das Profil konnte nicht gelöscht werden.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="progress-menu-body progress-profile-menu">
      <dl>
        <div>
          <dt>Profil-ID</dt>
          <dd>
            {profile
              ? formatShortId(profile.profileId)
              : formatShortId(response.profile.profileId)}
          </dd>
        </div>
        <div>
          <dt>Angelegt</dt>
          <dd>{formatDate(response.profile.createdAt)}</dd>
        </div>
        <div>
          <dt>Zugriff möglich</dt>
          <dd>
            {response.profile.consent.retentionUntil
              ? `bis ${formatDate(response.profile.consent.retentionUntil)}`
              : "bis zur Löschung"}
          </dd>
        </div>
      </dl>
      <p>
        Profil löschen entfernt Messwerte, Ziele und Trends auf dem Server.
        Lokale Videos bleiben im Browser und müssen separat gelöscht werden.
      </p>
      {failure && (
        <p className="progress-inline-error" role="alert">
          {failure}
        </p>
      )}
      {confirming ? (
        <div className="progress-confirm" role="alert">
          <strong>Profil endgültig löschen?</strong>
          <p>
            Ohne den Token sind die serverseitigen Fortschrittsdaten danach
            nicht mehr erreichbar.
          </p>
          <div>
            <button
              type="button"
              className="button button-danger button-sm"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? (
                <Loader2
                  size={14}
                  className="progress-spin"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 size={15} aria-hidden="true" />
              )}
              Endgültig löschen
            </button>
            <button
              type="button"
              className="button button-ghost button-sm"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="button button-outline button-sm progress-danger-button"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={15} aria-hidden="true" /> Profil löschen
        </button>
      )}
    </div>
  );
}

function ConsentScreen({
  onActivate,
}: {
  onActivate: (displayName: string) => Promise<void>;
}) {
  const [name, setName] = useState("Mein Übungsprofil");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!consent || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await onActivate(name);
    } catch (caught) {
      setFailure(
        caught instanceof Error
          ? caught.message
          : "Das Profil konnte nicht angelegt werden.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="progress-consent">
      <section className="progress-consent-intro">
        <span className="progress-eyebrow">
          <LineChart size={16} aria-hidden="true" /> Langzeit-Fortschritt
        </span>
        <h1>Fortschritt über mehrere Präsentationen sehen.</h1>
        <p>
          Aktiviere ein optionales, pseudonymes Profil. Dann kannst du Messwerte
          einzelner Aufnahmen vergleichen, Veränderungen ab einer bestimmten
          Aufnahme erkennen und Lücken nachvollziehen.
        </p>
        <ul className="progress-consent-list">
          <li>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>Nur deine eigene Messreihe.</strong> Kein Ranking, kein
              Personenvergleich und kein Gesamtscore.
            </span>
          </li>
          <li>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>Ehrliche Lücken.</strong> Fehlende oder schlecht
              vergleichbare Aufnahmen werden nicht als 0 oder „gut“ gezählt.
            </span>
          </li>
          <li>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>Löschbar und exportierbar.</strong> Du kannst die
              gespeicherten Messwerte jederzeit als CSV/JSON exportieren oder
              löschen.
            </span>
          </li>
          <li>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>Videos bleiben lokal.</strong> Der Server speichert keine
              Aufnahmen, Clips, Wörter oder Landmarks für den Fortschritt.
            </span>
          </li>
        </ul>
        <div className="progress-consent-actions">
          <Link href="/progress/demo" className="button button-primary">
            <FlaskConical size={17} aria-hidden="true" /> Synthetische Demo
            ansehen
          </Link>
          <Link href="/live" className="button button-outline">
            <Video size={16} aria-hidden="true" /> Zum Live-Studio
          </Link>
        </div>
        <p className="progress-fineprint">
          Die Demo verwendet 24 erfundene Aufnahmen. Sie ersetzt keine echten
          Messungen und zeigt keine Genauigkeits- oder Wirksamkeitszusage.
        </p>
      </section>

      <aside
        className="progress-consent-card"
        aria-labelledby="consent-heading"
      >
        <h2 id="consent-heading">Profil aktivieren</h2>
        <p>
          Die Einwilligung gilt nur für den Langzeit-Fortschritt und ist
          unabhängig von der Einwilligung einer einzelnen Aufnahme.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="progress-field">
            <span>Name (optional)</span>
            <input
              className="input"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="progress-check is-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>
              Ich willige ein, abgeleitete Messwerte und Qualitätsmerkmale
              meiner Aufnahmen für den Fortschritt zu speichern. Nach 12 Monaten
              wird der Zugriff gesperrt. Automatische Löschung ist noch nicht
              umgesetzt; ich kann das Profil jederzeit selbst löschen.
            </span>
          </label>
          <dl className="progress-consent-facts">
            <div>
              <dt>Gespeichert</dt>
              <dd>
                Messwerte pro Aufnahme, Qualität, Trend-Aggregate und selbst
                gesetzte Ziele.
              </dd>
            </div>
            <div>
              <dt>Nicht gespeichert</dt>
              <dd>Video, Audio, Transkript, Wörter, Landmarks.</dd>
            </div>
            <div>
              <dt>Zugang</dt>
              <dd>
                Zufälliger Profil-Token in diesem Browser. Kein Login, keine
                E-Mail.
              </dd>
            </div>
          </dl>
          {failure && (
            <p className="progress-inline-error" role="alert">
              <TriangleAlert size={15} aria-hidden="true" /> {failure}
            </p>
          )}
          <button
            type="submit"
            className="button button-primary progress-wide"
            disabled={!consent || busy}
          >
            {busy ? (
              <Loader2 size={16} className="progress-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck size={16} aria-hidden="true" />
            )}
            {busy ? "Profil wird angelegt …" : "Fortschritt aktivieren"}
          </button>
          <p className="progress-fineprint">
            Ohne Einwilligung wird nichts langfristig gespeichert. Ist der Token
            verloren, ist das Profil ohne Recovery nicht mehr erreichbar.
          </p>
        </form>
      </aside>
    </div>
  );
}

function DemoBanner() {
  return (
    <aside
      className="progress-demo-banner"
      role="status"
      aria-label="Demo-Hinweis"
    >
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>Synthetische Demo-Daten</strong>
        <p>
          24 erfundene Aufnahmen, keine echte Aufnahme, keine ASR- oder
          Genauigkeitsvalidierung. Die Demo zeigt Zustände und Interaktionen der
          Progress-UI, nicht deine Leistung.
        </p>
      </div>
      <Link href="/progress" className="progress-link">
        Eigenes Profil <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </aside>
  );
}

function Overview({ response }: { response: ProgressResponse }) {
  const excludedTakes = new Set(
    response.series.flatMap((item) =>
      item.points
        .filter((point) => !point.eligible)
        .map((point) => point.takeId),
    ),
  ).size;
  const goals = response.series.filter((item) => item.goal).length;
  const goodSeries = response.series.filter(
    (item) => item.quality.status === "good",
  ).length;
  const qualityLabel =
    excludedTakes === 0
      ? "Gut"
      : goodSeries === response.series.length
        ? "Gut"
        : goodSeries >= response.series.length / 2
          ? "Teilweise"
          : "Begrenzt";
  return (
    <dl className="progress-overview" aria-label="Überblick">
      <div>
        <dt>Vergleichbare Aufnahmen</dt>
        <dd>
          {response.profile.eligibleTakes}
          <span> von {response.profile.totalTakes}</span>
        </dd>
        <small>mindestens eine primäre Metrik auswertbar</small>
      </div>
      <div>
        <dt>Zeitraum</dt>
        <dd className="progress-overview-text">
          {formatPeriod(
            response.profile.firstRecordedAt,
            response.profile.lastRecordedAt,
          )}
        </dd>
        <small>
          {response.profile.totalTakes}{" "}
          {response.profile.totalTakes === 1 ? "Aufnahme" : "Aufnahmen"}
        </small>
      </div>
      <div>
        <dt>Datenlage</dt>
        <dd>{qualityLabel}</dd>
        <small>
          {excludedTakes} {excludedTakes === 1 ? "Aufnahme" : "Aufnahmen"} für
          mindestens eine Metrik nicht vergleichbar
        </small>
      </div>
      <div>
        <dt>Ziele</dt>
        <dd>{goals === 0 ? "Keine" : `${goals} gesetzt`}</dd>
        <small>
          {goals === 0
            ? "ohne Ziel bleibt die Richtung neutral"
            : "selbst gesetzte Übungsrichtung, keine Note"}
        </small>
      </div>
    </dl>
  );
}

function Highlights({
  response,
  onFocus,
  demo,
}: {
  response: ProgressResponse;
  onFocus: (metricId: string, takeId?: string | null) => void;
  demo: boolean;
}) {
  const seen = new Set<string>();
  const items = response.highlights
    .map((highlight) => {
      const series = response.series.find(
        (item) => item.metricId === highlight.metricId,
      );
      return {
        highlight,
        series,
        sentence: highlightSentence(highlight, series),
      };
    })
    .filter((item) => {
      if (!item.series) return false;
      const key = `${item.highlight.kind}:${item.series.metricId}:${item.highlight.sequence ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        (HIGHLIGHT_ORDER[a.highlight.kind] ?? 9) -
        (HIGHLIGHT_ORDER[b.highlight.kind] ?? 9),
    );
  if (!items.length) {
    return (
      <section
        className="progress-highlights"
        aria-labelledby="highlights-heading"
      >
        <div className="progress-section-heading">
          <div>
            <h2 id="highlights-heading">Was sich verändert hat</h2>
            <p>
              Beobachtungen aus den vorhandenen Aufnahmen; keine Ursachen und
              keine Erfolgsmeldung.
            </p>
          </div>
        </div>
        <p className="progress-empty-line">
          Noch keine belastbare Veränderung beobachtet. Einzelne Ausreißer
          werden nicht als Trend gewertet.
          {demo
            ? ""
            : " Mit mehr vergleichbaren Aufnahmen wird die Aussage stabiler."}
        </p>
      </section>
    );
  }
  return (
    <section
      className="progress-highlights"
      aria-labelledby="highlights-heading"
    >
      <div className="progress-section-heading">
        <div>
          <h2 id="highlights-heading">Was sich verändert hat</h2>
          <p>
            Beobachtungen aus den vorhandenen Aufnahmen; keine Ursachen und
            keine Erfolgsmeldung.
          </p>
        </div>
        <span className="progress-chip is-neutral">
          <Info size={14} aria-hidden="true" /> beobachtet, nicht bewiesen
        </span>
      </div>
      <ul className="progress-highlight-list">
        {items.slice(0, 3).map((item) => (
          <li
            key={`${item.highlight.kind}-${item.series?.metricId}-${item.highlight.sequence ?? "x"}`}
          >
            <span
              className={`progress-highlight-icon is-${item.highlight.kind}`}
              aria-hidden="true"
            >
              {item.highlight.kind === "goal_on_track" ||
              item.highlight.kind === "goal_off_track" ? (
                <Target size={18} />
              ) : item.highlight.kind === "quality_warning" ? (
                <TriangleAlert size={18} />
              ) : item.highlight.kind === "change_point" ? (
                <RefreshCw size={18} />
              ) : (
                TREND_ICON[
                  item.highlight.kind === "trend_up"
                    ? "trend_up"
                    : item.highlight.kind === "trend_down"
                      ? "trend_down"
                      : "insufficient"
                ]
              )}
            </span>
            <span className="progress-highlight-copy">
              {item.sentence}
              <small>{item.series?.label.de}</small>
            </span>
            <button
              type="button"
              className="progress-link progress-highlight-action"
              onClick={() =>
                onFocus(item.highlight.metricId, item.highlight.takeId)
              }
            >
              Details <ArrowRight size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <details className="progress-more">
          <summary>Alle {items.length} Beobachtungen</summary>
          <ul>
            {items.slice(3).map((item) => (
              <li
                key={`more-${item.series?.metricId}-${item.highlight.sequence ?? "x"}`}
              >
                <span>{item.sentence}</span>
                <button
                  type="button"
                  className="progress-link"
                  onClick={() =>
                    onFocus(item.highlight.metricId, item.highlight.takeId)
                  }
                >
                  Details
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function MetricCard({
  series,
  selected,
  onSelect,
}: {
  series: MetricSeries;
  selected: boolean;
  onSelect: () => void;
}) {
  const latest = series.latest;
  const delta = latest?.changeVsBaseline;
  const trend = TREND_COPY[series.trend.status];
  return (
    <li>
      <button
        type="button"
        className={`progress-card${selected ? " is-selected" : ""}`}
        aria-pressed={selected}
        onClick={onSelect}
        aria-label={`${series.label.de}: ${formatValue(latest?.value ?? null, series.unit)}. ${delta != null ? `${formatDelta(delta, series.unit)} seit Start. ` : ""}${trend.label}. ${CONFIDENCE_COPY[series.trend.confidence]}. ${series.quality.excludedPoints} Aufnahmen nicht vergleichbar.`}
      >
        <span className="progress-card-top">
          <span className="progress-source-icon" aria-hidden="true">
            {sourceIcon(series)}
          </span>
          <span className="progress-card-label">{series.label.de}</span>
          <span className={`progress-badge is-${series.trend.status}`}>
            {TREND_ICON[series.trend.status]} {trend.label}
          </span>
        </span>
        <span className="progress-card-value">
          {formatValue(latest?.value ?? null, series.unit)}
          <small>
            {latest
              ? `Aufnahme #${series.points.find((point) => point.takeId === latest.takeId)?.sequence ?? "?"}`
              : "kein vergleichbarer Wert"}
          </small>
        </span>
        <span className="progress-card-spark">
          <Sparkline series={series} />
        </span>
        <span className="progress-card-meta">
          {series.baseline?.value != null ? (
            <span>Start {formatValue(series.baseline.value, series.unit)}</span>
          ) : (
            <span>Keine Baseline</span>
          )}
          {delta != null && (
            <span className="progress-card-delta">
              {formatDelta(delta, series.unit)} seit Start
            </span>
          )}
          <span className={`progress-quality-mark is-${series.quality.status}`}>
            {series.quality.excludedPoints > 0
              ? `${series.quality.excludedPoints} nicht vergleichbar`
              : series.quality.status === "poor"
                ? "begrenzt"
                : "vollständig"}
          </span>
        </span>
        {series.goal && (
          <span className={`progress-goal-mark is-${series.goalStatus}`}>
            <Target size={14} aria-hidden="true" />
            {GOAL_STATUS_COPY[series.goalStatus]} · Ziel{" "}
            {goalTargetLabel(series.goal, series.unit)}
          </span>
        )}
      </button>
    </li>
  );
}

function sourceIcon(series: MetricSeries) {
  switch (series.metricId.split(".")[0]) {
    case "pose":
      return <PersonStanding size={16} />;
    case "content":
      return <BookOpenCheck size={16} />;
    case "speech":
      return series.metricId.includes("pause") ? (
        <AudioLines size={16} />
      ) : (
        <Mic size={16} />
      );
    default:
      return <LineChart size={16} />;
  }
}

function SeriesDetail({
  series,
  selectedPoint,
  selectedTakeId,
  showExcluded,
  demo,
  profile,
  goalBusy,
  goalError,
  onSelectPoint,
  onSaveGoal,
  onDeleteGoal,
}: {
  series: MetricSeries;
  selectedPoint: ProgressPoint | null;
  selectedTakeId: string | null;
  showExcluded: boolean;
  demo: boolean;
  profile: StoredProfile | null;
  goalBusy: boolean;
  goalError: string | null;
  onSelectPoint: (takeId: string) => void;
  onSaveGoal: (goal: {
    direction: "increase" | "decrease" | "target_band";
    targetValue?: number | null;
    targetMin?: number | null;
    targetMax?: number | null;
  }) => Promise<void>;
  onDeleteGoal: () => Promise<void>;
}) {
  const latest = series.latest;
  const delta = latest?.changeVsBaseline ?? null;
  const trend = TREND_COPY[series.trend.status];
  const visiblePoints = showExcluded
    ? series.points
    : series.points.filter((point) => point.eligible);
  const hasExcluded = visiblePoints.some((point) => !point.eligible);
  const hasGaps = visiblePoints.some((point) => point.value == null);
  return (
    <section
      className="progress-detail"
      aria-labelledby="progress-detail-heading"
    >
      <div className="progress-detail-head">
        <div>
          <span className="progress-eyebrow">
            <LineChart size={15} aria-hidden="true" /> Fokus
          </span>
          <h2 id="progress-detail-heading">{series.label.de}</h2>
          <p>
            {series.heuristic
              ? `${series.label.de} ist eine Heuristik; keine validierte Messung.`
              : ""}
          </p>
        </div>
        <div className="progress-detail-badges">
          <span className={`progress-badge is-${series.trend.status}`}>
            {TREND_ICON[series.trend.status]} {trend.label}
          </span>
          <span className="progress-badge is-neutral">
            {CONFIDENCE_COPY[series.trend.confidence]}
          </span>
          {series.goal ? (
            <span className={`progress-badge is-goal-${series.goalStatus}`}>
              <Target size={14} aria-hidden="true" />{" "}
              {GOAL_STATUS_COPY[series.goalStatus]}
            </span>
          ) : (
            <span className="progress-badge is-neutral">Kein Ziel gesetzt</span>
          )}
        </div>
      </div>

      {series.quality.versionBreak && (
        <p className="progress-inline-warning" role="status">
          <TriangleAlert size={16} aria-hidden="true" /> Die Reihe überschreitet
          eine Regelversion. Punkte jenseits des Bruchs werden nicht mit den
          älteren verbunden.
        </p>
      )}
      {series.trend.status === "insufficient" && (
        <p className="progress-inline-info" role="status">
          <CircleHelp size={16} aria-hidden="true" />{" "}
          {metricStatusSentence(series)}
        </p>
      )}

      <dl className="progress-detail-kpis">
        <div>
          <dt>Startphase</dt>
          <dd>
            {formatValue(series.baseline?.value ?? null, series.unit)}
            <small>
              Median der ersten {series.baseline?.n ?? 0} vergleichbaren
              Aufnahmen
            </small>
          </dd>
        </div>
        <div>
          <dt>Aktuell</dt>
          <dd>
            {formatValue(latest?.value ?? null, series.unit)}
            <small>
              {latest ? formatDate(latest.recordedAt) : "kein Wert"}
            </small>
          </dd>
        </div>
        <div>
          <dt>Veränderung</dt>
          <dd>
            {delta == null ? "–" : formatDelta(delta, series.unit)}
            <small>
              {delta == null
                ? "keine Baseline"
                : series.goal
                  ? "gegenüber der Startphase"
                  : "gestiegen/gefallen; ohne Ziel keine Wertung"}
            </small>
          </dd>
        </div>
        <div>
          <dt>Vergleichbar</dt>
          <dd>
            {series.quality.eligiblePoints}
            <span> von {series.quality.totalPoints}</span>
            <small>{CONFIDENCE_COPY[series.trend.confidence]}</small>
          </dd>
        </div>
      </dl>

      <div className="progress-detail-layout">
        <div className="progress-detail-chart">
          <MetricChart
            series={series}
            selectedTakeId={selectedTakeId}
            onSelect={onSelectPoint}
            showExcluded={showExcluded}
          />
          <div className="progress-chart-legend">
            <span>
              <i className="progress-legend-line is-series" /> Messwerte
            </span>
            {hasExcluded && (
              <span>
                <i className="progress-dot is-excluded" aria-hidden="true" />{" "}
                nicht vergleichbar
              </span>
            )}
            {hasGaps && (
              <span>
                <i className="progress-dot is-gap" aria-hidden="true">
                  ×
                </i>{" "}
                nicht berechenbar
              </span>
            )}
            <span>
              <i className="progress-legend-line is-baseline" /> Startphase
            </span>
            <span>
              <i className="progress-legend-line is-trend" /> Trend
            </span>
            <span>
              <i className="progress-legend-band" /> übliche Schwankung
            </span>
            <span>
              <i className="progress-legend-line is-change" /> Veränderung
            </span>
          </div>
          <p className="progress-axis-note">
            {series.unit === "ratio" ||
            series.unit === "per100w" ||
            series.unit === "perMin" ||
            series.unit === "count"
              ? "Die Y-Achse beginnt bei 0."
              : "Die Y-Achse ist auf den dargestellten Wertebereich begrenzt, nicht auf 0."}
          </p>
          <PresentationStrip
            series={series}
            points={visiblePoints}
            selectedTakeId={selectedTakeId}
            onSelect={onSelectPoint}
          />
        </div>

        <aside className="progress-detail-side">
          <PointDetail
            series={series}
            point={selectedPoint}
            onSelect={onSelectPoint}
          />
          <GoalEditor
            key={`${series.metricId}-${series.goal?.updatedAt ?? "none"}`}
            series={series}
            demo={demo}
            profile={profile}
            busy={goalBusy}
            error={goalError}
            onSave={onSaveGoal}
            onDelete={onDeleteGoal}
          />
          <WhyPanel series={series} />
        </aside>
      </div>

      <QualityTable series={series} />
    </section>
  );
}

function PresentationStrip({
  series,
  points,
  selectedTakeId,
  onSelect,
}: {
  series: MetricSeries;
  points: ProgressPoint[];
  selectedTakeId: string | null;
  onSelect: (takeId: string) => void;
}) {
  return (
    <div className="progress-strip-wrap">
      <div className="progress-strip-head">
        <h3>Aufnahmen</h3>
        <span>auswählen, um Details zu sehen</span>
      </div>
      <ol className="progress-strip" aria-label="Aufnahmen in dieser Metrik">
        {points.map((point) => {
          const status =
            point.value == null
              ? "gap"
              : point.eligible
                ? "eligible"
                : "excluded";
          const selected = point.takeId === selectedTakeId;
          return (
            <li key={point.takeId}>
              <button
                type="button"
                className={`progress-strip-item is-${status}${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onSelect(point.takeId)}
                aria-label={`Aufnahme ${point.sequence}, ${formatDate(point.recordedAt)}, ${point.value == null ? "nicht berechenbar" : formatValue(point.value, series.unit)}, ${point.eligible ? "vergleichbar" : "nicht vergleichbar"}`}
              >
                <span className="progress-strip-number">#{point.sequence}</span>
                <span
                  className={`progress-dot is-${status}`}
                  aria-hidden="true"
                >
                  {status === "gap" ? "×" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PointDetail({
  series,
  point,
  onSelect,
}: {
  series: MetricSeries;
  point: ProgressPoint | null;
  onSelect: (takeId: string) => void;
}) {
  if (!point) {
    return (
      <section className="progress-point-detail" aria-live="polite">
        <h3>Aufnahme auswählen</h3>
        <p className="muted">
          Klicke auf einen Punkt im Chart oder auf eine Aufnahme im Streifen.
        </p>
      </section>
    );
  }
  const change = series.changePoints.find(
    (item) => item.takeId === point.takeId,
  );
  const reasons = point.exclusionReasons;
  return (
    <section className="progress-point-detail" aria-live="polite">
      <div className="progress-point-head">
        <div>
          <span className="progress-eyebrow">Aufnahme #{point.sequence}</span>
          <h3>{formatDate(point.recordedAt, true)}</h3>
        </div>
        <span
          className={`progress-badge ${
            point.eligible
              ? "is-eligible"
              : point.value == null
                ? "is-neutral"
                : "is-excluded"
          }`}
        >
          {pointStatus(point)}
        </span>
      </div>
      <p className="progress-point-value">
        {formatValue(point.value, series.unit)}
        {point.recordedAtSource === "server" && <small>Serverzeit</small>}
      </p>
      <dl className="progress-point-facts">
        <div>
          <dt>Typ</dt>
          <dd>{modeLabel(point.context.presentationMode)}</dd>
        </div>
        <div>
          <dt>Dauer</dt>
          <dd>{formatDuration(point.context.durationMs)}</dd>
        </div>
        <div>
          <dt>Pose-Abdeckung</dt>
          <dd>{formatPercent(point.quality.poseCoverage)}</dd>
        </div>
        <div>
          <dt>Aktive Sprache</dt>
          <dd>{formatPercent(point.quality.audioActiveRatio)}</dd>
        </div>
        <div>
          <dt>Wörter</dt>
          <dd>{point.quality.wordCount ?? "–"}</dd>
        </div>
        <div>
          <dt>Geprüfte Aussagen</dt>
          <dd>{point.quality.claimCount ?? "–"}</dd>
        </div>
      </dl>
      {reasons.length > 0 && (
        <div className="progress-exclusion">
          <strong>Nicht vergleichbar, weil</strong>
          <ul>
            {reasons.map((reason) => (
              <li key={reason}>{exclusionReasonText(reason)}</li>
            ))}
          </ul>
        </div>
      )}
      {change && (
        <div className="progress-change-note">
          <strong>{changeKindLabel(change.kind)} ab dieser Aufnahme</strong>
          <span>{changeSentence(change, series)}</span>
        </div>
      )}
      {point.quality.syntheticDemo && (
        <p className="progress-inline-warning">
          <FlaskConical size={15} aria-hidden="true" /> Synthetische
          Demo-Aufnahme; nicht als echte Messung gewertet.
        </p>
      )}
      <p className="progress-fineprint">
        Video bleibt lokal. Diese Ansicht zeigt nur Messwerte und
        Qualitätsmerkmale.
      </p>
      <div className="progress-point-actions">
        <button
          type="button"
          className="progress-link"
          onClick={() => {
            const index = series.points.findIndex(
              (item) => item.takeId === point.takeId,
            );
            const previous = [...series.points]
              .reverse()
              .find((item, reverseIndex) => {
                const position = series.points.length - 1 - reverseIndex;
                return position < index;
              });
            if (previous) onSelect(previous.takeId);
          }}
          disabled={series.points[0]?.takeId === point.takeId}
        >
          ← Vorherige
        </button>
        <button
          type="button"
          className="progress-link"
          onClick={() => {
            const index = series.points.findIndex(
              (item) => item.takeId === point.takeId,
            );
            const next = series.points[index + 1];
            if (next) onSelect(next.takeId);
          }}
          disabled={series.points.at(-1)?.takeId === point.takeId}
        >
          Nächste →
        </button>
      </div>
    </section>
  );
}

function GoalEditor({
  series,
  demo,
  profile,
  busy,
  error,
  onSave,
  onDelete,
}: {
  series: MetricSeries;
  demo: boolean;
  profile: StoredProfile | null;
  busy: boolean;
  error: string | null;
  onSave: (goal: {
    direction: "increase" | "decrease" | "target_band";
    targetValue?: number | null;
    targetMin?: number | null;
    targetMax?: number | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<
    "increase" | "decrease" | "target_band"
  >(
    series.goal?.direction ??
      (series.suggestedDirection === "decrease" ? "decrease" : "increase"),
  );
  const [target, setTarget] = useState(
    series.goal?.targetValue != null ? String(series.goal.targetValue) : "",
  );
  const [min, setMin] = useState(
    series.goal?.targetMin != null ? String(series.goal.targetMin) : "",
  );
  const [max, setMax] = useState(
    series.goal?.targetMax != null ? String(series.goal.targetMax) : "",
  );
  const [confirming, setConfirming] = useState(false);

  const step = series.unit === "ratio" ? 0.01 : series.unit === "WPM" ? 1 : 0.1;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (demo || !profile || busy) return;
    void onSave({
      direction,
      targetValue: direction === "target_band" ? null : Number(target),
      targetMin: direction === "target_band" ? Number(min) : null,
      targetMax: direction === "target_band" ? Number(max) : null,
    });
  }

  return (
    <details className="progress-goal">
      <summary>
        <Target size={16} aria-hidden="true" /> Ziel für diese Metrik
        {series.goal && (
          <span className={`progress-goal-status is-${series.goalStatus}`}>
            {GOAL_STATUS_COPY[series.goalStatus]}
          </span>
        )}
      </summary>
      <div className="progress-goal-body">
        {series.goal ? (
          <p>
            Aktuelles Ziel:{" "}
            <strong>{goalTargetLabel(series.goal, series.unit)}</strong>
            {series.goal.direction === "decrease"
              ? " (soll sinken)"
              : series.goal.direction === "increase"
                ? " (soll steigen)"
                : " (Zielband)"}
            .
          </p>
        ) : (
          <p>
            Ohne Ziel bleibt die Richtung neutral: „gestiegen“ oder „gefallen“,
            nicht „besser“ oder „schlechter“. Ein Ziel ist eine selbst gesetzte
            Übungsrichtung, keine Note.
          </p>
        )}
        {series.suggestedDirection === "neutral" && (
          <p className="progress-fineprint">
            Für diese Metrik gibt es keinen universell guten Wert. Ein Ziel legt
            nur deine eigene Richtung fest.
          </p>
        )}
        {demo ? (
          <p className="progress-inline-info">
            <FlaskConical size={15} aria-hidden="true" /> Im Demo-Modus nicht
            änderbar.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label className="progress-field">
              <span>Richtung</span>
              <select
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as typeof direction)
                }
              >
                <option value="decrease">Wert soll sinken</option>
                <option value="increase">Wert soll steigen</option>
                <option value="target_band">Zielband</option>
              </select>
            </label>
            {direction === "target_band" ? (
              <div className="progress-goal-row">
                <label className="progress-field">
                  <span>Von</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={step}
                    value={min}
                    onChange={(event) => setMin(event.target.value)}
                    required
                  />
                </label>
                <label className="progress-field">
                  <span>Bis</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={step}
                    value={max}
                    onChange={(event) => setMax(event.target.value)}
                    required
                  />
                </label>
              </div>
            ) : (
              <label className="progress-field">
                <span>Zielwert in {unitLabel(series.unit)}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={step}
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  required
                />
              </label>
            )}
            {error && (
              <p className="progress-inline-error" role="alert">
                <TriangleAlert size={15} aria-hidden="true" /> {error}
              </p>
            )}
            <div className="progress-goal-actions">
              <button
                type="submit"
                className="button button-primary button-sm"
                disabled={busy}
              >
                {busy && (
                  <Loader2
                    size={14}
                    className="progress-spin"
                    aria-hidden="true"
                  />
                )}
                Ziel speichern
              </button>
              {series.goal &&
                (confirming ? (
                  <span className="progress-confirm-inline">
                    <button
                      type="button"
                      className="button button-danger button-sm"
                      disabled={busy}
                      onClick={() => void onDelete()}
                    >
                      Wirklich entfernen
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => setConfirming(false)}
                    >
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    disabled={busy}
                    onClick={() => setConfirming(true)}
                  >
                    Ziel entfernen
                  </button>
                ))}
            </div>
          </form>
        )}
      </div>
    </details>
  );
}

function WhyPanel({ series }: { series: MetricSeries }) {
  const trend = series.trend;
  return (
    <details className="progress-why">
      <summary>
        <CircleHelp size={16} aria-hidden="true" /> Warum sichtbar?
      </summary>
      <div className="progress-why-body">
        <p>
          <strong>Startphase:</strong>{" "}
          {series.baseline?.value != null
            ? `Median der ersten ${series.baseline.n} vergleichbaren Aufnahmen (${formatValue(series.baseline.value, series.unit)}).`
            : "Noch keine Baseline aus drei vergleichbaren Aufnahmen."}{" "}
          Nicht der beste oder schlechteste Take.
        </p>
        <p>
          <strong>Übliche Schwankung:</strong>{" "}
          {trend.noiseBand != null
            ? `${formatValue(trend.noiseBand, series.unit)} um die Startphase, robust aus den Abweichungen geschätzt.`
            : "Noch nicht schätzbar."}{" "}
          {trend.minimumDetectableChange != null
            ? `Kleinste darstellbare Einzeländerung: ${formatValue(trend.minimumDetectableChange, series.unit)}.`
            : ""}
        </p>
        <p>
          <strong>Trend:</strong> Theil–Sen-Steigung und Mann–Kendall-Test über{" "}
          {trend.n} vergleichbare Aufnahmen.{" "}
          {trend.status === "insufficient"
            ? "Unter fünf vergleichbaren Aufnahmen wird keine Trendaussage getroffen."
            : `Datenlage: ${CONFIDENCE_COPY[trend.confidence]}.`}
        </p>
        {trend.slopeCi95 && (
          <p>
            <strong>Unsicherheit:</strong> Steigungsintervall{" "}
            {formatValue(trend.slopeCi95[0], series.unit)} bis{" "}
            {formatValue(trend.slopeCi95[1], series.unit)} pro Aufnahme. Ein
            breites Intervall bedeutet mehr Unsicherheit, keine Note.
          </p>
        )}
        <p>
          <strong>Change-Points:</strong> Beobachtete Niveauänderungen, keine
          Ursachen. Sie werden nur bei durchgehenden, vergleichbaren Reihen
          bestimmt.
        </p>
        {trend.mannKendallP != null && (
          <p className="progress-fineprint">
            Diagnose-p (Mann–Kendall): {formatNumber(trend.mannKendallP, 3)}
            {trend.adjustedP != null
              ? `, BH-korrigiert: ${formatNumber(trend.adjustedP, 3)}`
              : ""}
            . Kein Nachweis einer Wirkung.
          </p>
        )}
        {series.limitations.length > 0 && (
          <ul className="progress-limit-list">
            {series.limitations.map((limitation) => (
              <li key={limitation.code}>{limitation.message}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function QualityTable({ series }: { series: MetricSeries }) {
  return (
    <details className="progress-quality-table">
      <summary>
        <Database size={16} aria-hidden="true" /> Alle{" "}
        {series.quality.totalPoints} Aufnahmen als Tabelle
      </summary>
      <div className="progress-table-wrap">
        <table>
          <caption>
            Messwerte und Vergleichbarkeit für {series.label.de}. Die Tabelle
            ist keine Bewertung der Präsentation.
          </caption>
          <thead>
            <tr>
              <th scope="col">Aufnahme</th>
              <th scope="col">Datum</th>
              <th scope="col">Typ</th>
              <th scope="col">Wert</th>
              <th scope="col">Status</th>
              <th scope="col">Grund</th>
              <th scope="col">Zeitquelle</th>
            </tr>
          </thead>
          <tbody>
            {series.points.map((point) => (
              <tr
                key={point.takeId}
                className={point.eligible ? "" : "is-excluded"}
              >
                <td data-label="Aufnahme">#{point.sequence}</td>
                <td data-label="Datum">{formatDate(point.recordedAt)}</td>
                <td data-label="Typ">
                  {modeLabel(point.context.presentationMode)}
                </td>
                <td data-label="Wert">
                  {formatValue(point.value, series.unit)}
                </td>
                <td data-label="Status">
                  <span
                    className={`progress-table-status ${
                      point.eligible ? "is-eligible" : "is-excluded"
                    }`}
                  >
                    {pointStatus(point)}
                  </span>
                </td>
                <td data-label="Grund">
                  {point.exclusionReasons.length
                    ? point.exclusionReasons
                        .map((reason) => exclusionReasonText(reason))
                        .join(" ")
                    : "–"}
                </td>
                <td data-label="Zeitquelle">
                  {point.recordedAtSource === "server"
                    ? "Serverzeit"
                    : "Client-Zeit"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ChangeList({
  response,
  onFocus,
}: {
  response: ProgressResponse;
  onFocus: (metricId: string, takeId?: string | null) => void;
}) {
  const changes = response.series
    .flatMap((series) =>
      series.changePoints.map((change) => ({ series, change })),
    )
    .sort((a, b) => a.change.sequence - b.change.sequence);
  return (
    <section className="progress-changes" aria-labelledby="changes-heading">
      <div className="progress-section-heading">
        <div>
          <h2 id="changes-heading">Beobachtete Veränderungen</h2>
          <p>
            Chronologisch, ohne Kausalität. „Ab Aufnahme 13“ heißt: dort begann
            die beobachtete Niveauänderung.
          </p>
        </div>
        <span className="progress-chip is-neutral">
          <Info size={14} aria-hidden="true" /> keine Ursachenaussage
        </span>
      </div>
      {changes.length ? (
        <ol className="progress-change-list">
          {changes.map(({ series, change }) => (
            <li key={`${series.metricId}-${change.id}`}>
              <span className="progress-change-sequence">
                #{change.sequence}
              </span>
              <span className="progress-change-copy">
                <strong>{changeSentence(change, series)}</strong>
                <small>
                  {series.label.de} · {CHANGE_CONFIDENCE[change.confidence]} ·{" "}
                  {formatDate(change.recordedAt)}
                </small>
              </span>
              <button
                type="button"
                className="progress-link"
                onClick={() => onFocus(series.metricId, change.takeId)}
              >
                Ansehen <ArrowRight size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="progress-empty-line">
          Keine belastbare Niveauänderung beobachtet. Ein einzelner Ausreißer
          wird nicht als Veränderung gewertet.
        </p>
      )}
    </section>
  );
}

const CHANGE_CONFIDENCE: Record<Confidence, string> = {
  high: "hohe Datenlage",
  medium: "mittlere Datenlage",
  low: "niedrige Datenlage",
};

function DataQuality({
  response,
  demo,
}: {
  response: ProgressResponse;
  demo: boolean;
}) {
  const excluded = new Set(
    response.series.flatMap((series) =>
      series.points
        .filter((point) => !point.eligible)
        .map((point) => point.takeId),
    ),
  );
  return (
    <section className="progress-quality" aria-labelledby="quality-heading">
      <div className="progress-section-heading">
        <div>
          <h2 id="quality-heading">Datenqualität und Grenzen</h2>
          <p>
            {excluded.size} von {response.profile.totalTakes} Aufnahmen sind für
            mindestens eine Metrik nicht vergleichbar. Das ist keine Aussage
            über die Qualität der Präsentation.
          </p>
        </div>
        <span className="progress-chip is-neutral">
          <ShieldCheck size={14} aria-hidden="true" /> Heuristiken, unvalidiert
        </span>
      </div>
      <div className="progress-quality-grid">
        <div className="progress-quality-card">
          <h3>Warum fehlen Punkte?</h3>
          <ul>
            <li>
              <strong>Zu wenig Kameraabdeckung:</strong> Pose-Werte werden nicht
              geschätzt, wenn der Oberkörper nicht sichtbar war.
            </li>
            <li>
              <strong>Zu wenig Sprache oder Wörter:</strong> Tempo, Füllwörter
              und Inhalt brauchen ausreichend Material.
            </li>
            <li>
              <strong>Zu kurze Aufnahme:</strong> Unter der Metrik-Mindestdauer
              bleibt der Punkt sichtbar, zählt aber nicht in den Trend.
            </li>
            <li>
              <strong>Gerätewechsel:</strong> Lautstärkevergleiche brauchen
              dasselbe Gerät; andere Werte werden nicht gemischt.
            </li>
          </ul>
        </div>
        <div className="progress-quality-card">
          <h3>Was diese Ansicht nicht behauptet</h3>
          <ul>
            <li>Kein Gesamtscore, keine Note und kein Ranking.</li>
            <li>Kein Vergleich mit anderen Personen oder einer Population.</li>
            <li>Keine Emotions-, Persönlichkeits- oder Eignungsdiagnostik.</li>
            <li>
              Keine Kausalität: Change-Points beschreiben beobachtete
              Veränderungen, nicht ihre Ursachen.
            </li>
            {demo && (
              <li>
                Keine echten Messungen: Die Demo besteht aus 24 erfundenen
                Aufnahmen.
              </li>
            )}
          </ul>
        </div>
        {response.series.some((series) => series.limitations.length > 0) && (
          <div className="progress-quality-card is-wide">
            <h3>Metrikspezifische Hinweise</h3>
            <ul>
              {response.series.flatMap((series) =>
                series.limitations.map((limitation) => (
                  <li key={`${series.metricId}-${limitation.code}`}>
                    <strong>{series.label.de}:</strong> {limitation.message}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
      </div>
      <details className="progress-limitations">
        <summary>
          <Info size={16} aria-hidden="true" /> Allgemeine Grenzen dieser
          Auswertung
        </summary>
        <ul>
          {response.limitations.map((limitation) => (
            <li key={limitation.code}>{limitation.message}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function EmptyProgress({ demo }: { demo: boolean }) {
  return (
    <section className="progress-empty" aria-labelledby="empty-heading">
      <span className="progress-empty-icon" aria-hidden="true">
        <LineChart size={28} />
      </span>
      <h2 id="empty-heading">Noch keine Aufnahmen in diesem Profil.</h2>
      <p>
        Sobald Aufnahmen mit einem Profilbezug gespeichert sind, erscheinen hier
        Rohpunkte, Qualitätsmarker und Trends. Fehlende Aufnahmen werden nicht
        erfunden.
      </p>
      <p className="progress-fineprint">
        Im Prototyp ist die Live-Aufnahme noch nicht mit dem Fortschrittsprofil
        verknüpft. Die Demo zeigt die vollständige Auswertung mit synthetischen
        Daten.
      </p>
      <div className="progress-empty-actions">
        {!demo && (
          <Link href="/progress/demo" className="button button-primary">
            <FlaskConical size={16} aria-hidden="true" /> Demo ansehen
          </Link>
        )}
        <Link href="/live" className="button button-outline">
          <Video size={16} aria-hidden="true" /> Live-Studio
        </Link>
      </div>
    </section>
  );
}

function ProfileError({
  error,
  onRetry,
  onReset,
  demo,
}: {
  error: LoadError;
  onRetry: () => void;
  onReset: () => void;
  demo: boolean;
}) {
  const unavailable =
    error.status === 401 || error.status === 404 || error.status === 410;
  const title =
    error.status === 401
      ? "Dieses Profil ist nicht mehr erreichbar."
      : error.status === 404
        ? "Dieses Profil wurde gelöscht."
        : error.status === 410
          ? "Der Profilzugriff ist abgelaufen."
          : "Fortschritt gerade nicht verfügbar.";
  return (
    <section className="progress-error" role="alert">
      <span className="progress-empty-icon" aria-hidden="true">
        <TriangleAlert size={28} />
      </span>
      <h1>{title}</h1>
      <p>
        {error.status === 401
          ? "Der gespeicherte Token passt nicht mehr zu diesem Profil. Die serverseitigen Fortschrittsdaten sind ohne gültigen Token nicht erreichbar. Du kannst das Profil in diesem Browser zurücksetzen und ein neues anlegen."
          : error.status === 404
            ? "Die Daten sind auf dem Server nicht mehr vorhanden. Lege bei Bedarf ein neues Profil an."
            : error.status === 410
              ? "Der Profilzugriff ist abgelaufen. Die Daten werden nicht mehr ausgeliefert, aber noch nicht automatisch gelöscht. Automatische Löschung steht noch aus."
              : error.message}
      </p>
      <div className="progress-empty-actions">
        {!unavailable && (
          <button
            type="button"
            className="button button-primary"
            onClick={onRetry}
          >
            <RefreshCw size={16} aria-hidden="true" /> Erneut versuchen
          </button>
        )}
        <button
          type="button"
          className="button button-outline"
          onClick={onReset}
        >
          <Trash2 size={16} aria-hidden="true" /> Profil zurücksetzen
        </button>
        {!demo && (
          <Link href="/progress/demo" className="button button-outline">
            <FlaskConical size={16} aria-hidden="true" /> Demo ansehen
          </Link>
        )}
      </div>
      <p className="progress-fineprint">
        Beim Zurücksetzen wird nur der lokale Token entfernt. Eine Löschung der
        serverseitigen Daten ist ohne Token nicht möglich.
      </p>
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="progress-loading" role="status" aria-live="polite">
      <Loader2 size={22} className="progress-spin" aria-hidden="true" />
      <span>{label} …</span>
    </div>
  );
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} min`;
}

function unitLabel(unit: MetricUnit) {
  switch (unit) {
    case "ratio":
      return "Prozent (0,12 = 12 %)";
    case "per100w":
      return "pro 100 Wörter";
    case "perMin":
      return "pro Minute";
    case "WPM":
      return "WPM";
    case "st":
      return "Halbtönen";
    case "deg":
      return "Grad";
    default:
      return unit;
  }
}

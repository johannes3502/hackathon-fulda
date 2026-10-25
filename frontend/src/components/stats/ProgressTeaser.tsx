"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LineChart } from "lucide-react";
import {
  isAbortError,
  loadProgress,
} from "@/features/progress/api";
import { Sparkline } from "@/features/progress/charts";
import type { ProgressResponse } from "@/features/progress/contract";
import { formatValue } from "@/features/progress/format";
import {
  useMounted,
  useStoredProfile,
} from "@/features/progress/profile-store";
import "@/features/progress/progress.css";
import "./progress-teaser.css";

function selectSeries(response: ProgressResponse) {
  return (
    response.series.find((item) => item.metricId === "speech.pace_wpm") ??
    response.series.find((item) => item.quality.eligiblePoints > 0) ??
    response.series[0] ??
    null
  );
}

export function ProgressTeaser() {
  const mounted = useMounted();
  const profile = useStoredProfile();
  const [result, setResult] = useState<{
    profileId: string;
    response: ProgressResponse | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    loadProgress(
      profile,
      { window: "all", presentationMode: "all", includeExcluded: true },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({
            profileId: profile.profileId,
            response: data,
            error: false,
          });
        }
      })
      .catch((caught) => {
        if (!isAbortError(caught) && !controller.signal.aborted) {
          setResult({
            profileId: profile.profileId,
            response: null,
            error: true,
          });
        }
      });
    return () => controller.abort();
  }, [profile]);

  const current =
    profile && result?.profileId === profile.profileId ? result : null;
  const response = current?.response ?? null;
  const loading = Boolean(profile) && current === null;
  const error = current?.error ?? false;
  const series = response ? selectSeries(response) : null;
  const goals = response
    ? response.series.filter((item) => item.goal != null).length
    : 0;
  const latestValue = series?.latest?.value ?? null;

  return (
    <section
      className="progress-teaser"
      aria-labelledby="progress-teaser-title"
      aria-busy={loading || !mounted}
    >
      <div className="progress-teaser-heading">
        <span className="stats418-section-eyebrow">
          <LineChart size={16} aria-hidden="true" /> Langzeit-Fortschritt
        </span>
        <h2 id="progress-teaser-title">Fortschritt über Aufnahmen hinweg.</h2>
        <p>
          Mehrere Takes werden nur dort verglichen, wo die Messung wirklich
          vergleichbar ist. Rohpunkte, Lücken und Ziele bleiben sichtbar.
        </p>
      </div>

      {!mounted ? (
        <div className="progress-teaser-body is-placeholder" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : !profile ? (
        <div className="progress-teaser-body is-empty">
          <p>
            Richte ein pseudonymes Profil ein, um Messungen aus mehreren
            Aufnahmen zu vergleichen. Ohne Profil wird nichts gespeichert.
          </p>
          <Link href="/progress" className="button button-outline">
            Profil einrichten <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : loading && !response ? (
        <div className="progress-teaser-body is-placeholder" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : error || !response ? (
        <div className="progress-teaser-body is-empty" role="status">
          <p>
            Die Fortschrittsdaten sind gerade nicht erreichbar. Es werden keine
            Ersatzzahlen angezeigt.
          </p>
          <Link href="/progress" className="button button-outline">
            Fortschritt öffnen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <dl className="progress-teaser-kpis">
            <div>
              <dt>Aufnahmen</dt>
              <dd>{response.profile.totalTakes}</dd>
            </div>
            <div>
              <dt>Vergleichbar</dt>
              <dd>{response.profile.eligibleTakes}</dd>
            </div>
            <div>
              <dt>Ziele</dt>
              <dd>{goals}</dd>
            </div>
          </dl>
          <div className="progress-teaser-trend">
            <div className="progress-teaser-trend-copy">
              <span>{series?.label.de ?? "Messreihe"}</span>
              <strong>{formatValue(latestValue, series?.unit ?? "ratio")}</strong>
              <small>
                {series
                  ? `${series.quality.eligiblePoints} von ${series.quality.totalPoints} Aufnahmen vergleichbar`
                  : "Noch keine Messreihe"}
              </small>
            </div>
            {series && (
              <div className="progress-teaser-sparkline" aria-hidden="true">
                <Sparkline series={series} />
              </div>
            )}
          </div>
          <div className="progress-teaser-foot">
            <span>Nur gemessene Takes. Kein Gesamtscore.</span>
            <Link href="/progress" className="button button-outline">
              Fortschritt ansehen <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

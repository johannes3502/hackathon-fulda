"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  LineChart,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { time } from "@/lib/utils";
import { summarizeRecordings } from "./stats";
import { PresentationIntro } from "./PresentationIntro";
import { SessionStorageNotice } from "../live/shared";
import "./stats-card.css";

export function StatsDashboard() {
  const { recordings } = useLiveSessions();
  const takes = Object.values(recordings).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const summary = summarizeRecordings(takes);
  const latest = takes[0];

  return (
    <AppShell experience="live">
      <div className="stats418-dashboard" lang="de">
        <PresentationIntro />
        <section className="stats418-hero" aria-label="Deine Aufnahmen">
          <div className="stats418-hero-info">
            <span className="stats418-section-eyebrow">
              <BarChart3 size={16} /> Dein Lernbereich
            </span>
            <h2>Deine Aufnahmen im Überblick.</h2>
            <p>
              Nimm deine Präsentation auf und schau dir konkrete Hinweise mit
              Zeitmarken an. Lade Quellen hoch, um Aussagen zu vergleichen und
              Rückfragen vorzubereiten.
            </p>
            <div className="stats418-hero-actions">
              <Link href="/live" className="button button-primary">
                <Video size={17} /> Live-Aufnahme starten
              </Link>
              <Link href="/sources" className="button button-outline">
                <FileText size={16} /> Quellen
              </Link>
              <Link href="/progress" className="button button-outline">
                <LineChart size={16} /> Fortschritt
              </Link>
            </div>
            <p className="stats418-retention">
              Deine Aufnahmen bleiben in diesem Browser gespeichert, auch nach
              dem Neuladen. Browserdaten löschen entfernt auch deine Aufnahmen.
            </p>
          </div>
          <article className="stats418-card" aria-label="Aufnahmeübersicht">
            <span className="stats418-section-eyebrow">
              {latest ? "Letzte Aufnahme" : "Bereit für dein erstes Referat"}
            </span>
            <h2>{latest?.config.title ?? "Noch keine Aufnahmen"}</h2>
            <p>
              {latest
                ? `${time(latest.durationMs)} · ${latest.feedback.length} Hinweise`
                : "Starte eine Aufnahme, um hier deine Dauer und Hinweise zu sehen."}
            </p>
            {latest && (
              <Link
                href={`/live/${latest.id}/review`}
                className="button button-outline"
              >
                Aufnahme ansehen <ArrowRight size={16} />
              </Link>
            )}
          </article>
        </section>

        <dl className="stats418-kpi-grid" aria-label="Aufgenommene Takes">
          <div className="stats418-kpi">
            <dt>Aufnahmen</dt>
            <dd>{summary.sessions}</dd>
          </div>
          <div className="stats418-kpi">
            <dt>Aufnahmezeit</dt>
            <dd>{time(summary.durationMs)}</dd>
          </div>
          <div className="stats418-kpi">
            <dt>Hinweise</dt>
            <dd>{summary.moments}</dd>
          </div>
          <div className="stats418-kpi">
            <dt>Mit Transkript</dt>
            <dd>{summary.transcripts}</dd>
          </div>
        </dl>

        <section
          id="past-recordings"
          className="stats418-recordings"
          aria-labelledby="recordings-heading"
          tabIndex={-1}
        >
          <h2 id="recordings-heading">Deine Übungsaufnahmen</h2>
          <SessionStorageNotice />
          <p>Hinweise sind Beobachtungen zum Nachschauen, keine Bewertung.</p>
          {takes.length ? (
            <ul className="stats418-take-list">
              {takes.map((take) => (
                <li key={take.id}>
                  <Link href={`/live/${take.id}/review`}>
                    <span>
                      <strong>{take.config.title}</strong>
                      <small>
                        {time(take.durationMs)} · {take.feedback.length}{" "}
                        Hinweise
                        {take.completion === "interrupted"
                          ? " · Verarbeitung unterbrochen"
                          : ""}
                      </small>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="stats418-empty" role="status">
              Hier erscheinen deine aufgenommenen Referate und Abschlusspräsentationen.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

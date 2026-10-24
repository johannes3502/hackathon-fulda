"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import "@fontsource/noto-serif-display/latin-400.css";
import { StatsRing } from "./StatsRing";
import {
  DEMO_STATS,
  STAT_LABELS,
  summarizeStats,
  type PresentationStats,
} from "./stats";
import "./stats-card.css";

export function StatsCard({
  stats,
  demo = false,
}: {
  stats: PresentationStats;
  demo?: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(1);
  const overall = summarizeStats(stats);
  const signature = JSON.stringify(stats);

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const fraction = Math.min((now - start) / 1500, 1);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        setProgress(1);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          if (!motion.matches) frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    motion.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", stop);
    };
  }, [signature]);

  return (
    <article
      className="stats418-card"
      ref={card}
      lang="de"
      aria-label={
        demo ? "Deine Stats – Demo mit synthetischen Werten" : "Deine Stats"
      }
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--tilt-x",
          `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 5}deg`,
        );
        event.currentTarget.style.setProperty(
          "--tilt-y",
          `${((event.clientX - bounds.left) / bounds.width - 0.5) * 5}deg`,
        );
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--tilt-x", "0deg");
        event.currentTarget.style.setProperty("--tilt-y", "0deg");
      }}
    >
      <div
        className="stats418-overall"
        role="img"
        aria-label={
          overall === null
            ? "Gesamtwertung nicht verfügbar"
            : `Gesamtwertung ${overall} Prozent, gleich gewichteter Durchschnitt`
        }
      >
        <StatsRing value={overall === null ? 0 : overall * progress} />
        <div className="stats418-overall-text" aria-hidden="true">
          <span className="stats418-eyebrow">Gesamt</span>
          <span className="stats418-total">
            {overall === null ? "–" : Math.round(overall * progress)}
            <span>%</span>
          </span>
          <span className="stats418-ring-caption">von 100</span>
        </div>
      </div>
      <div className="stats418-heading">
        <span className="stats418-brand" aria-hidden="true">
          418
        </span>
        <h2>Dein Auftritt.</h2>
        <p>Vier Stärken. Ein Gesamtbild.</p>
      </div>
      <dl className="stats418-grid">
        {Object.entries(STAT_LABELS).map(([key, label], index) => {
          const value = stats[key as keyof PresentationStats];
          const valid = Number.isFinite(value) && value >= 1 && value <= 100;
          const animated = valid ? Math.round(value * progress) : null;
          return (
            <div className="stats418-stat" key={key}>
              <dt>
                <span aria-hidden="true">0{index + 1}</span>
                {label}
              </dt>
              <dd aria-label={valid ? `${value} Prozent` : "Nicht verfügbar"}>
                <span aria-hidden="true">
                  {animated ?? "–"}
                  <small>%</small>
                </span>
              </dd>
              <div className="stats418-bar" aria-hidden="true">
                <span
                  style={
                    {
                      "--fill": valid ? (value * progress) / 100 : 0,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}
      </dl>
      <footer className="stats418-footnote">
        <p>Gesamt = Durchschnitt der vier Kriterien.</p>
        {demo && (
          <span className="stats418-demo">
            <i aria-hidden="true" />
            Demo · synthetische Werte
          </span>
        )}
      </footer>
    </article>
  );
}

export function DemoStatsCard() {
  return <StatsCard stats={DEMO_STATS} demo />;
}

export function StatsPreview() {
  const [replay, setReplay] = useState(0);
  return (
    <main className="stats418-preview" lang="de">
      <header className="stats418-preview-header">
        <Link href="/" aria-label="418 – zur Startseite">
          418
          <span />
        </Link>
        <span>Deine Stats</span>
      </header>
      <div className="stats418-preview-center">
        <DemoStatsCard key={replay} />
        <button
          type="button"
          className="stats418-replay"
          onClick={() => setReplay((value) => value + 1)}
        >
          <span aria-hidden="true">↻</span> Animation wiederholen
        </button>
      </div>
    </main>
  );
}

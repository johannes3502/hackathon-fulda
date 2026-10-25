"use client";

import { useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import "./film-showcase.css";

type ShowcaseFilm = {
  src: string;
  poster: string;
  captions: string;
  title: string;
  copy: string;
  duration: string;
  ariaLabel: string;
};

const FILMS: ShowcaseFilm[] = [
  {
    src: "/landing/progress-film.mp4",
    poster: "/landing/progress-film-poster.webp",
    captions: "/landing/progress-film.de.vtt",
    title: "Fortschritt über Proben hinweg",
    copy:
      "Vergleichbarkeit zuerst, dann jede Metrik auf ihrer eigenen Skala. Der Verlauf zeigt Start, aktuell und Veränderung.",
    duration: "0:44",
    ariaLabel: "Film: Fortschritt über Proben hinweg",
  },
  {
    src: "/landing/review-film.mp4",
    poster: "/landing/review-film-poster.webp",
    captions: "/landing/review-film.de.vtt",
    title: "Zurück zum Moment – mit Quelle",
    copy:
      "Vom Quellencheck per Klick zurück in die lokale Aufnahme. Zitat, Quelle und der nächste Schritt bleiben zusammen.",
    duration: "0:38",
    ariaLabel: "Film: Zurück zum Moment mit Quelle",
  },
];

function ShowcaseCard({ film }: { film: ShowcaseFilm }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = useState(false);

  function startPlayback() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    video.preload = "auto";
    void video.play().catch(() => {
      /* controls stay visible if playback is blocked */
    });
    video.focus({ preventScroll: true });
  }

  return (
    <article className="film-showcase-card">
      <div className="film-showcase-frame">
        <video
          ref={videoRef}
          className="film-showcase-video"
          controls={started}
          playsInline
          preload="none"
          poster={film.poster}
          aria-label={film.ariaLabel}
          tabIndex={0}
          onPlay={() => setStarted(true)}
        >
          <source src={film.src} type="video/mp4" />
          <track
            kind="captions"
            src={film.captions}
            srcLang="de"
            label="Deutsch"
          />
          Dein Browser kann dieses Video nicht abspielen.{" "}
          <a href={film.src}>Film als MP4 öffnen</a>.
        </video>
        {!started && (
          <button
            type="button"
            className="film-showcase-play"
            onClick={startPlayback}
            aria-label={`${film.title} ansehen, ${film.duration}, mit Untertiteln`}
          >
            <span className="film-showcase-play-icon" aria-hidden="true">
              <Play size={24} fill="currentColor" />
            </span>
            <span className="film-showcase-play-hint">
              Ansehen · {film.duration}
            </span>
          </button>
        )}
      </div>
      <div className="film-showcase-copy">
        <div className="film-showcase-title-row">
          <h3>{film.title}</h3>
          <span className="film-showcase-duration">{film.duration}</span>
        </div>
        <p>{film.copy}</p>
      </div>
    </article>
  );
}

export function FilmShowcase() {
  return (
    <section
      id="filme"
      className="film-showcase"
      aria-labelledby="film-showcase-title"
    >
      <header className="film-showcase-head">
        <span className="stats418-section-eyebrow">
          <Film size={16} aria-hidden="true" /> Zwei Filme aus dem Prototyp
        </span>
        <h2 id="film-showcase-title">In 80 Sekunden durch den Ablauf.</h2>
        <p>
          Fortschritt über mehrere Proben und der Weg vom Quellencheck zurück in
          die Aufnahme. Mit Ton und deutschen Untertiteln.
        </p>
      </header>

      <div className="film-showcase-grid">
        {FILMS.map((film) => (
          <ShowcaseCard key={film.src} film={film} />
        ))}
      </div>

      <p className="film-showcase-note">
        Screencasts mit Demo-Daten. Keine Note, keine Genauigkeitszusage.
      </p>
    </section>
  );
}

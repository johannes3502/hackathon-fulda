"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Play, Video } from "lucide-react";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";

export function PresentationIntro() {
  const { recordings } = useLiveSessions();
  const latest = Object.values(recordings).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  return (
    <section
      className="presentation-intro"
      aria-labelledby="presentation-intro-title"
    >
      <div className="presentation-intro-copy">
        <span className="stats418-section-eyebrow">
          <span className="status-dot" /> Für Schule und Studium
        </span>
        <h1 id="presentation-intro-title">
          Verstehen. Erklären.
          <br />
          <span>Sicher präsentieren.</span>
        </h1>
        <p>
          Übe dein Referat oder deine Abschlusspräsentation. Erkläre dein Thema,
          prüfe Aussagen an deinen Lernmaterialien und bereite dich auf
          Rückfragen vor.
        </p>
        <div className="presentation-intro-actions">
          <Link href="/sources" className="button button-primary">
            <Video size={18} /> Referat üben <ArrowRight size={17} />
          </Link>
          <Link href="/sources" className="button button-outline">
            <FileText size={17} /> Lernmaterial hinzufügen
          </Link>
        </div>
        <div className="presentation-intro-footnote">
          <span>In deinem Tempo. Ohne Login.</span>
          {latest ? (
            <Link href={`/live/${latest.id}/review`}>
              Letzte Aufnahme ansehen <ArrowRight size={14} />
            </Link>
          ) : (
            <Link href="/demo">
              <Play size={14} /> Erst die Demo entdecken
            </Link>
          )}
        </div>
      </div>
      <ol
        className="presentation-steps"
        aria-label="So funktioniert dein Training"
      >
        <li>
          <span className="presentation-step-icon">
            <FileText size={21} />
          </span>
          <div>
            <small>01 · Vorbereiten</small>
            <strong>Beginne mit deinem Lernstoff.</strong>
            <p>
              Folien, Fachtexte und Notizen als Grundlage für den Quellencheck
              und fachliche Rückfragen hinzufügen.
            </p>
          </div>
        </li>
        <li>
          <span className="presentation-step-icon">
            <Video size={21} />
          </span>
          <div>
            <small>02 · Präsentieren</small>
            <strong>Erkläre es in eigenen Worten.</strong>
            <p>
              Übe deinen Vortrag mit Kamera und Mikrofon. Hinweise zu Haltung
              und Sprache helfen dir beim nächsten Durchlauf.
            </p>
          </div>
        </li>
        <li>
          <span className="presentation-step-icon">
            <MessageSquare size={21} />
          </span>
          <div>
            <small>03 · Reflektieren</small>
            <strong>Vertiefe dein Verständnis.</strong>
            <p>
              Sieh dir konkrete Stellen noch einmal an und übe, fachliche
              Rückfragen zu beantworten.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}

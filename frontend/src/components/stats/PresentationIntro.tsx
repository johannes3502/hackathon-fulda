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
          <span className="status-dot" /> Dein nächster Auftritt beginnt hier
        </span>
        <h1 id="presentation-intro-title">
          Deine Idee verdient
          <br />
          <span>einen starken Auftritt.</span>
        </h1>
        <p>
          Bereite deine Inhalte vor, übe deine Präsentation und entdecke im
          Review die Momente, an denen du weiterarbeiten möchtest.
        </p>
        <div className="presentation-intro-actions">
          <Link href="/sources" className="button button-primary">
            <Video size={18} /> Neue Präsentation <ArrowRight size={17} />
          </Link>
          <Link href="/sources" className="button button-outline">
            <FileText size={17} /> Quellen vorbereiten
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
            <strong>Gib deinen Ideen eine Grundlage.</strong>
            <p>
              Folien und Notizen als Quellen für Fakten und Rückfragen
              hinzufügen.
            </p>
          </div>
        </li>
        <li>
          <span className="presentation-step-icon">
            <Video size={21} />
          </span>
          <div>
            <small>02 · Präsentieren</small>
            <strong>Mach einen Probedurchlauf.</strong>
            <p>
              Kamera aktivieren und mit Hinweisen zu Haltung und Sprache üben.
            </p>
          </div>
        </li>
        <li>
          <span className="presentation-step-icon">
            <MessageSquare size={21} />
          </span>
          <div>
            <small>03 · Reflektieren</small>
            <strong>Nimm einen nächsten Schritt mit.</strong>
            <p>
              Konkrete Stellen wieder ansehen und passende Rückfragen
              beantworten.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}

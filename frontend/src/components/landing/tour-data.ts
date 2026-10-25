export type TourChapter = {
  key: string;
  anchor: string;
  number: string;
  short: string;
  title: string;
  copy: string;
  bullets: string[];
  media:
    | { kind: "image"; src: string; alt: string; width: number; height: number }
    | {
        kind: "video";
        src: string;
        poster: string;
        alt: string;
        caption: string;
      };
};

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    key: "live",
    anchor: "feature-live",
    number: "01",
    short: "Live-Feedback",
    title: "Live-Feedback, das den Blick frei lässt.",
    copy:
      "Während des Sprechens bleiben Kamera und Zeit im Blick. Haltung, Gestik und Stimme erzeugen höchstens einen ruhigen Hinweis – keinen Score.",
    bullets: [
      "Pose und Gestik werden lokal im Browser ausgewertet.",
      "Stimme: Tempo, Pausen und Lautstärke als Heuristik.",
      "Höchstens ein Hinweis gleichzeitig, jederzeit abschaltbar.",
    ],
    media: {
      kind: "image",
      src: "/landing/live-review.webp",
      alt: "Live-Ansicht mit Pose-Skelett, Zeitverlauf und ruhigem Hinweis",
      width: 1600,
      height: 1000,
    },
  },
  {
    key: "review",
    anchor: "feature-review",
    number: "02",
    short: "Review",
    title: "Der Moment, auf den es ankommt.",
    copy:
      "Ein Klick auf die Zeitachse springt zur Stelle im lokalen Video. Links der Verlauf, rechts die Beobachtung, darüber drei Prototyp-Scores mit sichtbarer Evidenz.",
    bullets: [
      "Zeitmarken statt langer Suche im Video.",
      "Gestik, Fachwissen und Flow mit Datenabdeckung.",
      "Formel und fehlende Daten bleiben sichtbar.",
    ],
    media: {
      kind: "video",
      src: "/landing/review-timeline.mp4",
      poster: "/landing/review-timeline-poster.webp",
      alt: "Bildschirmaufnahme: Klick auf die Zeitachse springt zur Videostelle",
      caption: "12 Sekunden · stumm · Bildschirmaufnahme der Review-Ansicht",
    },
  },
  {
    key: "factcheck",
    anchor: "feature-factcheck",
    number: "03",
    short: "Quellencheck",
    title: "Aussagen gegen deine Quellen prüfen.",
    copy:
      "Quellen hochladen, Aussagen vergleichen und das geprüfte Zitat mit Seite oder Folie sehen. „Nicht gefunden“ heißt nicht falsch. Der Frage-Simulator knüpft danach an Widersprüche und Lücken an.",
    bullets: [
      "RAG über PDF, PPTX, DOCX, TXT und Markdown.",
      "Zitatprüfung im Code statt reiner Modellbehauptung.",
      "Eine Rückfrage pro Schritt – ohne Note.",
    ],
    media: {
      kind: "image",
      src: "/landing/factcheck-quote.webp",
      alt: "Quellencheck mit Urteil, geprüftem Zitat und Folienangabe",
      width: 1600,
      height: 1000,
    },
  },
  {
    key: "progress",
    anchor: "feature-progress",
    number: "04",
    short: "Fortschritt",
    title: "Fortschritt, der aus mehreren Takes entsteht.",
    copy:
      "Nur vergleichbare Messungen zählen. Ziele, Rohpunkte und Lücken bleiben sichtbar – ohne Gesamtscore.",
    bullets: [
      "24 Takes in der Messreihe, 20 vergleichbar.",
      "Nicht vergleichbare Takes bleiben markiert.",
      "Ziele pro Kennzahl, transparent statt Benotung.",
    ],
    media: {
      kind: "image",
      src: "/landing/progress-series.webp",
      alt: "Fortschrittsansicht mit Messreihen, Zielen und markierten Lücken",
      width: 1600,
      height: 1000,
    },
  },
];

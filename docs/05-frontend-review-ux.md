# Frontend & UI/UX — Review, Videojump und lokale Speicherung

Status: Historischer Entwurf (24.10.2026), bewusst offen. Die Leitplanke
„keine Scores“ wurde am 24.10. auf ausdrücklichen Nutzerwunsch für
evidenzbasierte Prototyp-Scores gelockert; verbindlich sind
`docs/01-product.md`, `docs/07-review-and-agent.md` und `AGENTS.md`.
Bezug: `docs/03-architecture.md`, `docs/04-pose-tracking-requirements.md`, `AGENTS.md`.
Leitplanken: keine Noten oder Personenbewertung, keine Emotions- oder
Persönlichkeitsaussagen, Heuristiken als „Heuristik, unvalidiert“ kennzeichnen,
Video bleibt lokal. Scores nur als transparente Aggregation erfasster Evidenz.

## 1. Leitidee

Die Review ist kein Reportcard, sondern ein **Evidenz-Browser mit Coaching-Ebene**:

- Ein Klick auf ein Finding springt zum stärksten Moment im lokalen Video.
- Jede Aussage hat einen sichtbaren Beleg: Zeitfenster, Event-Anzahl, Regel/Metrik, Confidence, Datenqualität.
- Der Text ist knapp: Kurzfassung, maximal drei Fokus-Karten, konkrete Stärken, klare Grenzen.
- „Nicht auswertbar“ ist ein eigener, sichtbarer Zustand – kein leeres Feld und kein implizites „alles gut“.
- Das Video wird **nicht** an den Server hochgeladen und dort gespeichert. Der Server liefert nur Timestamps, Events und Review-Text.

## 2. Was das Backend grundlegend sendet

Das Backend ist die Quelle für Analyse-Events und den Review-Text. Es liefert **keine Video-URLs, keine Clip-Dateien und keine Snapshot-URLs**. Das Frontend besitzt das Video lokal und nutzt `peak_ms`, um dorthin zu springen.

### 2.1 Kernobjekte

```ts
type Session = {
  sessionId: string;
  title: string;
  createdAt: string;
  collectionId?: string | null;
  status: "created" | "recording" | "uploaded" | "analyzing" | "review_ready" | "failed";
};

type Take = {
  takeId: string;
  sessionId: string;
  durationMs: number;
  mimeType: string;
  timebase: {
    onstartPerfMs: number;
    firstVideoPtsMs: number;
    audioStartMs: number;
    avOffsetMs: number;
    containerDurationMs: number;
    wallDurationMs: number;
  };
  status: "created" | "audio_processing" | "events_ready" | "review_ready" | "failed";
};

type AnalysisEvent = {
  eventId: string;
  takeId: string;
  tMs: number;          // Beginn der Bedingung
  peakMs: number;       // Sprungziel
  durationMs: number;
  type:
    | "posture" | "head" | "hands" | "framing" | "data-quality"
    | "gesture" | "filler" | "pause" | "pace" | "volume" | "pitch"
    | "fact" | "question";
  severity: "info" | "hint" | "warning";
  source: "browser" | "asr" | "speech" | "factcheck" | "agent";
  stage: "live" | "final";
  payload: Record<string, unknown>;
};

type TimelineResponse = {
  session: Session;
  take: Take;
  events: AnalysisEvent[];
  aggregates: Array<{
    id: string;
    label: string;
    value: number;
    unit: string;
    context?: string;
  }>;
  coverage: {
    durationMs: number;
    evaluableMs: number;
    notEvaluableMs: number;
    eventsTotal?: number;
    eventsSelected?: number;
    eventsMentioned?: number;
    reasons: Record<string, number>;
  };
};

type ReviewReport = {
  reviewId: string;
  takeId: string;
  language: "de";
  generator: { mode: "template" | "llm"; model?: string; promptVersion?: string };
  summary: { text: string; byCategory: Record<string, number> };
  findings: ReviewFinding[];
  strengths: ReviewStrength[];
  limitations: string[];
  coverage: TimelineResponse["coverage"];
};

type ReviewFinding = {
  id: string;
  category: "posture" | "head" | "hands" | "voice" | "content" | "framing";
  title: string;
  observation: string;
  evidence: {
    eventIds: string[];
    startMs: number;
    peakMs: number;
    endMs: number;
    ruleId?: string;
    metric?: string;
    value?: number;
    baseline?: number | null;
    delta?: number | null;
    unit?: string;
    validRatio?: number;
    confidence: "high" | "medium" | "low";
    evidenceGrade: "A" | "B" | "C" | "none";
    thresholdsStatus: "heuristic-unvalidated";
  };
  interpretation?: string | null; // ausdrücklich Hypothese
  nextAction?: { suggestionId: string; text: string } | null;
};
```

### 2.2 Grundlegende Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| `POST` | `/api/sessions` | Session anlegen |
| `POST` | `/api/sessions/{id}/takes` | Take mit Dauer/Timebase anlegen |
| `POST` | `/api/takes/{id}/audio` | Audio/Aufnahme temporär für ASR/Sprechanalyse hochladen |
| `POST` | `/api/takes/{id}/events` | Lokale Pose-Events als Timestamp-Daten senden |
| `POST` | `/api/takes/{id}/review` | Review erzeugen (deterministisch oder LLM) |
| `GET` | `/api/takes/{id}/timeline` | Events + Aggregates + Coverage |
| `GET` | `/api/takes/{id}/review` | ReviewReport |
| `GET` | `/api/jobs/{jobId}` | Job-Status |
| `DELETE` | `/api/sessions/{id}` | Session und Timestamp-Daten löschen |

Das Frontend sollte so tun, als wäre das Backend optional: Wenn es nicht erreichbar ist, bleiben lokale Pose-Review und Videojump trotzdem funktionsfähig.

## 3. Lokale Speicherung

### 3.1 „localStorage“ richtig interpretieren

Für Video-Blobs ist `localStorage` der falsche Ort:

- `localStorage` speichert nur Strings und ist typischerweise auf ca. 5 MB begrenzt.
- Ein kurzes Video ist schnell 20–200 MB groß.
- Blobs müssen base64-kodiert werden, was Größe und CPU zusätzlich aufbläht.

**Empfehlung:** `IndexedDB` für Video, Events und Reviews; `localStorage` nur für kleine Flags und Präferenzen.

### 3.2 IndexedDB-Stores

```ts
type LocalTake = {
  takeId: string;
  sessionId: string;
  createdAt: string;
  durationMs: number;
  mimeType: string;
  video: Blob;
  timebase: Take["timebase"];
  localVideoKey: string;
};

type LocalEvent = AnalysisEvent & {
  localOnly?: boolean;
  syncedAt?: string;
};

type LocalReview = {
  reviewId: string;
  takeId: string;
  report: ReviewReport;
  savedAt: string;
};
```

Stores:

| Store | Inhalt | Key |
|---|---|---|
| `takes` | Video-Blob, Dauer, MIME, Timebase | `takeId` |
| `events` | lokale Pose-Events + gecachte Backend-Events | `eventId` |
| `reviews` | letzter ReviewReport | `takeId` |
| `preferences` | UI-Flags, letzter Filter, Consent | `key` |

### 3.3 Lebenszyklus

1. Aufnahme startet: `MediaRecorder` + Pose-Log + Timebase.
2. Aufnahme stoppt: Video-Blob und Pose-JSONL lokal halten.
3. Pose-Events lokal berechnen und in IndexedDB speichern.
4. Video-Blob in IndexedDB speichern.
5. Optional Audio an Backend senden; Backend liefert Speech-/ASR-Events.
6. Backend-Events mit lokalen Pose-Events mergen und cachen.
7. Review speichern.
8. Bei Refresh: Take aus IndexedDB laden, Objekt-URL erzeugen, Timeline/Review vom Backend holen, lokal mergen.
9. Bei „Löschen“: IndexedDB-Eintrag, Objekt-URL und Backend-Timestamp-Daten löschen.

### 3.4 Quota und Robustheit

- `navigator.storage.persist()` anfragen, damit der Browser die Daten nicht bei Platzmangel räumt.
- `navigator.storage.estimate()` für „X MB von Y MB belegt“ anzeigen.
- `QuotaExceededError` abfangen: Aufnahme anbieten zum Download, dann lokale Kopie löschen.
- Beim Laden prüfen, ob der Blob noch existiert; wenn nicht: Textreview weiter anzeigen, Videobereich durch „Video nicht mehr lokal vorhanden“ ersetzen.
- Objekt-URLs nach Gebrauch mit `URL.revokeObjectURL()` freigeben.
- Keine stillen Löschungen: immer sichtbar machen, was lokal gespeichert ist.

### 3.5 Privacy und Export

- Lokales Video bleibt lokal; kein Upload von Videodaten.
- Audio-Upload optional und klar benennen: „Für Sprachanalyse wird die Audiospur temporär hochgeladen und nach der Analyse gelöscht.“
- „Aufnahme löschen“ löscht lokal und beim Backend die Timestamp-Daten.
- „Aufnahme herunterladen“ lädt die lokale Videodatei.
- „Review exportieren“ lädt Markdown/JSON ohne Video und ohne Roh-Landmarks.
- Der Export enthält keine Hand-Landmarks, keine Frame-IDs und keine lokalen Objekt-Keys.

## 4. P0 — lokaler Review-Flow

Ziel: Eine Aufnahme kann nach dem Stoppen reviewed werden, inklusive Pose-Events, Videojump und Textreview – ohne Backend-Clips, ohne Session-DB, ohne LLM.

### 4.1 Capture

- Video und Audio über `MediaRecorder`.
- Pose-Log über den vorhandenen Worker; `t0` an `MediaRecorder.onstart`.
- Timebase erfassen: `onstartPerfMs`, `firstVideoPtsMs`, `audioStartMs`, `avOffsetMs`, `containerDurationMs`, `wallDurationMs`.
- Wenn das Pose-Modell nicht läuft: Aufnahme trotzdem erlauben, aber später „Pose nicht verfügbar“ anzeigen.

### 4.2 Pose-Analyzer

Neue pure Funktion, z. B. `analyzePoseLog(jsonl, options)`:

- JSONL parsen, sortieren, defekte Zeilen ignorieren.
- Baseline aus den ersten 3–5 s: Median/MAD für `torso_lean_deg`, `shoulder_tilt_deg`, Head lateral.
- Regeln: R1 Rumpf, R2 Schulter, R3 Kopf, R10 Framing; optional R4 Arme, R6 Hand verdeckt, R7 Kopforientierung.
- Post-hoc-State-Machine: 1 s Fenster, 1 s Enter-Dwell, 0,5 s Exit-Dwell, 2 s Gap-Merge.
- `startMs` rückdatiert, `peakMs` = stärkste Abweichung, `endMs` = Ende Exit-Dwell.
- `validRatio < 0.8` → kein Deviation-Event, stattdessen `data-quality`/`framing`.
- Keine „good“-Events; Review-Scores aggregieren nur separat belegte Evidenz.
- `PoseTestTracker` nicht direkt wiederverwenden: dev-only, `holdMs=0`, keine Baseline, kein Peak, keine ValidRatio.

### 4.3 Merge

- Lokale Pose-Events + Backend-Events (Speech/ASR) nach `t_ms` sortieren.
- Pausen deduplizieren: VAD- und ASR-Pause mit überlappenden Fenstern zusammenführen.
- Pace: WPM aus ASR bevorzugen; Silbenrate nur als Live-/Audio-Metrik.
- Stable Sort mit `eventId` als letztem Tiebreaker.
- Keine Event-IDs aus Array-Indizes.

### 4.4 Review-Seite

- Kopf: Titel, Dauer, „lokal gespeichert“, Datenqualität, Löschen.
- Kurzfassung: ein Absatz aus Counts, keine freie Meinung.
- Maximal drei Fokus-Karten, jede mit Zeit-Chip und „Im Clip ansehen“.
- Stärken: nur mit Beleg; sonst „keine belastbaren Stärken-Ereignisse“.
- Timeline + Player + Transkript.
- Filter: Haltung, Stimme, Inhalt, Q&A, „nur auswertbar“, „nur mit Clip“.
- Detail-Drawer: Beobachtung, Beleg, Einordnung, Versuch, Datenlage.
- Methodik: „Heuristik, unvalidiert“, „keine Note, kein Ranking“.

### 4.5 Videojump

- Fokus ist `peakMs`, nicht `startMs`.
- Pose: ±5 s; Sprache: ±2 s; maximal 12 s.
- Bei fehlendem Clip: Vollaufnahme bei `peakMs - preRoll`.
- Auf `loadedmetadata` warten, dann seeken.
- `requestVideoFrameCallback` für Highlight und Clip-Ende; `timeupdate` nur als Fallback.
- `?event={eventId}` als Deep Link; kein presigned URL im Link.
- iOS: MP4/H.264/AAC, `playsinline`, kein hörbares Autoplay ohne Geste.

### 4.6 Textreview

- Deterministischer Composer aus Events, keine LLM-Pflicht.
- Jedes Finding hat `eventIds` und einen Timestamp.
- Zahlen kommen aus dem Event-Payload, nicht aus freiem Text.
- Formulierungen: beobachtbares Verhalten, keine Personeneigenschaften, keine Kausalität, keine Publikumswirkung.
- Ein Hedge maximal.
- „Nicht auswertbar“ mit Grund nennen.
- Review als Markdown/JSON exportierbar.

### 4.7 Tests

- Pose-Analyzer: Baseline, Deviation, Exit-Dwell, Gap-Merge, Framing, No-Baseline, Log-Cap.
- `clipRange`/Videojump: `peakMs`, Ränder, fehlende Dauer, Infinity-Dauer.
- Merge: doppelte Pausen, Pace-Wahl, stabile Sortierung.
- Review-Composer: Evidenzpflicht, verbotene Phrasen, keine Zahlen ohne Event.
- Rendering: leere Review, „nicht auswertbar“, local-video-missing.

## 5. UI/UX-Ideen

### 5.1 Desktop-Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Titel · 04:12 · lokal gespeichert · Datenlage · [Löschen]     │
├──────────────────────────────────────────────────────────────┤
│ KURZFASSUNG                                                   │
│ 1 Absatz · 2 Stärken · 3 Fokus-Karten mit Zeit-Chips          │
├───────────────────────────────┬──────────────────────────────┤
│ PLAYER                        │ REVIEW-RAIL                  │
│ [Video/Clip]                  │ [Alle] [Haltung] [Stimme]    │
│                               │ [Inhalt] [Q&A] [Filter]      │
│ TIMELINE                      │                              │
│ Haltung  ──●──────●────────   │ FOKUS 1                      │
│ Stimme   ────●──────●───      │ Beobachtung …                │
│ Inhalt   ──────●─────────     │ [Beleg 00:42–00:58]          │
│                               │ Einordnung …                 │
│ TRANSKRIPT                    │ Versuch: …                   │
│ 00:42  „…“ [aktives Wort]     │ [Datenlage ▸]                │
│ 00:51  „…“                    │                              │
└───────────────────────────────┴──────────────────────────────┘
```

### 5.2 Mobile-Layout

- Sticky Player oben.
- Tabs: „Überblick“, „Momente“, „Transkript“.
- Fokus-Karten als Liste; Tipp öffnet Bottom Sheet mit Beleg, Versuch, Datenlage.
- Timeline horizontal scrollbar mit Snap.
- Transkript standardmäßig eingeklappt; Tap auf Zeit springt.
- Touch-Ziele mindestens 44×44 px; keine Hover-only-Aktionen.
- Captions standardmäßig an.

### 5.3 Timeline

- Liste **und** Timeline; die Liste ist die barrierefreie Navigation.
- Lanes pro Kategorie; überlappende Marker clustern.
- Marker als `<button>` mit `aria-label` (Typ, Zeit, Severity).
- `aria-current="true"` für die Auswahl.
- Severity nie nur über Farbe: Icon/Text.
- Trefferfläche mindestens 24×24 CSS-Pixel.
- Filter und „Filter zurücksetzen“ sichtbar.
- Bei vielen Events: nach Kategorie gruppieren, nicht alle gleichzeitig zeigen.

### 5.4 Player

- „Im Clip ansehen“, „Nur Ereignis“, „Vollaufnahme“, Loop optional.
- Pre-Roll sichtbar machen: „Ereignis beginnt in 2 s“ oder farbiger Vorlauf.
- Aktives Event-Fenster auf der Timeline markieren.
- Bei manuellem Seek: „Zurück zum Ereignis“ anbieten.
- Tastatur: Space, J/L, Pfeile, Enter, Esc; sichtbarer Fokus.
- `prefers-reduced-motion` respektieren.

### 5.5 Finding-Karten

Jede Karte beantwortet fünf Fragen:

1. **Was?** Beobachtung, max. 2 Sätze.
2. **Wo?** Zeitfenster und Event-Anzahl.
3. **Wodurch belegt?** Regel/Metrik, Baseline, Delta, Confidence, Datenqualität.
4. **Was könnte es bedeuten?** Einordnung als Hypothese, nicht als Messung.
5. **Was als Nächstes?** Ein konkreter Versuch, keine Moralpredigt.

Beispiel:

> **Beobachtung:** Von 00:42 bis 00:58 waren deine Arme überwiegend vor dem Körper verschränkt.  
> **Beleg:** 3 Ereignisse · 16 s · Pose-Regel R4 · Konfidenz niedrig.  
> **Einordnung (Hypothese):** Das kann Gesten verdecken; ob es das Publikum bemerkt, messen wir nicht.  
> **Versuch:** Löse die Hände für einen Satz vom Körper, wenn du eine Kernaussage machst.  
> **Datenlage:** 2D-Pose, Heuristik, unvalidiert.

### 5.6 Stärken

Nur belegte Stärken:

- „Klarer Einstieg: Thema, Ziel und Nutzen in den ersten 20 Sekunden. Beleg: Transkript 00:12–00:31.“
- „Ruhige Pause nach der Kernaussage: 2,1 s bei 01:02. Beleg: 1 Pausenereignis.“
- „82 % der auswertbaren Zeit innerhalb des eingestellten Bereichs. Beleg: Aggregat, 3:42 auswertbar.“

Wenn es keine belastbaren Stärken gibt: „In dieser Aufnahme gab es keine belastbaren Stärken-Ereignisse.“ Kein künstliches Lob.

### 5.7 „Nicht auswertbar“

Eigene Zustände mit Grund und nächster Aktion:

| Zustand | Copy | Aktion |
|---|---|---|
| Hüften nicht sichtbar | „Die Haltung war ab 01:20 nicht auswertbar, weil die Hüften nicht im Bild waren.“ | „Kamera neu ausrichten“ |
| Keine Baseline | „Ohne ruhige Ausgangshaltung lassen sich keine Abweichungen berechnen.“ | „Erneut aufnehmen“ |
| Pose-Log voll | „Die Pose-Aufzeichnung endete nach ca. 5 Minuten; der Rest ist nicht auswertbar.“ | „Aufnahme teilen“ |
| Audio übersteuert | „Die Lautstärke ist nicht auswertbar: Der Ton war zeitweise übersteuert.“ | „Mikrofon prüfen“ |
| Transkript lückenhaft | „Tempo und Pausen sind nicht auswertbar, weil das Transkript lückenhaft ist.“ | „Transkript prüfen“ |
| Video lokal fehlt | „Das Video ist auf diesem Gerät nicht mehr gespeichert. Die Textreview ist weiter verfügbar.“ | „Aufnahme erneut importieren“ |

### 5.8 Copy-Regeln

- „du“ oder „Sie“ – eine Form pro Produkt, nicht mischen.
- Kurze Sätze, konkrete Zeitfenster.
- „kann“, „deutet hin“, „in dieser Aufnahme“ statt absoluter Aussagen.
- „Versuch“ statt „Empfehlung“; „Fokus“ statt „Priorität“.
- „Das hat getragen“ statt „Stärken“; „Das lohnt sich als Nächstes“ statt „Schwächen“.
- „nicht auswertbar“ statt „keine Daten“.
- Keine „Gaze“-, „Blickkontakt“- oder „Eye Contact“-Formulierungen.
- Keine Diagnosen, keine Personenlabels, keine Noten.
- „Zitat geprüft“ nur nach bestandenem String-Match.

### 5.9 Loading, Error, Empty

- **Loading:** „Analyse läuft …“ mit Fortschritt und der Möglichkeit, die Aufnahme weiter anzusehen.
- **Fehler:** „Die Analyse ist unvollständig. Deine Aufnahme ist lokal erhalten.“ + Retry.
- **Leer:** „In dieser Kategorie gab es keine auswertbaren Ereignisse. Das ist kein Qualitätsurteil.“
- **Teilweise:** „Die Review bezieht sich nur auf die erfassten Abschnitte.“
- **Kein Backend:** lokale Pose-Review und Videojump bleiben verfügbar; Speech/Fact-Check als „nicht verfügbar“ markieren.

### 5.10 Lokale Speicherung sichtbar machen

- Badge „Lokal gespeichert“ am Take.
- Nach Refresh: „Aufnahme aus lokalem Speicher wiederhergestellt.“
- Vor dem Löschen: „Löscht Video und Review von diesem Gerät sowie die Timestamp-Daten auf dem Server.“
- Quota-Warnung: „Der lokale Speicher ist fast voll. Lade die Aufnahme herunter oder lösche alte Takes.“
- Keine automatische Cloud-Synchronisierung ohne explizite Zustimmung.

### 5.11 Barrierefreiheit

- WCAG-2.2-AA-Basis: Captions, Tastaturbedienung, sichtbarer Fokus, keine Keyboard-Traps.
- Textkontrast ≥ 4,5:1; Nicht-Text-Kontrast ≥ 3:1.
- Timeline hat eine Listen-Alternative.
- `aria-live="polite"` für „Jetzt: …“ und Seek-Ansagen.
- Reflow bei 320 px; kein horizontaler Scroll für Text.
- Reduced Motion für pulsierende Marker und Auto-Scroll.
- Sprache `lang="de"`.

## 6. P1 — Ausbau

- Backend-Review und LLM-Formulierer anbinden; Template-Fallback bleibt.
- Fact-Check-Findings mit Quelle, Seite/Folie und geprüftem Zitat anzeigen.
- Transkript-Synchronisierung: aktives Wort, Klick-to-Seek, Suche.
- Quellen-Collection an Session binden; Zitat-Karten.
- Vorher/Nachher-Vergleich nur bei gleicher Aufgabe, Kamera und Mikrofon; Unterschiede beschreiben, keine Kausalität.
- Skeleton-Overlay im Review optional; standardmäßig aus.
- Review als Markdown/PDF exportieren.
- „Warum diese drei?“-Erklärung für die Fokus-Auswahl.
- Feedback zur Review: „War das hilfreich?“ mit Grund.

## 7. P2 — Stretch

- Frage-Simulator mit Fragen aus Transkript, Quellen und Fact-Check.
- Verlauf über mehrere Aufnahmen (nur mit expliziter Zustimmung, keine Rankings).
- Mobile-App-Review mit derselben Timeline.
- Geteilte Review-Links (nur Timestamps, kein Video).
- Lokale Suche über Transkript und Findings.
- Experiment-Modus: „Nimm 30 s mit einem Fokus auf.“

## 8. Offene Fragen

- Wird die Audiospur hochgeladen oder nur lokal analysiert? Wenn Upload: Retention klar kommunizieren.
- Bleibt das Video nach dem Review dauerhaft in IndexedDB oder nur für 24 h?
- Wird die Review lokal oder serverseitig erzeugt? Empfehlung: beides, lokal als Fallback.
- Gibt es ein Login? Wenn nein: Session-IDs sind zugriffsgeschützt zu behandeln.
- Soll die Review auf Deutsch oder Englisch sein? UI und Review-Text konsistent halten.
- Wird der Frage-Simulator Text oder Sprache? Das beeinflusst die P2-UI.
- Wie viel Rohdaten darf der Export enthalten? Keine Hand-Landmarks, keine Frame-IDs.

## 9. Anti-Goals

- Kein Gesamtscore, keine Note, kein Ranking.
- Keine „Confidence“- oder „Energy“-Bewertung der Person.
- Keine Emotions-/Persönlichkeitsdiagnose aus Pose.
- Kein „Blickkontakt“ aus Kopforientierung.
- Keine erfundenen Schwellenwerte oder Genauigkeiten.
- Kein Server-Clip, keine Server-Videokopie, kein Snapshot-Upload.
- Kein LLM, das Zahlen, Zeiten, Zitate oder Quellen selbst schreibt.
- Keine automatische Cloud-Speicherung ohne Zustimmung.

## 10. P0-Checkliste

- [ ] Video bleibt lokal; IndexedDB statt localStorage für Blobs.
- [ ] Timebase und `peak_ms` sind im Event-Vertrag.
- [ ] Pose-Analyzer liefert Events mit `eventId`, `start/peak/end`, `validRatio`, `confidence`.
- [ ] Merge dedupliziert Pausen und sortiert stabil.
- [ ] `clipRange` nutzt `peak_ms`; Pose ±5 s, Sprache ±2 s.
- [ ] Review-Seite zeigt Kurzfassung, max. 3 Fokus-Karten, Stärken, Grenzen.
- [ ] Jedes Finding hat Zeit-Chip und „Im Clip ansehen“.
- [ ] „Nicht auswertbar“ und „Video fehlt“ sind eigene Zustände.
- [ ] Review ist als Markdown/JSON exportierbar.
- [ ] Refresh stellt die Aufnahme aus IndexedDB wieder her.
- [ ] Löschen entfernt lokal und serverseitig die Timestamp-Daten.

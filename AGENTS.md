# AGENTS.md — Hackathon Fulda 2026

Einstiegspunkt für Menschen und Agents. Hackathon-Regeln, Deadlines und Bewertung: `docs/00-requirements.md`. Features und offene Punkte: `docs/01-product.md`. Offene TODOs: `docs/14-open-todos.md`. Grafische Architektur-Übersicht (Mermaid): `docs/03-architecture.md`. Pose-Research-Ziele und Integrationsstand: `docs/04-pose-tracking-requirements.md`.

## 1. Projekt

**418 Pitch Practice** — Live-Präsentationstrainer (8. Hackathon Fulda, 24.–25.10.2026, Thema Future Education): analysiert Auftritt und Sprache, macht Feedback timestamp-genau zurückspulbar und fragt danach gezielt nach. Web-App für Laptop; die Jury-Demo läuft lokal und ohne Login. Smartphone und öffentliche URL sind nicht Teil des aktuellen Demo-Pfads.

| # | Feature | Inhalt |
|---|---|---|
| 1 | Posture / Gesture / Eye Tracking | Pose- und Gesten-Landmarks aus der Kamera; Kopforientierung als Proxy (kein Gaze); Regeln darauf erzeugen Events (z. B. „Haltung auffällig“) |
| 2 | Transkription + Fact-Check | Transkript mit Wort-Timestamps; Abgleich der Aussagen per RAG mit vorab hochgeladenen Quellen (PDF, PPTX, …); Web-Fetch-Agent als Zweitquelle |
| 3 | Sprechmerkmale | Tempo, Pausen, Zögern, Füllwörter, Lautstärke (zu leise/laut), Tonhöhenvariation (monoton); live Hinweise während des Vortrags |
| 4 | Timestamp-Review | Events auf einer Timeline; `peakMs` springt zur Stelle in der lokalen Aufnahme; keine serverseitigen Clips |
| 5 | Frage-Simulator | Agent stellt nach der Präsentation Fragen, abgeleitet aus Transkript, Quellen und Fact-Check-Funden |

**Leitplanken:** nur diese fünf Features; Scores nur als transparente, evidenzbasierte Aggregation bereits gemessener Events (Auswertung nach der Fragerunde), keine erfundenen Schwellenwerte oder Genauigkeiten; keine Emotions-/Persönlichkeitsbewertung; nur synthetische Demo-Daten; „In unserem Prototyp …“ statt „validiert“.

**Expliziter Nutzerauftrag (aktualisiert 25.10.2026):** Im Review drei 0–100-Prototyp-Scores
für Gestik, Fachwissen und Flow statt bloßer Moment-Anzahlen anzeigen. Struktur
ist auf Nutzerwunsch aus den Kriterien und der Score-Berechnung entfernt.
Die Version `evidence-share-v1` bewertet die erfasste Evidenz: positive Zeitanteile
gegen positive + kritische Zeitanteile; Fachwissen bevorzugt über entscheidbare
Quellenurteile. Formel, Datenabdeckung und fehlende Daten bleiben sichtbar;
ohne Evidenz kein Score. Keine Validierungs- oder Benotungsbehauptung. Der
Zeitverlauf ist eine Linie aus geraden Segmenten; Zwischenwerte sind
ausdrücklich interpoliert. Ältere Struktur-Momente bleiben allgemeine
Anmerkungen ohne eigenes Kriterium oder Score.

Review-Verdrahtung (25.10.2026): Beide Web-Review-Ansichten nutzen denselben
Adapter für die gewählte, lokal gespeicherte Aufnahme. Quellen-Marker kommen
aus dem aktuellen Fact-Check; nur Urteile mit geprüftem Quellenzitat fließen
in den Fachwissen-Score ein. `/review-preview` bleibt ein markiertes Beispiel.
Ohne ausreichende Evidenz bleibt der jeweilige Score offen.

## 2. Ablauf

1. **Vorbereitung:** Nutzer lädt Quellen hoch (PDF, PPTX, Text). Backend zerlegt sie in Chunks mit Quelle und Seite/Folie und legt sie für die Suche ab.
2. **Aufnahme:** Kamera und Mikro laufen. Im Browser erzeugt MediaPipe live Pose-Landmarks und einen Kopforientierungs-Proxy, daraus entstehen Events; das Mikro liefert den Pegel.
3. **Übergabe:** Session/Take-Metadaten und abgeleitete Pose-Events gehen ans Backend. Audio oder Aufnahme für ASR/Sprechanalyse nur optional und temporär hochladen.
4. **Analyse (Backend):** Transkription mit Wort-Timestamps, Sprechmerkmale, Fact-Check. Timestamp-Daten und Review bleiben in Postgres; der Upload wird auch bei Analysefehlern gelöscht.
5. **Review:** Timeline über alle finalen Events; `peakMs` ist das Sprungziel im lokalen Video. Das Frontend speichert gestoppte Takes inklusive Video sofort lokal in IndexedDB, ergänzt Analyse und Fragenverlauf danach und stellt sie nach Reload wieder her. Lokales Löschen im Review; kein Geräte-Sync, Backend-Daten bleiben separat.
6. **Frage-Simulator:** Der Agent stellt gezielte Rückfragen, vor allem zu Widersprüchen und Lücken aus dem Fact-Check, und vergleicht die Antworten mit den Quellen.

## 3. Tech-Stack

**Entschieden (Zielarchitektur; aktueller Umsetzungsstand in Abschnitt 6)**

| Schicht | Technik |
|---|---|
| Frontend | Next.js (App Router) + TypeScript; Kamera, MediaPipe und `MediaRecorder` laufen ausschließlich client-seitig |
| Backend | Python 3.12 + FastAPI |
| Hintergrundjobs | Celery-Worker; Redis als Broker und temporäres Result-Backend (Docker Compose) |
| Datenbank | Postgres mit `pgvector` (Docker Compose): Sessions, Events, Transkript, Quellen-Chunks + Embeddings |
| Objektspeicher | SeaweedFS, S3-kompatibel (Docker Compose): Quellen und temporäre Analyse-Uploads; keine Review-Videos, Clips oder Snapshots |
| Pose / Gesten / Blick | `@mediapipe/tasks-vision` im Browser: PoseLandmarker und optionaler HandLandmarker für Fingertracking; FaceLandmarker (Iris) nicht MVP |
| Capture | `getUserMedia` + `MediaRecorder`; Web Audio (`AudioWorklet` / `AnalyserNode`) für Live-Pegel |
| Medien-Verarbeitung | `ffprobe` für Stream-Startzeiten/Dauer, `ffmpeg` nur für Audio-Dekodierung und ASR |
| Transkription | Lokales Whisper (`faster-whisper`) hinter einem `Transcriber`-Interface (`{word, start_ms, end_ms}` + Text), Deepgram EU als wählbarer Live-Stream mit Wiederverwendung der finalen Wörter; Anbieter bleibt austauschbar |

**Vorschläge, noch zu bestätigen** (Bestätigung im `docs/02-ai-decision-log.md` festhalten; Vorlage: `templates/ai-decision-log.md`)

- **Transkription:** Stufe A (umgesetzt): Audio nach dem Stoppen hochladen, Wort-Timestamps und Text zurück. Standard ist lokales `faster-whisper` (deutsch), damit keine Audiodaten an einen Cloudanbieter gehen; Deepgram bleibt als optionaler Adapter verfügbar. Stufe B: optionale Live-Transkript-Vorschau im Web umgesetzt (`WS /speech/live` mit PCM aus dem `AudioWorklet`, ein Live-Slot pro Prozess, `WHISPER_LIVE_*`-Konfiguration); Browser-Sender in `frontend/src/features/live/captions.ts`, aktivierbar unter Recording options. Im Web ist zusätzlich Deepgram EU live wählbar (seit 25.10.2026 auf Nutzerwunsch standardmäßig aus, nur Opt-in; `DEEPGRAM_API_KEY` erforderlich; das Projekt hängt nicht von Deepgram ab): finales Live-Transkript mit Wort-Timestamps wird ohne erneute ASR im Review verwendet; bei Ausfall weiterhin lokaler Batch-Pfad. Der Datenschutzhinweis benennt Deepgram. Die lokale Whisper-Vorschau ersetzt keine Batch-Wort-Timestamps. Whisper lässt Füllwörter oft weg; deutsche Füllwortqualität ist ungeprüft. Gegenmaßnahme: Ohne `WHISPER_INITIAL_PROMPT` nutzt deutsches Whisper einen Prompt mit „ähm/äh“ (`none` schaltet ihn ab); die Füllwortliste erkennt gedehnte Schreibungen („ähhh“, „hmmm“). Deepgram behält Füllwörter laut Doku nur auf Englisch. Wort-Timestamps sind vorhanden.
- **Embeddings:** umgesetzt mit lokalem `jinaai/jina-embeddings-v2-base-de` (Deutsch/Englisch, FastEmbed/ONNX) hinter einem austauschbaren `Embedder`-Interface; Retrieval-Qualität mit echten Dokumenten noch nicht gemessen.
- **Fact-Check und Frage-Agent:** Gemini über den OpenAI-kompatiblen Endpoint
  (`gemini-3.1-flash-lite` für Test/Live, `gemini-3.8-flash` für final), Key nur
  serverseitig in `.env`. JSON-Modus, Satzverweis-/Zitatprüfung im Code; Details
  in `docs/06-local-coaching.md` und `docs/11-deep-research-validation.md`.
  Web-Zweitquelle über Team-API vorhanden, standardmäßig aus; kein eigenes
  Scraping. Die frühere Local-only-Zusage ist hinfällig: Gemini ist Cloud ohne
  EU-Region-Pinning, daher nur synthetische Demo-Daten senden.
- **Stimme (live, im Browser):** Lautstärke per RMS, Tonhöhe per F0-Schätzung (YIN/McLeod) im `AudioWorklet`, Tempo als Silbenrate aus der Energie-Hüllkurve. Referenz erst aus ca. 3 s erkannter stimmhafter Sprache (keine Anfangsstille/unvoiced Raumgeräusche), danach langsam adaptiv in 1-s-Blöcken; 30 s Halbwertszeit in stimmhafter Zeit, Median und begrenzte Updates gegen kurze Ausreißer. Lautstärkevergleich nur auf stimmhaften Frames; F0 in Halbtönen, Pitch-Streuung unabhängig von der Referenzbewegung. Monotonie = geringe Tonhöhenvariation im gleitenden Fenster, keine Aussage über Emotion. `getUserMedia` mit `autoGainControl`, `noiseSuppression`, `echoCancellation` = false. Exakte WPM, Pausen und Füllwörter kommen nach dem Upload aus den Wort-Timestamps.
- **Hosting:** Nutzer bestätigt lokale Vorführung auf `localhost`; kein öffentliches Deployment nötig. Für andere Geräte/öffentliche Hosts bleibt HTTPS für `getUserMedia` erforderlich.
- **Safari/iOS** früh auf echtem Gerät testen (andere Container-Formate, `MediaRecorder` liefert MP4 statt WebM).

**Offen:** offene Punkte und TODOs stehen in `docs/14-open-todos.md`
(Retention/Cleanup, Persistenz-/Progress-Anbindung,
Prompt-Safety-Grenzen, Demo-Härtung). Umgesetzt: Post-Transkription lokal und
Text-Fragerunde mit Quellenvergleich ohne Noten.

## 4. Architektur

**Pflicht bei Architektur-Änderungen:** Die Mermaid-Diagramme in `docs/03-architecture.md` (Systemübersicht, Compose-Deployment, Sprech­analyse-Flow, RAG-Pipeline, Frontend-Routen, Datenmodell, Event-Modell, API-Endpunkte) sind Teil dieser Datei und immer mitzupflegen. Sobald sich Services in `compose.yaml`, Endpunkte/Routen, Pipelines, Datenmodell oder das Event-Schema ändern, die betroffenen Diagramme im selben Change aktualisieren.

```
Browser (Next.js, TS)
 ├─ Kamera → MediaPipe Pose + Hand (Fingertracking) → Regeln → Events + Landmarks [live, lokal]
 ├─ Mikro  → AudioWorklet → Pegel, F0, Silbenrate → Regeln → Events + Live-Hinweis [live, lokal]
 └─ MediaRecorder → lokale Aufnahme (Client-Vertrag)
         └─ optionaler Audio-/Aufnahme-Upload ───────┐
 Quellen-Upload (PDF/PPTX) ──────────────────────────┤
                                                     ▼
                                          FastAPI (Python 3.12)
                                                     │
                                          Redis → Celery-Worker
     ┌──────────────┬─────────────────┬──────────────┴───┬─────────────────┐
     ▼              ▼                 ▼                  ▼                 ▼
 Ingest/RAG    Transkription    Sprechanalyse        Fact-Check        Frage-Agent
 (Chunks +     (Transcriber →   (Tempo, Pausen,     (Aussagen ↔       (Fragen aus
 Embeddings)   Wort-Timestamps)  Füllwörter)        Quellen-Chunks)    Fact-Check-Funden)
     │                                                   ▲                 │
     └───────────── Retrieval (pgvector) ────────────────┴─────────────────┘
                                   │
                  Audio-Probe + Timestamp-Offset, Original löschen
                                   ▼
        Postgres (Sessions, Takes, Events, Reviews, Jobs, Wörter, Chunks)
        SeaweedFS (Quellen, nur temporäre Audio-/Aufnahme-Uploads)
                                   ▼
                    Review-UI: Timeline über gemeinsame Zeitachse
```

### Event-Schema (Vertrag zwischen Frontend und Backend)

Der persistente Review-Vertrag steht in `backend/app/review/models.py` und
`docs/06-backend-review-api.md` (JSON in camelCase). Bestehende Analyse-Routen
behalten ihr kleineres `app/events.py`-Format; der Take-Worker adaptiert es.

```
Event {
  take_id, id, dedupe_key,
  t_ms          // relativ zum Aufnahmestart
  peak_ms       // Sprungziel; ohne Peak-Sample explizit Event-Anfang
  duration_ms,
  type          // posture | head | hands | framing | data-quality | gesture | filler | pause | pace | volume | pitch | fact | question
  severity      // info | hint | warning
  source        // browser | asr | speech | factcheck | agent
  stage         // live | final
  rule_version?
  payload       // typabhängig: Landmarks, Wort, Quelle + Zitat, Frage …
}
```

### Regeln

- **Gemeinsame Zeitachse:** Alle Events tragen `t_ms` relativ zum Aufnahmestart. Der Landmark-Takt wird an `MediaRecorder.onstart` verankert (`performance.now()`), das Review nutzt nur `video.currentTime`.
- **Live-Feedback:** Browser-Regeln (Pose und Stimme) zeigen während der Aufnahme einen dezenten Hinweis (z. B. „Tempo hoch“, „Stimme monoton“, „zu leise“), ohne Score und ohne Note. Damit er nicht ablenkt: Mindestdauer der Abweichung, Cooldown pro Hinweis-Typ, höchstens ein Hinweis gleichzeitig, abschaltbar. Jeder Hinweis erzeugt zugleich ein Event für die Timeline. Schwellenwerte sind Konfiguration relativ zur Baseline und als „Heuristik“ gekennzeichnet.
- **Pose-Events:** Regeln auf Landmark-Winkeln, kalibriert gegen eine Baseline (erste Sekunden neutrale Haltung), mit Mindestdauer gegen Flackern. Schwellenwerte sind Konfiguration und im UI als „Heuristik“ gekennzeichnet. Kamera-Framing: Oberkörper muss sichtbar sein, sonst Hinweis statt Auswertung.
- **Lokale Wiedergabe:** Kein Clip-/Snapshot-/Video-Endpunkt im Backend. Die Aufnahme bleibt im Client; Audio/Container nur temporär für Analyse. Take-Events liefern Start, Peak und Dauer. Coverage nur aus gemeldeten Messintervallen, fehlende Zeit bleibt unbekannt.
- **Persistente Review:** `POST /sessions`, `/sessions/{id}/takes`, `/takes/{id}/events`, optional `/audio`, dann `/review`; `GET /timeline`, `/review`, `/jobs/{id}`. Neue POSTs brauchen `Idempotency-Key`. Template-Review ist Standard; LLM nur über geprüfte Evidence Cards und Platzhalter. `DELETE /sessions/{id}` kaskadiert Metadaten und entfernt temporäres Audio. P1/P2-Anbindung über Take-`/factcheck`, `/questions`, `/questions/answers`; Details in `docs/06-backend-review-api.md`.
- **Fact-Check:** (1) LLM extrahiert prüfbare Aussagen mit Timestamp aus dem Transkript, (2) Top-k-Chunks pro Aussage aus pgvector, (3) LLM urteilt mit wörtlichem Zitat, (4) Code prüft per String-Match, dass das Zitat im Chunk steht. Drei Ergebnisse: *stützt*, *widerspricht*, *in den Quellen nicht gefunden*. Letzteres ist nicht „falsch“. Web-Fetch kommt erst danach als Zweitquelle.
- **Frage-Agent:** Eingabe sind Transkript, Quellen-Chunks und die Fact-Check-Funde. Er fragt gezielt nach Widersprüchen und Lücken und vergleicht Antworten mit den Quellen. Ausgabe ohne Punkte oder Noten.
- **Fallback:** Bei LLM-Ausfall bleibt der Kurzreview aus den erhobenen Events als Template verfügbar. Die vorberechnete Beispiel-Session ist ein eigener, gekennzeichneter Demo-Pfad; sie ersetzt keine Daten einer echten Aufnahme. Sie dient dem Produktreview (Wert in unter 3 Minuten), Live-Aufnahme ist der zweite Pfad (30–60 s reichen).
- **Datenschutz:** Demo-Daten synthetisch. Live-Aufnahmen der Jury sind echte personenbezogene Daten: Einwilligungshinweis, Originalaufnahme nach der Verarbeitung löschen, Drittanbieter-APIs benennen (relevant für die KI-Reflection).
- **Daten und Secrets:** Postgres mit pgvector und SeaweedFS; der vorhandene Compose-Stack ist in Abschnitt 6 beschrieben. Secrets nur in `.env`, nicht committen.
- **Hintergrundjobs:** Lange Backend-Arbeiten (z. B. Transkription, Ingest, Review) als Celery-Tasks ausführen. Async-API-Routen publizieren über `app.jobs.enqueue_task` und geben eine Job-ID zurück; im Request nicht auf das Ergebnis warten. Nur IDs/Object-Keys in Redis, Medien temporär in S3. Tasks müssen bei erneuter Zustellung sicher wiederholbar sein.
- **Layout (Ziel):** `frontend/` (Next.js), `backend/` (FastAPI); die vorhandene Compose-Datei heißt `compose.yaml`.

## 5. Priorität

1. Aufnahme → optionale Audioanalyse → Transkript → Events → Timeline mit lokalem Timestamp-Sprung (Rückgrat, Features 2a und 4).
2. Pose-Events (2–3 Regeln) und Sprechmerkmale aus Wort-Timestamps.
3. Quellen-Upload, Ingest und RAG-Fact-Check.
4. Frage-Agent auf den Fact-Check-Funden.
5. Stretch: Live-Transkript, Web-Fetch.

## 6. Repo und aktueller Stand

```
AGENTS.md                          # Einstiegspunkt und Zielarchitektur
compose.yaml                       # Frontend + Backend + Celery + Redis + PostgreSQL + S3
.env.example                       # lokale Konfiguration ohne echte Secrets
backend/                           # FastAPI, Audio-/Quellenanalyse, Setup und Smoke-Test
frontend/                          # Next.js-App, eigener Entwicklungscontainer
.run/                              # geteilte IntelliJ-Run-Konfigurationen
.vscode/                           # geteilte VS-Code-Tasks für Docker Compose
specifications/                    # offizielle Challenge (deutsch/englisch)
docs/
  00-requirements.md               # Hackathon-Regeln und Bewertung
  01-product.md                    # Features und offene Punkte
  02-ai-decision-log.md            # tatsächliche Entscheidungen und Prüfergebnisse
  03-architecture.md               # Architektur als Mermaid-Diagramme; bei Architektur-Änderungen mittesten
  04-gesture-evaluation.md         # Recherche, Messregeln und Grenzen der Gestenheuristiken
  05-jury-demo.md                  # Lokale Vorführung und dokumentierte Geräte-Abnahme
  04-pose-tracking-requirements.md # Pose-Research-Ziele und Integrationsstand
  12-long-term-progress-data-design.md # Backend-Data-Design, Research, DDL, API
  13-long-term-progress-frontend-contract.md # progress.v1 und UI-Vertrag
  14-open-todos.md                 # Offene TODOs, Priorität und Abnahmekriterien
templates/
  ai-decision-log.md               # Vorlage für die AI Reflection
  team-roles.md                    # Rollen, Gates, RACI
```

Das lokale Grundgerüst startet aktuell FastAPI mit FFmpeg,
einen separaten Celery-Worker, Redis, PostgreSQL **mit pgvector** und
**SeaweedFS als S3-Speicher**. Die Queue wird mit einem synthetischen Job geprüft; Audio-/ASR-Jobs und
Job-Status-Endpunkte sind implementiert (Details: `backend/README.md`). Die additive
Take-Review-API (`backend/app/review/`) speichert Sessions, Takes, Events, Reviews,
Jobs und Wort-/Sprechdaten in Postgres. Sie bietet Template-/LLM-Review,
Coverage, Fact-Check-/Frage-Anbindung und explizite Löschung ohne Server-Clips.
Browser-Integration dieser neuen API ist ein separater Frontend-Change.
Das optionale Long-Term-Progress-Backend ist umgesetzt
(`backend/app/progress/`): pseudonyme Profile mit Token-Hash, additive
`profile_id`/`presentation_mode`/`recorded_at`/`device_key`-Felder,
`take_quality`/`take_metrics`, `progress_snapshots`/`progress_change_points`,
optionale Ziele, `progress.v1`, Export und Löschung. Es gibt keinen
Gesamtscore. Profil-Löschung entkoppelt Sessions/Takes und entfernt nur die
abgeleiteten Progress-Daten; Session-Löschung bleibt separat. Details:
`docs/12-long-term-progress-data-design.md`; Frontend-Vertrag:
`docs/13-long-term-progress-frontend-contract.md`; die Web-UI unter `/progress`
ist umgesetzt (Consent, Demo, Filter, Ziele, Export, Löschung); die Verknüpfung
neuer Live-Aufnahmen mit einem Profil ist offen.
Progress-Reads aktualisieren nur geänderte Takes (Review-Revision und
Berechnungsversion). Explizites Recompute läuft als Celery-Job:
`POST /profiles/{id}/progress/recompute` → `202 {runId,statusUrl}`,
Status unter `GET /profiles/{id}/progress/runs/{runId}`. Auch verknüpfte
Session-/Take-/Job-Routen verlangen den Profil-Token; anonyme Sessions bleiben
kompatibel. Abgelaufene Profile liefern `410`, Löschen bleibt erlaubt.
Quellen-Upload und Retrieval (RAG) sind umgesetzt
(`backend/app/sources/`, Frontend-Seite `/sources`): PDF/PPTX/DOCX/TXT/MD →
Chunks mit Seite/Folie → lokale Embeddings (`jina-embeddings-v2-base-de`) →
Hybrid-Suche (pgvector + deutsche Volltextsuche). Der Fact-Check ist umgesetzt
(`backend/app/factcheck/`, `POST /factcheck`, Review-Panel in `/live/[id]/review`):
LLM extrahiert Aussagen mit Satznummern, Timestamps kommen aus den Wörtern;
pro Aussage zuerst Retrieval in den hochgeladenen Quellen, danach optional
Websuche (Wikipedia/Tavily); Zitate werden per `quote_in_text` geprüft,
Ergebnisse sind `fact`-Events. LLM standardmäßig Gemini (Cloud), konfigurierbar
über `LLM_BASE_URL`/`LLM_MODEL`; kein lokales Ollama mehr im Projekt.
Der Frage-Simulator ist umgesetzt (`backend/app/questions/`, `POST /questions`,
`POST /questions/answers`, Panel in `/live/[id]/review`): Fragen aus
Fact-Check-Funden (Widerspruch, nicht belegt), Lücken gegenüber den Quellen und
unklaren Stellen; `t_ms` und Evidenz kommen aus Verweisen, nicht vom Modell.
Getippte Antworten werden mit den Quellen verglichen (Zitat-Prüfung, optionale
Nachfrage); Fragen mit gesprochener Stelle sind `question`-Events. Nach der
vollständig beantworteten getippten Runde zeigt der Web-Review eine Auswertung
(`frontend/src/features/evaluation/performance.ts`, Panel
`PerformanceEvaluation.tsx`): transparenter Heuristik-Score 0–100 aus bereits
gemessenen Events — Inhalt (Gewicht 0,5; Fact-Check- und Antwort-Urteile),
Stimme (0,25) und Gestik (0,25; `evidence-share-v1`: positive Zeit gegen
positive + kritische Zeit, Inhalt nur aus zitateverifizierten entscheidbaren
Urteilen; Gewichte renormalisiert wenn Daten fehlen) — mit Belegen, Stärken,
Übungsvorschlägen und Methodenhinweis; keine Personenbewertung. Voice-Agent: Rolle `student` (neugieriger Erstsemester) oder
`tutor` (Professor/Tutor) wählbar. Der Web-Sprachdialog nutzt ElevenLabs;
der alte Browser-TTS-Client ist entfernt. Der kompatible Backend-Endpunkt
`POST /questions/answers/voice` bleibt für ASR und zitateverifizierten
Antwortvergleich verfügbar. Im Live-Studio lässt sich die
Transkription (lokales Whisper) vor der Aufnahme zuschalten; die Wörter sind Eingabe
für den Fact-Check. Das Next.js-Frontend läuft in einem
eigenen Compose-Container; `/api/...` wird intern an FastAPI weitergeleitet.
Lokale Pose-Landmarks lassen sich im Kamera-Studio als JSONL exportieren;
Darauf laufen lokale, kalibrierte Gesten-/Haltungsheuristiken (Hand hoch,
Hände zusammen, Arme verschränkt, seitliche Neigung/Position, Kopf seitlich
abgewandt/gesenkt als Kopforientierungs-Proxy) mit
Live-Hinweis, Review-Markern und Evidenz-Export. `/gestures` zeigt denselben
Regelablauf mit synthetischen Landmarks; keine Genauigkeitsvalidierung.
Recherche und Regeln: `docs/04-gesture-evaluation.md`; Jury-Abnahme und
noch offene Geräte-Gates: `docs/05-jury-demo.md`. Nutzerentscheidung:
lokale Vorführung reicht; kein öffentliches Deployment erforderlich.
Eye Contact wird nicht aus Pose-/Iris-Punkten behauptet.
Der integrierte Web-Worker startet standardmäßig mit Lite/VIDEO. Unter
„Analysis features“ in `/admin` sind IMAGE/VIDEO sowie Lite/Heavy unabhängig auswählbar;
GPU-first mit CPU-Fallback bei Start- oder Laufzeitfehlern, kein Modellwechsel.
JSONL/Event-Payload enthalten `runtime` (Modell, Modus, Delegate). VIDEO-Logs
enthalten zeitlich geglättete Modell-Ausgaben; IMAGE-Logs unabhängige Frames.
Pose Lab T1–T12 läuft immer mit; das Panel bleibt ein Dev-Werkzeug. Die sechs
Tests ohne kalibrierte Live-Regel (Hand in Tasche, Hände verdeckt, Hand am
Gesicht, Beine gekreuzt, Schultertilt, Kopfneigung) erzeugen auf Nutzerwunsch
mit derselben Logik Live-Hinweise und Review-Events (`features/pose/lab-events.ts`,
2 s Halten, 5 s Cooldown; eine kalibrierte Regel hat beim Hinweis Vorrang).
Fingertracking ist separat unter „Track fingers“ schaltbar, standardmäßig an und
auf höchstens 5 Hz begrenzt; es funktioniert auch ohne sichtbaren Torso.
Die Haltungsreferenz kalibriert ohne Hand-Stillhaltepflicht. Fehlende neutrale
Handreferenzen bleiben im Payload `null`; Gesten nutzen dann Schultergeometrie.
Alle Pose-Regeln halten einheitlich 2 s (`POSE_RULES.stabilizeHoldMs`); Arme
verschränkt behalten 20 s Cooldown. Die Live-Hinweisblase (Pose und Stimme)
zeigt jeden Hinweis mindestens 3 s und lässt danach 2 s Lücke
(`minDisplayMs`/`minDisplayGapMs`). Die wirkungslose Einstellung `praiseAfterMs`
ist entfernt; alte Browser-Einstellungen bleiben lesbar. Alle Werte sind unter `/admin`
(Navbar, noch ohne Login) pro Browser in `localStorage` einstellbar. Dort lässt
sich auch jede der 13 Live-Pose-Regeln (7 kalibrierte + 6 aus Pose lab) auf On
(Hinweis + Review), Review only (nur Timeline) oder Off stellen, wirksam sofort im
offenen Studio, und jeder der 12 Pose-lab-Tests abschalten.
Sprachfeedback ist insgesamt und für Pausen, Tempo, Füllwörter, Lautstärke und
Tonhöhe einzeln schaltbar. Jede Web-Aufnahme nutzt auf Nutzerwunsch Live-Feedback
und volle Backend-Analyse;
der Modus-Schalter entfällt. Kamera und Mikrofon sind immer aktiv, Audio geht
während der Aufnahme an den separaten Signal-Stream unten und die vollständige
Aufnahme wird nach dem Stoppen hochgeladen; Füllwörter und Wort-Tempo bleiben
nachgelagert. Live-Captions
sind separat. Die Analysis-features-Schalter liegen in `/admin`, bleiben pro
Browser in `localStorage` und werden mit jeder Aufnahme gespeichert; Änderungen gelten
ab der nächsten Aufnahme. Transkript-Optionen und Pose lab bleiben im Studio.
Die ausführlichen Research-Ziele in `docs/04-pose-tracking-requirements.md`
sind nicht vollständig implementiert und überschreiben diese Entscheidung nicht.
Der Aufnahme-Pfad nutzt die Audio-Job-API
mit lokaler Signalanalyse und Status-Polling. Im Backend-Modus ist lokales
Whisper standardmäßig eingeschaltet und abschaltbar; `local_only=true` blockiert
einen unbeabsichtigten Cloud-/JSON-Anbieter. Transkript, Quellenvergleich und
Text-Fragerunde sind ins Web-Review eingebunden. Umgesetzt sind zwei getrennte
Analyse-Pipelines mit S3-Persistenz für kombinierte Jobs, beide mit `t_ms` ab Aufnahmestart im
gemeinsamen Event-Schema (`backend/app/events.py`): Audiosignal-Analyse als
Zeitreihe (`backend/app/speech/`) und wortbasierte Analyse der Transkription
(`backend/app/transcription/`, standardmäßig lokales faster-whisper; Deepgram
Nova-3 über EU-Endpunkt optional; deutsche Füllworterhaltung ungeprüft).
Das Ergebnis enthält zusätzlich den zusammengesetzten Transkripttext. Silero VAD v6.2 (ONNX, lokal) erkennt
Sprachaktivität; RMS und YIN bleiben erhalten, Standard-Kalibrierung 3 s.
Die bisherigen `/speech`-/`factcheck`-/`questions`-Routen bleiben kompatibel;
der neue Take-Pfad persistiert Ergebnisse in Postgres und temporäres Audio in S3.

Live-Sprechfeedback ist im Web-Backend-Modus umgesetzt: `WS /speech/feedback`
analysiert Mikrofon-PCM alle 5 s mit denselben Signalregeln und kausaler adaptiver Stimmreferenz (zunächst 3 s stimmhafte Sprache; Stille trainiert nicht).
Ein Live-Slot pro API-Prozess, maximal 5 min; PCM nur im RAM. Die Vorschau
läuft unabhängig von optionalen Whisper-Captions, zeigt höchstens einen
Hinweis mit 15-s-Cooldown pro Typ und stoppt bei mehr als 15 s Rückstand.
Vollständige Analyse und wortbasierte Merkmale bleiben nach dem Stoppen.
Zusätzlich zählt der Browser während der Aufnahme Pausen live
(`SpeechEvaluator` in `frontend/src/features/live/speech.ts`, nur Regeln
`pause-quiet` und `pause-frequent`): eine Pause zeigt sich nach 2 s Stille
sofort, noch während der Stille; mehr als 3 Pausen ≥ 2 s in einem gleitenden
30-s-Fenster ergeben „Too many pauses“ (Nutzerwahl, Heuristik, nicht validiert).
Stille liegt unter der Mitte zwischen 10. und 90. Pegel-Perzentil der letzten
15 s (ab 8 dB Abstand), ohne Stimmkalibrierung, weil das Mikro ohne Gain Control
oft unter −50 dB bleibt; Energie statt Silero. Der späte Server-Pausenhinweis entfällt
dann; Server-Pausen bleiben im Review. Schalter: Sprachfeedback „Pauses“.
Benchmark auf dem M5 Pro/24 GB: synthetischer 30-s-Stream mit 80–182 ms
Signal-Verarbeitungs-/Lieferzeit zusätzlich zum 5-s-Sammelintervall.
Echtes Mikrofon/Safari und Genauigkeit sind damit nicht abgenommen.

Start, Smoke-Test und IDE-Einrichtung: `backend/README.md`. Persistente Volumes
sind derzeit nur für synthetische Entwicklungsdaten vorgesehen. Die
Zielarchitektur muss bei der Umsetzung auch mit `docs/01-product.md`
abgeglichen werden; dort stehen die Features und offenen Entscheidungen.

## 7. Git-Workflow

Nach abgeschlossenen Änderungen die relevanten Prüfungen ausführen, die
Änderungen committen und zum zugehörigen Remote-Branch pushen. Das ist die
ausdrückliche Arbeitspräferenz des Nutzers. Neue Remote-Änderungen integrieren
und dabei auftretende Merge-Konflikte lösen; bestehende Teamarbeit erhalten.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deepgram-Live-Transkription (24.10.2026)

Nutzer hat Cloud-Streaming zum Verkürzen der Wartezeit nach Stop beauftragt und
Deepgram als einfachsten Integrationspfad bestätigt. Web: Verbindung vor
Aufnahmestart, finales PCM-Paket flushen, auf finales `words` + `done` warten;
`live_transcript` im Analyse-Upload spart die erneute Batch-ASR. Schlüssel nur
serverseitig in `.env`; ohne Schlüssel oder bei unvollständigem Stream bleibt
Whisper der lokale Ersatzweg. Signal-Analyse und Upload bleiben nach Stop nötig.
Details: `backend/app/transcription/README.md`. Keine Genauigkeits- oder
Latenzzusage aus den synthetischen Protokolltests ableiten.

## Review und ElevenLabs (24.10.2026)

Web-Review: zwei Hauptansichten, **Review moments** mit zeitgenauen Anmerkungen
und begrenzter Wiedergabe im lokalen Vollvideo, **Practice questions** mit einer
Frage pro Schritt. Transkript, Quellencheck und Exporte sind aufklappbare Details.
Auf Nutzerwunsch ist die Web-Fragerunde nur noch ein ElevenLabs-Sprachdialog;
„Practice by typing“ ist entfernt. Die bestehende Fragen-/Antwort-API bleibt
kompatibel. Schnelleres Sprechen beim konfigurierten Eleven v4 Turbo über
`[rushed]` im Prompt und First-message-Override, ohne numerische Tempozusage;
Audio-Tags werden aus dem sichtbaren Gespräch entfernt.
Vor der Aufnahme stehen Material-Upload und drei Präsentationstypen bereit:
`startup`, `thesis`, `school`. `nonprofit` bleibt nur für bestehende Aufnahmen
kompatibel und wird nicht mehr zur Auswahl angeboten. `sourceCollectionId` und
`presentationMode` werden im Take festgehalten und an beide Fragepfade übergeben.
ElevenLabs ist auf Nutzerwunsch als optionaler Sprachdialog integriert; Nutzer
konfiguriert `ELEVENLABS_API_KEY` und `ELEVENLABS_AGENT_ID` selbst. Kontext als
Celery-Job, Signed URL serverseitig, SDK im Browser. Getippte Fragen nutzen das konfigurierte Gemini-Modell (Cloud). Sprachreaktionen sind nicht zitateverifiziert; die Auswertung nach der getippten Runde ist ein Client-Heuristik-Score aus gemessenen Events (siehe Abschnitt 6, Frage-Simulator).
Bei unzureichenden Upload-Auszügen nutzt der ElevenLabs-Agent das Webhook-Tool
`search_web` (Tavily, Secret im ElevenLabs-Konto) für gezielte öffentliche
Sachfragen. Webquellen werden benannt; Suchfehler/fehlende Belege bleiben offen.
Vorlage: `templates/elevenlabs-web-search.json`; keine API-Keys im Browser/Prompt.
Einrichtung und offene Grenzen: `docs/07-review-and-agent.md`.

## Datenbasierter Kurzreview-Fallback (24.10.2026)

Web-Kamera-/Sprachreview nutzt feste Erklärungen und konkrete Übungsschritte
aus den erhobenen Events, ohne LLM-Abhängigkeit. Stärken und Verbesserungen
sind gemeinsam sichtbar. Positive Evidenz: ASR-Pause mit belegter Satzgrenze
oder bereits quellengeprüfte gestützte Aussage; fehlende Warnungen sind kein
Lob. Die persistente Take-Review füllt `interpretation`, `nextAction` und
belegte `strengths`. Fehlende Modellkonfiguration, Anbieterfehler oder
verworfene Modellformulierungen ergeben einen abgeschlossenen Review-Job mit
Template-/Teilfallback; `generator`, `limitations` und Verifikationsdaten
benennen den Ersatz. Anbieterfehler werden nicht erneut angefragt.
Cloud-Einwilligung wird vor dem tatsächlichen Aufruf erneut geprüft.
Details: `docs/07-review-and-agent.md`, `docs/06-backend-review-api.md`.

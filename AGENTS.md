# AGENTS.md — Hackathon Fulda 2026

Einstiegspunkt für Menschen und Agents. Hackathon-Regeln, Deadlines und Bewertung: `docs/00-requirements.md`. Features und offene Punkte: `docs/01-product.md`. Grafische Architektur-Übersicht (Mermaid): `docs/03-architecture.md`. Pose-Research-Ziele und Integrationsstand: `docs/04-pose-tracking-requirements.md`.

## 1. Projekt

**Live-Präsentationstrainer** (8. Hackathon Fulda, 24.–25.10.2026, Thema Future Education): analysiert Auftritt und Sprache, macht Feedback timestamp-genau zurückspulbar und fragt danach gezielt nach. Web-App für Laptop und Smartphone, öffentliche URL, kein Login.

| # | Feature | Inhalt |
|---|---|---|
| 1 | Posture / Gesture / Eye Tracking | Pose- und Gesten-Landmarks aus der Kamera; Kopforientierung als Proxy (kein Gaze); Regeln darauf erzeugen Events (z. B. „Haltung auffällig“) |
| 2 | Transkription + Fact-Check | Transkript mit Wort-Timestamps; Abgleich der Aussagen per RAG mit vorab hochgeladenen Quellen (PDF, PPTX, …); Web-Fetch-Agent als Zweitquelle |
| 3 | Sprechmerkmale | Tempo, Pausen, Zögern, Füllwörter, Lautstärke (zu leise/laut), Tonhöhenvariation (monoton); live Hinweise während des Vortrags |
| 4 | Timestamp-Review | Events auf einer Timeline; Klick springt zur Stelle und spielt den Clip des Events ab |
| 5 | Frage-Simulator | Agent stellt nach der Präsentation Fragen, abgeleitet aus Transkript, Quellen und Fact-Check-Funden |

**Leitplanken:** nur diese fünf Features; keine erfundenen Scores, Schwellenwerte oder Genauigkeiten; keine Emotions-/Persönlichkeits-/Notenbewertung; nur synthetische Demo-Daten; „In unserem Prototyp …“ statt „validiert“.

## 2. Ablauf

1. **Vorbereitung:** Nutzer lädt Quellen hoch (PDF, PPTX, Text). Backend zerlegt sie in Chunks mit Quelle und Seite/Folie und legt sie für die Suche ab.
2. **Aufnahme:** Kamera und Mikro laufen. Im Browser erzeugt MediaPipe live Pose-Landmarks und einen Kopforientierungs-Proxy, daraus entstehen Events; das Mikro liefert den Pegel.
3. **Upload:** Nach dem Stoppen wird die komplette Aufnahme hochgeladen.
4. **Analyse (Backend):** Transkription mit Wort-Timestamps, Sprechmerkmale, Fact-Check. Pro Event wird ein kurzer Clip geschnitten, die Aufnahme danach gelöscht.
5. **Review:** Timeline über alle Events; Klick spielt den Clip, ggf. mit Skelett-Overlay.
6. **Frage-Simulator:** Der Agent stellt gezielte Rückfragen, vor allem zu Widersprüchen und Lücken aus dem Fact-Check, und vergleicht die Antworten mit den Quellen.

## 3. Tech-Stack

**Entschieden (Zielarchitektur; aktueller Umsetzungsstand in Abschnitt 6)**

| Schicht | Technik |
|---|---|
| Frontend | Next.js (App Router) + TypeScript; Kamera, MediaPipe und `MediaRecorder` laufen ausschließlich client-seitig |
| Backend | Python 3.12 + FastAPI |
| Hintergrundjobs | Celery-Worker; Redis als Broker und temporäres Result-Backend (Docker Compose) |
| Datenbank | Postgres mit `pgvector` (Docker Compose): Sessions, Events, Transkript, Quellen-Chunks + Embeddings |
| Objektspeicher | MinIO, S3-kompatibel (Docker Compose): Uploads, Event-Clips, Snapshots; Browser lädt per Presigned URL direkt hoch |
| Pose / Gesten / Blick | `@mediapipe/tasks-vision` im Browser: PoseLandmarker und optionaler HandLandmarker für Fingertracking; Pocket nur Dev; FaceLandmarker (Iris) nicht MVP |
| Capture | `getUserMedia` + `MediaRecorder`; Web Audio (`AudioWorklet` / `AnalyserNode`) für Live-Pegel |
| Medien-Verarbeitung | `ffmpeg` im Backend: Clips schneiden, WebM/MP4 remuxen (seekbar machen) |
| Transkription | Lokales Whisper (`faster-whisper`) hinter einem `Transcriber`-Interface (`{word, start_ms, end_ms}` + Text), Deepgram EU als wählbarer Live-Stream mit Wiederverwendung der finalen Wörter; Anbieter bleibt austauschbar |

**Vorschläge, noch zu bestätigen** (Bestätigung im `docs/02-ai-decision-log.md` festhalten; Vorlage: `templates/ai-decision-log.md`)

- **Transkription:** Stufe A (umgesetzt): Audio nach dem Stoppen hochladen, Wort-Timestamps und Text zurück. Standard ist lokales `faster-whisper` (deutsch), damit keine Audiodaten an einen Cloudanbieter gehen; Deepgram bleibt als optionaler Adapter verfügbar. Stufe B: optionale Live-Transkript-Vorschau im Web umgesetzt (`WS /speech/live` mit PCM aus dem `AudioWorklet`, ein Live-Slot pro Prozess, `WHISPER_LIVE_*`-Konfiguration); Browser-Sender in `frontend/src/features/live/captions.ts`, aktivierbar unter Recording options. Im Web ist zusätzlich Deepgram EU live wählbar (im Backend-Modus standardmäßig an, `DEEPGRAM_API_KEY` erforderlich): finales Live-Transkript mit Wort-Timestamps wird ohne erneute ASR im Review verwendet; bei Ausfall weiterhin lokaler Batch-Pfad. Der Datenschutzhinweis benennt Deepgram. Die lokale Whisper-Vorschau ersetzt keine Batch-Wort-Timestamps. Whisper lässt Füllwörter oft weg; deutsche Füllwortqualität ist ungeprüft. Wort-Timestamps sind vorhanden.
- **Embeddings:** umgesetzt mit lokalem `jinaai/jina-embeddings-v2-base-de` (Deutsch/Englisch, FastEmbed/ONNX) hinter einem austauschbaren `Embedder`-Interface; Retrieval-Qualität mit echten Dokumenten noch nicht gemessen.
- **Fact-Check und Frage-Agent:** auf Nutzerwunsch lokal und ohne API-Schlüssel: Ollama mit `qwen3.5:4b-q4_K_M` für beide Aufgaben. JSON-Schema, Satzverweis-/Zitatprüfung im Code; Details in `docs/06-local-coaching.md`. Web-Zweitquelle über Team-API vorhanden, für den lokalen Standard aus; kein eigenes Scraping.
- **Stimme (live, im Browser):** Lautstärke per RMS, Tonhöhe per F0-Schätzung (YIN/McLeod) im `AudioWorklet`, Tempo als Silbenrate aus der Energie-Hüllkurve. Alles relativ zu einer Kalibrierung (ca. 3 s normales Sprechen), F0 in Halbtönen zum Kalibrierungs-Median. Monotonie = geringe Tonhöhenvariation im gleitenden Fenster, keine Aussage über Emotion. `getUserMedia` mit `autoGainControl`, `noiseSuppression`, `echoCancellation` = false. Exakte WPM, Pausen und Füllwörter kommen nach dem Upload aus den Wort-Timestamps.
- **Hosting:** Nutzer bestätigt lokale Vorführung auf `localhost`; kein öffentliches Deployment nötig. Für andere Geräte/öffentliche Hosts bleibt HTTPS für `getUserMedia` erforderlich.
- **Safari/iOS** früh auf echtem Gerät testen (andere Container-Formate, `MediaRecorder` liefert MP4 statt WebM).

**Offen:** belastbare Schwellenwerte, automatische Aufbewahrungsdauer/Cleanup, Füllwortqualität, Fact-Check-Quellen im Web, automatisches Antwortende per Stille-Erkennung, Produktname. Umgesetzt: Post-Transkription lokal und Text-Fragerunde mit Quellenvergleich ohne Noten.

## 4. Architektur

**Pflicht bei Architektur-Änderungen:** Die Mermaid-Diagramme in `docs/03-architecture.md` (Systemübersicht, Compose-Deployment, Sprech­analyse-Flow, RAG-Pipeline, Frontend-Routen, Mobile-Screens, Datenmodell, Event-Modell, API-Endpunkte) sind Teil dieser Datei und immer mitzupflegen. Sobald sich Services in `compose.yaml`, Endpunkte/Routen, Pipelines, Datenmodell oder das Event-Schema ändern, die betroffenen Diagramme im selben Change aktualisieren.

```
Browser (Next.js, TS)
 ├─ Kamera → MediaPipe Pose + Hand (Fingertracking, Pocket nur Dev) → Regeln → Events + Landmarks [live, lokal]
 ├─ Mikro  → AudioWorklet → Pegel, F0, Silbenrate → Regeln → Events + Live-Hinweis [live, lokal]
 └─ MediaRecorder → komplette Aufnahme ──(Presigned URL)──► MinIO
                                                     │
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
                  ffmpeg: Clip + Snapshot pro Event, Original löschen
                                   ▼
        Postgres (Sessions, Events, Transkript, Chunks)   MinIO (Clips, Snapshots, Uploads)
                                   ▼
                    Review-UI: Timeline über gemeinsame Zeitachse
```

### Event-Schema (Vertrag zwischen Frontend und Backend)

Jede Analyse schreibt in dasselbe Schema; die Timeline liest nur dieses.

```
Event {
  session_id, id,
  t_ms          // relativ zum Aufnahmestart
  duration_ms,
  type          // posture | gesture | gaze | filler | pause | pace | volume | pitch | fact | question
  severity      // info | hint | warning
  source        // browser | asr | speech | factcheck | agent
  clip_key?, snapshot_key?   // Objektspeicher
  payload       // typabhängig: Landmarks, Wort, Quelle + Zitat, Frage …
}
```

### Regeln

- **Gemeinsame Zeitachse:** Alle Events tragen `t_ms` relativ zum Aufnahmestart. Der Landmark-Takt wird an `MediaRecorder.onstart` verankert (`performance.now()`), das Review nutzt nur `video.currentTime`.
- **Live-Feedback:** Browser-Regeln (Pose und Stimme) zeigen während der Aufnahme einen dezenten Hinweis (z. B. „Tempo hoch“, „Stimme monoton“, „zu leise“), ohne Score und ohne Note. Damit er nicht ablenkt: Mindestdauer der Abweichung, Cooldown pro Hinweis-Typ, höchstens ein Hinweis gleichzeitig, abschaltbar. Jeder Hinweis erzeugt zugleich ein Event für die Timeline. Schwellenwerte sind Konfiguration relativ zur Baseline und als „Heuristik“ gekennzeichnet.
- **Pose-Events:** Regeln auf Landmark-Winkeln, kalibriert gegen eine Baseline (erste Sekunden neutrale Haltung), mit Mindestdauer gegen Flackern. Schwellenwerte sind Konfiguration und im UI als „Heuristik“ gekennzeichnet. Kamera-Framing: Oberkörper muss sichtbar sein, sonst Hinweis statt Auswertung.
- **Clips statt Vollvideo:** Das Backend schneidet pro Event ein Fenster (ca. 5 s vor/nach, mit Re-Encode für präzise Schnitte) plus Snapshot-Frame und löscht die Originalaufnahme. Aufnahme vorher remuxen, weil `MediaRecorder`-WebM nicht seekbar ist.
- **Fact-Check:** (1) LLM extrahiert prüfbare Aussagen mit Timestamp aus dem Transkript, (2) Top-k-Chunks pro Aussage aus pgvector, (3) LLM urteilt mit wörtlichem Zitat, (4) Code prüft per String-Match, dass das Zitat im Chunk steht. Drei Ergebnisse: *stützt*, *widerspricht*, *in den Quellen nicht gefunden*. Letzteres ist nicht „falsch“. Web-Fetch kommt erst danach als Zweitquelle.
- **Frage-Agent:** Eingabe sind Transkript, Quellen-Chunks und die Fact-Check-Funde. Er fragt gezielt nach Widersprüchen und Lücken und vergleicht Antworten mit den Quellen. Ausgabe ohne Punkte oder Noten.
- **Fallback:** Fällt Modell, API oder Kamera aus, spielt die App eine vorberechnete Beispiel-Session deterministisch ab. Sie ist zugleich der Standard-Einstieg für den Produktreview (Wert in unter 3 Minuten), Live-Aufnahme ist der zweite Pfad (30–60 s reichen).
- **Datenschutz:** Demo-Daten synthetisch. Live-Aufnahmen der Jury sind echte personenbezogene Daten: Einwilligungshinweis, Originalaufnahme nach der Verarbeitung löschen, Drittanbieter-APIs benennen (relevant für die KI-Reflection).
- **Daten und Secrets:** Ziel sind Postgres mit pgvector und MinIO; der vorhandene Compose-Stack ist in Abschnitt 6 beschrieben. Secrets nur in `.env`, nicht committen.
- **Hintergrundjobs:** Lange Backend-Arbeiten (z. B. Transkription, Ingest, Clips) als Celery-Tasks ausführen. Async-API-Routen publizieren über `app.jobs.enqueue_task` und geben eine Job-ID zurück; im Request nicht auf das Ergebnis warten. Nur IDs/Object-Keys in Redis, Medien in S3. Tasks müssen bei erneuter Zustellung sicher wiederholbar sein.
- **Layout (Ziel):** `frontend/` (Next.js), `backend/` (FastAPI); die vorhandene Compose-Datei heißt `compose.yaml`.

## 5. Priorität

1. Aufnahme → Upload → Transkript → Events → Timeline mit Clip-Sprung (Rückgrat, Features 2a und 4).
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
templates/
  ai-decision-log.md               # Vorlage für die AI Reflection
  team-roles.md                    # Rollen, Gates, RACI
```

Das lokale Grundgerüst startet aktuell FastAPI mit FFmpeg,
einen separaten Celery-Worker, Redis, PostgreSQL **mit pgvector** und
**SeaweedFS als S3-Speicher**. Die Queue wird mit einem synthetischen Job geprüft; Audio-/ASR-Jobs und
Job-Status-Endpunkte sind implementiert (Details: `backend/README.md`). MinIO und
die vollständige Aufnahme-/Clip-/Review-Pipeline aus der Zielarchitektur sind
noch nicht umgesetzt. Quellen-Upload und Retrieval (RAG) sind umgesetzt
(`backend/app/sources/`, Frontend-Seite `/sources`): PDF/PPTX/DOCX/TXT/MD →
Chunks mit Seite/Folie → lokale Embeddings (`jina-embeddings-v2-base-de`) →
Hybrid-Suche (pgvector + deutsche Volltextsuche). Der Fact-Check ist umgesetzt
(`backend/app/factcheck/`, `POST /factcheck`, Review-Panel in `/live/[id]/review`):
LLM extrahiert Aussagen mit Satznummern, Timestamps kommen aus den Wörtern;
pro Aussage zuerst Retrieval in den hochgeladenen Quellen, danach optional
Websuche (Wikipedia/Tavily); Zitate werden per `quote_in_text` geprüft,
Ergebnisse sind `fact`-Events. LLM standardmäßig lokal über Ollama; optional OpenAI-kompatibel.
Der Frage-Simulator ist umgesetzt (`backend/app/questions/`, `POST /questions`,
`POST /questions/answers`, Panel in `/live/[id]/review`): Fragen aus
Fact-Check-Funden (Widerspruch, nicht belegt), Lücken gegenüber den Quellen und
unklaren Stellen; `t_ms` und Evidenz kommen aus Verweisen, nicht vom Modell.
Getippte Antworten werden mit den Quellen verglichen (Zitat-Prüfung, optionale
Nachfrage), ohne Punkte oder Noten; Fragen mit gesprochener Stelle sind
`question`-Events. Voice-Agent: Rolle `student` (neugieriger Erstsemester) oder
`tutor` (Professor/Tutor) wählbar; der Browser liest Fragen und Reaktionen per
`speechSynthesis` vor, gesprochene Antworten gehen über
`POST /questions/answers/voice` an den konfigurierten Transcriber (standardmäßig lokales Whisper) und werden danach wie getippte
Antworten gegen die Quellen geprüft. Im Live-Studio lässt sich die
Transkription (lokales Whisper) vor der Aufnahme zuschalten; die Wörter sind Eingabe
für den Fact-Check. Das Next.js-Frontend läuft in einem
eigenen Compose-Container; `/api/...` wird intern an FastAPI weitergeleitet.
Lokale Pose-Landmarks lassen sich im Kamera-Studio als JSONL exportieren;
Darauf laufen lokale, kalibrierte Gesten-/Haltungsheuristiken (Hand hoch,
Hände zusammen, Arme verschränkt, seitliche Neigung/Position) mit
Live-Hinweis, Review-Markern und Evidenz-Export. `/gestures` zeigt denselben
Regelablauf mit synthetischen Landmarks; keine Genauigkeitsvalidierung.
Recherche und Regeln: `docs/04-gesture-evaluation.md`; Jury-Abnahme und
noch offene Geräte-Gates: `docs/05-jury-demo.md`. Nutzerentscheidung:
lokale Vorführung reicht; kein öffentliches Deployment erforderlich.
Eye Contact wird nicht aus Pose-/Iris-Punkten behauptet.
Der integrierte Web-Worker startet standardmäßig mit Lite/VIDEO. Unter
„Analysis features“ sind IMAGE/VIDEO sowie Lite/Heavy unabhängig auswählbar;
GPU-first mit CPU-Fallback bei Start- oder Laufzeitfehlern, kein Modellwechsel.
JSONL/Event-Payload enthalten `runtime` (Modell, Modus, Delegate). VIDEO-Logs
enthalten zeitlich geglättete Modell-Ausgaben; IMAGE-Logs unabhängige Frames.
Pose Lab T1–T12 bleibt ein Dev-Werkzeug. Fingertracking ist separat unter
„Track fingers“ schaltbar, standardmäßig an und auf höchstens 5 Hz begrenzt;
es funktioniert auch ohne sichtbaren Torso. Es erzeugt keine Pocket-Events.
Die Haltungsreferenz kalibriert ohne Hand-Stillhaltepflicht. Fehlende neutrale
Handreferenzen bleiben im Payload `null`; Gesten nutzen dann Schultergeometrie.
Die tolerantere Arm-Geometrie verwendet weiter 2 s Hold / 20 s Cooldown.
Sprachfeedback ist insgesamt und für Pausen, Tempo, Füllwörter, Lautstärke und
Tonhöhe einzeln schaltbar. „Live · in browser“ ist Standard: Kamera/Mikro bleiben
lokal, ein AudioWorklet liefert RMS/YIN und einen Energiehüllkurven-Tempo-Proxy.
Pausen, Lautstärke, Tonhöhenvariation und Rhythmus erscheinen während der Aufnahme.
„Off · gestures only“ schaltet das Mikro aus. Der Backend-Modus nutzt den separaten
Signal-Stream unten; Füllwörter und Wort-Tempo bleiben nachgelagert. Live-Captions
sind separat. Schalter werden pro Aufnahme gespeichert und sind währenddessen gesperrt.
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
Sprachaktivität; RMS und YIN bleiben erhalten, Standard-Kalibrierung 3 s. Die Umstellung des Speichers
ist eine separate Implementierungsaufgabe.

Live-Sprechfeedback ist im Web-Backend-Modus umgesetzt: `WS /speech/feedback`
analysiert Mikrofon-PCM alle 5 s mit denselben Signalregeln und 3-s-Baseline.
Ein Live-Slot pro API-Prozess, maximal 5 min; PCM nur im RAM. Die Vorschau
läuft unabhängig von optionalen Whisper-Captions, zeigt höchstens einen
Hinweis mit 15-s-Cooldown pro Typ und stoppt bei mehr als 15 s Rückstand.
Vollständige Analyse und wortbasierte Merkmale bleiben nach dem Stoppen.
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

# Architektur – Pitch Coach (Live-Präsentationstrainer)

> Grafische Darstellung des Projekts als Mermaid-Diagramme.
> Generiert aus der Codeanalyse: `frontend/`, `backend/`, `api/`, `compose.yaml`.

## Code-Einstieg für die Jury

Die Anwendung ist ein modularer Python-Service mit einem separaten Worker.
Die Verzeichnisse `speech`, `transcription`, `sources`, `factcheck`, `questions`
und `review` trennen Fachlogik, Router und Datenverträge. Sie sind keine eigenen
Microservices. Gemeinsame Infrastruktur liegt in `connections.py`, `jobs.py`
und `job_storage.py`; Fachmodule hängen für Job-Speicherung nicht von `speech` ab.

| Dienst | Aufgabe und Grund |
| --- | --- |
| `frontend` | Next.js-Standalone-Server mit statischen Assets; Kamera, Pose und Wiedergabe laufen im Browser |
| `backend` | FastAPI: validiert Requests, liefert Status und stellt Jobs in die Queue |
| `worker` | Führt ASR, Embeddings und Quellenprüfung aus, ohne HTTP-Requests zu blockieren |
| `beat` | Ein einzelner Scheduler für die tägliche Retention; nutzt dasselbe Backend-Image |
| `redis` | Celery-Broker, kurzlebige Ergebnisse und begrenzte Fragerunden |
| `postgres` | Strukturierte Daten und Quellen-Chunks mit pgvector; zusätzliche persistente Review-/Progress-API |
| `storage` | SeaweedFS: Quellen-Originale, temporäre Analyse-Uploads, Job-Requests und Ergebnisse; aktiv benötigt |

**Datenfluss im aktuellen Web:** `features/live/recorder.ts` →
`transport.ts` → `/speech/analyze` → Worker → Review-Adapter.
`LiveSessionProvider.tsx` und `recording-storage.ts` speichern das lokale Video
und die Ergebnisse in IndexedDB. Quellen und Quellenprüfung sind angebunden.
Neue Web-Aufnahmen schreiben noch nicht in die persistente Session-/Take-API;
`/progress` bleibt eine separate API- und Beispielansicht ohne diese Verbindung.
Ein lokales Löschen entfernt deshalb keine separaten Backend-Daten.

**Jury-Betrieb:** Alle Anwendungskomponenten laufen aus gebauten Images, ohne
Source-Mounts oder Hot Reload. Nach Backend-Änderungen API, Worker und Beat
zusammen neu bauen. Der Frontend-Healthcheck prüft `/` und die API-Bereitschaft;
`npm run test:smoke` prüft zusätzlich Produktrouten, Stage und Medien-Assets.
`/stage` nutzt standardmäßig eine lokale Aufnahme ohne Medien-Upload.

**Lesereihenfolge:** [Produktumfang](01-product.md) →
[Integration](04-integration.md) → diese Diagramme →
[Grenzen und offene Abnahme](14-open-todos.md).
Research-Dokumente 07–09 beschreiben auch untersuchte Alternativen; der
implementierte Dialog steht in [Review und Agent](07-review-and-agent.md).

## 1. Systemübersicht

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        WEB["Web-Frontend<br/>Next.js 16 / React 19 / TS<br/>Port 3000"]
    end

    subgraph ClientAI["KI im Client (lokal, kein Upload)"]
        MP_W["MediaPipe Pose: Lite / Heavy<br/>VIDEO (Standard) / IMAGE<br/>GPU-first, CPU-Fallback; max. 10 Hz"]
        MR["MediaRecorder<br/>Video + Audio"]
    end

    WEB -->|"LiveSessionProvider: abgeschlossene Takes und Review-Updates"| IDB["Browser IndexedDB<br/>Video, Pose-Log, Transkript, Feedback,<br/>Fragen, Antworten, Gespräch"]
    IDB -->|"Nach Reload: Blob-URLs neu erzeugen"| WEB

    subgraph API["api/ - Geteilter API-Vertrag"]
        OAS["openapi.json + schema.d.ts<br/>generiert aus FastAPI"]
    end

    subgraph Backend["backend/ - FastAPI (Python 3.12) Port 8000"]
        MAIN["FastAPI App<br/>Health, CORS, Router"]
        SP["Speech-Router<br/>POST /speech/analyze<br/>GET /speech/jobs/id<br/>WS /speech/live, /speech/feedback"]
        TR["Transcription-Router<br/>POST /transcription/analyze-words"]
        SO["Sources-Router<br/>/sources CRUD + /sources/search"]
        FC["Factcheck-Router<br/>POST /factcheck<br/>GET /factcheck/jobs/id, /settings"]
        QR["Questions-Router<br/>POST /questions, /questions/answers,<br/>/questions/answers/voice<br/>GET /questions/jobs/id, /questions/answers/id"]
        RV["Review-Router (additiv)<br/>/sessions, /takes, /jobs<br/>Idempotency-Key, camelCase<br/>verknüpft: X-Profile-Token"]
        PR["Progress-Router (additiv)<br/>/profiles, /progress, /goals<br/>X-Profile-Token, Idempotency-Key"]
        CEL["Celery App + Jobs"]
        TASKS["Celery Tasks<br/>analyze_speech, ingest_source,<br/>fact_check, generate_questions,<br/>review_answer, review_voice_answer,<br/>prepare_agent, run_take_job,<br/>recompute_progress, retention_sweep,<br/>worker_probe (Smoke)"]
    end

    subgraph Pipelines["Analyse-Pipelines (Worker)"]
        SIG["Signal-Analyse<br/>FFmpeg, RMS, YIN-Pitch, Silero VAD<br/>3 s stimmhafte Sprache, adaptive Referenz"]
        WORDS["Wort-Analyse<br/>Füller, Pausen, Tempo"]
        INGEST["RAG-Ingest<br/>Extrakt, Chunk, Embed"]
        EMB["Lokale Embeddings<br/>jina-embeddings-v2-base-de<br/>FastEmbed/ONNX"]
        FACT["Fact-Check<br/>Aussagen extrahieren, RAG zuerst,<br/>Web optional (Standard aus), Zitat-Check"]
        QUEST["Frage-Simulator / Voice-Agent<br/>Rolle: Student oder Professor/Tutor,<br/>Fragen aus Funden + Quellen,<br/>gesprochene Antwort -> ASR,<br/>Antwort-Abgleich mit Zitat-Check"]
        REVIEW["Take-Review<br/>Probe + Timestamp-Offset, Merge,<br/>Coverage, Evidence Cards,<br/>Template oder LLM + Code-Verifier<br/>Beobachtung, Erklärung, Übung + belegte Stärken"]
        PROG["Progress-Projektion<br/>take_quality -> take_metrics<br/>-> snapshots/change-points<br/>Theil-Sen, Mann-Kendall, CUSUM"]
    end

    subgraph Infra["Infrastruktur (Docker Compose)"]
        PG[("PostgreSQL 18<br/>+ pgvector<br/>Sessions, Progress-Profile,<br/>Metriken, Chunks")]
        RD[("Redis 8<br/>Broker DB0 / Results DB1<br/>Fragerunden mit fester TTL")]
        S3[("SeaweedFS<br/>S3-kompatibel<br/>Port 8333")]
    end

    EXT["ASR lokal: faster-whisper small<br/>CPU/int8, Deutsch<br/>Deepgram nur explizit optional"]
    LLM["LLM: Gemini (Cloud)<br/>3.1 Flash Lite / 3.8 Flash<br/>JSON-Modus, austauschbarer Adapter"]
    ELEVEN["ElevenLabs Agent, optional<br/>Live-Audio + Gespräch; serverseitiger Schlüssel"]
    WEBS["Websuche (Zweitquelle)<br/>Wikipedia-API oder Tavily"]
    ELEVEN -->|"search_web bei unzureichenden Upload-Auszügen<br/>Secret im ElevenLabs-Konto"| TAVILY["Tavily Search API<br/>Titel, URLs, Auszüge"]

    WEB -- "Kamera/Mikro" --> MP_W
    WEB -- "Aufnahme" --> MR
    WEB --> PCM["AudioWorklet: 16 kHz mono Int16<br/>Live-Sprechfeedback im normalen Studio; Stage lokal ohne Stream"]
    PCM -- "WS /api/speech/live: PCM" --> SP
    FLAGS["FeatureFlags pro Take<br/>Modell, Modus, Pose Lab,<br/>Sprachfeedback pro Typ"] --> MP_W
    MP_W -. "Track fingers, bis 5 Hz" .-> HAND["Hand Landmarker: 21 Punkte pro Hand<br/>auch ohne Torso, kein Upload"]
    HAND -. "Pose Lab" .-> LAB["T1–T12, lokale Diagnose<br/>6 zusätzliche Live-Regeln mit Events"]

    SP -- "finale Wörter + Text; vorher vorläufiger Text" --> WEB
    SP -- "nur bei provider=deepgram; PCM, serverseitiger Schlüssel" --> DG["Deepgram EU Nova-3<br/>Deutsch, live + Wort-Timestamps"]
    DG -- "vorläufig/final, CloseStream-Abschluss" --> SP
    PCM -- "WS /api/speech/feedback: PCM" --> SP
    SP --> LIVE_SIG["API-Thread: gleiche Signalregeln je ≥5 s neues PCM<br/>Adaptive Referenz ab stimmhafter Sprache<br/>max. 5 min, ein Slot; PCM nur im RAM"]
    LIVE_SIG -- "feedback: position_ms + alle qualifizierenden Events" --> WEB
    WEB --> HINT_FILTER["Client: ein Hinweis gleichzeitig,<br/>15-s-Cooldown pro Typ, 10-s-Frische"]
    MP_W --> RULES["PoseEvaluator: Neutralstellung, Geometrie, Mindestdauer<br/>posture/gesture-Events; lokale Evidenz"]

    WEB -- "fetch: /speech, /sources,<br/>/transcription, /factcheck,<br/>/questions, /profiles, /health" --> MAIN
    WEB -. "Typen" .-> OAS
    OAS -. "Quelle der Wahrheit" .-> MAIN

    MAIN --> SP
    MAIN --> TR
    MAIN --> SO
    MAIN --> FC
    MAIN --> QR
    QR -->|"GET /questions/pitch; PITCH_MODE"| FIXED["Feste Jury-Frage + vorbereitete Referenz<br/>kein Retrieval, kein geprüftes Quellenzitat"]
    MAIN --> RV
    MAIN --> PR
    RV -- "Session/Take/Event/Review/Job" --> PG
    RV -- "nur temporärer Analyse-Upload" --> S3
    RV -- "enqueue: nur Job-ID" --> CEL
    BEAT["Celery Beat: 03:15 UTC"] -->|"retention_sweep"| CEL
    TASKS --> RETENTION["Retention: begrenzte Batches,<br/>Profil nur entkoppeln,<br/>Blob-Outbox nach Commit leeren"]
    RETENTION -->|"retention_runs, blob_deletions"| PG
    RETENTION -->|"S3 Delete; Fehler mit Backoff"| S3
    QR -->|"kanonische Frage, reservierte Turns,<br/>Review-Cache, TTL ohne Verlängerung"| RD
    QUEST -->|"kurzer Runden-Lock; kein Modellaufruf im Lock"| RD
    PR -- "Profil, Qualität, Metriken, Ziele" --> PG
    PR -- "deterministische Projektion" --> PROG
    PR -- "Recompute: nur Run-ID, 202 + Status-URL" --> CEL
    PROG -- "Snapshots + Change-Points" --> PG

    SP -- "S3-Upload, Enqueue" --> S3
    SP -- "enqueue" --> CEL
    SO -- "S3-Upload, Enqueue" --> S3
    SO -- "enqueue" --> CEL
    FC -- "Request in S3" --> S3
    FC -- "enqueue" --> CEL
    QR -- "Request in S3" --> S3
    QR -- "enqueue" --> CEL

    CEL --> RD
    RD --> TASKS
    TASKS --> SIG
    TASKS --> WORDS
    TASKS --> INGEST
    TASKS --> FACT
    TASKS --> QUEST
    TASKS --> REVIEW
    TASKS -- "progress_runs: persistent, wiederholbar" --> PROG
    REVIEW --> PG
    REVIEW -- "Audio laden und löschen; keine Wiedergabe-Medien" --> S3
    REVIEW -. "nur geprüfte Karten, keine Tools" .-> LLM
    QUEST -- "Auszüge für Lücken<br/>und Antwort-Abgleich" --> PG
    QUEST -. "Sätze, Funde, Auszüge,<br/>getippte Antwort" .-> LLM
    QUEST -- "Ergebnis, Request löschen" --> S3
    TASKS --> AC["prepare_agent: Modus + Transkript<br/>Hybrid-Retrieval aus gespeicherter Collection"]
    AC --> PG
    AC --> S3
    QR -- "Signed URL anfordern" --> ELEVEN
    WEB -- "Signed WebSocket: Mikrofon + Kontext" --> ELEVEN
    FACT -- "Hybrid-Suche je Aussage" --> PG
    FACT -. "Transkript-Sätze, Auszüge" .-> LLM
    FACT -. "Suchanfragen, nur wenn<br/>Quellen nichts belegen" .-> WEBS
    FACT -- "Ergebnis, Request löschen" --> S3
    INGEST --> EMB
    WORDS -. "nur ohne finales live_transcript; transcribe=true" .-> EXT
    SIG --> S3
    WORDS --> S3
    INGEST --> PG
    INGEST --> S3
    SO -- "Hybrid-Suche<br/>Vektor + Keyword" --> PG
    MAIN -- "Health: Query, Ping, Bucket" --> PG
    MAIN -- "Health: Ping" --> RD
    MAIN -- "Health: Bucket" --> S3
```

## 2. Docker-Compose-Deployment

```mermaid
flowchart LR
    subgraph Host["docker compose (localhost only)"]
        FE["frontend<br/>Next.js Production-Build :3000, kein Source-Mount<br/>Stage-Flags und API-Rewrite zur Build-Zeit<br/>Standalone-Runtime; Health: Startseite + Backend"]
        BE["backend<br/>einziger Builder des gemeinsamen Images<br/>uvicorn :8000, gebaute Quellen und Templates<br/>kein Source-Mount, kein Hot Reload"]
        WK["worker<br/>verwendet Backend-Image, kein Pull<br/>Celery, Default-Concurrency 1"]
        BT["beat: ein Scheduler<br/>gemeinsames Backend-Image<br/>03:15 UTC -> retention_sweep"]
        PG[("postgres<br/>pgvector :5432<br/>Volume: postgres_data")]
        RD[("redis :6379<br/>AOF, noeviction<br/>Volume: redis_data")]
        ST[("storage<br/>SeaweedFS :8333<br/>Volume: media_data")]
    end

    User(("Browser am<br/>Demo-Laptop")) -->|"Port 3000"| FE
    FE -->|"healthy"| BE
    BE -->|"postgres healthy"| PG
    BE -->|"storage healthy"| ST
    BE -->|"redis healthy"| RD
    BT -->|"backend healthy"| BE
    BT -->|"redis healthy; periodischer Auftrag"| RD
    WK -->|"backend healthy vor Start"| BE
    WK -. "Runtime-Verbindungen über x-backend-Umgebung,<br/>keine eigenen Health-Gates" .-> PG
    WK -.-> ST
    WK -.-> RD
    WK -. "LLM_BASE_URL / LLM_MODEL<br/>(Gemini, OpenAI-kompatibel)" .-> LLM(["Gemini; austauschbarer Adapter"])
    BE -. "ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID<br/>(x-backend: BE + WK, wie alle LLM-/ASR-Variablen)" .-> EL(["ElevenLabs; Voice optional"])
    User -. "Signed WebSocket" .-> EL
    WK -. "WEB_SEARCH_PROVIDER" .-> WS(["Wikipedia / Tavily"])
```

## 3. Datenfluss: Sprechanalyse (Live-Studio)

```mermaid
sequenceDiagram
    actor U as Nutzer
    participant FE as Next.js Frontend<br/>(LiveStudio)
    participant BE as FastAPI<br/>(speech/router)
    participant S3 as SeaweedFS (S3)
    participant R as Redis
    participant W as Celery Worker
    participant ASR as Whisper lokal (Ersatzweg)
    participant DG as Deepgram EU (optional)

    U->>FE: Präsentation aufnehmen (Kamera + Mikro)
    FE->>BE: GET /health/ready (10-s-Startfrist)
    BE-->>FE: Bereit, oder Abbruch vor Aufnahme mit Retry-Hinweis
    FE->>FE: FeatureFlags im Take festhalten (Lite/Heavy, VIDEO/IMAGE)
    FE->>FE: Pose-Worker GPU-first/CPU-Fallback, Fingertracking separat bis 5 Hz
    Note over FE,BE: Normales Studio mit Mikrofon, Live-Feedback und vollständigem Upload, Stage lokal ohne Upload

    FE->>FE: MediaPipe Pose lokal (Web Worker)
    FE->>BE: WS /speech/feedback: start, PCM nach ready
    loop je ≥5 s neu angekommenes PCM (meldungsbasiert, kein Timer), maximal 5 Minuten
        BE->>BE: Auf Sprache warten, danach kausale adaptive Referenz aus bisherigem Audio
        BE-->>FE: feedback: position_ms, aktuelle Events (Heuristik)
        FE->>FE: Zeitoffset zu MediaRecorder.onstart, ein Hinweis, Cooldown
    end
    Note over FE,BE: Mehr als 15 s Analyse-Rückstand: Vorschau stoppen, Aufnahme erhalten
    opt Deepgram live aktiviert (vor MediaRecorder.start verbinden)
        FE->>BE: WS /speech/live: start, provider=deepgram
        BE->>DG: WSS mit serverseitigem Schlüssel, Nova-3, Deutsch
        BE-->>FE: ready, provider=deepgram
        FE->>BE: PCM ab MediaRecorder.onstart
        BE->>DG: PCM fortlaufend, 16 kHz mono Int16
        DG-->>BE: Vorläufige und finale Abschnitte
        BE-->>FE: Kumulativer Text
        Note over FE,BE: Abbruch oder Überlast: Aufnahme läuft weiter, lokaler Ersatzweg
    end
    U->>FE: Stop
    FE->>BE: Letztes PCM-Paket flushen, danach WS stop
    opt Vollständiger Deepgram-Stream
        BE->>DG: CloseStream
        DG-->>BE: Restwörter und Abschlussmetadaten, Verbindung schließen
        BE-->>FE: Finale words, text, done
    end
    FE->>BE: POST /speech/analyze (recording, transcribe, optional live_transcript)
    Note over FE,BE: Mit finalem Cloud-Transkript local_only=false, sonst true
    BE->>S3: Original speichern
    BE->>R: Task analyze_speech einreihen
    BE-->>FE: 202 {job_id, status_url}

    W->>R: Job holen (Lock 660s)
    W->>S3: Datei laden
    W->>W: FFmpeg -> 16kHz mono, Frames 40ms/10ms
    W->>W: RMS-Pegel, Silero VAD, YIN-Pitch nur auf stimmhaften Frames, Silben-Peaks
    W->>W: 3 s stimmhafte Sprache sammeln, Referenz nur bei Sprache langsam nachführen
    Note over BE,W: Gleicher kausaler Referenzablauf<br/>Pausen/Rauschen trainieren nicht, Referenz je Event-Fenster speichern
    opt transcribe=true
        alt Vollständiges live_transcript vorhanden
            W->>W: Finale Wörter prüfen und wiederverwenden, keine erneute ASR
        else Stream aus oder fehlgeschlagen
            W->>ASR: faster-whisper small (de, word_timestamps=true)
            ASR-->>W: Text und Wort-Timestamps
        end
        W->>W: Füller, Pausen, Tempo (Wort-Analyse)
    end
    W->>W: Wortpausen mit Satzkontext behalten, überlappende Signalpausen ersetzen
    W->>W: merge_timeline, übrige Signalpausen behalten
    W->>S3: Ergebnis speichern, Original löschen

    loop Polling 1x/s (max 11 min)
        FE->>BE: GET /speech/jobs/{job_id}
        BE->>S3: Status/Ergebnis lesen
        BE-->>FE: queued / running / completed
    end
    FE->>FE: Sprachmarker nach FeatureFlags des Takes filtern (auch bei Wort-Import)
    FE->>FE: Timeline mit lokaler Aufnahme verknüpfen,<br/>Wörter speichern (Eingabe für Fact-Check), kein Server-Clip
```

### 3b. Persistente Take-Review (Backend implementiert, Client-Anbindung separat)

```mermaid
sequenceDiagram
    participant C as Client mit lokaler Aufnahme
    participant A as FastAPI Review-Router
    participant P as Postgres
    participant S as SeaweedFS
    participant Q as Redis / Celery
    participant W as run_take_job
    participant L as Optionales LLM
    C->>A: POST /sessions + /sessions/id/takes (Idempotency-Key)
    A->>P: Metadaten, Timebase, gemessene Coverage
    C->>A: POST /takes/id/events (max 500 abgeleitete Pose-Events)
    A->>P: Validierung + Upsert (take_id, dedupe_key)
    opt Audio/ASR gewünscht
        C->>A: POST /takes/id/audio (file, transcribe, config, local_only, optional live_transcript)
        A->>P: Job + idempotente Response atomar reservieren
        A->>S: Upload temporär, unter Session-Lock
        A->>Q: Job-ID
        Q->>W: run_take_job (Job-Kind audio_analyze)
        W->>S: Upload laden
        W->>W: FFprobe, Signal/ASR, Audio-Offset auf Take-Zeitachse
        W->>S: Upload in finally löschen, auch bei Analysefehlern
        W->>P: Wörter, Summaries, Events, Probe, Job completed
    end
    C->>A: POST /takes/id/review (template standardmäßig)
    A->>P: Pack-Hash prüfen, sonst Job reservieren
    A->>Q: Job-ID
    Q->>W: review_generate
    W->>P: Konsistenter Snapshot (Revision)
    W->>W: Finale Events, Pausen-Merge, Coverage, Karten, max 3 Findings + 3 belegte Stärken
    opt mode=llm
        W->>W: Konfiguration und Cloud-Einwilligung erneut prüfen
        alt Modell verfügbar und Cloud erlaubt
            W->>L: Evidence Cards + Platzhalter-Texte
            L-->>W: JSON-Auswahl oder Fehler
            W->>W: Schema/Katalog prüfen, ein Korrekturversuch, Anbieterfehler direkt zu Template
        else Keine Modellkonfiguration oder keine Cloud-Einwilligung
            W->>W: Datenbasierte Template-Review ohne Modellaufruf
        end
    end
    W->>P: review.v1 + Verification, auch Fallback completed, Eltern/Revision prüfen
    C->>A: GET /jobs/id, /takes/id/timeline, /takes/id/review
    A-->>C: Events + peakMs + Review, keine Clip-/Video-URL
    C->>C: Sprung in lokaler Aufnahme (Client-Vertrag)
    C->>A: DELETE /sessions/id
    A->>S: Noch vorhandene temporäre Uploads löschen
    A->>P: Cascade: Takes, Events, Reviews, Jobs, Idempotenz
```

## 4. RAG-Pipeline: Quellen-Ingest, Suche und Fact-Check

```mermaid
flowchart TB
    UP["Upload /sources<br/>PDF, PPTX, DOCX, TXT, MD<br/>max 25 MB, kein OCR"] --> API["Sources-Router"]
    API --> S3A[("S3: sources/id/original")]
    API --> Q["Celery: ingest_source<br/>(idempotent, Redis-Lock)"]
    Q --> EX["extract.py<br/>PDF je Seite - PPTX je Folie<br/>DOCX je Absatz/Tabelle (iter_inner_content, LocationKind table)<br/>TXT/MD je Block"]
    EX --> CH["chunking.py<br/>~1200 Zeichen, Satzgrenzen,<br/>~200 Overlap"]
    CH --> EM["embeddings.py<br/>jina-embeddings-v2-base-de<br/>768 dim, lokal ONNX"]
    EM --> PGDB[("Postgres + pgvector<br/>sources, source_chunks<br/>+ tsvector (deutsch, GIN)")]

    SEARCH["POST /sources/search"] --> RET["retrieval.py<br/>Hybrid: pgvector-Kosinus<br/>+ Volltextsuche<br/>Reciprocal Rank Fusion"]
    PGDB --> RET
    RET --> HITS["Top-k SourceHits<br/>Ort: page/slide/paragraph/table/line<br/>retrieval_score, similarity, matched_by, weak<br/>(Signale, nicht kalibriert)"]
    FCQ["Fact-Check je Aussage<br/>(app/factcheck/pipeline.py)"] -- "Suchanfrage" --> RET
    HITS --> JUDGE["LLM-Urteil mit Zitat<br/>Originalspan, exakt oder konservativ fuzzy; Fundort bindend<br/>keine Teilzahlen oder geänderte Negation/Kontraste<br/>kurze Exact-Zitate auf Satzkontext erweitert<br/>numeric_gate: Supports braucht Behauptungszahlen<br/>identischer Widerspruch: unchecked<br/>Web-Pfad kann separat urteilen"]
    JUDGE -. "keine geprüfte Evidenz<br/>(nicht belegt oder unchecked)" .-> WEBQ["Websuche als Zweitquelle<br/>(Wikipedia / Tavily)"]
    JUDGE --> EVT["fact-Events auf der Timeline"]
    HITS --> QA["Frage-Simulator<br/>(app/questions/pipeline.py)<br/>queries aus questions/retrieval.py + fuse per RRF<br/>Default 4, konfigurierbar 1–8 Queries<br/>Zahlen-Gates für Fragen, Gründe, Feedback, Nachfragen"]
    EVT --> QA
    QA --> QEVT["question-Events (source: agent)"]
```

## 5. Datenfluss: Fact-Check

```mermaid
sequenceDiagram
    actor U as Nutzer
    participant FE as Review (FactCheckPanel)
    participant BE as FastAPI (factcheck/router)
    participant S3 as SeaweedFS (S3)
    participant W as Celery Worker (fact_check)
    participant PG as Postgres + pgvector
    participant L as Gemini (JSON-Modus)
    participant WS as Wikipedia / Tavily

    FE->>BE: GET /factcheck/settings (Modell, LLM-Host, Web-Anbieter)
    U->>FE: Check facts (Wörter aus ASR oder Import, collection_id, use_web)
    FE->>BE: POST /factcheck
    BE->>BE: URL, Schlüssel und Optionen prüfen (sonst 503 vor Speicherung)
    BE->>S3: factcheck-jobs/id/request.json
    BE-->>FE: 202 {job_id, status_url}
    W->>S3: Request laden
    W->>W: Wörter → nummerierte Sätze mit Start/Ende
    W->>L: Aussagen extrahieren (nur Satznummern, kein t_ms)
    loop pro Aussage (parallel, LLM_CONCURRENCY)
        W->>PG: Hybrid-Suche in den Quellen der Collection
        W->>L: Urteil + wörtliches Zitat aus den Auszügen
        W->>W: quote_in_text prüft Zitat, sonst verworfen
        opt keine geprüfte Evidenz (nicht belegt oder unchecked) und use_web
            W->>WS: Suchanfrage (MediaWiki-API / Tavily)
            W->>L: Urteil + Zitat aus Web-Auszügen
            W->>W: Zitat prüfen
        end
    end
    W->>S3: status.json (claims + fact-Events), request.json löschen
    loop Polling 1,5 s
        FE->>BE: GET /factcheck/jobs/{job_id}
    end
    FE->>FE: fact-Momente in der Timeline, Klick spielt die Stelle ab
```

`FactCheckPanel` nutzt `evidenceHint` für `quote_verified`, `similarity`
und `weak`. Der Hinweis benennt auch
ungeprüfte Alt-Zitate und möglichen Kontext bei Kurz-Zitaten. Diese Angaben sind
keine Konfidenz- oder Wahrscheinlichkeitsanzeige; `retrieval_score` bleibt ein
Ordnungssignal. Der Web-Fragepfad bleibt der ElevenLabs-Sprachdialog.

## 5b. Datenfluss: Frage-Simulator und Voice-Agent

Der Web-Review hat zwei Ansichten: **Review moments** (begrenzte Wiedergabe-
Fenster im lokalen Video, zeitgenaue Anmerkungen) und **Practice questions**.
Auf `/sources` wird `presentationMode` (school/thesis) neben dem Upload
gewählt und im Browser gespeichert. Vor der Aufnahme werden Modus und
`sourceCollectionId` im Take eingefroren. Im Web-Sprachdialog und der
Fragen-API steuert derselbe Modus die fachlichen Schwerpunkte und die automatische Rolle:
Schul- oder Hochschullehrkraft; ohne Noten für gesprochene Antworten.
Im Web-Sprachdialog ist zusätzlich `voice_role` wählbar: Student, Professor
oder Lehrkraft ersetzen nur die Rolle, nicht den Präsentationskontext.
`null` erhält die automatische Rolle. `conversationRole` bleibt mit dem
Gespräch lokal in IndexedDB gespeichert; kein neues Postgres-Feld.
`startup` und `nonprofit` bleiben für alte Aufnahmen kompatibel, sind aber
nicht mehr auswählbar. Nach der
beendeten Sprachrunde zeigt der Client zusätzlich eine
Auswertung mit transparentem Heuristik-Score aus gemessenen Events; siehe
`docs/07-review-and-agent.md`.

```mermaid
sequenceDiagram
    actor U as Nutzer
    participant FE as Review (QuestionPractice)
    participant BE as FastAPI (questions/router)
    participant S3 as SeaweedFS
    participant W as Celery Worker
    participant PG as Postgres + pgvector
    participant E as ElevenLabs Agent
    participant T as Tavily (Websuche)
    participant L as Gemini (JSON-Modus)

    U->>FE: Practice questions
    opt Kein Transkript vorhanden
        U->>FE: Transcribe this take (Upload-Hinweis)
        FE->>BE: POST /speech/analyze, transcribe=true, local_only=true
        FE->>BE: GET /speech/jobs/id (Polling)
    end
    FE->>BE: GET /questions/agent/settings
    opt Start voice questions, explizit starten
        U->>FE: Gesprächspartner wählen (Automatisch / Student / Professor / Lehrkraft)
        FE->>BE: POST /questions/agent (Wörter, Collection, Modus, Funde, voice_role)
        BE->>S3: agent-context-jobs/id/request.json
        BE-->>FE: 202 Job-ID
        W->>PG: Fokussierte Hybrid-Queries in der Collection des Takes (Default 4)
        W->>W: RRF-Fusion, höchstens 8 Auszüge, auch Vortragsende berücksichtigen
        W->>W: Gewählte Rolle oder Modus-Standard + unveränderter fachlicher Fokus
        W->>S3: status.json mit begrenztem Kontext, request.json löschen
        FE->>BE: GET /questions/agent/jobs/id (Polling)
        FE->>BE: POST /questions/agent/session
        BE->>E: Signed URL anfordern (API-Key bleibt serverseitig)
        BE-->>FE: Signed URL, Cache-Control no-store
        Note over E: Gespeicherte First message fragt nach Bereitschaft
        FE->>E: SDK-WebSocket mit Kontext im Prompt-Override und fester first_message
        E-->>FE: Verbindung bestätigt
        E->>FE: Ich habe noch ein paar Fragen. Bist du bereit? (Audio + Text)
        U->>FE: Bereitschaft bestätigen
        FE->>E: Mikrofon-Audio, erst danach erste Frage zum Vortrag
        loop Eine Frage nach der anderen
            E->>FE: Frage / Reaktion, Audio + Text
            Note over FE: Protect agent speech optional, Standard aus,<br/>Admin / Fragerunde, pro Browser gespeichert.<br/>Wenn an: SDK speaking → Mikrofon stumm,<br/>listening → für Antwort freigeben,<br/>manuelles Mute hat Vorrang
            U->>FE: Gesprochene Antwort
            FE->>E: Mikrofon-Audio
            opt Upload-Auszüge fehlen oder klären Sachfrage nicht
                E->>T: search_web: gezielte öffentliche Sachfrage
                T-->>E: Bis zu drei Treffer mit Titel, URL und Auszug
                Note over E: Webquelle nennen, bei Fehler/fehlendem Beleg Urteil offenlassen
            end
            Note over E: Prompt: höchstens zwei Nachfragen, danach nächste Hauptfrage
        end
        Note over FE: Browser: 600 s ab Start oder 12 Nutzerbeiträge,<br/>auch Vorbereitung abbrechen, späte SDK-Verbindung schließen
        alt End conversation, Browserlimit oder reguläres Agent-Ende
            U->>FE: Gespräch beenden
            FE->>E: Verbindung schließen, Mikrofon freigeben
            FE->>FE: PerformanceEvaluation anzeigen, Fokus auf Statistik-Überschrift
            Note over FE: Vorhandene Messdaten,<br/>keine neuen Urteile über gesprochene Antworten
        else Ansicht verlassen / Verbindung abbrechen
            FE->>E: Verbindung schließen, keine Auswertung öffnen
        end
    end
```

ElevenLabs-Antworten sind Modellvorschläge; sie durchlaufen nicht den
serverseitigen Zitat-Check der getippten Antworten. Der Kontext enthält nur
bis zu acht passende Auszüge, nicht die gesamte Bibliothek. Ohne konfigurierte
Zugangsdaten bleibt die Sprachfunktion sichtbar als nicht verfügbar. Der
bestehende `/questions/answers/voice`-Endpunkt mit ASR bleibt für API-Clients
kompatibel; der neue Web-Review verwendet den direkten ElevenLabs-Dialog.

Der kompatible API-Pfad hat einen eigenen, serverseitig begrenzten Ablauf:

```mermaid
sequenceDiagram
    participant C as API-Client / Take-Worker
    participant Q as Questions-Pipeline
    participant R as Redis-Runde
    participant L as LLM / ASR
    C->>Q: Fragen erzeugen
    Q->>L: Nonce-begrenzte Eingaben und JSON-Schema
    L-->>Q: Fragenentwürfe
    Q->>Q: Referenzen, Zitate und Zahlen prüfen
    Q->>R: Fragen + feste TTL speichern
    Q-->>C: round_id + Fragen
    C->>Q: round_id, question_id, Antwort
    Q->>R: Kurzer Lock: Turn reservieren / Cache lesen
    alt Identische fertige Antwort
        R-->>C: Gespeicherter Review ohne Provider-Aufruf
    else Neuer Turn innerhalb Budget und TTL
        Q->>L: Antwort auswerten, außerhalb des Locks
        Q->>Q: Schema-, Zitat- und Zahlenprüfung
        Q->>R: Kurzer Lock: Review + begrenzte Nachfrage atomar speichern
        Q-->>C: Review
    else Abgelaufen / unbekannt / Limit
        Q-->>C: 410 / 404 / 429 ohne Provider-Aufruf
    end
```

## 6. Frontend-Navigation (Web)

```mermaid
flowchart TD
    HEADER["AppShell: Logo, Home, Vergangene Aufnahmen und Admin außerhalb des Record-Screens<br/>Darstellung und Hilfe; kein Menü-Drawer"]
    THEME["Root-Layout: gespeicherte Darstellung vor First Paint<br/>localStorage, CSS-Tokens, OS-Fallback"] -.-> HEADER
    HEADER --> SP
    HEADER -->|"Vergangene Aufnahmen: /#past-recordings"| TAKES["Deine Takes: lokal gespeicherte Aufnahmen oder Leerzustand"]
    HEADER --> ADMIN
    JOURNEY["Gemeinsamer Ablauf: Prepare / Record / Review<br/>aktuelle oder letzte Aufnahme, sonst markiertes Beispiel"] --> SRC
    JOURNEY --> LIVE
    JOURNEY --> LREV
    SP["/ und /stats-preview<br/>Einleitung + Neue Präsentation / Quellen vorbereiten<br/>darunter Aufnahmeübersicht im Browser-Arbeitsbereich"] --> SC["StatsDashboard<br/>Anzahl, Dauer, Hinweise und Transkripte<br/>aus aufgenommenen Takes, sonst Leerzustand"]
    SP -->|"Neue Präsentation"| SRC
    SP -->|"Quellen vorbereiten"| SRC
    SP -->|"Letzte Aufnahme, falls vorhanden"| LREV
    RP["/review-preview<br/>Synthetisches Video + Beispiel-Momente<br/>ausdrücklich markierte Beispiel-Scores"]
    STAGE["/stage - Pitch Mode<br/>Preflight: Backend, Quellencheck,<br/>Kamera/Mikro, Storage; feste Datenschutzfrage<br/>NEXT_PUBLIC_STAGE_MODE=0 blendet die Route aus"]
    STAGE -->|"Lokal (Default)"| STAGELOCAL["/live?stage=1&local=1<br/>sofortige lokale Aufnahme + Review"]
    STAGE -->|"Live (optional)"| STAGELIVE["/live?stage=1<br/>max. 90 s auf Backend-Analyse warten"]
    STAGE -->|"Beispiel"| RP
    STAGELOCAL --> SREVIEW["/live/sessionId/review?stage=1<br/>ReviewScores; feste Jury-Frage am Ende<br/>config.stage bleibt beim Wiederöffnen erhalten"]
    STAGELIVE --> SREVIEW
    SC -->|"Letzte Aufnahme"| LREV
    SC --> LIVE
    LIVE["/live - LiveStudio<br/>Vor Kamera-Aktivierung: gleiche Seitenbreite wie Upload, ohne Header und Schrittleiste<br/>Back to sources vor Aufnahmestart<br/>Ab Kamera-Aktivierung: Vollbild mit Pose-Overlay<br/>Back-Link in der Toolbar bis Aufnahmestart<br/>Immer Live + Backend-Analyse,<br/>Options: Vortragstyp, Material und Transkript,<br/>kalibrierte Hinweise mit Rot-/Grün-Tönung,<br/>Kamera aktivieren -> Aufnahme starten"]
    STAGEMODE["Stage-Preset: /live?stage=1 blendet Optionen aus<br/>local=1 nutzt LocalVideoTransport ohne Upload<br/>Default: lokaler Sofortpfad; Live nur opt-in"]
    LIVE -.-> STAGEMODE
    STORE["Root-Layout: LiveSessionProvider + IndexedDB<br/>Video, Analyse und Fragen je Aufnahme<br/>Wiederherstellung nach Reload"] -.-> LIVE
    STORE --> EVIDENCE["recordingReviewData + recordingFeedback<br/>Video, Dauer und Events der gewählten Aufnahme<br/>Quellen-Marker aus aktuellem Fact-Check<br/>Fragen zählen nicht als Präsentationsevidenz"]
    EVIDENCE --> LREV
    EVIDENCE --> LA
    DEMOPAGE["/demo<br/>Optionales Beispiel + Setup"]
    DEMOPAGE -->|"Demo starten / konfigurieren"| PRAC["/practice/sessionId<br/>PracticeStudio (Mock-Gateway)"]
    LIVE -->|"Back to sources vor Aufnahmestart"| SRC["/sources<br/>SourceLibrary: Vortragstyp neben Datei-Upload,<br/>Status und Löschen"]
    SRC -->|"Weiter zur Aufnahme<br/>Vortragstyp aus localStorage"| LIVE
    LIVE --> WALK["/gestures: synthetischer 22-s-Rundgang<br/>gleiche Regeln, keine Genauigkeitsvalidierung"]
    WALK --> LIVE
    ADMIN["/admin (Navbar, ohne Login)<br/>AdminPanel: Pose-Haltezeit,<br/>Hinweis-Mindestdauer + Lücke,<br/>Pose feedback: On/Review/Off je Regel,<br/>Analysis features: Modell/Modus/Feedback"] -->|"localStorage, ab nächster<br/>Kalibrierung/Aufnahme"| LIVE
    PROGRESSFE["/progress + /progress/demo<br/>Profil/Consent, Small Multiples, Rohpunkte, Lücken,<br/>Qualitätsmarker, Ziele, Export/Löschung<br/>kein Gesamtscore/Radar"] -. "progress.v1" .-> PAPI["GET/PUT /profiles/id/progress|goals"]

    PRAC --> STATE{"Phasen"}
    STATE --> P1["preflight -> countdown -><br/>presenting -> judge_thinking -><br/>judge_question -> answering"]
    P1 --> PREV["/practice/sessionId/review<br/>ReviewWorkspace: Findings, Retry,<br/>Evidenz-Sprung"]

    LIVE --> LREV["/live/sessionId/review<br/>LiveReview: Review moments + Practice questions<br/>Video, Stärken und nächste Übungsschritte<br/>Feste Erklärungen aus Messdaten ohne LLM<br/>Transkript, Quellencheck und Exporte als Details"]
    LREV -->|"POST /factcheck,<br/>GET /sources?collection_id"| FCAPI["Fact-Check-Job<br/>sourceCollectionId des aufgenommenen Takes"]
    LREV -->|"POST /questions/agent + /agent/session"| QAPI["ElevenLabs-Sprachdialog<br/>Rolle: Automatisch / Student / Professor / Lehrkraft<br/>Fachkontext aus dem Take<br/>eine Frage pro Schritt"]
    QAPI -->|"Sprachdialog beenden"| FINALSTATS["PerformanceEvaluation: Your take at a glance<br/>bestehende Messdaten, Heuristik und Grenzen"]
    LREV -. "bestehender Direktlink" .-> MOM["/live/sessionId/moments<br/>FeedbackReplay: Filter,<br/>Clip-Sprung + Loop"]
    LREV --> LA["/live/sessionId/analysis<br/>ReviewAnalysis: Video + Event-Zeitachse<br/>keine erfundenen Scores"]
    RP --> RA["ReviewAnalysis + PerformanceGraph / FeedbackGraph<br/>qualitativer Event-Saldo, positive Hinweise oben<br/>neutrale Mittellinie, Anpassungshinweise unten<br/>video.currentTime, Zeitmarken, Abschnitt-Loop"]
    LREV --> SCORES["ReviewScores über dem Video<br/>evidence-share-v1: Gestik, Fachwissen, Flow, 0–100<br/>Zeitanteile / Quellenurteile mit geprüftem Zitat<br/>Aufnahmetitel, Abdeckung und fehlende Daten"]
    RA --> SCORES
    LREV --> FGRAPH["VideoPlayback + FeedbackGraph unter dem Video<br/>Zackiger Liniengraph, Zwischenwerte linear interpoliert<br/>Gute Momente oben; farbige Wiedergabeleiste darunter<br/>Cursor + abgespielter Fortschritt an video.currentTime<br/>Play/Pause / Zeitregler / Zeitmarken ↔ lokales Video"]
    LA --> RA
    RA --> FGRAPH

    SRC -->|"collection_id aus localStorage"| UPLOAD["GET/POST /sources<br/>DELETE /sources/id"]

    subgraph Transport["VideoTransport: normales Studio auf backend<br/>(Modus-Schalter entfernt)"]
        ANA["AnalysisTransport<br/>Backend-Upload + Polling, jede Web-Aufnahme"]
        DEMO["LocalVideoTransport<br/>Stage-Fallback; sofort lokal, kein Upload"]
    end
    LIVE --> Transport
```

### Pitch Mode / Stage (25.10.2026)

`/stage` ist die schlanke Jury-Oberfläche. Sie ist standardmäßig über
`NEXT_PUBLIC_STAGE_MODE` aktiv und wird nur mit `0` ausgeblendet. Der Preflight
prüft Backend, Quellencheck, Kamera/Mikrofon und IndexedDB, ohne
Berechtigungen vorab anzufragen.

Der Stage-Pfad startet standardmäßig **lokal** (`/live?stage=1&local=1`): Der
`LocalVideoTransport` speichert die Aufnahme sofort in IndexedDB, das Review
öffnet ohne Backend-Wartezeit. Der Live-Pfad (`/live?stage=1`) bleibt parallel
verfügbar und ist opt-in; die Stage beendet nach 90 s das Warten auf Analyse.
Früher Review und Timeout behalten Video, Pose-Log und Live-Ereignisse.
Bereits eingereihte Backend-Jobs können weiterlaufen. Der normale `/live`-Pfad
bleibt unverändert.

`GET /questions/pitch` liefert die feste Datenschutzfrage und den Agent-Kontext
aus `backend/app/questions/pitch.py`, ohne LLM, Redis, Quellenabruf oder
Anbieter. `PITCH_MODE=0` deaktiviert den Endpunkt. Die Stage-Review zeigt genau
diese eine Frage mit 90-s-Antwortfenster und blendet die Auswertung nach der
Fragerunde aus; das getrennte `evidence-count-heuristic.v1`-System bleibt damit
außerhalb der Bühne. Die normale Review bleibt unverändert.

## 7. Demo-Plattform

Die native Mobile-App wurde auf Nutzerwunsch entfernt. Die Präsentation und
der Demo-Pfad verwenden ausschließlich die Web-App auf dem Laptop.

## 8. Datenmodell (Postgres)

```mermaid
erDiagram
    SOURCES ||--o{ SOURCE_CHUNKS : "hat Chunks"
    SPEAKER_PROFILES ||--o{ PROFILE_TOKENS : "Token"
    SPEAKER_PROFILES ||--o{ PROFILE_GOALS : "Ziele"
    SPEAKER_PROFILES ||--o{ SESSIONS : "optional verknüpft"
    SESSIONS ||--o{ TAKES : "hat Takes"
    SESSIONS ||--o{ REVIEW_IDEMPOTENCY : "24 h, bei Zugriff bereinigt"
    TAKES ||--o{ EVENTS : "Cascade"
    TAKES ||--o| REVIEWS : "Cascade"
    TAKES ||--o{ JOBS : "Cascade"
    TAKES ||--o| TAKE_QUALITY : "Qualität"
    TAKES ||--o{ TAKE_METRICS : "Metriken"
    METRIC_DEFINITIONS ||--o{ TAKE_METRICS : "definiert"
    SPEAKER_PROFILES ||--o{ PROGRESS_SNAPSHOTS : "Trend"
    SPEAKER_PROFILES ||--o{ PROGRESS_CHANGE_POINTS : "Change-Points"
    SPEAKER_PROFILES ||--o{ PROGRESS_RUNS : "Neuberechnung, Cascade"

    SPEAKER_PROFILES {
        uuid id PK
        text display_name
        text locale
        jsonb consent "long-term-progress"
        timestamptz retention_until
        text retention_origin "default/user"
    }
    PROFILE_TOKENS {
        uuid id PK
        uuid profile_id FK
        text token_hash "UNIQUE, SHA-256"
        timestamptz revoked_at
    }
    SESSIONS {
        uuid id PK
        uuid profile_id FK "nullable, ON DELETE SET NULL"
        uuid collection_id "gleiche Collection wie Sources"
        text presentation_mode "startup/thesis/school/nonprofit"
        text title
        text status
        jsonb consent
        jsonb capture "inkl. deviceKey"
        timestamptz retention_until "NULL bei verknüpften Sessions"
        timestamptz created_at
        timestamptz deleted_at
    }
    TAKES {
        uuid id PK
        uuid session_id FK
        uuid profile_id FK "denormalisiert, nullable"
        text status
        int duration_ms
        text mime_type
        jsonb timebase
        jsonb audio_probe
        jsonb coverage
        jsonb analysis "Wörter, Summaries, Fact-Check, Fragen"
        timestamptz recorded_at "Client oder Server"
        text recorded_at_source "client/server"
        uuid device_key
        jsonb warnings
        int revision
        timestamptz created_at
        timestamptz deleted_at
    }
    TAKE_QUALITY {
        uuid take_id PK,FK
        text status "ok/partial/poor"
        text global_exclusion_reasons "Array"
        double pose_coverage_ratio
        double pose_valid_ratio
        double audio_active_ratio
        int word_count
        int claim_count
        bool synthetic_demo
        text quality_version
    }
    METRIC_DEFINITIONS {
        text metric_id PK
        int version PK
        text unit
        text suggested_direction
        bool is_primary
        bool device_sensitive
    }
    TAKE_METRICS {
        uuid take_id PK,FK
        text metric_id PK,FK
        int metric_version PK,FK
        double value "nullable = unbekannt"
        text unit
        text rule_version
        text computation_version
        jsonb quality "eligible + exclusionReasons + sourceRevision"
    }
    PROGRESS_SNAPSHOTS {
        uuid id PK
        uuid profile_id FK
        text metric_id
        int metric_version
        text window_kind
        uuid window_end_take_id FK
        text trend_status
        text goal_status
        double slope_per_10_takes
        double noise_band
        text algorithm_version
        text input_hash
    }
    PROGRESS_CHANGE_POINTS {
        uuid id PK
        uuid profile_id FK
        text metric_id
        uuid take_id FK
        text kind "step/regression/recovery"
        double magnitude
        text confidence
    }
    PROGRESS_RUNS {
        uuid id PK
        uuid profile_id FK
        text status "queued/running/completed/failed"
        text error "nur Fehlercode"
        timestamptz created_at
        timestamptz updated_at
    }
    PROFILE_GOALS {
        uuid profile_id PK,FK
        text metric_id PK
        int metric_version PK
        text direction
        double target_value
        double target_min
        double target_max
    }
    EVENTS {
        uuid take_id PK,FK
        text id PK
        text dedupe_key "UNIQUE mit take_id"
        int t_ms
        int peak_ms
        int duration_ms
        text type
        text severity
        text source
        text stage
        jsonb payload
        text rule_version
        timestamptz created_at
    }
    REVIEWS {
        uuid id PK
        uuid take_id FK "UNIQUE"
        text status
        jsonb report "review.v1"
        jsonb generator
        jsonb verification
        timestamptz created_at
        timestamptz updated_at
    }
    JOBS {
        uuid id PK
        uuid take_id FK
        text kind
        text status
        int progress
        jsonb error
        jsonb result
        jsonb input "bei terminalem Status geleert"
        text object_key "privat, nur temporäres Audio"
        bool upload_ready
        timestamptz created_at
        timestamptz updated_at
    }
    REVIEW_IDEMPOTENCY {
        text scope PK
        text key PK
        uuid session_id FK
        text request_hash
        int status
        jsonb response
        timestamptz expires_at
    }

    RETENTION_RUNS {
        uuid id PK
        timestamptz started_at
        timestamptz finished_at
        text status
        jsonb counts
        text error_code
    }
    BLOB_DELETIONS {
        text object_key PK
        int attempts
        timestamptz next_attempt_at
        text last_error_code
        timestamptz created_at
    }
    SOURCES {
        uuid id PK
        uuid collection_id
        string filename
        string content_type
        int size_bytes
        string object_key
        string status "queued, processing, ready, failed"
        string error
        int chunk_count
        string embedding_model
        timestamp created_at
        timestamp updated_at
    }

    SOURCE_CHUNKS {
        bigserial id PK
        uuid source_id FK
        uuid collection_id
        int ordinal
        string location_kind "page, slide, paragraph, table, line"
        int location_start
        int location_end
        text text
        vector embedding "ohne feste Dimension (Modell austauschbar); 768 ist der Jina-Output"
        string embedding_model
        tsv tsv "GENERATED, to_tsvector(german)"
    }
```

Zusätzlich gelten Constraints: `events.peak_ms` liegt innerhalb
`[t_ms, t_ms + duration_ms]`, `t_ms + duration_ms` ist auf 24 h begrenzt;
`source_chunks` hat `UNIQUE (source_id, ordinal)`; ein aktiver Job je
`(take_id, kind)` über partiellem Unique-Index (`queued`/`running`).
Die Embedding-Spalte ist bewusst dimensionsfrei, damit das Modell
ausgetauscht werden kann; Abfragen vergleichen nur Vektoren desselben
`embedding_model`.

`source_chunks.location_kind` ist `text NOT NULL` ohne CHECK-Constraint; der neue Wert `table` braucht deshalb keine Migration. Bestehende DOCX-Chunks behalten ihre alte Numerierung und sollten für konsistente Orte neu ingestiert werden.

Zusätzlich (außerhalb Postgres):

| Speicher | Inhalt |
| --- | --- |
| SeaweedFS `sources/{id}/original` | Original-Uploads |
| SeaweedFS `review-audio/{session}/{take}/{job}/upload` | nur temporär für Take-Analyse; vor erfolgreichem Job-Abschluss oder bei Analysefehler löschen, Cleanup-Fehler erneut versuchen |
| SeaweedFS `speech-jobs/{job_id}/` | Job-Konfig, Status, Analyse-Ergebnis (Original wird nach Abschluss gelöscht) |
| SeaweedFS `factcheck-jobs/{job_id}/` | Status und Fact-Check-Ergebnis; `request.json` (Transkript) wird nach Abschluss gelöscht |
| SeaweedFS `question-jobs/{job_id}/`, `answer-jobs/{job_id}/` | Status mit Fragen bzw. Antwort-Abgleich (bei Sprache mit Transkript der Antwort); `request.json` (Transkript, Antworttext) und `recording` (gesprochene Antwort) werden nach Abschluss gelöscht |
| SeaweedFS `agent-context-jobs/{job_id}/` | Vorbereiteter Prompt mit gekürztem Transkript und Quellenauszügen; Request wird gelöscht, Ergebnis bleibt wie andere Jobs gespeichert, noch kein TTL-Cleanup |
| Redis DB0 / DB1 | Celery-Broker / Result-Backend, Locks; `question-round:{id}` enthält kanonische Fragen, reservierte Turns und fertige Reviews bis zur festen TTL (Standard 600 s). Das kann Transkript-/Quellenauszüge enthalten. |
| Browser `sessionStorage` | Practice-Session-State (`pitch-coach:v1:<id>`) |
| Browser `localStorage` | Quellen-Collection-ID (`pitchcoach.sourceCollection`), optional Profil-ID/Token (`pp_…`) und zufälliger `deviceKey`; Token ist XSS-exponiert |
| Browser IndexedDB `presentation-recordings`, Store `recordings` | Abgeschlossene Live-Takes inklusive Video-/Pose-Log-Blobs, Config mit FeatureFlags/presentationMode/sourceCollectionId, ElevenLabs-Gespräch, Wörter, Pose-Events, Fact-Check, Fragen und Antworten; pro Take gespeichert, nach Reload wiederhergestellt. Objekt-URLs nur im Arbeitsspeicher. Löschen im Review entfernt den lokalen Take, keine Backend-Daten/Quellen. |

## 9. Event-Modell: gemeinsame Timeline

```mermaid
flowchart LR
    subgraph Quellen
        B["browser<br/>posture, gesture, lokale Sprachmarker<br/>(kalibrierte Heuristiken, kein Pocket/Gaze/T12)"]
        A["asr<br/>Füller, Wort-Timestamps"]
        S["speech<br/>pause, pace, volume, pitch<br/>volume/pace: adaptive Referenz je Fenster"]
        F["factcheck<br/>fact: stützt (info), nicht gefunden (hint),<br/>widerspricht (warning)"]
        G["agent<br/>question: Widerspruch (warning),<br/>nicht belegt (hint), sonst info;<br/>nur Fragen mit gesprochener Stelle"]
    end

    EV["Event<br/>t_ms, duration_ms<br/>type, severity (info/hint/warning)<br/>source, payload"]

    B --> EV
    A --> EV
    S --> EV
    F --> EV
    G --> EV

    EV --> MT["Legacy-Pfad run_analysis + merge_timeline()<br/>Wortpausen mit Satzkontext behalten,<br/>überlappende Signalpausen ersetzen;<br/>Signal-Tempo entfällt mit ASR-Wörtern<br/>merge_timeline selbst sortiert nur"]
    EV --> PERSIST["Take-Adapter + Browser-Pose-Vertrag<br/>eventId, dedupeKey, tMs, peakMs,<br/>durationMs, stage, ruleVersion<br/>kein gaze, kein Medien-Key"]
    PERSIST --> REVIEWMERGE["Finale Review-Timeline<br/>Pausen: ASR innerhalb des Satzes oder mit belegtem Satzende<br/>sonst längste, alle Event-IDs behalten<br/>WPM und Silben/s getrennt, stabil nach Start, Peak, ID"]
    REVIEWMERGE --> REPORT["Aggregate + explizite Coverage<br/>max 3 geerdete Findings + 3 belegte Stärken<br/>Beobachtung, feste Erklärung und Übungsschritt<br/>review.v1 in Postgres, auch ohne LLM"]
    MT --> FILTER["Sprachmarker-Filter pro Take<br/>Speech / pause / pace / filler / volume / pitch"]
    FILTER --> UI["Timestamp-Timeline im Frontend<br/>Klick springt zum Videoclip ±2s"]
    REPORT -. "Client-Anbindung separat" .-> UI
```

Pose-Event-Payload und JSONL tragen optional `runtime` mit Modell, Modus und
tatsächlichem Delegate; synthetische Fixtures haben keine erfundene Laufzeit.
Hand-/Lab-Ergebnisse fließen nicht in das gemeinsame Event-Modell.
Das lokale Browser-Modell typisiert Kopfregeln (`head_turned`, `head_down`)
als `gaze`; der persistente Vertrag kennt kein `gaze` — Kategorie ist dort
`head` (`head-lateral`, `head-orientation`), die Legacy-Anzeige mappt `gaze`
zu `gesture`. Lokale Sprachmarker tragen Start/Ende ab `MediaRecorder.onstart`
im Feedback-Vertrag. Bei überlappenden Typen ersetzt die vollständige
Backend-Analyse den Live-Marker im Review. Ein fehlender neutraler Handwert im
Pose-Payload ist `null`; die Haltungsreferenz benötigt keine ruhigen oder
sichtbaren Hände.

Alle Kennwerte sind Messwerte ohne Notenbewertung ("Measured values only; no score or grade").

## 10. API-Endpunkte im Überblick

```mermaid
flowchart LR
    subgraph API["Presentation Trainer API v0.1.0 (FastAPI)"]
        H1["GET /health/live"]
        H2["GET /health/ready"]
        S1["POST /speech/analyze"]
        S2["GET /speech/jobs/{job_id}"]
        S3LIVE["WS /speech/live: start, PCM, stop<br/>ready, words, text, done/error"]
        S4LIVE["WS /speech/feedback: start, PCM, stop<br/>ready, feedback, done/error; kein Whisper"]
        T1["POST /transcription/analyze-words"]
        R1["POST /sources"]
        R2["GET /sources?collection_id"]
        R3["GET /sources/{source_id}"]
        R4["DELETE /sources/{source_id}"]
        R5["POST /sources/search"]
        F1["GET /factcheck/settings"]
        F2["POST /factcheck"]
        F3["GET /factcheck/jobs/{job_id}"]
        Q1["POST /questions<br/>liefert round_id"]
        Q2["GET /questions/jobs/{job_id}"]
        Q3["POST /questions/answers<br/>round_id + question_id"]
        Q4["GET /questions/answers/{job_id}"]
        Q5["POST /questions/answers/voice<br/>round_id + question_id"]
        Q6["GET /questions/agent/settings"]
        Q7["POST /questions/agent (202)<br/>AgentRequest mit optionaler voice_role"]
        Q8["GET /questions/agent/jobs/{job_id}"]
        Q9["POST /questions/agent/session"]
        Q10["GET /questions/pitch<br/>feste Jury-Frage + Agent-Kontext<br/>ohne LLM, Redis oder Provider"]
        V1["POST /sessions<br/>GET / DELETE /sessions/id"]
        V2["POST /sessions/id/takes<br/>GET /takes/id"]
        V3["POST /takes/id/events<br/>POST /takes/id/audio"]
        V4["POST /takes/id/review<br/>GET /takes/id/review<br/>GET /takes/id/timeline"]
        V5["GET /jobs/id<br/>GET /takes/id/evaluation"]
        V6["POST /takes/id/factcheck<br/>POST / GET /takes/id/questions<br/>POST /takes/id/questions/answers"]
        P1["POST /profiles<br/>GET/PATCH/DELETE /profiles/id<br/>POST /profiles/id/rotate-token"]
        P2["GET /profiles/id/progress<br/>GET /profiles/id/progress/metricId<br/>POST /profiles/id/progress/recompute: 202<br/>GET /profiles/id/progress/runs/runId"]
        P3["GET/PUT/DELETE /profiles/id/goals/metricId<br/>GET /profiles/id/takes<br/>GET /profiles/id/export"]
    end

    WEBF["Web-Frontend"] --> H2 & S1 & S2 & S3LIVE & S4LIVE & T1 & R1 & R2 & R3 & R4 & R5 & F1 & F2 & F3 & Q1 & Q2 & Q3 & Q4 & Q5 & Q6 & Q7 & Q8 & Q9 & Q10
    CLIENT["Neuer Take-Client-Vertrag<br/>Frontend-Integration separat"] -.-> V1 & V2 & V3 & V4 & V5 & V6
    PROGRESS["Progress-Client<br/>X-Profile-Token"] -.-> P1 & P2 & P3
```

Der Vertrag wird über `npm run api:generate` aus dem FastAPI-Code generiert (`api/openapi.json` -> `api/schema.d.ts`) und ist damit immer synchron zum Backend.

Die Progress-Endpunkte sind serverseitig implementiert (`backend/app/progress/`),
aber noch nicht in der Web-Navigation verdrahtet. `POST /sessions` akzeptiert
optional `profileId` und verlangt dann `X-Profile-Token`;
alle verknüpften Session-/Take-/Job-Routen prüfen diesen Token, auch beim Lesen,
Upload, Löschen und bei Idempotenz-Retries. Abgelaufene Profile liefern `410`,
Löschen bleibt erlaubt. Sessions ohne Profil bleiben unverändert.
Explizites Recompute läuft über Celery und `progress_runs`; normale Reads
extrahieren nur geänderte Takes und schreiben das tatsächlich angefragte Fenster.
Die Profil-Löschung entkoppelt
Sessions/Takes (`ON DELETE SET NULL`) und entfernt nur die abgeleiteten
Progress-Daten. Verknüpfte Sessions haben keine automatische Session-Frist,
auch nach Entkopplung. Anonyme Sessions haben eine unabhängige Standardfrist
von 365 Tagen. `DELETE /profiles/{id}?deleteSessions=true` ist ein expliziter
zusätzlicher Löschauftrag für verknüpfte Session-Daten; lokale Videos bleiben
separat. Der tägliche Sweep löscht Profile, abgelaufene anonyme Sessions,
alte Take-Jobs und Idempotenzdaten in begrenzten Batches. S3-Löschungen stehen
vor dem Metadaten-Commit in `blob_deletions`; Fehler bleiben wiederholbar.
Quellen und Legacy-S3-Ergebnispräfixe werden nicht automatisch gescannt.

## Deep Research (24.10.2026)

Die Progress-Auswertung ist zusätzlich in
`docs/12-long-term-progress-data-design.md` §2.3 gegen NIST/USGS,
Theil–Sen, RCI/MDC, Regression-to-the-Mean, Benjamini–Hochberg und die
PostgreSQL-Partitionierungsdokumentation geprüft. Wichtig: p-Werte sind
diagnostisch, CUSUM liefert separate Change-Points, und mehrere Takes derselben
Session werden als abhängig markiert (Confidence `low`).

Die geplante inkrementelle LLM-/TTS-Pipeline ist in
`docs/11-deep-research-validation.md` gegen Forschung und offizielle
API-Dokumentation geprüft. Ihre Umsetzung ist noch offen. Drei Vorgaben:
Live-Analyse soll **ereignisgetrieben auf finalisierten ASR-Segmenten** laufen
(nicht auf einem festen 20–30-s-Takt), der finale Fact-Check ist
**quellengebunden, aber nicht autoritativ** (keine Live-Urteile,
„nicht gefunden“ ≠ „falsch“), und das Gespräch soll **harte Grenzen** haben
(3–5 Hauptfragen, ein Follow-up, 10 Minuten Hard Stop). Die separate
LLM-/TTS-Pipeline wurde nicht übernommen. Aktuell begrenzt die Fragen-API
Runden über Redis-TTL, reservierte Turns und ein globales Follow-up-Budget;
der ElevenLabs-Browserdialog endet nach 600 s oder 12 Nutzerbeiträgen.
Anbieter-Limits bleiben separat. Gemini ist Cloud ohne EU-Region-Pinning;
für den Prototyp nur synthetische Demo-Daten verwenden.

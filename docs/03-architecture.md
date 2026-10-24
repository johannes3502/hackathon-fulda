# Architektur – Pitch Coach (Live-Präsentationstrainer)

> Grafische Darstellung des Projekts als Mermaid-Diagramme.
> Generiert aus der Codeanalyse: `frontend/`, `backend/`, `mobile/`, `api/`, `compose.yaml`.

## 1. Systemübersicht

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        WEB["Web-Frontend<br/>Next.js 16 / React 19 / TS<br/>Port 3000"]
        MOB["Mobile App<br/>Expo / React Native"]
    end

    subgraph ClientAI["KI im Client (lokal, kein Upload)"]
        MP_W["MediaPipe Pose<br/>@mediapipe/tasks-vision<br/>Web Worker"]
        MP_M["react-native-mediapipe<br/>Pose Landmarker Lite"]
        MR["MediaRecorder / Vision Camera<br/>Video + Audio"]
    end

    subgraph API["api/ - Geteilter API-Vertrag"]
        OAS["openapi.json + schema.d.ts<br/>generiert aus FastAPI"]
    end

    subgraph Backend["backend/ - FastAPI (Python 3.12) Port 8000"]
        MAIN["FastAPI App<br/>Health, CORS, Router"]
        SP["Speech-Router<br/>POST /speech/analyze<br/>GET /speech/jobs/id"]
        TR["Transcription-Router<br/>POST /transcription/analyze-words"]
        SO["Sources-Router<br/>/sources CRUD + /sources/search"]
        CO["Coaching-Router<br/>Analyse, Antworten, Status, Löschen"]
        CEL["Celery App + Jobs"]
        TASKS["Celery Tasks<br/>analyze_speech, ingest_source,<br/>analyze_coaching"]
    end

    subgraph Pipelines["Analyse-Pipelines (Worker)"]
        SIG["Signal-Analyse<br/>FFmpeg, RMS, YIN-Pitch,<br/>Silero VAD (ONNX, lokal)"]
        WORDS["Wort-Analyse<br/>Füller, Pausen, Tempo"]
        INGEST["RAG-Ingest<br/>Extrakt, Chunk, Embed"]
        EMB["Lokale Embeddings<br/>jina-embeddings-v2-base-de<br/>FastEmbed/ONNX"]
        CHECK["Aussagen + Retrieval + Zitatprüfung<br/>Fragen + Antwortvergleich"]
    end

    subgraph Infra["Infrastruktur (Docker Compose)"]
        PG[("PostgreSQL 18<br/>+ pgvector<br/>Port 5432")]
        RD[("Redis 8<br/>Broker DB0 / Results DB1")]
        S3[("SeaweedFS<br/>S3-kompatibel<br/>Port 8333")]
    end

    EXT["ASR-Adapter<br/>Whisper lokal (Standard)<br/>Deepgram nova-3, EU (optional)"]
    OLL["Host: Ollama lokal<br/>Qwen3.5 4B Q4_K_M<br/>kein Cloud-Fallback"]

    WEB -- "Kamera" --> MP_W
    MP_W --> RULES["PoseEvaluator: Baseline + Geometrie + Zeit<br/>gesture/posture Events, ein Live-Hinweis"]
    RULES --> REVIEW["Lokales Video-Replay + Evidenz-JSON"]
    WEB -- "Aufnahme" --> MR
    MOB -- "Kamera" --> MP_M

    WEB -- "fetch: /speech, /sources,<br/>/transcription, /coaching, /health" --> MAIN
    MOB -- "Upload + Job-Polling" --> MAIN
    WEB -. "Typen" .-> OAS
    OAS -. "Quelle der Wahrheit" .-> MAIN

    MAIN --> SP
    MAIN --> TR
    MAIN --> SO
    MAIN --> CO
    CO --> S3
    CO --> CEL

    SP -- "S3-Upload, Enqueue" --> S3
    SP -- "enqueue" --> CEL
    SO -- "S3-Upload, Enqueue" --> S3
    SO -- "enqueue" --> CEL

    CEL --> RD
    RD --> TASKS
    TASKS --> SIG
    TASKS --> WORDS
    TASKS --> INGEST
    TASKS --> CHECK
    CHECK --> OLL
    CHECK --> PG
    CHECK --> S3
    INGEST --> EMB
    WORDS -. "optional, transcribe=true" .-> EXT
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
        FE["frontend<br/>Next.js :3000<br/>Rewrite /api -> backend:8000"]
        BE["backend<br/>uvicorn :8000<br/>--reload"]
        WK["worker<br/>Celery, Concurrency 2"]
        PG[("postgres<br/>pgvector :5432<br/>Volume: postgres_data")]
        RD[("redis :6379<br/>AOF, noeviction<br/>Volume: redis_data")]
        ST[("storage<br/>SeaweedFS :8333<br/>Volume: media_data")]
    end

    User(("Browser /<br/>Smartphone")) -->|"Port 3000"| FE
    FE -->|"healthy"| BE
    BE -->|"postgres healthy"| PG
    BE -->|"storage healthy"| ST
    BE -->|"redis healthy"| RD
    WK --> PG
    WK --> ST
    WK --> RD
    OLL["Nativer Host: Ollama :11434<br/>Qwen3.5 4B, Apple GPU<br/>nicht Teil von Compose"]
    BE -->|"Modellstatus via host.docker.internal"| OLL
    WK -->|"lokale JSON-Schema-Inferenz"| OLL
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
    participant ASR as ASR<br/>(Whisper lokal / Deepgram optional)

    U->>FE: Präsentation aufnehmen (Kamera + Mikro)
    FE->>FE: MediaPipe Pose lokal (Web Worker)
    FE->>FE: onstart: neue Baseline und gemeinsame Event-Zeitachse
    U->>FE: Stop
    FE->>BE: POST /speech/analyze (recording, transcribe=Checkbox, local_only=true)
    Note over FE,BE: Whisper standardmäßig an; Cloud/JSON bei local_only abgewiesen
    BE->>S3: Original speichern
    BE->>R: Task analyze_speech einreihen
    BE-->>FE: 202 {job_id, status_url}

    W->>R: Job holen (Lock 660s)
    W->>S3: Datei laden
    W->>W: FFmpeg -> 16kHz mono, Frames 40ms/10ms
    W->>W: RMS-Pegel, YIN-Pitch, Silero VAD, Silben-Peaks
    opt transcribe=true
        W->>ASR: Whisper lokal (de)
        ASR-->>W: Wort-Timestamps, Text
        W->>W: Füller, Pausen, Tempo (Wort-Analyse)
    end
    W->>W: merge_timeline (Events deduplizieren)
    W->>S3: Ergebnis speichern, Original löschen

    loop Polling 1x/s (max 11 min)
        FE->>BE: GET /speech/jobs/{job_id}
        BE->>S3: Status/Ergebnis lesen
        BE-->>FE: queued / running / completed
    end
    FE->>FE: Lokale Pose-Events + Audio-Events im Review zusammenführen
    FE->>FE: Wort-Timestamps anzeigen; Quellenvergleich explizit starten
    FE->>FE: Vollvideo im Browser bei Event abspielen (±2s, keine Server-Clips)
```

## 4. RAG-Pipeline: Quellen-Ingest und Suche

```mermaid
flowchart TB
    UP["Upload /sources<br/>PDF, PPTX, DOCX, TXT, MD<br/>max 25 MB, kein OCR"] --> API["Sources-Router"]
    API --> S3A[("S3: sources/id/original")]
    API --> Q["Celery: ingest_source<br/>(idempotent, Redis-Lock)"]
    Q --> EX["extract.py<br/>PDF je Seite - PPTX je Folie<br/>DOCX je Absatz - TXT/MD je Block"]
    EX --> CH["chunking.py<br/>~1200 Zeichen, Satzgrenzen,<br/>~200 Overlap"]
    CH --> EM["embeddings.py<br/>jina-embeddings-v2-base-de<br/>768 dim, lokal ONNX"]
    EM --> PGDB[("Postgres + pgvector<br/>sources, source_chunks<br/>+ tsvector (deutsch, GIN)")]

    SEARCH["POST /sources/search"] --> RET["retrieval.py<br/>Hybrid: pgvector-Kosinus<br/>+ Volltextsuche<br/>Reciprocal Rank Fusion"]
    PGDB --> RET
    RET --> HITS["Top-k SourceHits<br/>mit Zitat-Ort: page/slide/<br/>paragraph/line"]
    WORDS["Transkript mit Wort-Timestamps"] --> JOB["POST /coaching/analyze<br/>S3-Eingabe + Celery-ID"]
    JOB --> CLAIMS["Ollama: bis zu 6 Wortspannen<br/>Code prüft Indizes; Zeiten aus Wörtern"]
    CLAIMS --> RET
    HITS --> CHECK["Ollama: supports / contradicts / not_found<br/>Code prüft Zitat im abgerufenen Chunk"]
    CHECK --> REPORT["S3: Quellenbericht + fact-Events<br/>ungültiges Zitat: kein Urteil"]
    REPORT --> QUESTIONS["Ollama: bis zu 3 Fragen<br/>Transkript + verifizierbare Vergleiche"]
    QUESTIONS --> ANSWER["POST /coaching/jobs/id/answers<br/>neuer Job; Retrieval + Zitatprüfung"]
    ANSWER --> RESULT["Antwortvergleich ohne Punkte<br/>DELETE entfernt terminale Jobs"]
```

## 5. Frontend-Navigation (Web)

```mermaid
flowchart TD
    LOADING["app/loading.tsx<br/>418 LoadingScreen<br/>Three.js, statischer Fallback"]
    LP["/loading-preview<br/>Dauerhafte Animationsvorschau"] --> LOADING
    LOADING -. "Suspense-Fallback beim Laden" .-> HOME
    HOME["/ - Start<br/>SessionSetupForm"] -->|"Demo starten"| PRAC["/practice/sessionId<br/>PracticeStudio (Mock-Gateway)"]
    HOME -->|"Session konfigurieren"| PRAC
    HOME --> LIVE["/live<br/>LiveStudio: Kamera, Pose-Overlay,<br/>MediaRecorder"]
    HOME --> WALK["/gestures<br/>Synthetischer Rundgang<br/>gleicher PoseEvaluator, kein Kamerazugriff"]
    WALK --> LIVE
    HOME --> SRC["/sources<br/>SourceLibrary: Upload, Status,<br/>Suchtest"]

    PRAC --> STATE{"Phasen"}
    STATE --> P1["preflight -> countdown -><br/>presenting -> judge_thinking -><br/>judge_question -> answering"]
    P1 --> PREV["/practice/sessionId/review<br/>ReviewWorkspace: Findings, Retry,<br/>Evidenz-Sprung"]

    LIVE --> LREV["/live/sessionId/review<br/>LiveReview: Statistiken,<br/>Transcript-Import, Pose-/Evidenz-Download"]
    LREV --> MOM["/live/sessionId/moments<br/>FeedbackReplay: Filter,<br/>Clip-Sprung + Loop"]
    LREV --> COACH["SourceCoaching + klickbares Transkript<br/>Quellenvergleich, Fragen, Antworten,<br/>Status-Polling, Berichte löschen"]
    COACH -->|"neuer Tab erhält Aufnahme"| SRC

    SRC -->|"collection_id aus localStorage"| UPLOAD["POST /sources<br/>POST /sources/search"]

    subgraph Transport["VideoTransport (wahlweise)"]
        LOCAL["LocalVideoTransport<br/>kein Upload, nur lokale Pose-Events"]
        ANA["AnalysisTransport<br/>Backend-Upload + Whisper + Polling"]
    end
    LIVE --> Transport
```

## 6. Mobile-App (Expo) Screens

```mermaid
flowchart LR
    IDX["index - Rehearsals<br/>native iOS-Liste"] --> STU["studio - Aufnahme<br/>Vision Camera 720p/30fps,<br/>1/3/5 Min, Permissions,<br/>Pose-Overlay + Arms-crossed-Cue"]
    STU <--> OPT["settings - Recording Options<br/>native iOS-Form-Sheet,<br/>Titel, Pose, Backend-URL,<br/>State für die App-Sitzung"]
    IDX --> SET["setup - Practice Setup<br/>Titel, Kontext, Publikum,<br/>Dauer, Modus, Fokus"]
    SET --> DEM
    SET --> STU
    IDX --> SRC_M["sources - Quellen<br/>Upload, Status-Polling,<br/>Suche, Löschen"]
    SRC_M -->|"GET/POST/DELETE /sources<br/>POST /sources/search"| BE
    SRC_M --- CID["Collection-ID pro Server<br/>lokale Datei; gleiche ID wie Web"]
    IDX --> DEM["demo - Sample Rehearsal<br/>MockCoachGateway,<br/>Fragen, Pause, Retry,<br/>Vergleich + frühere Reports"]
    STU --> REV["review - Playback<br/>expo-video, Timestamp-Feedback<br/>Klick spult ±2s zurück,<br/>Upload + Wort-Import,<br/>Sharing (Video, Pose-JSONL)"]
    REV -->|"GET /health/ready,<br/>POST /speech/analyze,<br/>GET /speech/jobs/id,<br/>POST /transcription/analyze-words"| BE(("FastAPI<br/>Backend"))
```

## 7. Datenmodell (Postgres)

```mermaid
erDiagram
    SOURCES ||--o{ SOURCE_CHUNKS : "hat Chunks"

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
        string location_kind "page, slide, paragraph, line"
        int location_start
        int location_end
        text text
        vector embedding "768 dim (pgvector)"
        string embedding_model
        tsv tsv "GENERATED, to_tsvector(german)"
    }
```

Zusätzlich (außerhalb Postgres):

| Speicher | Inhalt |
| --- | --- |
| SeaweedFS `sources/{id}/original` | Original-Uploads |
| SeaweedFS `speech-jobs/{job_id}/` | Job-Konfig, Status, Analyse-Ergebnis (Original wird nach Abschluss gelöscht) |
| SeaweedFS `coaching-jobs/{job_id}/` | `request.json` + `status.json`: Transkript/Antwort, Quellenbericht und Fragen; explizite Löschung, kein TTL |
| Redis DB0 / DB1 | Celery-Broker / Result-Backend, Locks |
| Browser `sessionStorage` | Practice-Session-State (`pitch-coach:v1:<id>`) |
| Browser-Arbeitsspeicher | Lokales Vollvideo, Roh-Pose-JSONL, Pose-Events, Transkript, Coaching-Job-IDs/Ergebnisse; gehen beim Verlassen/Neuladen verloren |
| Browser `localStorage` | Quellen-Collection-ID (`pitchcoach.sourceCollection`) |

## 8. Event-Modell: gemeinsame Timeline

```mermaid
flowchart LR
    subgraph Quellen
        B["browser<br/>posture, gesture<br/>pose-rules-v3 (lokal, kein Gaze)"]
        A["asr<br/>Füller, Wort-Timestamps"]
        S["speech<br/>pause, pace, volume, pitch"]
        F["factcheck<br/>fact: Aussage + Quellenvergleich"]
    end

    EV["Event<br/>t_ms, duration_ms<br/>type, severity (info/hint/warning)<br/>source, payload"]

    B --> BEV["PoseEvent + payload<br/>Regelversion, Baseline, Messung,<br/>Bestätigungszeit, Heuristik"]
    BEV --> UI
    A --> EV
    S --> EV
    F --> EV
    F --> UI

    EV --> MT["merge_timeline()<br/>Deduplizierung<br/>(Tempo aus ASR,<br/>Pausen akustisch)"]
    MT --> UI["Timestamp-Timeline im Frontend<br/>Klick springt im lokalen Video ±2s"]
```

Alle Kennwerte sind Messwerte ohne Notenbewertung ("Measured values only; no score or grade").

## 9. API-Endpunkte im Überblick

```mermaid
flowchart LR
    subgraph API["Presentation Trainer API v0.1.0 (FastAPI)"]
        H1["GET /health/live"]
        H2["GET /health/ready"]
        S1["POST /speech/analyze"]
        S2["GET /speech/jobs/{job_id}"]
        T1["POST /transcription/analyze-words"]
        R1["POST /sources"]
        R2["GET /sources?collection_id"]
        R3["GET /sources/{source_id}"]
        R4["DELETE /sources/{source_id}"]
        R5["POST /sources/search"]
        C1["GET /coaching/capabilities"]
        C2["POST /coaching/analyze"]
        C3["GET /coaching/jobs/{id}"]
        C4["POST /coaching/jobs/{id}/answers"]
        C5["DELETE /coaching/jobs/{id}"]
    end

    WEBF["Web-Frontend"] --> H2 & S1 & S2 & T1 & R1 & R2 & R3 & R4 & R5
    WEBF --> C1 & C2 & C3 & C4 & C5
    MOB["Mobile App"] --> H2 & S1 & S2 & T1 & R1 & R2 & R4 & R5
```

Der Vertrag wird über `npm run api:generate` aus dem FastAPI-Code generiert (`api/openapi.json` -> `api/schema.d.ts`) und ist damit immer synchron zum Backend.

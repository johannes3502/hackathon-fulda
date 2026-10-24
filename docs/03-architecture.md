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
        MP_W["MediaPipe Pose: Lite / Heavy<br/>VIDEO (Standard) / IMAGE<br/>GPU-first, CPU-Fallback; max. 10 Hz"]
        MP_M["react-native-mediapipe<br/>Pose Landmarker Lite"]
        MR["MediaRecorder / Vision Camera<br/>Video + Audio"]
    end

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
        RV["Review-Router (additiv)<br/>/sessions, /takes, /jobs<br/>Idempotency-Key, camelCase"]
        CEL["Celery App + Jobs"]
        TASKS["Celery Tasks<br/>analyze_speech, ingest_source,<br/>fact_check, generate_questions,<br/>review_answer, review_voice_answer,<br/>prepare_agent, run_take_job"]
    end

    subgraph Pipelines["Analyse-Pipelines (Worker)"]
        SIG["Signal-Analyse<br/>FFmpeg, RMS, YIN-Pitch, Silero VAD<br/>3 s stimmhafte Sprache, adaptive Referenz"]
        WORDS["Wort-Analyse<br/>Füller, Pausen, Tempo"]
        INGEST["RAG-Ingest<br/>Extrakt, Chunk, Embed"]
        EMB["Lokale Embeddings<br/>jina-embeddings-v2-base-de<br/>FastEmbed/ONNX"]
        FACT["Fact-Check<br/>Aussagen extrahieren, RAG zuerst,<br/>Web optional (Standard aus), Zitat-Check"]
        QUEST["Frage-Simulator / Voice-Agent<br/>Rolle: Student oder Professor/Tutor,<br/>Fragen aus Funden + Quellen,<br/>gesprochene Antwort -> ASR,<br/>Antwort-Abgleich mit Zitat-Check"]
        REVIEW["Take-Review<br/>Probe + Timestamp-Offset, Merge,<br/>Coverage, Evidence Cards,<br/>Template oder LLM + Code-Verifier"]
    end

    subgraph Infra["Infrastruktur (Docker Compose)"]
        PG[("PostgreSQL 18<br/>+ pgvector<br/>Port 5432")]
        RD[("Redis 8<br/>Broker DB0 / Results DB1")]
        S3[("SeaweedFS<br/>S3-kompatibel<br/>Port 8333")]
    end

    EXT["ASR lokal: faster-whisper small<br/>CPU/int8, Deutsch<br/>Deepgram nur explizit optional"]
    LLM["LLM: Gemini (Cloud)<br/>3.1 Flash Lite / 3.8 Flash<br/>JSON-Modus, austauschbarer Adapter"]
    ELEVEN["ElevenLabs Agent, optional<br/>Live-Audio + Gespräch; serverseitiger Schlüssel"]
    WEBS["Websuche (Zweitquelle)<br/>Wikipedia-API oder Tavily"]

    WEB -- "Kamera/Mikro" --> MP_W
    WEB -- "Aufnahme" --> MR
    WEB --> PCM["AudioWorklet: 16 kHz mono Int16<br/>Live-Sprechfeedback im Backend-Modus"]
    PCM -- "WS /api/speech/live: PCM" --> SP
    FLAGS["FeatureFlags pro Take<br/>Modell, Modus, Pose Lab,<br/>Sprachfeedback pro Typ"] --> MP_W
    MP_W -. "Track fingers, bis 5 Hz" .-> HAND["Hand Landmarker: 21 Punkte pro Hand<br/>auch ohne Torso, kein Upload"]
    HAND -. "Pose Lab" .-> LAB["T1–T12, Pocket<br/>lokale Diagnose, keine Events"]
    WEB --> DSP["AudioWorklet lokal: RMS/YIN<br/>Energiehüllkurven-Tempo-Proxy"]
    DSP --> LOCAL_SPEECH["SpeechEvaluator: 3 s stimmhafte Sprache<br/>Referenz langsam nachführen, Stille zählt nicht<br/>Pausen, Pegel, Pitch, Rhythmus + Review-Marker"]
    LOCAL_SPEECH --> WEB

    SP -- "finale Wörter + Text; vorher vorläufiger Text" --> WEB
    SP -- "nur bei provider=deepgram; PCM, serverseitiger Schlüssel" --> DG["Deepgram EU Nova-3<br/>Deutsch, live + Wort-Timestamps"]
    DG -- "vorläufig/final, CloseStream-Abschluss" --> SP
    PCM -- "WS /api/speech/feedback: PCM" --> SP
    SP --> LIVE_SIG["API-Thread: gleiche Signalregeln alle 5 s<br/>Adaptive Referenz ab stimmhafter Sprache<br/>max. 5 min, ein Slot; PCM nur im RAM"]
    LIVE_SIG -- "feedback: position_ms + Events<br/>ein Hinweis, 15-s-Cooldown pro Typ" --> WEB
    MP_W --> RULES["PoseEvaluator: Neutralstellung, Geometrie, Mindestdauer<br/>posture/gesture-Events; lokale Evidenz"]
    MOB -- "Kamera" --> MP_M

    WEB -- "fetch: /speech, /sources,<br/>/transcription, /factcheck,<br/>/questions, /health" --> MAIN
    MOB -- "Upload + Job-Polling" --> MAIN
    WEB -. "Typen" .-> OAS
    OAS -. "Quelle der Wahrheit" .-> MAIN

    MAIN --> SP
    MAIN --> TR
    MAIN --> SO
    MAIN --> FC
    MAIN --> QR
    MAIN --> RV
    RV -- "Session/Take/Event/Review/Job" --> PG
    RV -- "nur temporärer Analyse-Upload" --> S3
    RV -- "enqueue: nur Job-ID" --> CEL

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
        FE["frontend<br/>Next.js :3000<br/>Rewrite /api -> backend:8000"]
        BE["backend<br/>einziger Builder des gemeinsamen Images<br/>uvicorn :8000, --reload"]
        WK["worker<br/>verwendet Backend-Image, kein Pull<br/>Celery, Concurrency 2"]
        PG[("postgres<br/>pgvector :5432<br/>Volume: postgres_data")]
        RD[("redis :6379<br/>AOF, noeviction<br/>Volume: redis_data")]
        ST[("storage<br/>SeaweedFS :8333<br/>Volume: media_data")]
    end

    User(("Browser /<br/>Smartphone")) -->|"Port 3000"| FE
    FE -->|"healthy"| BE
    BE -->|"postgres healthy"| PG
    BE -->|"storage healthy"| ST
    BE -->|"redis healthy"| RD
    WK -->|"backend healthy vor Start"| BE
    WK --> PG
    WK --> ST
    WK --> RD
    WK -. "LLM_BASE_URL / LLM_MODEL<br/>(Gemini, OpenAI-kompatibel)" .-> LLM(["Gemini; austauschbarer Adapter"])
    BE -. "ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID" .-> EL(["ElevenLabs; Voice optional"])
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
    Note over FE: Im lokalen Live-Modus AudioWorklet und SpeechEvaluator ohne Upload

    FE->>FE: MediaPipe Pose lokal (Web Worker)
    FE->>BE: WS /speech/feedback: start, PCM nach ready
    loop alle 5 Sekunden, maximal 5 Minuten
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
    W->>W: RMS-Pegel, YIN-Pitch, Silero VAD, Silben-Peaks
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
    W->>W: merge_timeline (Events deduplizieren)
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
        C->>A: POST /takes/id/audio (file, transcribe, config)
        A->>P: Job + idempotente Response atomar reservieren
        A->>S: Upload temporär, unter Session-Lock
        A->>Q: Job-ID
        Q->>W: audio_analyze
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
    W->>W: Finale Events, Pausen-Merge, Coverage, Karten, max 3 Findings
    opt mode=llm
        W->>L: Begrenzte Evidence Cards + erlaubte Platzhalter-Texte
        L-->>W: JSON-Auswahl
        W->>W: Schema/Katalog prüfen, ein Retry, dann Template
    end
    W->>P: review.v1 + Verification, nur wenn Eltern/Revision bestehen
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
    Q --> EX["extract.py<br/>PDF je Seite - PPTX je Folie<br/>DOCX je Absatz - TXT/MD je Block"]
    EX --> CH["chunking.py<br/>~1200 Zeichen, Satzgrenzen,<br/>~200 Overlap"]
    CH --> EM["embeddings.py<br/>jina-embeddings-v2-base-de<br/>768 dim, lokal ONNX"]
    EM --> PGDB[("Postgres + pgvector<br/>sources, source_chunks<br/>+ tsvector (deutsch, GIN)")]

    SEARCH["POST /sources/search"] --> RET["retrieval.py<br/>Hybrid: pgvector-Kosinus<br/>+ Volltextsuche<br/>Reciprocal Rank Fusion"]
    PGDB --> RET
    RET --> HITS["Top-k SourceHits<br/>mit Zitat-Ort: page/slide/<br/>paragraph/line"]
    FCQ["Fact-Check je Aussage<br/>(app/factcheck/pipeline.py)"] -- "Suchanfrage" --> RET
    HITS --> JUDGE["LLM-Urteil mit Zitat<br/>exakt oder konservativ fuzzy; Fundort bindend<br/>Zahlen/Negation bleiben gleich<br/>ungültiges Zitat: unchecked"]
    JUDGE -. "nicht belegt" .-> WEBQ["Websuche als Zweitquelle<br/>(Wikipedia / Tavily)"]
    JUDGE --> EVT["fact-Events auf der Timeline"]
    HITS --> QA["Frage-Simulator<br/>(app/questions/pipeline.py)<br/>Lücken-Fragen + Antwort-Abgleich"]
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
    BE->>S3: factcheck-jobs/id/request.json
    BE-->>FE: 202 {job_id, status_url}
    W->>S3: Request laden
    W->>W: Wörter → nummerierte Sätze mit Start/Ende
    W->>L: Aussagen extrahieren (nur Satznummern, kein t_ms)
    loop pro Aussage (parallel, LLM_CONCURRENCY)
        W->>PG: Hybrid-Suche in den Quellen der Collection
        W->>L: Urteil + wörtliches Zitat aus den Auszügen
        W->>W: quote_in_text prüft Zitat, sonst verworfen
        opt nicht belegt und use_web
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

## 5b. Datenfluss: Frage-Simulator und Voice-Agent

Der Web-Review hat zwei Ansichten: **Review moments** (begrenzte Wiedergabe-
Fenster im lokalen Video, zeitgenaue Anmerkungen) und **Practice questions**.
Vor der Aufnahme werden `presentationMode` (startup/thesis/school/nonprofit)
und `sourceCollectionId` im Take eingefroren. Der Modus steuert fachliche
Schwerpunkte in beiden Fragepfaden, keine Scores oder Noten.

```mermaid
sequenceDiagram
    actor U as Nutzer
    participant FE as Review (QuestionPractice)
    participant BE as FastAPI (questions/router)
    participant S3 as SeaweedFS
    participant W as Celery Worker
    participant PG as Postgres + pgvector
    participant E as ElevenLabs Agent
    participant L as Gemini (JSON-Modus)

    U->>FE: Practice questions
    opt Kein Transkript vorhanden
        U->>FE: Transcribe this take (Upload-Hinweis)
        FE->>BE: POST /speech/analyze, transcribe=true, local_only=true
        FE->>BE: GET /speech/jobs/id (Polling)
    end
    FE->>BE: GET /questions/agent/settings
    alt Speak with the agent, explizit starten
        FE->>BE: POST /questions/agent (Wörter, Collection, Modus, Funde)
        BE->>S3: agent-context-jobs/id/request.json
        BE-->>FE: 202 Job-ID
        W->>PG: Hybrid-Suche in der Collection des Takes
        W->>S3: status.json mit begrenztem Kontext, request.json löschen
        FE->>BE: GET /questions/agent/jobs/id (Polling)
        FE->>BE: POST /questions/agent/session
        BE->>E: Signed URL anfordern (API-Key bleibt serverseitig)
        BE-->>FE: Signed URL, Cache-Control no-store
        FE->>E: SDK-WebSocket mit Kontext und Modus im Prompt-Override
        loop Eine Frage nach der anderen
            E->>FE: Frage / Reaktion, Audio + Text
            U->>FE: Gesprochene Antwort
            FE->>E: Mikrofon-Audio
        end
        U->>FE: End conversation oder Ansicht verlassen
        FE->>E: Verbindung schließen, Mikrofon freigeben
    else Practice by typing
        FE->>BE: Optional automatisch POST /factcheck + Status-Polling
        FE->>BE: POST /questions (Wörter, Funde, Collection, Modus)
        W->>PG: Hybrid-Suche
        W->>L: Fragen mit Beleg-Verweisen
        W->>S3: status.json, Request löschen
        FE->>BE: GET /questions/jobs/id
        U->>FE: Eine Frage beantworten
        FE->>BE: POST /questions/answers + GET /questions/answers/id
        W->>L: Quellenvergleich + Nachfrage
        W->>W: Zitat im Quelltext prüfen
        FE->>FE: Nächste Frage / Nachfrage anzeigen
    end
```

ElevenLabs-Antworten sind Modellvorschläge; sie durchlaufen nicht den
serverseitigen Zitat-Check der getippten Antworten. Der Kontext enthält nur
bis zu acht passende Auszüge, nicht die gesamte Bibliothek. Ohne konfigurierte
Zugangsdaten bleibt die Sprachfunktion sichtbar als nicht verfügbar. Der
bestehende `/questions/answers/voice`-Endpunkt mit ASR bleibt für API-Clients
kompatibel; der neue Web-Review verwendet den direkten ElevenLabs-Dialog.

## 6. Frontend-Navigation (Web)

```mermaid
flowchart TD
    DRAWER["AppShell Navigations-Drawer (außer Live-Studio)<br/>Open Sans + #3803bf, verbindet /, /live,<br/>/sources, /review-preview, /gestures, /demo"]
    LOADING["app/loading.tsx<br/>418 LoadingScreen<br/>PNG-Logo, CSS-Animation, Reduced-Motion"]
    LP["/loading-preview<br/>Dauerhafte Animationsvorschau"] --> LOADING
    SP["/ und /stats-preview<br/>Aufnahmeübersicht im Browser-Arbeitsbereich"] --> SC["StatsDashboard<br/>Anzahl, Dauer, Hinweise und Transkripte<br/>aus aufgenommenen Takes, sonst Leerzustand"]
    DRAWER --> SP
    DRAWER --> LIVE
    DRAWER --> SRC
    DRAWER --> RP
    DRAWER --> WALK
    DRAWER --> DEMOPAGE
    RP["/review-preview<br/>Synthetisches Video + Beispiel-Momente<br/>ohne Scores und Performance-Kurve"]
    SC -->|"Letzte Aufnahme"| LREV
    SC --> LIVE
    LOADING -. "Suspense-Fallback beim Laden" .-> LIVE
    LIVE["/live - LiveStudio<br/>Vollbild-Layout ohne Menü, Pose-Overlay,<br/>Options: Vortragstyp, Material und Analyse,<br/>kalibrierte Hinweise mit Rot-/Grün-Tönung,<br/>Kamera aktivieren -> Aufnahme starten"]
    STORE["Root-Layout: LiveSessionProvider<br/>Aufnahmen bleiben beim Wechsel<br/>von / zur Review erhalten"] -.-> LIVE
    DEMOPAGE["/demo<br/>Optionales Beispiel + Setup"]
    DEMOPAGE -->|"Demo starten / konfigurieren"| PRAC["/practice/sessionId<br/>PracticeStudio (Mock-Gateway)"]
    LIVE --> SRC["/sources<br/>SourceLibrary: Upload, Status,<br/>Suchtest"]
    SRC -->|"Weiter zur Aufnahme"| LIVE
    LIVE --> WALK["/gestures: synthetischer 22-s-Rundgang<br/>gleiche Regeln, keine Genauigkeitsvalidierung"]
    WALK --> LIVE
    ADMIN["/admin (Navbar, ohne Login)<br/>AdminPanel: Pose-Haltezeit,<br/>Hinweis-Mindestdauer + Lücke,<br/>Pose feedback: On/Review/Off je Regel,<br/>Analysis features: Modell/Modus/Feedback"] -->|"localStorage, ab nächster<br/>Kalibrierung/Aufnahme"| LIVE

    PRAC --> STATE{"Phasen"}
    STATE --> P1["preflight -> countdown -><br/>presenting -> judge_thinking -><br/>judge_question -> answering"]
    P1 --> PREV["/practice/sessionId/review<br/>ReviewWorkspace: Findings, Retry,<br/>Evidenz-Sprung"]

    LIVE --> LREV["/live/sessionId/review<br/>LiveReview: Review moments + Practice questions<br/>Video und Feedback nebeneinander,<br/>lesbare, farbige Zeitstempel zum Springen,<br/>Transkript, Quellencheck und Exporte als Details"]
    LREV -->|"POST /factcheck,<br/>GET /sources?collection_id"| FCAPI["Fact-Check-Job<br/>sourceCollectionId des aufgenommenen Takes"]
    LREV -->|"POST /questions/agent + /agent/session<br/>oder /questions + /answers"| QAPI["ElevenLabs-Dialog oder getippte Fragen<br/>Startup, Thesis, Schule, Nonprofit<br/>eine Frage pro Schritt"]
    LREV -. "bestehender Direktlink" .-> MOM["/live/sessionId/moments<br/>FeedbackReplay: Filter,<br/>Clip-Sprung + Loop"]
    LREV --> LA["/live/sessionId/analysis<br/>ReviewAnalysis: Video + Event-Zeitachse<br/>keine erfundenen Scores"]
    RP --> RA["ReviewAnalysis + PerformanceGraph<br/>gemeinsame video.currentTime-Zeitachse<br/>Anmerkungen, Quellen, Abschnitt-Loop"]
    LA --> RA

    SRC -->|"collection_id aus localStorage"| UPLOAD["POST /sources<br/>POST /sources/search"]

    subgraph Transport["VideoTransport (wahlweise)"]
        DEMO["LocalVideoTransport<br/>kein Upload; echte Pose-Events"]
        ANA["AnalysisTransport<br/>Backend-Upload + Polling"]
    end
    LIVE --> Transport
```

## 7. Mobile-App (Expo) Screens

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

## 8. Datenmodell (Postgres)

```mermaid
erDiagram
    SOURCES ||--o{ SOURCE_CHUNKS : "hat Chunks"
    SESSIONS ||--o{ TAKES : "hat Takes"
    SESSIONS ||--o{ REVIEW_IDEMPOTENCY : "24 h, bei Zugriff bereinigt"
    TAKES ||--o{ EVENTS : "Cascade"
    TAKES ||--o| REVIEWS : "Cascade"
    TAKES ||--o{ JOBS : "Cascade"

    SESSIONS {
        uuid id PK
        uuid collection_id "gleiche Collection wie Sources"
        text title
        text status
        jsonb consent
        jsonb capture
        timestamptz created_at
    }
    TAKES {
        uuid id PK
        uuid session_id FK
        text status
        int duration_ms
        text mime_type
        jsonb timebase
        jsonb audio_probe
        jsonb coverage
        jsonb analysis "Wörter, Summaries, Fact-Check, Fragen"
        int revision
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
    }
    REVIEWS {
        uuid id PK
        uuid take_id FK "UNIQUE"
        text status
        jsonb report "review.v1"
        jsonb generator
        jsonb verification
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
| SeaweedFS `review-audio/{session}/{take}/{job}/upload` | nur temporär für Take-Analyse; vor erfolgreichem Job-Abschluss oder bei Analysefehler löschen, Cleanup-Fehler erneut versuchen |
| SeaweedFS `speech-jobs/{job_id}/` | Job-Konfig, Status, Analyse-Ergebnis (Original wird nach Abschluss gelöscht) |
| SeaweedFS `factcheck-jobs/{job_id}/` | Status und Fact-Check-Ergebnis; `request.json` (Transkript) wird nach Abschluss gelöscht |
| SeaweedFS `question-jobs/{job_id}/`, `answer-jobs/{job_id}/` | Status mit Fragen bzw. Antwort-Abgleich (bei Sprache mit Transkript der Antwort); `request.json` (Transkript, Antworttext) und `recording` (gesprochene Antwort) werden nach Abschluss gelöscht |
| SeaweedFS `agent-context-jobs/{job_id}/` | Vorbereiteter Prompt mit gekürztem Transkript und Quellenauszügen; Request wird gelöscht, Ergebnis bleibt wie andere Jobs gespeichert, noch kein TTL-Cleanup |
| Redis DB0 / DB1 | Celery-Broker / Result-Backend, Locks |
| Browser `sessionStorage` | Practice-Session-State (`pitch-coach:v1:<id>`) |
| Browser `localStorage` | Quellen-Collection-ID (`pitchcoach.sourceCollection`), auch vom Fact-Check genutzt |
| Browser-Speicher (Live-Workspace) | FeatureFlags, presentationMode und sourceCollectionId pro Take, ElevenLabs-Gespräch, Wörter, Pose-Events mit runtime, Fact-Check-Ergebnis, Fragen und Antworten; nur bis zum Neuladen |

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

    EV --> MT["Legacy merge_timeline()<br/>Tempo aus ASR, Pausen akustisch"]
    EV --> PERSIST["Take-Adapter + Browser-Pose-Vertrag<br/>eventId, dedupeKey, tMs, peakMs,<br/>durationMs, stage, ruleVersion<br/>kein gaze, kein Medien-Key"]
    PERSIST --> REVIEWMERGE["Finale Review-Timeline<br/>Pausen: ASR mit mid_sentence, sonst längste<br/>WPM und Silben/s getrennt<br/>stabil nach Start, Peak, ID"]
    REVIEWMERGE --> REPORT["Aggregate + explizite Coverage<br/>max 3 geerdete Findings<br/>review.v1 in Postgres"]
    MT --> FILTER["Sprachmarker-Filter pro Take<br/>Speech / pause / pace / filler / volume / pitch"]
    FILTER --> UI["Timestamp-Timeline im Frontend<br/>Klick springt zum Videoclip ±2s"]
    REPORT -. "Client-Anbindung separat" .-> UI
```

Pose-Event-Payload und JSONL tragen optional `runtime` mit Modell, Modus und
tatsächlichem Delegate; synthetische Fixtures haben keine erfundene Laufzeit.
Hand-/Lab-Ergebnisse fließen nicht in das gemeinsame Event-Modell.
Lokale Sprachmarker tragen Start/Ende ab `MediaRecorder.onstart` im Feedback-
Vertrag. Bei überlappenden Typen ersetzt die vollständige Backend-Analyse den
Live-Marker im Review. Ein fehlender neutraler Handwert im Pose-Payload ist
`null`; die Haltungsreferenz benötigt keine ruhigen oder sichtbaren Hände.

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
        Q1["POST /questions"]
        Q2["GET /questions/jobs/{job_id}"]
        Q3["POST /questions/answers"]
        Q4["GET /questions/answers/{job_id}"]
        Q5["POST /questions/answers/voice"]
        Q6["GET /questions/agent/settings"]
        Q7["POST /questions/agent (202)"]
        Q8["GET /questions/agent/jobs/{job_id}"]
        Q9["POST /questions/agent/session"]
        V1["POST /sessions<br/>GET / DELETE /sessions/id"]
        V2["POST /sessions/id/takes<br/>GET /takes/id"]
        V3["POST /takes/id/events<br/>POST /takes/id/audio"]
        V4["POST /takes/id/review<br/>GET /takes/id/review<br/>GET /takes/id/timeline"]
        V5["GET /jobs/id<br/>GET /takes/id/evaluation"]
        V6["POST /takes/id/factcheck<br/>POST / GET /takes/id/questions<br/>POST /takes/id/questions/answers"]
    end

    WEBF["Web-Frontend"] --> H2 & S1 & S2 & S3LIVE & S4LIVE & T1 & R1 & R2 & R3 & R4 & R5 & F1 & F2 & F3 & Q1 & Q2 & Q3 & Q4 & Q5 & Q6 & Q7 & Q8 & Q9
    MOB["Mobile App"] --> H2 & S1 & S2 & T1 & R1 & R2 & R4 & R5
    CLIENT["Neuer Take-Client-Vertrag<br/>Frontend-Integration separat"] -.-> V1 & V2 & V3 & V4 & V5 & V6
```

Der Vertrag wird über `npm run api:generate` aus dem FastAPI-Code generiert (`api/openapi.json` -> `api/schema.d.ts`) und ist damit immer synchron zum Backend.

## Deep Research (24.10.2026)

Die Architektur ist in `docs/11-deep-research-validation.md` gegen Forschung
und offizielle API-Dokumentation geprüft. Drei Korrekturen sind bindend:
Live-Analyse läuft **ereignisgetrieben auf finalisierten ASR-Segmenten**
(nicht auf einem festen 20–30-s-Takt), der finale Fact-Check ist
**quellengebunden, aber nicht autoritativ** (keine Live-Urteile,
„nicht gefunden“ ≠ „falsch“), und das Gespräch hat **harte Grenzen**
(3–5 Hauptfragen, ein Follow-up, 10 Minuten Hard Stop). Gemini ist Cloud ohne
EU-Region-Pinning; nur synthetische Demo-Daten oder Vertex AI mit EU-Region.

# AI Decision Log — Presentation Trainer

Datum: 24.10.2026. Tatsächliche Schritte aus dem Compose-Auftrag.
Tool: Codex mit Shell, Docker und offiziellen Projektquellen.
Keine erfundenen menschlichen Freigaben oder Modellresultate.

| # | Aufgabe | KI-Beitrag | Risiko / tatsächliche Korrektur | Entscheidung / Herkunft | Evidenz |
|---|---|---|---|---|---|
| 1 | Backend-Stack aufsetzen | FastAPI, MediaPipe und PostgreSQL in Compose vorbereitet | MediaRecorder ist eine Browser-API, kein Backend-Dienst | Genannte Bausteine vom Nutzer; Browser-Zuordnung durch Codex | `compose.yaml`, `backend/requirements.txt`, MDN-Link in `backend/README.md` |
| 2 | Dateien speichern | S3-Dateispeicher von strukturierten Daten getrennt | Audio-/Video-Bytes würden sonst die relationale Datenbank belasten; keine gemessene Performancebehauptung | SeaweedFS als lokale Infrastrukturwahl durch Codex; Produkt-Speicherregeln bleiben offen | `backend/README.md`, `docs/01-product.md` |
| 3 | Container-Version auswählen | SeaweedFS-Releases und Docker-Tags geprüft | GitHub-Release 4.49 existiert, Docker-Tag `chrislusf/seaweedfs:4.49` lieferte jedoch `not found`; auf vorhandenes 4.48 korrigiert | Technische Korrektur durch Codex | Docker-Registry-Prüfung, `compose.yaml` |
| 4 | Architektur prüfen | MediaPipe-Wheels für Linux ARM64 und AMD64 geprüft | Eine pauschale AMD64-Erzwingung wäre auf diesem ARM64-Mac unnötig | Native Architektur beibehalten; keine Aussage zur Inferenzqualität | PyPI `mediapipe` 1.1.1, `backend/Dockerfile` |
| 5 | Speicherung begrenzen | Nur synthetischen Smoke-Test und Health-Endpunkte angelegt | Persistente Volumes löschen Daten nicht beim normalen Stoppen; echte Aufnahmen benötigen eine weitere Entscheidung | Vorgabe aus `AGENTS.md`; Test-Cleanup und Reset-Befehl dokumentiert | `backend/scripts/smoke.py`, `backend/README.md` |
| 6 | Infrastruktur tatsächlich prüfen | Compose-Build, Smoke-Test und Ausfall-/Wiederanlaufprüfung ausgeführt | Ein erfolgreicher Build allein belegt weder S3-Zugriff noch Persistenz; Inferenz und Browser-Aufnahme bleiben ungeprüft | Codex ergänzte reale Verbindungs-, Datei- und Lebenszyklusprüfungen mit synthetischen Daten | Prüfprotokoll unten |
| 7 | IntelliJ IDEA und VS Code einrichten | Geteilte Compose-Aktionen und Python-Debug-Konfigurationen angelegt | Container-Hostnamen funktionieren nicht für eine lokale Python-Instanz; gleichzeitig gestartete APIs belegen denselben Port | Nutzerauftrag; gemeinsamer lokaler Launcher liest `.env`, verwendet localhost und stoppt den Docker-Backend-Container vor dem lokalen Start | `.run/`, `.vscode/`, `backend/scripts/dev.py`; lokaler Readiness-Check mit PostgreSQL/S3 bestanden |
| 8 | IDE-Start auf Docker Compose vereinfachen | Native IntelliJ-Konfiguration für alle Dienste angelegt; lokalen FastAPI-Launcher und Python-Debug-Konfigurationen entfernt | Der Python-Start verlangte einen gültigen Modul-SDK; der Nutzer möchte ausschließlich den vollständigen Container-Stack starten | Ausdrückliche Korrektur des Nutzers; VS Code startet weiterhin über den Compose-Build-Task | `.run/Docker Compose.run.xml`, `.vscode/tasks.json`, `backend/README.md` |
| 9 | Lange Jobs vom API-Prozess trennen | Celery-Worker und Redis in Compose ergänzt; gemeinsames Image, Async-Publish-Helfer, Healthchecks und synthetischer Queue-Test | Celery-Publishing ist synchron und wird deshalb in einem Thread ausgeführt. Der Redis-Ausfalltest zeigte zusätzliche Result-Backend-Retries; diese wurden begrenzt. Queue-Wiederzustellung erfordert idempotente Tasks | Ausdrücklicher Nutzerauftrag für Celery/Redis; noch keine ASR-Anbieterentscheidung oder Transkriptions-Implementierung | `compose.yaml`, `backend/app/celery_app.py`, `backend/app/jobs.py`, `backend/scripts/smoke.py` |
| 10 | Sprachanalyse-Pipeline (Feature 3, Backend) | Claude Code: `app/speech/` mit `Transcriber`-Interface, FFmpeg-Audioextraktion, Pausen-, Füllwort-, Wiederholungs- und Tempo-Events, `POST /speech/analyze` | Kein ASR-Anbieter gewählt, daher nur `JsonTranscriber` (vorberechnete Wörter); Schwellenwerte sind ungeprüfte Heuristik-Startwerte; Tempo nur relativ zum Session-Median, nicht absolut | Nutzerauftrag; Anbieter, Füllwortliste und Schwellenwerte bleiben Teamentscheidung | `backend/tests/test_speech.py`: 12 Tests mit synthetischen Daten bestanden (Python 3.12, lokal) |
| 11 | Sprachanalyse auf das Audiosignal umstellen, Transkription trennen | Claude Code: `app/speech/` analysiert nur das Signal (Pegel, F0 per YIN, Sprachaktivität, Silbenspitzen als Zeitreihe; Events pause/volume/pitch/pace); wortbasierter Code nach `app/transcription/` (Events mit `source="asr"`); gemeinsames `Event`-Schema in `app/events.py` | Signalbasierte Silbenrate und Monotonie sind Näherungen; nur mit synthetischen Tönen geprüft, nicht mit echter Sprache. Testerwartung für Lautstärke korrigiert: Referenz ist der Median der ganzen Aufnahme inkl. leisem Abschnitt (≈ −10 dB statt theoretisch −15,6 dB) | Nutzerauftrag (Signal-Zeitreihe, Transkription als eigene Pipeline, alles mit Timestamp) | `backend/tests/`: 22 Tests bestanden (Python 3.12, lokal); 60 s synthetisches Audio in ≈ 0,7 s analysiert |
| 12 | API-Vertrag für TypeScript generieren | Codex: OpenAPI-Export aus FastAPI, TypeScript-Typen und Aktualitätscheck ergänzt; Merge mit Celery/Redis zusammengeführt | Generierte Typen prüfen nur zur Compile-Zeit; freie Event-Payloads und JSON im Multipart-String bleiben untypisiert. Kein laufender Server für den Export nötig | Ausdrücklicher Nutzerauftrag für TypeScript-Generierung und Integration nach main | `api/`, `package.json`, zentrale `README.md`; Generierung, Aktualitätscheck und TypeScript-Kompilierung bestanden; 22 Backend-Tests nach der Konfliktlösung bestanden (Python 3.14, temporäre Testumgebung) |
| 13 | Frontend gemeinsam mit dem Backend starten | Eigener Next.js-Container, API-Proxy und gemeinsamer Compose-Start für beide IDEs; neue HTTP-Integration aus main übernommen | Browser können den Docker-Hostnamen `backend` nicht auflösen; `/api` wird auf derselben Origin an FastAPI weitergeleitet. Merge-Konflikt in `next.config.ts` gelöst, konfigurierbares Test-Build-Verzeichnis erhalten | Nutzerkorrektur: Frontend ebenfalls im Container statt lokalem npm-Run | `frontend/Dockerfile`, `compose.yaml`, `frontend/next.config.ts`; Prüfprotokoll unten |
| 14 | ML-Audioanalyse mit Hintergrundjobs | Codex: Silero VAD v6.2 als gepinntes ONNX-Modell (SHA-256 geprüft), RMS/YIN beibehalten, 3-s-Kalibrierung; Deepgram Nova-3 (de, EU) hinter `Transcriber`; asynchroner Upload/Status und kombinierte Timeline, S3-Ergebnisse und Löschung der Originale | VAD nur an synthetischer Sprache/Rauschen geprüft; keine Genauigkeitsbehauptung. Deepgram-HTTP-Vertrag mit Mock geprüft, kein echter Anbieteraufruf ohne Schlüssel. Deutsche Füllworterhaltung laut Detaildokumentation nicht zugesichert; kein `filler_words=true`. Englische Feature-Unterstützung nicht auf Deutsch übertragen. JSON-Demo explizit markiert; kein stilles Ersetzen fehlgeschlagener ASR durch erfundene Wörter. S3-Ausfälle/abgebrochene Jobs können Cleanup verzögern; kein allgemeiner Retention-Job. Prozessabbruch zwischen bezahltem ASR-Aufruf und Speicherung kann diesen Aufruf wiederholen | Nutzer bestätigt vorgeschlagenes Vorgehen und eigenen Arbeitsbranch; Entscheidung für ersten austauschbaren ASR-Adapter innerhalb dieses Auftrags | `backend/tests/test_ml_audio.py`, `backend/tests/fixtures/`, `backend/scripts/smoke_audio.py`; Quellen und Prüfumfang unten |
| 15 | README und Altbestand aufräumen | Haupt-README auf 17 Zeilen gekürzt; alten Frontend-Plan, doppelte Produktnotiz und überholte Video-WebSocket-Dokumentation entfernt; ungenutzte Validatoren und Handshake-Typen gestrichen | Referenzen vor dem Löschen geprüft; aktuelle HTTP-Upload-/Job-Grenze im Handoff dokumentiert, API-Tooling-Anleitung zentralisiert. Zwei Tests entfernten ausschließlich die gelöschten WebSocket-Helfer; Replay- und HTTP-Tests bleiben aktiv | Ausdrücklicher Nutzerauftrag für Vereinfachung und Cleanup | Compose-Start, Typecheck, Lint, 25 Frontend-Tests, Backend-Smoke-Test und lokale Markdown-Links bestanden |
| 16 | Quellen-Upload und RAG-Retrieval (Feature 2, Vorbereitung für Fact-Check und Frage-Agent) | Claude Code: `app/sources/` mit Extraktion (PDF pro Seite, PPTX pro Folie inkl. Notizen/Tabellen, DOCX, TXT/MD), Chunking mit Seiten-/Folienangabe, lokalem Embedding-Modell hinter `Embedder`-Interface, pgvector + deutscher Volltextsuche mit Reciprocal Rank Fusion, Celery-Ingest, REST-API und Frontend-Seite `/sources`; Postgres-Image auf `pgvector/pgvector:0.8.6-pg18-trixie` umgestellt | Embedding-Anbieter war offen; lokales Modell gewählt, damit keine Dokumente an Dritte gehen (≈0,6 GB RAM pro Prozess). Erste Keyword-Suche zerlegte „260.000“ anders als PostgreSQL und fand die Zahl nicht; korrigiert, indem PostgreSQL die Suchanfrage selbst tokenisiert. Gemessener CPU-Durchsatz des Modells auf einem 12-Kern-Linux-Laptop nur ≈3 Abschnitte/s (1 MB Text ≈ 6 min); Test auf Mac M5 Pro steht aus, schnellere Alternativen gemessen (MiniLM-L12 ≈12/s, potion-multilingual ≈800/s). Next-Proxy puffert Uploads standardmäßig nur bis 10 MB; `proxyClientMaxBodySize` auf 100 MB gesetzt (betraf auch Aufnahmen). Kein OCR. Suche liefert immer Top-k, auch wenn nichts passt. Retrieval-Qualität nur mit synthetischen Mini-Dokumenten geprüft, keine Genauigkeitsaussage | Nutzerauftrag (Quellen hochladen, später für Fact-Check/Fragerunde nutzen); Modell-, Chunking- und Ranking-Wahl durch Claude Code, vom Team zu bestätigen | `backend/tests/test_sources.py` (inkl. DB-Roundtrip gegen pgvector), `backend/scripts/smoke_sources.py` im Compose-Stack bestanden; Frontend-Unit-Tests, Typecheck, Lint; Browser-Check Desktop/375 px ohne Konsolenfehler |
| 17 | Lokale Whisper-Transkription als Standard | Codex: faster-whisper hinter dem bestehenden `Transcriber`-Protokoll, lokales Modell im Image, Deepgram nur noch optional; `RecordingAnalysis.text` und regeneriertes API-Schema | Modellqualität, deutsche Füllwörter und Wortgrenzen nicht bewertet. Docker-Build mit Modelldownload nicht geprüft. PyAV 15.1.0 nötig, da 19.0.2 den faster-whisper-Dekoder bricht. Kein Cloud-Zwang, aber auch kein Nachweis besserer Erkennung | Nutzerauftrag: Speech-to-Text mit lokalem Modell, Review vor Push | Nach dem Merge mit main: 46 Backend-Tests bestanden, zwei übersprungen; echter `tiny`-Lauf über `run_analysis` mit synthetischer deutscher Sprache; API-Aktualitätscheck bestanden; Details unten |
| 17 | Fact-Check (Feature 2) mit RAG zuerst und Web als Zweitquelle | Claude Code: `app/factcheck/` mit OpenAI-kompatiblem Chat-Client (httpx, keine neue Abhängigkeit), Aussagen-Extraktion über nummerierte Sätze (Timestamps aus den Wort-Timestamps, nicht vom Modell), Hybrid-Retrieval je Aussage in der Quellen-Collection, LLM-Urteil mit wörtlichem Zitat, Zitat-Prüfung per `quote_in_text`, danach Websuche (Wikipedia-API ohne Schlüssel oder Tavily) nur für nicht belegte Aussagen; Celery-Task `fact_check`, `POST /factcheck`, Status-Polling, `fact`-Events; Frontend: Transkription im Live-Studio als Opt-in, Fact-Check-Panel in der Review mit Sprung zur Videostelle | Nutzer legte nur „OpenAI-kompatibel“ fest; URL und Modell bleiben Teamentscheidung, daher Konfiguration über `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY` und `/factcheck` antwortet ohne Konfiguration mit 503. `temperature` wird standardmäßig nicht gesendet, weil manche Modelle nur den Standardwert akzeptieren; JSON-Modus abschaltbar. Ein vom Modell erfundenes Zitat wird verworfen (Ergebnis „nicht gefunden“ statt Scheinbeleg); technische Fehler heißen „unchecked“, nicht „falsch“. Wikipedia lehnte den ersten User-Agent mit HTTP 403 ab (Wikimedia-Policy verlangt Kontaktangabe); Repo-URL ergänzt. Websuche mit unpräziser Suchanfrage liefert themenfremde Artikel; das Urteil hängt dann am Modell. Qualität von Extraktion und Urteil mit echtem Modell nicht gemessen; Transkript-Sätze gehen an den LLM-Anbieter, Suchanfragen an Wikipedia/Tavily (im UI vor dem Start benannt) | Nutzerauftrag (Fact-Check mit RAG über hochgeladene Quellen wie Vorlesungsfolien, Web-Fallback, eigener Branch, danach nach main); Prompt-, Grenzwert- und Wikipedia-Wahl durch Claude Code, vom Team zu bestätigen | `backend/tests/test_factcheck.py` (10 Tests), Backend-Suite 51 bestanden; Frontend: Typecheck, Lint, 49 Unit-Tests, 18 Playwright-Tests Desktop/375 px; End-to-End im isolierten Compose-Stack, siehe unten |
| 18 | Live-Transkription nahezu in Echtzeit, Backend-Prototyp (Stufe B) | Claude: `WS /speech/live` in `app/speech/live.py`: PCM-Int16-Frames über WebSocket, Start/Stop-Steuerung, 10-s-Rollfenster (alle ≥ 2 s neu transkribiert), Wort-Cursor dedupliziert die Fensterüberlappung, kumulativer Text, Abschluss durch `stop`, 30 s Stille oder 600 s Audio; ein Live-Slot pro Prozess (`asyncio.Semaphore(1)`, Überlastungsverweigerung 1013). `StreamingTranscriber`-Protokoll + `WhisperStreamingTranscriber` in `app/transcription/streaming.py`; Modellcache der Batch-ASR geteilt (`_load_whisper_model` → `load_whisper_model`). Latenz-/Smoke-Skript `scripts/smoke_live.py`; `WHISPER_LIVE_*`-Konfiguration in `.env.example`/`compose.yaml` | Deduplizierung verschiebt Fenstergrenzwörter leicht (sie erscheinen im nächsten Fenster); kein „echter" Streaming-Decoder, Laufzeitverhalten fremder Hosts unbewiesen. Browser-Sender fehlt, OpenAPI sagt nichts über WebSocket-Routen. `medium` auf einer 7,7-GB-VM OOM → schwache Hosts müssen `WHISPER_LIVE_MODEL=tiny` + `WHISPER_LIVE_BEAM_SIZE=1` setzen. Smoke-Live gegen ein echtes Modell noch nicht gemessen (Docker in dieser VM nicht verfügbar) | Team-Auftrag „near-realtime"-Wortlieferung als Teilprogramm; Chunk-/Fenster-/Timeout-Limits selbst gewählt, Team kann überschreiben | 12 neue WebSocket-Tests (Fake-Transcriber mit ton-codierten Wörtern, Protokoll-/Beschäftigungs-/Zeitüberschreitungspfade) bestanden; 58 Backend-Tests gesamt; API-Aktualitätscheck; Details unten |

## Prüfprotokoll (24.10.2026)

Umgebung: Docker Desktop auf ARM64. Keine Aussage zu einem Deployment.

- `docker compose config --quiet`: bestanden.
- `docker compose up --build -d --wait`: alle drei Dienste gesund.
- `docker compose exec -T backend python -m pip check`: keine
  Abhängigkeitskonflikte.
- `docker compose exec -T backend python -m scripts.smoke`: bestanden;
  MediaPipe 1.1.1 Tasks importierbar, FFmpeg vorhanden, PostgreSQL-Roundtrip,
  synthetische WAV-Datei hochgeladen und bytegenau gelesen, HTTP-Range-Read
  mit 206, anonymer Zugriff mit 403 abgewiesen, Datei danach gelöscht.
- API-Dokumentation erreichbar; konfigurierte CORS-Origin zugelassen,
  nicht konfigurierte Origin ohne Freigabe-Header.
- PostgreSQL und Storage jeweils gestoppt: Readiness 503, Liveness 200.
  Nach Wiederanlauf jeweils wieder Readiness 200.
- Alle drei Container mit `--force-recreate` neu angelegt: Test-Zeile und
  S3-Testobjekt blieben erhalten. Anschließend Testtabelle und Objekt entfernt.

Browser-/Gerätetests und Modell-Inferenz sind nicht Bestandteil dieses
Infrastrukturauftrags. Der lokale Stack bleibt gestartet.

## Frühere IDE-Konfiguration (24.10.2026, durch Eintrag 8 ersetzt)

- JSON/XML der geteilten Konfigurationen geparst; Compose-Befehle stimmen
  zwischen IntelliJ und VS Code überein.
- Git-Regeln geprüft: freigegebene IDE-Dateien werden erfasst; `.env`,
  `.idea/`, `.venv/` und persönliche VS-Code-Dateien bleiben ignoriert.
- Lokale Python-3.12-Umgebung unter `backend/.venv` installiert;
  `pip check` ohne Konflikte.
- Den gemeinsamen Launcher tatsächlich gestartet: Docker-Backend gestoppt,
  lokales FastAPI erreichbar, Readiness mit PostgreSQL und S3 erfolgreich,
  API-Dokumentation erreichbar. Lokalen Prozess danach beendet.
- Die Befehle direkt aus den VS-Code-Tasks `Compose: up` und
  `Backend: smoke (Docker)` ausgeführt: Rebuild und alle Smoke-Prüfungen
  bestanden. Der vollständige Docker-Stack läuft wieder.
- Native IDE-Breakpoint-Sitzungen wurden nicht verifiziert. Die damalige
  Python-Startkonfiguration und ihre Anleitung wurden mit Eintrag 8 entfernt.

## Compose-Start aus IntelliJ (24.10.2026)

- Native Konfiguration **Docker Compose** über den Run-Button gestartet;
  lokaler Docker-Socket, `compose.yaml`, Image-Build aktiviert und alle Dienste.
- IntelliJ zeigt `Running: (3/3)`; PostgreSQL, Storage und Backend anschließend
  auch per Docker-Healthcheck gesund.
- `pip check`, der synthetische Smoke-Test und `/health/ready` bestanden.
- JSON/XML geparst; keine lokale Python-Run-Konfiguration mehr vorhanden.
  VS Code verwendet den bestehenden Standard-Build-Task **Compose: up**.

## Celery und Redis (24.10.2026)

- `docker compose up --build -d --wait`: alle fünf Dienste gesund;
  `pip check` ohne Konflikte. Bestehende IDE-Konfigurationen starten weiterhin
  alle Compose-Dienste; kein zusätzlicher Python-Run nötig.
- Erweiterter Smoke-Test bestanden: synthetischer Fünf-Sekunden-Job läuft im
  separaten Worker, während beide API-Health-Endpunkte antworten. Ergebnis
  stimmt mit dem Test-Token überein und wird danach gelöscht.
- Worker gestoppt: Job angenommen, API weiter bereit. Redis anschließend
  gestoppt: Liveness 200, Readiness 503. Nach Begrenzung der
  Result-Backend-Retries scheitert Publizieren im lokalen Test nach 0,03 s
  mit `QueueUnavailable`; keine garantierte Produktionslatenz.
- Redis-Container neu erstellt: wartender Job aus dem AOF-Volume weiter
  vorhanden. Nach Worker-Start erfolgreich ausgeführt und Ergebnis gelöscht.
- Separater Wiederanlauftest: derselbe Producer-Prozess und der laufende
  Worker verarbeiten nach Redis-Neustart wieder einen Job, ohne selbst neu
  gestartet zu werden.
- Nur synthetische Testdaten; keine Transkription, externen Anbieter oder
  Aufnahme-/Job-Endpunkte implementiert. Der lokale Stack bleibt gestartet.

## Frontend in Compose (24.10.2026)

- `docker compose up --build -d --wait`: alle sechs Dienste gesund, nativ auf
  ARM64. Node.js und npm-Abhängigkeiten liegen im Frontend-Image, Next.js-Cache
  in einem Docker-Volume; lokale SDKs sind für den Start nicht erforderlich.
- Frontend-Seiten erreichbar. `/api/health/ready` erreicht FastAPI;
  synthetische Wort-Timestamps und eine stille WAV-Datei lassen sich über den
  Frontend-Proxy analysieren. Backend-Fehlercodes 404/422 bleiben erhalten.
- Temporäre Testseite unter `frontend/src/` angelegt, geändert und über HTTP
  geprüft: beide Änderungen ohne Rebuild sichtbar. Testseite danach entfernt.
- Nach Integration der Audio-Jobs: Upload der synthetischen Sprach-Fixture
  über `/api/speech/analyze` mit `transcribe=false` liefert 202; Status-Polling
  über den Frontend-Proxy liefert das Silero-Ergebnis. Original in S3 gelöscht,
  Test-Metadaten anschließend entfernt; kein ASR-Anbieter aufgerufen.
- Im Frontend-Container: Typecheck, Lint und 27 Unit-Tests bestanden,
  einschließlich relativer `/api`-URL mit HTTPS und abweichendem Browser-Port.
- 33 Backend-Tests einschließlich echtem Silero-Modell im temporären Container,
  Backend-Smoke-Test mit PostgreSQL/S3/Celery sowie OpenAPI-/TypeScript-
  Aktualitätschecks bestanden. Beide Team-Updates aus main erhalten.
- IntelliJ enthält wieder nur die gemeinsame Docker-Compose-Konfiguration;
  VS Code startet ebenfalls alle Dienste und bietet Frontend-Logs als Task.
- Keine echte Kamera-/Mikrofonaufnahme, kein Smartphone- oder Deployment-Test
  in diesem Durchlauf. Der lokale Stack bleibt gestartet.

## ML-Audioanalyse (24.10.2026)

- Silero-Modell: [offizielles v6.2-Repository](https://github.com/snakers4/silero-vad/tree/v6.2),
  [ONNX-Eingabelayout](https://github.com/snakers4/silero-vad/blob/v6.2/src/silero_vad/utils_vad.py).
  Lizenz wird mit dem Modell in das Image geladen; Prüfsumme zusätzlich beim Laden geprüft.
- Deepgram: [deutsche Modellunterstützung](https://developers.deepgram.com/docs/models-languages-overview/),
  [Wort-Timestamps](https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded),
  [EU-Endpunkt](https://developers.deepgram.com/changelog/2025/12/3),
  [Füllwortfunktion](https://developers.deepgram.com/docs/filler-words).
  Die Füllwort-Detailseite nennt Englisch. Deutsche Marketingaussagen reichen daher
  nicht als Nachweis für „äh/ähm“. Dies bleibt eine offene Qualitätsprüfung.
- In unserem Prototyp liefert die gemeinsame Timeline ASR-Tempo und akustische
  Pausen, ohne diese Events doppelt anzuzeigen. Einzelpipelines bleiben einsehbar.
- API-Vertragsänderung: `/speech/analyze` liefert jetzt 202/Job-ID statt synchroner
  Analyse. Status/Ergebnis unter `/speech/jobs/{job_id}`; OpenAPI/TypeScript regeneriert.
- Tests verwenden Töne, erfundene Wort-Timestamps sowie per eSpeak NG generierte
  deutsche Sprache, Rauschen und Stille. Kein menschliches Audiomaterial.
- Verifiziert in dieser Umsetzung: 33 Backend-Tests mit Python 3.12 im
  Linux-AMD64-Container bestanden, einschließlich echter ONNX-Inferenz. Docker-
  Build und fünf Healthchecks bestanden; `pip check` ohne Konflikte. Bestehender
  Infrastruktur-Smoke und neuer Audio-Smoke über HTTP/Redis/Celery/S3 bestanden,
  sowohl lokal ohne ASR als auch mit explizitem JSON-Demoprovider. Original und
  Smoke-Objekte danach gelöscht. OpenAPI-/TypeScript-Aktualitätscheck bestanden.
- Nicht verifiziert: echter Deepgram-Aufruf (kein API-Schlüssel eingerichtet),
  deutsche Füllwortqualität, menschliche Stimmen, Browser-/Geräteverhalten und
  ein öffentliches Deployment. Testclient meldet eine bestehende Deprecation
  für HTTPX; im Container war zusätzlich das Pytest-Cacheverzeichnis schreibgeschützt.
- Während der Arbeit eingegangene Frontend-Teamänderungen aus `origin/main`
  konfliktfrei in den Arbeitsbranch integriert. Deren Live-Kamera-/SSE-Protokoll
  bleibt separat; die Audio-Job-API ist noch nicht in die neue Oberfläche eingebunden.

## Merge-Vorbereitung der Audio-PR (24.10.2026)

Neue Teamänderung auf `main` verband die Kamera mit dem alten synchronen
`/speech/analyze`. Vor dem Merge angepasst: vollständige Aufnahme weiter erst
nach Stop hochladen, `transcribe=false` beibehalten, 202/Job-ID prüfen und
Status bis completed/failed abfragen. Abbruch beendet Polling; Fehler lassen
das lokale Video verfügbar. Zeitbudget des Pollings: elf Minuten, keine Aussage
zur Modelllatenz. ASR bleibt separat über die API verfügbar. Damit ist die
oben dokumentierte fehlende Audio-UI-Anbindung für die lokale Signalanalyse behoben.

Prüfung vor PR/Merge: 33 Backend-Tests (echtes Silero-Modell), 26 Frontend-Tests,
sechs Browser-Tests mit synthetischer Kamera auf Desktop/schmalem Viewport,
TypeScript, ESLint, Produktionsbuild und API-Aktualitätscheck bestanden.

## Cleanup (24.10.2026)

- Vier überflüssige Dateien entfernt; Next.js-Ignore-Muster im Root gebündelt.
- Alle lokalen Markdown-Dateilinks geprüft; keine Referenzen auf gelöschte
  Dokumente oder WebSocket-Validatoren im aktiven Bestand.
- `docker compose up --build -d --wait`: alle sechs Dienste gesund.
- Frontend-Typecheck, ESLint und 25 Unit-Tests bestanden; Backend-Smoke-Test
  prüft PostgreSQL, S3, Queue und API-Antwort während eines Worker-Jobs.
- Frontend-Seiten und `/api/health/ready` per HTTP geprüft. Keine neue
  Kamera-/Mikrofon-, Smartphone-, Anbieter- oder Deployment-Prüfung.
- Neue Pose-Capture-Arbeit aus main integriert; Konflikte in den kurzen
  Frontend-/Handoff-Anleitungen und der verschobenen Ignore-Datei gelöst.
  Generierte Pose-Runtime bleibt in Git und im Docker-Build-Kontext ignoriert.
- Danach erneut Typecheck, ESLint und 34 Frontend-Tests bestanden; Pose-Worker,
  JS-/WASM-Runtime und Modell über HTTP erreichbar, Modell-Prüfsumme stimmt
  mit dem eingecheckten Asset überein.

## Gesten und Jury-Pfad (24.10.2026)

Auftrag: Gestenerkennung recherchieren, implementieren, leicht demonstrierbar
machen und das Wie/Warum der Auswertung dokumentieren.

- Geprüfte Primärquellen und Alternativen: `docs/04-gesture-evaluation.md`.
  Codex entschied für die vorhandene Pose-Landmark-Kette statt eines zusätzlichen
  Fingerklassifikators, da grobe Bewegungen die gewählten Beobachtungen tragen.
- Korrektur: Die bisherigen zeitgesteuerten Marker auf echten Kameraaufnahmen
  wurden entfernt. Der lokale Modus erzeugt nur aus tatsächlich gelieferten
  Landmarks abgeleitete Beobachtungen. Synthetische Demonstration bleibt ein
  eigener, sichtbarer Pfad, ohne Kamera und ohne behauptete Modellgenauigkeit.
- Technische Parameter sind als `pose-rules-v1` offengelegt. Keine wissenschaftlich
  validierten Grenzwerte, keine Scores; Prüfung am echten Demo-Gerät bleibt offen.
- Unsicherheit: Fehlende Pose pausiert Auswertung; fehlende Hände sperren nur
  Gesten. Kalibrierung, Mindestdauer, Hysterese und Cooldown verhindern definierte
  Arten von Flackern. Eye Contact wird aus diesen Punkten nicht abgeleitet.
- Zeitbezug: Rohdaten und Events beginnen bei `MediaRecorder.onstart` neu.
  Review nutzt die lokale Aufnahme und zeigt die Regel-Evidenz am Event.
- Menschliche Entscheidungen noch nötig: Prüfung auf Veranstaltungsgerät,
  belastbare Evaluationsdaten, Quellen-/Frage-Anbieter. Nutzer hat lokale
  Vorführung bestätigt; öffentliches Hosting ist keine Abnahmevoraussetzung. Details und
  ehrliche Demo-Abgrenzung: `docs/05-jury-demo.md`.

### Team-Integration und Rückmeldung zur Seitwärtsbewegung

- Neu eingetroffenes `main` integriert: lokale Quellen-/RAG-Pipeline,
  Architekturdiagramme und Handgelenk-Kreuzungsgeometrie mit Debug-Readout.
  Die Kreuzungsgeometrie bleibt erhalten; ihre separate Hinweis-Zustandsmaschine
  wurde in die gemeinsame Event-Auswertung überführt. Ein Hinweis gleichzeitig,
  neue Baseline/Zeitachse pro Aufnahme und exportierbare Evidenz gelten nun auch
  dort. Fehlende Handgelenke werden nicht überbrückt.
- Nutzer-Test: Hand hoch und Hände zusammen funktionierten. „Seitwärts“ fehlte,
  weil der Nutzer den gesamten Körper versetzte; die erste Regel maß nur den
  Torso-Winkel. `pose-rules-v2` ergänzt deshalb einen separaten horizontalen
  Positionsvergleich zur Baseline. Der Winkel-Schwellwert wurde nicht einfach
  gesenkt. Live-Debug zeigt beide Messwerte, Anleitung und Beispiel wurden
  korrigiert. Der Nutzer bestätigte danach auch die Positionsregel.
- Rückmeldung zur Verzögerung: Die Positionsregel wartete bewusst 1,5 s.
  `pose-rules-v3` verkürzt diese Mindestdauer auf 0,8 s; Schwelle und Hysterese
  bleiben gleich. Debug ergänzt gemessene Frame-/Inferenzzeit und Abtastrate.
  Safari als Ursache ist nicht belegt; die Messung trennt Verarbeitungszeit
  von der absichtlichen Bestätigungsdauer. Die neue Geschwindigkeit braucht
  noch subjektive Rückmeldung am Gerät.
- Der Nutzer hat lokale Vorführung ausdrücklich als ausreichend bestätigt.
  Die offene öffentliche Hosting-Frage entfällt für diese Abnahme.
- Beim Neubau der integrierten Backend-Abhängigkeiten lief ein PyPI-Download in
  den Standard-Timeout. Der Build verwendet nun 120 s Download-Timeout und fünf
  Retries; keine Paketversionen wurden zur Umgehung geändert.
- Spätere Team-Änderungen integrieren native Quellen-/Practice-Flows, ein
  gemeinsames Overlay und den Loading-Screen. Der native Pfad importiert noch
  `CrossArmsCue`; deshalb bleibt dieser Adapter samt Tests für die App erhalten.
  Die Web-Auswertung nutzt ausschließlich `PoseEvaluator`. Die Migration der
  Browser-Hinweise darf die parallele native Arbeit nicht brechen.
### Lokale Prüfung nach Integration

- 63 Frontend-Tests und 18 Mobile-Tests bestanden; ESLint in beiden Workspaces
  sowie TypeScript in beiden Workspaces bestanden. Die native App wurde hier nicht auf einem
  physischen Gerät neu qualifiziert.
- 36 Browser-Tests auf Desktop und 375-px-Viewport bestanden: synthetischer
  Jury-Rundgang, echte Regel-Engine mit kontrollierten Landmarks, lokale
  Aufnahme/Replay/Loop/Export, Ausfälle sowie Sources-/Sample-Pfade. Das echte
  MediaPipe-Modell wurde auf synthetischen Kameraframes geladen. Kein Nachweis
  für Kamera-Erkennungsqualität oder physisches Safari/iOS.
- Frontend-Produktionsbuild bestanden. Der Loop-Test beobachtet jetzt den
  tatsächlichen Zeitsprung beim Wiederholen; langsames Polling hatte den kurzen
  Abschnitt bei vierfacher Wiedergabe wiederholt verpasst.
- 43 Backend-Tests im Compose-Image bestanden, einschließlich echtem Silero-
  Modell und synthetischem pgvector-Datenbanktest. Keine externen ASR-/LLM-
  Anbieteraufrufe als Nachweis verwendet.
- Compose-Smoke bestätigt API/FFmpeg/MediaPipe, PostgreSQL, S3-Zugriff und
  Cleanup sowie getrennte Celery-Verarbeitung bei weiter antwortender API.
  Quellen-Smoke: synthetisches PPTX hochgeladen, lokal eingebettet, gesucht und
  wieder gelöscht. Alle sechs Compose-Dienste sind gesund.
- Hand hoch, Hände zusammen und seitlicher Versatz wurden vom Nutzer mit der
  echten Kamera bestätigt. Daraus folgt keine gemessene Erkennungsquote.
  Die auf 0,8 s verkürzte Positionsregel ist automatisiert geprüft; eine neue
  Rückmeldung zur empfundenen Geschwindigkeit und ein Safari-Vergleich fehlen.
## Lokale Whisper-Transkription als Standard (24.10.2026)

- Nutzerauftrag: Speech-to-Text mit einem lokalen Modell statt Cloud-Zwang.
  `faster-whisper` 1.2.1 läuft im bestehenden Celery-Worker auf CPU und liefert
  Wort-Timestamps; `WhisperTranscriber` implementiert weiterhin das vorhandene
  `Transcriber`-Protokoll. Deepgram bleibt als optionaler Adapter erhalten,
  JSON nur als explizit gewählte synthetische Demo.
- Modell: [faster-whisper](https://github.com/SYSTRAN/faster-whisper),
  [CTranslate2](https://github.com/OpenNMT/CTranslate2),
  [Systran/faster-whisper-small](https://huggingface.co/Systran/faster-whisper-small)
  (MIT). Das Image lädt das Modell beim Build nach `/app/models/whisper`; zur
  Laufzeit wird nicht nachgeladen. `WHISPER_MODEL` ist ein Build-Argument,
  `WHISPER_MODEL_PATH` zeigt auf die eingebetteten Dateien.
- Ergebnis enthält zusätzlich `RecordingAnalysis.text`; die Wortliste bleibt
  für Timestamps und Events maßgeblich. Das OpenAPI-/TypeScript-Schema wurde
  regeneriert.
- PyAV ist auf 15.1.0 begrenzt: Mit 19.0.2 bricht der Dekoder mit
  `TypeError: open() got an unexpected keyword argument 'metadata_errors'` ab.
- Verifiziert nativ mit Python 3.13 und ffmpeg 7.1.5; nach dem Merge mit
  `origin/main` erneut 46 Backend-Tests bestanden, zwei übersprungen (Silero-
  Modell und DB-Roundtrip ohne lokale Instanzen). Ein echter `tiny`-Lauf über
  `run_analysis` mit `tests/fixtures/speech-de.wav`, inklusive Text und
  Wort-Timestamps, war bestanden. Standardmodell `small` wurde nicht qualitativ
  bewertet.
- Nicht verifiziert: Docker-Build mit Modell-Download (Docker in dieser VM nicht
  verfügbar), deutsche Füllwortqualität, menschliche Stimmen, GPU/`cuda`,
  Latenz und Speicherbedarf des `small`-Modells pro Worker. Keine Aussage zur
  Erkennungsgenauigkeit.

## Lokale Alternative statt OpenAI API: Zwischenstand (24.10.2026)

- Der Nutzer wählte zunächst OpenAI API, fragte dann ausdrücklich nach einer
  freien/lokalen Alternative. Umsetzung ohne API-Key: native Ollama-Inferenz
  mit Qwen3.5 4B Q4_K_M; Teamarbeit zu lokalem Whisper aus
  `feat/local-whisper-asr` integriert. Kein OpenAI-Aufruf durchgeführt.
- Auf M2 Pro/32 GB getestet. Der generische Ollama-Tag lud MLX und scheiterte
  bei JSON-Schema-Ausgabe mit HTTP 501. Expliziter GGUF-Tag funktioniert;
  `OLLAMA_NO_CLOUD=1`, Loopback-Server und kein automatischer Anbieterwechsel.
- Web-Review verbindet Whisper-Wörter, Zeitmarker, Quellenvergleich und
  Textantworten. Modellzitate werden gegen die tatsächlich gefundenen Chunks
  geprüft; ungültige Zitate unterdrücken Urteil und davon abgeleitete Rückfrage.
  Neue Jobs laufen in Celery, Redis enthält nur IDs, Inputs/Ergebnisse liegen
  in S3 und können im Review gelöscht werden. Kein automatischer TTL.
- Reale lokale Prüfung: drei erfundene Aussagen korrekt als gestützt,
  widersprochen und nicht gefunden eingeordnet (18,3 s); Korrekturantwort mit
  gültigem Zitat (5,1 s). Quellen und Coaching-Jobs anschließend gelöscht.
  Whisper `small` lieferte den Text der 6,845-s-eSpeak-Fixture mit 13 Wörtern.
  Dies ist Integrations-, keine allgemeine Qualitäts-/Füllwortvalidierung.
- Vor weiterer Main-Integration: 61 Backend- und 67 Frontend-Tests bestanden;
  Typecheck/ESLint sowie sechs gezielte Browser-Tests (Desktop und 375 px)
  einschließlich Transkription, Fehlererhalt, Zitatansicht, Wiederaufnahme des
  Antwort-Pollings und Löschung bestanden. Reales Mikrofon und Safari bleiben
  separate Gerätechecks. Setup, Begründung, Grenzen: `docs/06-local-coaching.md`.

### Konsolidierung mit aktueller Teamarbeit

- `origin/main` brachte parallel Fact-Check, Web-Zweitquelle, Frage-Simulator
  und eine Analyseansicht mit. Die separate neue `/coaching`-Implementierung
  wurde deshalb wieder entfernt: ein gemeinsamer Pfad über `/factcheck`,
  `/questions` und `/questions/answers` nutzt nun die Team-Module.
- Standard ist native Ollama-Inferenz, wenn `LLM_BASE_URL` und `LLM_MODEL` leer
  sind. Der kompatible Adapter bleibt explizit konfigurierbar. Websuche und
  deren Checkbox sind standardmäßig aus; keine unbeabsichtigten Suchanfragen.
- JSON-Schemas für Aussagen, Urteile und Fragen ergänzen die Team-Verweis- und
  Zitatprüfung. Ein ungültiges Zitat ist technisch `unchecked`, nicht die
  Behauptung „keine Evidenz gefunden“. Bei einer ungültigen Antwortbewertung
  wird keine darauf beruhende Nachfrage übernommen.
- Im ersten realen integrierten Lauf waren Frage-Verweise fehlerhaft. Mit
  JSON-Schema war die Ausgabe strukturell korrekt, doch eine korrigierte Antwort
  erhielt trotz passender Erklärung noch `contradicts`. Der Antwort-Prompt
  trennt jetzt ausdrücklich neue Antwort und frühere Behauptung. Das zeigt:
  gültiges JSON und gültiges Zitat beweisen kein richtiges Urteil.
- Danach echter Smoke auf demselben synthetischen Lernlabor-Fall bestanden:
  Quellenvergleich 10,1 s (stützt/widerspricht/nicht gefunden), passende Frage
  6,1 s, korrigierte Antwort als gestützt mit Zitat 4,1 s. Einzelner Lauf auf M2
  Pro/32 GB, kein Qualitätsbenchmark. Alle synthetischen Jobs/Quellen entfernt.
- Die Team-Job-Pipeline löscht Requests nach Abschluss. Ergebnisse bleiben
  in S3; die zuvor beschriebene separate Lösch-UI ist nicht mehr vorhanden.
  Setup und Speichergrenzen in `docs/06-local-coaching.md` entsprechen dem
  konsolidierten Stand. Kein OpenAI-Schlüssel oder gehosteter Modellaufruf nötig.
## Fact-Check End-to-End (24.10.2026)

Umgebung: Linux-Laptop, Docker. Isolierter Compose-Stack (`-p factcheck-e2e`,
eigene Ports und Volumes, vorhandenes Backend-Image, Code gemountet), danach
mit `down -v` entfernt. Kein echtes LLM verfügbar: ein deterministischer
OpenAI-kompatibler Stand-in (Container im selben Netz) beantwortete Extraktion
und Urteile per Regel. Damit ist der technische Ablauf geprüft, nicht die
Urteilsqualität eines echten Modells.

- Synthetische TXT-Quelle über `POST /sources` hochgeladen, vom Worker
  verarbeitet (`ready`), synthetisches Transkript über `POST /factcheck`
  geprüft, Ergebnis per Polling abgeholt, Quelle wieder gelöscht.
- Aussage mit Beleg in der Quelle: `supports`, Zitat aus `zahlen.txt` und
  nur gegen die Quelle geprüft (keine Websuche).
- Aussage ohne Beleg in der Quelle: echte Wikipedia-API abgefragt, Zitat aus
  dem Artikel „Mond“ wörtlich verifiziert, URL im Ergebnis.
- Erster Lauf: Wikipedia antwortete 403 (User-Agent ohne Kontakt); die Aussage
  wurde korrekt als „nicht gefunden“ mit Hinweis „Websuche fehlgeschlagen“
  gemeldet. Nach der Korrektur erfolgreich.
- Absturz des Stand-in-Modells führte zu Job-Status `failed` mit neutraler
  Fehlermeldung, ohne Transkript im Log.
- Events lagen auf den Satz-Timestamps des Transkripts (3000/7000/11000 ms).

## Frage-Simulator (24.10.2026)

Entscheidung (Nutzerauftrag „Fragesimulator vollständig einbauen“): Feature 5
nutzt dasselbe OpenAI-kompatible Modell wie der Fact-Check. Antworten nur als
Text, damit kein weiterer Drittanbieter (Browser-Spracherkennung) Audio erhält;
Spracheingabe bleibt offen.

- Fragen verweisen auf Befund-, Satz- und Auszugsnummern; Timestamps und
  Evidenz setzt der Code aus diesen Verweisen. Ein „Widerspruch“ ohne
  passenden Befund wird zur Klärungsfrage herabgestuft, eine „Lücke“ ohne
  wörtliches Zitat aus dem Auszug ebenso; Fragen ohne Bezug werden verworfen.
- Antwort-Abgleich wie im Fact-Check: Urteil nur mit wörtlich verifiziertem
  Zitat, sonst „nicht gefunden“. Keine Punkte oder Noten.
- Geprüft: `tests/test_questions.py` mit geskripteten Modellantworten
  (Verweisprüfung, Reihenfolge, Events, Antwort-Abgleich, API, Task-Wiederholung),
  Frontend-Unit-Tests für Client und Timeline-Momente. Qualität der Fragen mit
  einem echten Modell ist nicht gemessen.

## Voice-Agent mit Rollen (24.10.2026)

Entscheidung (Nutzerauftrag „Voice Agent nach dem Vortrag, Modi dummer
Schüler und Professor/Tutor, Vorlesungsunterlagen als Quellen“): Der
Frage-Simulator bekommt eine Rolle (`persona`) und ein Sprachgespräch. Die
frühere Entscheidung „nur Text“ ist damit für diesen Pfad aufgehoben.

- Spracheingabe über die vorhandene Deepgram-Anbindung (EU-Endpunkt) statt
  Browser-Spracherkennung: kein zusätzlicher Drittanbieter, funktioniert auch
  in Firefox/Safari. Audio und Antworttext werden nach dem Job gelöscht.
- Sprachausgabe über die Web Speech API (`speechSynthesis`) im Browser: kein
  API-Schlüssel, keine Latenz durch einen weiteren Dienst. Stimmqualität und
  Stimmenauswahl hängen vom Betriebssystem ab; je nach Browser kann die
  Synthese selbst einen Cloud-Dienst des Browser-Herstellers nutzen.
- „Dummer Schüler“ ist als neugieriger Erstsemester umgesetzt (naive,
  direkte Fragen, keine herabsetzende Darstellung). Beide Rollen sehen
  dieselben Fact-Check-Funde und Quellenauszüge; nur Prompt-Rolle, Anrede
  und Tonhöhe/Tempo der Stimme unterscheiden sich.
- Die gesprochene Reaktion des Agents (`reply`) wird verworfen und durch
  einen neutralen Satz ersetzt, wenn das Urteil kein wörtlich verifiziertes
  Zitat hat; so spricht der Agent keine ungeprüften Inhalte aus.
- Antwortende per Button „Done“, keine Stille-Erkennung (kein ungeprüfter
  Schwellenwert).
- Geprüft: `tests/test_questions.py` (Rollen-Prompts, gleiche Eingabe in
  beiden Rollen, Reaktion nur mit Zitat, Transkription → Abgleich,
  Stille → Wiederholung, Voice-API, Task löscht Audio), Frontend-Unit-Tests
  (Multipart-Upload, Gesprächsreihenfolge). Nicht geprüft: echtes LLM,
  echte Deepgram-Antwort, Mikrofon/Sprachausgabe auf echten Geräten
  (insbesondere iOS Safari).

## Lokaler integrierter Abnahmestand (24.10.2026, M2 Pro)

Aktueller Stand nach Zusammenführung mit `origin/main` (`9ab7a6f`):
Fact-Check und Frage-Simulator verwenden standardmäßig das oben beschriebene
lokale Ollama-Modell, nicht den optionalen OpenAI-kompatiblen Cloudadapter.
Die vorstehenden Team-Einträge dokumentieren ihre damaligen Einzelprüfungen.

- 67 Backend-Tests, 85 Frontend- und 18 Mobile-Unit-Tests bestanden.
- Vollständiger Browserlauf: 44 Tests bestanden. Danach erweiterter
  Quellen-/Frage-/Antwort-Flow: 2 Tests bestanden (Desktop und mobile Breite).
- Nutzer fand die Audio-Option nicht: Sie stand unterhalb der Kamera und war
  in Large view ausgeblendet. Jetzt steht **Speech analysis** direkt oberhalb
  der Kamera und bleibt in beiden Ansichten sichtbar. Nach dieser Änderung
  8 gezielte Browserprüfungen bestanden (Sichtbarkeit, Wechsel mit Mikrofon,
  große Ansicht, Audio-Upload, Transkript, Quellenvergleich und Fragerunde).
  Screenshots auf Desktop und mobiler Breite visuell geprüft.
- Typecheck und Lint beider Workspaces sowie finaler Next.js-Produktionsbuild
  bestanden. OpenAPI-Export mit laufender API identisch, TypeScript-Vertrag
  daraus aktualisiert. Alle sechs Compose-Dienste healthy; lokales Modell
  über `/api/factcheck/settings` verfügbar.
- Reale lokale Modellaufrufe und Whisper-Fixture wie oben erfolgreich;
  automatisierte Browserprüfungen verwenden synthetische Kamera/Audio-Daten
  und deterministische API-Antworten. Das ist keine Safari-/Mikrofon- oder
  allgemeine Modellqualitätsvalidierung. Nutzerprüfung mit echtem Mikrofon
  nach der Korrektur bestätigt: funktioniert, Verarbeitung als langsam
  empfunden, vom Nutzer für diesen Stand ausdrücklich akzeptiert. Keine
  gemessene Laufzeit oder Wortfehlerrate aus diesem informellen Versuch.
## Live-Transkription als Backend-Prototyp (24.10.2026)

- Nutzerauftrag: das Near-Realtime-Deliverable (`WS /speech/live` +
  `StreamingTranscriber`) umsetzen, testen, pushen. Der Browser-Sender ist
  ausdrücklich nicht Teil dieses Auftrags.
- Architektur: `app/speech/live.py` hält Puffer, Rollfenster und einen
  Live-Slot pro Prozess; `app/transcription/streaming.py` kapselt
  `faster-whisper` hinter `StreamingTranscriber.transcribe_window()` und
  liefert fensterrelative Wörter. Der Handler verschiebt sie auf die
  Sessionzeitachse, dedupliziert über einen Cursor (Ende des zuletzt
  gesendeten Wortes) und sendet kumulative Text-Meldungen (`transcript_text`
  aus `app/transcription/text.py`).
- Protokoll: `start`/`ready`/Binär-PCM/`stop` → `words`/`text` (final-Flag),
  `done`; Fehler als `error` + Close 1011; Überlastung als Close 1013; nur
  16 kHz Eingang. Endgültige Zeiten sind absolut; Video-Alignment rechnet der
  Browser selbst.
- Konfiguration: `WHISPER_LIVE_MODEL`, `WHISPER_LIVE_BEAM_SIZE`
  (Fallbacks auf `WHISPER_MODEL`/`WHISPER_BEAM_SIZE`), `WHISPER_LIVE_CHUNK_MS`
  (2000), `WHISPER_LIVE_MAX_WINDOW_MS` (10000),
  `WHISPER_LIVE_MAX_SECONDS` (600), `WHISPER_LIVE_MAX_IDLE_SECONDS` (30).
- Messwerte aus Eintrag 17 (gleiche 2,5-Kern-VM): `tiny` warm ≈ 1,0 s für
  6,8 s Sprachclip → sollte Echtzeit halten; `small`/beam 5 ≈ 4,8 s → für den
  Live-Einsatz Beam 1 (≈ 3,3 s) oder `tiny` wählen. `medium` OOM.

## Web-Integration der lokalen Backend-Pipelines (24.10.2026)

- `origin/goal` und `origin/feat/local-whisper-asr` zusammengeführt. Das Studio
  bleibt direkt unter `/` und `/live`, groß als Standard, mit ursprünglicher
  blauer Palette und Sans-Serif. Lokale Gesten bleiben ohne Backend nutzbar;
  Speech analysis ist oberhalb der Kamera zuschaltbar.
- Analyse-Upload mit `local_only=true`, vollständige Whisper-Wörter und
  Anbieterhinweise im Review, Quellenvergleich, Fragen und getippte/gesprochene
  Antworten verbunden. Bestehende Student-/Tutor-Rollen erhalten.
- Optionale Live captions senden AudioWorklet-PCM (16 kHz, mono, Int16 LE,
  100-ms-Frames) erst während der Aufnahme und nach Server-ready. Kumulativer
  Text ist Vorschau; vollständige Aufnahme-ASR bleibt die Review-Zeitbasis.
  Verbindungstimeout, Überlast und Abbruch beenden nur die Vorschau. Stop und
  Unmount schließen AudioContext und WebSocket, ohne zusätzliche Mikrofonfreigabe.
- Studio und Quellenbibliothek verwenden standardmäßig denselben `/api`-Proxy.
  Die Quellenbibliothek hatte noch `localhost:8000` als Fallback; korrigiert und
  mit einem Browsertest auf gleiche Origin und `/api/sources` abgesichert.
- Prüfungen: 94 Frontend-Unit-Tests; Typecheck, Lint, Produktionsbuild,
  Compose-Konfiguration und API-Schema-Aktualität bestanden. 82 Backend-Tests
  bestanden, Silero-Modell- und PostgreSQL-Roundtrip-Tests mangels Ressourcen
  übersprungen. Defektes Homebrew-FFmpeg durch separat extrahierte lokale
  Test-Binary ersetzt, keine Systeminstallation verändert.
- Browser: Desktop und 375 px, synthetische Kamera/Audio-/Pose-Eingaben und
  deterministische Backend-Antworten. Aufnahmesicherung bei Analysefehler,
  Live-PCM und Vorschau-Abbruch, Transcript → Fact-Check → Antwortprüfung,
  ursprüngliche Palette, direkter Einstieg und Quellen-Proxy geprüft.
  Veraltete Selektoren nach dem Merge korrigiert und betroffene Fälle erneut geprüft.
- Zusätzlich echter WebSocket-Upgrade durch den Produktions-Next-Proxy gegen
  den FastAPI-Live-Router: ready → PCM → text → stop/done bestanden, mit einem
  ausdrücklich synthetischen Transcriber. Keine Aussage zur Modellqualität.
- Lokaler Docker-Engine-Zugriff bleibt nicht verfügbar, auch nach Startversuch
  von Docker Desktop. Vollständiger Compose-/Whisper-/Ollama-Lauf sowie echtes
  Mikrofon und Safari wurden in dieser Integration nicht verifiziert.

## Lokalen Backend-Start wiederherstellen (24.10.2026)

- Beobachteter Fehler: `/api/health/live` lieferte HTTP 500, weil kein Dienst
  auf Port 8000 lief. Docker Desktop 4.44.3 stürzte bereits bei `--help` in
  `go-m1cpu` mit SIGSEGV ab; lokales `.env` fehlte. Vorhandenes Colima gestartet
  (ohne den globalen Docker-Kontext zu wechseln), lokale Konfiguration aus
  `.env.example` erstellt und Backend, Worker, Postgres, Redis und S3 gestartet.
- Der erste Compose-Build scheiterte an parallelen Exporten desselben
  `hackathon-fulda-backend`-Tags. Nur der Backend-Service baut das gemeinsame
  Image; der Worker verwendet es ohne Pull und wartet auf Backend-Readiness.
  `npm run test:compose` prüft eindeutige Builder und diese Startabhängigkeit.
- Aufnahmebeginn prüft nun `/health/ready` mit 10-s-Frist. Bei Ausfall wird
  korrekt „Nothing has been recorded“ samt lokaler Ausweichmöglichkeit angezeigt.
  Der allgemeine HTTP-Helfer behauptet nicht mehr, dass vor Aufnahmebeginn
  bereits eine Aufnahme gesichert sei. Drei Unit-Fälle (500, 503, Netzfehler)
  und Browser-Retry von Backendfehler zu lokaler Aufnahme ergänzen die Regression.
- Ollama lokal gestartet, konfiguriertes Qwen-Modell geladen. Für Colima nutzt
  `.env` `host.lima.internal`; dieser konkrete lokale Host wurde im Adapter
  zugelassen und mit Settings-/Host-Prüfung getestet. Kein Cloud-Fallback.
- Verifiziert: fünf Backend-Dienste healthy; `/api/health/ready` HTTP 200 mit
  Postgres/Redis/S3 ok; `/api/factcheck/settings` verfügbar. Reale synthetische
  WAV über den Frontend-Proxy → Queue → Silero/Whisper → Ergebnis und Löschung
  der Originaldatei bestanden. 97 Frontend-Unit-Tests, sechs Browserfälle,
  Typecheck/Lint, zwei Compose-Tests und 14 Fact-Check-/Adapter-Tests bestanden.
- Zusätzlicher echter Coaching-Smoke erreichte das lokale Modell und bestätigte
  eine Aussage mit geprüftem Quellenzitat. Ein anderes Urteil enthielt ungültiges
  JSON und wurde korrekt als `unchecked` ausgegeben; der strikte Drei-Urteile-
  Smoke schlug deshalb fehl. Modellqualität und vollständige echte Fragerunde
  bleiben ungeprüft; dies ist vom behobenen Verbindungs-/Startfehler getrennt.

## Gemeinsamer Integrationsbranch mit Analyse-Schaltern (24.10.2026)

- Nutzerauftrag: alle Teamfeatures auf einem eigenen Branch zusammenführen,
  IMAGE/VIDEO und Lite/Heavy umschaltbar machen, VIDEO als Standard und
  GPU-first mit CPU-Fallback verwenden. Sprach-/Pausenfeedback soll separat
  schaltbar sein. Branch: `feat/integrated-coach-flags`; kein Merge nach `main`.
- Integrierte Remote-Stände: `main` (`d00963d`, inklusive Start-/Readiness-Fix
  und gemeinsamer Open-Sans-/Akzentgestaltung),
  `goal` (`3b1ee02`), `feat/local-whisper-asr` (`4c697c0`),
  `feat/johannes-pose-requirements` (`b22102b`, inklusive T12),
  `hassan-poselog` (`67d1c8f`) und `bench/embedding-benchmark` (`ab8fd8a`).
- Der Web-Worker verwendet standardmäßig Lite/VIDEO, alternativ Heavy und/oder
  IMAGE. Beide Pose-Assets liegen lokal, float16/v1. VIDEO bekommt monoton
  steigende Timestamps. GPU-Probe, Warm-up und Runtime-Fallback erhalten Modell
  und Modus; Software-WebGL führt direkt zu CPU. Diagnose und JSONL/Event-Payload
  enthalten Modell, Modus und tatsächlichen Delegate. Höchstens 10 Hz, ein Frame
  gleichzeitig, Stale-Handling und Inferenz-Timeout bleiben erhalten.
- Die kalibrierte Event-/Review-Pipeline aus `goal` bleibt maßgeblich. Regelversion
  `pose-rules-v4` übernimmt die tolerantere Arme-verschränkt-Geometrie samt
  Unterarmwinkel, weiterhin mit 2 s Mindestdauer und 20 s Cooldown. Ein Test
  zeigte eine Überschneidung mit „Hände zusammen“: eng beieinanderliegende Hände
  auf den eigenen Körperseiten bleiben bei dieser Regel, statt als verschränkte
  Arme zu gelten. Baseline, Hysterese, Lückenbehandlung und gemeinsame Zeitachse
  bleiben erhalten. Keine Gaze-, Pocket- oder Bein-Produktionsereignisse.
- Pose Lab mit T1–T12 bleibt ein ausgeschaltetes Dev-Werkzeug. Nur dort wird
  Hand Landmarker geladen und bei sichtbarer Pose ausgeführt. Ein Handmodellfehler
  beendet nicht die Poseauswertung. Die Research-Anforderungen in `docs/04-pose-tracking-requirements.md`
  trennen nun den implementierten Stand von weiterführenden Zielentwürfen.
- **Analysis features** enthält Modell/Modus, einen Sprachfeedback-Hauptschalter
  und einzelne Schalter für Pausen, Tempo, Füllwörter, Lautstärke und Tonhöhe.
  Diese filtern Feedback-Marker, auch beim Wort-Import; Messwerte und Transkript
  bleiben erhalten. Die Analyse selbst bleibt opt-in. Optionen werden pro Take
  festgehalten, während Aufnahme/Analyse gesperrt und bis zum Reload im Workspace
  behalten. Sprachmarker kommen nach Stop; Live-Captions bleiben separat.
- Verifiziert: 147 Web- und 18 Mobile-Unit-Tests, 68 Playwright-Fälle auf Desktop
  und 375 px, 84 Backend-Tests im lokalen Python-3.12-Container. Ein PostgreSQL-
  Roundtrip-Test ohne `POSTGRES_HOST` übersprungen. Zwei Compose-Strukturtests,
  Lint und Typecheck beider Workspaces, Next.js-Produktionsbuild und API-Schema-
  Aktualität bestanden. Alle elf Architekturdiagramme mit Mermaid gerendert;
  Analyse-Schalter auf Desktop und mobiler Breite visuell geprüft.
- Browserfälle prüfen Aufnahme, Optionssperre, Pausenfilter inklusive Wort-Import,
  Review/Navigation, Pose-Export und Fehlerpfade. Alle vier Modell-/Modus-
  Kombinationen führen den echten lokalen Worker auf synthetischen Bildern aus;
  API-Antworten und Bewegungs-Landmarks in den UI-Tests sind deterministische
  Fixtures. GPU-Ausfälle werden im Worker-Test injiziert. Das belegt Datenfluss
  und Fehlerbehandlung, keine Erkennungsqualität oder echte Hardware-GPU-Abnahme.
- Vor Ort offen: Kamera-/Audio-Last, Heavy-Durchsatz, VIDEO-Verzögerung,
  Erkennungsqualität der zusammengeführten Regeln und Safari/iPhone.
  Dieser Integrationslauf hat keinen vollständigen Compose-/Whisper-/Ollama-
  End-to-End-Lauf wiederholt; frühere Ergebnisse oben gelten für deren jeweiligen
  Stand. Aktuelle Geräte-Checkliste: `docs/05-jury-demo.md`.

## Live-Sprechfeedback auf dem M5 Pro testen und anschließen (24.10.2026)

- Nutzer meint Analyse während des Sprechens, nicht Sprachausgabe/TTS.
  Verifizierte Hardware: Apple M5 Pro, 15 CPU-Kerne, 24 GB RAM; Backend
  im bestehenden Colima-Stack. Kein neues Modell oder Cloudanbieter.
- Vorhandene Silero/RMS/YIN/Silben-Regeln wiederverwendet. Einzelmessungen
  mit wiederholter synthetischer Sprach-Fixture: 10 s Audio in 0,105 s,
  30 s in 0,193 s, 60 s in 0,354 s, 180 s in 1,189 s, 300 s in 2,273 s.
  Dies ist kein fünfminütiger Live-Dauertest.
- `WS /speech/feedback` verarbeitet alle fünf Sekunden den bisherigen
  Aufnahmeabschnitt, damit die Anfangskalibrierung identisch zum Batch-Pfad
  bleibt. Begrenzung auf fünf Minuten, einen Signal-Slot und reine RAM-Daten;
  Inkremental-DSP bleibt erst bei längeren Aufnahmen erforderlich.
  Whisper-Captions haben einen unabhängigen Slot. UI: ein Hinweis, pro Typ
  15 s Cooldown, abschaltbare Hinweise; Aufnahme bleibt bei Ausfall erhalten.
- Tatsächlicher 30-s-Stream in Echtzeit, mittlere zehn Sekunden absichtlich
  leiser: sechs Updates, zwei Lautstärke-Beobachtungen; Lieferverzögerung
  nach jeweiliger Audioposition 80–182 ms (Median 140 ms). Dazu kommen das
  5-s-Sammelintervall und die jeweiligen Regel-/Kalibrierungsfenster.
  Echter Next.js-Proxy auf Port 3000: ready → PCM → feedback → done,
  gemessene Signal-Lieferverzögerung 112 ms.
- Gleichzeitig mit Whisper blieb die Signal-Vorschau bei 78–160 ms.
  Der Caption-Stream endete dagegen mit Keepalive-Timeout. Isolierte
  6,845-s-Fixture: erstes Wortpaket nach 5,08 s, final erst nach 20,26 s,
  mit falschen Wörtern. Deshalb keine Zusage für Live-WPM/Füllwörter und
  kein standardmäßiges Aktivieren von Captions. Batch-Whisper bleibt erhalten.
- Benchmark korrigiert: Verzögerung gegen die gelieferte Audio-/Wortposition
  messen, nicht gegen zuletzt gesendetes Audio (das verbarg Rückstau).
  Kurzes PCM-Endstück geht nicht mehr verloren. Zusätzlich begrenzt die
  gemeinsame Signalanalyse Events auf die echte Aufnahmedauer statt auf
  ein aufgefülltes Schlussfenster. Jeweils Regressionstests ergänzt.
- Verifiziert: 102 Frontend-Unit-Tests, Typecheck/Lint, 58 relevante Backend-
  Tests, drei Desktop-Browserfälle mit synthetischem Kamera-/Audioeingang.
  Browserfälle prüfen Live-Hinweis vor Stop, Caption-/Signal-Ausfall und
  weiterhin abspielbare Aufnahme. Echtes Mikrofon, Safari/iOS, parallele
  vollständige Coaching-Last und allgemeine Heuristikqualität bleiben offen.

## Fingertracking, Kalibrierung und lokale Live-Sprache korrigieren (24.10.2026)

- Nutzer meldet fehlende Finger und ausbleibende Live-Hinweise für Gesten sowie
  Sprache/Pausen. Nach der Korrektur meldet er „ok it works great“ und beauftragt
  ausdrücklich den Merge nach `main`. Das ersetzt die frühere Beschränkung auf
  den Integrationsbranch; es ist ein informeller Test ohne Genauigkeitsmessung.
- Der lokale Landmark-Export reproduziert den Posefehler: Modelle liefern gute
  Schulter-/Hüftpunkte, aber die pauschale Mindest-Schulterbreite von 12 % und die
  Hand-Stillhaltepflicht verhindern die gesamte Kalibrierung. Regelversion v5
  entfernt die pauschale Breite, behält sichere Punkte, nicht degenerierte
  Schultergeometrie und das Torso-Framing. Die 3-s-Haltungsreferenz hängt nur noch
  von Torso und Position ab. Im Nachspielen wird sie nach rund 3 s fertig und
  erzeugt Ereignisse. Der persönliche Export ist keine eingecheckte Testfixture;
  die Regressionen verwenden handgezeichnete synthetische Geometrie.
- Eine neutrale Handreferenz entsteht nur aus genug geeigneten Samples, sonst
  bleibt sie `null`. Die vorhandenen Schwellen für Handhöhe/-abstand werden dann
  geometrisch auf die Schultern bezogen; keine erfundene Referenz. Ein sichtbares
  angehobenes Handgelenk reicht für „Hand above shoulder“. Hold, Cooldown,
  Hysterese, Framing und die Aufnahmezeitbasis bleiben erhalten.
- `Track fingers` ist unabhängig vom Pose Lab, standardmäßig an und auf 5 Hz
  begrenzt. Hand Landmarker läuft auch ohne Torso; das Overlay kann allein eine
  Hand mit allen 21 Punkten zeigen. Abschalten lädt das Modell nicht. GPU/CPU-
  Fallback bleibt pro Modell erhalten. Pocket/T12 sind weiterhin nur Dev-Checks.
- `Speech analysis → Live · in browser` ist Standard. Der vorhandene Kamera-/
  Mikrostream speist ein lokales AudioWorklet (RMS, YIN, 40-ms-Frames). Ein neuer
  lokaler Evaluator nutzt die vorhandenen Backend-Parameter für Pausen, relative
  Lautstärke, Tonhöhenvariation und einen Energiehüllkurven-Rhythmus-Proxy.
  Kalibrierung braucht 3 s aktive Messungen, kein Feedback aus Anfangsstille;
  Mindestfenster, Datenlücken, ein Cue mit Mindestanzeige und Cooldown werden
  berücksichtigt. Das ist Energieaktivität, kein Silero-VAD und keine WPM.
- `Off · gestures only` braucht kein Mikro. Der Backend-Modus erhält den parallel
  eingetroffenen `WS /speech/feedback`-Pfad aus `a9f9f9c`, einschließlich dessen
  unabhängiger Whisper-Captions. Individuelle Feature-Schalter gelten auch für
  Server-Hinweise. Lokaler und Server-Signalpfad laufen je nach gewähltem Modus;
  keine doppelten Signalpipelines für denselben Take. Füllwörter/Wort-Tempo
  bleiben beim Transkript. Aufnahme, Zeitachse und Review behalten die Live-
  Marker auch bei Serverausfall; überlappende vollständige Analyse hat Vorrang.
- UI zeigt Pose-Kalibrierung, Handzahl und lokale Mikrofonaktivität. Audio-
  Kontexte und Worklets werden beendet, ohne den geteilten Stream vorzeitig zu
  stoppen. Aufnahmestart setzt die Referenz und den Signal-Evaluator auf die
  gemeinsame `MediaRecorder.onstart`-Zeit zurück.
- Verifiziert: 166 Web- und 18 Mobile-Unit-Tests; 37 Desktop- und 37 Mobile-
  Browserfälle bestanden. Der erste Mobil-Durchlauf fand einen seitlichen
  Überlauf der Aufnahmeleiste; nach dem CSS-Fix die komplette Mobile-Suite
  erneut erfolgreich. Audio-Browserfälle nutzen echte Worklet-Messungen auf
  synthetischen Tönen und Pausen; Modell-/UI-Fixtures bleiben synthetisch.
  Die vier Pose-Modell-/Modus-Kombinationen laden auch das echte Handmodell.
  Geprüft sind zusätzlich Timestamp-Anker, Preview-Verwerfung, Abschalten,
  Fehler-Fallback, Review-Erhalt und Audio-Ressourcenfreigabe. 92 Backendtests
  bestanden; ein PostgreSQL-Roundtrip ohne `POSTGRES_HOST` übersprungen.
  Lint/Typecheck beider Workspaces, Next.js-Produktionsbuild, API-Schema-Aktualität und alle elf Mermaid-Diagramme
  bestanden. Reale Finger-/Sprachqualität, Raumgeräusche, Safari-Mikro und
  längere gemeinsame Kamera-/Audio-Last sind dadurch nicht qualifiziert.


## Frühe UI-/Mock-Entscheidungen (historisch, konsolidiert)

Diese Einträge stammen aus dem frühen synthetischen UI-Prototyp. Sie dokumentieren
die damaligen Entscheidungen; den aktuellen Integrationsstand beschreiben die
neueren Einträge oben und `docs/04-integration.md`. Der separate alte UI-Log
wurde bei der Bereinigung hier zusammengeführt.

| Task | Agent output / risk | Decision or correction | Evidence |
|---|---|---|---|
| UI inspiration | Recording products can imply actual capture | Used Mobbin’s stage/sidebar hierarchy; kept camera optional and labeled preview separate from simulated analysis | `frontend/DESIGN.md`, `PracticeStudio.tsx` |
| Live simulation | Independent screen timers could drift or continue during pause | One monotonic mock clock and one provider subscription; pauses freeze event delivery and cue expiry | Clock and lifecycle tests in `coach.test.ts` |
| Report consistency | A prewritten report could cite a claim never delivered | Construct findings from finalized, delivered transcript segments | Early-finish and evidence-membership tests |
| Retry | Initial implementation repeated the whole pitch instead of focusing on the answer | Retry now carries prior evidence as judge context and returns directly to the evidence question | Focused-retry regression in `coach.test.ts` |
| Responsive preview | Browser testing found an aspect-ratio/minimum-height combination overflowing 375px | Explicit width bounds and independent mobile stage height | `noOverflow` assertions throughout `practice.spec.ts` |
| Demo controls | Local speed selection could disagree with the simulator after jumps or route changes | Synchronize displayed speed through session orchestration | Playback-speed regression in `practice.spec.ts` |
| Camera permissions | A delayed permission response could leak tracks after exit | Invalidate pending requests and stop returned tracks on stale completion | Late-camera cleanup browser test |
| Camera extension | A new request needs actual video while the original rehearsal only has transcript fixtures | Added a separate `/live` workspace; real silent capture with clearly labeled scripted markers or backend feedback | `frontend/tests/live.spec.ts` |
| Original backend contract (superseded) | The real endpoint was not available; the user requested a replaceable proposal | Encoded chunks over WebSocket with session acknowledgement, monotonic ranges and validated feedback; preserved local video on disconnect | Original prototype in Git history; replaced by HTTP upload/status in `docs/04-integration.md` |
| Replay meaning | Feedback counts or example markers could be mistaken for measured quality | Label frequencies and scripted examples; no invented performance score | Live review and category filter screens |
| Last-section looping | Encoded video can end slightly before the capture-clock duration, leaving the last section stopped | Handle the native video end event as well as the selected range boundary | End-of-file looping regression in `frontend/tests/live.spec.ts` |

## Repository-Bereinigung nach der Integration (24.10.2026)

- Nutzerauftrag: alte und ungenutzte Dateien allgemein bereinigen. Vor dem
  Entfernen wurden Imports, Next-/Expo-Routen, Plattformvarianten, Tests,
  Skripte, Assets und Dokumentverweise geprüft. Alle App-Komponenten haben
  weiterhin Aufrufer; iOS-Varianten, synthetische Demos, Modell-Assets und die
  neu hinzugefügten Review-Zielentwürfe sind bewusst weiter vorhanden.
- Die zwei alten separaten UI-/Handoff-Dokumente wurden entfernt. Die
  historischen Implementierungsentscheidungen stehen oben, der gemeinsame
  aktuelle Integrationsvertrag in `docs/04-integration.md`. Links in Web-/
  Native-README zeigen auf diese Dokumente. Veraltete Font-/Farbvorgaben und
  Beschreibungen des früheren Homepage-/Sprachmodus wurden aktualisiert.
- Entfernt: drei nicht referenzierte CSS-Klassen und der nur noch in Tests
  verwendete `handsInPockets`-Wrapper. Die bestehenden Geometrietests prüfen
  direkt das weiterhin verwendete `pocketCheck(...).inPocket`.
- Python-MediaPipe wurde nur im alten Setup-Smoke importiert. Pose und Hände
  laufen in den Clients. Das Backend benötigt diese Python-Abhängigkeit und
  die dafür explizit installierten GL-/Audio-Pakete nicht mehr. Neues Image
  ohne MediaPipe gebaut, Abwesenheit geprüft, `pip check` erfolgreich; gemessene
  Image-Größe 2.890 statt 3.238 GB. Aktive Dienste wurden nicht ersetzt.
- Verifiziert: 166 Web-/18 Mobile-Unit-Tests, 74 Browserfälle, 92 Backendtests
  im neuen Image; ein PostgreSQL-Retrievaltest ohne `POSTGRES_HOST` übersprungen.
  Der separate Smoke mit neuem Image prüfte gegen die laufenden Abhängigkeiten
  API/FFmpeg, PostgreSQL, S3-Roundtrip/Range/Löschung und Celery mit paralleler
  API-Antwort. Seine synthetischen Objekte und sein temporärer Container wurden
  entfernt. Zusätzlich echte Silero-/Whisper-Auswertung der synthetischen WAV
  im neuen Image: Wörter vorhanden, alle Wortzeiten innerhalb der Aufnahme;
  keine Qualitätsmessung. API-Vertrag unverändert, lokale Markdown-Ziele gültig.
  Lint und Typecheck beider Workspaces sowie Next.js-Produktionsbuild bestanden.
- 18 alte Task-Logs, generierte Diagramm-Ausgaben und das alte Overflow-Bild
  aus dem ignorierten Arbeitsbereich entfernt. Keine neuen Tests für die
  rein strukturelle Bereinigung; bestehende Funktionsprüfungen bleiben erhalten.

## Deepgram EU live und Wiederverwendung im Review (24.10.2026)

- Nutzerauftrag: Transkription am Ende beschleunigen; Cloud-Streaming gewünscht,
  Deepgram nach Preis-/Integrationsvergleich bestätigt. Bestehender EU-Batchadapter
  und 16-kHz-PCM-WebSocket waren der Integrationsgrund.
- Implementiert: `provider=deepgram` auf `/speech/live`, Nova-3 Deutsch über
  EU-Endpunkt; Schlüssel nur im Backend. Browser verbindet vor Aufnahmestart,
  zeigt vorläufigen Text und flush't den Audio-Rest vor Stop.
- Nur vollständige, bestätigte Abschlusswörter gelangen als `live_transcript`
  mit dem Upload zum Worker. Signal- und Wortanalyse bleiben erhalten; eine
  zweite Batch-ASR entfällt. Bei Streamfehlern lokaler Whisper-Ersatzweg; keine
  automatischen bezahlten Cloud-Retries. Audio-Cloudversand im UI benannt und
  abschaltbar; `local_only=true` lehnt Cloud-Wörter weiterhin ab.
- Grenzen: Upload, Signal-Analyse und Queue bleiben nach Stop. Kein API-Schlüssel
  eingerichtet, daher kein echter Deepgram-Aufruf oder Latenz-/Qualitätsvergleich.
  Füllwortqualität und echtes Mikrofon/Safari müssen gesondert geprüft werden.
- Prüfung: synthetische PCM-/Provider-Tests für Zwischenstände, letzten Abschnitt,
  leere Transkripte, Disconnect, Fehlkonfiguration, Limits und geheime Fehlertexte;
  Job-Roundtrip und Nachweis, dass finale Wörter keine zweite ASR auslösen.
  Frontend-Tests prüfen PCM-Flush-Reihenfolge, Finalisierung, Timeout und Ersatzweg.
- Quellen: [Live-Protokoll](https://developers.deepgram.com/reference/speech-to-text/listen-streaming),
  [CloseStream](https://developers.deepgram.com/docs/close-stream).

Prüfergebnis: 106 Backend-Tests bestanden, zwei lokale Modell-/Datenbanktests
übersprungen; nach Integration von Team-main 174 Frontend-Tests bestanden;
Typecheck und ESLint bestanden; OpenAPI und
TypeScript-Vertrag regeneriert und auf Aktualität geprüft.

Abschlussprüfung im tatsächlichen Projektordner: 106 Backend-Tests bestanden,
zwei übersprungen; 174 Web-Unit-Tests, Typecheck, OpenAPI-Aktualität und zwei
Compose-Konfigurationstests bestanden. ESLint für Quellen bestanden mit
`--ignore-pattern '.next-*/**'` (zusätzliche generierte UI-Caches vorhanden).
Drei Desktop-Browserfälle mit synthetischem Kamera-/Audioeingang bestanden:
Deepgram-Finalisierung bis zum letzten Wort und Wiederverwendung im Review,
Caption-Abbruch mit weiterhin abspielbarer Aufnahme sowie Signalfeedback-Ausfall.
Der ältere Abbruchtest verwendet nun denselben Aufnahme-Setup-Helfer wie der
neue Erfolgsfall. Die lokale `.env` stand noch auf Deepgram ohne Schlüssel;
`ASR_PROVIDER=whisper` wurde als lokaler Ersatzweg eingerichtet, kein Schlüssel
geändert oder eingecheckt. Aktivierung: `DEEPGRAM_API_KEY` setzen und Frontend,
Backend sowie Worker neu bauen/starten. Kein echter Anbieteraufruf getestet.

## Review und ElevenLabs (24.10.2026)

Nutzerauftrag: Review im Stil des Live-Monitorings vereinfachen, Material vorab
hochladen und anschließend durch einen ElevenLabs-Agenten befragen lassen.
Vier Modi (Startup, Thesis, Schule, Nonprofit) verändern die Schwerpunkte der
Fragen. Nutzer bestätigt: Integration bauen, Agent-Konfiguration trägt er später ein.

Codex: vorhandene Wiedergabe-, Quellen-, Celery- und Frage-APIs wiederverwendet;
Review auf zwei Ansichten reduziert, kurze Replay-Abschnitte mit Video-Anmerkungen,
Einzelfragen mit getipptem Quellenvergleich und optionalem ElevenLabs-Dialog.
Collection-ID und Präsentationstyp werden bei Aufnahmestart festgehalten.
Das offizielle ElevenLabs-SDK übernimmt Audio und Verbindung; Schlüssel nur im
Backend, Signed URL ohne Cache. Kontext-Aufbereitung als wiederholbarer Job.

Grenzen: keine echten ElevenLabs-Zugangsdaten in diesem Lauf, keine Aussage
zur Audio- oder pädagogischen Qualität. Sprachreaktionen haben keinen
serverseitigen Zitat-Check. Replay nutzt weiterhin das lokale Vollvideo;
Clips werden bewusst lokal wiedergegeben; persistente Browser-Aufnahmehistorie bleibt offen.
Einrichtung und Speichergrenzen: `docs/07-review-and-agent.md`.

## Persistente Backend-Review ohne Server-Clips (24.10.2026)

- Nutzerauftrag: `docs/06-backend-review-api.md` prüfen und umsetzen,
  ausschließlich Backend; Frontend-Arbeit läuft beim Team parallel.
- Implementiert: Postgres-Sessions/Takes/Events/Reviews/Jobs, abgeleitete
  Wort-/Audio-Summaries, atomare Idempotenz, validierte Browser-Pose-Events,
  A/V-Probe/Offset, finale Timeline mit Pausen-Dedupe und getrennten Tempo-
  Einheiten, explizite Coverage, Template-Review und geprüfte LLM-Auswahl,
  Fact-Check-/Frage-/Antwort-Anbindung, technische Evaluation und Cascade-Delete.
  Keine serverseitigen Wiedergabe-Medien oder Clip-/Snapshot-Felder.
- Korrigierte Entwurfsunklarheiten: Dedupe-Key fehlt im Beispiel und fällt
  deshalb auf Event-ID zurück; unbekannte Coverage wird nicht als gültig
  interpretiert; fehlende Peak-Messung wird als Event-Anfang gekennzeichnet;
  Token-IDs und echte UUIDs sind dokumentiert. Ein Zitat bleibt am angegebenen
  Fundort, fuzzy Matching darf Zahlen/Negationen nicht verändern. Seitenköpfe
  werden ohne Layout-Evidenz nicht heuristisch aus Zitaten gelöscht.
- Der Writer bekommt einen begrenzten Karten-Pack mit erlaubten Textframes.
  Native Ollama-JSON-Schema-Ausgabe plus Code-Verifier ersetzen unbelegte
  freie Formulierungen. Summary und Kennwerte kommen aus Code. Nach einem
  Retry Template-Fallback, bei mehr als 20 % Fallback fehlgeschlagener Job
  mit weiter abrufbarer geerdeter Review. Keine behauptete Modellgenauigkeit.
- Geprüft: **183 Backend-Tests bestanden**, inklusive echter Postgres- und
  Silero-ONNX-Prüfung. Zwanzig adversariale Writer-Fixtures sowie Cleanup-
  Ausfälle, Queue-Retry, Event-ID-Konflikt, Delete während Verarbeitung,
  Teilfehler und take-gebundene Antworten. Die bestehende Deepgram-
  Disconnect-TestClient-Race war auch auf unverändertem HEAD reproduzierbar;
  Test wartet nun auf Protokoll-Cleanup, keine Änderung am Streaming-Code.
- Reale lokale Infrastruktur mit synthetischen Daten: HTTP → Celery →
  Postgres/S3, Upload-Löschung im Objektspeicher geprüft, Idempotenz und
  Cascade-Delete bestanden. Template ca. 0,25 s; fünfminütiger Take mit 60
  Events ohne Medien ca. 0,23 s inklusive Queue/Polling. Lokaler Qwen-Pfad
  separat ca. 17,3 s, gültige Claims ohne Fallback. Keine Latenzzusage.
- Nach Integration der Team-Commits zusätzlich: synthetische deutsche Sprache
  mit echtem lokalem Whisper transkribiert (13 Wörter), Quellen-Ingest über
  bestehendes RAG, Fact-Check-Job, eine Frage, Quellenvergleich der getippten
  Antwort und Template-Review vollständig über HTTP/Worker. Session und
  Testquelle gelöscht. Keine Tatsachenbehauptung extrahiert, daher kein
  Fact-Check-Urteil geprüft; Modellantwort ist kein menschliches Qualitätslabel.
- API-Schema/TypeScript regeneriert und aktuell. Frontend-/Mobile-Code blieb
  unberührt; Architekturdiagramme auf den neuen Backend-Vertrag abgestimmt.
- Offen: **30 menschliche Labels** (synthetisches Paket vorbereitet, alle
  Labels null), echte ASR-/Retrieval-/Fact-Check-Qualität, Mikrofon/Browser/
  Geräte und Frontend-Integration. Kein periodischer Outbox-/Retention-Sweeper,
  keine öffentliche Deployment-Abnahme. Abgebrochene Publikation braucht
  denselben POST/Key oder Session-Löschung; harter Worker-Verlust verzögert
  temporäres Audio-Cleanup bis zur erneuten Zustellung.

## Adaptive Stimmreferenz und stiller Aufnahmestart (24.10.2026)

- Nutzerauftrag: Referenz kontinuierlich nachführen und den Fall beheben, dass
  am Anfang noch nicht gesprochen wird und danach ständig ein Lautstärkehinweis
  erscheint. Browser und Backend sammeln zunächst 3 s erkannte stimmhafte Sprache.
  Lautstärkereferenz und Vergleich nutzen nur Frames mit plausibler Tonhöhe und
  Aktivität. Anfangsstille und Rauschen ohne erkannte Tonhöhe zählen nicht.
- Umsetzung: qualifizierte, nicht überlappende 1-s-Blöcke mit mindestens 30 %
  stimmhaften Messungen. Median gegen kurze Spitzen, exponentielle Nachführung
  mit 30 s Halbwertszeit in stimmhafter Zeit, begrenzte Pegel-/Pitch-Kandidaten
  (12 dB/Halbtöne) und Rhythmus-Kandidaten (Faktor 2). Diese Einstellungen wurden
  im Change als konfigurierbare Prototyp-Heuristiken gewählt, nicht empirisch
  validiert. Längere Änderungen erzeugen zunächst Feedback und werden danach
  schrittweise zur Referenz. Keine absolute Bewertung der Sprechlautstärke.
- Zustände: Pausen und unvoiced Rauschen frieren die Referenz ein. Mikrofonlücken
  verwerfen unvollständige Messblöcke; eine bereits gelernte Referenz bleibt
  erhalten. Eine neue Aufnahme kalibriert neu. Bei anfangs fehlenden Hüllkurven-
  Peaks kann die Rhythmusreferenz später starten. Ungültige Tonhöhen und doppelte
  oder ungültige Zeitstempel dürfen die Browser-Kalibrierung nicht vorantreiben.
- Backend: Referenzaufbau chronologisch aus den Messframes; spätere Frames
  trainieren keine früheren Referenzen. Live-Vorschau und Batch nutzen denselben
  Ablauf. Volume-/Pace-Events speichern die verwendete Referenz je Messfenster;
  bestehende skalare Felder und explizites `baseline_ms: null` bleiben lesbar.
  Der Writer benennt die adaptive Referenz in Deutsch und Englisch. UI-Hinweise,
  API-Beschreibung, Produkt-/Architekturdokumentation und `AGENTS.md` aktualisiert.
- Geprüft: 190 Frontend-Tests, 188 Backend-Tests einschließlich lokalem Silero ONNX
  auf synthetischer Sprache und 12 gezielte Chromium-Prüfungen in Desktop-/Mobile-
  Viewports. Gemeinsame deterministische Fixture für beide Tracker, Anfangsstille,
  Raumrauschen, lange Pausen, Ausreißer, verzögerter Sprachbeginn, Mikrofonlücken,
  Referenz-Nachführung, Event-Evidenz und Vorschau-/Batch-Vertrag geprüft.
  Die Browserprüfung nutzt den echten AudioWorklet mit synthetischem Rauschen und
  Ton, keine Behauptung über Erkennungsgenauigkeit bei Menschen. Lint, Typecheck,
  Produktionsbuild, API-Aktualitätscheck und Parsing aller 12 Architekturdiagramme
  bestanden. 14 bestehende PostgreSQL-/pgvector-Prüfungen ohne laufende Datenbank
  übersprungen; keine neue Infrastruktur-Abnahme.
- Offen: physische Mikrofone, Safari/iOS und schwierige akustische Umgebungen.
  Browser-Pitch/Aktivitätsheuristik ist kein validierter Sprachdetektor; periodische
  Störgeräusche können weiterhin Sprachmessungen ähneln.

## Gemini statt Ollama (24.10.2026)

- Nutzerentscheidung: den lokalen Ollama-Pfad entfernen und Gemini über den
  OpenAI-kompatiblen Endpoint als Default nutzen; Key aus dem Image-Skill in
  die lokale, nicht versionierte `.env` übernehmen. Kein Schlüssel wurde
  ausgegeben oder committet.
- Code: `LocalOllamaChat` und `backend/app/factcheck/local.py` entfernt;
  `llm_settings()` hat keinen impliziten lokalen Fallback mehr;
  `configured_llm()` liest `LLM_API_KEY`, sonst `GEMINI_API_KEY`, sonst
  `GOOGLE_API_KEY`; `llm_available()` verlangt für Gemini einen Key.
  `factcheck/settings` und `review/require_llm` prüfen keine lokale
  Modellliste mehr; Review verlangt Cloud-Einwilligung. Compose übergibt
  `LLM_*`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`; `OLLAMA_URL`, `COACH_MODEL` und
  `host.docker.internal` sind entfernt. `QuestionConfig.max_questions` ist
  auf 5 begrenzt.
- Modellwahl: `gemini-3.1-flash-lite` (minimales Reasoning) für Test/Live,
  `gemini-3.8-flash` (kein `minimal`) für final. `gemini-2.5-flash-lite` ist
  im Projekt nicht erreichbar (404). Der OpenAI-kompatible Endpoint akzeptiert
  `response_format={"type":"json_object"}` im Test; für Garantien ist natives
  `responseJsonSchema` nötig. Thinking-Tokens zählen als Output.
- Datenschutz: Gemini Developer API ohne EU-Region-Pinning; Paid-Inhalte
  werden nicht zum Training genutzt, Unpaid kann geprüft werden. Die frühere
  Local-only-Zusage ist hinfällig. Nur synthetische Demo-Daten senden oder
  Vertex AI mit EU-Region prüfen.
- Build: Ollama war kein Bestandteil des Docker-Images, sondern ein
  Host-Dienst. Die Build-Zeit ändert sich durch das Entfernen daher nicht;
  entfernt wurde die Laufzeit- und Konfigurationsabhängigkeit.
- Geprüft: **187 Backend-Tests bestanden** (Container, inkl. neuer
  LLM-Konfigurationstests). `scripts/smoke_gemini.py`:
  `gemini-3.1-flash-lite`, 0,71 s, valides JSON. `scripts/smoke_coaching.py`:
  Fact-Check 3,4 s, Fragen 2,1 s, Antwortprüfung 1,7 s; drei korrekte Urteile
  auf synthetischen Daten. Keine Genauigkeits- oder Latenzzusage.
- `scripts/smoke_review.py --llm` mit `gemini-3.1-flash-lite` scheiterte
  erwartungsgemäß an der Verifikationsgrenze (`E_REVIEW_VERIFICATION`, >20 %
  Fallback); die geprüfte Template-Review blieb abrufbar. Das ist der
  vorgesehene sichere Fallback, kein stiller Fehler. `gemini-3.8-flash`
  lieferte im direkten JSON-Test 2,15 s und ist für den finalen Writer
  vorgesehen.
- Offen: echte deutsche Prompts/Quellen, Rate-Limits unter Last, EU-Region,
  Frontend-Einwilligungstext für Google, finaler Lauf mit
  `gemini-3.8-flash`. Evidenz: `docs/11-deep-research-validation.md`.

## Branch-Review und Integration von Gemini (24.10.2026)

- Nutzerauftrag: `voice-agent-plan` prüfen, Fehler beheben, vereinfachen und in
  `main` integrieren. Ausgangspunkt `26c4394`; Teamänderungen bis `c0ae192`
  einschließlich des durchgängigen Backend-Aufnahmepfads sind integriert.
- Konfiguration: Gemini verlangt den Schlüssel bereits vor Speicherung und
  Queue-Auftrag. Google-Key-Aliase gelten nur für den exakten HTTPS-Host
  `generativelanguage.googleapis.com`; andere Endpoints erhalten ausschließlich
  einen expliziten `LLM_API_KEY`. Ungültige URLs und nicht endliche Zahlenoptionen
  sind nicht verfügbar. `available` bleibt eine Konfigurationsprüfung ohne
  Anbieteraufruf. Explizit leeres Modell oder leere Basis-URL deaktivieren den
  Pfad auch in Compose; der Timeout-Default ist einheitlich 45 s.
- Modellantworten: Schema und Anweisung zur Behandlung von Transkript, Quellen
  und Antworten als nicht vertrauenswürdige Daten bleiben im Systemprompt.
  JSON-Modus allein garantiert keine Schema- oder Evidenzkorrektheit. Abgeschnittene,
  blockierte und nicht objektförmige Antworten werden verworfen; bestehende
  Quellenprüfung und geprüfter Template-Fallback bleiben erhalten.
- API-Vertrag vollständig regeneriert. Das Maximum von fünf Anfangsfragen ist
  kein globales Follow-up-Limit oder Sitzungstimer; weitergehende TTS-/Question-
  Lanes bleiben als Plan gekennzeichnet. Der getippte Fragepfad benennt Google
  Gemini vor dem Start. Anleitung und Mermaid-Diagramme folgen dem aktuellen
  Studio; Browserprüfungen verwenden sichtbare Regionen statt vorübergehendem
  verstecktem Next.js-Streaming-Markup.
- Geprüft: **249 Backend-Tests ohne Skips** mit PostgreSQL/pgvector und lokalem
  Silero ONNX; **219 Web- und 18 Mobile-Unit-Tests**; Lint und Typecheck beider
  Workspaces, Web-Produktionsbuild, API-Aktualitätscheck und drei Compose-Checks.
  **20 gezielte Chromium-Prüfungen** in Desktop-/Mobile-Viewports: Aufnahme,
  Upload, Fehlererhalt des Videos, Fact-Check, getippte Antwort, gemockter
  ElevenLabs-Dialog und Verbindungsabbau, Einstieg, Appearance und Navigation.
  Alle zwölf Architekturdiagramme mit Mermaid geparst.
- Lokaler Compose-Smoke: API bleibt während eines Celery-Jobs erreichbar,
  PostgreSQL/S3-Roundtrip und anonymer Zugriff geprüft. Review-Smoke bestätigt
  Idempotenz, zwei synthetische Events, Template-Review, Löschung des temporären
  Audios und Session-Kaskade; ein Take mit 60 Events ebenfalls verarbeitet.
  Die synthetische Pause hat Abstand zur 2-s-Heuristik, damit überlappende
  Analyseframes sie nicht unter die Grenze kürzen.
- Grenzen: In dieser Umgebung fehlt der Gemini-Key; kein erneuter echter
  Cloud-Aufruf. ElevenLabs ist im Browser gemockt, keine physische Geräte- oder
  Genauigkeitsabnahme. `npm audit` meldet acht bereits auf `main` vorhandene
  Expo-Abhängigkeitswarnungen; Mobile-SDK und Lockfile wurden in diesem
  Provider-Change nicht geändert. Retention/TTL und die geplanten
  Sitzungsgrenzen bleiben offen.

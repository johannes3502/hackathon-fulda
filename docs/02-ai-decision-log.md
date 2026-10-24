# AI Decision Log — Backend-Grundgerüst

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

## Lokale Alternative statt OpenAI API (24.10.2026)

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

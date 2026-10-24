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

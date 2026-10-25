# 418 Pitch Practice

Web-App zum Üben von Präsentationen, entwickelt beim Hackathon Fulda 2026.
Die App erfasst Haltung und Sprache, vergleicht Aussagen mit hochgeladenen
Quellen und stellt anschließend Rückfragen. Hinweise lassen sich an der
zugehörigen Stelle im eigenen Aufnahmevideo ansehen.

## Unterlagen für Abgabe und Jury

| Dokument | Inhalt |
| --- | --- |
| [Funktionen und Bedienung (PDF, 2 Seiten)](output/pdf/418-Pitch-Practice-Features-Jury.pdf) | Fünf Kernfunktionen, Aufnahme, Review und Prototyp-Scores |
| [Architektur und Datenfluss (PDF, 3 Seiten)](output/pdf/418-Pitch-Practice-Architektur.pdf) | Systemübersicht, Analyseabläufe, Speicherung und Integrationsstand |

Stand: **25.10.2026**. [Grundlagen und PDF-Erzeugung](output/pdf/README.md).
Die Jury-Demo läuft auf dem vorbereiteten Laptop unter `localhost`, ohne Login.
Ein öffentliches Deployment und Smartphone-Nutzung gehören nicht zum Demo-Pfad.

## Lokal starten

Voraussetzung: Docker Desktop oder Docker Engine mit Compose. Für den
vollständigen Stack ist keine lokale Node.js- oder Python-Installation nötig.
Beim ersten Build werden Images und die lokalen KI-Modelle heruntergeladen.

Nur beim ersten Start, wenn noch keine `.env` existiert:

```sh
cp .env.example .env
```

Danach aus der Repository-Wurzel:

```sh
docker compose up --build -d --wait
```

- [App öffnen](http://localhost:3000)
- [Pitch Mode für die Jury](http://localhost:3000/stage)
- [API-Dokumentation](http://localhost:8000/docs)

Compose startet sieben Dienste: Frontend, FastAPI-Backend, Celery-Worker,
Celery Beat, Redis, PostgreSQL mit pgvector und SeaweedFS als S3-Speicher.
SeaweedFS wird für Quellen, temporäre Analyse-Uploads und Job-Ergebnisse benötigt;
das Wiedergabevideo bleibt im Browser. Alle Anwendungskomponenten laufen aus
gebauten Images, ohne Entwicklungsserver oder Source-Mounts.
Die veröffentlichten Ports sind an `127.0.0.1` gebunden. Abweichende Ports
lassen sich in `.env` einstellen.

Backend-Smoke-Test und Stoppen:

```sh
docker compose exec backend python -m scripts.smoke
docker compose stop
```

**IntelliJ:** Run-Konfiguration **Docker Compose**.
**VS Code:** **Run Build Task** (`Ctrl+Shift+B`, macOS `Cmd+Shift+B`).

## Quellencheck und Sprachdialog einrichten

Die Schlüssel bleiben serverseitig in `.env`; diese Datei nicht committen.

| Funktion | Konfiguration |
| --- | --- |
| Transkription nach der Aufnahme | Standardmäßig lokales `faster-whisper`; kein Cloud-Key nötig |
| Quellencheck | `GEMINI_API_KEY`; Modell und Endpoint über `LLM_MODEL` / `LLM_BASE_URL` |
| **Practice questions** im Web | `ELEVENLABS_API_KEY` und `ELEVENLABS_AGENT_ID`; privater Agent gemäß [Einrichtung](docs/07-review-and-agent.md#elevenlabs-konfigurieren) |
| Optionales Deepgram-Live-Transkript | `DEEPGRAM_API_KEY`; zusätzlich im Studio aktivieren, standardmäßig aus |
| Optionale Backend-Websuche | `WEB_SEARCH_PROVIDER`; standardmäßig `none`, für Tavily zusätzlich `TAVILY_API_KEY` |

Der ElevenLabs-Sprachdialog benötigt keinen Gemini-Key. Die separate
Fragen-/Antwort-API verwendet das konfigurierte Sprachmodell.
Nach Änderungen an `.env` die betroffenen Container neu erstellen:

```sh
docker compose up -d --wait backend worker beat
```

[KI-Konfiguration und Grenzen](docs/06-local-coaching.md) ·
[Review und ElevenLabs](docs/07-review-and-agent.md) ·
[Transkription](backend/app/transcription/README.md)

## Prototyp ausprobieren

1. Unter [Sources](http://localhost:3000/sources) den Präsentationstyp wählen,
   synthetische PDF-/PPTX-/DOCX-/TXT-/MD-Dateien hochladen und **Ready** abwarten.
2. Ins Studio wechseln, Kamera und Mikrofon erlauben, Kalibrierung abwarten
   und aufnehmen. Das normale Studio verwendet Live-Feedback und vollständige
   Backend-Analyse; nach dem Stoppen wird die Aufnahme temporär hochgeladen.
3. Mit **Finish & review** die Auswertung öffnen. Hinweise anklicken, die
   Videostelle ansehen und mit **Check facts** die Aussagen prüfen.
4. **Practice questions** startet die konfigurierte ElevenLabs-Fragerunde.

Für die Jury bietet [Pitch Mode](http://localhost:3000/stage) einen Preflight,
eine lokale Sofortaufnahme und genau eine vorbereitete Datenschutzfrage.
Die lokale Aufnahme lädt keine Medien hoch. Backend-Analyse ist ein eigener,
optionaler Pfad mit 90 s Wartefrist; bereits eingereihte Jobs können weiterlaufen.

Ohne eigene Aufnahme stehen getrennte Beispielpfade bereit:
[22-Sekunden-Gestenbeispiel](http://localhost:3000/gestures),
[Sample-Demo](http://localhost:3000/demo) und
[Review-Beispiel](http://localhost:3000/review-preview).
Diese zeigen synthetische Daten, keine Analyse einer neuen Aufnahme.

## Daten und aktueller Stand

Abgeschlossene Aufnahmen, Analyse und Gesprächstext bleiben lokal in IndexedDB
und sind nach einem Reload wieder verfügbar. Im Review lassen sie sich
herunterladen oder lokal löschen. Der Analyse-Upload wird nach der Verarbeitung
gelöscht; Quellen und ältere S3-Analyseergebnisse bleiben davon getrennt.
Lokales Löschen entfernt keine separaten Backend-Daten.

Die drei Review-Scores **Gestik, Fachwissen und Flow** aggregieren erfasste
Evidenz (`evidence-share-v1`). Formel und Datenabdeckung sind sichtbar;
ohne bewertbare Daten bleibt ein Score offen. Es sind keine validierten Noten.
Kopforientierung ist ein Proxy, keine Blickkontaktmessung.

Die persistente Session-/Take-API und das Progress-Backend sind implementiert;
neue Web-Aufnahmen sind noch nicht daran angebunden. Die offenen Arbeiten
stehen in [docs/14-open-todos.md](docs/14-open-todos.md).
Für Cloud-Aufrufe nur synthetische Demo-Inhalte verwenden: Gemini und
ElevenLabs verarbeiten Daten außerhalb des lokalen Stacks.

## Code-Einstieg für die Jury

| Bereich | Einstieg |
| --- | --- |
| Aufnahme, lokale Speicherung, Timestamp-Review | `frontend/src/features/live/` und `frontend/src/components/live/` |
| Pose-Regeln und Kalibrierung | `frontend/src/features/pose/` |
| API und Hintergrundjobs | `backend/app/main.py`, `tasks.py`, `jobs.py`, `job_storage.py` |
| Quellen, Fact-Check, Fragen | `backend/app/sources/`, `factcheck/`, `questions/` |
| Architektur, Dienstaufgaben und Integrationsgrenzen | [Architektur](docs/03-architecture.md) und [Integration](docs/04-integration.md) |
| Synthetische Vorträge und Abgabeunterlagen | `test-presentations/`, `pitch/`, `output/pdf/` |

`promo/` ist ein separates, optionales Video-Projekt und gehört nicht zur App
oder zum Compose-Build. Forschungsnotizen bleiben als Entscheidungsbelege
verfügbar; aktuelle offene Abnahmen stehen zentral in [TODOs](docs/14-open-todos.md).

## Entwicklung und Dokumentation

[Frontend und Checks](frontend/README.md) · [Backend und Smoke-Tests](backend/README.md) ·
[API-Vertrag](api/README.md) · [Architekturdiagramme](docs/03-architecture.md) ·
[Produktumfang](docs/01-product.md) · [Projektregeln](AGENTS.md)

Für lokale Frontend-Entwicklung mit Node.js 22.12+:

```sh
npm ci
npm run dev
```

Das startet nur das Frontend. `/stage` bietet eine lokale Aufnahme ohne
Analyse-Upload; der normale `/live`-Pfad benötigt das Backend.
Checks im Checkout: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run test:compose` und `npm run api:check` (Python-Umgebung siehe API-Guide).
Gegen den laufenden Jury-Stack: `npm run test:smoke`; Browser-Abnahme nach
`npx playwright install chromium` mit
`PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e`.
Die Browser-Tests verwenden synthetische Medien; echte Kamera und Mikrofon
werden zusätzlich gemäß [Jury-Runbook](docs/05-jury-demo.md) geprüft.

Nach Frontend- oder Stage-Flag-Änderungen:
`docker compose up --build -d --wait frontend`.
Nach Backend-Änderungen API, Worker und Beat gemeinsam neu bauen:
`docker compose up --build -d --wait backend worker beat`.
Die schlanke Frontend-Runtime enthält keine Compiler oder Testwerkzeuge.

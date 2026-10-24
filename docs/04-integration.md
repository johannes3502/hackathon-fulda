# Integration & Quickstart

Gemeinsamer Einstieg für Web, Mobile und Backend. Implementierte Verträge stehen
in `api/openapi.json` / `api/schema.d.ts`; künftige Review-Verträge in
`docs/05-frontend-review-ux.md` und `docs/06-backend-review-api.md` sind Zielentwürfe.

## Stack starten

```sh
cp .env.example .env            # einmalig
docker compose up --build -d --wait
```

Frontend: <http://localhost:3000>, API: <http://localhost:8000>,
HTTP-Verträge: <http://localhost:8000/docs>. Der Browser nutzt den `/api`-Proxy;
`NEXT_PUBLIC_API_URL` und `API_INTERNAL_URL` sind in Compose gesetzt.

Ohne Docker: Node.js 22.12+, `npm ci` und `npm run dev` im Repo; Python 3.12 mit
`backend/requirements.txt`, dann `uvicorn app.main:app` aus `backend/`.
Dienste und Modelle: [Backend](../backend/README.md),
[Whisper/Gemini-Coaching](06-local-coaching.md).
Nach HTTP-API-Änderungen `npm run api:generate`, danach `npm run api:check`.

## Kamera, lokale Hinweise und Aufnahme

`/` und `/live` öffnen dasselbe Studio. **Live · in browser** nutzt Kamera und
Mikro lokal: Pose/Finger im MediaPipe-Worker, Stimme im AudioWorklet. **Off ·
gestures only** benötigt kein Mikro. **Live + full backend analysis** aktiviert
den Server-Signalstream und den vollständigen Upload nach Stop.

- Modell/Modus: Lite oder Heavy, VIDEO (Standard) oder IMAGE, GPU mit CPU-Fallback.
- `Track fingers`: separat schaltbar, maximal 5 Hz; Pose Lab bleibt Dev-only.
- Pose und Stimme kalibrieren gegen eine eigene Referenz. Feature-Schalter
  gelten pro Take, auch für Server-Hinweise und importierte Wörter.
- Live-Controller: `frontend/src/features/live/recorder.ts`, `transport.ts`,
  `speech.ts` und `captions.ts`; gemeinsame Typen in `contracts.ts`.
- `MediaRecorder.onstart` verankert Zeitstempel. Noch laufende Preview-Frames
  werden verworfen; ein Take setzt Landmark-Log und Referenzen zurück.
- JSONL und Pose-Evidenz bleiben lokal. [Landmarks](../frontend/DATA_POINTS.md),
  [Regeln und Grenzen](04-gesture-evaluation.md), [Jury-Ablauf](05-jury-demo.md).

## Implementierte Backend-Endpunkte

| Endpoint | Verwendung |
| --- | --- |
| `GET /health/ready` | Abhängigkeiten prüfen; Aufnahme im Backend-Modus wartet maximal 10 s |
| `GET /health/live` | Liveness; allein kein Nachweis der Aufnahmebereitschaft |
| `POST /speech/analyze` | Vollständige Aufnahme nach Stop; 202 mit `job_id` und `status_url` |
| `GET /speech/jobs/{job_id}` | `queued`, `running`, `completed` oder `failed` |
| `WS /speech/feedback` | Kalibrierte Signalhinweise während der Backend-Aufnahme |
| `WS /speech/live` | Optionale Whisper-Textvorschau |
| `POST /transcription/analyze-words` | Wort-Timestamps aus demselben Take auswerten, kein ASR-Aufruf |
| `/sources` | Upload, Status und Retrieval; Collection-ID wird von Web/Native geteilt |
| `/factcheck`, `/questions`, `/questions/answers` | Quellenvergleich und Fragerunde über getrennte Jobs |
| `/questions/answers/voice` | Gesprochene Antwort transkribieren und mit Quellen vergleichen |

Die HTTP-Helfer validieren Antworten, begrenzen einzelne Requests auf zwei
Minuten und Job-Polling auf elf Minuten. Ein Analysefehler erhält die lokale
Aufnahme; es gibt keinen stillen Ersatz durch synthetische Ergebnisse.

## Vollständige Analyse nach Stop

Es werden keine einzelnen MediaRecorder-Chunks hochgeladen. Der Browser sendet
die ganze WebM-/MP4-Aufnahme mit `transcribe` (im Backend-Modus standardmäßig an)
und `local_only=true`. FFmpeg, Silero/RMS/YIN und optional Whisper laufen im Worker.

```sh
JOB=$(curl -s -F recording=@backend/tests/fixtures/speech-de.wav http://localhost:8000/speech/analyze | python3 -c "import sys,json;print(json.load(sys.stdin)['job_id'])")
curl -s http://localhost:8000/speech/jobs/$JOB
```

Wichtige Felder in `result`:

- `audio.summary` / `audio.series`: Signalmesswerte und Zeitreihe.
- `words`: `{word, start_ms, end_ms}`; `text`: zusammengesetzter Lesetext.
- `transcription`: wortbasierte Auswertung, bei ausgeschaltetem ASR `null`.
- `events`: zusammengeführte Zeitachse mit `t_ms`, `duration_ms`, Typ und Payload.
- `asr_provider`, `synthetic_demo`, `notices`: Herkunft und Grenzen.

`transcribe=false` verarbeitet nur das Signal. Whisper ist lokal/deutsch;
Deepgram ist ein expliziter optionaler Adapter. Füllworterhaltung und Wortgrenzen
sind modellabhängig. Quellenvergleich und Fragen verwenden die Wortliste aus
diesem Take. Austausch des Transkripts verwirft abhängige Funde im Browser.

## WebSocket-Verträge

Beide Routen nehmen mono **Int16 little-endian, 16 kHz** entgegen. Browser-Sender:
`features/live/captions.ts` und `public/audio/pcm-worklet.js` (100-ms-Frames).

1. Text `{"type":"start","sample_rate":16000}` senden; auf `ready` warten.
2. Erst danach Binär-PCM senden.
3. Mit `{"type":"stop"}` beenden; Server sendet `done` und Close 1000.
4. Fehler kommen als `error` und Close 1011, Überlast als Close 1013.

**Signalfeedback:** `/speech/feedback` hat einen eigenen Slot pro API-Prozess,
maximal 5 min Audio. Alle 5 s werden die bestehenden Signalregeln auf dem
Aufnahmeabschnitt ausgewertet; `feedback` enthält `position_ms` und `events`.
PCM bleibt im RAM. Der Browser zeigt einen Hinweis mit Cooldown pro Typ und
wendet die Feedback-Flags an. Mehr als 15 s Rückstand beendet nur die Vorschau.

**Captions:** `/speech/live` hat einen unabhängigen Whisper-Slot, maximal 600 s
Audio und 30 s Leerlauf. `words` enthält `final` und kumulative Wörter, `text`
einen Vorschautext. Startbar unter **Recording options → Show live captions**.
Die vollständige Analyse nach Stop bleibt die Review-Zeitbasis.
`WHISPER_LIVE_*` ist in `.env.example` und im Backend-README beschrieben.

Zeitstempel beziehen sich zunächst auf den PCM-Stream. Der Browser verschiebt
sie zur MediaRecorder-Zeitbasis. Verbindungsfrist (20 s), Ausfall oder Rückstau
beenden nur die Vorschau; die Aufnahme bleibt verfügbar. HTTPS benötigt WSS und
WebSocket-Upgrade am Proxy. WebSockets sind nicht Teil des OpenAPI-Exports.

Synthetischer CLI-Test:

```sh
docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/v.wav
docker compose exec -T backend python -m scripts.smoke_live /tmp/v.wav
```

## Review, Demo und Native

Review spielt das komplette lokale Video mit ±2 s Kontext um Marker ab.
Video bleibt im Browser-Speicher; vor Reload/Verlassen downloaden. Backend-
Uploads liegen bis zum Ende der Verarbeitung in S3 und werden danach gelöscht;
Ergebnisse bleiben dort. Persistente Session-Historie und Server-Clips sind noch
nicht implementiert. Neue Review-/IndexedDB-Entwürfe sind davon getrennt.

`/demo` ist ein deterministischer synthetischer Übungsablauf. Die Fabrik in
`features/coach/gateway.ts` liefert `MockCoachGateway`, konsumiert über
`useCoachSession`. Ein echter Adapter muss externe Nachrichten validieren und
Sample-Steuerung ersetzen. Die Mock-Zeit `atMs` ist aktive Übungszeit mit Pause;
sie ist nicht die MediaRecorder-Zeit. IDs, Sequenzen und Revisionen schützen vor
verspäteten/duplizierten Nachrichten; fehlende Werte bleiben `null`.

Die [native App](../mobile/README.md) nutzt dieselben HTTP-Analyse-/Quellen-
Verträge, lokale Pose-/Videodaten und eine explizit synthetische Demo. Quellen
werden über eine Collection-ID auf demselben API-Server geteilt, nicht Videos
oder Übungshistorie. Native Aufnahme-Zeitanker sind als ungefähr markiert.
Die native UI hat ihren eigenen Integrationsumfang; Web-Fragerunde und neue
Review-Zielverträge sind dort nicht automatisch umgesetzt.

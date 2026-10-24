# Integration & Quickstart für Komponenten

Wie Teams ihre Software an das Backend anschließen: Batch-Transkription (Stufe
A, umgesetzt), Live-Transkription (Stufe B, Backend-Prototyp) und die Punkte,
an denen die Komponenten der anderen Entwickler anbinden.

## 1. Stack starten

```sh
cp .env.example .env            # einmalig
docker compose up --build -d --wait
```

| Komponente | Erreichbarkeit | Health |
|---|---|---|
| Frontend | http://localhost:3000 | compose-Healthcheck |
| API | http://localhost:8000 | `/health/ready` (postgres·storage·redis) |
| API-Doku | http://localhost:8000/docs | OpenAPI-generierte Typen |

Ohne Docker: Frontend `npm run dev --workspace frontend`, Backend
`uvicorn app.main:app` aus `backend/` (Umgebung aus `.env`). **Regel:** Nach
jeder API-Änderung `npm run api:generate` und vor dem Commit `npm run
api:check` — der generierte Vertrag (`api/openapi.json`, `api/schema.d.ts`)
liegt im Repo.

## 2. Stufe A: Batch-Transkription (umgesetzt)

Für alle, die ein fertiges Transkript brauchen (Review-Flow, Mobile, Fact-Check):

```sh
JOB=$(curl -s -F recording=@backend/tests/fixtures/speech-de.wav http://localhost:8000/speech/analyze | python3 -c "import sys,json;print(json.load(sys.stdin)['job_id'])")
curl -s http://localhost:8000/speech/jobs/$JOB   # queued → running → completed
```

Wichtige Felder in `result`:

```jsonc
{
  "asr_provider": "whisper",          // oder "deepgram" / "none"
  "synthetic_demo": false,            // true: erfundene Wörter (ASR_PROVIDER=json)
  "transcription": {
    "text": "…lesbarer Text…",        // Wortliste bleibt maßgeblich, Text nur Lesetext
    "words": [{"word": "Hallo", "start_ms": 0, "end_ms": 280}, …],
    "events": [{"type": "pause", "t_ms": 280, "duration_ms": …, "source": "asr"}]
  }
}
```

- `transcribe=false` → nur Signalanalyse (Silero/RMS/YIN), kein ASR.
- Setzt auf FFmpeg im Worker; akzeptiere WebM/MP4/WAV (siehe
  `backend/README.md` → "Speech analysis").
- Deutsch als Standard (`WHISPER_LANGUAGE=de`); Modell aus dem Image, keine
  Runtime-Downloads.

## 3. Stufe B: Live-Transkript (`WS /speech/live`, optionale Web-Vorschau)

WebSocket-Handle in einem FastAPI-Prozess; ein **Slot** (`asyncio.Semaphore(1)`)
— zweiter Client erhält Close **1013**. Protokoll (kurz):

1. Client sendet Text `{"type":"start","sample_rate":16000}` → Server
   `{"type":"ready","sample_rate":16000}`.
2. Client sendet Binärframes: mono, **Int16 little-endian, 16 kHz**, ~100 ms.
3. Server streamt alle ≥2 s: `{"type":"words","final":false,"words":[…]}`
   (Zeiten absolut ab Sessionstart, dedupliziert) mit kumulativem
   `{"type":"text","final":false,"text":"…"}`.
4. Abschluss: `{"type":"stop"}` senden → letzte Frames mit `final:true` +
   `{"type":"done"}` + Close 1000. Auch 30 s ohne Frames oder 600 s Audio beenden
   sauber.
5. Fehler: `{"type":"error","message"}` + Close 1011.

Python-Client (bereits vorhanden, zum Messen):

```sh
docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/v.wav
docker compose exec -T backend python -m scripts.smoke_live /tmp/v.wav
```

JavaScript-Client (AudioWorklet → WS), Kern ohne UI-Verkabelung:

```js
const ws = new WebSocket("ws://localhost:8000/speech/live");
ws.onopen = () => ws.send(JSON.stringify({ type: "start", sample_rate: 16000 }));

const buffer = [];
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "words") bufferToTimeline(message.words);   // final:false
  if (message.type === "text") renderPreview(message.text);
  if (message.type === "done") finalize(message.text);
  if (message.type === "error") stopLive(message.message);        // Aufnahme läuft weiter
};

function pushPcm(float32, sampleRate) {   // im AudioWorklet-Kontext vorbereitet
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  queue.push(new Blob([int16.buffer]));   // erst senden, sobald „ready" da war
}

// 100 ms flushen; Binary-Frames INT16-fertig:
function flush() { while (queue.length) ws.send(queue.shift()); }
function stop() { ws.send(JSON.stringify({ type: "stop" })); }
```

- **Zeitachse:** `words.start_ms` läuft auf der Session-Achse (erster PCM-Frame
  = 0). Alignment mit Video/Aufnahme rechnet der Browser (offset aus
  `performance.now()` beim ersten Frame) — das backend mischt die Achsen nicht.
- **Abbruch:** Bricht die WS ab, läuft die Aufnahme weiter; Stufe A liefert das
  vollständige Transkript. UI braucht also keinen Fallback-State zu speichern.
- **Ressourcen:** Ein Slot pro Prozess — keine zwei gleichzeitigen Vorträge auf
  demselben Backend-Container; bei mehr Bedarf Container skalieren
  (Load-Balancer mit Sticky Session oder einzelner Prozess-Direktrouting).
- **Konfiguration:** `WHISPER_LIVE_MODEL`/`WHISPER_LIVE_BEAM_SIZE` fallen auf
  die Batch-`WHISPER_*`-Werte zurück; schwache Laptop-Hosts: `tiny` + Beam 1.
  Zur Frage, welche Größe wo läuft, siehe "Whisper model size per device" in
  `backend/README.md`.
- **Kein WS in OpenAPI:** Der HTTP-Vertrag (`api/`) beschreibt die WebSocket-
  Route nicht; dieses Dokument ist der maßgebliche Stufe-B-Vertrag.

## 4. Anbindung an die anderen Komponenten

| Komponente (Team) | Input aus der Transkription |
|---|---|
| Fact-Check | Transkript (Stufe-A-`words`/`text`) → Aussagen → RAG gegen `/sources` (siehe `backend/app/factcheck/`) |
| Frage-Agent | dieselbe Wortbasis + Fact-Check-Funde; Dialog-Kontrakt in `backend/app/questions/` |
| Quellen-Upload | unabhängig; Suche liefert Top-k an beide Agenten |
| Mobile (Expo) | Stufe A nur: Upload + Job-Polling + Wort-Timestamp-Import (Review-Flow) |
| Frontend Web | Stufe A: `features/live/transport.ts`; Stufe B: `features/live/captions.ts` + `public/audio/pcm-worklet.js` |

Datum, Zeiten und Events folgen den Konventionen in
`docs/03-architecture.md`; Analyse-Konfiguration (`AudioConfig`,
`WordConfig`) bleibt über `docs/01-product.md` → "Analyse" besprochen.

## 5. Offene Punkte

- Web: Speech analysis einschalten, unter Recording options optional **Show live captions (preview)** wählen. Mikrofon-Audio wird erst nach Start der Aufnahme und Server-ready gesendet, über denselben `/api`-Proxy (HTTPS → WSS).
- Vorschau startet nach der Verbindung; sie ist kein timestamp-genaues Review-Transkript. Das vollständige Batch-Ergebnis bleibt die Quelle für Review, Fact-Check und Fragen.
- Verbindungsabbruch, 20-s-Verbindungsfrist oder Rückstau schließen nur die Vorschau. Videoaufnahme und spätere Analyse bleiben verfügbar.
- Kein Auth, kein Rate-Limit am Live-Slot; für die Demo-Umgebung gedacht.
- `wss://` über Caddy-Proxy verlangt WebSocket-Upgrade; Venue-Netz früh testen.
- `medium`-Whisper braucht ≥16 GB RAM (OOM auf 7,7-GB-VM gemessen) — für Live
  `tiny` wählen.

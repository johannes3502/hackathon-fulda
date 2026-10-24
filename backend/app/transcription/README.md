# Transkription

Wortbasierte Analyse der Aufnahme. Der Anbieter steckt hinter dem
`Transcriber`-Interface (`transcriber.py`) und liefert `{word, start_ms, end_ms}`
relativ zum Aufnahmestart.

## Stufe A: Batch nach dem Stoppen (umgesetzt)

Browser lädt die komplette Aufnahme über `POST /speech/analyze` hoch, ein
Celery-Job wandelt sie in WAV und ruft den konfigurierten `Transcriber` auf.
Daraus entstehen die Timeline-Events (`source="asr"`). Exakte WPM, Pausen und
Füllwörter kommen ausschließlich aus diesem Pfad.

## Stufe B: Live-Transkript per WebSocket (Backend-Prototyp umgesetzt)

`WS /speech/live` in `app/speech/live.py` streamt nahezu in Echtzeit ein
Transkript während der Aufnahme. Timeline-Events entstehen weiterhin aus
Stufe A.

```
AudioWorklet (Browser)                     [offen, noch nicht verdrahtet]
  → PCM 16 kHz mono Int16, ~100 ms pro Frame
  → ws://<backend>/speech/live            (binäre WS-Nachrichten)
  → FastAPI-WebSocket-Handler (async, kein Celery)
  → StreamingTranscriber → WhisperStreamingTranscriber (faster-whisper)
  ← vorläufige / endgültige Wörter → JSON-Nachrichten
```

Der Handler hält je Prozess **einen** Live-Slot (`asyncio.Semaphore(1)`); ein
weiterer Client wird mit Close-Code 1013 abgewiesen. Puffer, Deduplizierung
und Abschlusstimeouts liegen im Handler — der `StreamingTranscriber`-Adapter
dechiffriert nur ein PCM-Fenster und liefert fensterrelative Wörter:

```python
class StreamingTranscriber(Protocol):
    def transcribe_window(self, samples: np.ndarray, sample_rate: int) -> list[Word]:
        """Int16-float32-PCM (~100 ms) rein; Wörter relativ zum Fensteranfang raus."""
        ...
```

`configured_streaming_transcriber()` folgt dem Muster von
`configured_transcriber()`; lokal läuft `WhisperStreamingTranscriber`.
Standard-`WHISPER_*`-Werte gelten, Überschreibungen über
`WHISPER_LIVE_MODEL`, `WHISPER_LIVE_BEAM_SIZE` und `WHISPER_LIVE_*`.

### Nachrichtenprotokoll (umgesetzt)

Browser → Backend:

| Nachricht | Inhalt |
|---|---|
| Text `{"type": "start", "sample_rate": 16000}` | Pflichtnachricht vor jedem Audio; nur 16 kHz wird akzeptiert |
| Binär | PCM Int16 little-endian, mono, 16 kHz |
| Text `{"type": "stop"}` | Restfenster transkribieren und finalisieren |

Backend → Browser:

| Nachricht | Inhalt |
|---|---|
| `{"type": "ready", "sample_rate"}` | Nach akzeptiertem `start`, vor allen Audiomeldungen |
| `{"type": "words", "final": bool, "words": [{word, start_ms, end_ms}]}` | Nach jedem 2-s-Fenster (`WHISPER_LIVE_CHUNK_MS`); Zeiten absolut ab Sessionstart, 10-s-Rollfenster (max. `WHISPER_LIVE_MAX_WINDOW_MS`), bereits dedupliziert (Cursor über Wortende) |
| `{"type": "text", "final": bool, "text"}` | Kumulativer Lesetext, nach jedem `words`-Frame |
| `{"type": "done"}` | Abschluss, danach Close 1000 |
| `{"type": "error", "message"}` | Protokoll- oder Modellfehler; Close 1011 |

Endgültige Zeiten sind absolut (ab Sessionstart); für Alignment mit dem
Video rechnet der Browser den `performance.now()`-Offset selbst dazu.

### Entscheidungen

- **PCM aus dem `AudioWorklet`, nicht `MediaRecorder`-Chunks.** Einzelne
  `MediaRecorder`-Chunks sind nicht eigenständig dekodierbar, Safari liefert MP4
  statt WebM. PCM ist browserübergreifend gleich und von jedem Anbieter oder
  lokalen Modell verarbeitbar. Das Worklet wird ohnehin für Pegel und F0 genutzt.
- **Kein Celery.** Eine dauerhaft offene Verbindung gehört in den
  FastAPI-Prozess; Celery bleibt für lange Batch-Jobs.
- **Keine HTTP-Segment-Uploads (5–10 s).** Mehr Latenz und an Segmentgrenzen
  abgeschnittene Wörter. Stattdessen baut der Handler ein Rollfenster
  (bis 10 s) und dechiffriert alle ~2 s neu; der Cursor über Wortenden
  dedupliziert die Überlappung.
- **Whisper-Fenster statt „echter" Streaming-Decoder.** `faster-whisper`
  dechiffriert Blöcke; nahezu in Echtzeit erfordert genug CPU-Kraft
  (`WHISPER_LIVE_MODEL=tiny`, `WHISPER_LIVE_BEAM_SIZE=1` für schwache Hosts).

Finalisierung neben explizitem `stop`: 30 s Stille
(`WHISPER_LIVE_MAX_IDLE_SECONDS`) oder 600 s Audiolänge
(`WHISPER_LIVE_MAX_SECONDS`) schließen die Session ordnungsgemäß mit
Final-Frames. Wörter vor der Übergabegrenze eines Fensters erscheinen im
folgenden Fenster — dedupliziert, können dadurch leicht verzögert abschließen.

### Messung

`python -m scripts.smoke_live <recording>` streamt eine WAV-Datei in
Realzeit und meldet Fenster-Latenz (p50/p95/max) — siehe
`backend/README.md`.

### Offen (Frontend)

- Browser-Sender aus dem `AudioWorklet` fehlt; natürlicher Ort ist
  `frontend/src/features/live/transport.ts`.
- Live-Zeiten laufen auf der Sessionzeitachse; für Alignment mit dem Video muss
  der Browser `performance.now()`-Offset selbst anrechnen.
- Bricht der Live-Stream ab, läuft die Aufnahme weiter; Stufe A liefert
  trotzdem das vollständige Transkript.
- Datenschutzhinweis in der Oberfläche: Audio wird während der Aufnahme an
  das Backend geschickt (lokal, kein Cloudanbieter).
- Füllwortqualität ist modellabhängig und ungeprüft.

# Transkription

Wortbasierte Analyse der Aufnahme. Der Anbieter steckt hinter dem
`Transcriber`-Interface (`transcriber.py`) und liefert `{word, start_ms, end_ms}`
relativ zum Aufnahmestart.

## Stufe A: Batch nach dem Stoppen (umgesetzt)

Browser lädt die komplette Aufnahme über `POST /speech/analyze` hoch, ein
Celery-Job wandelt sie in WAV und ruft den konfigurierten `Transcriber` auf.
Daraus entstehen die Timeline-Events (`source="asr"`). Exakte WPM, Pausen und
Füllwörter kommen ausschließlich aus diesem Pfad.

## Stufe B: Live-Transkript per WebSocket (geplant, nicht umgesetzt)

Nur für die Anzeige während der Aufnahme. Timeline-Events entstehen weiterhin
aus Stufe A.

```
AudioWorklet (Browser)
  → PCM 16 kHz mono Int16, ~100 ms pro Frame
  → wss://<backend>/speech/live          (binäre WS-Nachrichten)
  → FastAPI-WebSocket-Handler (async, kein Celery)
  → StreamingTranscriber (anbieterneutral)
  ← vorläufige / endgültige Wörter → JSON-Nachrichten an den Browser
```

### Entscheidungen

- **PCM aus dem `AudioWorklet`, nicht `MediaRecorder`-Chunks.** Einzelne
  `MediaRecorder`-Chunks sind nicht eigenständig dekodierbar, Safari liefert MP4
  statt WebM. PCM ist browserübergreifend gleich und von jedem Anbieter oder
  lokalen Modell verarbeitbar. Das Worklet wird ohnehin für Pegel und F0 genutzt.
- **Backend als Proxy.** API-Keys bleiben auf dem Server, der Anbieter ist
  austauschbar, ohne das Frontend anzufassen.
- **Kein Celery.** Eine dauerhaft offene Verbindung gehört in den
  FastAPI-Prozess; Celery bleibt für lange Batch-Jobs.
- **Keine HTTP-Segment-Uploads (5–10 s).** Mehr Latenz und an Segmentgrenzen
  abgeschnittene Wörter.

### Anbieterneutrales Interface (Entwurf)

```python
class StreamingTranscriber(Protocol):
    async def stream(
        self, frames: AsyncIterator[bytes], sample_rate: int
    ) -> AsyncIterator[LiveWords]:
        """PCM-Int16-Frames rein, Wörter mit start_ms/end_ms (relativ zum
        ersten Frame) und Flag `final` raus."""
        ...
```

Umsetzbar mit einer gehosteten Streaming-ASR (WebSocket des Anbieters) oder
lokal (z. B. `faster-whisper` auf gleitenden Fenstern). Die Konfiguration
folgt dem Muster von `configured_transcriber()`.

### Nachrichtenprotokoll (Entwurf)

Browser → Backend:

| Nachricht | Inhalt |
|---|---|
| Text `{"type": "start", "session_id", "sample_rate": 16000, "offset_ms"}` | `offset_ms` = erster PCM-Frame minus `MediaRecorder.onstart` (`performance.now()`) |
| Binär | PCM Int16 little-endian, mono |
| Text `{"type": "stop"}` | Stream beenden, Restergebnisse abwarten |

Backend → Browser:

| Nachricht | Inhalt |
|---|---|
| `{"type": "words", "final": bool, "words": [{word, start_ms, end_ms}]}` | Zeiten bereits um `offset_ms` verschoben, also auf der gemeinsamen Zeitachse |
| `{"type": "error", "message"}` | Live-Anzeige abschalten, Aufnahme läuft weiter |

### Hinweise

- **Zeitachse:** Ohne `offset_ms` passen die Live-Zeiten nicht zum Video.
- **Fehlertoleranz:** Bricht der Live-Stream ab, läuft die Aufnahme weiter;
  Stufe A liefert trotzdem das vollständige Transkript.
- **Datenschutz:** Live-Streaming schickt Audio schon während der Aufnahme an
  den Anbieter. Einwilligungshinweis und Anbieter in der Oberfläche benennen.
- **Hosting:** Hinter TLS-Proxy (`wss://`) WebSocket-Upgrade erlauben;
  ausgehende Verbindungen zum ASR-Anbieter im Venue-Netz früh testen.
- **Frontend-Einstieg:** `VideoTransport.send()` in
  `frontend/src/features/live/transport.ts` ist heute leer und der natürliche
  Ort für den Live-Pfad (bzw. ein eigener Audio-Transport neben dem Video).

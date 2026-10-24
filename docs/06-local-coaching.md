# Lokale KI: Transkript, Quellenvergleich und Rückfragen

Stand: 24.10.2026. Nutzerentscheidung: lokal vorführen, keine kostenpflichtige
API nötig. Die zunächst genannte OpenAI API wird für diesen Pfad nicht verwendet.

## Start auf dem Demo-Mac

Einmalig [Ollama](https://ollama.com/download) installieren (hier über Homebrew:
`brew install ollama`). In einem eigenen Terminal starten und laufen lassen:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_NUM_PARALLEL=1 ollama serve
```

In einem zweiten Terminal, aus dem Repository:

```sh
ollama pull qwen3.5:4b-q4_K_M
docker compose up --build -d --wait
curl http://localhost:3000/api/coaching/capabilities
```

`configured: true` bestätigt Erreichbarkeit und vorhandenes Modell. Der erste
Aufruf lädt es in den Speicher. Der Quellen-Smoke unten prüft echte Inferenz.
Kein Login und kein API-Key. Modell-Downloads benötigen einmalig Internet;
danach laufen die beschriebenen Modelle lokal. Ollama nutzt auf diesem Mac
die GPU; Whisper und Embeddings laufen im Docker-Worker auf CPU.

**Den vollständigen Modellnamen verwenden.** Der allgemeine Tag `qwen3.5:4b`
lieferte auf diesem Mac eine MLX-Variante. Mit Ollama 0.40.10 antwortete diese
bei JSON-Schema-Ausgabe mit `501 structured output is unavailable`. Die explizite
GGUF-Variante `qwen3.5:4b-q4_K_M` wurde erfolgreich geprüft.

Compose erreicht Ollama über `host.docker.internal:11434`. Getestet mit Docker
Desktop auf macOS; Linux benötigt eine passende Host-/Container-Verbindung.
Konfiguration in `.env`: `COACH_MODEL`, `OLLAMA_URL`, `ASR_PROVIDER=whisper`.
Der Adapter akzeptiert nur lokale Hostnamen und keinen Cloud-Modelltag.

## In der Oberfläche

1. Unter `/sources` eine synthetische PDF/PPTX/TXT-Quelle hochladen und **Ready**
   abwarten. Es wird die Quellen-Collection dieses Browsers verwendet.
2. Unter `/live` **Local server · speech analysis and transcript** wählen.
   **Create a transcript with local Whisper** eingeschaltet lassen.
3. Kamera und Mikro erlauben. Für die ersten drei Sekunden neutral stehen und
   normal sprechen: Pose und Stimme brauchen ihre jeweilige Baseline.
4. Kurzen Vortrag aufnehmen → **Finish & review**. Ein vollständiger Upload
   geht an den lokalen Server; ASR-Ergebnisse kommen nach der Aufnahme.
5. Transkript prüfen. Ein Wort anklicken spielt die Umgebung im Video ab.
   Fehlerhafte Wörter können über den Import korrigierter Wort-Timestamps
   ersetzt werden. Bei bestehendem Quellenbericht diesen zuerst löschen.
6. **Compare with my sources** → Aussage, Quellenort und Zitat ansehen. **Replay**
   springt zum zugehörigen Moment. Eine generierte Frage schriftlich beantworten
   → **Compare answer with sources**. Keine Punktzahl oder Note.
7. **Delete source review and answers** entfernt die zugehörigen Coaching-Jobs
   vom Server. Quellen lassen sich separat unter `/sources` löschen.

**Manage sources (new tab)** erhält die laufende Aufnahme im bisherigen Tab;
anschließend **Refresh status** drücken. Browser-Video und Job-IDs leben nur
im Speicher. Seiten-Reload/Verlassen verliert sie, löscht aber keine Serverdaten.

## Welche Modelle und warum?

| Aufgabe | Auswahl | Grund und Grenze |
| --- | --- | --- |
| Wort-Timestamps | faster-whisper 1.2.1, Whisper `small`, Deutsch, CPU/int8 | Bereits vorhandenes austauschbares ASR-Interface; lokale Datenverarbeitung. Keine geprüfte deutsche Füllwortquote. |
| Quellen suchen | Jina Embeddings v2 base de + pgvector/Volltext | Vorhandene deutsche lokale Retrieval-Pipeline. Die ähnlichste Passage ist nicht automatisch ein Beleg. |
| Aussagen, Vergleiche, Fragen, Antworten | Qwen3.5 4B Q4_K_M über Ollama | Offene Gewichte (Apache-2.0), etwa 3,3 GB Download; passt auf den Demo-Mac mit M2 Pro/32 GB. JSON-Schema-Ausgabe funktioniert im geprüften Lauf. |

Ein größeres lokales Modell könnte anders antworten, benötigt aber mehr Speicher
und eine eigene Prüfung. Eine gehostete API wäre eine austauschbare Alternative;
sie ist hier weder erforderlich noch als stiller Fallback eingebaut. „Lokal“
begründet Datenweg und fehlende API-Gebühren, keine Genauigkeitsbehauptung.

## Wie entsteht ein Quellenvergleich?

1. Das Modell wählt höchstens sechs überprüfbare Aussagen als **Wortspannen**.
   Code prüft die Indizes und übernimmt Text und Zeiten aus dem tatsächlichen
   Transkript. Das Modell darf keine eigene Zeit erfinden.
2. Für jede Aussage werden bis zu fünf Passagen derselben Collection gesucht.
   Quelle und Seite/Folie/Absatz/Zeile bleiben erhalten.
3. Das Modell gibt eine strukturierte Interpretation zurück:
   **stützt**, **widerspricht**, **in den Quellen nicht gefunden**.
   Fehlende oder unzureichende Evidenz bedeutet nicht „falsch“.
4. Code prüft jedes Zitat gegen den tatsächlich abgerufenen Chunk. Der Vergleich
   normalisiert Großschreibung, Leerraum und typografische Zeichen; es bleibt
   eine zusammenhängende Textstelle erforderlich. Erfundene Chunk-ID, fehlendes
   Pflichtzitat oder abweichendes Zitat: **kein Urteil anzeigen**.
5. Bis zu drei Rückfragen entstehen aus Transkript und Vergleichen mit gültigen
   Zitaten bzw. fehlender Evidenz. Neue Antworten lösen erneut Retrieval und
   Zitatprüfung aus. Ein Zitatfehler unterdrückt auch die weitere Rückfrage.

Ein passendes Zitat beweist nur, dass der Text in der Quelle steht. Ob es die
Aussage tatsächlich trägt, bleibt eine Modellinterpretation. Quellen können
selbst falsch sein. Die Auswahl ist nicht vollständig; ein langer Vortrag kann
mehr Behauptungen enthalten als der Prototyp prüft. Kein Web-Fetch im aktuellen
Pfad. Endliche Kontext-/Job-Grenzen können einen langen Auftrag scheitern lassen.

Transkript, Quellen und Antworten werden als Daten im Prompt markiert; darin
enthaltene Anweisungen sollen ignoriert werden. Schema-, Index- und Zitatprüfung
reduzieren definierte Fehler, garantieren aber keine Prompt-Injection-Sicherheit.

## Speicherung und Fehler

- Browser: vollständiges Video, Landmark-Log und Review-Zustand im Arbeitsspeicher.
  Replay nutzt dieses Video; dauerhafte geschnittene Server-Clips fehlen noch.
- Audiojob: Original wird nach terminaler Verarbeitung gelöscht, ASR-/Signal-
  Ergebnis bleibt in S3. Es gibt noch keinen automatischen Ablauf/Cleanup.
- Quellen und Coaching-Jobs: lokale persistente Volumes. Coaching-Input und
  -Ergebnis werden über den Löschknopf entfernt; aktive Jobs zuerst beenden lassen.
- Redis transportiert nur IDs, keine Transkripte oder Videodaten. Längere Arbeit
  läuft in Celery, die API antwortet sofort mit einer Job-ID.
- Modell/Quelle/Queue nicht verfügbar: sichtbarer Fehler, Video bleibt vorhanden.
  Kein stiller Wechsel zu Demoantworten oder einer kostenpflichtigen API.
- Für die Jury ausschließlich synthetische Demo-Inhalte verwenden. Vor einer
  freiwilligen echten Aufnahme Datenweg und Speicherung im UI erklären.

## Reproduzierbare Prüfung und Evidenz

```sh
docker compose exec -T backend python - < backend/scripts/smoke_coaching.py
docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/speech-de.wav
docker compose exec -T backend python -m scripts.smoke_audio /tmp/speech-de.wav --transcribe
```

Geprüft am M2 Pro mit 32 GB: echtes Qwen-Modell erkannte in einer erfundenen
Lernlabor-Quelle „zwanzig Plätze“ als gestützt, „acht Uhr“ bei Quelle „neun Uhr“
als Widerspruch und „Swimmingpool“ als nicht gefunden. Bericht mit drei Fragen:
18,3 s; korrigierte Antwort: 5,1 s. `ollama ps`: 100 % GPU, 16.384 Kontext,
3,5 GB belegter Modellspeicher. Ein einzelner gemessener Lauf, keine allgemeine
Latenz- oder Qualitätszusage. Der Smoke löscht seine Quellen und Berichte.

Whisper `small` transkribierte die 6,845-s-eSpeak-Fixture mit 13 Wort-Timestamps:
„In unserem Prototyp üben wir Präsentationen. Wir sprechen deutlich und erklären
unsere Quellen.“ Das bestätigt die lokale Verbindung; echte Mikrofone,
Dialekte, Füllwörter und Zeitgenauigkeit bleiben gesondert zu prüfen.

## Primärquellen

- [Ollama: Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs)
  — JSON-Schema an `format`, zusätzlich im Prompt, danach Pydantic-Validierung.
- [Qwen3.5-4B Modellkarte](https://huggingface.co/Qwen/Qwen3.5-4B)
  und [konkreter Ollama-Tag](https://ollama.com/library/qwen3.5:4b-q4_K_M)
  — Modellherkunft, Lizenz und Artefakt; Benchmarks nicht auf unsere App übertragen.
- [Ollama FAQ](https://docs.ollama.com/faq) — lokaler Server und GPU-Anzeige.
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
  — lokale CTranslate2-Inferenz und `word_timestamps=True`.

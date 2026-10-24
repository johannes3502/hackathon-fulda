# Coaching-Backend: Gemini, Transkript und Quellenvergleich

Stand: 24.10.2026. Nutzerentscheidung: Gemini über den OpenAI-kompatiblen
Endpoint, kein lokales Ollama mehr. Die frühere Local-only-Zusage ist damit
hinfällig: Transkripte und Quellen werden an Google gesendet. Nur synthetische
Demo-Daten verwenden oder Vertex AI mit EU-Region prüfen.

## Start

1. In `.env` den Schlüssel setzen (nur serverseitig, nie committen):

   ```sh
   GEMINI_API_KEY=...
   # optionaler Alias für das Image-Skill:
   GOOGLE_API_KEY=...
   LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
   LLM_MODEL=gemini-3.1-flash-lite   # Tests/Live; final: gemini-3.8-flash
   LLM_JSON_MODE=true
   LLM_TIMEOUT_S=45
   LLM_CONCURRENCY=4
   ```

2. Stack starten und Konfiguration prüfen:

   ```sh
   docker compose up --build -d --wait
   curl http://localhost:3000/api/factcheck/settings
   ```

   `available: true` bestätigt Schlüssel und Modellkonfiguration. Es gibt
   keinen stillen Fallback auf ein lokales Modell. Der erste echte Aufruf ist
   der Gemini-Smoke:

   ```sh
   docker compose exec -T backend python - < backend/scripts/smoke_gemini.py
   ```

3. `gemini-3.1-flash-lite` unterstützt `thinkingLevel=minimal` und ist der
   getestete Default für schwache/live Aufrufe. `gemini-3.8-flash` unterstützt
   **kein** `minimal`; für den finalen Lauf `low`/`medium`/`high` verwenden.
   `gemini-2.5-flash-lite` ist im Projekt nicht erreichbar (404).

Compose reicht `LLM_*`, `GEMINI_API_KEY` und `GOOGLE_API_KEY` an backend und
worker weiter. Der Schlüssel bleibt aus dem Frontend heraus. `LLM_API_KEY`
gewinnt, falls gesetzt; sonst greift `GEMINI_API_KEY`, dann `GOOGLE_API_KEY`.

## In der Oberfläche

1. Unter `/sources` eine synthetische PDF/PPTX/TXT-Quelle hochladen und **Ready**
   abwarten. Es wird die Quellen-Collection dieses Browsers verwendet.
2. Unter `/live` direkt **oberhalb der Kamera** bei **Speech analysis**
   **Live + full backend analysis** wählen. Unter **Options → Recording options**
   **Create a transcript** eingeschaltet lassen und für rein lokale Transkription
   **Stream transcription with Deepgram (EU)** ausschalten.
3. Kamera und Mikro erlauben. Für die ersten drei Sekunden neutral stehen und
   normal sprechen: Pose und Stimme brauchen ihre jeweilige Baseline.
4. Während der Aufnahme liefert **On · local speech analysis** jetzt alle fünf
   Sekunden Live-Hinweise zu Lautstärke, Tonhöhenvariation, Tempo und Pausen.
   Die ersten drei Sekunden normal sprechen (Kalibrierung). Mikrofon-PCM geht
   währenddessen an den lokalen Server; kein Whisper nötig. Die Regeln sind
   Heuristiken, Tempo ist eine Silbenrate. Live-Hinweise lassen sich ausblenden.
   Kurzen Vortrag aufnehmen → **Finish & review**. Ein vollständiger Upload
   geht an den lokalen Server; ASR-Ergebnisse kommen nach der Aufnahme.
5. Transkript prüfen. Ein Wort anklicken spielt die Umgebung im Video ab.
   Fehlerhafte Wörter können über den Import korrigierter Wort-Timestamps
   ersetzt werden. Dabei werden veraltete Quellenbefunde und Fragen im Browser verworfen.
6. **Check facts** → Aussage, Quellenort und Zitat ansehen. Der Zeitknopf
   springt zum zugehörigen Moment. **Start question round** erzeugt bis zu drei
   Rückfragen. Eine Frage schriftlich beantworten → **Compare with sources**.
   Keine Punktzahl oder Note.
7. Quellen unter `/sources` löschen. Ergebnisberichte haben derzeit noch keine
   Löschfunktion im UI oder automatische Ablaufzeit; nur synthetische Inhalte
   für die Demo verwenden.

**Manage sources (new tab)** erhält die laufende Aufnahme im bisherigen Tab;
anschließend **Refresh status** drücken. Browser-Video und Review-Zustand leben nur
im Speicher. Seiten-Reload/Verlassen verliert sie, löscht aber keine Serverdaten.
Während einer Modellprüfung im Review bleiben; Navigation bricht das Polling ab.

## Welche Modelle und warum?

| Aufgabe | Auswahl | Grund und Grenze |
| --- | --- | --- |
| Wort-Timestamps | faster-whisper 1.2.1, Whisper `small`, Deutsch, CPU/int8 | Bereits vorhandenes austauschbares ASR-Interface; Audio bleibt im Backend-Container. Keine geprüfte deutsche Füllwortquote. |
| Quellen suchen | Jina Embeddings v2 base de + pgvector/Volltext | Vorhandene deutsche lokale Retrieval-Pipeline. Die ähnlichste Passage ist nicht automatisch ein Beleg. |
| Aussagen, Vergleiche, Fragen, Antworten | Gemini `gemini-3.1-flash-lite` (Test/Live) bzw. `gemini-3.8-flash` (final) | Cloud-Modell über den OpenAI-kompatiblen Endpoint; JSON-Modus getestet. Kein Genauigkeits- oder Latenzversprechen. |

Die Umstellung auf Gemini ist eine bewusste Entscheidung für Geschwindigkeit
und Verfügbarkeit, nicht für bessere Genauigkeit. Ein lokales Modell wäre eine
austauschbare Alternative, ist aber nicht mehr als Default eingebaut. „Cloud“
bedeutet: Transkript und Quellen verlassen das Gerät; die Developer API hat
kein EU-Region-Pinning. Für die Jury nur synthetische Inhalte verwenden.

## Wie entsteht ein Quellenvergleich?

1. Das Modell wählt höchstens sechs überprüfbare Aussagen mit **Satzverweisen**.
   Code segmentiert die Wortliste und übernimmt Zeiten aus den referenzierten
   Sätzen. Der extrahierte Claim und der originale Satz sind getrennt sichtbar;
   das Modell darf keine eigene Zeit erfinden.
2. Für jede Aussage werden bis zu fünf Passagen derselben Collection gesucht.
   Quelle und Seite/Folie/Absatz/Zeile bleiben erhalten.
3. Das Modell gibt eine strukturierte Interpretation zurück:
   **stützt**, **widerspricht**, **in den Quellen nicht gefunden**.
   Fehlende oder unzureichende Evidenz bedeutet nicht „falsch“.
4. Code prüft jedes Zitat gegen den tatsächlich abgerufenen Chunk. Der Vergleich
   normalisiert Großschreibung, Leerraum und typografische Zeichen; es bleibt
   eine zusammenhängende Textstelle von mindestens zwölf normalisierten Zeichen
   erforderlich (konfigurierbarer Prototyp-Filter, keine Qualitätsgarantie).
   Ungültiges Urteil/Zitat: **unchecked**, also technisch nicht geprüft.
5. Bis zu drei Rückfragen entstehen aus Transkript und Vergleichen mit gültigen
   Zitaten bzw. fehlender Evidenz. Fragen referenzieren Befunde, Sätze oder
   Quellenpassagen; ungültige Verweise werden entfernt/herabgestuft. Neue Antworten lösen erneut Retrieval und
   Zitatprüfung aus. Ein Zitatfehler unterdrückt auch die weitere Rückfrage.

Ein passendes Zitat beweist nur, dass der Text in der Quelle steht. Ob es die
Aussage tatsächlich trägt, bleibt eine Modellinterpretation. Quellen können
selbst falsch sein. Die Auswahl ist nicht vollständig; ein langer Vortrag kann
mehr Behauptungen enthalten als der Prototyp prüft. Web-Zweitquellen sind über die Team-API vorhanden, aber lokal standardmäßig
ausgeschaltet (`WEB_SEARCH_PROVIDER=none`, Checkbox aus). Endliche Kontext-/Job-Grenzen können einen langen Auftrag scheitern lassen.

Transkript, Quellen und Antworten werden als Daten im Prompt markiert; darin
enthaltene Anweisungen sollen ignoriert werden. Schema-, Index- und Zitatprüfung
reduzieren definierte Fehler, garantieren aber keine Prompt-Injection-Sicherheit.

## Speicherung und Fehler

- Browser: vollständiges Video, Landmark-Log und Review-Zustand im Arbeitsspeicher.
  Replay nutzt dieses Video; dauerhafte geschnittene Server-Clips fehlen noch.
- Audiojob: Original wird nach terminaler Verarbeitung gelöscht, ASR-/Signal-
  Ergebnis bleibt in S3. Es gibt noch keinen automatischen Ablauf/Cleanup.
- Quellen und Modelljobs: lokale persistente Volumes. Die Requests mit dem
  ganzen Transkript bzw. der Antwort werden nach Jobabschluss gelöscht.
  Ergebnisse behalten zitierte Transkript-/Quellenstellen; kein automatischer TTL.
- Redis transportiert nur IDs, keine Transkripte oder Videodaten. Längere Arbeit
  läuft in Celery, die API antwortet sofort mit einer Job-ID.
- Modell/Quelle/Queue nicht verfügbar: sichtbarer Fehler, Video bleibt vorhanden.
  Kein stiller Wechsel zu Demoantworten; ein Cloud-Ausfall wird sichtbar.
- Für die Jury ausschließlich synthetische Demo-Inhalte verwenden. Vor einer
  freiwilligen echten Aufnahme Datenweg und Speicherung im UI erklären.

## Reproduzierbare Prüfung und Evidenz

```sh
docker compose exec -T backend python - < backend/scripts/smoke_gemini.py
docker compose exec -T backend python - < backend/scripts/smoke_coaching.py
docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/speech-de.wav
docker compose exec -T backend python -m scripts.smoke_audio /tmp/speech-de.wav --transcribe
```

Der Gemini-Smoke prüft einen echten JSON-Aufruf durch den Backend-Adapter. Der
Coaching-Smoke prüft die integrierte Pipeline mit synthetischen Daten:
gestützte Aussage, Widerspruch, fehlende Evidenz, passende Rückfrage und
belegte Antwort. Einzelne synthetische Durchläufe sind keine allgemeine
Qualitäts- oder Latenzzusage. Der Smoke entfernt seine Quellen und
Ergebnisobjekte.

Letzter integrierter Lauf mit `gemini-3.1-flash-lite` (minimales Reasoning):
Quellenvergleich 3,4 s, Fragen 2,1 s, Antwortvergleich 1,7 s; alle drei Urteile
korrekt. Der frühere lokale Ollama-Lauf brauchte 10,1 s / 6,1 s / 4,1 s und ist
nur noch historisch. Ein früherer Lauf ordnete eine korrigierte Antwort trotz
passendem Zitat falsch ein; die Prompt-Korrektur und der bestandene
Wiederholungslauf sind im Protokoll beschrieben. Modelle können weiterhin
falsch urteilen; die Latenz ist keine Jury-Zusage.

Whisper `small` transkribierte die 6,845-s-eSpeak-Fixture mit 13 Wort-Timestamps:
„In unserem Prototyp üben wir Präsentationen. Wir sprechen deutlich und erklären
unsere Quellen.“ Das bestätigt die lokale Verbindung. Der Nutzer bestätigte
anschließend auch den echten Mikrofon-/Transkriptfluss: funktioniert, aber
langsam; für diesen Stand akzeptiert. Dialekte, Füllwörter und Zeitgenauigkeit
sind damit nicht allgemein geprüft.

## Primärquellen

- [Gemini OpenAI-Kompatibilität](https://ai.google.dev/gemini-api/docs/openai)
  — Endpoint, Auth und unterstützte Parameter.
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
  — `responseMimeType`/`responseJsonSchema` und Schema-Grenzen.
- [Gemini Thinking](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
  — `thinkingLevel`/`thinkingBudget`, Modellunterstützung.
- [Gemini Modelle](https://ai.google.dev/gemini-api/docs/models) und
  [Preise](https://ai.google.dev/gemini-api/docs/pricing) — Modell-IDs,
  Kontextfenster, Kosten; Stände ändern sich.
- [Gemini Terms](https://ai.google.dev/gemini-api/terms) — Datenverarbeitung,
  Retention und Regionen.
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
  — lokale CTranslate2-Inferenz und `word_timestamps=True`.
- Evidenz und Grenzen: `docs/11-deep-research-validation.md`.

## Deep Research (24.10.2026)

- **Schwaches Modell reicht für den Batch-Pfad, nicht für den strikten
  Writer.** `gemini-3.1-flash-lite` (minimal) lieferte Fact-Check, Fragen und
  Antwortprüfung in 3,4 / 2,1 / 1,7 s; der Review-Writer fiel an der
  Verifikationsgrenze auf die geprüfte Template-Review zurück. Final
  `gemini-3.8-flash` verwenden.
- **Fact-Check bleibt fallibel.** Claim-Verifikation ist in Benchmarks etwa
  57–63 % genau; der Code prüft nur das wörtliche Zitat. Keine
  Genauigkeits- oder Latenzzusage aus synthetischen Läufen.
- **Cloud ist eine bewusste Abkehr von Local-only.** Gemini Developer API ohne
  EU-Region-Pinning; Paid-Inhalte nicht zum Training, Unpaid kann geprüft
  werden. Nur synthetische Demo-Daten senden oder Vertex AI mit EU-Region
  prüfen.
- **Ollama ist kein Build-Bestandteil mehr.** Es war ein Host-Dienst; die
  Entfernung ändert die Build-Zeit nicht, nur die Laufzeitabhängigkeit.
- Vollständige Zitate und Evidenzgrade: `docs/11-deep-research-validation.md`.

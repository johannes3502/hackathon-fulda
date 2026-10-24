# Review und ElevenLabs-Fragerunde

Nutzerentscheidung, 24.10.2026: zwei Review-Schritte, Fragen passend zu
Startup-Pitch, Thesis-Verteidigung, Schulvortrag oder Nonprofit-Einladung.
Der Nutzer trägt die ElevenLabs-Zugangsdaten nach der Implementierung ein.

## Ablauf

1. Im Studio **Presentation & material** öffnen, Präsentationstyp wählen und
   Material hochladen. PDF/PPTX/DOCX/TXT/MD, maximal 25 MB pro Datei. **Ready**
   abwarten; **Manage material** öffnet die bestehende Quellenverwaltung.
2. **Enable questions after recording** schaltet Backend-Transkription ein.
   Der sichtbare Aufnahmehinweis erklärt Deepgram EU und lokalen Whisper-Fallback.
3. Aufnehmen und **Finish & review**. **Review moments** verbindet Video,
   begrenzte Wiedergabe-Abschnitte und zeitgenaue Feedback-Anmerkungen.
4. **Practice questions**: sprechen oder tippen, eine Frage pro Schritt.
   Fehlt ein Transkript, kann **Transcribe this take** die Aufnahme nach explizitem
   Klick zur lokalen Whisper-Analyse hochladen. Das Originalvideo bleibt im Tab.
5. Video vor dem Neuladen herunterladen. Browser-Aufnahmen und Gesprächstext
   werden nicht über einen Reload hinaus gespeichert.

Getippte Fragen und ihr Quellenvergleich nutzen das konfigurierte Sprachmodell,
standardmäßig Gemini (Google). Dabei verlassen Transkript, passende
Quellenauszüge und getippte Antworten den lokalen Rechner. Nur synthetische
Demo-Daten verwenden. Die direkte ElevenLabs-Fragerunde benötigt keinen
Gemini-Key; sie ist unabhängig vom getippten Fragepfad.

## Kurzreview und Modell-Ausfall

Das Web-Review benötigt für Kamera- und Sprachhinweise kein LLM. Feste Texte
werden anhand der tatsächlich erhobenen Events ausgewählt: Beobachtung und
Messwert, mögliche Bedeutung als Übungshinweis, konkreter nächster Schritt.
Tempo, Lautstärke, Tonhöhenvariation, Füllwörter, Wiederholungen und Pausen
haben eigene Erklärungen. Langsameres Sprechen, Pausen und Gesten sind nicht
pauschal Fehler; die Hinweise fordern zum Prüfen des Kontexts auf.

Stärken und Verbesserungen sind standardmäßig gemeinsam sichtbar. Eine
ASR-Pause nach einem Satzende kann als positiver Moment erscheinen, wenn
Satzzeichen und Wort-Timestamps vorliegen. Eine bereits quellengeprüfte,
gestützte Aussage ist ebenfalls ein positiver Moment. Die Satzgrenze bleibt
eine ASR-Heuristik, das Quellenurteil eine Modellinterpretation. Fehlende
Warnungen, unbekannte Messzeit und nicht abgeschlossene Quellenchecks liefern
kein Lob. Ohne positive Evidenz benennt das Review diese Grenze.
Der kombinierte Audiojob behält dafür Wortpausen samt Satzkontext. Er ersetzt
nur überlappende akustische Pausen; zusätzliche reine Signalpausen und die
Roh-Ergebnisse beider Pipelines bleiben erhalten. Auch der persistente
Pausen-Merge erhält belegte ASR-Satzgrenzen und die beteiligten Event-IDs.

Die separate persistente Take-Review-API liefert dieselbe Grundstruktur mit
`observation`, fester `interpretation`, `nextAction` und bis zu drei belegten
`strengths`. Fehlt die LLM-Konfiguration oder scheitert ein Anbieteraufruf,
entsteht weiterhin eine Template-Review aus den Daten dieses Takes. Ein
Anbieterfehler wird nicht erneut angefragt; ungültige Formulierungen dürfen
einmal korrigiert werden. Die Review bleibt ein abgeschlossener Job;
`generator`, `limitations` und Verifikationsdaten benennen den Fallback.
Ein konfiguriertes Cloud-Modell braucht weiterhin Einwilligung. Der Worker
prüft sie erneut, falls sich die Konfiguration während der Wartezeit ändert.
Quellenurteile und Übungsfragen werden bei einem LLM-Ausfall nicht erfunden.

## ElevenLabs konfigurieren

- Einen privaten Conversational Agent anlegen. In **Security** die Authentifizierung
  und den Override für **System prompt** aktivieren.
- Der API-Schlüssel braucht unter **ElevenAgents** die Berechtigung **Write**
  (`convai_write`). **Read** kann den Agenten laden, aber keine Signed URL
  ausstellen; dieser Aufruf scheitert dann mit HTTP 401 `missing_permissions`.
- Die erste Nachricht des Agenten kurz und offen halten, z. B. „Lassen Sie uns
  Ihre zentrale Aussage besprechen. Welche Belege stützen sie?“ Sprache und
  Stimme passend zur Vorführung konfigurieren. Der Gesprächsprompt fordert
  danach Fragen in der Sprache des Transkripts.
- In der lokalen `.env` setzen:

```dotenv
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=agent_...
```

Der Variablenname ist `ELEVENLABS_API_KEY`, nicht `ELEVENLABS_KEY`.
Für Gemini müssen auch Endpunkt und Modell gesetzt sein; vorhandene, aber
leere `.env`-Einträge überschreiben die Compose-Standardwerte:

```dotenv
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-3.1-flash-lite
LLM_API_KEY=...
```

```sh
docker compose up -d --build frontend backend worker
curl http://localhost:3000/api/questions/agent/settings
```

`available: true` bedeutet nur, dass beide Einstellungen vorhanden sind.
Erst eine echte Gesprächsverbindung bestätigt Agent-Berechtigungen, Prompt-
Override, Mikrofon, Audioausgabe und Anbieter-Verfügbarkeit. Der Browser lädt
den offiziellen `@elevenlabs/client` erst beim Start. Er bekommt eine kurzlebige
Signed URL; der API-Key bleibt im Backend. Es werden keine Agenten automatisch
im ElevenLabs-Konto angelegt oder verändert.

## Daten und Grenzen

- Ein Celery-Job bereitet Kontext aus dem Transkript und bis zu acht passenden
  Quellenauszügen aus der Collection des Takes vor. Redis erhält nur die Job-ID.
  Maximal 24.000 Transkriptzeichen und 2.200 Zeichen pro Auszug; Kürzung des
  Transkripts und fehlende Auszüge werden angezeigt. Nicht die gesamte
  Materialbibliothek wird an ElevenLabs geschickt.
- Beim Start gehen dieser Kontext, optionale Fact-Check-Funde und Live-Audio an
  ElevenLabs. Dessen Speicherung richtet sich nach den Einstellungen des
  Nutzerkontos; diese Integration konfiguriert oder löscht dort keine Daten.
- Der Backend-Job löscht `request.json`. `status.json` enthält weiterhin den
  vorbereiteten Kontext; wie bei anderen Analyse-Jobs fehlt noch automatisches
  TTL-Cleanup. Keine Zusage, dass alle Transkriptkopien gelöscht sind.
- Sprachfeedback des Agenten ist ein Modellvorschlag. Es wird nicht durch den
  `quote_in_text`-Check der getippten Antworten validiert. Fehlende Belege heißen
  nicht „falsch“. Keine Punkte, Noten oder Persönlichkeitsbewertung.
- Die Clips im Review sind abspielbare Zeitfenster im lokalen Vollvideo mit
  maximal zwei Sekunden Kontext je Seite, keine gespeicherten Clip-Dateien.
- Ein anderer in der Quellenverwaltung gewählter Collection-Schlüssel ändert
  vorhandene Takes nicht. Änderungen an den Dokumenten innerhalb derselben
  Collection wirken sich weiterhin auf spätere Fragen aus.

## Verifikation

Synthetische Tests prüfen Prompt-Schwerpunkte aller vier Modi, Quellenbindung,
Job-Wiederzustellung, serverseitige Authentifizierung, Fehlermeldungen sowie
Wiedergabe und Dialog-UI. Der optionale Browser-Test nutzt echte lokale Dienste,
Gemini und ElevenLabs; nur Kamera und Mikrofon werden durch synthetisches Video
und die deutsche Sprach-Fixture ersetzt:

```sh
RUN_CLOUD_SMOKE=1 npm run test:e2e --workspace frontend -- cloud-flow.spec.ts --project desktop
```

Er prüft Material-Upload, Aufnahme, Whisper-Transkription, Quellencheck,
getippte Fragen und Antwortvergleich sowie eine authentifizierte ElevenLabs-
Verbindung mit Quellen im Prompt-Override, 48-kHz-Audio und einem gesprochenen
Antwortwechsel. Er verursacht Anbieter-Nutzung und setzt den Agenten auf
`pcm_48000` voraus. Ohne `RUN_CLOUD_SMOKE=1` wird er übersprungen.
Traces und Videos sind deaktiviert, damit keine Signed URLs in ihnen landen.
Die hochgeladene Testquelle wird gelöscht; synthetische Job-IDs stehen im
Test-Anhang für gezieltes Cleanup der weiterhin gespeicherten Job-Ergebnisse.
Anbieter-Gespräche unterliegen weiterhin der Konto-Aufbewahrung.

Am 24.10.2026 lief dieser Cloud-Test erfolgreich durch (35,4 s): Gemini
`gemini-3.1-flash-lite` für Quellencheck und Text-Fragerunde; der ElevenLabs-
Agent mit Ben, `eleven_v4_turbo`, `pcm_48000` und seinem separat konfigurierten
Dialogmodell `deepseek-v41-flash`. Signed URL, Prompt-Override und ein
gesprochener Antwortwechsel wurden tatsächlich geprüft. Zusätzlich bestanden
281 Backend-Tests, die App-Unit-Tests, 47 reguläre Desktop-Browser-Tests,
Lint, Typecheck, Production-Build und die echten Coaching-/Review-Smokes.
Die Dauer ist ein einzelner synthetischer Testlauf, keine Latenzzusage.

Reale Audioqualität über Mac-Lautsprecher, Geräteverhalten und pädagogische
Qualität sind durch synthetische Audioübertragung nicht abgenommen.

Offizielle Referenzen: [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script),
[Signed URLs](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url),
[Prompt overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides).

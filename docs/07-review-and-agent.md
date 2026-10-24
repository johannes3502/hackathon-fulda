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

## ElevenLabs konfigurieren

- Einen privaten Conversational Agent anlegen. In **Security** die Authentifizierung
  und den Override für **System prompt** aktivieren.
- Die erste Nachricht des Agenten kurz und offen halten, z. B. „Lassen Sie uns
  Ihre zentrale Aussage besprechen. Welche Belege stützen sie?“ Sprache und
  Stimme passend zur Vorführung konfigurieren. Der Gesprächsprompt fordert
  danach Fragen in der Sprache des Transkripts.
- In der lokalen `.env` setzen:

```dotenv
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=agent_...
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
Wiedergabe und Dialog-UI. Ein echter ElevenLabs-Anruf, reale Audioqualität,
Geräteverhalten und pädagogische Qualität bleiben nach der Konfiguration zu prüfen.

Offizielle Referenzen: [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script),
[Signed URLs](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url),
[Prompt overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides).

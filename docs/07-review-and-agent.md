# Review und ElevenLabs-Fragerunde

Nutzerentscheidung, 24.10.2026: zwei Review-Schritte, Fragen passend zu
Startup-Pitch, Thesis-Verteidigung, Schulvortrag oder Nonprofit-Einladung.
Der Nutzer trägt die ElevenLabs-Zugangsdaten nach der Implementierung ein.

## Ablauf

## Review-Evidenzprofil

Ergänzender Nutzerauftrag: Vier 0–100-Prototyp-Scores stehen über dem Video.
`evidence-share-v2` bewertet **Körper & Gesten**, **Quellenbezug**,
**Sprechfluss** und **Aufbau** getrennt. Es gibt keinen Gesamtscore.

- **Zeitkriterien** (Körper & Gesten, Sprechfluss): positive und kritische
  Intervalle werden je Art vereinigt; Überlappungen zählen hälftig. Die
  geglättete Schätzung ist `(positive ms + 1000) / (bewertete ms + 2000)`, die
  Spanne ein Wilson-95-%-Intervall. Unter 5 s bewerteter Zeit oder 10 %
  Abdeckung steht „–“, unter 30 s oder 30 % „vorläufig“; Endpunkte 0/100 erst ab
  30 s.
- **Quellenbezug:** `(gestützte + 1) / (gestützte + widersprochene + 2)`, nur
  für Aussagen mit `quote_verified = exact|fuzzy`. Ohne entscheidbare Aussage
  „–“, unter 5 Entscheidungen vorläufig, Endpunkte erst ab 10. `not_found` und
  `unchecked` bleiben offen und gelten nicht als falsch.
- **Aufbau:** `structure-rubric-v1` (siehe unten) liefert Einstieg, Abschluss,
  Abschnitte und Übergänge. Der Score entsteht nur mit mindestens drei
  verfügbaren Signalen, 50 Wörtern und 45 s; die Spanne kommt aus den
  Komponenten. Folien, Betonung und Mimik werden nicht geprüft.

Ohne Evidenz steht „–“. Datenabdeckung, Formel und Grenzen sind im UI sichtbar.
Das Hauptreview und die detaillierte Analyse verwenden denselben
`recordingReviewData`-Adapter für die gespeicherte Aufnahme (Video, Dauer,
Kamera-/Sprachhinweise, Wörter und aktueller Quellencheck). Quellen-Anmerkungen
werden aus dem aktuellen Check abgeleitet, damit alte Marker nach einem erneuten
Check keine abweichenden Scores ergeben. `evidenceVerdict` hält Urteile ohne
geprüftes Zitat auch im Score offen. Die Score-Karten benennen den Titel der
Aufnahme; der synthetische Pfad `/review-preview` bleibt ausdrücklich ein
Beispiel. Beide Review-Ansichten zeigen dieselben vier Kriterien und dieselbe
Aufbau-Evidenz; es gibt keinen versteckten fünften Score.

### Aufbau-Rubrik `structure-rubric-v1`

Die Rubrik läuft deterministisch im Browser auf Wörtern und Zeitstempeln:
Satzende an `.!?…` oder einer Lücke ab 1500 ms, maximal 40 Wörter pro Satz;
DE/EN-Marker für Einstieg (erste zwei Sätze), Abschluss (letzte zwei Sätze),
Sequenzen und Abschnittswechsel. Abschnittsgrenzen entstehen aus Jaccard-
Ähnlichkeit von 3-Satz-Fenstern (absolut ≤ 0,12 und ≥ 0,06 unter dem lokalen
Mittel; starke Sequenzmarker bis ≤ 0,35), Abschnitte unter 3 Sätzen/12 s werden
zusammengeführt, maximal 8. Einstieg/Abschluss/Abschnitte sind 0/1, Übergänge
`min(1, markierte Übergangssätze/2)`. Der Score ist das gerundete Mittel der
verfügbaren Signale, aber nur bei mindestens 3 Signalen, 50 Wörtern und 45 s.
Konfidenz `high` ab 150 Wörtern/90 s/8 Sätzen/4 Signalen, `medium` ab 80/60/3,
sonst `low`; `low` ergibt „vorläufig“.

Marker und Abschnittsgrenzen sind Heuristiken. Ein fehlender Marker belegt
keinen fehlenden Übergang; gemischte Sprache wird erkannt, aber nicht semantisch
aufgelöst. Es gibt keine Pk-/Genauigkeitsauswertung. Details und Quellen:
`docs/15-evidence-safety-retention-research.md`.

Der Graph ist eine durchgehende, ungefüllte Linie mit geraden, zackigen Segmenten. Zwischenwerte
sind als interpoliert gekennzeichnet, der Wiedergabepunkt folgt dem Video.
Darunter teilt eine Wiedergabeleiste dieselbe Zeitachse und die Grün-/Rot-/Neutralbereiche
des Graphen, inklusive interpolierter Nulldurchgänge. Bereits abgespielte Zeit ist
kräftig eingefärbt, kommende Zeit gedämpft. Play/Pause und Zeitregler sind mit
den nativen Videosteuerungen synchronisiert; Tastatursprünge bleiben möglich.

1. Im Studio **Presentation & material** öffnen, Präsentationstyp wählen und
   Material hochladen. PDF/PPTX/DOCX/TXT/MD, maximal 25 MB pro Datei. **Ready**
   abwarten; **Manage material** öffnet die bestehende Quellenverwaltung.
2. **Enable questions after recording** schaltet Backend-Transkription ein.
   Der sichtbare Aufnahmehinweis erklärt Deepgram EU und lokalen Whisper-Fallback.
3. Aufnehmen und **Finish & review**. **Review moments** verbindet Video,
   begrenzte Wiedergabe-Abschnitte und zeitgenaue Feedback-Anmerkungen.
   Unter dem Video zeigt ein qualitativer Graph die Zeit auf der x-Achse und
   den Saldo gleichzeitiger Hinweise um eine neutrale Mittellinie: positive
   Momente oben, Anpassungshinweise unten. Größere Ausschläge bedeuten mehr
   gleichzeitige Hinweise, keine gemessene Performance und keine Note.
   Beobachtungen bleiben neutral; fehlende Hinweise sind keine positive Evidenz.
   Klick im Graphen wählt den nächsten Moment; Zeitregler und aufklappbare
   Zeitmarken erlauben präzise bzw. tastaturbedienbare Sprünge.
4. **Practice questions**: sprechen oder tippen, eine Frage pro Schritt.
   Fehlt ein Transkript, kann **Transcribe this take** die Aufnahme nach explizitem
   Klick zur lokalen Whisper-Analyse hochladen. Das Originalvideo bleibt im Tab.
5. Abgeschlossene Aufnahmen, Analyse und Gesprächstext bleiben in IndexedDB
   dieses Browsers gespeichert und werden nach Reload wiederhergestellt.
   **Recording details and exports** bietet Download und lokales Löschen.

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
  und die Overrides für **System prompt** und **First message** aktivieren.
- Websuche als Webhook-Tool **search_web** am Agenten hinterlegen:
  Vorlage `templates/elevenlabs-web-search.json`. In ElevenLabs ein Workspace-Secret
  mit Wert `Bearer <TAVILY_API_KEY>` anlegen und dessen ID anstelle von
  `REPLACE_WITH_TAVILY_BEARER_SECRET_ID` einsetzen. Das Tool über
  `POST /v1/convai/tools` mit `{ "tool_config": <Vorlage> }` anlegen und seine ID
  zu `conversation_config.agent.prompt.tool_ids` hinzufügen; vorhandene IDs und
  System-Tools erhalten. Kein API-Key im Prompt, Browser oder eingecheckten JSON.
  Der Agent ruft direkt Tavily auf; ein öffentlich erreichbares lokales Backend
  ist dafür nicht nötig. `WEB_SEARCH_PROVIDER` steuert weiterhin nur den separaten
  Backend-Fact-Check, nicht dieses Tool.
  Upload-Auszüge haben Vorrang. Reichen sie für eine Sachfrage nicht aus, soll
  der Agent zuerst suchen, dann mit Website/Publisher und zurückgegebener URL
  antworten. Kein pauschales „fehlt in deinen Quellen“. Bei Suchfehlern oder
  unklaren Treffern bleibt das Urteil offen; niemals eine Suche behaupten, die
  nicht erfolgreich ausgeführt wurde. Tool-Auswahl und Quellenqualität bleiben
  Modellverhalten, keine garantierte Verifikation.
- **First message im Agenten speichern:** „Ich habe noch ein paar Fragen.
  Bist du bereit?“ Die gespeicherte Nachricht wird direkt vorgelesen und
  durchläuft nicht den System-Prompt; sie muss daher zum gewünschten Einstieg
  passen.
- Der API-Schlüssel braucht unter **ElevenAgents** die Berechtigung **Write**
  (`convai_write`). **Read** kann den Agenten laden, aber keine Signed URL
  ausstellen; dieser Aufruf scheitert dann mit HTTP 401 `missing_permissions`.
- Sprache und Stimme passend zur Vorführung konfigurieren. Die App übergibt
  „Ich habe noch ein paar Fragen. Bist du bereit?“ als `firstMessage`-Override.
  Nach diesem festen deutschen Einstieg wartet der Agent auf eine Bestätigung.
  Erst dann stellt er die erste konkrete Frage zum bereits übergebenen Transkript
  in dessen Sprache. Wer noch nicht bereit ist, bekommt Zeit.
  Der Sprachagent ist in allen Präsentationsmodi eine Lehrkraft, die ihren
  Schüler zum abgeschlossenen Vortrag befragt, kein Investor; ohne zusätzliche
  Begrüßung, Vorstellung oder Rückblick.
  Er prüft Verständnis, Zusammenhänge, Beispiele und Transfer anhand des
  Vortrags oder Materials. Ist eine Antwort geprüft korrekt und beantwortet die
  Frage, folgt nur ein kurzer Bestätigungssatz und direkt die nächste Hauptfrage
  (nach der dritten die Abschlusshinweise). Keine Wiederholung der Antwort,
  lange Erklärung, ausführliches Lob oder weitere Nachfrage zur beantworteten
  Frage; notwendige Quellenangaben bleiben knapp. Mehr Erklärung nur auf Wunsch.
  Bei falschen, unvollständigen oder unbelegten
  Antworten sind im Voice-Prompt eine, höchstens zwei Nachfragen pro Hauptfrage
  vorgesehen; danach kurz quellenbelegt korrigieren oder Unsicherheit benennen
  und zur nächsten Hauptfrage wechseln, auch wenn die Antwort weiter falsch ist.
  Bei „weiß ich nicht“ oder Wunsch zu überspringen wechselt er früher weiter.
  Der Browser beendet den Voice-Pfad nach 600 s oder 12 Antworten. Diese
  Grenzen sind Prompt-/Client-Vorgaben, keine programmatisch erzwungene
  Gesprächssteuerung durch den Anbieter. Die Rollen der getippten Fragerunde
  bleiben modusabhängig.
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
und First-message-Override, Mikrofon, Audioausgabe und Anbieter-Verfügbarkeit.
Der Browser lädt den offiziellen `@elevenlabs/client` erst beim Start. Er bekommt eine kurzlebige
Signed URL; der API-Key bleibt im Backend. Die App legt keine Agenten automatisch
an und verändert sie nicht. Das Suchtool wird einmalig wie oben im Konto konfiguriert.

## Frage-Runden: Grenzen und Prompt-Sicherheit

Der getippte Pfad ist serverseitig begrenzt. `POST /questions` erzeugt eine
Runde und legt die kanonischen Fragen samt Zählern in Redis ab
(`question-round:<uuid>`, TTL 600 s, konfigurierbar 60–3600 s). Der Client
sendet beim Antworten nur `round_id` und `question_id`; ein frei erfundener
Fragetext wird mit 422 abgelehnt. Die Runde erlaubt maximal 5 Startfragen
(Default 3), 3 Follow-ups und standardmäßig 6 Antwort-Turns
(Request-Konfiguration bis 12). Pro Antwort sind 4000 Zeichen,
pro Voice-Upload 25 MB erlaubt. Eine Frage wird nur einmal akzeptiert; ein
identischer Retry liefert die gecachte Auswertung, ein anderer Text wird
abgelehnt. Ein `pending`-Claim verhindert doppelte bezahlte Aufrufe und läuft
nach 180 s ab. Erreicht die Runde ihr Limit oder ist sie abgelaufen, antwortet
der Server mit 429 bzw. 410.

Transkript, Funde, Quellenauszüge, Fragen und Antworten werden als
untrusted-Daten mit einem zufälligen Nonce markiert; nach jedem Block folgt die
Policy erneut. Das erschwert das Einschleusen schließender Tags, ist aber kein
vollständiger Schutz. Ausgaben werden strikt gegen Pydantic-Schemas und Enums
geprüft; Quellenzitate müssen wörtlich im Auszug stehen. Web-URLs werden nur als
absolute `http(s)`-URLs ohne Credentials oder Steuerzeichen akzeptiert.

Prompt-Injection bleibt ein Restrisiko: Ein Modell kann Anweisungen in Daten
folgen, der Systemprompt kann teilweise offengelegt werden, und die lokale API
hat keine allgemeine Authentifizierung oder Rate-Limits. Im Voice-Pfad gelten
600 s und 12 Antworten im Browser; ob ElevenLabs zusätzliche harte Limits
erzwingt, hängt von der Agentenkonfiguration ab und ist nicht im Code
garantiert. Details und Quellen: `docs/15-evidence-safety-retention-research.md`.

## Auswertung nach der Fragerunde (24.10.2026, v2 am 25.10.2026)

Sobald jede Frage der getippten Runde beantwortet ist, zeigt der Web-Review
unterhalb der Fragerunde eine Auswertung („Your take at a glance“). Der
Sprachdialog öffnet dasselbe Panel nach **End conversation** oder einem
regulären Gesprächsende durch den Agenten und setzt den Tastaturfokus auf die
Überschrift. **Back to questions** führt zurück zur Fragerunde; Abbrechen beim
Verbindungsaufbau und Verbindungsfehler öffnen keine Auswertung. Vor dem Wechsel
wird die Voice-Verbindung geschlossen und das Mikrofon freigegeben. Die
Auswertung ist rein clientseitig und deterministisch
(`frontend/src/features/evaluation/performance.ts`, Panel
`frontend/src/components/live/PerformanceEvaluation.tsx`); kein Backend-Endpunkt,
kein LLM, Eingaben sind nur Daten, die der Browser ohnehin hat
(Fact-Check-Urteile, Antwort-Urteile, Wörter, Feedback-Events, Pose-Events).

`practice.evidence.v2` zeigt vier getrennte Zeilen, **keinen Gesamtscore**,
keine Gewichte und keine Labels wie „Strong“/„Fair“:

- **Quellenbindung Vortrag:** `(gestützte + 1) / (gestützte + widersprochene +
  2)` über die Fact-Check-Aussagen, nur mit geprüftem Quellenzitat; Wilson-
  95-%-Spanne. Ohne entscheidbare Aussage „–“; unter 5 Entscheidungen vorläufig.
- **Quellenbindung Antworten:** dieselbe Formel über die beantworteten
  Practice-Fragen. Offene Fragen bleiben als offen sichtbar.
- **Sprechmerkmale:** Anzahl und Rate pro Minute der Marker für Tempo,
  Lautstärke, Tonhöhe, Füllwörter und Pausen. Keine Umrechnung in eine
  Punktzahl; fehlende Marker beweisen keine gute Leistung.
- **Pose/Gesten:** Anzahl und Rate pro Minute der Haltungs-, Gesten- und
  Kopforientierungsmarker. Keine Umrechnung in eine Punktzahl.

Die vier Zeilen messen unterschiedliche Dinge und werden nicht verrechnet. Die
Quellenzeilen sind Schätzungen mit Unsicherheit; die Sprech-/Pose-Zeilen sind
Zähler. „Nicht gefunden“ heißt nicht „falsch“, und der Sprachpfad liefert keine
Antwort-Urteile. Die alte gewichtete 0–100-Heuristik
(`evidence-count-heuristic.v1`) ist ersetzt. Grenzen: unvalidierte
Prototyp-Regeln, keine Person-, Emotions- oder Eignungsbewertung, kein
Vergleich mit anderen Sprechern. Methodik und Quellen:
`docs/15-evidence-safety-retention-research.md`.

## Daten und Grenzen

Abgeschlossene Live-Sessions einschließlich Video, Pose-Log, Analyse und
Fragen-/Gesprächsverlauf werden pro Take in Browser-IndexedDB gespeichert.
Updates aus späteren Analysen und Gesprächen werden ebenfalls gespeichert.
Nach Reload entstehen neue Objekt-URLs aus den gespeicherten Blobs. Studio
(„Past sessions“) und Dashboard zeigen die gespeicherten Takes; im Review unter
„Recording details and exports“ lässt sich ein Take mit Bestätigung lokal löschen.
Speicherfehler lassen die aktuelle Aufnahme im Tab verfügbar und zeigen einen
Download-Hinweis. Der Browser kann Daten bei Speicherdruck verdrängen; Löschen
der Browserdaten entfernt die Historie. Keine Cloud-Synchronisation.
Serverseitige Sessions/Takes/Profile unterliegen der täglichen Retention
(Standard 12 Monate, `RETENTION_*`); Profil-Ablauf entkoppelt Sessions/Takes,
`deleteSessions=true` löscht optional auch die Analyse. Quellen-Collections und
mehrere S3-Präfixe werden nicht vollständig durchsucht; eine
S3-Lifecycle-Regel ist nur Backstop und nicht verifiziert. Das ist keine
Rechtsgarantie und keine Zusage, dass jede Kopie gelöscht ist. Bereits
vor dieser Änderung aus dem Arbeitsspeicher verlorene Takes sind nicht rekonstruierbar.

Websuche geprüft am 25.10.2026: synthetischer Textdialog über denselben privaten
ElevenLabs-Agenten und den App-Prompt ohne Upload-Auszüge. Der Agent rief
`search_web` zum Thema Mars/Eisenoxid auf; das Gesprächsprotokoll enthält
`tool_has_been_called=true`, `is_error=false` und Web-URLs im Resultat. Anschließend
nannte er Quellen-URLs in der Antwort. Ein erster Versuch mit einer schwächeren
Prompt-Vorgabe gab ungeprüftes Modellwissen aus; deshalb steht die verpflichtende
Tool-Nutzung jetzt am Prompt-Anfang. Das ist ein einzelner Integrationstest,
keine Garantie für jede Antwort und keine Mikrofon-/Audio-Abnahme.

- Ein Celery-Job bereitet Kontext aus dem Transkript und bis zu acht passenden
  Quellenauszügen aus der Collection des Takes vor. Redis erhält nur die Job-ID.
  Maximal 24.000 Transkriptzeichen und 2.200 Zeichen pro Auszug; Kürzung des
  Transkripts und fehlende Auszüge werden angezeigt. Nicht die gesamte
  Materialbibliothek wird an ElevenLabs geschickt.
- Beim Start gehen dieser Kontext, optionale Fact-Check-Funde und Live-Audio an
  ElevenLabs. Dessen Speicherung richtet sich nach den Einstellungen des
  Nutzerkontos; diese Integration konfiguriert oder löscht dort keine Daten.
- Bei unzureichenden Auszügen gehen gezielte öffentliche Sachfragen von ElevenLabs
  an Tavily (basic, höchstens drei Treffer pro Aufruf, keine Rohseiten). Die UI
  benennt den Anbieter vor Gesprächsstart. Der Prompt verbietet vollständige
  Transkripte/private Details als Suchanfrage und behandelt Suchtreffer als
  unvertrauenswürdige Daten. Websuche kann zusätzliche Latenz und Kosten verursachen.
- Der Backend-Job löscht `request.json`. `status.json` enthält weiterhin den
  vorbereiteten Kontext; der tägliche Retention-Sweep erfasst dieses S3-Präfix
  nicht. Keine Zusage, dass alle Transkriptkopien gelöscht sind.
- Sprachfeedback des Agenten ist ein Modellvorschlag. Es wird nicht durch den
  `quote_in_text`-Check der getippten Antworten validiert. Fehlende Belege heißen
  nicht „falsch“. Keine Punkte, Noten oder Persönlichkeitsbewertung.
- Die Clips im Review sind abspielbare Zeitfenster im lokalen Vollvideo mit
  maximal zwei Sekunden Kontext je Seite, keine gespeicherten Clip-Dateien.
- Ein anderer in der Quellenverwaltung gewählter Collection-Schlüssel ändert
  vorhandene Takes nicht. Änderungen an den Dokumenten innerhalb derselben
  Collection wirken sich weiterhin auf spätere Fragen aus.

## Verifikation

Der optionale Konfigurationstest liest den tatsächlich konfigurierten Agenten
und prüft den exakten Einstieg sowie beide Override-Berechtigungen. Er benötigt
`ELEVENLABS_API_KEY` und `ELEVENLABS_AGENT_ID` in der Prozessumgebung und startet
kein Gespräch; ein abweichender Begrüßungstext lässt ihn fehlschlagen:

```sh
RUN_CLOUD_SMOKE=1 PYTHONPATH=backend python -m pytest backend/tests/test_question_agent.py -k live_agent -q
```

Am 25.10.2026 wurde der feste Bereitschaftseinstieg im Agenten und im Browser
gesetzt. Alle 17 Question-Agent-Tests einschließlich Live-Konfigurationscheck
bestanden; Desktop- und Mobile-Browsertests prüfen den genauen Wortlaut und
dass kein automatischer Startauftrag eine Fachfrage vorzieht. Eine echte
Voice-WebSocket-Session mit synthetischem Pflanzenversuch lieferte den exakten
Einstieg, wartete auf „noch nicht bereit“ und stellte erst nach „jetzt bin ich
bereit“ eine Frage zur gleichen Wassermenge. Audio wurde empfangen; physisches
Mikrofon und Lautsprecher wurden nicht geprüft. Das Warten bleibt eine
Prompt-Vorgabe, keine programmatisch erzwungene Gesprächssteuerung.

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

Aktueller Prüfstand (25.10.2026, synthetisch): Backend 370 bestanden, 2
übersprungen; Frontend 314 bestanden in 44 Dateien; Lint, Typecheck und Build
grün. Das belegt weder Modellqualität noch Geräteverhalten.

Offizielle Referenzen: [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script),
[Webhook-Tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools),
[Workspace-Secrets](https://elevenlabs.io/docs/api-reference/workspace/secrets/create),
[Signed URLs](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url),
[Prompt overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides).

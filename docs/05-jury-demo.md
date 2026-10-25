# Jury-Rundgang und Abnahme

Stand: 25.10.2026. Ziel: selbstständig verständlicher Prototyp in unter 3 Minuten.
Die App-Texte sind überwiegend Englisch; Start, Progress und Review-Scores sind
teilweise Deutsch. Diese Anleitung ist für das Team.
**Nutzerentscheidung: lokal reicht.** Keine öffentliche Bereitstellung nötig;
die Jury nutzt den vorbereiteten Demo-Laptop unter `http://localhost:3000`.
Start: `docker compose up --build -d --wait` (siehe Root-README). Das
Frontend läuft seit 25.10.2026 als **Production-Build**; der frühere
Turbopack-/HMR-Dev-Container wird für die Jury nicht mehr verwendet. Nach
Code-Änderungen neu bauen, nicht nur restarten. Für reine Gesten-/Sample-Demo
reicht alternativ Node.js 22.12+: `npm ci`, `npm run build`, `npm run start`.

## Pitch Mode (Jury-Bühne, 25.10.2026)

`/stage` ist der vorbereitete Einstieg für die eigene Jury-Demo. Der Preflight
zeigt Backend, Quellencheck, Kamera/Mikrofon und IndexedDB. **Lokale
Sofortaufnahme** ist der Standard und funktioniert ohne
Backend. **Live-Demo starten** nutzt die Backend-Analyse und ist nur nach einem
Warmlauf sinnvoll; die Stage beendet das Warten nach 90 s und behält das
lokale Video. Nach dem Stopp öffnet das Stage-Review mit den drei
`evidence-share-v1`-Kriterien und genau einer vorbereiteten Datenschutzfrage
(90-s-Antwortfenster, keine Nachfrage, keine Bewertung). Die normale
`/live`-Aufnahme bleibt parallel erreichbar und ist nicht der Bühnenpfad.

Vor der Jury: `/stage` öffnen, Preflight einmal ausführen, eine kurze lokale
Aufnahme machen, Review und Frage prüfen. Für den Live-Pfad zuerst einen
synthetischen Take warmlaufen lassen; ohne Warmlauf lokal bleiben.

## Ablauf am Stand (ca. 2 Minuten)

1. `/demo` öffnen (nicht die Startseite `/`), **See gestures in 22 seconds**
   wählen, dann **Play 22-second example**. Sichtbares Label: synthetisch,
   keine Kamera. Die drei Bewegungen durchlaufen dieselben Regeln wie im
   Live-Pfad. Danach verschwindet die Person: „Evaluation paused“ statt
   erfundener Bewertung.
2. Bei einer Beobachtung **How was this observed?** öffnen. Erklären: Das Modell
   liefert Punkte; unser Code prüft Sichtbarkeit, Neutralstellung, Geometrie und
   Dauer. Kein Score und keine Interpretation von Emotion oder Blickkontakt.
3. **Try with your camera** → Kamera erlauben. Eine Person, ruhiger Hintergrund,
   Licht von vorn, Kamera fest und möglichst gerade. Schultern, Hüften, Ellbogen
   und Hände im Bild. Sitzen ist möglich. Drei Sekunden ruhig halten, Hände
   getrennt neben der Taille. „Ready“ abwarten; bei Bedarf neu kalibrieren.
4. **Record with gesture feedback** → erneut 3 Sekunden neutral. Hand deutlich
   über Schulter heben und **mindestens 2 Sekunden** halten. Zurück. Hände vor
   dem Torso zusammenführen und **mindestens 2 Sekunden** halten. Zurück. Wenn
   bequem den ganzen Körper bei fester Kamera etwa eine halbe Schulterbreite
   seitlich versetzen und **mindestens 2 Sekunden** halten. Eine Torso-Neigung
   und verschränkte Arme sind zusätzlich beobachtbar. Alle Pose-Regeln nutzen
   dieselbe 2-s-Haltezeit. „Pose debug“ zeigt die Werte bei Problemen. Keine
   ruckartigen oder unangenehmen Bewegungen.
5. **Finish & review** → Beobachtung anklicken → Aufnahme an dieser Stelle ansehen.
   Eine sinnvolle Reflexionsfrage stellen: „Hat diese Bewegung deinen Punkt
   unterstützt?“ Optional Rohdaten oder Gesten-Evidenz herunterladen.
6. Für Sprache/Fragen entweder **Try sample demo** als ausdrücklich vorbereitetes
   Szenario zeigen oder den echten lokalen Quellenpfad unten nutzen.

## Echte lokale Sprache und Fragen (optional, etwa 2 weitere Minuten)

Gemini-Key in `.env` setzen, Backend/Worker neu starten und den Smoke ausführen:
[Einrichtung und Grenzen](06-local-coaching.md). Unter `/sources` eine TXT-Datei
mit erfundenem Inhalt hochladen: „Synthetische Beispieldaten: Das Lernlabor hat
zwanzig Plätze. Es öffnet um neun Uhr.“ Auf **Ready** warten.

Unter `/live` ist Live-Feedback mit vollständiger Backend-Analyse immer aktiv.
Mikro und Kamera einschalten, normal sprechen und neutral stehen. Als synthetischen
Vortrag z. B. sagen: „Das Lernlabor hat zwanzig Plätze. Es öffnet um acht Uhr.
Das Lernlabor hat einen Swimmingpool.“ Nach Stop das echte Whisper-Transkript
prüfen, dann **Check facts**, danach **Start question round**. Zitate ansehen, Zeitknopf ausprobieren
und eine Rückfrage beantworten. Modellfehler offen ansprechen; fehlende Evidenz
ist kein Falschheitsbeweis. Bei Ausfall die vorbereitete Sample-Session zeigen.

Satz für den Pitch: **„In unserem Prototyp wird eine sichtbare Bewegung zu einer
nachvollziehbaren Stelle im Video. Die Person entscheidet im Kontext, was sie
beibehalten oder ändern möchte.“**

## Wenn etwas ausfällt

| Situation | Sichtbares Verhalten / nächste Aktion |
| --- | --- |
| Kamera verweigert, kein Gerät, Modellfehler | Kein erfundenes Feedback. Link **Try synthetic walkthrough** nutzen; Browserberechtigung oder Modell-Assets später prüfen. |
| Schultern/Hüften fehlen | Aufforderung zum Framing. Keine Posebewertung. Weiter zurück, Kamera neu ausrichten. |
| Hände fehlen | Keine Handbeobachtungen. Bei nutzbarem Torso bleibt die Haltung auswertbar. |
| Kalibrierung bleibt stehen | Licht, Abstand und ruhige Haltung prüfen. Hände getrennt neben Taille. Langsames Gerät kann am Zeitkriterium scheitern. |
| Seitwärts-Hinweis erscheint verzögert | Positionsregel wartet bewusst 2 s. „Pose debug“ zeigt zusätzlich Frame-/Modellzeit und Abtastrate. Bei hoher Frame-Zeit andere Browser vergleichen; Safari ist bisher nicht als Ursache belegt. |
| API/Netz fehlt | Lokale Gestenerkennung braucht nach Laden der App/Assets keine Anbieter-API. Synthetischer Rundgang braucht keine Kamera. Kein Service-Worker: erstmaliger Seitenaufruf braucht den App-Server. |
| Backend-Audio schlägt fehl | Aufnahme und bereits vorhandene lokale Gesten bleiben im Review; bei der Stage ist die lokale Sofortaufnahme der Fallback. Fehlermeldung sichtbar. |
| Quellenmodell fehlt / Quellen nicht bereit | Gemini-Key und Modellstatus prüfen, Quelle fertig laden lassen, **Refresh status**. Kein stiller Fallback. |
| Zitat kann nicht geprüft werden | Kein Urteil anzeigen; Passage selbst prüfen. Eine Zahl von Modellurteilen ist keine Genauigkeit. |
| Kamera bewegt / Person wechselt | Aufnahme beenden. Neue Aufnahme mit neuer Kalibrierung. |
| Seite wird neu geladen | Eine laufende Aufnahme geht verloren; abgeschlossene Takes werden aus IndexedDB wiederhergestellt. Während Aufnahme/Analyse warnt der Browser vor dem Verlassen. |

## Vor dem Juryrundgang tatsächlich abhaken

Nicht ausgeführte Checks bleiben **offen**. Automatisierte Tests ersetzen diese
Vor-Ort-Abnahme nicht. Keine echten Juryaufnahmen als Testfixtures einchecken.

| Check | Abnahme | Status |
| --- | --- | --- |
| Pitch Mode / Stage | `/stage` öffnen, Preflight, **Lokale Sofortaufnahme**, 60-s-Take, Review und feste Datenschutzfrage | Production-Build geprüft; realer Kamera-/Mikro-Durchlauf vor Ort wiederholen |
| Lokaler Start ohne Login | Demo-Laptop: `http://localhost:3000`, `/gestures` und `/live` öffnen | Lokale Browser-Tests; am Stand nochmals öffnen |
| Echter Kameraweg auf Demo-Laptop | Hand hoch, Hände zusammen, seitlicher Versatz; zusätzlich Neigung/Arme verschränkt | Nutzer bestätigt beide Handgesten und seitlichen Versatz. Mindestdauer ist auf 2 s vereinheitlicht; neue Geschwindigkeit, Neigung und Arme verschränkt noch real prüfen |
| Hand-/Körperframing | Hinweise bei verdeckten Händen, fehlenden Hüften und Verlassen des Bildes | Offen – vor Ort ausführen |
| Reale Zeitzuordnung | Marker führt zur tatsächlich gezeigten Bewegung, einschließlich Anfang/Ende der Aufnahme | Offen – vor Ort ausführen |
| Safari/iPhone (optional) | Berechtigung, Modell, MP4-Aufnahme, Stop, Replay und Download | Nicht qualifiziert; für die lokale Laptop-Demo nicht vorausgesetzt |
| Lokale Dienste / Assets | App, Modell-Assets und optional Compose-Audio-Backend vor Start laden | Lokal prüfen; keine öffentliche URL benötigt |
| Lokale KI | Whisper, Quellenvergleich, Frage und Antwort auf synthetischen Daten | Reale lokale Modelle und Desktop-/Mobile-Viewport-Flows geprüft; Nutzer bestätigt Mikrofon/Transkript funktioniert, langsam, für diesen Stand akzeptiert |
| Lokaler Fallback | `/gestures` und vorbereitete Sprach-/Frage-Session vorher öffnen | Automatisiert prüfen; am Stand wiederholen |
| Einwilligung | Vor Aufnahme erklären: Live-Audio und Aufnahme-Upload ans Backend, Speicherung, Download/Verlassen | UI-Hinweise vorhanden; Team erklärt vor Ort |

## Ergebnisprotokoll für echte Kamera (auszufüllen)

Pro Gerät/Browser, Beleuchtung und Sitz-/Stehposition notieren. Keine Namen
nötig; freiwillige Teilnahme. Pro Bewegung mehrere Durchläufe, dazwischen
Neutralstellung und Cooldown. Nicht nur die besten Versuche behalten.
Der bisherige informelle Nutzerbericht ist oben erfasst; die Tabelle erfordert
gezählte Versuche und dokumentierte Bedingungen, die noch nicht vorliegen.

| Gerät / Browser / Licht / Position | Beobachtung | Versuche | richtig erkannt | falscher Typ / Fehlalarm | nicht erkannt | Framing nicht beurteilbar | Verzögerung / Zeitversatz | Bemerkung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Noch nicht durchgeführt | Hand hoch | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Hände zusammen | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Seitliche Änderung | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Neutral / kurze normale Bewegung | — | — | — | — | — | — | |

## Abgrenzung zur Zielarchitektur

Der Kamerapfad erzeugt lokale Gesten-/Haltungsereignisse und spielt das komplette
Video im Browser ab; Server-Clips sind nicht vorgesehen. Audioanalyse,
lokale Whisper-Transkription, Quellen-Ingest/Hybrid-Retrieval und
Gemini-Quellenvergleich sind im Web angebunden. Der normale Web-Dialog nutzt
ElevenLabs; getippte und einzeln aufgenommene Antworten bleiben über die
separate Fragen-API verfügbar. Die Stage nutzt ihre feste Datenschutzfrage.
Optionale Whisper-Captions sind eine Textvorschau; finale Deepgram-Live-Wörter
werden ohne zweite ASR übernommen. Deepgram bleibt Opt-in.
Web-Fetch ist standardmäßig aus, Blickkontakt wird nicht gemessen. Die native
App ist entfernt. Neue Web-Aufnahmen sind noch nicht mit den persistenten
Backend-Takes und Progress-Profilen verknüpft.
Die bestehende Sample-Session zeigt den angestrebten Gesamtfluss mit vorbereiteten
Daten. Das Team darf sie nicht als Analyse der Live-Aufnahme vorstellen.

## Analyse-Schalter

Unter **Admin → Analysis features** öffnen. VIDEO und Lite sind
Standard. IMAGE verarbeitet Frames unabhängig; VIDEO nutzt Tracking und
zeitliche Modell-Glättung. Heavy ist auswählbar, sein Qualitätsvorteil ist
nicht gemessen. Alle Assets sind lokal. GPU wird bevorzugt, CPU-Fallback
ändert weder Modell noch Modus. **Camera diagnostics** zeigt die tatsächliche
Konfiguration und Fallback-Gründe.

**Speech feedback** schaltet alle Sprachmarker; **Pauses**, **Speaking pace**,
**Filler words**, **Volume**, **Pitch variation** wählen einzelne Typen.
Das normale Studio verwendet Live-Feedback und vollständige Backend-Analyse,
ohne Modus-Auswahl; die lokale Stage-Aufnahme lädt keine Medien hoch:
Mikrofon-Audio geht live an den Server, die vollständige Aufnahme nach dem Stoppen.
Backend vor der Aufnahme starten; 3 s normal sprechen, dann Lautstärke,
längere Pause oder Tonhöhenvariation testen.
Füllwörter/Wort-Tempo benötigen weiterhin die Analyse nach dem Stoppen.
Abschalten eines Feedbacktyps
entfernt dessen Marker, nicht die Messwerte der vollständigen Analyse. Importierte Wort-Timestamps
beachten dieselben Schalter der jeweiligen Aufnahme. Pose-/Fact-Check- und
Frage-Ergebnisse bleiben unabhängig davon.

Analyse-Schalter bleiben pro Browser in `localStorage`, gelten für neue
Aufnahmen und werden mit dem Take festgehalten. Live-Regeln können unter
Admin zusätzlich sofort auf On / Review only / Off gesetzt werden.
Modell-/Modus-Wechsel starten Pose und Kalibrierung neu. Die Pose-lab-Regeln
laufen mit; das Diagnosepanel ist ein separates Dev-Werkzeug. **Track fingers** ist unabhängig davon
standardmäßig an: bis 5 Hz, auch ohne Torso. Finger werden pink eingezeichnet;
„Hands detected“ und der Live-Sprachstatus helfen bei der Diagnose. Die Haltungsreferenz
kalibriert ohne Hand-Stillhaltepflicht. Im Nutzertest funktionierte die Korrektur;
dies ist eine informelle Rückmeldung ohne gezählte Versuche oder Genauigkeitsmessung.
Sechs zusätzliche Pose-lab-Regeln erzeugen nach 2 s Halten Live-Hinweise und
Review-Events (5 s Cooldown). Kalibrierte Hinweise haben Vorrang. Die
Kopforientierung bleibt ein Proxy, keine Blickkontaktmessung.

Vor Ort weiter offen: echtes GPU-Verhalten, Heavy-Durchsatz unter Kamera-/Audio-
Last, Verzögerung durch VIDEO-Glättung und Erkennungsqualität. Automatisierte
Tests mit synthetischen Bildern belegen Start und Datenfluss, keine Genauigkeit.

## Deep Research (24.10.2026)

- **Gemini statt Ollama:** Der Quellenvergleich braucht jetzt einen
  `GEMINI_API_KEY` in `.env`; es gibt keinen stillen lokalen Fallback. Der
  schwache Testpfad (`gemini-3.1-flash-lite`) lief mit 3,4 / 2,1 / 1,7 s; der
  finale Writer braucht `gemini-3.8-flash`, sonst greift sichtbar die
  Template-Review.
- **Datenschutz:** Gemini ist Cloud ohne EU-Region-Pinning. Für die Jury nur
  synthetische Inhalte verwenden; keine echten Personenaufnahmen an das LLM
  senden.
- **Fragegrenzen:** Der Browser beendet den ElevenLabs-Dialog nach 600 s
  ab Start oder 12 Nutzerbeiträgen. Inhaltliche Frage-/Nachfragegrenzen sind
  weiterhin Prompt-Vorgaben; Anbieter-Limits müssen separat geprüft werden.
  Die Stage fragt genau eine feste Datenschutzfrage ohne Nachfrage; der
  Kontext kommt aus `backend/app/questions/pitch.py`.
- **Scores:** Der Live-Review zeigt drei `evidence-share-v1`-Kriterien
  (Gestik, Fachwissen, Flow); ohne Evidenz bleibt das jeweilige Kriterium „–“.
  Die Auswertung nach der Fragerunde (`evidence-count-heuristic.v1`) ist ein
  getrenntes System und wird auf der Stage nicht angezeigt.
- **Was die Demo nicht verspricht:** keine Genauigkeits-, Latenz- oder
  Lernwirksamkeitsgarantie; keine Noten oder Personenbewertung.

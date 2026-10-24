# Jury-Rundgang und Abnahme

Stand: 24.10.2026. Ziel: selbstständig verständlicher Prototyp in unter 3 Minuten.
Die App-Texte sind Englisch; diese Anleitung ist für das Team.
**Nutzerentscheidung: lokal reicht.** Keine öffentliche Bereitstellung nötig;
die Jury nutzt den vorbereiteten Demo-Laptop unter `http://localhost:3000`.
Start: `docker compose up --build -d --wait` (siehe Root-README). Für reine
Gesten-/Sample-Demo reicht alternativ Node.js 22.12+: `npm ci`, `npm run dev`.

## Ablauf am Stand (ca. 2 Minuten)

1. Startseite öffnen, **See gestures in 22 seconds** wählen, dann **Play
   22-second example**. Sichtbares Label: synthetisch, keine Kamera. Die drei
   Bewegungen durchlaufen dieselben Regeln wie im Live-Pfad. Danach verschwindet
   die Person: „Evaluation paused“ statt erfundener Bewertung.
2. Bei einer Beobachtung **How was this observed?** öffnen. Erklären: Das Modell
   liefert Punkte; unser Code prüft Sichtbarkeit, Neutralstellung, Geometrie und
   Dauer. Kein Score und keine Interpretation von Emotion oder Blickkontakt.
3. **Try with your camera** → Kamera erlauben. Eine Person, ruhiger Hintergrund,
   Licht von vorn, Kamera fest und möglichst gerade. Schultern, Hüften, Ellbogen
   und Hände im Bild. Sitzen ist möglich. Drei Sekunden ruhig halten, Hände
   getrennt neben der Taille. „Ready“ abwarten; bei Bedarf neu kalibrieren.
4. **Record with gesture feedback** → erneut 3 Sekunden neutral. Hand deutlich
   über Schulter heben und etwa 1 Sekunde halten. Zurück. Hände vor dem Torso
   zusammenführen und etwa 2 Sekunden halten. Zurück. Wenn bequem den ganzen Körper
   bei fester Kamera etwa eine halbe Schulterbreite seitlich versetzen und etwa
   1 Sekunde halten. Eine Torso-Neigung und verschränkte Arme sind zusätzlich
   beobachtbar. „Pose debug“ zeigt die Werte bei Problemen. Keine ruckartigen oder unangenehmen Bewegungen.
5. **Finish & review** → Beobachtung anklicken → Aufnahme an dieser Stelle ansehen.
   Eine sinnvolle Reflexionsfrage stellen: „Hat diese Bewegung deinen Punkt
   unterstützt?“ Optional Rohdaten oder Gesten-Evidenz herunterladen.
6. Für Sprache/Fragen entweder **Try sample demo** als ausdrücklich vorbereitetes
   Szenario zeigen oder den echten lokalen Quellenpfad unten nutzen.

## Echte lokale Sprache und Fragen (optional, etwa 2 weitere Minuten)

Ollama vorab starten, Modell laden und Smoke ausführen:
[lokale KI einrichten](06-local-coaching.md). Unter `/sources` eine TXT-Datei
mit erfundenem Inhalt hochladen: „Synthetische Beispieldaten: Das Lernlabor hat
zwanzig Plätze. Es öffnet um neun Uhr.“ Auf **Ready** warten.

Unter `/live` **Local server · speech analysis and transcript** wählen. Mikro
und Kamera einschalten, normal sprechen und neutral stehen. Als synthetischen
Vortrag z. B. sagen: „Das Lernlabor hat zwanzig Plätze. Es öffnet um acht Uhr.
Das Lernlabor hat einen Swimmingpool.“ Nach Stop das echte Whisper-Transkript
prüfen, dann **Compare with my sources**. Zitate ansehen, **Replay** ausprobieren
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
| Seitwärts-Hinweis erscheint verzögert | Positionsregel wartet bewusst 0,8 s. „Pose debug“ zeigt zusätzlich Frame-/Modellzeit und Abtastrate. Bei hoher Frame-Zeit andere Browser vergleichen; Safari ist bisher nicht als Ursache belegt. |
| API/Netz fehlt | Lokale Gestenerkennung braucht nach Laden der App/Assets keine Anbieter-API. Synthetischer Rundgang braucht keine Kamera. Kein Service-Worker: erstmaliger Seitenaufruf braucht den App-Server. |
| Backend-Audio schlägt fehl | Aufnahme und bereits vorhandene lokale Gesten bleiben im Review; Fehlermeldung sichtbar. |
| Quellenmodell fehlt / Quellen nicht bereit | Ollama und Modellstatus prüfen, Quelle fertig laden lassen, **Refresh status**. Kein Cloud-Fallback. |
| Zitat kann nicht geprüft werden | Kein Urteil anzeigen; Passage selbst prüfen. Eine Zahl von Modellurteilen ist keine Genauigkeit. |
| Kamera bewegt / Person wechselt | Aufnahme beenden. Neue Aufnahme mit neuer Kalibrierung. |
| Seite wird neu geladen | Lokales Video ist weg. Vorher downloaden; neuen Versuch starten. |

## Vor dem Juryrundgang tatsächlich abhaken

Nicht ausgeführte Checks bleiben **offen**. Automatisierte Tests ersetzen diese
Vor-Ort-Abnahme nicht. Keine echten Juryaufnahmen als Testfixtures einchecken.

| Check | Abnahme | Status |
| --- | --- | --- |
| Lokaler Start ohne Login | Demo-Laptop: `http://localhost:3000`, `/gestures` und `/live` öffnen | Lokale Browser-Tests; am Stand nochmals öffnen |
| Echter Kameraweg auf Demo-Laptop | Hand hoch, Hände zusammen, seitlicher Versatz; zusätzlich Neigung/Arme verschränkt | Nutzer bestätigt beide Handgesten und seitlichen Versatz. Mindestdauer danach auf 0,8 s reduziert; neue Geschwindigkeit, Neigung und Arme verschränkt noch real prüfen |
| Hand-/Körperframing | Hinweise bei verdeckten Händen, fehlenden Hüften und Verlassen des Bildes | Offen – vor Ort ausführen |
| Reale Zeitzuordnung | Marker führt zur tatsächlich gezeigten Bewegung, einschließlich Anfang/Ende der Aufnahme | Offen – vor Ort ausführen |
| Safari/iPhone (optional) | Berechtigung, Modell, MP4-Aufnahme, Stop, Replay und Download | Nicht qualifiziert; für die lokale Laptop-Demo nicht vorausgesetzt |
| Lokale Dienste / Assets | App, Modell-Assets und optional Compose-Audio-Backend vor Start laden | Lokal prüfen; keine öffentliche URL benötigt |
| Lokale KI | Whisper, Quellenvergleich, Frage und Antwort auf synthetischen Daten | Reale lokale Modelle und Desktop-/Mobile-Viewport-Flows geprüft; echtes Mikrofon vor Ort prüfen |
| Lokaler Fallback | `/gestures` und vorbereitete Sprach-/Frage-Session vorher öffnen | Automatisiert prüfen; am Stand wiederholen |
| Einwilligung | Vor Aufnahme erklären: lokal oder optional Backend-Audio-Upload, Speicherung, Download/Verlassen | UI-Hinweise vorhanden; Team erklärt vor Ort |

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
Video im Browser ab. Er erstellt noch keine dauerhaft gespeicherten Server-Clips.
Audioanalyse, lokale Whisper-Transkription, Quellen-Ingest/Hybrid-Retrieval,
Ollama-Quellenvergleich und Text-Frage-/Antwortanalyse sind im Web angebunden.
Web-Fetch, Live-Transkript, Blickkontakt-Auswertung und dauerhafte Server-Clips
sind nicht Teil des aktuellen vorführbaren Pfads. Die native App behält ihren
bisherigen Funktionsumfang; die neue lokale Fragerunde ist im Web verfügbar.
Die bestehende Sample-Session zeigt den angestrebten Gesamtfluss mit vorbereiteten
Daten. Das Team darf sie nicht als Analyse der Live-Aufnahme vorstellen.

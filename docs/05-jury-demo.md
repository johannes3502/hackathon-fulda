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
   zusammenführen und etwa 2 Sekunden halten. Zurück. Wenn bequem seitlich lehnen
   und etwa 2 Sekunden halten. Keine ruckartigen oder unangenehmen Bewegungen.
5. **Finish & review** → Beobachtung anklicken → Aufnahme an dieser Stelle ansehen.
   Eine sinnvolle Reflexionsfrage stellen: „Hat diese Bewegung deinen Punkt
   unterstützt?“ Optional Rohdaten oder Gesten-Evidenz herunterladen.
6. Für Sprache/Fragen auf der Startseite **Try sample demo** öffnen. Dieser
   vorbereitete Ablauf bleibt ausdrücklich ein Szenario; er analysiert keine
   gerade gemachte Live-Aufnahme.

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
| API/Netz fehlt | Lokale Gestenerkennung braucht nach Laden der App/Assets keine Anbieter-API. Synthetischer Rundgang braucht keine Kamera. Kein Service-Worker: erstmaliger Seitenaufruf braucht den App-Server. |
| Backend-Audio schlägt fehl | Aufnahme und bereits vorhandene lokale Gesten bleiben im Review; Fehlermeldung sichtbar. |
| Kamera bewegt / Person wechselt | Aufnahme beenden. Neue Aufnahme mit neuer Kalibrierung. |
| Seite wird neu geladen | Lokales Video ist weg. Vorher downloaden; neuen Versuch starten. |

## Vor dem Juryrundgang tatsächlich abhaken

Nicht ausgeführte Checks bleiben **offen**. Automatisierte Tests ersetzen diese
Vor-Ort-Abnahme nicht. Keine echten Juryaufnahmen als Testfixtures einchecken.

| Check | Abnahme | Status |
| --- | --- | --- |
| Lokaler Start ohne Login | Demo-Laptop: `http://localhost:3000`, `/gestures` und `/live` öffnen | Lokale Browser-Tests; am Stand nochmals öffnen |
| Echter Kameraweg auf Demo-Laptop | Drei Bewegungen wiederholt sichtbar erkannt, neutrale Ruhe ohne Event | Offen – vor Ort ausführen |
| Hand-/Körperframing | Hinweise bei verdeckten Händen, fehlenden Hüften und Verlassen des Bildes | Offen – vor Ort ausführen |
| Reale Zeitzuordnung | Marker führt zur tatsächlich gezeigten Bewegung, einschließlich Anfang/Ende der Aufnahme | Offen – vor Ort ausführen |
| Safari/iPhone (optional) | Berechtigung, Modell, MP4-Aufnahme, Stop, Replay und Download | Nicht qualifiziert; für die lokale Laptop-Demo nicht vorausgesetzt |
| Lokale Dienste / Assets | App, Modell-Assets und optional Compose-Audio-Backend vor Start laden | Lokal prüfen; keine öffentliche URL benötigt |
| Lokaler Fallback | `/gestures` und vorbereitete Sprach-/Frage-Session vorher öffnen | Automatisiert prüfen; am Stand wiederholen |
| Einwilligung | Vor Aufnahme erklären: lokal oder optional Backend-Audio-Upload, Speicherung, Download/Verlassen | UI-Hinweise vorhanden; Team erklärt vor Ort |

## Ergebnisprotokoll für echte Kamera (auszufüllen)

Pro Gerät/Browser, Beleuchtung und Sitz-/Stehposition notieren. Keine Namen
nötig; freiwillige Teilnahme. Pro Bewegung mehrere Durchläufe, dazwischen
Neutralstellung und Cooldown. Nicht nur die besten Versuche behalten.

| Gerät / Browser / Licht / Position | Beobachtung | Versuche | richtig erkannt | falscher Typ / Fehlalarm | nicht erkannt | Framing nicht beurteilbar | Verzögerung / Zeitversatz | Bemerkung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Noch nicht durchgeführt | Hand hoch | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Hände zusammen | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Seitliche Änderung | — | — | — | — | — | — | |
| Noch nicht durchgeführt | Neutral / kurze normale Bewegung | — | — | — | — | — | — | |

## Abgrenzung zur Zielarchitektur

Der Kamerapfad erzeugt lokale Gesten-/Haltungsereignisse und spielt das komplette
Video im Browser ab. Er erstellt noch keine dauerhaft gespeicherten Server-Clips.
Audioanalyse ist angebunden; automatische ASR-Auswahl im UI, Quellen-Ingest/RAG,
Web-Fetch und echte Frage-/Antwortanalyse sind noch separat zu integrieren.
Die bestehende Sample-Session zeigt den angestrebten Gesamtfluss mit vorbereiteten
Daten. Das Team darf sie nicht als Analyse der Live-Aufnahme vorstellen.

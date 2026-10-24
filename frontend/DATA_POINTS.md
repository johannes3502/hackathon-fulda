# Pose-Datenpunkte — MVP

> **Analyse-Anforderungen:** Dieses Dokument beschreibt das Roh-Logging.
> Die finalen Pose-, Event- und Feedback-Anforderungen stehen in
> `docs/04-pose-tracking-requirements.md`. Bei Konflikt gilt
> `docs/04-pose-tracking-requirements.md`.

Ziel: Kamera starten, Pose-Landmarks pro Sample erfassen und als JSONL loggen.
Dieses Dokument beschreibt das Roh-Logging; die Analyse-Regeln stehen in
`docs/04-pose-tracking-requirements.md`. Kein Backend, kein Face-Mesh, keine
Iris/Pupille, keine Finger im JSONL-Log.

## Modell

**MediaPipe Pose Landmarker** (33 Punkte) für das Logging.

**MediaPipe Hand Landmarker** (21 Punkte pro Hand) läuft zusätzlich live im
selben Worker, ca. 5 Hz und mit Confidence 0,3, nur für den Dev-Pocket-Check.
Seine Landmarks werden nicht geloggt und nicht an das Backend geschickt; im
Pose-Lab-Overlay erscheinen sie als pinke Punkte und Linien.

- Augen kommen aus den Pose-Punkten.
- Kopfwinkel kommen aus Nase, Augen und Ohren.
- Hände werden im Log nur als Handgelenk aus Pose erfasst.
- Keine Finger im Log, keine Iris, keine Pupille.

## Koordinaten

| Feld | Bedeutung |
|---|---|
| `x`, `y` | normiert auf `[0,1]`, relativ zum Kamerabild |
| `z` | Tiefe relativ zum Modell-Ursprung, nicht metrisch |
| `visibility` / `presence` | nur bei Pose verfügbar |
| `t_ms` | Millisekunden seit dem ersten geloggten Sample |

Für Winkel die Pixel- bzw. Weltkoordinaten verwenden, nicht rohe normierte `x/y` ohne Seitenverhältnis.

## Pose-Punkte

Nur diese Indizes werden gebraucht:

| Index | Punkt | Verwendung |
|---:|---|---|
| 0 | Nase | Kopfwinkel, Kopflage |
| 1 | linkes Auge innen | Augen-/Kopforientierung |
| 2 | linkes Auge Mitte | Augen-/Kopforientierung |
| 3 | linkes Auge außen | Augen-/Kopforientierung |
| 4 | rechtes Auge innen | Augen-/Kopforientierung |
| 5 | rechtes Auge Mitte | Augen-/Kopforientierung |
| 6 | rechtes Auge außen | Augen-/Kopforientierung |
| 7 | linkes Ohr | Kopfwinkel |
| 8 | rechtes Ohr | Kopfwinkel |
| 11 | linke Schulter | Schulterlinie, Torso, Arme |
| 12 | rechte Schulter | Schulterlinie, Torso, Arme |
| 13 | linker Ellbogen | Ellbogenwinkel |
| 14 | rechter Ellbogen | Ellbogenwinkel |
| 15 | linkes Handgelenk | Armposition |
| 16 | rechtes Handgelenk | Armposition |
| 23 | linke Hüfte | Torso-Achse, Sway |
| 24 | rechte Hüfte | Torso-Achse, Sway |
| 25 | linkes Knie | Beine, später überkreuzte Beine |
| 26 | rechtes Knie | Beine, später überkreuzte Beine |
| 27 | linker Knöchel | Beine, später überkreuzte Beine |
| 28 | rechter Knöchel | Beine, später überkreuzte Beine |

Beine (25–28) nur loggen, wenn sie tatsächlich sichtbar sind.  
Nicht nötig: 9–10 (Mund), 17–22 (grobe Handpunkte), 29–32 (Füße).

## Augen und Kopf

Es werden nur die Augenpunkte 1–6 geloggt. Keine Pupille, keine Iris, kein Gaze.

| Feld | Einheit | Bedeutung |
|---|---|---|
| `eyes_forward` | boolean | beide Augen sichtbar und Gesicht grob frontal |
| `head_pitch_deg` | Grad | nicken |
| `head_roll_deg` | Grad | Kopf seitlich kippen |

**Yaw wird nicht berechnet.** „Forward“ wird ausschließlich aus den Augenpunkten und ihrer Sichtbarkeit/Symmetrie abgeleitet, nicht aus einem Yaw-Winkel.

Das ist eine Heuristik aus Pose-Punkten, keine kalibrierte Face-Matrix.

## Abgeleitete Werte

Diese Werte werden aus den geloggten Punkten berechnet, nicht zusätzlich getrackt:

| Feld | Bezug |
|---|---|
| `shoulder_tilt_deg` | Winkel der Schulterlinie |
| `torso_lean_deg` | Schultermitte → Hüftmitte |
| `left_elbow_deg`, `right_elbow_deg` | Schulter → Ellbogen → Handgelenk |
| `left_arm_open_deg`, `right_arm_open_deg` | Torso-Achse ↔ Oberarm |
| `left_wrist_height`, `right_wrist_height` | relativ zur Schulterbreite |
| `left_wrist_cross`, `right_wrist_cross` | Handgelenk entlang der Schulterlinie, ab Körpermitte, in Schulterbreiten; positiv = über die Mitte auf die Gegenseite |
| `left_forearm_deg`, `right_forearm_deg` | Unterarm ↔ Schulterlinie, 0–90°, 0 = parallel |
| `legs_visible` | Knie und Knöchel ausreichend sichtbar |

## Log-Schema

Ein JSON-Objekt pro Sample, JSONL:

```json
{
  "t_ms": 1234,
  "pose": {
    "nose": [0.51, 0.22, -0.08, 0.99, 0.99],
    "left_eye_inner": [0.47, 0.19, -0.06, 0.98, 0.99],
    "right_eye_inner": [0.55, 0.19, -0.06, 0.98, 0.99],
    "left_shoulder": [0.38, 0.48, 0.02, 0.98, 0.99],
    "right_shoulder": [0.63, 0.47, 0.01, 0.98, 0.99],
    "left_hip": [0.41, 0.72, 0.01, 0.95, 0.98],
    "right_hip": [0.61, 0.72, 0.01, 0.95, 0.98],
    "left_knee": null,
    "right_knee": null,
    "left_ankle": null,
    "right_ankle": null
  },
  "head": {
    "eyes_forward": true,
    "pitch_deg": 2.1,
    "roll_deg": 0.8
  },
  "quality": {
    "pose_present": true,
    "legs_visible": false
  }
}
```

Regeln:

- Nur Samples loggen, wenn `pose_present` true ist.
- Nicht sichtbare Beine als `null` loggen, nicht interpolieren.
- Keine Glättung im Roh-Log; Glättung erst bei der Auswertung.
- `t_ms` relativ zum ersten Pose-Sample; bei Aufnahme später an `MediaRecorder.onstart` ausrichten.

## Nicht im MVP

- vollständiges 478-Punkte-Face-Mesh
- Iris, Pupille, Gaze-Richtung
- Yaw-Winkel
- Hand- und Finger-Landmarks im JSONL-Log (live-only für den Dev-Pocket-Check)
- Emotionen, Persönlichkeit, Scores
- Segmentierungsmaske
- Fußanalyse

## Pocket-Check (Dev, live-only)

Der Pose Lab im `/live`-Workspace nutzt den Hand Landmarker für eine
Heuristik „Hand in pocket“. Verwendet werden Handgelenk (0) und die
Fingerspitzen (8, 12, 16, 20); die Landmarks bleiben im Browser und
erscheinen nicht im JSONL.

- Handgelenk in der Hüftzone, Ellbogen ≤ 120° (Arm nicht locker gerade)
  und die Fingerspitzen bleiben komprimiert: maximale Wrist→Tip-Distanz
  ≤ 0,24 Schulterbreiten → `fingers`.
- Pose-Handgelenk in der Hüftzone, Ellbogen ≤ 120° und keine erkannte
  Hand innerhalb von 0,35 Schulterbreiten → `hidden` (Proxy für eine
  vollständig verdeckte Hand).
- Eine locker hängende, offene Hand (max. Reach > 0,24) zählt nicht.
- Ein gerader Arm an der Hüfte (Ellbogen > 120°) zählt nicht als Tasche.
- Im Pose-Lab-Overlay werden alle 21 Hand-Landmarks pink gezeichnet; das
  hilft beim Prüfen, ob das Hand-Modell die Hand überhaupt sieht.
- Keine Sicherheit, kein Event, kein Backend-Payload.

## Crossed legs (Dev, live-only)

`crossedLegsCheck` prüft, ob sich die Unterschenkel schneiden: linkes Knie →
linker Knöchel und rechtes Knie → rechter Knöchel. Knie und Knöchel müssen
sichtbar sein; sonst ist das Ergebnis `null` (grau). Kein Event, keine Aussage
über Sitzhaltung.

## Implementierter Frontend-Vertrag (24.10.2026)

In `/live`: Kamera aktivieren → Landmarks und Logging starten automatisch → Kamera
ausschalten → **Download pose JSONL**. Das ist unabhängig vom Feedback-Modus. Pose-Logs werden
nicht an die Audio-API geschickt. Bei einer Aufnahme beginnt ein neuer Log exakt
mit `MediaRecorder.onstart`; vorher gestartete Frames werden verworfen. Den
Preview-Log bei Bedarf durch Ausschalten der Kamera stoppen und herunterladen. Der Aufnahme-Log steht
auch im Review zum Download bereit. Gestoppte Preview-Logs werden nicht als
Aufnahme-Logs ausgegeben.

- Ein Worker verarbeitet höchstens einen Frame gleichzeitig, maximal 10 Hz.
  Kein Nachholen oder Interpolieren ausgelassener Frames. Bei 3.000 Samples stoppt
  der Logger mit einem Hinweis, ohne die vorhandenen Samples zu überschreiben.
  Das Live-Overlay läuft weiter; der Aufnahmestart setzt den Log zurück.
- Das gespiegelte Overlay folgt dem Video-Ausschnitt in Standard- und Großansicht.
  Punkte außerhalb des Bildes oder unter der bestehenden Konfidenz-Heuristik werden
  nicht gezeichnet. Ohne Pose wird das Overlay entfernt. Es ist nur eine
  Vorschau und wird nicht in die Videodatei eingebrannt.
- MediaPipe Tasks Vision ist im Lockfile gepinnt. Pose Landmarker **Lite**, float16,
  Modellversion 1, wird lokal mitgeliefert. `predev` und `prebuild` kopieren die
  installierten JS-/WASM-Dateien nach `public/pose/runtime` (generiert, gitignored).
  Im Browser sind keine CDN-/Modell-Downloads von Drittanbietern nötig.
- `IMAGE`-Modus pro Frame vermeidet das zeitliche Smoothing des VIDEO-Graphen.
  Keine zusätzliche Glättung im Log. Einziger Live-Hinweis bisher: „Arme
  verschränkt“ (siehe unten); noch keine Pose-Events in Review/Timeline.
- Jeder Log-Eintrag enthält alle 21 Schlüssel aus der Indexliste. Tupel sind
  `[x,y,z,visibility,presence]`; fehlende Konfidenzwerte sind `null`, nicht erfunden.
  Ungültige Koordinaten sind `null`. Für Beine gelten zusätzlich die Sichtbarkeitsregeln.
- `image: {width,height}` ergänzt das Schema für reproduzierbare Pixelgeometrie.
  Alle Werte aus „Abgeleitete Werte“ liegen unter `derived`; `legs_visible` bleibt
  unter `quality`. Fehlende oder degenerierte Geometrie ergibt `null`.
- Die Namen im JSON bleiben `head.pitch_deg`, `head.roll_deg`, `head.eyes_forward`
  wie im Beispiel; nicht zusätzlich `head_pitch_deg` auf oberster Ebene.
- Daten bleiben im Arbeitsspeicher und gehen beim Verlassen/Neuladen verloren.

### Explizite Prototyp-Heuristiken, noch nicht validiert

Implementierung und Konstanten: `src/features/pose/sample.ts`. Modell-Detection
und Presence verwenden 0,5 (MediaPipe-Standard). Ein Punkt gilt für Ableitungen
als nutzbar, wenn er im Bild liegt, `visibility >= 0.5` und, falls geliefert,
`presence >= 0.5` gilt. Die Sichtbarkeit eines Knie-/Knöchelpunkts wird einzeln
geprüft; `legs_visible` ist nur wahr, wenn alle vier nutzbar sind. Diese Grenzwerte
sind technische Prototyp-Konfiguration, keine validierte Genauigkeit.

- Pixelwerte: `X=x*width`, `Y=y*height`, `Z=z*width`. Das z bleibt eine
  Modellschätzung, keine metrische Tiefe. Rohwerte werden nicht geklemmt.
- Schulter-/Kopf-Roll: Linienwinkel im Bild, auf `[-90,90)` gefaltet. Für den Kopf
  werden die Augenmitten 2 und 5 verwendet. Bild-y zeigt nach unten; die Anzeige
  der Kamera kann gespiegelt sein, die geloggten Koordinaten sind es nicht.
- Torso-Lean: Schultermitte → Hüftmitte, `atan2(dx,dy)` relativ zur Bildvertikalen.
- Ellbogen: Innenwinkel Schulter–Ellbogen–Handgelenk in der Bildebene.
- Armöffnung: Winkel Torso-Achse ↔ Schulter–Ellbogen in der Bildebene.
- Handgelenkhöhe: `(Schulter-Y - Handgelenk-Y) / Schulterbreite`, positiv oberhalb
  der eigenen Schulter. Schulterbreite ist der 2D-Abstand beider Schultern.
- Kopf-Pitch: Nase minus Ohrmitte, `atan2(dY,-dZ)`; nur bei nutzbaren Punkten und
  `-dZ > 0`. Das ist eine unkalibrierte Orientierungshilfe, kein anatomisch
  genauer Nickwinkel. Sonst `null`; individuelle Neutralstellung kann abweichen.
- Wrist-Cross: Projektion (Handgelenk − Schultermitte) auf die Achse rechte →
  linke Schulter, geteilt durch die Schulterbreite. Vorzeichen so gewählt, dass
  positiv „auf der Gegenseite“ heißt; unabhängig von Spiegelung und Bildseite.
- Forearm: Winkel Ellbogen → Handgelenk zur Schulterlinie in der Bildebene,
  auf `[0,90]` gefaltet; 0 = parallel zur Schulterlinie.
- `eyes_forward`: Alle Augenpunkte 1–6 müssen nutzbar sein. Die kleinere/größere
  Augenbreite (innerer–äußerer Punkt in X/Y/Z) muss mindestens 0,65 sein und die
  Tiefendifferenz der Augenmitten höchstens 0,35 ihres 2D-Abstands. Kein Yaw und
  keine Nase als Forward-Kriterium. Nicht nutzbare/degenerierte Augen ergeben
  `false`, was **keine** gesicherte Abwendung bedeutet.

### Live-Hinweis „Arme verschränkt“ (Heuristik, nicht validiert)

Implementierung und Konstanten: `src/features/pose/cues.ts` (`CROSS_ARMS`).
Läuft in Vorschau und Aufnahme im Browser; Anzeige nur als Coach-Sprechblase
oben links auf dem Video („Try uncrossing your arms! · Heuristic“). Keine
Speicherung als Event, keine Aussage über Haltung oder Emotion. Der Button
„Pose debug“ zeigt jede Bedingung live mit Wert und Ergebnis.

Pro Sample gilt „verschränkt“, wenn alle Bedingungen erfüllt sind:

- beide `*_wrist_cross >= -0.25` (Handgelenk an, nahe oder über der
  Körpermitte). Bei echter Aufnahme mit verschränkten Armen schätzt MediaPipe
  die verdeckten Handgelenke dort, wo sich die Unterarme treffen, also an der
  Mitte (gemessen: 0,06 / −0,09), nicht auf der Gegenseite,
- beide `*_wrist_height` in `[-1.3, 0.2]` (etwa zwischen Schulter und Hüfte),
- beide `*_elbow_deg <= 120` (Ellbogen gebeugt),
- beide `*_forearm_deg <= 40` (Unterarm etwa parallel zur Schulterlinie;
  schließt aneinandergelegte Hände mit Fingerspitzen nach oben aus).

Fehlt ein Wert (z. B. Handgelenk unter dem anderen Arm verdeckt), ist das
Ergebnis `null`, nicht `false`. Zustandsmaschine pro Episode: Hinweis sofort
bei „verschränkt“ (`holdMs` derzeit 0); Ende nach 0,5 s „nicht verschränkt“
oder 1,5 s ohne Messung; derzeit kein Cooldown (`cooldownMs` 0). Ein Hinweis
pro Episode, keine Wiederholung. Bekannte Grenzen: 2D-Geometrie, gefaltete Hände vor dem Körper
oder ein Presenter in beiden Händen können ähnlich aussehen.

Quellen: [MediaPipe Web Guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js),
[Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

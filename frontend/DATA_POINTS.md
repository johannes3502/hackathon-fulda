# Pose-Datenpunkte — MVP

Ziel: Kamera starten, Pose-Landmarks pro Sample erfassen und als JSONL loggen.  
Keine Bewertung, kein Backend, kein Face-Mesh, keine Iris/Pupille, keine Finger.

## Modell

**MediaPipe Pose Landmarker** (33 Punkte).  
Holistic, Face- und Hand-Tasks sind für diesen MVP nicht nötig:

- Augen kommen aus den Pose-Punkten.
- Kopfwinkel kommen aus Nase, Augen und Ohren.
- Hände werden nur als Handgelenk aus Pose erfasst.
- Keine Finger, keine Iris, keine Pupille.

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
- Hand- und Finger-Landmarks
- Emotionen, Persönlichkeit, Scores
- Segmentierungsmaske
- Fußanalyse

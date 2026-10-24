# Pose-Datenpunkte und Beobachtungen

Kamera starten, Pose-Landmarks pro Sample erfassen und als JSONL loggen.
Darauf laufen kalibrierte Beobachtungsregeln: Hand über Schulter, Hände
zusammen, seitliche Torso-Neigung/Position und verschränkte Arme. Keine Qualitätsbewertung, kein Face-Mesh,
keine Iris/Pupille, keine Finger im Produktions-Log.

Recherche, Formeln, Konfiguration, Unsicherheit und Evaluationsplan:
[Gesten-Evaluation](../docs/04-gesture-evaluation.md).
[Jury-Anleitung](../docs/05-jury-demo.md).

## Modell

**MediaPipe Pose Landmarker** (33 Punkte) für das Logging.

**MediaPipe Hand Landmarker** (21 Punkte pro Hand) läuft zusätzlich live im
selben Worker nur bei aktiviertem **Pose lab**, auf Frames mit erkannter Pose,
mit Confidence 0,5, für die Dev-Checks. Im normalen Aufnahmepfad wird das
Handmodell weder geladen noch ausgeführt. Seine Landmarks werden nicht geloggt und nicht an das
Backend geschickt; im Pose-Lab-Overlay erscheinen sie als pinke Punkte und
Linien.

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
| `left_wrist_hip_dist`, `right_wrist_hip_dist` | Handgelenk ↔ eigene Hüfte, 2D, in Schulterbreiten; das Handgelenk muss nur im Bild liegen |
| `thigh_angle_deg` | spitzer Winkel zwischen den projizierten Oberschenkellinien Hüfte → Knie, 0–90°; 0 = parallel |
| `thighs_crossed` | projizierte Oberschenkel schneiden sich im Bild (plus 10 % Rand); `null`, wenn Hüften oder Knie fehlen |
| `thigh_cross_y` | normierte y-Position des Oberschenkel-Schnittpunkts; `null` ohne Schnittpunkt |
| `thighs_closing` | verlängerte Oberschenkellinien würden sich in Kürze schneiden, die Strecken schneiden sich noch nicht; `null`, wenn die Oberschenkel-Geometrie fehlt |
| `thigh_close_y` | normierte y-Position des vorhergesagten Schnittpunkts; `null` ohne Vorhersage |
| `thigh_close_gap` | Reststrecke vom weiter entfernten Knie zum vorhergesagten Schnittpunkt in mittleren Oberschenkellängen; `null` ohne Vorhersage |
| `left_hand_visibility`, `right_hand_visibility` | höchste Sichtbarkeit von Pinky/Zeigefinger/Daumen (17–22); `null`, wenn ein Punkt außerhalb des Bildes liegt |
| `left_hand_found`, `right_hand_found` | Hand Landmarker hat eine Hand an diesem Handgelenk gefunden; `null` ohne Hand-Modell oder wenn die Hand außerhalb des Bildes liegt |
| `legs_visible` (unter `quality`) | Knie und Knöchel ausreichend sichtbar |
| `thighs_visible` (unter `quality`) | Hüften und Knie ausreichend sichtbar |
| `thighs_available` (unter `quality`) | Oberschenkel-Geometrie auswertbar, ggf. mit geschätzten Knien |
| `thighs_estimated` (unter `quality`) | mindestens ein Knie liegt außerhalb des Bildes oder unter der strengen Sichtbarkeit |
| `hips_visible` (unter `quality`) | beide Hüftpunkte nutzbar |

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
    "hips_visible": true,
    "legs_visible": false,
    "thighs_visible": false,
    "thighs_available": false,
    "thighs_estimated": false
  }
}
```

Regeln:

- Nur Samples loggen, wenn `pose_present` true ist.
- Nicht sichtbare Beine als `null` loggen, nicht interpolieren. Die abgeleitete
  Oberschenkel-Geometrie nutzt zusätzlich vom Modell geschätzte Knie bis 30 %
  außerhalb des Bildes; `thighs_estimated` kennzeichnet das.
- Keine zusätzliche App-Glättung im Log. Im Standardmodus `VIDEO` sind die
  Modell-Ausgaben zeitlich geglättet; `IMAGE` liefert unabhängige Frames.
- `t_ms` in der Vorschau relativ zum ersten Pose-Sample; bei Aufnahme an `MediaRecorder.onstart` ausgerichtet.

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
Heuristik „Hand in pocket“. Die Landmarks bleiben im Browser und erscheinen
nicht im JSONL; geloggt werden nur die abgeleiteten Werte aus der Tabelle
oben (`*_wrist_hip_dist`, `*_hand_found`, `*_hand_visibility`).

Pro Seite gilt „in der Tasche“, wenn

- `*_wrist_hip_dist <= 0.45` (Handgelenk-Schätzung nahe der eigenen Hüfte;
  das Handgelenk muss nur im Bild liegen, nicht sichtbar sein), und
- `*_hand_found == false` (Hand Landmarker findet an diesem Handgelenk keine
  Hand).

Eine gefundene Hand ist nie „in der Tasche“. `null` (unentschieden), wenn das
Hand-Modell nicht läuft, die Hüfte nicht nutzbar ist oder die groben
Pose-Handpunkte außerhalb des Bildes liegen (abgeschnitten, nicht verdeckt).
Gesamt: `true`, sobald eine Seite `true` ist; `false` nur, wenn beide Seiten
entschieden und `false` sind. Bekannte Grenzen: Hände hinter dem Rücken;
sehr kleine Hände (weit von der Kamera) oder Bewegungsunschärfe, bei denen der
Hand Landmarker eine sichtbare Hand übersieht. Keine Sicherheit, kein Event,
kein Backend-Payload.

## Crossed legs (Dev, live-only)

`crossedLegsCheck` prüft zuerst die Oberschenkel: linke Hüfte → linkes Knie
und rechte Hüfte → rechtes Knie. Schneiden sich diese projizierten Strecken
innerhalb des Bildes (mit 10 % Rand), gilt die Pose als erkannt. Dafür dürfen
die Knie bis 30 % außerhalb des Bildes liegen oder eine niedrige Sichtbarkeit
haben; `thighs_estimated` markiert diese Schätzung. Zusätzlich werden – wenn
Knie und Knöchel sichtbar sind – die Unterschenkel geprüft. Ein Treffer in
einem der beiden Paare reicht.

`thighs_closing` warnt bereits vor der eigentlichen Kreuzung: Die verlängerten
Oberschenkellinien müssen sich hinter mindestens einem Knie treffen, der
Schnittpunkt muss unterhalb der Hüftlinie und horizontal im Hüftbereich
(±50 % Hüftbreite) liegen, und die Reststrecke vom weiter entfernten Knie darf
höchstens 0,75 mittlere Oberschenkellängen betragen. Ein Knie darf den
Schnittpunkt bereits überschritten haben; das andere liegt noch davor. So
schlägt T12 an, sobald sich die Beine sichtbar aufeinander zubewegen, ohne
dass die Strecken schon kreuzen. Der Coach sagt dann „Keep your legs apart.“
statt „Uncross your legs.“
Sind weder Oberschenkel noch Unterschenkel auswertbar, ist das Ergebnis `null`
(grau). Kein Event, keine Aussage über Sitzhaltung.

Die Erkennung ist eine 2D-Projektion: Tiefe und Perspektive können die
Oberschenkel kreuzen lassen, obwohl sie es räumlich nicht tun. Deshalb bleibt
sie eine Heuristik ohne Event und ohne Backend-Payload.

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
- MediaPipe Tasks Vision ist im Lockfile gepinnt. Pose Landmarker **Lite und Heavy**, float16,
  Modellversion 1, wird lokal mitgeliefert. `predev` und `prebuild` kopieren die
  installierten JS-/WASM-Dateien nach `public/pose/runtime` (generiert, gitignored).
  Im Browser sind keine CDN-/Modell-Downloads von Drittanbietern nötig.
- Standard ist **VIDEO** (Tracking und zeitliche Modell-Glättung); **IMAGE**
  ist als Feature-Schalter verfügbar. Beide laufen GPU-first mit CPU-Fallback;
  dabei bleiben Modell und Modus erhalten. Im Export gibt `runtime` pro Frame
  `model`, `runningMode` und den tatsächlichen `delegate` an. Keine zusätzliche
  App-Glättung. Modellwechsel und Dev-Modus sind während einer Aufnahme gesperrt.
- Die Produktionsregeln bleiben in `PoseEvaluator`, getrennt vom Pose Lab.
  Arme verschränkt: Wrist-Cross ≥ −0,25, Unterarm ≤ 40°, 2 s Mindestdauer und
  20 s Cooldown. Nahe Hände auf den eigenen Körperseiten bleiben der
  Hände-zusammen-Regel zugeordnet; diese Unterscheidung ist eine Heuristik.
- Jeder Log-Eintrag enthält alle 21 Schlüssel aus der Indexliste. Tupel sind
  `[x,y,z,visibility,presence]`; fehlende Konfidenzwerte sind `null`, nicht erfunden.
  Ungültige Koordinaten sind `null`. Für Beine gelten zusätzlich die Sichtbarkeitsregeln.
- `image: {width,height}` ergänzt das Schema für reproduzierbare Pixelgeometrie.
  Alle Werte aus „Abgeleitete Werte“ liegen unter `derived`; `legs_visible`,
  `thighs_visible`, `thighs_available` und `thighs_estimated` bleiben unter
  `quality`. Fehlende oder degenerierte Geometrie ergibt `null`.
- Die Namen im JSON bleiben `head.pitch_deg`, `head.roll_deg`, `head.eyes_forward`
  wie im Beispiel; nicht zusätzlich `head_pitch_deg` auf oberster Ebene.
- Daten bleiben im Arbeitsspeicher und gehen beim Verlassen/Neuladen verloren.

### Explizite Prototyp-Heuristiken, noch nicht validiert

Implementierung und Konstanten: `src/features/pose/sample.ts`. Modell-Detection
und Presence verwenden 0,5 (MediaPipe-Standard). Ein Punkt gilt für Ableitungen
als nutzbar, wenn er im Bild liegt, `visibility >= 0.5` und, falls geliefert,
`presence >= 0.5` gilt. Die Sichtbarkeit eines Knie-/Knöchelpunkts wird einzeln
geprüft; `legs_visible` ist nur wahr, wenn alle vier nutzbar sind. Für die
Oberschenkel dürfen Knie bis 30 % außerhalb des Bildes liegen; im Bild benötigen
sie mindestens 0,2 Sichtbarkeit. Diese Grenzwerte sind technische
Prototyp-Konfiguration, keine validierte Genauigkeit.

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
- Wrist-Hip-Distance: 2D-Abstand Handgelenk → eigene Hüfte in Pixeln, geteilt
  durch die Schulterbreite. Das Handgelenk muss nur im Bild liegen; seine
  `visibility` darf niedrig sein, weil eine Tasche es verdeckt.
- Thigh-Cross: Schnitt der projizierten Strecken linke Hüfte → linkes Knie und
  rechte Hüfte → rechtes Knie. Der Schnittpunkt muss im Bild (plus 10 % Rand)
  liegen; Endpunkte zählen nicht. `thigh_angle_deg` ist der spitze Winkel
  zwischen beiden Strecken, kein Beweis für eine Kreuzung.
- Thigh-Close: Schnitt derselben verlängerten Linien, bevor sich die Strecken
  schneiden. Der Punkt muss unterhalb der Hüftmitte und innerhalb der
  Hüftbreite ±50 % liegen; mindestens ein Knie muss noch vor dem Punkt liegen,
  und die Reststrecke vom weiter entfernten Knie darf 0,75 mittlere
  Oberschenkellängen nicht überschreiten. `thigh_close_gap` und
  `thigh_close_y` dokumentieren die Vorhersage.
- Hand-Zuordnung: Hand-Punkt 0 (Handgelenk) wird dem näheren Pose-Handgelenk
  (15/16) zugeordnet, höchstens 0,5 Schulterbreiten entfernt; bei zwei Händen
  am selben Handgelenk gewinnt die nähere. `*_hand_found` ist `true`, wenn eine
  Hand zugeordnet wurde; `null` ohne Hand-Modell oder wenn die groben
  Pose-Handpunkte außerhalb des Bildes liegen; sonst `false`.
- `eyes_forward`: Alle Augenpunkte 1–6 müssen nutzbar sein. Die kleinere/größere
  Augenbreite (innerer–äußerer Punkt in X/Y/Z) muss mindestens 0,65 sein und die
  Tiefendifferenz der Augenmitten höchstens 0,35 ihres 2D-Abstands. Kein Yaw und
  keine Nase als Forward-Kriterium. Nicht nutzbare/degenerierte Augen ergeben
  `false`, was **keine** gesicherte Abwendung bedeutet.

### Arme verschränkt und weitere Beobachtungen

Die Geometrie und der optionale Debug-Readout aus der Team-Implementierung sind
erhalten: `cues.ts` (`CROSS_ARMS`) und `PoseDebug.tsx`. Die zeitliche Zustandsmaschine
läuft jetzt gemeinsam mit den anderen Regeln in `PoseEvaluator`. Dadurch gelten
Kalibrierung, Aufnahmestart, Datenlücken und ein einzelner abschaltbarer Hinweis
auch für diese Regel. Beobachtungen erscheinen im Review und Evidenz-Export.
Der frühere separate Chip und seine tolerierte Fortsetzung über verdeckte
Handgelenke wurden durch die gemeinsame Evidenzprüfung ersetzt.

Alle Formeln und Konfigurationen: [Gesten-Evaluation](../docs/04-gesture-evaluation.md).

Quellen: [MediaPipe Web Guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js),
[Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

### Native Integration (iPhone, iPad, Android)

`mobile/` verwendet dieselben Sample-Ableitungen, Sichtbarkeitsfilter,
Skelett-Verbindungen und die Zustandsmaschine für „Arme verschränkt“.
Die native Vorschau zeigt Overlay und Diagnosewerte; nach Ausschalten der Kamera
kann der Preview-Log geteilt werden. Rohkoordinaten bleiben ungespiegelt.

Native Logs kennzeichnen `timebase: preview-start` bzw. `recording-request` und
`alignment: approximate`: Vision Camera liefert hier keinen bestätigten
Startzeitpunkt des ersten codierten Videoframes. Das ist ausdrücklich keine
framegenaue Synchronisierung. Rotation, Spiegelung und Zeitversatz müssen auf
echten Geräten geprüft werden. Pose-Events in der Timeline fehlen weiterhin.

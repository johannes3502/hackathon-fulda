# 04 — Pose-Tracking: finale Anforderungen (MVP)

**Status:** entschieden am 24.10.2026. Gilt für Web-App und native Companion,
sofern nicht anders markiert.
**Grundlage:** Deep Research zu Haltung, Kopforientierung, Händen, Füßen und
Gesten (Quellen am Ende).
**Verhältnis zu `frontend/DATA_POINTS.md`:** Dort steht das Roh-Logging. Dieses
Dokument ist der Vertrag für Analyse, Events, Feedback und Export. Bei Konflikt
gilt dieses Dokument.

---

## 1. Scope

Der Prototyp analysiert ausschließlich **Pose-Landmarks** aus einer frontalen
Kamera. Es gibt keine Gesichts-, Iris-, Emotions- oder Persönlichkeitsanalyse.
Ausgabe sind **Beobachtungen und Episoden**, keine Scores, Noten oder
Kompetenzurteile.

- Standard-Framing: `upper-body` (Schultern und Hüften sichtbar).
- Opt-in: `full-body` (Füße sichtbar, experimentell).
- Zwei Publikumsmodi: `camera` (Aufnahme/Stream) und `room` (Vortrag vor Ort).
- Head-Tracking ist ein **Kopforientierungs-Proxy**, kein Blickkontakt und kein
  Gaze-Tracking.

## 2. Nicht-Ziele

- Keine Iris, Pupille, Gaze-Richtung, kein Face-Mesh, keine Blendshapes.
- Keine Emotion, Persönlichkeit, Confidence, Kompetenz oder Note.
- Keine semantischen Gestentypen (ikonisch, deiktisch, Beat) ohne eigenes
  gelabeltes Modell.
- Keine „Hand in der Tasche“-Behauptung.
- Keine Fußqualität, keine Standbreiten-Note, keine medizinische oder
  ergonomische Diagnose.
- Keine Multi-Personen-Analyse.
- Keine erfundenen Genauigkeiten oder Prozentwerte.

## 3. Begriffe

| Begriff | Bedeutung |
|---|---|
| `tMs` | Millisekunden relativ zum Aufnahmestart (`MediaRecorder.onstart`) |
| `framingMode` | `upper-body` oder `full-body` |
| `audienceMode` | `camera` (Kamera zugewandt) oder `room` (Raumsektoren) |
| `evaluable` | genug gültige Frames und plausible Geometrie für eine Metrik |
| `deviation` | zeitlich anhaltende Abweichung von der Regel, kein Qualitätsurteil |
| `observation` | Fenster-Aggregat ohne Zeitepisode, z. B. Gestenrate |
| `quality` | Framing-/Datenqualitäts-Ereignis, keine Haltungsaussage |
| `evidence` | A (Meta-Analyse/RCT), B (mehrere Studien), C (Einzelstudie/Transfer), none |
| `confidence` | high, medium, low; bezieht sich auf die Messbarkeit, nicht auf die Person |
| `thresholdsStatus` | immer `heuristic-unvalidated` in diesem Prototyp |

## 4. Funktionale Anforderungen

### FR-POSE-01 — Modell und Laufzeit

**MUSS:** MediaPipe Pose Landmarker **Heavy**, float16, lokal, `runningMode:
VIDEO`, GPU bevorzugt, CPU-Fallback. Kein CDN, keine Drittanbieter-Downloads.
Ziel: 15–25 FPS bei 640×480 auf dem Referenz-Laptop; Metriken mit 10 Hz.

**MUSS:** Kein stiller Modellwechsel. Erreicht Heavy die Ziel-FPS nicht, werden
Auflösung/FPS reduziert und Live-Hinweise deaktiviert. Ein Lite-Fallback ist nur
mit `model: "pose_landmarker_lite"` im Event und deaktivierten Live-Hinweisen
erlaubt.

### FR-POSE-02 — Zeitbasis

**MUSS:** `t0` wird an `MediaRecorder.onstart` verankert. Alle Events und
Observationen tragen `startMs`, `peakMs`, `endMs` relativ zu diesem `t0`.
`mediaTimeMs` ist optional und darf fehlen. Keine Frame-Counts als Zeitbasis.

### FR-POSE-03 — Modi und Framing

**MUSS:** `framingMode` und `audienceMode` werden vor der Aufnahme explizit
gesetzt. `audienceMode` hat keinen stillen Default; die Demo verwendet `camera`.

**MUSS:** `full-body` ist opt-in und im UI als experimentell markiert. Im
`upper-body`-Modus werden Füße nicht bewertet.

### FR-POSE-04 — Qualitätsgates

**MUSS:** Fehlende oder unplausible Landmarks führen zu `evaluable=false` und
einem `framing`-/`data-quality`-Event, nicht zu einer Haltungsaussage.

| Metrik | Benötigte Landmarks |
|---|---|
| Rumpf | 11, 12, 23, 24 |
| Schulter | 11, 12 |
| Kopf seitlich | 0, 2, 5, 7, 8 |
| Arme/Hände | 11, 12, 13, 14, 15, 16 |
| Füße | 23–32 |

**MUSS:** `visibility` ist kein Okklusionsbeweis. MediaPipe liefert auch für
verdeckte Gelenke plausible Koordinaten. Zusätzlich `presence`, Geometrie,
Bildrand und ein manuelles „nicht auswertbar“ prüfen.

**MUSS:** Mindest-Framing: Schultern und Hüften im Bild, 10 % Rand, Oberkörper
vollständig. Ohne Hüften ist der Rumpf **nicht** auswertbar.

### FR-POSE-05 — Baseline

**MUSS:** 3–5 s „Ausgangshaltung“ aufnehmen, Median und MAD pro Metrik bilden.
Der Nutzer kann die Baseline überspringen oder neu kalibrieren. Das UI nennt sie
„Ausgangshaltung“, nicht „neutral“ oder „richtig“.

**MUSS:** Baseline-relative Regeln erzeugen ohne gültige Baseline kein Event.

### FR-POSE-06 — Körperhaltung

**MUSS:** Diese Metriken berechnen:

| Metrik | Formel | Referenz |
|---|---|---|
| `trunkLean` | Winkel Hüftmitte → Schultermitte gegen Vertikale, Kamera-Roll korrigiert | Kamera |
| `shoulderTilt` | `atan2(Δy·H, Δx·W)` minus Baseline | Baseline |
| `headLateral` | Winkel Augenlinie (2,5) gegen Schulterlinie (11,12) minus Baseline | Baseline |

**MUSS:** Winkel in Pixelkoordinaten (`x·W`, `y·H`) berechnen, nicht in rohen
normierten Koordinaten.

**MUSS:** Keine Slouch-, Forward-Head-, Kyphose- oder Beckenkippungs-Aussage.
Diese sind aus frontaler 2D-Pose nicht reliabel messbar.

### FR-POSE-07 — Kopforientierung und Publikumsmodus

**MUSS:** `headTurn` als **unitless Proxy** aus Nase, Augen und Ohren berechnen.
Keine Grad-Aussage ohne eigene Kalibrierung. Kein Iris-, Face-Mesh- oder
Gaze-Modell im MVP.

**MUSS:** Sektoren: `center`, `left1`, `right1`, `left2`, `right2`, `off`.
Startwerte für `|headTurn|`: `center ≤ 0.12`, `side ≤ 0.30`, `off > 0.45`;
Hysterese 0.04. Alle Werte sind unvalidiert und werden auf gelabelten Clips
kalibriert.

**MUSS — Modus `camera`:** Metriken `cameraFacingRatio`, `offRatio`,
`returnRate`. Live ist nur „lange weg“ (`off` > 5 s) erlaubt, und nur nach dem
Precision-Gate aus FR-POSE-12. Post-hoc kommen CFR, Off-Ratio und Return-Rate
dazu.

**MUSS — Modus `room`:** Metriken `transitionRate`, `entropy`, `stareShare`.
Kein Live-Scanning-Hinweis. UI-Label: „Raumsektoren, nicht Personen“.
„Audience-Scanning“ darf nicht als validierte Wirkung behauptet werden.

**MUSS:** Die Begriffe „Blickkontakt“, „Eye Contact“ und „Gaze“ sind im UI und
in Events verboten. Erlaubt sind „Kameraorientierung“, „Kopforientierung“ und
„Raumsektoren“.

**SOLL:** `eyes_forward` aus `DATA_POINTS.md` bleibt ein Roh-Logging-Feld und
wird nicht für Events verwendet. Es ist kein Gaze-Signal.

### FR-POSE-08 — Arme und Hände

**MUSS:** `armOpenness`, `handsNearFace` und `handVisibility` berechnen.

**MUSS:** „Hand in der Tasche“ ist **kein** Produktions-Event. Stattdessen
optional `hand-hidden-near-torso` (Severity `info`, nur post-hoc, Confidence
`low`): Handgelenk im Hüftbereich, Hand-Landmarks überwiegend abwesend,
Unterarm grob vertikal, 3 s stabil, Framing gültig. Text: „Hand über 3 s nicht
sichtbar (Hüfthöhe). Das kann eine Tasche, eine Jacke oder eine verdeckte Hand
sein – keine Bewertung.“

**MUSS:** Der Hand Landmarker läuft nur lokal und nur für den Dev-Check
„Hand in pocket“ (FR-POSE-20). Er nutzt Handgelenk und Fingerspitzen
(8/12/16/20) und erzeugt keine Events, Clips oder Backend-Payloads. Eine
vollständig verdeckte Hand sieht er nicht; der `hidden`-Zweig bleibt eine
Sichtbarkeits-Heuristik.

### FR-POSE-09 — Füße und Stand

**MUSS:** Nur im `full-body`-Modus und nur post-hoc. Metriken:
`stanceWidth` (Knöchelabstand / Schulterbreite), `weightShift`
(Hüftmitte relativ zur Knöchelmitte), `swayVelocity` (30-s-Fenster),
`stepCount` (nur anzeigen).

**MUSS:** Keine Qualitätsaussage, keine „gute Standbreite“, kein Live-Hinweis.
Bei < 80 % sichtbaren Füßen oder unplausibler Knie-Hüfte-Knöchel-Geometrie:
`evaluable=false`, UI „nicht auswertbar“.

**MUSS:** Fußwippen, Fersendetail, Belastungsasymmetrie und Schrittzählung
werden nicht als valide Angst- oder Nervositätsmarker verkauft.

### FR-POSE-10 — Gesten

**MUSS:** Pose-only-Gestenmetriken: `gestureRate` (GPM), `gestureAmplitude`
(p50/p90, normiert auf Schulterbreite), `twoHandShare`, `aboveShoulderShare`,
optional `pauseCoupling`, `lrBalance`, `variability`.

**MUSS:** Nur post-hoc, nur deskriptiv, kein Live-Hinweis. Keine semantischen
Gestentypen, kein „mehr ist besser“, keine Populationsnorm.

**MUSS:** Vergleich nur gegen die eigene Baseline (10 s) und eigene
5./95.-Perzentile über 60 s. Mindestens 5 Strokes pro Fenster.

**SOLL:** Hand Landmarker ist für diese Gestenmetriken nicht nötig. Er läuft
im Dev-Modus nur für den Pocket-Check (FR-POSE-20) und ist kein
Produktions-Gestenmodell.

### FR-POSE-11 — Event-Engine

**MUSS:** Zustände `in-range`, `deviation`, `not-evaluable`. Es gibt kein
`good`-Event. `in-range` erscheint nur im Aggregat.

**MUSS:** Hysterese, Mindestdauer, Exit-Dauer, Gap-Bridging und Cooldown gemäß
Abschnitt 7. Live-Events sind `provisional` und werden aktualisiert.

**MUSS:** `startMs` ist der Beginn der anhaltenden Bedingung, rückdatiert um die
Fensterlänge; `peakMs` ist die stärkste Abweichung; `endMs` ist das Ende des
Exit-Dwell.

**MUSS:** Bei < 80 % gültigen Frames oder fehlenden Pflicht-Landmarks:
`not-evaluable`, kein Event, kein Hinweis.

### FR-POSE-12 — Live-Feedback

**MUSS:** Maximal **1** Hinweis gleichzeitig, maximal **3** pro 10 Minuten,
**90 s** globaler Cooldown pro Regel, jederzeit abschaltbar.

**MUSS:** Live nur:
- R1 Rumpf-Seitneigung,
- R7 „lange weg“ im `camera`-Modus, nur nach Precision-Gate,
- R10 Framing.

**MUSS:** Precision-Gate: ≥ 90 % auf dem gelabelten Demo-Set. Das ist ein
Zielwert, kein gemessener Wert. Ohne Gate bleibt R7 post-hoc.

**MUSS:** Keine positiven Live-Hinweise, keine Zahlen, keine Scores, keine
Gamification. Positives Feedback nur im Review.

### FR-POSE-13 — Review

**MUSS:** Timeline über alle Events und Observationen, Klick springt zum
`peakMs`, Clip ±5 s, lokales Video. Jedes Event zeigt Metrik, Baseline, Dauer,
Evidenzgrad, Confidence und „Heuristik, unvalidiert“.

**MUSS:** Kein Gesamtscore, keine Note, kein Ranking, kein „gut/schlecht“.
Aggregate zeigen Episodenzahl, Dauer und nicht auswertbare Zeit.

### FR-POSE-14 — Speicher und Export

**MUSS:** IndexedDB-Stores: `sessions`, `takes` (Video-Blob), `frames`
(gechunkt), `metrics`, `head`, `baselines`, `configs`, `events`, `observations`,
`aggregates`.

**MUSS:** Video bleibt lokal und wird nicht hochgeladen. Der Export enthält
kein Video, keine Roh-Landmarks, keine `frameIds`, keinen `localVideoKey`.

**MUSS:** Export ist nutzerinitiiert und enthält `PoseShareExport` mit
Session-Metadaten, Baseline, Config, Events, Observations und Aggregates.

### FR-POSE-15 — Datenschutz und Einwilligung

**MUSS:** Vor der Kamera eine Einwilligung: „Ich bin einverstanden, dass meine
Kamera im Browser ausgewertet wird, um mir Hinweise zu Haltung, Gestik und
Kopforientierung zu geben. Das Video wird nicht hochgeladen. Landmarks bleiben
auf dem Gerät. Ich kann die Analyse jederzeit beenden.“

**MUSS:** Local-first, Datenminimierung, Löschung durch den Nutzer. Keine
Emotions-, Persönlichkeits- oder Kompetenzinferenz. Keine automatisierte
Entscheidung mit erheblicher Wirkung.

**MUSS:** GDPR Art. 5, 6, 9, 13, 22, 25 und AI Act Art. 5(1)(f)/(g) beachten.
Video und Landmarks können Gesundheits-/Behinderungsdaten offenlegen; deshalb
keine solchen Merkmale inferieren und nur lokale Verarbeitung.

### FR-POSE-16 — Accessibility

**MUSS:** Seated-/Wheelchair-Modus: Unterkörper-Metriken aus, nur Oberkörper.
Per-Metrik-Opt-out. Keine Symmetrie-Strafen. Tremor-, Amputations-,
Schwangerschafts- und Neurodivergenz-freundliche Defaults. Keine
„richtige-Haltung“-Sprache.

**MUSS:** UI mit Captions, Tastatur, Screenreader, nicht nur Farbe. Feedback
als Beobachtung + Situation + optionaler Vorschlag, nie als Eigenschaft der
Person.

### FR-POSE-17 — Evidenz- und Unsicherheitslabel

**MUSS:** Jedes Event und jede Observation trägt `evidence`, `confidence`,
`thresholdsStatus` und bei Kopforientierung `proxy: "head"`. Das UI zeigt
„Heuristik, unvalidiert“ und die Unsicherheit an.

**MUSS:** Keine Genauigkeits-, Prozent- oder „validiert“-Behauptungen ohne
eigene Messung.

### FR-POSE-18 — Performance und Grenzen

**MUSS:** Ein Worker, maximal ein Frame gleichzeitig, keine Interpolation
ausgelassener Frames. Bei Überlast Auflösung/FPS senken, Live deaktivieren,
kein Modellwechsel.

**SOLL:** 10 Minuten Aufnahme ≈ 20–30 MB Frames bei 15 Hz, 40–60 MB bei 30 Hz.
IndexedDB-Quota und WebM-Seekbarkeit prüfen.

### FR-POSE-19 — Dev mode „Pose Lab“

**MUSS:** Im `/live`-Workspace gibt es einen „Pose lab“-Toggle. Bei aktiver
Kamera zeigt er **eine von zwei umschaltbaren Darstellungen** derselben
dominanten Pose, nie eine Liste:

- **Coach:** Cockatoo-Avatar mit Sprechblase, die die Pose anspricht
  (z. B. „Try uncrossing your arms!“). Das ist die Standardansicht.
- **Status:** genau ein großes Statusfeld mit Pose und Messwert, grün bei
  neutraler Haltung (`OK`), rot bei einer erkannten Abweichung, grau ohne
  Auswertung (`—`).

Der Umschalter („Coach view“ / „Status view“) ist nur bei aktivem Pose Lab
sichtbar. Beide Darstellungen zeigen dieselbe Priorität; bei Rot pulsiert
die Anzeige und die Videobühne erhält einen roten Rahmen, damit es aus der
Ferne lesbar ist.

**MUSS:** Bei mehreren erkannten Abweichungen gewinnt die höchste Priorität:
Pocket > Arme verschränkt > Hände verdeckt > Hand im Gesicht > Rumpf-Neigung >
Schultertilt > Beine gekreuzt > Kopflateral > Hände hoch > Kopf weg.

**MUSS:** Im Pose Lab zeichnet das Overlay zusätzlich die Hand-Landmarks
(21 Punkte pro Hand, pink) und zeigt die Zahl erkannter Hände. Das ist
Dev-only und wird nicht geloggt. Jede Testpose liefert `values` (alle
Rohbedingungen) und `failing` (die fehlgeschlagenen Bedingungen); das
Statusfeld und der Console-Trace nennen sie.

**MUSS:** `recognized` erscheint im Dev-Modus sofort (`holdMs` 0); nur der
Release-/Unknown-Grace bleibt. Die Anzeige ist rein lokal, erzeugt keine
Events, keine Scores und keine Backend-Aufrufe.

| ID | Testpose | Erkennung | Anzeige |
|---|---|---|---|
| T01 | Neutral / Baseline | Rumpf ±8°, Schulter ±6°, Kopf ±8°, Arme offen | sofort |
| T02 | Rumpf-Seitneigung | `|trunkLean| ≥ 20°` | sofort |
| T03 | Schultertilt | `|shoulderTilt| ≥ 10°` | sofort |
| T04 | Kopflateral | `|headRoll| ≥ 12°` | sofort |
| T05 | Arme verschränkt | Handgelenke an/nahe der Körpermitte, Unterarm ≤ 40° zur Schulterlinie | sofort |
| T06 | Hand im Gesicht | Hand–Gesicht-Abstand ≤ 0,60 × Schulterbreite | sofort |
| T07 | Kopf weg | `|headTurn| ≥ 0.35` (Proxy) | sofort |
| T08 | Hände über Schulter | beide `wristHeight > 0.20 × Schulterbreite` | sofort |
| T09 | Hüften außerhalb | Schultern sichtbar, `trunkLean` nicht auswertbar | sofort |
| T10 | Hände verdeckt | beide Handgelenkhöhen nicht messbar | sofort |
| T11 | Hand in der Hosentasche | Fingerspitzen komprimiert + Ellbogen ≤ 120° (FR-POSE-20) | sofort |
| T12 | Beine gekreuzt | Unterschenkel schneiden sich (Knie + Knöchel sichtbar) | sofort |

**MUSS:** T10 ist ein **Sichtbarkeitstest**, kein Taschenbeweis. T07 ist ein
**Kopforientierungs-Proxy**, kein Gaze. T11 ist eine Heuristik, kein Beweis
für eine Hosentasche. T12 erkennt nur gekreuzte Unterschenkel, wenn Knie und
Knöchel im Bild sind; es ist keine Aussage über Sitzhaltung. Die UI muss das
so benennen.

**MUSS:** Der Dev mode ist nicht die Produkt-UI. Er dient nur zum Testen der
Heuristiken und wird nicht als Event, Clip oder Backend-Payload gespeichert.

### FR-POSE-20 — Pocket-Check (Dev-Heuristik)

**MUSS:** Der MediaPipe Hand Landmarker läuft lokal im selben Worker wie Pose
(CPU, `IMAGE`, max. 2 Hände, 21 Landmarks pro Hand, Confidence 0,3). Er läuft
ca. 5 Hz, unabhängig von der Pose-Handgelenk-Position, damit eine Hand in der
Tasche auch bei verdecktem Pose-Wrist erkannt wird. Hand-Landmarks werden
nicht in das JSONL-Log geschrieben, aber im Pose-Lab-Overlay als pinke Punkte
und Linien gezeigt.

**MUSS:** `handAtPocket` prüft zwei Fälle:
1. **Fingers:** Eine erkannte Hand hat das Handgelenk in der Hüftzone, der
   Ellbogen ist ≤ 120° gebeugt und die Fingerspitzen 8/12/16/20 bleiben
   komprimiert: maximale Wrist→Tip-Distanz ≤ 0,24 Schulterbreiten.
2. **Hidden:** Ein Pose-Handgelenk liegt in der Hüftzone, der Ellbogen ist
   ≤ 120° gebeugt und keine erkannte Hand liegt innerhalb von 0,35
   Schulterbreiten (Proxy für eine verdeckte Hand).

Eine locker hängende, offene Hand (max. Reach > 0,24) zählt nicht als Tasche.
Ein gerader Arm an der Hüfte (Ellbogen > 120°) zählt nicht, weil er auch in
der neutralen Pose auftritt. Die Hüftzone ist |x − hip.x| ≤ 0,24 und
−0,02 ≤ (y − hip.y) ≤ 0,45 in Schulterbreiten.

**MUSS:** UI-Text „Hand in pocket“ nur zusammen mit dem Detail
(`fingers` oder `hidden at hip`). Keine Sicherheit, keine Event-Erzeugung.

**SOLL:** Der Pocket-Check bleibt im Dev-Modus, bis ein gelabeltes Demo-Set
einen Precision-Nachweis liefert. Er ist kein Produktions-Event.

## 5. Datenmodell

```ts
type Ms = number;
type Iso = string;

type PosePoint = {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence?: number;
};

type FramingMode = "upper-body" | "full-body";
type AudienceMode = "camera" | "room";
type Framing = FramingMode | "partial" | "unknown";

type PoseFrame = {
  schema: "pose.frame.v1";
  frameId: number;
  tMs: Ms;
  mediaTimeMs?: Ms;
  image: { width: number; height: number };
  pose: { normalized: PosePoint[]; world?: PosePoint[] };
  quality: {
    framing: Framing;
    visible: number[];
    meanVisibility: number;
    shoulderWidthPx: number;
    fps: number;
  };
};

type MetricId =
  | "trunkLean"
  | "shoulderTilt"
  | "headLateral"
  | "armOpenness"
  | "handsNearFace"
  | "handVisibility"
  | "handHiddenNearTorso"
  | "headTurn"
  | "cameraOff"
  | "headStare"
  | "headUnrest"
  | "cameraFacingRatio"
  | "offRatio"
  | "returnRate"
  | "transitionRate"
  | "entropy"
  | "stareShare"
  | "gestureRate"
  | "gestureAmplitude"
  | "twoHandShare"
  | "aboveShoulderShare"
  | "stanceWidth"
  | "weightShift"
  | "swayVelocity"
  | "framingValid";

type InvalidReason =
  | "low-visibility"
  | "out-of-frame"
  | "insufficient-window"
  | "no-baseline"
  | "occluded"
  | "model-error";

type MetricSample = {
  metricId: MetricId;
  tMs: Ms;
  value: number;
  unit: "deg" | "ratio" | "count" | "perMin";
  space: "2d" | "3d";
  reference: "baseline" | "camera" | "body";
  windowMs: Ms;
  valid: boolean;
  invalidReason?: InvalidReason;
};

type PoseMetrics = {
  schema: "pose.metrics.v1";
  takeId: string;
  samplingHz: number;
  series: Partial<Record<MetricId, MetricSample[]>>;
};

type HeadSector = "center" | "left1" | "right1" | "left2" | "right2" | "off";

type HeadSample = {
  tMs: Ms;
  valid: boolean;
  headTurn: number;
  sector: HeadSector;
};

type PoseHead = {
  schema: "pose.head.v1";
  takeId: string;
  samples: HeadSample[];
};

type PoseBaseline = {
  schema: "pose.baseline.v1";
  takeId: string;
  calibration: { startMs: Ms; endMs: Ms };
  cameraRollDeg: number;
  metrics: Partial<Record<MetricId, {
    median: number;
    mad: number;
    n: number;
    valid: boolean;
  }>>;
};

type Evidence = "A" | "B" | "C" | "none";
type Confidence = "high" | "medium" | "low";
type Stage = "live" | "post";
type Direction = "high" | "low" | "both";
type RuleKind = "deviation" | "observation" | "quality";

type PoseRule = {
  ruleId: string;
  version: number;
  kind: RuleKind;
  metricId: MetricId;
  stages: Stage[];
  evidence: Evidence;
  confidence: Confidence;
  direction?: Direction;
  enterThreshold?: number;
  exitThreshold?: number;
  windowMs: Ms;
  minDurationMs: Ms;
  exitDurationMs: Ms;
  gapBridgeMs: Ms;
  cooldownMs: Ms;
  minValidRatio: number;
  requiredLandmarks: number[];
  minVisibility: number;
  severity: "info" | "hint" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

type PoseAnalysisConfig = {
  schema: "pose.analysis.v1";
  configId: string;
  createdAt: Iso;
  model: {
    name: "pose_landmarker_heavy" | "pose_landmarker_lite";
    delegate: "GPU" | "CPU";
    runningMode: "VIDEO";
  };
  capture: {
    framingMode: FramingMode;
    audienceMode: AudienceMode;
    width: number;
    height: number;
  };
  timebase: { t0: "recorder-start"; metricHz: number };
  filter: { oneEuro: { minCutoff: number; beta: number; dCutoff: number } };
  baseline: { durationMs: Ms; minValidRatio: number };
  rules: PoseRule[];
  live: {
    enabled: boolean;
    maxSimultaneous: 1;
    maxPer10Min: 3;
    globalCooldownMs: Ms;
    minPrecisionOnDemoSet: number;
  };
  thresholdsStatus: "heuristic-unvalidated";
};

type PostureKind =
  | "trunk-lateral"
  | "shoulder-tilt"
  | "head-lateral"
  | "arms-closed"
  | "self-touch";

type MetricValue = {
  metricId: MetricId;
  valueAtPeak: number;
  baseline: number;
  delta: number;
  unit: "deg" | "ratio" | "count" | "perMin";
};

type EventBase = {
  schema: "pose.event.v1";
  eventId: string;
  sessionId: string;
  takeId: string;
  stage: Stage;
  provisional: boolean;
  severity: "info" | "hint" | "warning";
  startMs: Ms;
  peakMs: Ms;
  endMs: Ms;
  durationMs: Ms;
  rule: {
    ruleId: string;
    version: number;
    evidence: Evidence;
    confidence: Confidence;
    thresholdsStatus: "heuristic-unvalidated";
  };
  evidence: {
    frameIds: number[];
    sampleCount: number;
    validRatio: number;
    clip?: { startMs: Ms; endMs: Ms };
  };
  message: { key: string; params: Record<string, string | number> };
  source: "browser";
};

type PoseEvent =
  | (EventBase & { category: "posture"; kind: PostureKind; metric: MetricValue })
  | (EventBase & {
      category: "head";
      kind: "head-orientation";
      mode: AudienceMode;
      sector: HeadSector;
      metric: MetricValue;
    })
  | (EventBase & {
      category: "hands";
      kind: "hand-hidden-near-torso";
      metric: MetricValue;
    })
  | (EventBase & {
      category: "framing";
      kind: "framing";
      reason:
        | "shoulders-not-visible"
        | "hips-not-visible"
        | "feet-not-visible"
        | "person-out-of-frame";
    })
  | (EventBase & {
      category: "data-quality";
      kind: "data-quality";
      reason: InvalidReason;
    });

type PoseObservation = {
  schema: "pose.observation.v1";
  observationId: string;
  sessionId: string;
  takeId: string;
  category: "gesture" | "feet" | "head-summary";
  metricId: MetricId;
  windowMs: Ms;
  value: number;
  unit: "ratio" | "perMin" | "count" | "deg";
  baseline?: number;
  evidence: Evidence;
  confidence: Confidence;
  message: { key: string; params: Record<string, string | number> };
};

type PoseSession = {
  schema: "pose.session.v1";
  sessionId: string;
  createdAt: Iso;
  consent: {
    granted: boolean;
    at: Iso;
    version: string;
    scope: "local-analysis";
  };
  capture: {
    framingMode: FramingMode;
    audienceMode: AudienceMode;
    width: number;
    height: number;
    fps: number;
    mirrored: boolean;
  };
  timebase: {
    t0EpochMs: number;
    t0PerformanceMs: number;
    source: "MediaRecorder.onstart";
  };
  analysis: {
    configId: string;
    model: "pose_landmarker_heavy" | "pose_landmarker_lite";
    status: "pending" | "running" | "done" | "failed";
  };
  retention: {
    video: "local-only" | "deleted";
    landmarks: "local-only";
    events: "local-and-export";
  };
};

type PoseTake = {
  schema: "pose.take.v1";
  takeId: string;
  sessionId: string;
  localVideoKey: string;
  mimeType: string;
  durationMs: Ms;
  sizeBytes?: number;
  seekable: boolean;
};

type PoseAggregate = {
  metricId: MetricId;
  ruleId?: string;
  evaluableMs: Ms;
  eventCount: number;
  eventMs: Ms;
  eventShare: number;
  longestMs: Ms;
  firstMs?: Ms;
  lastMs?: Ms;
  notEvaluableMs: Ms;
  notEvaluableReasons: Partial<Record<InvalidReason, Ms>>;
};

type ExportEvent = {
  eventId: string;
  category: PoseEvent["category"];
  kind:
    | PostureKind
    | "head-orientation"
    | "hand-hidden-near-torso"
    | "framing"
    | "data-quality";
  stage: Stage;
  severity: "info" | "hint" | "warning";
  startMs: Ms;
  peakMs: Ms;
  endMs: Ms;
  ruleId: string;
  ruleVersion: number;
  evidence: Evidence;
  confidence: Confidence;
  metric?: MetricValue;
  message: { key: string; params: Record<string, string | number> };
  sampleCount: number;
  validRatio: number;
};

type PoseShareExport = {
  schema: "pose.export.v1";
  exportedAt: Iso;
  session: Pick<
    PoseSession,
    "sessionId" | "createdAt" | "capture" | "timebase" | "analysis" | "retention"
  >;
  take: Pick<PoseTake, "durationMs" | "mimeType">;
  baseline: PoseBaseline;
  config: PoseAnalysisConfig;
  events: ExportEvent[];
  observations: PoseObservation[];
  aggregates: PoseAggregate[];
};
```

## 6. Regelkatalog (Startwerte, unvalidiert)

| ID | Art | Modus | Metrik | Enter/Exit | Dwell live/post | Stage | Evidenz | Confidence |
|---|---|---|---|---|---|---|---|---|
| R1 `trunk-lateral` | deviation | beide | `trunkLean` | 20° / 14° | 2,0 s / 1,0 s | live+post | C | medium |
| R2 `shoulder-tilt` | deviation | beide | `shoulderTilt` Δ | 10° / 6° | — / 2,5 s | post | C | low |
| R3 `head-lateral` | deviation | beide | `headLateral` Δ | 12° / 7° | — / 2,5 s | post | C | low |
| R4 `arms-closed` | deviation | beide | `armOpenness` | 0,30 / 0,40 | — / 3,0 s | post | C | low |
| R5 `self-touch` | deviation | beide | `handsNearFace` | 0,60 / 0,75 | — / 1,5 s | post | C | low |
| R6 `hand-hidden` | deviation | beide | `handHiddenNearTorso` | 1 / 0 | — / 3,0 s | post | C | low |
| R7 `camera-look-away` | deviation | `camera` | `cameraOff` | 1 / 0 | 5,0 s / 5,0 s | live+post | C | low |
| R8 `head-stare` | deviation | `room` | `headStare` | 1 / 0 | — / 30 s | post | C | low |
| R9 `head-unrest` | deviation | `room` | `headUnrest` | 1 / 0 | — / 60 s | post | C | low |
| R10 `framing` | quality | beide | `framingValid` | 0 / 1 | 2,0 s / 2,0 s | live+post | none | high |
| O1 `gesture-activity` | observation | beide | GPM, Amplitude, TwoHand, AboveShoulder | — | — / 30 s | post | B/C | low |
| O2 `feet-stance` | observation | `full-body` | `stanceWidth`, `weightShift`, `swayVelocity` | — | — / 30 s | post | none/C | low |
| O3 `head-summary` | observation | beide | CFR, offRatio, returnRate, transitionRate, entropy | — | — / 30–60 s | post | C | low |

**Für alle:** `minValidRatio` 0,8; `minVisibility` 0,6; Hysterese in den
Enter/Exit-Werten enthalten; `thresholdsStatus: heuristic-unvalidated`.

`handHiddenNearTorso`, `cameraOff`, `headStare` und `headUnrest` sind
abgeleitete 0/1-Metriken. Ihre Komponenten (`handVisibility`, `headTurn`,
`stareShare`, `transitionRate`, `entropy`) bleiben in `PoseMetrics` sichtbar.

**R6-Definition:** Handgelenk im Hüftbereich, Hand-Landmarks überwiegend
abwesend, Unterarm grob vertikal, 3 s stabil, Framing gültig. Kein
Taschen-Claim.

**R7-Definition:** Sektoren aus `headTurn`; `off` > 0,45; Rückkehr in `center`
für 1 s beendet das Event. Live nur „lange weg“, nicht CFR.

**R8/R9-Definition:** `room`-Modus, keine Live-Hinweise. R8 ist „starrer
Sektor“, R9 ist „viele Sektorwechsel“. Beide Severity `info`, keine
Qualitätsaussage.

## 7. Zeitlogik und Zustandsmaschine

| Parameter | Live | Post-hoc |
|---|---:|---:|
| Fenster | 1,5 s | 1,0 s |
| Enter-Dwell | 2,0 s | 1,0 s |
| Exit-Dwell | 0,8 s | 0,5 s |
| Gap-Bridging | 1,0 s | 2,0 s (Merge) |
| Cooldown | 90 s (R1), 60 s (R7) | — |
| Min. gültige Frames | 80 % | 80 % |
| Visibility-Gate | 0,6 | 0,6 |

**Kopforientierung:** 300 ms Smoothing, 400 ms Mindest-Dwell, 30-s-Fenster,
Hysterese 0,04, 60 s Cooldown. `room`-Modus nur post-hoc.

**Gesten:** 30-s-Fenster, mindestens 5 Strokes, Baseline 10 s, 5./95.-Perzentile.
**Füße:** 30-s-Fenster, mindestens 80 % sichtbare Füße, nur post-hoc.

**Zustandsmaschine:**

1. Ungültige Frames → `not-evaluable`.
2. Bedingung wahr → `deviation`-Kandidat; nach Enter-Dwell wird das Event
   erzeugt.
3. Bedingung falsch → `in-range`-Kandidat; nach Exit-Dwell endet das Event.
4. Lücken ≤ Gap-Bridging werden geschlossen; längere Lücken beenden das Event.
5. Live-Events sind `provisional`; `endMs` und `durationMs` werden aktualisiert.

**Latenz:** ~60–120 ms Capture/Inference + 1,5 s Fenster + 2,0 s Dwell +
<100 ms UI ≈ **3,5–3,7 s** bis zum Live-Hinweis. Post-hoc ≈ 2 s.
**ISO 11226** definiert statische Haltung als > 4 s; das ist der konservative
Anker. 2 s ist eine Produkt-Heuristik, keine klinische Schwelle.

**Event-Zeiten:** `startMs` = Beginn der anhaltenden Bedingung, rückdatiert um
die Fensterlänge; `peakMs` = stärkste Abweichung; `endMs` = Ende des
Exit-Dwell.

**„Gut“ ist kein Event.** `in-range` erscheint nur im Aggregat. Bei < 80 %
gültigen Frames: `not-evaluable`, kein Hinweis.

## 8. Live vs. Review

| Regel | Live | Review | Begründung |
|---|---|---|---|
| R1 Rumpf-Seitneigung | ja, max. 1 | ja | robust, handlungsnah, hohe Precision |
| R7 Kamera-lange-weg | nur nach Gate | ja | Pose-only-Proxy, sonst zu unsicher |
| R10 Framing | ja | ja | technisch, kein Haltungsurteil |
| R2–R6 | nein | ja | Asymmetrie, Proxy, Okklusion, Kontext |
| R8/R9 Kopforientierung | nein | ja | keine Live-Scanning-Behauptung |
| O1 Gesten | nein | deskriptiv | kontextabhängig, kein „mehr ist besser“ |
| O2 Füße | nein | deskriptiv | nur Full-Body, keine Qualitätsaussage |
| Dev-Pocket-Check (T11) | nein | nein | nur Dev-Anzeige, kein Event |
| Slouch, Gaze, Füße-Qualität | nein | nein | nicht reliabel messbar |

## 9. Acceptance Criteria

1. **Rumpf:** 10-s-Clip mit 25° Seitneigung, Schultern und Hüften sichtbar →
   Event beginnt ±500 ms um den annotierten Start; 1 s Neigung → kein Event.
2. **Framing:** Hüften nicht sichtbar → kein Rumpf-Event; `framing`-Event;
   `evaluable=false`.
3. **Hände:** In Produktions-Events kein String „Tasche“; optional
   `hand-hidden-near-torso` mit `confidence: low`. Im Dev-Modus erkennt T11
   komprimierte Fingerspitzen an der Hüfte mit gebeugtem Ellbogen oder eine
   verdeckte Hand als Heuristik; ein gerader Arm an der Hüfte zählt nicht.
   T11 erzeugt kein Event.
4. **Füße:** Im `upper-body`-Modus keine Fußmetrik; im `full-body`-Modus ohne
   sichtbare Füße `evaluable=false`.
5. **Kopf:** `camera`-Modus liefert CFR/OffRatio/ReturnRate; `room`-Modus
   liefert TransitionRate/Entropy; nirgends „Eye Contact“ oder „Gaze“.
6. **Gesten:** O1 liefert GPM/Amplitude/TwoHand/AboveShoulder; keine
   semantischen Labels, kein „mehr ist besser“.
7. **Export:** `PoseShareExport` enthält kein Video, keine Roh-Landmarks, keine
   `frameIds`, keinen `localVideoKey`.
8. **Live:** Maximal 1 Hinweis, 3/10 min, 90 s Cooldown, keine positiven
   Live-Hinweise.
9. **Evidenz:** Jedes Event hat `evidence`, `confidence`, `thresholdsStatus`.
10. **Datenqualität:** < 80 % gültige Frames → `not-evaluable`, kein Hinweis.
11. **Baseline:** 3–5 s; Skip möglich; ohne Baseline kein baseline-relatives
    Event.
12. **Datenschutz:** Ohne Consent startet keine Kamera; Video bleibt lokal;
    Löschung funktioniert.
13. **Beine:** T12 erkennt gekreuzte Unterschenkel nur, wenn Knie und Knöchel
    sichtbar sind; ohne Beine bleibt die Anzeige grau. Kein Event.

## 10. Offene Entscheidungen

| ID | Frage | Empfehlung | Status |
|---|---|---|---|
| OD-1 | Face Landmarker + Iris für echtes Gaze? | Nein im MVP; nur als separates Feature mit Consent, Kalibrierung und „Kamera-Blick“, nie „Eye Contact“ | offen |
| OD-2 | `full-body` standardmäßig? | Nein, opt-in und experimentell | entschieden |
| OD-3 | Hand Landmarker für Gesten? | Für Produktions-Gesten nein; im Dev-Modus für den Pocket-Check aktiviert (24.10.2026), 5 Hz, Confidence 0,3 | entschieden |
| OD-4 | Live-Gestenhinweise? | Nein, nur Review | entschieden |
| OD-5 | Kalibrierungs-Set | 10–20 Personen, 0,5/1/2 m, Brille, Licht, Hauttöne; Precision/Recall berichten | offen |
| OD-6 | Default `audienceMode` | Kein stiller Default; Demo `camera` | entschieden |
| OD-7 | R7 live freigeben? | Erst nach Precision ≥ 90 % auf Demo-Set | offen |
| OD-8 | Live-Regel „Arme verschränkt“ | Aktuell Coach-Sprechblase mit `minCross −0,25`, Unterarm ≤ 40°, sofort, ohne Cooldown (Hassan-Commit). Auf post-hoc downgraden (R4, 3 s, keine Live-Anzeige) oder als explizite Ausnahme mit Precision-Gate behalten | offen |

## 11. Research-Entscheidungen

- **Haltung:** Keine evidenzbasierte „richtige“ Präsentationshaltung. Stärkste
  Evidenz: Gesten für Verständlichkeit. „Aufrecht“ ist nur für Selbsterleben
  schwach belegt. Power Posing ist null. Deshalb keine Gut/Schlecht-Note,
  sondern `in-range | deviation | not-evaluable`.
- **Kopforientierung:** Pose-only liefert einen Kopfrichtungs-Proxy, keinen
  Blickkontakt. Face/Iris wäre ein Scope- und Datenschutzwechsel. `camera` und
  `room` sind getrennte Modi; „Scanning“ ist keine validierte Wirkung.
- **Hände:** Der Hand Landmarker lädt lokal (5 Hz, Confidence 0,3) und
  zeichnet die 21 Landmarks im Pose-Lab-Overlay. Fingertracking erkennt
  sichtbare, komprimierte Finger am Taschenrand; eine vollständig verdeckte
  Hand sieht er nicht. Der Dev-Pocket-Check kombiniert beides als Heuristik;
  Produktions-Events bleiben bei `hand-hidden-near-torso` (post-hoc, low
  confidence).
- **Füße:** Frontale Fuß-Landmarks sind ungenau und oft verdeckt. Nur
  Full-Body opt-in, deskriptiv, keine Qualitätsaussage.
- **Gesten:** Pose-only reicht für GPM, Amplitude, Zwei-Hand-Anteil und
  Gestenraum. Semantische Typen brauchen ein eigenes Modell. Kein „mehr ist
  besser“.
- **Bestehende Implementierung:** Die Live-Regel „Arme verschränkt“ nutzt
  jetzt Handgelenke an/nahe der Körpermitte (`minCross −0,25`), einen
  Unterarmwinkel ≤ 40° zur Schulterlinie und zeigt sofort ohne Cooldown.
  Das reduziert die wichtigsten False Positives (gekreuzte Handgelenke an
  der Mittellinie, gefaltete Hände mit Fingerspitzen nach oben), bleibt
  aber eine Heuristik. Die Anforderungen empfehlen R4 nur post-hoc; die
  Entscheidung steht in OD-8.

## 12. Quellen (Auswahl)

- Dargue et al. 2019, Gesten-Meta-Analyse: https://doi.org/10.1037/bul0000202
- Körner et al. 2022, Haltung/Selbsterleben: https://doi.org/10.1037/bul0000356
- Elkjær et al. 2022, Power Posing: https://doi.org/10.1177/1745691620919358
- MediaPipe Pose Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- MediaPipe Hand Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker
- MediaPipe Okklusions-/Visibility-Issues: https://github.com/google-ai-edge/mediapipe/issues/5806, https://github.com/google-ai-edge/mediapipe/issues/5197
- One Euro Filter: https://gery.casiez.net/publications/CHI2012-casiez.pdf
- ISO 11226: https://www.iso.org/standard/25573.html
- Rhema (sparse Live-Feedback): https://doi.org/10.1145/2678025.2701386
- Presentation Trainer: https://doi.org/10.1145/2818346.2830603
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- AI Act: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- WheelPose: https://dl.acm.org/doi/full/10.1145/3613904.3642555
- Microsoft Speaker Coach: https://support.microsoft.com/en-us/powerpoint/suggestions-from-speaker-coach

## 13. Änderungslog

| Datum | Änderung | Grund |
|---|---|---|
| 24.10.2026 | Anforderungen angelegt | Deep Research zu Haltung, Kopforientierung, Händen, Füßen und Gesten; finale Datenmodelle und Regeln festgehalten. |
| 24.10.2026 | Pose-Lab ergänzt | Zehn feste Testposen für den lokalen Debug-Modus; keine Events, kein Backend-Streaming, keine Scores. |
| 24.10.2026 | Pose-Lab auf ein Output-Feld umgestellt; Pocket-Check per Hand-Landmarker | Nutzerentscheidung: falsche Pose live rot aus der Ferne erkennbar; Hosentaschen-Erkennung über Fingertracking. |
| 24.10.2026 | Hassan-Crossed-Logik übernommen; Coach-/Status-Umschalter; Fingerspitzen-Pocket | Handgelenke an der Mittellinie und Unterarmwinkel ≤ 40°; Coach-Sprechblase als Standard, großes Statusfeld umschaltbar; Pocket prüft Fingerspitzen 8/12/16/20 und Ellbogen ≤ 120°. |
| 24.10.2026 | Hand-Landmarks sichtbar, 5 Hz, einheitliches Check-Muster, T12 | Hand-Modell lädt nachweislich mit Confidence 0,3; pinke Hand-Landmarks im Pose-Lab-Overlay; alle Posen liefern `values`/`failing`; T12 erkennt gekreuzte Unterschenkel. |

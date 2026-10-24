# Produkt — Live-Präsentationstrainer

**Status:** Thema fix (24.10.2026).
**Grundlage:** Erste Feature-Beschreibungen des Teams. Es gibt noch kein
vollständiges Fein-Konzept. Gesten-/Haltungsbeobachtungen sind inzwischen
als explizite Prototyp-Heuristiken umgesetzt (keine Scores):
[Recherche und Auswertung](04-gesture-evaluation.md),
[Jury-Ablauf und offene Abnahme](05-jury-demo.md). Das lokale technische
Grundgerüst ist festgelegt (Abschnitt 3, Technik).

> **Regel:** Keine zusätzlichen Features erfinden. Alles, was unten nicht steht,
> ist offen und muss entschieden werden.

---

## 1. Fixe Features

| # | Feature | Erste Beschreibung |
|---|---|---|
| 1 | **Live Posture / Gesture / Eye Tracking** | Körperhaltung, Gestik und Blickverhalten werden während der Präsentation live erfasst. |
| 2 | **Audio-Transkription + Fact-Checking** | Die gesprochene Präsentation wird transkribiert. Fakten werden über Daten-Upload und einen Web-Fetch-Agent geprüft. |
| 3 | **Sprechmerkmale** | Pausen, Zögern, Sprechtempo und Füllwörter werden erfasst (Liste offen: „…“). |
| 4 | **Timestamp-Feedback** | Nach dem Feedback kann man zurückscrollen und Fehler zeitpunktbezogen ansehen. |
| 5 | **Frage-Simulator** | Im Anschluss an die Präsentation werden Fragen simuliert. Details offen. |

---

## 2. Ablauf (nur aus den Features abgeleitet)

1. **Live-Präsentation:** Kamera und Mikrofon liefern die Eingaben für Tracking
   und Transkription.
2. **Feedback:** Auftritt, Sprache und Fakten werden ausgewertet.
3. **Review:** Zurückscrollen entlang der Timestamps; Fehler an der jeweiligen
   Stelle ansehen.
4. **Frage-Simulator:** Im Anschluss werden Fragen zur Präsentation simuliert.

Diese Reihenfolge ist eine direkte Ableitung der fünf Features, keine zusätzliche
Produktentscheidung.

UI-Einstieg (24.10.2026, Nutzerauftrag): Die Startseite leitet mit „Neue
Präsentation“ ins vorhandene Live-Studio und bietet Quellen-Vorbereitung als
zweiten Weg. Die Stats-Vorschau bleibt darunter als synthetische Demo. Der
gemeinsame Ablauf Vorbereiten → Aufnehmen → Review verbindet die Ansichten;
ohne eigene Aufnahme ist das Review-Ziel ausdrücklich ein Beispiel. Die
Darstellung Hell/Dunkel/System wird lokal gespeichert. Daraus entstehen keine
neuen Analysefunktionen oder Bewertungen. Gestaltungsvertrag: `frontend/DESIGN.md`.

---

## 3. Offen — muss das Team entscheiden

### Zielgruppe und Setting
- Wer präsentiert damit: Studierende, Schule, Ausbildung, Beruf?
- Übungsraum oder echter Vortrag?
- Einzelperson oder mit Feedback durch Lehrkraft?

### Analyse
- Gesten: sichtbare Geometrie relativ zur Neutralstellung, Mindestdauer,
  Hysterese und Cooldown sind als Prototyp-Heuristiken umgesetzt; keine Scores.
  Systematische Genauigkeits-/Geräteprüfung bleibt offen.
- Live-Sprechfeedback (24.10.2026, Nutzerauftrag): Im Backend-Modus laufen
  dieselben kalibrierten Signalregeln für Lautstärke, Tonhöhe, Silben-Tempo
  und Pausen bereits während der Aufnahme (Updates alle 5 s, maximal 5 min).
  Ein Hinweis gleichzeitig, pro Typ 15 s Cooldown, Hinweise ausblendbar.
  Mikrofon-PCM wird an den lokalen Server gesendet und nur im RAM gehalten.
  Wortbasierte Füllwörter/WPM, vollständiges Review und Quellenvergleich
  bleiben nachgelagert. Live-Whisper bleibt eine optionale Vorschau; der
  aktuelle Docker-CPU-Pfad hielt im längeren Test nicht mit.
- Wie werden Fehlalarme und Unsicherheit angezeigt?
- Eye Tracking: Webcam-basiert oder zusätzliche Hardware?

### Fact-Checking
- Quellen-Ingest ist für PDF, PPTX, DOCX, TXT und Markdown umgesetzt.
  Lokale Jina-Embeddings und pgvector/Volltextsuche liefern zitierbare Passagen;
  darauf läuft ein lokaler Ollama-Quellenvergleich mit Wort-Timestamps und
  codegeprüften Zitaten. Höchstens sechs ausgewählte Aussagen, fünf Passagen je
  Aussage; keine vollständige Wahrheitsprüfung. [Wie und warum](06-local-coaching.md).
- Welche Web-Quellen darf der Agent abrufen?
- Wie wird eine Quelle als glaubwürdig markiert?
- Fehlende Evidenz wird als „in den Quellen nicht gefunden“ gezeigt, nicht als falsch.

### Frage-Simulator
- Umgesetzt (24.10.2026, Nutzerauftrag): bis zu 3 Fragen pro Runde, zuerst zu
  Widersprüchen und nicht belegten Aussagen aus dem Fact-Check, dann zu
  Quelleninhalten, die im Vortrag fehlen, dann zu unklaren Stellen.
- Antworten getippt oder gesprochen; Abgleich mit den Quellen (stützt /
  widerspricht / nicht gefunden) plus optionale Nachfrage. Keine Punkte,
  keine Noten.
- Voice-Agent (24.10.2026, Nutzerauftrag): Gespräch nach dem Vortrag in zwei
  Rollen, „Curious student“ (naiv, duzt, fragt nach Begriffen und Beispielen)
  und „Professor / tutor“ (präzise, siezt, fragt nach Belegen). Fragen und
  Reaktionen liest der Browser vor (`speechSynthesis`); die gesprochene
  Antwort wird per konfiguriertem Transcriber (standardmäßig lokales Whisper) transkribiert und gegen die hochgeladenen
  Vorlesungsunterlagen geprüft. Die Rolle ändert nur den Stil, nicht die
  Quellenbindung.
- Offen: automatisches Antwortende per Stille-Erkennung (aktuell Button
  „Done“), Sprache außer Deutsch, Anzahl der Fragen.

### Daten und Datenschutz
- Neuer Backend-Vertrag: `docs/06-backend-review-api.md`. Video bleibt im
  Client; keine serverseitigen Clips, Snapshots oder Wiedergabe-URLs. Die
  additive Session-/Take-API persistiert Timestamp-Events, Wörter, Metriken
  und Review in Postgres. Audio oder Aufnahme wird nur optional zur Analyse
  temporär hochgeladen und auch bei Analysefehlern gelöscht. Eine Session-
  Löschung kaskadiert alle zugehörigen Backend-Daten und temporären Uploads;
  die lokale Aufnahme und getrennte Quellen-Collection löscht sie nicht.
  Coverage ohne gemeldete Messintervalle bleibt unbekannt. Frontend-Anbindung
  dieser neuen API erfolgt separat.
- Lokales Grundgerüst: PostgreSQL und S3-Dateispeicher mit persistenten
  Docker-Volumes, ausschließlich für synthetische Entwicklungsdaten.
  Expliziter Audio-Upload unter `/speech/analyze`, keine automatische Aufzeichnung.
  Celery verarbeitet Silero-VAD/RMS/YIN sowie standardmäßig lokales
  faster-whisper (deutsch); Deepgram-ASR (EU) bleibt optional.
  Originale werden nach terminaler Verarbeitung gelöscht; Ergebnisse verbleiben
  in S3. Stalled Jobs und Speicherfehler benötigen noch eine Cleanup-Regel.
  Der Smoke-Test entfernt seine synthetischen Audiodaten wieder.
- Redis hält Hintergrundjobs und kleine Status-/Referenzwerte in einem
  persistenten Docker-Volume. Task-Ergebnisse verfallen nach einer Stunde;
  dies legt keine Aufbewahrungsdauer für Medien oder Transkripte fest.
- Offen: automatische Aufbewahrungsdauer für Sessions und abgeleitete Daten;
  Wiederanlauf-/Cleanup-Regel für nie erneut zugestellte, verwaiste Jobs.
- Neue Session-API verlangt Einwilligung; Cloud-Verarbeitung benötigt den
  Scope `local-and-cloud-analysis`. Lokaler Template-Pfad ohne LLM bleibt verfügbar.
- Keine echten personenbezogenen Daten in der Demo.

### Technik
- Lokaler Stack (24.10.2026): FastAPI, MediaPipe, PostgreSQL mit pgvector,
  MediaRecorder im Browser und SeaweedFS als S3-Dateispeicher;
  FFmpeg im Backend. Celery führt lange Arbeiten in einem separaten Worker
  aus, Redis dient als Queue und temporärer Ergebnisspeicher. Die
  Post-Transkription nutzt standardmäßig lokales faster-whisper hinter einem
  austauschbaren Interface; Deepgram Nova-3 (EU) ist optional. Eine
  Live-Transkription existiert als Backend-Prototyp (`WS /speech/live`,
  ebenfalls lokales faster-whisper); der Browser-Sender ist als optionale Vorschau im Web integriert. Deutsche
  Füllworterkennung ist ungeprüft; JSON-Demo explizit wählbar. Setup und
  Speicherverhalten: `backend/README.md`.
- Audio: Silero VAD v6.2 lokal (ONNX), RMS/YIN; Kalibrierung erste 3 s.
- Nutzerentscheidung: lokale Vorführung reicht; öffentliches Hosting ist
  derzeit nicht nötig. Nutzer bevorzugt freie/lokale Modelle statt OpenAI API:
  Qwen3.5 4B Q4_K_M läuft nativ über Ollama, Whisper `small` im Worker.
- Latenz, Ausfall-Fallback, Kosten.
- Browser- und Geräte-Support (Laptop und Smartphone).

### Name
- Noch kein Produktname festgelegt.

---

## 4. Bewusst nicht festgelegt

Nicht Teil der ersten Beschreibungen und daher **nicht ohne Entscheidung
einbauen**:

- automatische Noten oder Eignungsdiagnostik,
- Persönlichkeits- oder Emotionsbewertung,
- Vergleich mit anderen Personen oder Population,
- VR/AR,
- Login- und Kursverwaltung,
- feste KI-Modelle oder Anbieter,
- konkrete UI, Dashboard-Layouts oder Reports.

---

## 5. Änderungen

| Datum | Änderung | Grund |
|---|---|---|
| 24.10.2026 | Produkt angelegt | Thema auf Live-Präsentationstrainer festgelegt; fünf erste Features genannt. |
| 24.10.2026 | Backend-Review-Vertrag umgesetzt | Nutzerauftrag: `06-backend-review-api.md` prüfen und umsetzen; Session-/Take-Persistenz, Timeline, Template-/LLM-Review und Fragen ohne Server-Clips. Frontend bleibt Teamaufgabe; menschlich gelabelte Evaluation steht aus. |
| 24.10.2026 | Lokales Backend-Grundgerüst festgelegt | Nutzerauftrag für Docker Compose; Dateispeicher für synthetische Entwicklungsdaten ergänzt. Speicherung echter Aufnahmen bleibt offen. |
| 24.10.2026 | Celery und Redis ergänzt | Nutzerauftrag: lange Arbeiten wie Transkription vom API-Prozess trennen. |
| 24.10.2026 | ML-Audioanalyse und asynchrone Jobs | Nutzerauftrag: Silero VAD, Deepgram-Adapter, RMS/YIN, 3-s-Kalibrierung und Celery-Verarbeitung; kein Nachweis für deutsche Füllwortqualität. |
| 24.10.2026 | Voice-Agent mit zwei Rollen | Nutzerauftrag: nach dem Vortrag mit einem Agenten sprechen, der Fragen stellt und Antworten gegen die Vorlesungsunterlagen prüft; Rollen „dummer Schüler“ (umgesetzt als neugieriger Erstsemester) und Professor/Tutor. |
| 24.10.2026 | Frage-Simulator umgesetzt | Nutzerauftrag: Feature 5 vollständig einbauen; Fragen aus Fact-Check-Funden und Quellen, getippte Antworten gegen Quellen geprüft, ohne Bewertung. |
| 24.10.2026 | Fact-Check mit RAG und Web-Zweitquelle | Nutzerauftrag: hochgeladene Quellen (z. B. Vorlesungsfolien) zuerst, Web nur als Fallback; LLM über OpenAI-kompatible API, Anbieter offen. Transkription im Live-Studio als Opt-in. |
| 24.10.2026 | Echte lokale Gesten-/Haltungsbeobachtungen, synthetischer Jury-Rundgang und Evidenz-Export | Nutzerauftrag: Gesten recherchieren, nachvollziehbar auswerten und für die Jury vorführbar machen. Keine Blickkontakt-/Qualitätsbewertung. |
| 24.10.2026 | Lokale Whisper-Transkription als Standard | Nutzerauftrag: Speech-to-Text mit einem lokalen Modell statt Cloud-Zwang; Deepgram bleibt optional. |
| 24.10.2026 | Lokaler Quellenvergleich und echte Text-Fragerunde im Web-Review | Nutzer präferiert freie/lokale Alternative zur zunächst gewählten OpenAI API. Keine API-Schlüssel; Zitate werden vor Anzeige geprüft. |
| 24.10.2026 | Live-Transkription als optionale Web-Vorschau | Nutzerauftrag: Transcript nahezu in Echtzeit während der Aufnahme (`WS /speech/live`); AudioWorklet-Sender und Ausfallhinweis im Web integriert. |
| 24.10.2026 | Pose-/Feedback-Anforderungen festgelegt | Deep Research zu Haltung, Kopforientierung, Händen, Füßen und Gesten; Research-Ziele in `docs/04-pose-tracking-requirements.md`; aktueller Integrationsstand dort separat markiert. |

## Integrierte Analyse-Schalter (24.10.2026)

Nutzerentscheidung: VIDEO als Standard; IMAGE/VIDEO und Lite/Heavy unabhängig
umschaltbar, Lite bleibt Standard. GPU-first mit CPU-Fallback ohne Modellwechsel.
Pose Lab und T12 bleiben Dev-only; Fingertracking läuft separat schaltbar
standardmäßig im normalen Overlay, bis 5 Hz auch ohne Torso. Produktions-Evaluator,
Zeitachse und Review aus `goal` bleiben aktiv. Sprachfeedback ist insgesamt und
für Pause, Tempo, Füllwörter, Lautstärke und Tonhöhe einzeln schaltbar.
„Live · in browser“ ist Standard und liefert lokale Mikrofonhinweise ohne Backend;
der Backend-Modus nutzt den Signal-Stream. Füllwörter und Wort-Tempo kommen nach
dem Stoppen. Die Haltungsreferenz benötigt keine stillgehaltenen Hände mehr.

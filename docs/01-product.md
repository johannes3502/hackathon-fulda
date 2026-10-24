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
- Was läuft live, was erst nach der Präsentation?
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
- Web-Prototyp: bis zu drei Textfragen aus Transkript und überprüfbaren
  Quellenvergleichen, vorrangig zu Widersprüchen/Lücken. Textantworten werden
  mit neu abgerufenen Passagen verglichen; keine Punkte oder Noten.
- Sprachbasierte Fragerunde und systematischer Schwierigkeitsgrad bleiben offen.

### Daten und Datenschutz
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
- Werden Audio, Video und Transkript gespeichert? Wie lange?
- Einwilligung, Löschung, lokale Verarbeitung?
- Keine echten personenbezogenen Daten in der Demo.

### Technik
- Lokaler Stack (24.10.2026): FastAPI, MediaPipe, PostgreSQL mit pgvector,
  MediaRecorder im Browser und SeaweedFS als S3-Dateispeicher;
  FFmpeg im Backend. Celery führt lange Arbeiten in einem separaten Worker
  aus, Redis dient als Queue und temporärer Ergebnisspeicher. Die
  Post-Transkription nutzt standardmäßig lokales faster-whisper hinter einem
  austauschbaren Interface; Deepgram Nova-3 (EU) ist optional. Deutsche
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
| 24.10.2026 | Lokales Backend-Grundgerüst festgelegt | Nutzerauftrag für Docker Compose; Dateispeicher für synthetische Entwicklungsdaten ergänzt. Speicherung echter Aufnahmen bleibt offen. |
| 24.10.2026 | Celery und Redis ergänzt | Nutzerauftrag: lange Arbeiten wie Transkription vom API-Prozess trennen. |
| 24.10.2026 | ML-Audioanalyse und asynchrone Jobs | Nutzerauftrag: Silero VAD, Deepgram-Adapter, RMS/YIN, 3-s-Kalibrierung und Celery-Verarbeitung; kein Nachweis für deutsche Füllwortqualität. |
| 24.10.2026 | Echte lokale Gesten-/Haltungsbeobachtungen, synthetischer Jury-Rundgang und Evidenz-Export | Nutzerauftrag: Gesten recherchieren, nachvollziehbar auswerten und für die Jury vorführbar machen. Keine Blickkontakt-/Qualitätsbewertung. |
| 24.10.2026 | Lokale Whisper-Transkription als Standard | Nutzerauftrag: Speech-to-Text mit einem lokalen Modell statt Cloud-Zwang; Deepgram bleibt optional. |
| 24.10.2026 | Lokaler Quellenvergleich und echte Text-Fragerunde im Web-Review | Nutzer präferiert freie/lokale Alternative zur zunächst gewählten OpenAI API. Keine API-Schlüssel; Zitate werden vor Anzeige geprüft. |

# Produkt — Live-Präsentationstrainer

**Status:** Thema fix (24.10.2026).
**Grundlage:** Erste Feature-Beschreibungen des Teams. Es gibt noch kein
Fein-Konzept, keine Scores und keine Schwellenwerte. Das lokale technische
Grundgerüst ist inzwischen festgelegt (Abschnitt 3, Technik).

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

### UI-Entwurf Stats-Karte (Nutzerwunsch 24.10.2026)

Ergänzender Nutzerwunsch: Review mit Video, denselben Kriterien und einer
Performance-Zeitkurve nach dem Vorbild einer Schachanalyse. Anklickbare gute und
schwächere Momente sowie fachliche Anmerkungen springen zum Video-Timestamp.
Die Vorschau `/review-preview` zeigt synthetische Scores und Quellen mit einem
generierten Beispielvideo. `/live/[sessionId]/analysis` nutzt vorhandene Events
und echte Aufnahmen, lässt nicht berechnete Performance-Werte aber ausdrücklich
offen. Die vier Kriterien filtern die Momente; die Kurve bleibt der Gesamtverlauf.

Auf der Startseite: vereinfachte Spielerkarte mit Gesamt-Kreisdiagramm und
Gestik/Fachwissen/Flow/Struktur, jeweils 1–100 %. Für diesen ausdrücklich
angefragten Designentwurf werden synthetische, als Demo markierte Werte gezeigt.
„Quersumme“ wird als gleich gewichteter arithmetischer Durchschnitt interpretiert
(auf ganze Prozent gerundet). Die Ableitung der vier Werte aus realen Analysen
ist weiterhin offen; die Karte behauptet keine gemessene persönliche Bewertung.

### Zielgruppe und Setting
- Wer präsentiert damit: Studierende, Schule, Ausbildung, Beruf?
- Übungsraum oder echter Vortrag?
- Einzelperson oder mit Feedback durch Lehrkraft?

### Analyse
- Welche Metriken pro Feature, welche Schwellenwerte, welche Scores?
- Was läuft live, was erst nach der Präsentation?
- Wie werden Fehlalarme und Unsicherheit angezeigt?
- Eye Tracking: Webcam-basiert oder zusätzliche Hardware?

### Fact-Checking
- Welche Dateiformate können hochgeladen werden?
- Welche Web-Quellen darf der Agent abrufen?
- Wie wird eine Quelle als glaubwürdig markiert?
- Was passiert, wenn keine Quelle gefunden wird?

### Frage-Simulator
- Umgesetzt (24.10.2026, Nutzerauftrag): bis zu 5 Fragen pro Runde, zuerst zu
  Widersprüchen und nicht belegten Aussagen aus dem Fact-Check, dann zu
  Quelleninhalten, die im Vortrag fehlen, dann zu unklaren Stellen.
- Antworten nur als Text; Abgleich mit den Quellen (stützt / widerspricht /
  nicht gefunden) plus optionale Nachfrage. Keine Punkte, keine Noten.
- Offen: Spracheingabe für Antworten, Schwierigkeitsgrad, Anzahl der Fragen.

### Daten und Datenschutz
- Lokales Grundgerüst: PostgreSQL und S3-Dateispeicher mit persistenten
  Docker-Volumes, ausschließlich für synthetische Entwicklungsdaten.
  Expliziter Audio-Upload unter `/speech/analyze`, keine automatische Aufzeichnung.
  Celery verarbeitet Silero-VAD/RMS/YIN sowie optional Deepgram-ASR (EU, deutsch).
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
- Lokaler Stack (24.10.2026): FastAPI, MediaPipe, PostgreSQL,
  MediaRecorder im Browser und SeaweedFS als S3-Dateispeicher;
  FFmpeg im Backend. Celery führt lange Arbeiten in einem separaten Worker
  aus, Redis dient als Queue und temporärer Ergebnisspeicher. Die
  Post-Transkription nutzt Deepgram Nova-3 hinter einem austauschbaren Interface.
  Deutsche Füllworterkennung ist ungeprüft; JSON-Demo explizit wählbar. Setup und Speicherverhalten:
  `backend/README.md`.
- Audio: Silero VAD v6.2 lokal (ONNX), RMS/YIN; Kalibrierung erste 3 s.
- Fact-Check umgesetzt mit OpenAI-kompatibler Schnittstelle; konkreter Anbieter,
  Modell und Hosting bleiben offen. Web-Zweitquelle: Wikipedia-API (Standard)
  oder Tavily. Der Frage-Simulator nutzt dasselbe Modell.
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
| 24.10.2026 | Frage-Simulator umgesetzt | Nutzerauftrag: Feature 5 vollständig einbauen; Fragen aus Fact-Check-Funden und Quellen, getippte Antworten gegen Quellen geprüft, ohne Bewertung. |
| 24.10.2026 | Fact-Check mit RAG und Web-Zweitquelle | Nutzerauftrag: hochgeladene Quellen (z. B. Vorlesungsfolien) zuerst, Web nur als Fallback; LLM über OpenAI-kompatible API, Anbieter offen. Transkription im Live-Studio als Opt-in. |

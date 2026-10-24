# Produkt — Live-Präsentationstrainer

**Status:** Thema fix (24.10.2026).
**Grundlage:** Erste Feature-Beschreibungen des Teams. Es gibt noch kein
Fein-Konzept, keine Scores, keine Schwellenwerte und keine technische
Festlegung.

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
- Wie viele Fragen, welcher Schwierigkeitsgrad?
- Nur Text oder auch Sprache?
- Werden Antworten bewertet?

### Daten und Datenschutz
- Werden Audio, Video und Transkript gespeichert? Wie lange?
- Einwilligung, Löschung, lokale Verarbeitung?
- Keine echten personenbezogenen Daten in der Demo.

### Technik
- Stack, Hosting, Modelle und Anbieter.
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

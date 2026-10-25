# Produkt — Live-Präsentationstrainer

**Status:** Thema fix (24.10.2026). Offene TODOs: [14-open-todos.md](14-open-todos.md).
**Grundlage:** Erste Feature-Beschreibungen des Teams. Es gibt noch kein
vollständiges Fein-Konzept. Gesten-/Haltungsbeobachtungen sind inzwischen
als explizite Prototyp-Heuristiken umgesetzt (keine Scores auf Regel-Ebene; die
Review-Scores aggregieren nur erfasste Evidenz, siehe unten):
[Recherche und Auswertung](04-gesture-evaluation.md),
[Jury-Ablauf und offene Abnahme](05-jury-demo.md). Das lokale technische
Grundgerüst ist festgelegt (Abschnitt 3, Technik).

Jury-Pfad (25.10.2026): `/stage` bündelt diese Features für die lokale Demo.
Standard ist eine 60-s-Aufnahme ohne Analyse-Upload; optional läuft dieselbe
Backend-Analyse mit höchstens 90 s Wartezeit. Video und Live-Ereignisse bleiben
bei frühem Review erhalten. Eine vorbereitete Datenschutzfrage ersetzt auf
der Bühne den offenen Sprachdialog; sie ist als Beispiel markiert und erzeugt
keine Bewertung. Details: [Pitch Mode](16-pitch-mode-plan.md).

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
zweiten Weg. Darunter stehen Anzahl, Dauer und Hinweise der tatsächlich in diesem
Browser-Arbeitsbereich aufgenommenen Takes; vor der ersten Aufnahme ein Leerzustand. Der
gemeinsame Ablauf Vorbereiten → Aufnehmen → Review verbindet die Ansichten;
ohne eigene Aufnahme ist das Review-Ziel ausdrücklich ein Beispiel. Die
Darstellung Hell/Dunkel/System wird lokal gespeichert. Daraus entstehen keine
neuen Analysefunktionen oder Bewertungen. Gestaltungsvertrag: `frontend/DESIGN.md`.

Aufnahme-Vollbild (25.10.2026, Nutzerauftrag): Optional über „Fullscreen“ im
Kamerabild, auch während einer laufenden Aufnahme. Hinweise erscheinen als
kompakte farbige Kennzeichen mit zum Ereignis passendem Symbol und Kurztitel am
rechten Rand. Zeit, Hinweise ein/aus, Aufnahme starten/beenden und Ausstieg
bleiben erreichbar. Vorhandene Hinweisregeln und Anzeigezeiten gelten weiter;
grüner Trackingstatus ist kein Lob für den Vortrag. Ohne native Vollbild-API
wird die Browserfläche ausgefüllt; Escape oder der Ausstiegsknopf führen zurück.

---

## 3. Offen — muss das Team entscheiden

Ergänzender Nutzerauftrag (aktualisiert 25.10.2026): Drei 0–100-Scores für
Gestik, Fachwissen und Flow über dem Review-Video
statt Moment-Anzahlen. `evidence-share-v1` nutzt bewertete positive bzw. kritische
Zeitanteile (Überlappungen derselben Art vereinigt); Fachwissen nutzt bevorzugt
gestützte / (gestützte + widersprochene) Aussagen. Nicht gefunden, ungeprüft,
neutrale Beobachtungen und unbeobachtete Zeit erzeugen keine Benotung. Kein
Score ohne bewertbare Evidenz; Zeitabdeckung und Formel stehen im UI.
Die Graph-Darstellung ist eine durchgehende Linie aus geraden Segmenten ohne
Säulenflächen, mit beweglichem Wiedergabepunkt. Zwischenwerte sind als
Interpolation gekennzeichnet, nicht als zusätzliche Messungen.
Struktur ist auf Nutzerwunsch aus den Kriterien und der Berechnung entfernt.
Vorhandene Struktur-Momente bleiben allgemeine Anmerkungen ohne eigenen Score.

Review-Graph (24.10.2026, Nutzerauftrag): Timestamp-Momente als qualitativer
Verlauf unter dem Video. Nach Nutzerkorrektur positive Momente oberhalb,
Anpassungshinweise unterhalb der neutralen Mittellinie. Die Ausschläge bilden
den Saldo gleichzeitiger Feedback-Events ab, keinen erfundenen Performance-Score.
Die restliche Review bleibt strukturell erhalten, mit größeren Bedienelementen
und besser lesbarer Schrift.

### Zielgruppe und Setting
- Wer präsentiert damit: Studierende, Schule, Ausbildung, Beruf?
- Übungsraum oder echter Vortrag?
- Einzelperson oder mit Feedback durch Lehrkraft?

### Analyse
- Gesten: sichtbare Geometrie relativ zur Neutralstellung, Mindestdauer,
  Hysterese und Cooldown sind als Prototyp-Heuristiken umgesetzt; keine Scores
  auf Regel-Ebene. Die Review-Scores aggregieren nur die erfasste Evidenz.
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
  darauf läuft ein Gemini-Quellenvergleich mit Wort-Timestamps und
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
- Live-Sessions werden lokal in IndexedDB gespeichert: Video, Transkript,
  Feedback, Quellenurteile und Fragen-/Gesprächsverlauf. Studio und Dashboard
  zeigen frühere Takes nach dem Neuladen. Löschen im Review entfernt den lokalen
  Take; Quellen und Backend-Daten bleiben separat. Speicherfehler werden angezeigt,
  der Take bleibt dann im aktuellen Tab verfügbar. Kein Geräte-/Browser-Sync;
  gelöschte Browserdaten und vom Browser verdrängte Daten sind nicht wiederherstellbar.
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
  Der Kurzreview zeigt Stärken und Übungsschritte zusammen. Feste Erklärungen
  und nächste Schritte nutzen die Events des Takes; fehlende LLM-Konfiguration
  oder Anbieterfehler verhindern keinen abgeschlossenen Template-Review.
  Stärken brauchen positive Evidenz (Satzgrenzen-Pause oder quellengeprüfte
  gestützte Aussage); fehlende Warnungen gelten nicht als Lob.
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
- Audio: Silero VAD v6.2 lokal (ONNX), RMS/YIN; Kalibrierung aus 3 s stimmhafter Sprache, danach langsam adaptive Referenz. Anfangsstille und unvoiced Rauschen zählen nicht.
- Nutzerentscheidung: lokale Vorführung reicht; öffentliches Hosting ist
  derzeit nicht nötig. Für Quellenvergleich und Fragen ist Gemini (Cloud) der
  Default; Whisper `small` läuft im Worker. Wegen fehlendem EU-Region-Pinning
  nur synthetische Demo-Daten senden.
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
| 24.10.2026 | Gemini statt lokalem Ollama | Nutzerauftrag: Gemini-Key aus dem Image-Skill in die lokale `.env`, Ollama aus dem Projekt entfernen, schwache Gemini-Modelle testen. Die frühere Local-only-Zusage ist hinfällig; nur synthetische Demo-Daten oder Vertex AI mit EU-Region. |
| 24.10.2026 | Long-Term-Progress-Backend | Nutzerauftrag: Frontend-Plan auf `main`, Backend-Plan validieren und implementieren. Pseudonymes Profil, versionierte Metriken, robuste Trends, Change-Points, optionale Ziele, Export/Löschung; kein Gesamtscore. Frontend-Anbindung bleibt offen. |
| 25.10.2026 | Pitch/Doku an Scores und offene Punkte angepasst | Keine „keine Scores“-Aussage mehr im Pitch; Test-/API-Zahlen aktualisiert; Graph-Doku auf gerade Segmente korrigiert; offene TODOs in `docs/14-open-todos.md` festgehalten. Struktur bleibt im Live-Pfad ohne Evidenzquelle. |

## Integrierte Analyse-Schalter (24.10.2026)

Nutzerentscheidung: VIDEO als Standard; IMAGE/VIDEO und Lite/Heavy unabhängig
umschaltbar, Lite bleibt Standard. GPU-first mit CPU-Fallback ohne Modellwechsel.
Pose Lab und T12 bleiben Dev-only; Fingertracking läuft separat schaltbar
standardmäßig im normalen Overlay, bis 5 Hz auch ohne Torso. Produktions-Evaluator,
Zeitachse und Review aus `goal` bleiben aktiv. Sprachfeedback ist insgesamt und
für Pause, Tempo, Füllwörter, Lautstärke und Tonhöhe einzeln schaltbar.
Jede Web-Aufnahme nutzt Live-Feedback über den Backend-Signal-Stream und die
vollständige Analyse nach dem Stoppen. Die Auswahl zwischen Gesten-only,
lokalem Browser-Modus und Backend-Modus entfällt auf Nutzerwunsch. Füllwörter und Wort-Tempo kommen nach
dem Stoppen. Die Haltungsreferenz benötigt keine stillgehaltenen Hände mehr.

Stimmreferenz: Browser und Backend warten auf genügend stimmhafte Sprache, statt
die ersten drei vergangenen Sekunden zu verwenden. Danach wird die Referenz nur
mit ausreichender Sprache langsam nachgeführt (30 s Halbwertszeit in stimmhafter
Zeit; Prototyp-Heuristik). Stille, unvoiced Rauschen und kurze Pegelspitzen dürfen
die Referenz nicht absenken. Eine länger anhaltende Änderung wird zunächst
angezeigt und danach schrittweise zur Referenz; das ist keine absolute Aussage
über die geeignete Sprechlautstärke. Wortbasiertes Tempo bleibt separat.

## Vereinfachter Review und kontextbezogene Fragen (24.10.2026)

Nutzerauftrag: Review im Stil des Live-Monitorings; zwei Hauptschritte statt
mehrerer gleichzeitiger Analyse-Panels. **Review moments** spielt markierte
Abschnitte mit Kontext und zeitgenauen Anmerkungen; **Practice questions**
führt einen Dialog mit einer Frage pro Schritt. Die Wiedergabe-Fenster nutzen
das lokale Vollvideo; serverseitige Clip-Dateien sind gemäß aktuellem Backend-Vertrag nicht vorgesehen. Transkript und technische Details bleiben
aufklappbar.

Vor dem Take: Auf `/sources` neben dem Datei-Upload den Präsentationstyp wählen:
Startup-Pitch, Bachelor-Verteidigung oder Schulvortrag. Nonprofit ist nicht mehr
auswählbar; bestehende Aufnahmen bleiben kompatibel.
Die Auswahl bleibt über Navigation und Reload erhalten und wird beim
Aufnahmestart im Take festgehalten. In Sprachdialog und getippter Fragerunde
verändert derselbe Typ Rolle und Frageschwerpunkte, ohne Noten oder Scores. Der
Nutzer hat ElevenLabs für den Sprachdialog beauftragt und konfiguriert den
Agenten selbst nach der Implementierung. Im Web ist die getippte Fragerunde
auf Nutzerwunsch entfernt; die bestehende API bleibt kompatibel.
Schnelleres Sprechen beim aktuellen Eleven v4 Turbo über Audio-Pacing-Tags,
ohne festen Geschwindigkeitsfaktor. Einrichtung: `docs/07-review-and-agent.md`.

### Auswertung nach der Fragerunde (24.10.2026)

Nutzerauftrag: Nach den Agenten-Fragen eine Auswertung des Vortrags. Sobald
jede Frage der getippten Runde beantwortet ist, zeigt der Web-Review unten eine
Zusammenfassung mit Score 0–100 und drei Kategorien: **Inhalt** (Fakten und
Wissen, Gewicht 0,5 — Anteil quellengestützter Aussagen und Antwort-Urteile),
**Stimme** (0,25) und **Gestik** (0,25 — Abzug je Marker pro Minute). Dazu
evidenzbasierte Stärken, Übungsvorschläge und ein aufklappbarer
Methoden-/Grenzen-Hinweis. Der Score ist eine transparente Client-Heuristik aus
bereits gemessenen Events (`evidence-count-heuristic.v1`), keine Note und keine
Personenbewertung; Details: `docs/07-review-and-agent.md`. Diese Auswertung ist
**getrennt** von den drei Review-Scores (`evidence-share-v1`): andere Formel,
andere Bezugsgröße, kein gemeinsamer Gesamtscore. Die UI soll die beiden
Ergebnisse entsprechend benennen; eine Vereinheitlichung ist offen
(`docs/14-open-todos.md`).

## Deep Research (24.10.2026)

Die Produktentscheidungen sind in `docs/11-deep-research-validation.md`
evidenzgeordnet. Wichtig für die Produktzusage: Der Fact-Check ist eine
quellengebundene Prüfung mit Zitat-Gate, keine Wahrheitsgarantie; „nicht
gefunden“ ist nicht „falsch“. Der geplante TTS-Voice-Agent soll im Gespräch kurzes
aufgabenbezogenes Feedback, die vollständige Evidenz steht im Review. Harte
Grenzen des Plans: 3–5 Hauptfragen, ein Follow-up, 10 Minuten Hard Stop. Umgesetzt
ist bisher das Maximum von fünf Anfangsfragen im getippten Pfad; ein
Sitzungstimer oder ein globales Follow-up-Limit ist noch nicht implementiert.
Scores gibt es nur in der transparenten Auswertung nach der getippten
Fragerunde (siehe oben); weiterhin keine Personenbewertung.

# AGENTS.md — Hackathon Fulda 2026

> **Einstiegspunkt für Menschen und Agents.**
> Lies dieses File zuerst. Das Thema ist fix.

---

## 0. Mission & Status

**Mission:** Beim 8. Hackathon Fulda (24.–25.10.2026) einen funktionsfähigen
**Live-Präsentationstrainer** bauen.

**Status (24.10.2026):**
- Thema und Feature-Rahmen sind **fix**.
- Die fünf Features sind **erste Beschreibungen**, kein ausgearbeitetes Konzept.
- Alte Viva-Unterlagen und Research sind gelöscht.
- Kein Feature hinzufügen, das nicht in `docs/01-product.md` steht.

**Ein Satz:** *Ein Live-Präsentationstrainer, der Auftritt und Sprache
analysiert, Feedback timestamp-genau zurückspulbar macht und danach Fragen
simuliert.*

---

## 1. Fixe Features

| # | Feature |
|---|---|
| 1 | Live Posture / Gesture / Eye Tracking |
| 2 | Audio-Transkription; Fact-Checking über Daten-Upload und Web-Fetch-Agent |
| 3 | Pausen, Zögern, Sprechtempo, Füllwörter (Liste offen: „…“) |
| 4 | Nach dem Feedback zurückscrollen und Fehler timestamp-basiert ansehen |
| 5 | Frage-Simulator im Anschluss (Details offen) |

**Wichtig:** Das sind erste Feature-Beschreibungen. Keine Scores,
Schwellenwerte, Modelle, UI-Details oder zusätzlichen Features erfinden.
Offene Punkte stehen in `docs/01-product.md`, Abschnitt 3.

---

## 2. Harte Fakten

| Punkt | Fakt |
|---|---|
| Event | 8. Hackathon Fulda, 24.–25.10.2026 |
| Ort | Hochschule Fulda, Halle 8 |
| Thema | Future Education – Lernen, Lehren und Prüfen neu denken |
| Unser Produkt | Live-Präsentationstrainer (eigene Challenge; keine Pflicht-Challenge) |
| Beispiel-Challenges | 6 Vorschläge, ausdrücklich nur Orientierung |
| Team | mind. 8 Mitglieder (laut Mail; vor Ort bestätigen) |
| Registrierung | https://hackathon.kaleidoscode.de/register-team |
| Challenge | `Challenge_HackathonFulda2026_de.pdf` (24.10.2026); Original: https://transfer.kaleidoscode.de/s/JRjZfZ6KEk23KgK |
| Bewertung | 40 % Pitch (3 Min + 2 Min AI Reflection), 40 % Produktreview, 20 % Technik |
| Prototyp | lauffähig, eigenständig testbar, Web auf Laptop/Smartphone |
| WLAN | SSID `Hackathon`, Passwort `Hackathon2026` |

**Harte Deadlines:**

| Zeit | Was |
|---|---|
| Sa 10:30 | Scope locked (erledigt: Thema fix) |
| Sa 11:00 | Coding-Start |
| Sa 17:30 | Coachings (1–2 Personen) |
| Sa 19:30 | Pitch-Coaching |
| So 09:30 | **Feature Freeze** |
| So 10:30 | **Jury-Walkthrough** — Prototyp lauffähig, 2–3 Min Erklärung |
| So 10:45 | **Submission** (Puffer; Coding endet 11:00) |
| So 12:15 | **Pitch** (3 + 2 Minuten) |

---

## 3. Leseordnung

Lies nur, was du für die Aufgabe brauchst:

1. **`docs/01-product.md`** — fixe Features, offene Entscheidungen.
2. **`docs/00-requirements.md`** — Hackathon-Regeln, Bewertung, Checklisten.
3. **`docs/02-ai-decision-log.md`** — tatsächliches Log für die AI Reflection;
   Vorlage: `templates/ai-decision-log.md`.
4. **`templates/team-roles.md`** — Rollen, Gates, RACI.

---

## 4. Repo-Map

```
AGENTS.md                          # Einstiegspunkt
compose.yaml                       # lokales Backend + PostgreSQL + S3
.env.example                       # lokale Konfiguration ohne echte Secrets
backend/                           # FastAPI, MediaPipe, Setup und Smoke-Test
.run/                              # geteilte IntelliJ-Run-Konfigurationen
.vscode/                           # geteilte VS-Code-Tasks und Debug-Konfiguration
Challenge_HackathonFulda2026_de.pdf # offizielle Challenge
docs/
  00-requirements.md               # Hackathon-Regeln und Bewertung
  01-product.md                    # fixe Features + offene Punkte
  02-ai-decision-log.md            # tatsächliche Entscheidungen und Prüfergebnisse
templates/
  ai-decision-log.md               # AI Reflection
  team-roles.md                    # Rollen, Gates, RACI
```

---

## 5. Regeln für Build und Agents

1. **Thema ist fix.** Kein Pivot, keine neuen Produktideen.
2. **Keine erfundenen Features.** Nur die fünf Features aus
   `docs/01-product.md`; Details offen markieren statt raten.
3. **Keine erfundenen Zahlen.** Keine Schwellenwerte, Genauigkeiten oder
   Marktgrößen ohne Quelle.
4. **Keine echten personenbezogenen Daten.** Demo-Daten synthetisch.
5. **Datenspeicherung ist offen.** Vor Audio-/Video-/Transkript-Speicherung
   entscheiden und dokumentieren.
6. **AI Decision Log** ab Coding-Start führen, mindestens 5 Einträge.
7. **Öffentliche URL + QR-Code.** Kein Login, keine Installation.
8. **90-Sekunden-Wert.** Der Prototyp muss ohne Erklärung funktionieren.
9. **Laptop + Smartphone testen.**
10. **Deterministischer Fallback**, wenn Modell oder API ausfällt.
11. **AI Reflection nicht erfinden.** Nur echte Fehler und Korrekturen.
12. **Keine Überclaims.** „In unserem Prototyp …“ statt „validiert“.
13. **Feature Freeze So 09:30.** Danach nur Bugfixes und Demo-Härtung.
14. **Submission vor 11:00 Sonntag.**

---

## 6. Offene Punkte (nicht raten)

Die vollständige Liste steht in `docs/01-product.md`, Abschnitt 3. Kurz:

1. Zielgruppe und Setting.
2. Metriken, Schwellenwerte, Scores und Live-vs.-Post-Analyse.
3. Fact-Check: Upload-Formate, Web-Quellen, Umgang mit „keine Quelle“.
4. Frage-Simulator: Anzahl, Modus, Bewertung.
5. Speicherung und Löschung von Audio, Video, Transkript.
6. Webcam-basiertes Eye Tracking oder Hardware.
7. Hosting, Modelle, Latenz und Fallback; lokaler Stack: `backend/README.md`.
8. Produktname.

---

## 7. Nächste Schritte

- [ ] Offene Punkte priorisieren; nur entscheiden, was für den vertikalen Slice
      nötig ist.
- [x] Lokalen Backend-Stack und Docker Compose anlegen.
- [ ] Hosting festlegen; „Hello World“ deployen.
- [ ] Vertikalen Slice bauen: Live-Input → Transkript → Feedback-Timeline →
      Frage-Simulator.
- [x] AI Decision Log starten (`docs/02-ai-decision-log.md`).
- [ ] Laptop-/Smartphone-Test und Fallback vorbereiten.
- [ ] Pitch und AI Reflection aus dem Log ableiten.

---

## 8. Quellen

- Offizielle Challenge-PDF: `Challenge_HackathonFulda2026_de.pdf` (24.10.2026).
- Organisator-Mails, konsolidiert in `docs/00-requirements.md`.
- Feature-Beschreibungen des Teams vom 24.10.2026, festgehalten in
  `docs/01-product.md`.

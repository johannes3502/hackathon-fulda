# AGENTS.md — Hackathon Fulda 2026

> **Einstiegspunkt für Menschen und Agents.**
> Lies dieses File zuerst. Es sagt dir, was das Ziel ist, was hart ist, was du
> als Nächstes tun musst und welche Dokumente du wann lesen sollst.

---

## 0. Mission & Status

**Mission:** Beim 8. Hackathon Fulda (24.–25.10.2026) mit einem
funktionsfähigen, evidenzbasierten und menschzentrierten Future-Education-
Prototyp gewinnen.

**Status (23.10.2026, Abend):**
- Anforderungen aus den Organisator-Mails sind konsolidiert.
- Deep Research zu Future Education/EdTech ist abgeschlossen.
- Projektideen sind bewertet; **Empfehlung: Viva** (mündliche Verteidigung).
- Die offizielle Challenge-Beschreibung ist **bis Samstagmorgen gesperrt**.
- Team, Rollen und Stack müssen heute/morgen früh bestätigt werden.

**Ein Satz:** *Viva ist der Übungsraum, in dem KI nachfragt und der Mensch
entscheidet.*

---

## 1. Harte Fakten

| Punkt | Fakt |
|---|---|
| Event | 8. Hackathon Fulda, 24.–25.10.2026 |
| Ort | Hochschule Fulda, Halle 8 |
| Thema | Future Education — Lernen neu denken |
| Formate | KI-Tutor, interaktive Lernsimulation, Serious Game, neuer Ansatz |
| Team | mind. 8 Mitglieder (laut Mail; vor Ort bestätigen) |
| Registrierung | https://hackathon.kaleidoscode.de/register-team (ab Sa morgen) |
| Challenge | https://transfer.kaleidoscode.de/s/JRjZfZ6KEk23KgK (passwortgeschützt) |
| Bewertung | 40 % Pitch (3 Min + 2 Min AI Reflection), 40 % Produktreview, 20 % Technik |
| Prototyp | lauffähig, eigenständig testbar, Web auf Laptop/Smartphone |
| WLAN | SSID `Hackathon`, Passwort `Hackathon2026` |

**Harte Deadlines:**

| Zeit | Was |
|---|---|
| Sa 10:30 | **Idee & Scope locked** — danach bauen, nicht strategieren |
| Sa 11:00 | Coding-Start |
| Sa 17:30 | Coachings (1–2 Personen) |
| Sa 19:30 | Pitch-Coaching |
| So 09:30 | **Feature Freeze** |
| So 10:30 | **Jury-Walkthrough** — Prototyp lauffähig, 2–3 Min Erklärung |
| So 10:45 | **Submission** (Puffer; Coding endet 11:00) |
| So 12:15 | **Pitch** (3 + 2 Minuten) |

---

## 2. Leseordnung (context-efficient)

Lies **nur**, was du für deine Aufgabe brauchst. Reihenfolge:

1. **`docs/00-requirements.md`** — alle Anforderungen, Regeln, Checklisten.
   Pflicht für alle.
2. **`docs/01-challenge.md`** — Interpretation, Sieger-These,
   Samstagmorgen-Protokoll, Pivot-Matrix.
3. **`docs/03-project-ideas.md`** — 8 Ideen, Scoring, Empfehlung, Pivots.
4. **`docs/04-build-plan-viva.md`** — wenn Viva gebaut wird: Scope,
   Architektur, Datenmodell, Pipeline, 24h-Plan, Rollen, Tests.
5. **`docs/06-prompt-pack.md`** — Prompts, JSON-Schemata, Quote-Verifier,
   Red-Team-Tests, Model Card. Wenn du die KI-Pipeline baust.
6. **`docs/05-pitch-playbook.md`** — 3+2-Minuten-Skript, Q&A, Produktreview,
   One-Pager.
7. **`docs/02-deep-research.md`** — Evidenz-Synthese. Selektiv lesen, wenn du
   eine Behauptung belegen oder eine Designentscheidung begründen musst.
8. **`research/raw/*.md`** — Rohresearch. Nur für spezifische Fragen; nicht
   komplett lesen.

**Für Agents:** Wenn du eine Aufgabe bearbeitest, lies das kleinste passende
Dokument. Schreibe neue Research-Notizen nach `research/raw/`. Ändere
`docs/00-requirements.md` nur, wenn du eine bestätigte Quelle hast, und
datiere die Änderung.

---

## 3. Repo-Map

```
AGENTS.md                      # dieser Einstiegspunkt
docs/
  00-requirements.md           # Anforderungen, Regeln, Deadlines, Checklisten
  01-challenge.md              # Challenge-Interpretation + Samstag-Protokoll
  02-deep-research.md          # Evidenz-Synthese mit Quellen
  03-project-ideas.md          # 8 Ideen, Scoring, Empfehlung, Pivots
  04-build-plan-viva.md        # 24h-Build-Plan für Viva
  05-pitch-playbook.md         # Pitch, AI Reflection, Q&A, Produktreview
  06-prompt-pack.md            # Prompts, Schemata, Quote-Verifier, Red-Team
research/
  raw/
    ai-tutors.md               # KI-Tutoren, LLM-Tutoring, Guardrails
    learning-science.md       # Lernmechanismen, Future Skills, DE-Kontext
    games-simulations.md       # Serious Games, Simulationen, XR, Debriefing
    assessment-ethics-regulation.md  # Assessment, AI Literacy, EU AI Act, DSGVO
    trends-hackathon.md        # EdTech-Trends, Fulda-Historie, Hackathon-Strategie
templates/
  ai-decision-log.md           # Pflicht: KI-Fehler/Entscheidungen für die Reflection
  demo-test-script.md          # 90-Sekunden-Jury-Test + Testmatrix
  team-roles.md                # 8 Rollen, Gates, RACI, Standups
  one-pager.md                 # Jury-Handout
```

---

## 4. Empfehlung: Viva

**Problem:** KI hat schriftliche Arbeiten als Verständnisnachweis
destabilisiert; Detektoren sind unzuverlässig; mündliche Prüfungen skalieren
nicht.

**Lösung:** Viva extrahiert zentrale Behauptungen aus einer Arbeit, stellt
evidenzgebundene Nachfragen und gibt eine formative Evidenzkarte. Die Lehrkraft
sieht Lücken und entscheidet, wer ein menschliches Viva braucht.

**Warum es gewinnen kann:**
- **40 % Produktreview:** Der Juror erlebt in 90 Sekunden, ob er seinen eigenen
  Text erklären kann. Kein Login, sofort verständlich.
- **40 % Pitch:** Starke „Why now“-Story (AI + Assessment-Integrität),
  überraschende Lösung (KI fragt, statt zu antworten), glaubwürdige
  AI Reflection.
- **20 % Technik:** Claim-Extraktion, Quote-Verifier, Rubrik, Human Review,
  optional Speech — sinnvoller Technologieeinsatz statt Chat-Wrapper.

**Pitch in drei Sätzen:**
1. „KI hat die Hausarbeit als Verständnisnachweis destabilisiert — Detektoren
   helfen nicht, mündliche Prüfungen skalieren nicht.“
2. „Viva macht das Gespräch über Verständnis übbar: Die KI fragt
   evidenzgebunden nach, der Mensch entscheidet.“
3. „Kein Zitat, keine Behauptung — und keine Note.“

**Fallbacks, falls die Challenge oder das Team pivotiert:**
- **AI Literacy Lab** (Hallucination Hunt): niedrigstes technisches Risiko,
  höchste Theme-Fit, sofort spielbar.
- **Klassenzimmer-Simulator:** bestes Fit zu „interaktive Simulation“.
- **Socratic Lock:** bestes Fit zu „KI-Tutor“, starker kontraintuitiver Hook.

Entscheidung am Samstag um **10:30**. Danach wird gebaut.

---

## 5. Non-Negotiables

1. **Ein vertikaler Slice.** Eine Nutzerreise, ein Demo-Pfad, eine Rubrik.
2. **Öffentliche URL + QR-Code.** Kein Login, keine Installation.
3. **90-Sekunden-Wert.** Der Prototyp muss ohne Erklärung funktionieren.
4. **Laptop + Smartphone getestet.**
5. **Seed-Daten + Reset.**
6. **Deterministischer Fallback**, wenn LLM/API ausfällt.
7. **Jede KI-Behauptung mit verifiziertem Zitat** oder „nicht genug Evidenz“.
8. **Human-in-the-loop** bei allem, was wie Bewertung aussieht.
9. **Keine echten personenbezogenen Daten**, kein Audio-Storage, keine
   Detektion/Proctoring/Emotion AI.
10. **AI Decision Log** ab Samstag 11:00 führen — mindestens 5 Einträge.
11. **3:00 + 2:00 geprobt.** Kein Overrun.
12. **Submission vor 11:00 Sonntag.**

---

## 6. Samstagmorgen-Protokoll

### 09:00–09:30 — Ankommen
- Registrierung, Plattform-Zugang, WLAN/LAN, API-Erreichbarkeit testen.
- Challenge-Seite öffnen und Passwort notieren.

### 09:30–10:00 — Challenge lesen
- Themenfelder, Pflichten, Sponsoren, Daten, Ausschlüsse.
- Bewertung/Rubrik gegen die Mail prüfen.
- Offene Fragen notieren und die Orga fragen.

### 10:00–10:20 — Mapping
- Welches Feld passt zu Viva? Welche zwei Pivots?
- Welche Story/Folie ändert sich, welche Technik bleibt?

### 10:20–10:30 — Entscheidung
- **Eine Idee. Ein Nutzer. Eine Kernschleife.**
- Rollen bestätigen; Scope auf ein Essay, eine Rubrik, einen Pfad.
- **10:30: Lock.**

### 10:30–11:00 — Build-Setup
- Repo, Deploy, API-Key, DB, Seed-Daten.
- Erste Tasks; AI Decision Log starten.

**Wenn die Challenge Viva nicht hergibt:** Pivot-Matrix in
`docs/01-challenge.md` nutzen. Framing ändern, Technik behalten.

---

## 7. Build-Workflow (sobald Code existiert)

- **Stack:** Next.js + Tailwind; API Routes oder FastAPI; Supabase/Postgres
  oder localStorage; Vercel.
- **Deploy früh:** „Hello World“ am Samstag vor 12:30 öffentlich.
- **Testen:** `npm run lint`, `npm run build`, `npm test` (Commands werden
  ergänzt, sobald das Repo steht).
- **Mobile:** 375 px und 1366 px testen; kein Horizontal-Scroll.
- **API:** Timeout 25 s, 2 Retries, Cache für Demo, Fallback-Provider.
- **Speech:** Web Speech API optional; Text ist Default; kein Audio-Storage.
- **Daten:** synthetisch; keine echten Namen/Matrikelnummern/E-Mails.
- **Logging:** Session-Events + Audit-Log; keine sensiblen Inhalte loggen.

**Definition of Done:** siehe `docs/04-build-plan-viva.md`, Abschnitt 15.

---

## 8. AI Reflection & Pitch

- **AI Decision Log** ab Samstag 11:00 füllen
  (`templates/ai-decision-log.md`).
- Mindestens **5 Einträge**: Aufgabe, KI-Output, was falsch/riskant war,
  menschliche Korrektur, Evidenz.
- Am Sonntag **2 Beschleunigungen** und **2 Fehler/Korrekturen** auswählen.
- **2-Minuten-Struktur:** Rahmen → Beschleunigung → menschliche Entscheidungen
  → Fehler/Korrekturen → Prinzip.
- **Nicht erfinden.** Die Jury merkt es.
- **Pitch proben:** 3:00 + 2:00 mit Timer; 20 % kürzen; Fallback-Video.

Details: `docs/05-pitch-playbook.md`.

---

## 9. Offene Punkte (am Samstag klären)

1. Themenfelder der Challenge: Welche? Pflicht oder Inspiration?
2. Gibt es Pflicht-Szenarien, Daten oder Ausschlüsse?
3. Exakte 40/40/20-Anwendung und Tie-Breaker?
4. Submission-Cutoff und Upload-Format?
5. Pitch-Deck erforderlich? Format/Seitenverhältnis?
6. Dürfen externe APIs genutzt werden? Netzwerk-Restriktionen?
7. Ist „mindestens 8“ hart oder Empfehlung?
8. Gibt es einen „Best Code“-Preis (Website vs. Mail)?
9. Wo steht die Jury beim Walkthrough? Strom/Display?
10. Datenschutzvorgaben für Demo-Daten?

---

## 10. Nächste Aktionen (jetzt)

### Heute (Freitagabend)
- [ ] Team bestätigen; 8 Rollen besetzen (`templates/team-roles.md`).
- [ ] Stack entscheiden; Repo anlegen; „Hello World“ deployen.
- [ ] LLM-API-Key + Fallback-Provider testen.
- [ ] Seed-Essay 1 + Rubrik entwerfen.
- [ ] QR-Code-Generator und Demo-Geräte bereitstellen.
- [ ] Dieses Repo an das Team teilen; Leseordnung kommunizieren.

### Samstag früh
- [ ] Challenge-Seite lesen; offene Punkte klären.
- [ ] 10:30 Entscheidung; Scope locken.
- [ ] AI Decision Log starten.
- [ ] Build starten.

### Sonntag
- [ ] 09:30 Feature Freeze.
- [ ] 10:30 Walkthrough.
- [ ] 10:45 Submission.
- [ ] 12:15 Pitch.

---

## 11. Regeln für Agents & Subagents

- **Kontext sparen:** Lies das kleinste passende Dokument; nicht die gesamte
  Research.
- **Research:** Neue Notizen nach `research/raw/<thema>.md`; Quellen mit URL und
  Typ (`[P]`, `[WP]`, `[PP]`, `[POL]`, `[V]`).
- **Keine Erfindungen:** Wenn eine Zahl/ein Zitat nicht belegt ist, markiere sie
  als unsicher oder lasse sie weg.
- **Docs ändern:** Nur mit Quelle; Datum und Grund notieren.
- **Keine Overclaims:** „In unserem Pilot …“ statt „validiert“; „designed for
  human oversight“ statt „AI Act compliant“.
- **Code:** Keine Secrets committen; `.env` nutzen; synthetische Daten.
- **Subagent-Rückgabe:** Max. 300 Wörter, 5–8 Quellen, klare Unsicherheiten.
  Volle Notizen in Dateien, nicht in die Antwort.
- **Eine Idee:** Nicht mehrere Konzepte gleichzeitig bauen. Pivot nur am
  Samstag vor 10:30.

---

## 12. Quellen & Updates

- **Source of Truth:** `docs/00-requirements.md` (Organisator-Mails) und die
  offizielle Challenge-Seite (ab Samstag).
- **Challenge-Seite:** am 23.10.2026 ohne Passwort nicht zugänglich.
- **Website:** https://hackathon-fulda.de
- **„eatec“** aus dem Auftrag wird als **EdTech / Education Technology**
  interpretiert.
- **Stand:** 23.10.2026. Änderungen datieren und begründen.

---

**Wenn du nur einen Satz mitnimmst:**
> **Baue Viva: Die KI fragt nach, statt zu antworten. Kein Zitat, keine
> Behauptung. Der Mensch entscheidet.**

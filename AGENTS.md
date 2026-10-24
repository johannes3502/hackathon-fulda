# AGENTS.md — Hackathon Fulda 2026

> **Einstiegspunkt für Menschen und Agents.**
> Lies dieses File zuerst. Es sagt dir, was das Ziel ist, was hart ist, was du
> als Nächstes tun musst und welche Dokumente du wann lesen sollst.

---

## 0. Mission & Status

**Mission:** Beim 8. Hackathon Fulda (24.–25.10.2026) mit einem
funktionsfähigen, evidenzbasierten und menschzentrierten Future-Education-
Prototyp gewinnen.

**Status (24.10.2026, 10:00):**
- Die offizielle Challenge liegt als PDF vor
  (`Challenge_HackathonFulda2026_de.pdf`).
- Sechs Beispiel-Challenges; ausdrücklich Orientierung, keine Pflicht-Challenge.
  Eigene Ideen sind erlaubt.
- **Viva passt primär zu Challenge #1 „Prüfungen im Zeitalter von KI“ und
  sekundär zu #6 „KI als kritischer Lernbegleiter“.**
- **Eigene Challenge ist ausdrücklich erlaubt:** Die sechs Challenges sind nur
  Orientierung. Viva ist unsere eigene Challenge; #1/#6 sind unser Fit, kein
  Pflichtrahmen.
- Team, Rollen und Stack jetzt bestätigen; **10:30 Scope lock**.

**Ein Satz:** *Viva ist der Übungsraum für faire, aussagekräftige Prüfungen im
KI-Zeitalter: Die KI fragt nach und widerspricht, der Mensch entscheidet.*

---

## 1. Harte Fakten

| Punkt | Fakt |
|---|---|
| Event | 8. Hackathon Fulda, 24.–25.10.2026 |
| Ort | Hochschule Fulda, Halle 8 |
| Thema | Future Education – Lernen, Lehren und Prüfen neu denken |
| Beispiel-Challenges | 6: Prüfungen im KI-Zeitalter; smarte Steuerung; Social Learning; KI-Bewerbungscoach; Orientierung Arbeitswelt; KI als kritischer Lernbegleiter |
| Unser Fit | **#1 primär**, **#6 sekundär**; keine Pflicht-Challenge, eigene Ideen erlaubt |
| Team | mind. 8 Mitglieder (laut Mail; vor Ort bestätigen) |
| Registrierung | https://hackathon.kaleidoscode.de/register-team (ab Sa morgen) |
| Challenge | `Challenge_HackathonFulda2026_de.pdf` (24.10.2026); Original: https://transfer.kaleidoscode.de/s/JRjZfZ6KEk23KgK |
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
Challenge_HackathonFulda2026_de.pdf  # offizielle Challenge (24.10.2026)
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

**Challenge-Fit:** Viva ist primär eine Lösung für **Challenge #1 „Prüfungen
im Zeitalter von KI“** und sekundär für **#6 „KI als kritischer Lernbegleiter
in der Hochschullehre“**. #1 fordert faire, aussagekräftige und möglichst
täuschungssichere Prüfungen; #6 fordert eine KI, die widerspricht, nachfragt
und Argumentationslücken aufzeigt. Viva macht beides — ohne KI-Detection.

**Problem:** KI hat schriftliche Arbeiten als Verständnisnachweis
destabilisiert; Detektoren sind unzuverlässig; mündliche Prüfungen skalieren
nicht. Die Challenge #6 ergänzt: KI bestätigt oft bestehende Annahmen, statt
sie kritisch zu prüfen.

**Lösung:** Viva extrahiert zentrale Behauptungen aus einer Arbeit, stellt
evidenzgebundene Nachfragen, fordert mindestens einmal eine Gegenposition und
gibt eine formative Evidenzkarte. Die Lehrkraft sieht Lücken und entscheidet,
wer ein menschliches Viva braucht. **Viva erkennt keine KI und verspricht keine
Täuschungssicherheit; es verschiebt den Nachweis auf Erklärungskompetenz.**

**Warum es gewinnen kann:**
- **Challenge-Fit:** trifft #1 und #6 wörtlich, statt nur allgemein „Future
  Education“ zu bedienen.
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
   evidenzgebunden nach, widerspricht und zeigt Argumentationslücken; der Mensch
   entscheidet.“
3. „Kein Zitat, keine Behauptung — und keine Note.“

**Fallbacks, falls die mündliche Einweisung oder das Team pivotiert:**
- **Socratic Lock:** bester Fit zu #6, wenn die Jury stärker Tutor/Guardrails
  sehen will.
- **AI Literacy Lab** (Hallucination Hunt): niedrigstes technisches Risiko,
  guter Fit zu #6/#3, sofort spielbar.
- **Klassenzimmer-Simulator:** eigene Idee/#2; bestes Fit zu „interaktive
  Simulation“, falls die Challenge dorthin zeigt.
- **SkillPass** (#2/#5) und **Azubi Talk** (#4), falls die Challenge klar in
  Richtung Studien-/Berufsorientierung oder Bewerbung geht.

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
13. **Keine Detection, keine Täuschungssicherheit versprechen.** Viva macht
    Erklärungskompetenz sichtbar; der Mensch entscheidet.
14. **Eigene Challenge ist erlaubt.** #1/#6 sind unser Fit, kein Pflichtrahmen.

---

## 6. Samstagmorgen-Protokoll

### 09:00–09:30 — Ankommen
- Registrierung, Plattform-Zugang, WLAN/LAN, API-Erreichbarkeit testen.
- Challenge-PDF gegen die mündliche Einweisung prüfen.

### 09:30–10:00 — Challenge abgleichen
- Sechs Beispiel-Challenges: Stimmen sie mit der PDF überein?
- Gibt es zusätzliche Pflicht-Szenarien, Daten oder Ausschlüsse?
- Bewertung/Rubrik gegen die Mail prüfen.
- Offene Fragen notieren und die Orga fragen.

### 10:00–10:20 — Mapping
- **Primär:** Challenge #1 „Prüfungen im Zeitalter von KI“.
- **Sekundär:** Challenge #6 „KI als kritischer Lernbegleiter“.
- Pivots: Socratic Lock, AI Literacy Lab, Klassenzimmer-Simulator.
- Welche Story/Folie ändert sich, welche Technik bleibt?

### 10:20–10:30 — Entscheidung
- **Eine Idee. Ein Nutzer. Eine Kernschleife.**
- Rollen bestätigen; Scope auf ein Essay, eine Rubrik, einen Pfad.
- **10:30: Lock.**

### 10:30–11:00 — Build-Setup
- Repo, Deploy, API-Key, DB, Seed-Daten.
- Erste Tasks; AI Decision Log starten.

**Wichtig:** Die Challenge fordert „möglichst täuschungssicher“. Viva
verspricht **keine** Detection und **keine** Täuschungssicherheit. Es verschiebt
den Nachweis von der Texturheberschaft auf die Erklärungskompetenz. Diesen
Unterschied im Pitch explizit machen.

**Wenn die mündliche Einweisung Viva nicht hergibt:** Pivot-Matrix in
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

1. Gibt es zusätzliche Pflicht-Szenarien, Daten oder Ausschlüsse? Die PDF nennt
   die sechs Challenges ausdrücklich als Orientierung.
2. Exakte 40/40/20-Anwendung und Tie-Breaker? Gibt es ein Scoring-Sheet?
3. Submission-Cutoff und Upload-Format?
4. Pitch-Deck erforderlich? Format/Seitenverhältnis?
5. Dürfen externe APIs genutzt werden? Netzwerk-Restriktionen?
6. Ist „mindestens 8“ hart oder Empfehlung?
7. Gibt es einen „Best Code“-Preis? (Mail sagt Nein; vor Ort bestätigen.)
8. Wo steht die Jury beim Walkthrough? Strom/Display?
9. Datenschutzvorgaben für Demo-Daten?
10. Gibt es zusätzliche Preise/Kategorien?

---

## 10. Nächste Aktionen (jetzt)

### Jetzt (Sa 10:00–10:30)
- [x] Challenge-PDF gelesen; #1/#6 als stärksten Fit identifiziert.
- [ ] Team bestätigen; 8 Rollen besetzen (`templates/team-roles.md`).
- [ ] Eigene Challenge/Scope bestätigen; **10:30 Lock**.
- [ ] Stack entscheiden; Repo/Deploy/API testen.
- [ ] Seed-Essay 1 + Rubrik entwerfen.
- [ ] AI Decision Log anlegen.

### Samstag ab 11:00
- [ ] Build starten.
- [ ] Deploy „Hello World“ vor 12:30.
- [ ] AI Decision Log ab 11:00 führen.

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
  offizielle Challenge-PDF (`Challenge_HackathonFulda2026_de.pdf`, 24.10.2026).
- **Challenge-PDF:** sechs Beispiel-Challenges, ausdrücklich als Orientierung;
  eigene Ideen erlaubt. Original:
  https://transfer.kaleidoscode.de/s/JRjZfZ6KEk23KgK
- **Website:** https://hackathon-fulda.de
- **„eatec“** aus dem Auftrag wird als **EdTech / Education Technology**
  interpretiert.
- **Stand:** 24.10.2026. Änderungen datieren und begründen.

---

**Wenn du nur einen Satz mitnimmst:**
> **Baue Viva: Die KI fragt nach, statt zu antworten. Kein Zitat, keine
> Behauptung. Der Mensch entscheidet.**

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

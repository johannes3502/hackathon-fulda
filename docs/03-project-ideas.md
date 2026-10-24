# Projektideen — mit dem Ziel, den Hackathon zu gewinnen

**Grundlage:** `docs/00-requirements.md` (Bewertung 40/40/20),
`docs/01-challenge.md` (offizielle Challenge, sechs Beispiel-Challenges) und
`docs/02-deep-research.md` (Evidenz).
**Stand:** 24.10.2026, nach Bekanntgabe der offiziellen Challenge-PDF.

> Die sechs Beispiel-Challenges sind ausdrücklich **Orientierung, keine
> Pflicht**. Eigene Ideen sind erlaubt. Viva ist unsere eigene Challenge und
> trifft zugleich **#1 „Prüfungen im Zeitalter von KI“** (primär) und **#6 „KI
> als kritischer Lernbegleiter“** (sekundär). Am Samstag wird nicht die Technik
> neu erfunden, sondern die Story auf die mündliche Einweisung und die
> Teamstärke abgestimmt.

---

## 1. Bewertungslogik

Die Jury bewertet:
- **40 % Produktreview:** Eine separate Jury testet den Prototyp praktisch.
  Entscheidend: Funktioniert er ohne Erklärung? Zeigt er in unter 3 Minuten
  Wert? Ist er auf Laptop/Smartphone nutzbar?
- **40 % Pitch:** 3 Minuten Idee/Nutzen/Lösung + 2 Minuten AI Reflection.
  Entscheidend: klare Story, glaubwürdige Demo, ehrliche und konkrete
  KI-Reflexion.
- **20 % Technologie & Umsetzung:** Sinnvoller Technologieeinsatz, keine
  Code-Menge. Entscheidend: Architektur, Guardrails, messbarer Effekt.

Die Scores unten sind **Pre-Build-Schätzungen** (1–5), keine Garantie.

| Idee | Produkt (40 %) | Pitch (40 %) | Tech (20 %) | Gewichtet | Challenge-Fit | Risiko |
|---|---|---:|---:|---:|---|---|
| **Viva / Nachgefragt** | 5,0 | 5,0 | 4,0 | **4,8** | **#1 + #6 (sehr stark)** | Mittel |
| Socratic Lock | 4,0 | 5,0 | 4,0 | 4,4 | #6 (stark), #1 (mittel) | Mittel |
| Klassenzimmer-Simulator | 4,5 | 4,5 | 4,0 | 4,4 | eigene Idee / #2 (schwach) | Mittel |
| Failure First Lab | 4,0 | 5,0 | 3,5 | 4,3 | #6 (mittel) | Mittel–hoch |
| AI Literacy Lab | 4,5 | 4,5 | 3,0 | 4,2 | #6 (stark), #3 (schwach) | Niedrig |
| Azubi Talk | 4,5 | 4,0 | 3,5 | 4,1 | #4 (stark), #2 (mittel) | Mittel |
| SkillPass | 3,5 | 3,5 | 4,0 | 3,6 | #2/#5 (stark) | Mittel |
| Recall Coach | 4,0 | 3,5 | 3,0 | 3,6 | #6 (schwach), #1 (schwach) | Niedrig |

**Empfehlung:** **Viva** bauen. Es hat die stärkste Kombination aus
Challenge-Fit (#1 + #6), „Why now“, Demo-Dramatik, Produktreview-Fähigkeit und
einer glaubwürdigen AI-Reflection. Falls das Team am Samstag merkt, dass
Speech/LLM zu riskant ist oder die mündliche Einweisung klar in Richtung
Spiel/Simulation geht: **AI Literacy Lab** oder **Klassenzimmer-Simulator** als
Pivot — die Kernmechanik bleibt jeweils ein interaktiver Dialog mit Evidenz und
Debrief. Viva ist unsere eigene Challenge; die sechs Vorschläge sind kein
Pflichtrahmen.

---

## 2. Idee 1 — Viva / „Nachgefragt“ (Top-Empfehlung)

**Positionierung:** Kein Prüfer, kein Detector. Ein **Trainingsraum für
mündliche Verteidigung**: Die KI fragt nach, der Mensch entscheidet.

**One-Liner:** „KI hat die Hausarbeit als Verständnisnachweis destabilisiert.
Viva stellt die eine Frage, die ein Text nicht beantworten kann: Kannst du
erklären, was du geschrieben hast?“

**Challenge-Fit:**
- **#1 Prüfungen im Zeitalter von KI:** Viva ist kein Detector, sondern ein
  evidenzgebundenes Verständnisgespräch. Es macht Prüfungen fairer (gleiche
  Rubrik, mehrere Fragen, Text-Alternative, Human Review), aussagekräftiger
  (Claim-Bindung, Follow-ups, Transfer) und täuschungsresistenter, ohne
  Täuschungssicherheit zu versprechen: Der Nachweis verschiebt sich von der
  Texturheberschaft auf die Erklärungskompetenz.
- **#6 KI als kritischer Lernbegleiter:** Viva liefert genau das, was die
  Challenge beschreibt — die KI widerspricht, fragt nach und zeigt
  Argumentationslücken. Sie gibt keine Antworten aus und bestätigt keine
  unbegründeten Annahmen.

**Nutzer und Pain:**
- **Studierende:** Bereiten sich auf mündliche Prüfungen, Thesis-Verteidigung
  oder Referate vor; ihnen fehlt eine ehrliche Übung mit Nachfragen.
- **Lehrkräfte/Prüfende:** Müssen Verständnis prüfen, haben aber keine Zeit für
  individuelle Vivas; schriftliche Arbeiten sind als Nachweis unsicher.
- **Berufliche Bildung:** Fachgespräche/Azubi-Prüfungen brauchen mündliche
  Kompetenz; Rollenspiele skalieren nicht.

**Warum jetzt:**
- AI-Detection ist unzuverlässig und umgehbar; Hochschulen verlagern sich auf
  mündliche, authentische und prozessbasierte Assessmentformen. `[POL]`
- Strukturierte Vivas haben brauchbare Reliabilität (≈ 0,7–0,8), aber sie sind
  personalintensiv. `[P]`
- Self-Explanation und Teach-Back sind evidenzstarke Lernmechanismen. `[P]`
- KI kann Fragen generieren und Feedback vorbereiten — die hochstufige
  Entscheidung bleibt menschlich. `[P]`/`[L]`

**Kernschleife (MVP):**
1. **Input:** Essay/Projekttext einfügen oder ein seeded Beispiel wählen.
2. **Claims:** System extrahiert 3–5 zentrale Behauptungen und verankert sie
   als Zitate.
3. **Fragen:** generiert 3–5 adaptive Fragen, jede an ein Zitat gebunden:
   „Du behauptest X in Absatz 3 — welche Evidenz würde deine Aussage
   widerlegen?“; „Du zitierst Y — woran erkennst du, dass Y Z stützt?“
4. **Antwort:** Lernende:r antwortet per Text (Default) oder Sprache (optional).
5. **Follow-up:** Eine Nachfrage, die auf eine Lücke im Antworttext zielt —
   oder ein **Gegenargument**, das eine unbegründete Annahme herausfordert
   (Challenge #6).
6. **Feedback:** Rubrik-basiert, mit Zitaten aus der Antwort: „Du hast A
   erklärt, aber B nur benannt; hier fehlt der kausale Schritt.“
7. **Evidenzkarte:** „sicher erklärt / vage / nicht erklärt“ + „nicht genug
   Evidenz“ statt erfundener Aussagen.
8. **Human Review:** Lehrkraft/Prüfer:in kann Fragen editieren, Feedback
   übersteuern und ein echtes Viva planen. Audit-Log.

**90-Sekunden-Demo:**
- Seed-Essay öffnen (z. B. Biologie, Geschichte, BWL).
- „Viva starten“ → Frage mit Zitat.
- Juror antwortet 20 Sekunden (Text oder Sprache).
- System zeigt Follow-up oder Gegenargument + Evidenzkarte: „Diese Behauptung
  kannst du verteidigen; diese Lücke solltest du üben.“
- Wechsel in Teacher View: „3 von 5 Studierenden brauchen ein menschliches
  Viva; Konzept X ist die häufigste Lücke.“
- Reset.

**Tech (24h):**
- Next.js/React + Tailwind; FastAPI/Node; SQLite oder Supabase.
- LLM mit **strukturiertem JSON** (Claims, Fragen, Rubrik, Zitate).
- **Quote-Verifier:** String-Match der KI-Zitate gegen Input; bei Fehlschlag
  „insufficient evidence“.
- **Speech optional:** Web Speech API (Chrome) + Fallback Text; kein Audio-
  Storage; nur Transkript.
- **Seed-Daten:** 3 Essays mit bekannten Stärken/Lücken; 1 Rubrik mit 4
  Dimensionen; 5 synthetische Studierende.
- **Fallback:** vorbereitete Fragen/Feedback für das Demo-Essay; wenn LLM/API
  ausfällt, deterministischer Pfad.
- **Audit-Log:** Modell, Prompt-Version, Zeit, Entscheidung, Review.

**Evidenz und Claims:**
- „In unserem 10-Personen-Pilot mit 3 synthetischen Essays erkannten X/Y
  Testpersonen die zentrale Lücke nach dem Follow-up.“
- „Unser Quote-Verifier blockierte 3 erfundene Zitate in 20 Testfällen.“
- „Formativ, human-in-the-loop, keine Note.“
- **Nicht:** „AI-Prüfer“, „valide Bewertung“, „AI Act compliant“.

**AI-Reflection-Hooks (2 Minuten):**
- Die KI erfand ein Zitat → Quote-Verifier + „insufficient evidence“.
- Die KI bewertete Eloquenz statt Verständnis → Rubrik-Anker + Evidenzpflicht.
- ASR verhörte einen Fachbegriff → Glossar + Text-Fallback.
- Fragen waren zu generisch → Claim-spezifische Prompt-Schablone + menschliche
  Editierbarkeit.
- Die KI bestätigte eine unbegründete Annahme → Gegenargument-Frage +
  Rubrik-Anker statt Lob.

**Risiken:**
| Risiko | Mitigation |
|---|---|
| Speech/Latenz im lauten Saal | Text als Default; vorbereitete Audio-/Transkript-Demo |
| Bias/Stress | Formativ framen; strukturierte Rubrik; mehrere Fragen; Human Review |
| Datenschutz | Synthetische Daten; kein Audio-Storage; Löschfunktion |
| LLM halluziniert | Quote-Verifier; keine Quote → keine Behauptung |
| „Nur ein Chat“-Eindruck | Evidenzkarte, Teacher View, Audit-Log, sichtbarer Unterschied |

**Build-Aufwand:** mittel. Realistisch in 24h mit 8 Personen, wenn der Scope
auf **ein Essay, eine Rubrik, einen Demo-Pfad** begrenzt wird.

---

## 3. Idee 2 — Socratic Lock

**One-Liner:** „Der KI-Tutor, der sich nicht dazu überreden lässt, die Lösung
zu verraten.“

**Nutzer/Pain:** Mathe-/Statistik-/Physik-Lernende, die Antworten abrufen statt
zu denken; Lehrkräfte, die Over-Reliance sehen.

**Kernschleife:** Aufgabe → Diagnose → Hint 1–4 → Answer Gate → Selbst-
erklärung → Transfer-Item. Der Tutor darf die Lösung erst nach einem echten
Versuch + Erklärung zeigen.

**Demo:** Juror versucht, die Lösung zu extrahieren („Gib mir einfach die
Antwort“) → blockiert; bekommt Hint 1; löst; erklärt; Transfer-Item;
Dashboard: „Leak-Versuche blockiert: 2“.

**Evidenz:** Bastani 2025 (Guardrails), Hint-Ladder/Help-Seeking, Self-
Explanation. `[P]`

**Tech:** State Machine, SymPy-Verifier, 12 Aufgaben, 4 Hints, 2
Misconception-Typen, Pre/Post, Red-Team-Set.

**Risiken:** Content-Authoring; Leak trotz Guardrails; kann frustrieren.
**Warum gewinnen:** starker, kontraintuitiver Hook; messbarer Transfer;
technisch inspectable.

**Wann statt Viva:** Wenn die mündliche Einweisung #6 „KI als kritischer
Lernbegleiter“ stark macht, die Jury eher Tutor/Guardrails sehen will und das
Team einen starken Mathe-/Physik-Domain-Experten hat.

---

## 4. Idee 3 — Failure First Lab

**One-Liner:** „Wir starten mit der falschen Antwort.“

**Nutzer/Pain:** STEM-/Berufsschul-Lernende, die Prozeduren auswendig lernen,
aber Konzepte nicht transferieren.

**Kernschleife:** Ill-structured problem → Versuch + Erklärung → kontrastierende
Fälle → kanonische Lösung → Revision → Transfer.

**Demo:** Juror versucht ein Problem, sieht einen kontrastierenden Fall,
revidiert, erklärt den Unterschied. Der Wow ist die sichtbare
Konzeptveränderung, nicht ein Score.

**Evidenz:** Productive Failure (g ≈ 0,36 konzeptionell; Procedural ≈ 0),
Self-Explanation, Contrasting Cases. `[P]`

**Tech:** Ein Thema, ein Problem, zwei Kontrastfälle, LLM-Coach mit festen
Prompts, Learning Trace, Transfer-Item.

**Risiken:** Problemdesign braucht Expertise; Novizen können floundern;
LLM-Feedback generisch.
**Warum gewinnen:** mutiger, memori erbarer Pitch; differenziert von Quiz-Apps.

**Wann statt Viva:** Wenn das Team eine starke fachdidaktische Person hat und
die mündliche Einweisung #6 (kritisches Denken/Argumentationslücken) oder eine
eigene Lernsimulation betont.

---

## 5. Idee 4 — Klassenzimmer-Simulator

**One-Liner:** „Ein Flugsimulator für die schwierigsten fünf Minuten des
Lehrberufs.“

**Nutzer/Pain:** Lehramtsstudierende, Berufseinsteiger:innen, Lehrkräfte in
Fortbildung; Classroom Management wird on the job gelernt, Fortbildung ist
theoretisch; Lehrkräftemangel erhöht den Druck.

**Kernschleife:** Szenario wählen (Handyverbot, Gruppenarbeit-Konflikt,
Elterngespräch) → 4 KI-Schüler:innen mit versteckten Zuständen reagieren →
Intervention wählen (Nähe, Ich-Botschaft, Wahlmöglichkeit, Deeskalation) →
Klassenklima → Debrief mit Transkriptzitaten und evidenzbasierten Alternativen.

**Demo:** „Klasse 8, Handyverbot“ → Agent eskaliert → Ich-Botschaft → Klima
verbessert → Debrief: „Du hast deeskaliert; früher eine Wahlmöglichkeit
anbieten.“

**Evidenz:** Simulationen für komplexe Fähigkeiten (g ≈ 0,85), Debriefing
(d ≈ 0,79–0,92), Teacher-Education-Studien. `[P]`

**Tech:** React-Classroom-View, State Machine für 4 Agents, LLM nur für
Dialog-Formulierung, Rubrik-Debrief, 3 Szenarien, 6 Interventionen, Seed-
Session.

**Risiken:** LLM-Inkonsistenz; kulturelle Sensitivität; „Lehrkräfte bewerten“
kann abstoßen. **Mitigation:** „Übungsraum, keine Note“; State Machine;
Debrief mit Optionen.

**Warum gewinnen:** bestes Fit zu einer eigenen Lernsimulation (oder #2);
dramatische, sofort verständliche Demo; B2B-Story (Lehrerfortbildung,
DigitalPakt 2.0).

**Wann statt Viva:** Wenn das Team stark in Frontend/Game/Simulation ist und
die mündliche Einweisung eine eigene Simulation oder Challenge #2 (smarte
Steuerung) besonders betont.

---

## 6. Idee 5 — AI Literacy Lab / Hallucination Hunt

**One-Liner:** „Bring Schülern bei, die KI zu ertappen — nicht, ihr zu
vertrauen.“

**Nutzer/Pain:** Schüler:innen und Studierende nutzen KI, können sie aber nicht
evaluieren; Schulen haben keine Regeln; AI Literacy ist Policy-Pflicht.

**Kernschleife:** Mission wählen (Klima, Geschichte, Gesundheit) → KI-Antwort
mit 5 feinen Fehlern/Fake-Zitaten → Claims markieren (gestützt /
unbegründet / falsch) → Quellenkarten prüfen → Begründung schreiben →
Calibration-Score → Teacher Dashboard: „62 % haben das Fake-Zitat übersehen.“

**Demo:** Juror sieht eine KI-Behauptung, klickt „Quelle prüfen“, findet den
Widerspruch, flaggt die Halluzination, schreibt Begründung, sieht Score und
Klassen-Dashboard.

**Evidenz:** UNESCO AI Literacy, Calibration, Verification Practice;
Detection-Problem als Hintergrund. `[POL]`/`[P]`

**Tech:** 2 Missionen, 5 Claims, handkuratierte Ground Truth + Quellenkarten,
Flagging-UI, Scoring, Teacher Dashboard, Seed-Klasse, Text-only, DE/EN.
**Kein Live-LLM nötig** → sehr reliable.

**Risiken:** „Quiz mit Chat“-Eindruck; Content-Genauigkeit; triviale Fehler.
**Mitigation:** subtile Fehler, Quellenkarten, Begründungspflicht, mehrere
Domänen.

**Warum gewinnen:** starker Fit zu #6 (kritisches Prüfen von KI-Aussagen) und
#3 (Medienkompetenz), niedrigstes technisches Risiko, sofort spielbar,
Policy-Tailwind. **Bester Pivot**, wenn die Zeit knapp wird.

**Wann statt Viva:** Wenn die mündliche Einweisung #3 oder #6 stark macht und
das Team lieber mit kuratiertem Content als mit Live-LLM arbeitet.

---

## 7. Idee 6 — Azubi Talk

**One-Liner:** „Rollenspiel-Training für Azubis — mit einem geduldigen
KI-Kunden und einem ehrlichen Debrief.“

**Nutzer/Pain:** Berufliche Bildung; Soft Skills (Reklamation, Übergabe,
Sicherheit) brauchen Übung; Schauspieler:innen sind teuer; Ausbilder:innen
haben keine Zeit.

**Kernschleife:** Szenario (Reklamation, Übergabe, Lieferantengespräch) →
KI-Gegenüber mit verstecktem Ziel/Emotion → Azubi antwortet (Text/Voice) →
KI eskaliert/deeskaliert → Debrief mit Rubrik (Empathie, Struktur, Lösung,
Compliance) und Transkriptzitaten.

**Demo:** „Reklamation: defekte Kaffeemaschine“ → Azubi entschuldigt sich,
bietet Lösung → KI beruhigt sich → Debrief: „Empathie 3/5, Struktur 4/5;
Lösung zu früh, erst Bedauern anerkennen.“

**Evidenz:** Simulation, LLM-Roleplay (RCTs in Healthcare), VET-Kontext. `[P]`

**Tech:** 2 Szenarien, State Machine für Emotion, LLM-Dialog, Rubrik-Evaluator,
Debrief, Trainer-Dashboard, Text-first, Voice optional.

**Risiken:** Voice-Latenz; Rubrik-Subjektivität; Szenario-Realismus.
**Warum gewinnen:** viszeral, regional (Mittelstand/Ausbildung), misst Soft
Skills statt Quizwissen.

**Wann statt Viva:** Wenn das Team VET-/IHK-Zugang hat und die mündliche
Einweisung #4 (KI-Coach im Bewerbungsprozess) oder #2 (Ausbildung) stark macht.

---

## 8. Idee 7 — SkillPass

**One-Liner:** „Kein Zertifikat fürs Videoschauen — ein verifizierter Nachweis
dessen, was du kannst.“

**Nutzer/Pain:** Azubis, Quereinsteiger:innen, Arbeitgeber; Kompetenzen sind
vorhanden, aber nicht portabel; Dokumentation ist papierbasiert.

**Kernschleife:** Beruf/Kompetenz wählen → Foto/Video/Text-Evidenz hochladen →
KI mappt auf Kompetenzrahmen + Nachfrage → Trainer:in genehmigt/korrigiert →
Open Badge 3.0 + öffentliche Verifikationsseite mit QR.

**Demo:** „Lernfeld 3: Kundenkommunikation“ → Foto + 3 Sätze → Mapping
„Kundenorientierung“ + „Konfliktlösung“ (Confidence 0,82) → Nachfrage →
Trainer genehmigt → Badge + QR → Scan zeigt Evidenz.

**Evidenz:** EU Micro-Credentials, Skills-based Hiring, VET. `[POL]`
**Aber:** Arbeitgeberakzeptanz und Recognition sind unklar; Mapping-Genauigkeit
und Datenschutz sind Risiken.

**Tech:** 1 Beruf, 6 Kompetenzen, 3 Seed-Evidenzen, strukturiertes LLM-Mapping
mit Confidence, Trainer-Approval, Open-Badge-JSON, Verify-Page, PDF.
**Kein Blockchain.**

**Warum gewinnen:** stärkster Policy-Tailwind; tangible Artefakt; aber weniger
Demo-Wow und mehr rechtliche Grauzone.

**Wann statt Viva:** Wenn die mündliche Einweisung #2 (smarte Steuerung) oder
#5 (Orientierung Arbeitswelt) stark macht und das Team einen klaren
Kompetenzrahmen hat.

---

## 9. Idee 8 — Recall Coach / „Vergiss-mich-nicht“

**One-Liner:** „Nicht mehr Inhalte — besseres Erinnern.“

**Nutzer/Pain:** Lernende, die wiederlesen und sich überschätzen; Lehrkräfte
ohne Zeit für Diagnose.

**Kernschleife:** Diagnose → Retrieval (Short Answer) → Confidence →
elaboriertes Feedback → Spacing-Schedule → Teacher Dashboard.

**Demo:** 5 Minuten lernen → 5 Minuten Distraktor → 5 Minuten Delayed Test;
Vergessenskurve + Calibration + Misconception-Heatmap.

**Evidenz:** Retrieval, Spacing, Feedback, Calibration. `[P]`
**Risiko:** crowded (Flashcards/Quiz-Apps); niedriger Wow.
**Warum gewinnen:** niedrigstes technisches Risiko, stärkste Evidenzbasis,
einfach zu erklären. **Fallback für ein kleines/unerfahrenes Team.**

---

## 10. Entscheidungsbaum für Samstag

### Nach Teamstärke

| Stärke | Idee |
|---|---|
| LLM + Speech + Rubrik-Design | **Viva** |
| Frontend/Game + Content | **Klassenzimmer-Simulator** |
| Content/UX + Lehrkräfte-Partner | **AI Literacy Lab** |
| Mathe/Physik-Domain-Experte | **Socratic Lock** oder **Failure First Lab** |
| VET/IHK/Regionaler Arbeitgeber | **Azubi Talk** oder **SkillPass** |
| Kleines Team, wenig Zeit | **AI Literacy Lab** oder **Recall Coach** |

### Nach Challenge / mündlicher Einweisung (Samstagmorgen)

| Offizielle Beispiel-Challenge | Framing |
|---|---|
| #1 Prüfungen im KI-Zeitalter | Viva direkt: evidenzgebundenes Verständnisgespräch + Triage |
| #2 Smarte Steuerung | SkillPass oder Teacher-View-Erweiterung |
| #3 Social Learning | AI Literacy Lab als „kritischer Feed“; schwacher Fit |
| #4 KI-Coach Bewerbung | Azubi Talk / Interview-Coach |
| #5 Orientierung Arbeitswelt | SkillPass |
| #6 Kritischer Lernbegleiter | Viva als kritischer Tutor; Socratic Lock als Alternative |
| Eigene Idee | Viva, wenn es um Verständnis/Assessment geht |

**Regel:** Am Samstag um 10:30 muss die Idee stehen. Danach wird gebaut, nicht
mehr strategiert. Die sechs Challenges sind Inspiration; eine eigene Challenge
ist ausdrücklich erlaubt.

---

## 11. Was andere Teams wahrscheinlich bauen

Crowded:
- generischer AI-Tutor/Chatbot
- PDF → Quiz/Flashcards
- Study Planner
- Chat-with-Notes
- Lesson-Plan-Generator
- Quiz-Game mit Punkten
- AI-Detector
- Lernplattform mit Login

**Differenzierung:**
- **Viva:** „Die KI fragt, statt zu antworten. Der Mensch entscheidet.“
- **Socratic Lock:** „Die KI verweigert die Antwort.“
- **AI Literacy Lab:** „Die KI lügt — finde es heraus.“
- **Klassenzimmer:** „Flight simulator for teachers.“
- **Azubi Talk:** „Der Kunde ist KI, das Feedback ist echt.“

---

## 12. Die eine Folie, die den Unterschied macht

Jede Idee sollte auf **einer** Folie in dieser Struktur erklärbar sein:

1. **User:** Wer genau? (eine Person, kein Segment)
2. **Pain:** Was kostet es heute? (Zeit, Geld, Risiko, Stress)
3. **Insight:** Welcher Mechanismus löst es? (evidenzbasiert, ein Satz)
4. **Product:** Was macht der Prototyp? (eine Kernschleife)
5. **Proof:** Was haben wir gemessen? (klein, ehrlich, konkret)
6. **AI Reflection:** Wo hat KI geholfen, wo lag sie falsch, was haben wir
   korrigiert?

Wenn diese sechs Punkte nicht in 3 Minuten passen, ist der Scope zu groß.

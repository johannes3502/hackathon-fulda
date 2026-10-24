# Deep Research — Future Education / EdTech

**Für:** Hackathon Fulda 2026, 24.–25. Oktober 2026
**Thema:** Future Education – Lernen, Lehren und Prüfen neu denken
**Stand:** 24.10.2026
**Methode:** Fünf parallele Research-Streams (KI-Tutoren, Lernwissenschaft, Serious Games/Simulationen, Assessment/Ethik/Regulierung, EdTech-Trends/Hackathon-Strategie). Fokus auf 2024–2026; Grundlagenwerke nur, wo sie für die Einordnung nötig sind.

**Evidenz-Legende:**
`[P]` peer-reviewed · `[WP]` Working Paper · `[PP]` Preprint · `[L]` Gesetz/Regulierung · `[POL]` Policy/Report · `[V]` Vendor/Industrie · `[J]` Journalismus

> Kernbefund vorweg: Der größte Hebel ist nicht das Modell, sondern das
> Interaktionsdesign. Gute KI-Tutoren operationalisieren seit Jahrzehnten
> bekannte Lernmechanismen. Schlechte KI-Tutoren geben Antworten aus, erzeugen
> Scheinsicherheit und verschlechtern unassisted Leistungen. Für den Hackathon
> heißt das: **ein schmaler, glaubwürdiger Lernmechanismus, sichtbar gemacht,
> mit ehrlicher Messung** schlägt jede breite „AI Learning Platform“.

> **Challenge-Anker (24.10.2026):** Die offizielle PDF nennt sechs
> Beispiel-Challenges. Viva adressiert **#1 „Prüfungen im Zeitalter von KI“**
> (fair, aussagekräftig, möglichst täuschungssicher) und **#6 „KI als
> kritischer Lernbegleiter“** (widersprechen, nachfragen,
> Argumentationslücken aufzeigen). Die Evidenz unten stützt den Kern: Detection
> ist unzuverlässig, strukturierte Vivas sind reliabler, Self-Explanation und
> Feedback sind starke Mechanismen. Viva verspricht keine Täuschungssicherheit;
> es verschiebt den Nachweis auf Erklärungskompetenz. Viva ist unsere eigene
> Challenge; #1/#6 sind der Fit, kein Pflichtrahmen.

---

## 0. Executive Summary — 12 Thesen

1. **Das Modell ist nicht die Intervention.** In einem Mathe-Feldexperiment
   verbesserte ein ungeguardrailter GPT-4-Tutor die Übungsleistung, aber die
   Schüler:innen schnitten in der unassisted Prüfung ~17 % schlechter ab. Eine
   Version mit Lehrer-Hinweisen und kanonischer Lösung eliminierten den Schaden.
   `[P]` (Bastani et al., PNAS 2025)
2. **Effekte schrumpfen mit Skalierung.** Ein starker RCT zeigt große
   Lerngewinne für einen strukturierten KI-Tutor; ein Zwei-Jahres-RCT mit
   Khanmigo findet nur 0,06–0,08 SD pro Jahr, weil wenige Lernende das Tool
   substanziell nutzen. `[P]`/`[WP]` Take-up und Engagement sind der Bottleneck,
   nicht die Modellqualität.
3. **KI-Tutoren sind vielversprechend, aber kein Lehrkräfte-Ersatz.** Die
   Evidenz ist kurzzeitig, kontextspezifisch und heterogen. „2 Sigma“ ist ein
   Mythos; typische intensive Tutoring-Effekte liegen eher bei 0,3 SD.
4. **Die robustesten Mechanismen sind alt:** Retrieval Practice, Spacing,
   Self-Explanation, Worked Examples, elaboriertes Feedback und
   Metakognition/Calibration. KI sollte diese Mechanismen verstärken, nicht
   ersetzen.
5. **Productive Failure und Desirable Difficulties wirken nur mit
   Konsolidierung.** „Einfach scheitern lassen“ ist keine Pädagogik. Der Effekt
   gilt für konzeptionelles/Transfer-Lernen, nicht für Prozeduren.
6. **Simulationen sind stark für komplexe Fähigkeiten; das Debriefing ist der
   höchste Hebel.** Die Effektstärke für Simulationen liegt bei g ≈ 0,85;
   Debriefing/After-Action-Review bei d ≈ 0,79–0,92. Niedrige Fidelity kann
   ausreichen; VR ist nicht automatisch besser.
7. **Gamification ist klein und heterogen.** Bias-korrigiert g ≈ 0,32;
   Punkte/Badges/Leaderboards können Lernqualität untergraben. Challenge,
   Feedback, Autonomie und sichtbarer Fortschritt wirken eher als Belohnungen.
8. **Assessment ist die Krise und die Chance.** AI-Detection ist unzuverlässig
   und umgehbar; Hochschulen verlagern sich auf mündliche, authentische und
   prozessbasierte Assessmentformen. KI kann Übung skalieren, aber nicht die
   hochstufige menschliche Entscheidung ersetzen.
9. **LLM-Grading ist Decision Support, kein Richter.** Mensch-Mensch-Agreement
   liegt bei QWK ≈ 0,91; LLMs erreichen eher ≈ 0,6. Reliability ≠ Validity;
   Bias und Prompt-Effekte sind real. Jede Rückmeldung braucht Evidenzanker und
   menschliche Freigabe.
10. **AI Literacy ist ein dauerhafter Skill und ein Policy-Tailwind.** Es geht
    um kritisches Evaluieren, Calibration, Ethik und Agency — nicht um
    Prompt-Tricks. Die EU AI Act Article 4 Pflicht besteht seit Februar 2025.
11. **Der deutsche Markt hat klare Schmerzpunkte:** Lehrkräftemangel,
    PISA-Abstieg und Ungleichheit, DigitalPakt 2.0 (5 Mrd. €), duale
    Ausbildung mit Matching-Problemen, Weiterbildungsungleichheit. Hochschule
    Fulda ist ein anwendungsorientierter Transferpartner, kein klassischer
    Lehrerbildungs-Hub.
12. **Für den Hackathon gewinnt ein vertikaler Slice.** Eine Nutzerreise, die
    in unter 3 Minuten ohne Erklärung Wert zeigt, mit sichtbarem Ergebnis,
    ehrlicher Messung und einer glaubwürdigen AI-Reflection. Keine Plattform,
    kein 3D-Weltenbau, kein AI-Detector.

---

## 1. Evidenz auf einen Blick

| Intervention | Evidenz | Effekt / Befund | Grenzen | Hackathon-Implikation |
|---|---|---|---|---|
| Retrieval Practice | Systematische Reviews, viele Feldstudien `[P]` | 49 Effekte, N = 5.374; 57 % mittel/groß | Eher Gedächtnis als Transfer; Feedback nötig | Kurze Short-Answer-Abfragen, späterer Retest |
| Spacing | Meta-Analysen `[P]` | Labor g ≈ 0,74; Feld heterogen | Feldimplementationen oft klein/n.s. | Einfacher Scheduler, aber keine Wunder versprechen |
| Interleaving | Meta-Analyse `[P]` | g ≈ 0,42; Mathe 0,34; Wörter −0,39 | Nur für verwechselbare Kategorien | Gezielt bei ähnlichen Fehlertypen |
| Self-Explanation | Meta-Analyse `[P]` | g ≈ 0,55 (69 Effekte, N = 5.917) | Qualität der Erklärung entscheidend | „Erkläre den Schritt“ + Rubrik-Feedback |
| Worked Examples | Meta-Analyse `[P]` | g ≈ 0,48 | Expertise-Reversal: Experten profitieren weniger | Beispiele fading, nicht dauerhaft zeigen |
| Productive Failure | Meta-Analyse `[P]` | g ≈ 0,36 konzeptionell; procedural −0,03 | Nur mit Konsolidierung; jüngere Lernende anders | Erst versuchen, dann kontrastieren, dann erklären |
| Feedback | Meta-Analyse `[P]` | d ≈ 0,48–0,55; 17 % negative Effekte; strenger g ≈ 0,17 | Schlechtes Feedback schadet | What/Why/Next, Evidenzanker, keine Noten |
| Metacognition/Calibration | Meta-Analysen `[P]` | Monitoring-Accuracy g ≈ 0,25; Comprehension-Metacomprehension-Gap | Kurze Interventionen können backfiren | Confidence Rating + Abgleich mit Korrektheit |
| ITS | Meta-Analysen `[P]` | VanLehn: ~0,76 vs. menschlich ~0,79; neuere K-12: g ≈ 0,27–0,41 | Alt, heterogen, meist Prozeduren | Schrittmodell + Hint-Ladder statt Chat |
| LLM-Tutoring | RCTs/WP `[P]`/`[WP]` | Ein RCT: 0,6–1,3 SD; Skalierung: 0,06–0,08 SD/Jahr; ungeguardrailt −17 % | Einzelkurs, Take-up, kurzfristig | Guardrails + unassisted Transfer testen |
| Simulation | Meta-Analyse `[P]` | g ≈ 0,85 für komplexe Fähigkeiten | Fidelity irreführend; Debriefing entscheidend | 2D-Branching + Debrief + Transferfall |
| Serious Games | Meta-Analysen `[P]` | klein–moderat; Design > Format | Publikationsbias, schwache Kontrollen | Eine Kernmechanik, kein Spielzeug |
| Gamification | Meta-Meta-Analyse `[P]` | bias-korrigiert g ≈ 0,32 | Punkte/Badges oft nur Engagement | Challenge/Feedback statt Leaderboard |
| VR/XR | Meta-Analysen `[P]` | g ≈ 0,24–0,38; teils schlechter als Slides | Extraneous Load, Hardware, Kosten | Nur für räumliche/gefährliche Aufgaben |
| AI Feedback | Meta-Analysen `[P]` | g ≈ 0,25 vs. Mensch, n.s.; >23 % halluzinierte Inhalte in einer Studie | Hohe Heterogenität | Jede Behauptung mit Zitat aus Lernendenarbeit |
| AI Grading | Studien/Synthese `[P]`/`[PP]` | QWK ≈ 0,6 vs. Mensch-Mensch ≈ 0,91 | Bias, Prompt-Sensitivität | Decision Support, kein automatisches Urteil |
| AI Detection | Unabhängige Tests `[P]`/`[PP]` | 9–15 % Flags bei Originalen; >96 % Evasion nach Humanizing | Nicht generalisierbar | **Nicht bauen** |
| Micro-Credentials | Policy `[POL]` | EU-Tailwind, Arbeitgeberakzeptanz unklar | Recognition inkonsistent | Evidenz statt Zertifikat |

---

## 2. KI-Tutoren und adaptive Lernsysteme

### 2.1 Die zentrale Lektion: Das Modell ist nicht die Intervention

Die wichtigste Studie für den Hackathon ist **Bastani et al. (PNAS 2025)**:
In einem Feldexperiment mit High-School-Mathematik verbesserte ein
ungeguardrailte GPT-4-Tutor die Leistung während der Übung deutlich, aber die
Schüler:innen schnitten in der anschließenden **unassisted Prüfung ~17 %
schlechter** ab als die Kontrollgruppe. Eine Tutor-Version mit
**Lehrer-Hinweisen und kanonischer Lösung** (also strukturierter Führung statt
freiem Chat) beseitigte den negativen Effekt. `[P]`

Daraus folgen drei Dinge:
- **Antwortgeben ist nicht Helfen.** Ein Tutor, der die Lösung ausspuckt,
  optimiert die Übungsleistung und untergräbt das Lernen.
- **Guardrails sind das Produkt.** Nicht der Prompt, sondern die
  Interaktionsarchitektur (State Machine, Hint-Ladder, Answer Gate, Verifier)
  entscheidet.
- **Messung muss unassisted sein.** Ein Pre/Post-Test direkt nach der Nutzung
  misst möglicherweise nur die Unterstützung, nicht das Lernen.

### 2.2 Was funktioniert

Die evidenzstärksten Mechanismen für einen KI-Tutor sind:

1. **Worked Examples + Fading.** Novizen profitieren von vollständigen
   Lösungsbeispielen (g ≈ 0,48); mit zunehmender Expertise müssen sie
   ausgeblendet werden, sonst greift der Expertise-Reversal-Effekt
   (Novizen d ≈ 0,51, Experten d ≈ −0,43). `[P]`
2. **Self-Explanation.** Lernende erklären jeden Schritt; g ≈ 0,55. `[P]`
3. **Learning by Teaching / Teach-Back.** Der Lernende erklärt einem
   (simulierten) Peer; g ≈ 0,56 für Preparing-to-Teach/Teaching. `[P]`
4. **Hint-Ladder + Help-Seeking-Feedback.** Nicht „die Antwort“, sondern die
   nächste angemessene Hilfe; Metacognitive Feedback verbessert Help-Seeking.
   `[P]`
5. **Retrieval + Spacing.** Kurze Abfragen und verteiltes Wiederholen sind
   robuster als erneutes Lesen; Transfer ist schwächer als Gedächtnis. `[P]`
6. **Elaboriertes Feedback.** What/Why/Next, konkret, mit Bezug zur
   Lernendenantwort; durchschnittlich d ≈ 0,48–0,55, aber 17 % der Effekte
   negativ. `[P]`

**Sokratisches Fragen allein ist schwächer als sein Ruf.** Die Evidenz stützt
strukturierte Führung, Hinweise und Erklärungsaufforderungen besser als freies
Fragen. Ein „Socratic Chatbot“ ohne State Machine ist kein guter Tutor.

### 2.3 Die Skalierungsrealität

**Kestin et al. (Scientific Reports 2025)** zeigen in einem RCT an der Harvard
University (N = 194, Physik), dass ein strukturierter KI-Tutor die Leistung
stärker verbessern kann als aktives Lernen im Unterricht (je nach Metrik
≈ 0,6–1,3 SD). Das ist ein starker Existenzbeweis, aber:
- ein einzelner Kurs, ein Thema, selbst-paced;
- Decken-Effekte und forschungsdesignbedingte Vorteile;
- kein Beleg für breite Skalierung.

**Khanmigo (NBER Working Paper 2026)** zeigt die andere Seite: In einem
Zwei-Jahres-Experiment mit Schulen lag der Effekt bei **0,06–0,08 SD pro Jahr**.
96 % der Lernenden probierten das Tool, aber wenige nutzten es substanziell.
Der Effekt war getrieben von **Praxis**, nicht von Dialog. `[WP]`

**Implikation:** Ein brillanter Tutor, den niemand nutzt, ist wirkungslos. Für
den Hackathon zählt: niedrige Einstiegshürde, ein klarer Anlass, ein sichtbarer
Nutzen nach 60–90 Sekunden.

### 2.4 Failure Modes

| Failure Mode | Was passiert | Evidenz/Beispiel | Gegenmaßnahme |
|---|---|---|---|
| Answer Leakage | Lernende extrahieren die Lösung durch Umformulierung/Druck | 74 % durchschnittliche Leak-Rate; SocraticLM leakte nach ~2,4 Turns `[PP]` | Answer Gate, State Machine, deterministischer Verifier, Red-Team-Tests |
| Over-Reliance / Cognitive Offloading | Lernende delegieren Denken, fühlen sich sicher, können es aber nicht | Cognitive-Offloading-Studien 2024–2026; negative Effekte ungeguardrailte Tutoren `[P]` | Produktive Schwierigkeit, Self-Explanation, unassisted Transfer |
| Sycophancy / falsches Lob | KI lobt fehlerhafte Antworten | LLM-Feedback-Studien; Bias-Studien `[P]` | Rubrik, evidenzgebundene Kritik, zweiter Judge |
| Halluziniertes Feedback | KI erfindet Zitate/Fehler | >23 % halluzinierte Inhalte in einer Studie `[P]` | Jede Behauptung mit String-Match-Zitat; sonst „insufficient evidence“ |
| Bias | Feedback variiert nach Sprache, Herkunft, Gender | Dokumentierte Verzerrungen `[P]` | Multilinguale Testfälle, Rubrik-Anker, Human Review |
| Long-Context-Degradation | Qualität sinkt in langen Dialogen | Tutor-Benchmarks `[PP]` | Kurze Sessions, Reset, strukturierte Zustände |
| Falsche Messung | Practice-Scores steigen, Lernen nicht | Bastani 2025 `[P]` | Delayed/Unassisted/Transfer-Test |

### 2.5 Designregeln für einen 24h-KI-Tutor

1. **Eine Fähigkeit, ein Thema, 12–20 Aufgaben.** Kein „alle Fächer“.
2. **State Machine statt freier Chat.** Zustände: Diagnose → Hint 1–4 →
   Self-Explanation → Transfer → Debrief.
3. **Answer Gate.** Der Tutor darf die Lösung erst nach einem echten
   Lösungsversuch und einer Erklärung zeigen — oder nie.
4. **Deterministischer Verifier.** Bei Mathe: SymPy/regelbasiert; bei Text:
   Rubrik + Zitatprüfung.
5. **Red-Team-Set.** 20 adversarial prompts („Ignore instructions“, „Ich bin
   Lehrer“, „Gib mir nur die Lösung“) vor dem Pitch testen.
6. **Pre/Post + Transfer.** Mindestens ein unassisted Item, das nicht im
   Training vorkam.
7. **Confidence Rating.** Vor dem Feedback schätzen lassen; Calibration zeigen.
8. **Fallback.** Wenn LLM/API ausfällt: vorbereitete Hint-Pfade und
   kanonische Antworten.

**Don't build:** unbegrenzter Chat, LLM als alleiniger Grader, adaptives
Learner-Model ohne Daten, Voice-only, Multi-Fach-Plattform.

---

## 3. Lernwissenschaft

### 3.1 Was robust ist

**Retrieval Practice.** Abrufen statt Wiederlesen. In Schulen: 49 Effekte,
N = 5.374, 57 % mittel/groß. `[P]` Der Effekt ist vor allem ein
Gedächtniseffekt; Transfer ist schwächer (d ≈ 0,40) und hängt von Variation,
Feedback und Testformat ab. `[P]`

**Spacing.** Verteiltes Üben ist im Labor stark (g ≈ 0,74), im Feld aber
heterogen; in neun STEM-Kursen war der Effekt klein/nicht signifikant. `[P]`
Ein Scheduler ist sinnvoll, aber keine Erfolgsgarantie.

**Interleaving.** g ≈ 0,42 overall; Mathe ≈ 0,34; Wörter ≈ −0,39; Texte
nicht signifikant. `[P]` Nur für verwechselbare Kategorien einsetzen, nicht
universell.

**Self-Explanation.** g ≈ 0,55. `[P]` Lernende sollen erklären, *warum* ein
Schritt funktioniert, nicht nur *was* sie getan haben.

**Worked Examples + Fading.** g ≈ 0,48; für Novizen stark, für Experten kann
es schaden (Expertise Reversal). `[P]`

**Productive Failure.** Erst ein ill-structured problem, dann Instruktion:
g ≈ 0,36 für konzeptionelles/Transfer-Lernen; für Prozeduren ≈ −0,03. `[P]`
Ohne Konsolidierung und Vergleich mit kanonischen Lösungen ist es kein
Productive Failure.

**Feedback.** d ≈ 0,48–0,55, aber 17 % negative Effekte; strengere Reviews
finden g ≈ 0,17. `[P]` Gutes Feedback ist konkret, erklärt warum, gibt den
nächsten Schritt und bezieht sich auf die Lernendenantwort.

**Metacognition/Calibration.** Monitoring-Accuracy ist niedrig (g ≈ 0,25 für
Interventionen); Lernende überschätzen oft ihr Verständnis. `[P]` Confidence
Ratings und Abgleich mit Korrektheit sind ein billiger, sichtbarer Mehrwert.

**Deliberate Practice.** Qualität und Feedback schlagen Stunden; der
„10.000-Stunden“-Mythos ist nicht haltbar. `[P]`

**Transfer.** Near Transfer ist erreichbar, Far Transfer ist schwer. `[P]`
Ein Transfer-Item im Demo ist glaubwürdiger als zehn geübte Aufgaben.

### 3.2 Mythen, die im Pitch sofort schaden

| Mythos | Warum falsch | Was stattdessen |
|---|---|---|
| Learning Styles (VARK) | Kein konsistenter Crossover-Effekt; Matching nicht wirksam | Vorwissen, Aufgabe, Kontext adaptieren |
| Bloom’s 2 Sigma | Kleine, enge Studien; gebündelt mit Mastery Learning und mehr Zeit; typisches Tutoring ≈ 0,33 SD | „Intensive, strukturierte Unterstützung“ sagen |
| Digital Natives | Techniknutzung ≠ digitale Kompetenz; Multitasking ist Task-Switching | Digitale Kompetenz explizit lehren |
| Brain Training | Kein überzeugender Far Transfer | Domänenspezifisch üben |
| Engagement = Lernen | Spaß, Klicks und Selbstbericht korrelieren nicht zuverlässig mit Lernen | Delayed/Transfer-Test |
| „AI ersetzt Lehrkräfte“ | Evidenz stützt Augmentation, nicht Ersatz | „KI gibt Lehrkräften Zeit zurück“ |

### 3.3 Designregeln

1. **Ein Mechanismus, sichtbar.** Nicht „AI“, sondern „Retrieval + Feedback“
   oder „Self-Explanation + Contrasting Cases“.
2. **Kurze Answer-Formate.** Short Answer/Erklärung statt nur Multiple Choice.
3. **Confidence vor Feedback.** Calibration sichtbar machen.
4. **Delayed + Transfer.** Mindestens ein Item, das später/nicht geübt geprüft
   wird.
5. **Vorwissensdiagnose.** Novizen brauchen mehr Beispiele, Experten mehr
   Probleme (Expertise Reversal).
6. **Elaboriertes Feedback.** What/Why/Next, evidenzgebunden.
7. **Lehrkräfte-Dashboard.** Eine actionable Insight, keine Datenwand.
8. **Keine Learning-Styles, keine 2-Sigma-Claims.**

---

## 4. Serious Games, Simulationen, XR

### 4.1 Evidenz nach Format

**Simulationen für komplexe Fähigkeiten** haben die stärkste Evidenz:
g ≈ 0,85 in der Hochschul-Meta-Analyse von Chernikova et al. (2020). `[P]`
Der Effekt hängt stark vom Design ab, nicht von der grafischen Fidelity.

**Serious Games** zeigen kleine bis moderate Effekte; die Meta-Analysen sind
heterogen und oft durch schwache Kontrollgruppen/Publication Bias belastet.
`[P]` Gute Spiele integrieren Lernziele in die Kernmechanik; schlechte Spiele
haben „Schokolade“ um belanglose Quizfragen.

**Gamification** ist bias-korrigiert g ≈ 0,32; Punkte, Badges und Leaderboards
können Motivation kurzfristig erhöhen, aber Lernqualität und Autonomie
untergraben. `[P]` Challenge, Feedback, Fortschritt und Wahlmöglichkeiten
wirken eher.

**VR/XR** liegt bei g ≈ 0,24–0,38 und ist nicht automatisch besser als eine
gute 2D-/Video-Intervention; für faktisches Lernen kann VR sogar schlechter
sein (Parong & Mayer). `[P]` VR lohnt sich für räumliche, gefährliche oder
unzugängliche Aufgaben, nicht als „Wow“-Deko.

**Debriefing/After-Action-Review** ist der stärkste Bestandteil:
d ≈ 0,79–0,92. `[P]` Ohne Debriefing verpufft ein großer Teil der
Simulationswirkung.

### 4.2 Das Debriefing ist das Produkt

Ein 24h-Simulationsprototyp sollte **25–35 % der Demo-Zeit** für das
Debriefing reservieren. Gute Struktur:
1. **Was ist passiert?** (Ereignisprotokoll, Entscheidungen)
2. **Warum?** (Ursachen, Annahmen, Fehlkonzepte)
3. **Was wäre besser?** (Evidenzbasierte Alternativen)
4. **Was nimmst du mit?** (eine konkrete Regel)
5. **Transfer:** neuer Fall, gleiche Kompetenz.

### 4.3 Designregeln

1. **Assessment first.** 2–3 Kompetenzen → beobachtbare Indikatoren →
   Entscheidungspunkte → Scoring. Keine Simulation ohne Messplan.
2. **Branching Scenario, 2D/Text.** Eine Szene, 6–8 Entscheidungen, 2–3
   Enden, ein Transferfall.
3. **Konsequenzen zeigen.** Nicht nur „richtig/falsch“, sondern was daraus
   folgt.
4. **Funktionale Fidelity > physische Fidelity.** Ein sauberer Entscheidungsbaum
   schlägt eine fotorealistische 3D-Welt.
5. **Ein Debrief mit Zitaten.** Zeige die Entscheidung, die Konsequenz und die
   bessere Alternative.
6. **Pre/Post + Near Transfer.** Kein „validated“ behaupten; kleine,
   ehrliche Pilotdaten.
7. **Keine 3D-Welt, kein Multiplayer, kein Authoring-Tool** in 24h.

**Don't build:** VR-/Metaverse-Demo, 3D-Asset-Produktion, komplexes
Physik-Sandbox, Multiplayer, Level-Editor.

---

## 5. Assessment, AI Literacy, Integrität

### 5.1 Die Assessment-Krise

Die Ausgangslage ist eindeutig:
- **94 % der UK-Undergraduates** nutzen GenAI für bewertete Arbeiten; **12 %**
  fügen KI-Text direkt ein (HEPI/Kortext 2026, N = 1.054). `[POL]`
- **AI-Detection ist unzuverlässig:** unabhängige Tests finden 9–15 % Flags
  bei aktuellen Originalen, 38–80 % bei leichten Edits, >96 % Evasion nach
  Humanizing; Detektoren sind sprach-/domänenabhängig voreingenommen. `[PP]`
- Institutionen verlagern sich auf **mündliche Prüfungen/Vivas, In-Class-
  Assessment, Prozessevidenz und offene Aufgaben**; Detektoren werden
  zurückgezogen oder herabgestuft. `[POL]`

**Das ist die stärkste „Why now“-Story für den Hackathon:** AI hat die
schriftliche Hausarbeit als Verständnisnachweis destabilisiert. Die Lösung ist
nicht ein besserer Detector, sondern **mehr Dialog über Verständnis** — und der
skaliert ohne KI nicht.

### 5.2 Was KI im Assessment kann — und nicht kann

| Aufgabe | Evidenz | Geeignet? |
|---|---|---|
| Fragen aus einem Text generieren | LLMs gut, aber generisch; Quellenbindung nötig | Ja, mit Review |
| Formatives Feedback | Durchschnittlich positiv, heterogen; Halluzinationen möglich | Ja, mit Evidenzanker |
| Essay-Scoring | QWK ≈ 0,6 vs. Mensch-Mensch ≈ 0,91; Bias | Nur Decision Support |
| Mündliche Prüfung | Reliabilität α ≈ 0,86 in Feldreport; Validität unklar; 83 % gestresster | Formativ ja, hochstufig nur menschlich |
| Proctoring/Detection | Unzuverlässig, bias, Vertrauensverlust | Nein |
| Emotion Recognition | EU AI Act verbietet sie in Bildung/Arbeit | Nein |

**Wichtig:** Reliabilität ist nicht Validität. Ein LLM kann konsistent falsch
bewerten. Hohe Inter-Rater-Agreement kann systematischen Bias verdecken.

### 5.3 AI Literacy

AI Literacy umfasst nach UNESCO (2024) **12 Kompetenzen in 4 Dimensionen und
3 Stufen**: kritisch evaluieren, ethisch handeln, mit KI kollaborieren, KI
verstehen und gestalten. `[POL]` Für Lernende zentral:
- **Epistemische Wachsamkeit:** Woher weiß die KI das? Welche Quelle fehlt?
- **Calibration:** Wie sicher bin ich, dass die KI recht hat — und wie sicher
  bin ich, dass ich es verstehe?
- **Agency:** Wann delegiere ich, wann denke ich selbst?
- **Ethik:** Bias, Datenschutz, Urheberschaft, Verantwortung.

Kurze Warnhinweise oder einmalige Workshops können backfiren; Metacognitive
Scaffolding und wiederholte Verification-Praxis sind plausibler. `[P]`

### 5.4 Ethik und Regulierung

- **EU AI Act, Annex III 3(b):** Bewertung von Lernergebnissen in Bildung ist
  ein High-Risk-Use. Die High-Risk-Pflichten für Annex III gelten nach dem
  Digital Omnibus (VO 2026/1744) ab **2. Dezember 2027**. `[L]`
- **Article 14:** menschliche Aufsicht muss echt sein: verstehen, interpretieren,
  übersteuern, stoppen können. `[L]`
- **Article 4:** AI Literacy für Anbieter/Deployer, seit Februar 2025. `[L]`
- **GDPR Art. 22:** keine ausschließlich automatisierte Entscheidung mit
  erheblichen Auswirkungen; menschliche Überprüfung muss meaningful sein. `[L]`
- **Verboten:** Emotion Recognition in Bildung/Arbeit (Art. 5), Proctoring-
  Biometrie, heimliche Überwachung. `[L]`

**Für den Prototyp:**
- Synthetische Daten, keine echten Studierendenarbeiten.
- Keine Audio-/Video-Speicherung; wenn Voice, nur Transkript und löschen.
- Kein „AI Act compliant“ behaupten; „designed for human oversight and
  transparency“ sagen.
- Jede KI-Behauptung mit Zitat aus der Lernendenarbeit oder „insufficient
  evidence“.
- Audit-Log: Modell, Prompt-Version, Zeit, Entscheidung, Review.

### 5.5 Designregeln

1. **Human-in-the-loop ist Architektur, nicht Button.** Review-Zeit, Kontext,
   Override, Audit.
2. **Evidence-anchored Feedback.** Jede Rückmeldung zitieren; keine Quote, keine
   Behauptung.
3. **Rubrik transparent machen.** Kriterien, Deskriptoren, Gewichte sichtbar.
4. **Unsicherheit zeigen.** Confidence + „was fehlt, um sicher zu sein“.
5. **Formativ framen.** „Übung“, „Vorbereitung“, „Decision Support“ — nicht
   „Prüfer“ oder „Note“.
6. **Synthetic data.** Keine echten Namen, keine echten Arbeiten.
7. **Keine Detektion, kein Proctoring, keine Emotion AI.**

---

## 6. Future Skills und der deutsche Kontext

### 6.1 Frameworks

- **OECD Learning Compass 2030:** Student Agency, Transformative Competencies
  (neue Werte schaffen, Spannungen versöhnen, Verantwortung übernehmen),
  Knowledge/Skills/Attitudes/Values. `[POL]`
- **WEF Future of Jobs 2025:** 39 % der Skills ändern sich bis 2030; Top-Skills:
  analytisches Denken, Resilienz, Führung, KI-/Big-Data-Kompetenz,
  lebenslanges Lernen. `[POL]` Arbeitgeberbefragung, keine Lernmessung.
- **DigComp 3.0:** 5 Bereiche, 21 Kompetenzen, 4 Niveaus, 500+ Learning
  Outcomes; KI transversal. `[POL]`
- **UNESCO AI Competency Framework:** 12 Kompetenzen, 4 Dimensionen, 3 Stufen
  für Schüler:innen; 15 Kompetenzen für Lehrkräfte. `[POL]`
- **21st-Century Skills / CBE / Micro-Credentials:** konzeptionell wichtig,
  assessment- und recognition-seitig schwach. `[POL]`

**Konsequenz:** Frameworks eignen sich für die Pitch-Story, nicht als
Messinstrument. Ein Prototyp sollte **eine** Kompetenz operationalisieren
(z. B. „eine Quelle kritisch prüfen“, „einen Lösungsweg erklären“, „ein
Gespräch strukturieren“), nicht „21st-Century Skills zertifizieren“.

### 6.2 Deutsche Schmerzpunkte

| Problem | Zahl/Quelle | Produktrelevanz |
|---|---|---|
| Lehrkräftemangel | KMK 2025: ~27k Gap; regionale Fächerengpässe stärker `[POL]` | Lehrerzeit zurückgeben, Entlastung |
| PISA-Abstieg/Ungleichheit | PISA 2022: Mathe 475, Lesen 480, Naturwissenschaften 492; 30 % unter Level 2 Mathe; SES-Gap 111 `[POL]` | Grundkompetenzen, adaptive Förderung |
| DigitalPakt 2.0 | 5 Mrd. € 2026–2030; 50/50; Infrastruktur + Unterrichtsentwicklung + Forschung `[POL]` | Schule als Buyer, aber Procurement langsam |
| Duale Ausbildung | 476k Verträge, 530k Angebote, 84,4k unplaced, 54,4k unbesetzt (BIBB 2025) `[POL]` | Matching, Kompetenznachweis, Soft Skills |
| Weiterbildung | 83 % irgendein Lernen, 54 % 25–65, nur 1 % kontinuierlich; soziale Gap `[POL]` | Micro-Learning, niedrigschwellige Formate |
| KI-Regeln an Schulen | 58 % der Lehrkräfte nutzen KI, nur 23 % zentrale Regeln (Bitkom 2025) `[POL]` | AI Literacy, Governance, Lehrerfortbildung |

**Hochschule Fulda:** ~9.500 Studierende, 60 Studiengänge, 8 Fachbereiche,
anwendungsorientiert mit Gesundheits-/Sozial-/Informatik-Schwerpunkten. `[POL]`
Gut für Transfer-Piloten (Weiterbildung, duales Studium, Gesundheit, Soziale
Arbeit). Kein klassischer Lehrerbildungs-Hub — „Fulda als Lehrkräfte-
Trainingspartner“ nicht überclaimen.

### 6.3 Was das für die Produktwahl bedeutet

Die stärksten „Why now“-Wedges für einen 24h-Prototyp:
1. **Assessment-Integrität:** AI hat schriftliche Arbeiten destabilisiert;
   mündliche Verteidigung skaliert nicht. (Viva)
2. **Lehrerzeit:** Diagnose, Differenzierung, Feedback kosten Zeit; KI kann
   vorbereiten, aber die Lehrkraft entscheidet. (Feedback Auditor)
3. **AI Literacy:** Lernende nutzen KI, können sie aber nicht evaluieren;
   Pflicht und Nachfrage. (Hallucination Hunt)
4. **Berufliche Soft Skills:** Rollenspiele brauchen Schauspieler; KI kann
   üben, aber nicht benoten. (Azubi Talk)
5. **Grundkompetenzen:** Retrieval/Calibration sind billig, evidenzbasiert und
   messbar. (Recall Coach)

---

## 7. Konsequenzen für den Hackathon

### 7.1 15 Build-Regeln

1. **Ein Nutzer, ein Pain, ein Job-to-be-done.** Keine „Plattform“.
2. **Ein Lernmechanismus, genannt und zitiert.** z. B. Self-Explanation.
3. **Eine Kernschleife, die in < 2 Minuten erlebbar ist.**
4. **Instant Value ohne Login.** Öffentliche URL, Seed-Daten, Reset.
5. **Sichtbares Ergebnis.** Score, Fortschritt, Evidenzkarte, Vorher/Nachher.
6. **Unassisted/Transfer-Messung.** Nicht nur Practice-Score.
7. **Evidenzgebundenes Feedback.** Jede Behauptung mit Zitat.
8. **Human-in-the-loop bei hohen Einsätzen.** Review, Override, Audit.
9. **Keine Detektion, kein Proctoring, keine Emotion AI.**
10. **Synthetische Daten.** Keine echten Namen/Arbeiten.
11. **Deterministischer Fallback.** Vorbereitete Pfade, wenn API/LLM ausfällt.
12. **Laptop + Smartphone testen.**
13. **Demo instrumentieren.** Logs, Metriken, Fehlerfälle.
14. **AI Decision Log führen.** Für die 2-Minuten-Reflection.
15. **Claims proportional zur Evidenz.** „In unserem 10-Personen-Pilot …“,
    nicht „validiert“.

### 7.2 Was man nicht bauen sollte

- LMS, Content-Marketplace, Social Feed
- 3D-/VR-Welt, Metaverse, Avatar-Customization
- Native App, Multi-Tenant-Auth, Rollen-/Rechte-System
- AI-Detector, Proctoring, Emotion Recognition
- Autonomer Grader für hohe Einsätze
- Vollständiges adaptives Learner-Model ohne Daten
- Voice-only-Interface
- „Alles für alle Fächer“

### 7.3 Glaubwürdige Claims

**Sagen:**
- „In einem 10-Personen-Pilot mit synthetischen Essays stieg die Zahl der
  korrekt erkannten Halluzinationen von X auf Y.“
- „Unser Quote-Verifier hat in 20 Testfällen 100 % der KI-Zitate gegen den
  Text geprüft; 3 erfundene Zitate wurden blockiert.“
- „Designed for human oversight: die Lehrkraft sieht jede Evidenz und kann
  jede Aussage übersteuern.“
- „Wir messen unassisted Transfer, nicht nur Übung.“

**Nicht sagen:**
- „AI Act compliant“ / „DSGVO-konform“ (ohne Prüfung)
- „2 Sigma“ / „revolutionär“ / „AI ersetzt Lehrkräfte“
- „validiert“ nach einem 24h-Demo
- „95 % Genauigkeit“ ohne Testset
- „learning styles“ / „digital natives“

### 7.4 Produktreview-Staging (40 %)

Der Jury-Test muss in **90 Sekunden** funktionieren:
1. **0:00–0:10:** QR-Code/URL, ein Satz: „Das macht es.“
2. **0:10–0:30:** Seed-Demo starten; keine Registrierung.
3. **0:30–1:15:** Kernschleife selbst erleben (z. B. eine Frage beantworten,
   ein Feedback sehen, einen Fehler flaggen).
4. **1:15–1:30:** Ergebnis/Evidenz/Score; Reset.
5. **1:30–3:00:** optionale Tiefe (Dashboard, Fallback, Architektur).

**Pflicht:** Laptop- und Smartphone-Test, Seed-Daten, Reset, Fallback-Video,
mindestens eine Person am Stand, die in 2–3 Minuten erklären kann.

---

## 8. Ideenlandschaft (Detail in `docs/03-project-ideas.md`)

| Idee | Kern | Evidenz | 24h | Produkt-Wow | Pitch-Story | Challenge-Fit | Empfehlung |
|---|---|---|---|---|---|---|---|
| **Viva / Nachgefragt** | Mündliche Verteidigung üben; KI fragt evidenzgebunden nach | Assessment-Integrität, Viva-Reliabilität, Self-Explanation | Mittel | Hoch | Sehr hoch | **#1 + #6** | **Top-Empfehlung** |
| Socratic Lock | Tutor, der Antworten verweigert; Hint-Ladder + Transfer | Bastani, Hint-Ladder, Self-Explanation | Mittel | Mittel–hoch | Hoch | #6 | Runner-up |
| Failure First Lab | Productive Failure: erst scheitern, dann konsolidieren | Sinha & Kapur, contrasting cases | Mittel | Hoch | Sehr hoch | #6 / eigene Idee | Stark, aber Content-Risiko |
| Klassenzimmer-Simulator | Lehrer:innen üben schwierige Gespräche mit KI-Schülern | Simulation, Debriefing, Teacher Education | Mittel | Hoch | Hoch | eigene Idee / #2 | Beste Simulation |
| AI Literacy Lab | Halluzinationsjagd + Quellenprüfung | AI Literacy, Calibration, Detection-Problem | Niedrig | Hoch | Sehr hoch | #6 / #3 | Sicherster Build |
| Azubi Talk | Berufliches Rollenspiel mit Rubrik-Debrief | Simulation, LLM-Roleplay, VET | Mittel | Hoch | Hoch | #4 | Regional stark |
| SkillPass | Kompetenznachweis für Azubis | Micro-Credentials, VET | Mittel | Mittel | Mittel | #2 / #5 | Policy-Tailwind, weniger Wow |
| Recall Coach | Retrieval + Calibration + Spacing | Retrieval, Spacing, Feedback | Niedrig | Mittel | Mittel | #1/#6 (schwach) | Sicher, aber crowded |

**Entscheidungsregel:** Die sechs Beispiel-Challenges sind Orientierung, keine
Pflicht. Wenn die mündliche Einweisung eine andere Challenge oder eine eigene
Idee nahelegt, **Framing anpassen, nicht die Technik neu bauen.** Viva passt
primär zu #1 und #6; für #2–#5 gibt es die Pivots in
`docs/03-project-ideas.md`. Die Kernschleife bleibt jeweils ein interaktiver
Dialog mit Evidenz und Debrief.

---

## 9. Quellen (kuratiert)

### KI-Tutoren und Lernen

1. Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., & Mariman, R.
   (2025). Generative AI without guardrails can harm learning: Evidence from
   high school mathematics. *PNAS*, 122(26), e2422633122.
   https://doi.org/10.1073/pnas.2422633122 `[P]`
2. Kestin, G., Miller, K., Klales, A., Milbourne, T., & Ponti, G. (2025). AI
   tutoring outperforms in-class active learning: an RCT introducing a novel
   research-based design in an authentic educational setting. *Scientific
   Reports*, 15, 17458. https://doi.org/10.1038/s41598-025-97652-6 `[P]`
3. Oreopoulos, P., & Low, N. (2026). One Click Away: AI Tutoring with Khanmigo
   in a Two-Year School Experiment. NBER Working Paper 35620.
   https://www.nber.org/papers/w35620 `[WP]`
4. VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent
   tutoring systems, and other tutoring systems. *Educational Psychologist*,
   46(4), 197–221. https://doi.org/10.1080/00461520.2011.611369 `[P]`
5. Ma, W., Adesope, O. O., Nesbit, J. C., & Liu, Q. (2014). Intelligent tutoring
   systems and learning outcomes: A meta-analysis. *Journal of Educational
   Psychology*, 106(4), 901–918. https://doi.org/10.1037/a0037123 `[P]`
6. Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018).
   Inducing self-explanation: A meta-analysis. *Educational Psychology Review*,
   30, 703–725. https://doi.org/10.1007/s10648-018-9434-x `[P]`
7. Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023). A
   meta-analysis of the worked examples effect on mathematics performance.
   *Educational Psychology Review*, 35, 11.
   https://doi.org/10.1007/s10648-023-09745-1 `[P]`
8. Kobayashi, K. (2019). Learning by preparing-to-teach and teaching: A
   meta-analysis. *Japanese Psychological Research*, 61(3), 192–203.
   https://doi.org/10.1111/jpr.12221 `[P]`
9. Macina, J., Daheim, N., Hakimi, I., Kapur, M., Gurevych, I., & Sachan, M.
   (2025). MathTutorBench: A benchmark for measuring open-ended pedagogical
   capabilities of LLM tutors. *EMNLP 2025*.
   https://aclanthology.org/2025.emnlp-main.11/ `[P]`
10. Dinucu-Jianu, D., Macina, J., Daheim, N., Hakimi, I., Gurevych, I., &
    Käser, T. (2026). Evaluating answer leakage robustness of LLM tutors
    against adversarial student attacks. *ACL 2026*.
    https://aclanthology.org/2026.acl-long.1412.pdf `[P]`

### Lernwissenschaft

11. Agarwal, P. K., Nunes, L. D., & Blunt, J. R. (2021). Retrieval practice
    consistently benefits student learning: A systematic review of applied
    research in schools and classrooms. *Educational Psychology Review*.
    https://doi.org/10.1007/s10648-021-09595-9 `[P]`
12. Latimier, A., Peyre, H., & Ramus, F. (2021). A meta-analytic review of the
    benefit of spacing out retrieval practice episodes on retention.
    *Educational Psychology Review*.
    https://doi.org/10.1007/s10648-020-09572-8 `[P]`
13. Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of
    interleaved learning and its moderators. *Psychological Bulletin*.
    https://doi.org/10.1037/bul0000209 `[P]`
14. Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction
    works: Evidence for productive failure. *Review of Educational Research*.
    https://doi.org/10.3102/00346543211019105 `[P]`
15. Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback
    revisited: A meta-analysis of educational feedback research. *Frontiers in
    Psychology*. https://doi.org/10.3389/fpsyg.2019.03087 `[P]`
16. Tetzlaff, L., Simonsmeier, B. A., Peters, M. T., & Brod, G. (2025). A
    cornerstone of adaptivity — A meta-analysis of the expertise reversal
    effect. *Learning and Instruction*.
    https://doi.org/10.1016/j.learninstruc.2025.102142 `[P]`
17. Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning:
    Meta-analytic review and synthesis. *Psychological Bulletin*.
    https://doi.org/10.1037/bul0000151 `[P]`

### Games, Simulationen, XR

18. Chernikova, O., Heitzmann, N., Stadler, M., Holzberger, D., Seidel, T., &
    Fischer, F. (2020). Simulation-based learning in higher education: A
    meta-analysis. *Review of Educational Research*, 90(4), 499–541.
    https://doi.org/10.3102/0034654320933544 `[P]`
19. Barz, N., Benick, M., Dörrenbächer-Ulrich, L., & Perels, F. (2023). The
    effect of digital game-based learning interventions on cognitive,
    metacognitive, and affective-motivational learning outcomes in school: A
    meta-analysis. *Review of Educational Research*.
    https://doi.org/10.3102/00346543231167795 `[P]`
20. Sailer, M., & Homner, L. (2020). The gamification of learning: A
    meta-analysis. *Educational Psychology Review*, 32, 77–112.
    https://doi.org/10.1007/s10648-019-09498-w `[P]`
21. Keiser, N. L., & Arthur, W., Jr. (2021). A meta-analysis of the
    effectiveness of the after-action review (or debrief) and factors that
    influence its effectiveness. *Journal of Applied Psychology*, 106(7),
    1007–1032. https://doi.org/10.1037/apl0000821 `[P]`
22. Parong, J., & Mayer, R. E. (2018). Learning science in immersive virtual
    reality. *Journal of Educational Psychology*, 110(6), 785–797.
    https://doi.org/10.1037/edu0000241 `[P]`
23. Alaker, M., et al. (2022). The potential of immersive virtual reality to
    enhance learning: A meta-analysis. *Educational Research Review*.
    https://www.sciencedirect.com/science/article/abs/pii/S1747938X22000215 `[P]`
24. Shute, V. J., et al. (2020). Maximizing learning without sacrificing the
    fun: Stealth assessment, adaptivity and learning supports in educational
    games. *Journal of Computer Assisted Learning*, 37(1), 127–141.
    https://doi.org/10.1111/jcal.12473 `[P]`

### Assessment, AI Literacy, Ethik

25. Weber-Wulff, D., et al. (2023). Testing of detection tools for AI-generated
    text. *International Journal for Educational Integrity*.
    https://link.springer.com/article/10.1007/s40979-023-00146-z `[P]`
26. HEPI/Kortext (2026). Student Generative AI Survey 2026.
    https://www.hepi.ac.uk/reports/student-generative-ai-survey-2026/ `[POL]`
27. TEQSA (2025). Enacting assessment reform in a time of AI.
    https://www.teqsa.gov.au/sites/default/files/2025-09/enacting-assessment-reform-in-a-time-of-artificial-intelligence.pdf `[POL]`
28. Li, et al. (2026). Research synthesis on LLM essay scoring.
    https://arxiv.org/abs/2512.14561 `[PP]`
29. Jia, et al. (2024). >23 % hallucinated content in LLM feedback on student
    reports. https://zenodo.org/records/12729868 `[P]`
30. UNESCO (2024). AI competency framework for students.
    https://www.unesco.org/en/articles/ai-competency-framework-students `[POL]`
31. EU AI Act, Annex III.
    https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-3 `[L]`
32. EU AI Act, Article 14.
    https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14 `[L]`
33. GDPR, Article 22. https://gdpr-info.eu/art-22-gdpr/ `[L]`
34. KMK (2024). Handlungsempfehlung KI in schulischen Bildungsprozessen.
    https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2024/2024_10_10-Handlungsempfehlung-KI.pdf `[POL]`

### Future Skills und Deutschland

35. OECD. Learning Compass 2030.
    https://www.oecd.org/content/dam/oecd/en/about/projects/edu/education-2040/concept-notes/OECD_Learning_Compass_2030_concept_note.pdf `[POL]`
36. WEF (2025). Future of Jobs Report 2025.
    https://www.weforum.org/publications/the-future-of-jobs-report-2025/ `[POL]`
37. European Commission JRC. DigComp 3.0.
    https://joint-research-centre.ec.europa.eu/scientific-activities/key-competences-lifelong-learning/digital-competence-framework-digcomp/digcomp-30_en `[POL]`
38. KMK (2025). Lehrkräfteeinstellungsbedarf und -angebot 2025–2035.
    https://www.kmk.org/fileadmin/Dateien/pdf/Statistik/Dokumentationen/Dok_247_Bericht_LEB_LEA_2025.pdf `[POL]`
39. BMBF (2025). DigitalPakt 2.0.
    https://www.bmbfsfj.bund.de/bmbfsfj/aktuelles/pressemitteilungen/digitalisierung-von-schulen-bund-und-laender-einig-ueber-den-digitalpakt-2-0-278566 `[POL]`
40. BIBB (2025). Angespannte Lage auf dem Ausbildungsmarkt.
    https://www.bibb.de/dokumente/pdf/pmbilanzausbildungsmarkt2025.pdf `[POL]`
41. OECD (2022). PISA 2022 Germany country note.
    https://www.oecd.org/en/publications/pisa-2022-results-volume-i-and-ii-country-notes_ed6fbcc5-en/germany_1a2cf137-en.html `[POL]`
42. Hochschule Fulda. Profil.
    https://www.hs-fulda.de/hochschule/profil `[POL]`

---

## 10. Unsicherheiten und Don’ts

1. **Effektstärken aus Labors schrumpfen im Feld.** Keine konkreten
   Lerngewinne versprechen; Pilotzahlen nennen.
2. **KI-Tutor-Evidenz ist kurzzeitig und kontextspezifisch.** Der Harvard-RCT
   ist ein Kurs; Khanmigo ist ein Working Paper; Bastani ist High-School-Mathe.
3. **Reliability ≠ Validity.** LLM-Grading kann konsistent und trotzdem falsch
   sein.
4. **AI-Detection-Zahlen generalisieren nicht.** Die Richtung (unzuverlässig,
   bias, evadable) ist robust; exakte Prozentwerte nicht.
5. **AI Act-Timeline prüfen.** Annex III High-Risk ab 2.12.2027; Article 4/50
   früher. Keine Rechtsberatung; keine Compliance-Claims.
6. **Mündliche Prüfungen sind nicht automatisch fair.** Akzent, Angst,
   Neurodivergenz, Kultur können benachteiligen; strukturierte Rubriken und
   Wahlmöglichkeiten nötig.
7. **Micro-Credentials sind kein Arbeitsmarkt-Garant.** Policy-Tailwind, aber
   Recognition lückenhaft.
8. **Hochschule Fulda ist kein Lehrerbildungs-Hub.** Regionale/institutionelle
   Claims prüfen.
9. **Ein 24h-Demo validiert nichts.** Formativ testen, ehrlich berichten,
   keine „Evidenz“ behaupten, die nicht existiert.
10. **Die Challenge ist bekannt, aber die mündliche Einweisung kann
    präzisieren.** Die sechs Beispiel-Challenges sind Orientierung; eigene
    Ideen sind erlaubt. Viva ist unsere eigene Challenge und passt zu #1/#6.
    Vor Ort gegen die Orga-Vorgaben prüfen.

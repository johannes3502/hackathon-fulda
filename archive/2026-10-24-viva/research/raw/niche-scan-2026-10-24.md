# Nischen-Scan Future Education — 24.10.2026, 11:15

**Auftrag:** Anforderungen lesen; tiefe, unterentwickelte Nischen finden;
bestehende Produkte mit neuer USP; bestehende Tools zu einem neuen Tool
kombinieren; größte ungelöste Probleme benennen.
**Methode:** Web-Scan (Papers, arXiv, ACL, CHI/LAK/AIME, Produktseiten,
Launch-Seiten, Devpost, GitHub) + Abgleich mit `docs/00-requirements.md`,
`docs/01-challenge.md`, `docs/02-deep-research.md`, `docs/03-project-ideas.md`.
**Grenzen:** Kein vollständiger Markt-Scan; private Betas und X/Twitter sind
nicht systematisch indexiert. „Kein direktes Produkt gefunden“ heißt: im
öffentlichen Web nicht gefunden, nicht: existiert nicht.

---

## 0. Kurzfazit

**Die naheliegenden Ideen sind keine White Spaces mehr.** Stand 24.10.2026
gibt es bereits mehrere live Produkte oder Prototypen für:

- KI-mündliche Prüfungen (NYU Viva, Prova, VivaProof, OralExam.ai, Eduface,
  FeedbackFruits, VoiceExam, CALLIOPE, ACA-Bot),
- Teachable Agents (Axiom Flow, Noura, Explique, Teach2Learn, LLM Protégés),
- „Unassisted Transfer“-Lernapps (Ritsu, Museion, Transfer, ProofLearn, Mentra),
- Prozess-/Autorschaftsnachweise (Grammarly Authorship, Blackboard Cursive,
  DraftTrace, WritingTrace, AuthorAware, Slima, OHAS/TWFF),
- Lehrerbeobachtung/Coaching (TeachFX, Edthena, Mursion, TeachSim, ClassMind,
  TeachUp, NiCo, Noticing),
- Skill-Verifikation (Work ED, SkillCertify, TradeTasks, Skillform, Interplay,
  Workera, ReadyLab, LivedX),
- Prüfungs-/Item-Audit (Qorrect, ExamEval, TAO, BenchMarkerUI, QVAF, Axiom,
  EdStack, TiobExam),
- Kalibrierung/Reliance (MindFrame, Headstart, MetaLearn OS, UnderstandIQ,
  THINK, GuidED, Simby, A* AI).

**Die verbleibende Lücke ist nicht die nächste Interaktion, sondern die
Evidenzschicht:** Validität, Fairness, angemessene Reliance, Feedback-Literacy
und portable Nachweise unassisted Könnens. Wer 2026 gewinnen will, baut nicht
„noch einen KI-Prüfer“, sondern das Vertrauens- und Evidenzsystem um die
Prüfer herum.

**Die drei stärksten Hackathon-Wedges:**

1. **Misconception Mirror** — die KI übernimmt den Irrtum der Lernenden und
   muss ihn ihr austreiben. Bestes #6-Fit, stärkster Demo-Moment.
2. **Fairness-/Validitäts-Auditor für KI-Prüfungen** — der „TÜV“ für den
   Oral-Exam-Goldrausch. Originellste Kategorie, stärkster #1-Fit.
3. **Feedback Gym** — Lernende lernen, KI-Feedback zu beurteilen, bevor sie es
   anwenden. Niedrigstes Build-Risiko, starke Evidenz.

---

## 1. Markt-Sättigungskarte

| Cluster | Beispiele (Stand 24.10.2026) | Status | Verbleibende Lücke |
|---|---|---|---|
| KI-mündliche Prüfungen | NYU Viva (1.000+ Studierende, Alpha; CACM Nov 2026), Prova, VivaProof, OralExam.ai, Eduface, FeedbackFruits, VoiceExam, CALLIOPE, ACA-Bot, Conversational Exam | **sehr crowded** | Fairness-/Validitäts-Audit, Appeals, Accommodations, Vergleichbarkeit |
| Teachable Agents | Axiom Flow („Sam“), Noura, Explique (546 Studierende), Teach2Learn, LLM Protégés | **emerging** | Misconception aus dem eigenen Fehler, Transfer-Examen, Teacher View |
| Unassisted-Transfer-Apps | Ritsu (Launch 19.10.2026), Museion, Transfer (Devpost), ProofLearn, Mentra | **emerging, schnell** | Institutionelle Evidenz/Credential, verzögerte Retention, Lehrer-/Arbeitgebervertrauen |
| Prozess-/Autorschaft | Grammarly Authorship, Blackboard Cursive, DraftTrace, WritingTrace, AuthorAware, Slima, OHAS/TWFF | **crowded** | Schüler-/Studierenden-eigene portable Evidenz, Appeals, Datenschutz |
| Lehrerbeobachtung/Coaching | TeachFX, Edthena, Mursion, TeachSim, ClassMind, TeachUp, NiCo, Noticing | **crowded** | Noticing von Schülerdenken, Entscheidungsunterstützung, non-evaluativ |
| Skill-Verifikation | Work ED, SkillCertify, TradeTasks, Skillform, Interplay, Workera, ReadyLab, LivedX | **crowded** | Accommodations, Arbeitgebervertrauen, RPL, Validität von Video-Evidenz |
| Prüfungs-/Item-Audit | Qorrect, ExamEval, TAO, BenchMarkerUI, QVAF, Axiom, EdStack, TiobExam | **crowded** | Diverse Lernenden-Simulation + KI-Lösbarkeit + Accessibility in einem Workflow |
| Kalibrierung/Reliance | MindFrame, Headstart, MetaLearn OS, UnderstandIQ, THINK, GuidED, Simby, A* AI | **emerging** | Angemessene Reliance (over + under), institutionell, Transfer |
| Feedback | Learnlab, StoryCoach, Writor, Prober.ai, Class Companion | **crowded (Generierung)** | Feedback-Literacy/Evaluiative Judgment, Enactment |

**Konsequenz:** Jede Idee, die nur „KI stellt Fragen“, „KI bewertet“, „KI
erklärt“, „KI generiert Prüfungen“ oder „KI trackt Prozess“ ist, ist 2026
differenzierungsarm. Differenzierung entsteht durch: **eine neue Messgröße**,
**eine neue Evidenzkette** oder **eine bisher ausgeschlossene Nutzergruppe**.

---

## 2. Die tiefen Nischen

### N1 — Fairness-/Validitäts-Auditor für KI-Prüfungen

**Was fehlt:** Produkte *führen* KI-Prüfungen durch und *benoten* sie. Kaum ein
Produkt prüft, ob alle Lernenden die **gleiche Chance hatten, ihr Verständnis
zu zeigen**. NYU Viva sagt selbst: keine blinded expert re-grading, keine
Subgroup-Fairness-Analyse. Die WAC-Analyse 2026 zeigt: nur 41 % der
Score-Varianz im UK-GP-Oral spiegelt echte Kandidatenunterschiede; Reliabilität
0,65; Fairness-Probleme bei Akzent, Geschlecht, Kommunikationskompetenz,
Behinderung. Audio-LMs bewerten chinesische und nigerianische Akzente systematisch
schlechter (ρ = −0,35 bis −0,66). NNES-Schreibende werden zu 50,2–61,3 % falsch
als KI markiert.

**Neue USP:** „Der TÜV für KI-Prüfungen: Bevor du skalierst, prüfe, ob alle
die gleiche Chance hatten, ihr Verständnis zu zeigen.“

**Kernschleife:** 3–5 Transkripte/Audio hochladen → Metriken extrahieren
(Fragetiefe, Follow-ups, Unterbrechungen, Sprechzeit, Rubrik-Scores,
Evidenzabdeckung) → ungleiche Gelegenheiten flaggen → kontrafaktischen Studenten
simulieren (gleicher Inhalt, anderer Akzent/Tempo) → menschliche Review →
Appeal-fähiger Report.

**90-Sekunden-Demo:** Drei synthetische Studierende mit gleichem Wissen, aber
unterschiedlichem Akzent/Tempo. Dashboard zeigt: A bekommt 3 Follow-ups, B wird
unterbrochen, C bekommt 0,8 Punkte weniger. Klick öffnet die exakte Turn-Stelle.
„Das ist kein Bias-Beweis, aber ein Prüfauftrag.“

**Build:** niedrig–mittel. Deterministische Metriken + LLM für
Frageklassifikation; synthetische Audios optional. Kein Live-Speech nötig.

**Risiko:** Compliance-Dashboard statt Wow. Muss einen konkreten,
nachvollziehbaren Ungerechtigkeitsmoment zeigen.

**Warum #1-Fit:** Es verschiebt die Debatte von „KI erkennt Schummeln“ zu
„KI-Prüfung muss fair sein“ — und verkauft die Infrastruktur an alle, die gerade
Oral Exams skalieren.

---

### N2 — Misconception Mirror (Teachable Agent mit dem eigenen Irrtum)

**Was existiert:** Axiom Flow lässt Studierende „Sam“ unterrichten, der
vorab definierte Misconceptions aus dem Material hat. Noura lässt Studierende
einem KI-Studenten erklären. Explique/Teach2Learn erforschen Teachable Agents.
**Was fehlt:** Der KI-Student übernimmt **den konkreten Irrtum der Lernenden**,
nicht einen generischen Kurs-Irrtum. Der Spiegel-Effekt — „die KI glaubt jetzt,
was du glaubst“ — existiert so nicht als Produkt.

**Neue USP:** „Die KI übernimmt deinen Irrtum. Du musst ihn ihr austreiben.“

**Evidenz:** Learning by Teaching / Protégé-Effekt; Knowledge-Building statt
Knowledge-Telling sagt Post-Test-Leistung voraus, besonders bei Low-Prior-
Studierenden; LLM-Protégé-Studie: +0,72 Punkte, Failure-Rate 28 % → 8 %;
Self-Explanation g ≈ 0,55; Misconception-Diagnose + Contrasting Cases.

**Kernschleife:** Antwort auf Concept Question → System diagnostiziert
Misconception → KI-Student übernimmt genau diese Denkweise und argumentiert
dafür → Lernende:r erklärt, warum das falsch ist → KI stellt naive Follow-ups →
KI legt ein kurzes Transfer-Examen ab → Report: „Das hat die KI gelernt; das
glaubt sie noch.“

**90-Sekunden-Demo:** Juror beantwortet eine Seed-Frage falsch. KI: „Okay, ich
glaube also [falsches Modell].“ Juror unterrichtet. KI fragt nach. Transfer-
Examen. „Sam glaubt immer noch X — genau da ist deine Lücke.“ Der Juror sieht
den eigenen Denkfehler im Spiegel.

**Build:** mittel. State Machine, Misconception-Library, LLM-Roleplay mit
Constraint-Prompts, deterministischer Fallback. Kein Speech nötig.

**Risiko:** LLM-Sycophancy; der Agent darf nicht einfach zustimmen. Braucht
harte Zustandsregeln und eine kuratierte Misconception-Map.

**Warum #6-Fit:** Die Challenge #6 fordert genau „widerspricht, fragt nach,
zeigt Argumentationslücken“ — hier tut es die KI, indem sie den Fehler des
Menschen verkörpert.

---

### N3 — Feedback Gym (Evaluiative Judgment statt Feedback-Generierung)

**Was existiert:** Viele Tools generieren KI-Feedback (Learnlab, StoryCoach,
Writor, Prober.ai, Class Companion). **Was fehlt:** Lernende werden nicht darin
trainiert, KI-Feedback zu **beurteilen**, zu filtern und in Revision zu
übersetzen. Die große Studie mit 13.037 Studierenden zeigt: Enacted-Feedback-
Workflow 26,2 % Uptake, Directed 14,1 %, Self-Directed 0,1 %. Feedback-
Literacy-Training (FRAC) + Kalibrierung (APCA) verbessert Writing Quality und
Retention nach Entzug der KI.

**Neue USP:** „Die KI gibt Feedback. Du entscheidest, was davon stimmt.“

**Kernschleife:** Eigenen Draft einfügen → 3 KI-Kommentare (einer valide, einer
vage, einer subtil falsch) → Lernende:r beurteilt, begründet, wählt aus →
Revision → System scored Feedback-Diskrimination, Revision Quality und
Kalibrierung → Teacher Dashboard: „62 % sind auf den falschen Kommentar
reingefallen.“

**90-Sekunden-Demo:** Seed-Essay, drei Kommentare. Juror wählt den Kommentar,
den er anwenden würde. System zeigt: „Das war der falsche — er klingt präzise,
ist aber inhaltlich falsch.“ Revision, Score, Klassenmuster.

**Build:** niedrig. Kuratierte Kommentare + Rubrik; LLM optional. Sehr
zuverlässig, kein Speech, keine Live-API nötig.

**Risiko:** Quiz-Gefühl. Muss an einem echten Draft und einer sichtbaren
Revision hängen.

**Warum #1/#6-Fit:** Es adressiert die eigentliche Bottleneck — nicht
Feedback-Mangel, sondern Feedback-Uptake und Urteilsfähigkeit.

---

### N4 — Unassisted Evidence Passport (institutionelle Evidenz statt Study-App)

**Was existiert:** Ritsu, Museion, Transfer, ProofLearn, Mentra — alle bauen
„AI-assisted learning → AI removed → transfer check“. **Was fehlt:** Die
**institutionelle Evidenzkette**: assisted vs. unassisted, sofort vs. verzögert,
Transfer, Kalibrierung, portables Evidence-Card für Lehrkraft/Arbeitgeber.
Die meisten sind Consumer-Study-Tools, keine Assessment-/Credential-Produkte.

**Neue USP:** „Nicht was du mit KI geschafft hast. Was du ohne sie kannst — und
was davon bleibt.“

**Evidenz:** Stanford K-12 Review 2026: AI verbessert Performance mit Tool,
Transfer gemischt; Bastani PNAS 2025: ungeguardrailt −17 % unassisted; German
RCT 2026: +0,28 SD immediate, +0,21 SD nach einer Woche; AI Learning Evidence:
nur 42 von 111 Kontrasten ohne AI gemessen; „performance-competence divide“ in
Meta-Analysen.

**Kernschleife:** KI-gestützt lernen → KI ausblenden → parallele Transfer-
Aufgabe → Confidence → 7-Tage-Recheck → Evidence Card (assisted/unassisted/
retained) → Lehrkraft/Arbeitgeber verifiziert.

**90-Sekunden-Demo:** 60 Sekunden mit KI lernen; KI aus; Transferfrage;
„Assisted 92 %, Unassisted 41 %, Dependency Gap 51 Punkte“; 7-Tage-Simulation;
Evidence Card mit QR.

**Build:** niedrig–mittel. Item-Generierung + deterministische Verifikation;
Seed-Pfad; kein Speech.

**Risiko:** Consumer-Markt ist crowded; als „noch eine Study-App“ positioniert
verliert es. Als **Assessment-/Credential-Layer** ist es differenziert.

---

### N5 — Assessment Accessibility Copilot (VET / Hochschule)

**Was existiert:** Accessibility-Features in Prüfungsplattformen, AI-Assistenz-
Tools, aber kaum ein Tool, das **Accommodations designing** und deren
Konstruktvalidität prüft. Die NZ-Studie 2025 fand: KI-generierte
Basis-Assessments fielen durch Moderation, aber **personalisierte Assessor-
Guidance** für ESL/Autismus war „excellent“ und „beyond minimum viable
product“. OECD VET 2026: AI in VET ist früh, ungleich, governance-schwach;
Micro-Credential-Review 2026: nur 9,4 % der Studien in TVET, 5,1 % an der
Schnittstelle.

**Neue USP:** „Gleiche Kompetenz, anderer Weg.“

**Kernschleife:** Aufgabe + Lernendenprofil (Dyslexie, ESL, Autismus,
motorische Einschränkung) → Accommodation-Optionen + angepasste Formulierung +
Assessor-Skript + Evidenz-Validitätscheck → menschliche Freigabe → Vergleich
Standard vs. angepasst.

**90-Sekunden-Demo:** Eine Fachaufgabe (z. B. Pflege/Welding). Profil wählen.
System zeigt: angepasste Instruktion, Assessor-Hinweise („one task at a time“,
„30–50 % mehr Zeit“), welche Evidenz weiterhin zählt. „Das ist keine
Notensenkung — es ist dieselbe Kompetenz, anderer Zugang.“

**Build:** niedrig–mittel. Taxonomie + LLM + Human Review.

**Risiko:** Prompt-Wrapper-Eindruck; braucht Domänen-Taxonomie und Co-Design
mit Betroffenen.

**Warum stark:** größte unterversorgte Nutzergruppe, Policy-Tailwind (UDL,
EU-Accessibility, AI Act), aber weniger Wettbewerb als bei Oral Exams.

---

### N6 — Exam X-ray (Prüfungs-Red-Team mit diversen Lernenden)

**Was existiert:** Item-Audit-Tools (Qorrect, ExamEval, TAO, BenchMarkerUI,
QVAF, Axiom) prüfen MCQ-Flaws, KI-Lösbarkeit oder Lesson-Red-Teaming.
**Was fehlt:** Ein Workflow, der **KI-Lösbarkeit + Accessibility +
Construct-Irrelevanz + Transfer** in einem Lauf zeigt — mit simulierten
Lernenden, nicht nur Item-Regeln.

**Neue USP:** „Prüfe die Prüfung, bevor du prüfst.“

**Kernschleife:** Item/Prüfung einfügen → vier Linsen: starker Student,
schwacher Student, KI ohne Kontext, KI mit Kontext, ESL/behinderter Student →
Flags (ambiguity, cueing, construct-irrelevant difficulty, AI-solvable,
accessibility barrier) → minimale Redesign-Vorschläge → Re-Run → menschliche
Freigabe.

**90-Sekunden-Demo:** Eine Frage. Vier Linsen. Die KI löst sie in 3 Sekunden
über einen Oberflächen-Cue; der ESL-Student scheitert an einem Satz, der nicht
die Kompetenz testet; der starke Student besteht auswendig. Ein Klick:
Redesign. Re-Run: KI scheitert, ESL besteht, Kompetenz bleibt.

**Build:** mittel. LLM-Personas + Rubrik + deterministische Seeds.

**Risiko:** crowded; simulierte Lernende sind keine Evidenz. Als
„Red-Team-Hypothesen“ framen, nicht als Vorhersage.

---

### N7 — Groupwork X-ray (individuelle Verantwortung in Gruppenarbeit)

**Was existiert:** Peer-Assessment, Prozess-Analytics, Oral Exams.
**Was fehlt:** Ein skalierbarer, fairer Nachweis **individueller Beiträge** in
Gruppenarbeit, die mit KI erstellt wurde. Kollaboration ist ein
Assessment-Blindfleck; Coauthorship Integrity wird individualisiert gedacht.

**Neue USP:** „Gruppennote war gestern. Wer hat wirklich gedacht?“

**Kernschleife:** Gruppenartefakt + Beitrags-Trace + individuelles Micro-Viva →
Contribution Graph + Evidenzlücken → Lehrkraft sieht, wer welche Claims
verteidigen kann.

**Build:** hoch (Multi-User, Privacy, Live-Daten). Für 24h zu groß.
**Risiko:** Datenschutz, soziale Dynamik, falsche Anschuldigungen.
**Status:** tiefe Nische, aber kein Hackathon-Build.

---

## 3. Größte ungelöste Probleme

| # | Problem | Warum ungelöst | Evidenz | Produkt-Wedge |
|---|---|---|---|---|
| 1 | **Validität von KI-Assessment** | Reliabilität ≠ Validität; keine blinded Expert Re-Grading; LLM-Essay-Scoring ρ ≈ 0,1 in Physik; NYU Viva gibt Validität selbst nicht an | CACM 2026; WAC 2026; Physik-LLM-Judge 2026; LLM Essay Scoring Review 2026 | Fairness-/Validitäts-Auditor |
| 2 | **Fairness über Akzent, Sprache, Behinderung, Tempo** | Oral Exams belohnen schnelle verbale Produktion; Audio-LMs bewerten Akzente unterschiedlich; NNES werden 50–61 % falsch als KI markiert; Accommodations sind Nachgedanke | EMNLP 2026 Accent Bias; NNES Systematic Review 2026; WAC 2026; UDL-Review 2026 | Fairness-Auditor + Accessibility Copilot |
| 3 | **Durable Learning vs. assisted performance** | Fast alle Produkte messen Performance mit Tool; nur 42/111 Evidenzkontraste ohne AI; Transfer/Retention bleiben schwach | Stanford K-12 Review 2026; Bastani PNAS 2025; German RCT 2026; AI Learning Evidence 2026 | Unassisted Evidence Passport |
| 4 | **Angemessene Reliance** | Interventionen senken Over-Reliance, erhöhen aber Under-Reliance; kurze AI-Literacy kann backfiren; kein Interventionstyp verbessert zuverlässig selektives Vertrauen | Bo et al. CHI 2025; Puppart & Aru 2025; Li et al. CHI 2026; TRACE RCT 2026 | Reliance Gym / Trust Calibrator |
| 5 | **Metakognitive Kalibrierung** | KI-Tutoren verschlechtern Kalibrierung (d = 0,75–0,83), besonders bei Novizen; Messung meist Self-Report; Fluency wird mit Understanding verwechselt | JCARM 2026; CHI 2025 Calibration; Frontiers 2026 Cognitive Offloading | Calibration-aware Learning Environment |
| 6 | **Feedback-Uptake / evaluative judgment** | KI-Feedback ist billig, aber Studierende können es nicht beurteilen; Enacted 26,2 % vs. Self-Directed 0,1 % | 13.037-Studenten-Studie 2026; Dai 2026 FRAC/APCA; Yan & Meng 2026 | Feedback Gym |
| 7 | **Vertrauensinfrastruktur für Autorschaft/Prozess** | Prozess-Evidenz ist opt-in, fragmentiert, gamebar; Detection unzuverlässig und bias; kein portabler, datenschutzfreundlicher Standard | Grammarly Authorship; Blackboard Cursive; DraftTrace; OHAS/TWFF; Coauthorship Integrity 2026 | Evidence Passport + Micro-Viva |
| 8 | **Lehrerurteil bei KI-Observation** | LLMs sind bei High-Inference-Urteilen unzuverlässig; Dashboards verändern Praxis kaum; Rolle der Lehrkraft wird rekonfiguriert, nicht ersetzt | CAEAI 2026 Classroom Observation; LAK 2026; Teacher Intervention Review 2026 | Noticing-/Decision-Support-Tool |
| 9 | **Berufliche Kompetenz-Evidenz** | Micro-Credentials fragmentiert; VET-Forschung dünn (9,4 % TVET, 5,1 % Schnittstelle); Arbeitgebervertrauen und Workplace Assessment ungelöst | Micro-Credentials Review 2026; OECD VET 2026; Workplace Evidence White Paper 2026 | Evidence-centred VET / Assessor Copilot |
| 10 | **Individuelle Verantwortung in Gruppenarbeit** | KI + Gruppe macht Beiträge unsichtbar; Peer-Assessment bias-anfällig; kein skalierbarer Nachweis | Group Assessment / Coauthorship Integrity; kaum Produkte | Groupwork X-ray |

**Die gemeinsame Wurzel:** Bildungseinrichtungen können 2026 **Performance**
messen, aber nicht mehr zuverlässig **Verstehen, Urteilsfähigkeit und
dauerhafte Fähigkeit** nachweisen. Jede Nische oben ist eine andere Antwort auf
dieselbe Frage: *Was zählt als Evidenz, wenn der Output nicht mehr der Beweis
ist?*

---

## 4. Tool-Kombinationen (existing × existing = new)

| Kombination | Neues Tool | USP |
|---|---|---|
| NYU Viva / OralExam.ai + psychometrisches DIF-Audit + Accommodation-Taxonomie | **Viva Fairness Auditor** | „Der TÜV für KI-Prüfungen“ |
| Axiom Flow / Noura + Misconception-Diagnose aus der Lernenden-Antwort + Transfer-Examen | **Misconception Mirror** | „Die KI übernimmt deinen Irrtum“ |
| KI-Feedback-Generator + FRAC/APCA + Enacted-Feedback-Workflow | **Feedback Gym** | „Du entscheidest, was vom Feedback stimmt“ |
| Ritsu / Museion + Micro-Credential / Evidence Card + verzögerter Recheck | **Unassisted Evidence Passport** | „Was du ohne KI kannst — und was bleibt“ |
| QVAF / ExamEval + UDL-Accessibility-Audit + simulierte Lernende | **Exam X-ray** | „Prüfe die Prüfung, bevor du prüfst“ |
| TradeTasks / Skillform + Assessor-Guidance-Generator + Evidenz-Validitätscheck | **Access Coach VET** | „Gleiche Kompetenz, anderer Weg“ |
| DraftTrace / Grammarly Authorship + Micro-Viva + portables Credential | **Evidence Passport** | „Prozess + Verteidigung + Nachweis“ |
| TeachFX / Edthena + Noticing-Framework + Contrasting Interpretations | **Noticing Trainer** | „Sehen lernen, was Schüler denken“ |

---

## 5. Hackathon-Konsequenz (Stand 11:15, nach 10:30-Lock)

**Nicht bauen:** generisches Viva/Oral Exam, generischer KI-Tutor,
AI-Detector, Prozess-Überwachung, „noch eine Study-App“, „noch ein
Prüfungsgenerator“. Alles davon ist 2026 differenzierungsarm.

**Wenn der Viva-Kern schon steht:** In 20 Minuten umframen.
- **Misconception Mirror:** Claim-Extraktion, Dialog-State, Rubrik und
  Evidence-Bindung bleiben; neu ist der Agent, der den Fehler der Lernenden
  verkörpert, plus Transfer-Examen. Höchster Demo-Wow, #6-Fit.
- **Viva Fairness Auditor:** Transkript-/Rubrik-Pipeline bleibt; neu ist das
  Fairness-Dashboard mit kontrafaktischen Studenten. Originellste Kategorie,
  #1-Fit.

**Wenn bei null gestartet wird:** **Feedback Gym** (niedrigstes Risiko, starke
Evidenz) oder **Misconception Mirror** (höchster Wow).

**90-Sekunden-Demo für den Top-Pick (Misconception Mirror):**
1. 0:00–0:10: „Die KI glaubt jetzt, was du glaubst.“
2. 0:10–0:30: Seed-Frage; Juror antwortet falsch.
3. 0:30–0:50: KI übernimmt den Irrtum und argumentiert dafür.
4. 0:50–1:15: Juror erklärt; KI fragt naiv nach; Juror korrigiert.
5. 1:15–1:35: KI-Transfer-Examen; „Das glaubt sie noch.“
6. 1:35–1:50: Evidence Card + Teacher View + Reset.

**Pitch-Satz:** „KI-Tutoren geben Antworten. Unser KI-Student übernimmt deinen
Irrtum — und zwingt dich, ihn zu widerlegen. Wer lehren kann, hat verstanden.“

---

## 6. Quellen (Auswahl, mit Typ)

### KI-Prüfungen / Oral Exams
- Ipeirotis & Rizakos (2026). Scalable and Personalized Oral Assessments Using
  Voice AI. CACM. https://dl.acm.org/doi/10.1145/3831714 `[P]`
- Ipeirotis & Rizakos (2026). arXiv:2603.18221. `[PP]`
- Barba & Stegner (2026). The Conversational Exam. arXiv:2601.10691. `[PP]`
- Kadir (2026). CALLIOPE. arXiv:2610.00290. `[PP]`
- ACA-Bot (2026). INLG 2026. `[P]`
- Harrington & Joordens (2026). Scaling Authentic Assessment. EduCHI 2026.
  https://dl.acm.org/doi/epdf/10.1145/3803869.3803889 `[P]`
- World Assessment Council (2026). Is the Oral Exam the Answer to AI?
  https://worldassessmentcouncil.org/signal/is-the-oral-exam-the-answer-to-ai/ `[POL]`
- Ebrahimzadeh, Shibani & Buckingham Shum (2026). Coauthorship Integrity.
  CAEAI. https://doi.org/10.1016/j.caeai.2026.100609 `[P]`

### Fairness / Bias
- Srivastava et al. (2026). The Cost of Sounding Different: Accent Bias in
  Audio LMs. EMNLP 2026. https://aclanthology.org/2026.emnlp-main.1612/ `[P]`
- NNES Systematic Review (2026). GenAI assessment equity for non-native
  English-speaking medical students. https://doi.org/10.1186/s12909-026-09303-7 `[P]`
- UDL/Inclusive Assessment Review (2026). `[P]`
- Al-Maamari et al. (2026). Accessible ICT-Enabled Examination Technologies. `[P]`

### Lernen / Transfer / Calibration
- Bastani et al. (2025). PNAS 122(26), e2422633122. `[P]`
- Kestin et al. (2025). Scientific Reports 15, 17458. `[P]`
- Oreopoulos & Low (2026). Khanmigo NBER WP 35620. `[WP]`
- Stanford SCALE (2026). The Evidence Base on AI in K-12.
  https://scale.stanford.edu/sites/default/files/The%20Evidence%20Base%20on%20AI%20in%20K-12%20Report.pdf `[POL]`
- AI Learning Evidence (2026). https://ai-learningevidence.com/ `[POL]`
- German RCT (2026). Experimental Evidence on the Learning Impact of
  Generative AI. https://germanr.com/papers/cr_ai_learning.pdf `[WP]`
- Lee et al. (2025). AI-powered metacognitive calibration. CHI 2025. `[P]`
- JCARM (2026). Generative AI tutors impair metacognitive monitoring
  (d = 0.75; transfer d = 0.83). `[P]`
- Yuan & Du (2026). Technology-Supported Interventions and Metacognition.
  Educational Psychology Review. `[P]`

### Reliance / AI Literacy
- Bo, Wan & Anderson (2025). To Rely or Not to Rely? CHI 2025. `[P]`
- Li et al. (2026). Guided Reflection in AI-Assisted Decision-Making. CHI 2026. `[P]`
- Puppart & Aru (2025). Brief AI literacy intervention increases under-reliance. `[PP]`
- TRACE cluster-RCT (2026). SSR registry 19544. `[WP]`
- Qazi et al. (2026). Behavioral nudges to mitigate automation bias. medRxiv. `[PP]`

### Feedback / Teachable Agents
- 13,037-student feedback workflow study (2026). arXiv:2608.11625. `[PP]`
- Dai (2026). Feedback literacy scripts + calibration training. Frontiers in
  Psychology. `[P]`
- Chen et al. (2026). Learning by Teaching with ChatGPT. BJET 57(1). `[P]`
- Wang et al. (2026). Turning 500+ Students into Teachers (Explique). `[P]`
- Kucharavy et al. (2025). LLMs Protégés. BEA 2025. `[P]`
- Ameen et al. (2026). Knowledge-building in tutor learning. `[P]`

### Produkte / Markt
- NYU Viva: https://viva.stern.nyu.edu/
- Prova: https://prova.education/
- VivaProof: https://www.vivaproof.com/
- OralExam.ai: https://oralexam.ai/
- Eduface: https://eduface.me/product/oral-examination
- FeedbackFruits Oral Assessment: https://feedbackfruits.com/solutions/oral-assessment
- VoiceExam: https://suppyo.com/
- Axiom Flow: https://axiomflow.app/
- Noura: https://noura.study/
- Ritsu: https://ritsu.ai/blog/ritsu-launch-ai-tutor
- Museion: https://github.com/metaforismo/Museion
- Transfer (Devpost): https://devpost.com/software/transfer-proof-you-actually-learned-it
- ProofLearn (Devpost): https://devpost.com/software/prooflearn
- Mentra: https://www.mymentra.ai/
- Grammarly Authorship: https://www.grammarly.com/authorship
- Blackboard Cursive: (Pressemitteilung, 02.09.2026)
- DraftTrace: https://arxiv.org/html/2609.36544
- TeachFX: https://www.teachfx.com/
- Edthena: https://www.edthena.com/
- Mursion: https://www.mursion.com/solutions/education/
- TeachSim: https://openedx.org/case-studies/teachsim-ai-powered-teacher-training-built-on-the-open-edx-platform/
- Work ED: https://worked.com/verify/
- SkillCertify: https://www.skillcertify.co.uk/
- TradeTasks: https://tradetasks.ai/
- Skillform: https://www.skillform.ai/
- Interplay Skill Verification: PRNewswire, 15.10.2026
- Qorrect: https://qorrectassess.com/en/ai-exam-quality-review
- ExamEval: https://www.exameval.com/
- TAO: https://www.taotesting.com/ai-assessment/
- BenchMarkerUI: https://ci.acm.org/2026/pdf/CI_2026_and_HCOMP_2026_camera_ready_XXX237.pdf
- QVAF: https://github.com/amunozUOW/QVAF
- Axiom (Lesson Red Team): https://github.com/Noellikecode/Lesson-lint
- MindFrame: https://usemindframe.com/
- Headstart: https://joinheadstart.com/
- MetaLearn OS: https://github.com/SHzzzAyys/metalearn-os
- UnderstandIQ: https://github.com/RayanAIX/understandiq
- THINK: https://www.augmentedintelligenceadvisory.com/
- GuidED: https://guidedcentral.com/
- Simby: https://www.simby.ai/
- Cognity: https://www.cognity.cc/schools
- A* AI: https://astarai.co.uk/schools
- Learnlab Enacted Feedback: arXiv:2608.11625
- StoryCoach: https://doi.org/10.1177/23294906251414835
- Writor: https://arxiv.org/html/2602.04047v1
- Prober.ai: https://arxiv.org/html/2605.05598

### VET / Micro-Credentials
- OECD (2026). Developing Vocational Education and Training with AI. `[POL]`
- Micro-Credentials for STEM Competency Recognition in VET (2026). `[P]`
- International Review of Micro-Credential Systems (OECD 2026). `[POL]`
- Workplace Evidence and Competency Assurance in Australian VET (2026). `[WP]`
- AI-Generated Assessments for VET (2025). Manukau/ConCoVE. `[POL]`

---

## 7. Offene Unsicherheiten

1. **Markt-Scan ist nicht exhaustiv.** Private Betas, YC-Startups und
   nicht-indexierte Produkte können die Lücken bereits füllen.
2. **X/Twitter wurde nicht systematisch ausgewertet.** Die Suche nach
   `site:x.com` lieferte keine verwertbaren Treffer; einzelne X-/LinkedIn-
   Posts wurden nur über Suchmaschinen gefunden.
3. **Viele Produkt-Claims sind Vendor-Claims.** Besonders im Bereich
   „Skill Verification“ und „AI Observation“ ist die Evidenz dünn.
4. **Die Oral-Exam-Evidenz ist selbst umstritten.** Reliabilität 0,65;
   nur 41 % Varianz; Fairness-Probleme. „Oral = valide“ ist ein Overclaim.
5. **Transfer-Messung ist schwer.** Parallele Items sind nicht automatisch
   äquivalent; ein 24h-Demo kann keine verzögerte Retention zeigen.
6. ** Fairness-Audit braucht Ground Truth.** Ohne Experten-Ratings ist ein
   Audit nur ein Screening; das muss im Pitch klar sein.
7. **Teachable Agents können sycophancy verstärken.** Der Agent muss
   architektonisch gezwungen werden, den Irrtum zu halten, nicht zu gefallen.
8. **Keine Rechtsberatung.** AI Act/GDPR-Claims nur als „designed for human
   oversight“, nicht als „compliant“.

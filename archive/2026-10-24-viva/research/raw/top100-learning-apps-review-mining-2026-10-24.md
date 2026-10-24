# Top-100-Lernapps & Lösungen — Review-Mining, Negativ-Muster und Hackathon-Improvements

**Stand:** 24.10.2026, 11:30
**Auftrag:** Top-100-Lernapps/-lösungen passend zu „Future Education“ analysieren,
aktiv Negativbewertungen suchen und prüfen, ob wir sie für den Hackathon
verbessern können.
**Status:** Scope-Lock war 10:30. Dieses Dokument ist **keine Pivot-Vorlage**,
sondern Entscheidungsgrundlage für Viva-Refinement, Pitch-Ammonition und
Red-Team. Pivot-Optionen stehen nur in Abschnitt 8.

---

## 0. Kurzantwort

1. **Der Markt ist bei „Content + KI-Antwort“ gesättigt.** Die 100 Produkte
   unterscheiden sich erstaunlich wenig in ihren Beschwerden: Paywall, Abo-Fallen,
   Gamification statt Lernen, Answer-first, algorithmische Noten, Detection-
   False-Positives, Surveillance und Datenverlust.
2. **Die häufigsten Negativbewertungen sind nicht „die KI ist dumm“, sondern
   „die KI nimmt mir Entscheidungen ab oder tut so, als hätte sie welche“.**
   Genau das ist Vivas Öffnung: KI fragt, der Mensch entscheidet.
3. **Viva wird durch die Reviews in fünf Punkten geschärft:**
   - kein Login/kein Abo/kein Install (Duolingo, Quizlet, Kahoot, Respondus),
   - keine Note/keine Detection (Turnitin, GPTZero, Cambridge-Grading-Studie),
   - **eine** Frage pro Screen, kein Question Stacking (NYU Viva: nur 33 % fanden
     Fragen klar),
   - Text zuerst, Speech optional, kein Audio-Storage (Proctoring/Consent),
   - sichtbare Claim→Zitat→Frage-Kette (Halluzination, „AI slop“).
4. **Der stärkste Gegenwind kommt aus der Lernforschung, nicht vom Markt:**
   Khanmigo-Studie (18 Schulen, 2 Jahre): Schüler wollten die Fragen der KI
   nicht; NYU Viva: 83 % fanden die KI-Prüfung stressiger als schriftlich.
   Viva muss **freiwilliger Übungsraum** sein, nicht aufgezwungene Prüfung.
5. **Der direkte deutsche Wettbewerber steht schon:** ExamSim (Uni Bayreuth,
   KI-Avatar, 276 Teilnehmende). Differenzierung: **eigener Text**, exakte
   Zitatbindung, Teacher Triage, **keine Note**.
6. **Detection ist kein Wachstumsmarkt mehr:** Turnitin verliert UK-Verträge
   (Southampton, Newcastle, Westminster), EULA-Pläne zu KI-Training sorgen für
   Austritte; nach Berichten lässt Yale Detection-Scores nicht mehr als formale
   Beweise zu.
   Das stützt „Viva erkennt keine KI“.
7. **Die 12 Hackathon-Improvements in Abschnitt 6 kosten zusammen ~15 h** und
   sind fast alle Demo-Verbesserungen, keine Architekturwechsel.
8. **Nicht bauen:** Detector, Proctoring, Emotion AI, automatische Note,
   Leaderboard/Streak, Paywall, KI-Notetaker, „noch eine Flashcard-App“.
9. **Pitch-Satz aus den Reviews:** „Die anderen Apps geben dir eine Antwort
   oder eine Note. Viva gibt dir die eine Frage, die du nicht googeln kannst.“
10. **Grenze:** Das ist Review-Mining, keine repräsentative Marktstudie.
    Sternebewertungen verstecken die Beschwerden; Vendor-Benchmarks widersprechen
    unabhängigen Tests. Jede Zahl unten ist mit Quelle und Typ markiert.

---

## 1. Methodik und Grenzen

### 1.1 Was „Top 100“ hier heißt

Es gibt keine seriöse, tagesaktuelle, globale „Top 100“-Liste, die Consumer-Apps,
LMS, Proctoring, Peer-Feedback und Accessibility vergleichbar macht. Deshalb ist
die Liste **segmentbalanciert**, nicht eine einzige Chart-Rangliste.

Auswahlkriterien:
- App-Store-Top-100 oder klarer Kategorie-Führer,
- institutionelle Verbreitung (Hochschule/Schule/Ausbildung),
- direkter Bezug zu „Future Education“ (Lernen, Lehren, Prüfen),
- öffentliche Review-Spur (Trustpilot, Google Play, App Store, G2/Capterra,
  Reddit, BBB, Presse, Studien),
- Abdeckung der ganzen Kette: Lernen → Üben → Bewerten → Prüfen → Nachweisen.

Die 100 verteilen sich auf 11 Segmente:

| Segment | Anzahl | Beispiele |
|---|---:|---|
| Flashcards/Lernapps | 10 | Quizlet, Anki, simpleclub, Studyflix |
| KI-Study/Notetaker | 10 | NotebookLM, StudyFetch, Otter, Fireflies |
| Homework/Content | 8 | Chegg, Course Hero, Photomath, Gauth |
| Sprache | 8 | Duolingo, Babbel, Busuu, Preply |
| K-12 | 8 | Khan Academy, Khanmigo, Prodigy, ClassDojo |
| Classroom Engagement | 8 | Kahoot, Quizizz, Mentimeter, Slido |
| LMS/Courseware | 10 | Canvas, Moodle, Top Hat, Pearson MyLab |
| Assessment/Integrität | 14 | Turnitin, GPTZero, Proctorio, Respondus |
| Feedback/Peer/Oral | 10 | FeedbackFruits, NYU Viva, ExamSim |
| Kursplattformen/Credentials | 10 | Coursera, edX, Udemy, Brilliant |
| Accessibility | 4 | Speechify, Read&Write, Kurzweil, Bookshare |

### 1.2 Quellen und Evidenzgrade

- **[D]** direkte Review-, Presse- oder Studienevidenz zum Produkt.
- **[K]** Kategorie-Muster; nicht produktspezifisch belegt, aber durch
  Schwesterprodukte und Reviews gestützt.
- **[V]** Vendor-Claim; nicht unabhängig bestätigt.
- Quellentypen: `[P]` peer-reviewed, `[WP]` Working Paper, `[PP]` Preprint,
  `[POL]` Politik/Presse/Policy, `[V]` Vendor/Anbieter.

### 1.3 Grenzen (wichtig für die Jury)

1. **Review-Bias:** Wer schreibt, ist häufiger frustriert. Die Muster zeigen
   Reibung, nicht Marktanteile.
2. **Sterne lügen:** Duolingo bleibt bei 4,7★, während die Text-Reviews
   Paywall-Frust zeigen. simpleclub hat 2,4★ auf Google Play und 4,5★ auf
   Trustpilot — derselbe Zeitraum, andere Kohorte.
3. **Vendor-Benchmarks widersprechen sich:** GPTZero nennt 0,09 % False
   Positives; ein 300-Text-Test findet 8,4 % (native) und 23,7 % (ESL).
4. **Keine internen Daten:** Wir sehen keine Lernoutcomes, nur öffentliche
   Signale.
5. **Deutschland ist dünn indexiert:** Viele deutsche Lernapps haben wenige
   Trustpilot-Reviews; Google-Play-Reviews sind lauter, aber nicht repräsentativ.
6. **Die Liste ist eine Entscheidungshilfe, keine Marktgrößenmessung.**

---

## 2. Die Top-100-Karte

**Cluster-Legende:**

| Code | Muster | Kurzdefinition |
|---|---|---|
| C1 | Paywall/Abo | Kerbfunktion hinter Abo, Ads, Auto-Renewal, Kündigungshürden |
| C2 | Gamification | Punkte/Streaks/Leaderboards ersetzen Lernen; Engagement-Theater |
| C3 | KI-Ungenauigkeit | Halluzination, Sycophancy, falsche Schritte, „AI slop“ |
| C4 | Answer-first | Antwort vor Erklärung; Kopieren statt Verstehen |
| C5 | Content-Qualität | Varianz, veraltet, oberflächlich, falsch ausgerichtet |
| C6 | Bewertungsopazität | Algorithmische Note, Bias, nicht erklärbar |
| C7 | Detection-FP | False Positives, Bias, Detection als Beweis |
| C8 | Surveillance/Consent | Aufnahme, Tracking, Kamera, Daten ohne Einwilligung |
| C9 | Proctoring-Zugang | Installation, Gerätelimits, Technik, Barrieren |
| C10 | Kosten | Access Codes, Materialkosten, Zertifikats-Paywall |
| C11 | Peer-Feedback | Geringe Qualität, Gaming, Bias, ungelesene Posts |
| C12 | UX/Mobile/A11y | Komplex, mobil kaputt, Screenreader/Keyboard-Probleme |
| C13 | Datenverlust/Bugs | Fortschritt weg, Dateien weg, falsche Auswertung |
| C14 | Credential-Skepsis | Zertifikat ohne Wert, Paywall, Completion niedrig |
| C15 | Dashboard/Workload | Dashboards ohne Handlung, Lehrkraft überlastet |
| C16 | Oral-Exam-Stress | Angst, unklare Fragen, Zeitdruck, Fairness |
| C17 | Prozess-Evidenz | Opt-in, fragmentiert, gamebar, Equity-Probleme |
| C18 | Vendor-Lock-in | EULA, Datenrechte, Export, Wechselkosten |

### 2.1 Tabelle: 100 Produkte, dominantes Negativ-Muster, Cluster, Beleg

| # | Produkt | Segment | Dominantes Negativ-Muster | Cluster | Beleg |
|---:|---|---|---|---|---|
| 1 | Quizlet | Flashcards | Alles hinter Paywall, Ads, 14-Fragen-Limit | C1 | D |
| 2 | Anki | SRS | Veraltete UI, steile Lernkurve, Mobile teuer | C12 | D |
| 3 | Brainscape | Flashcards | Abo, wenig Differenzierung | C1 | K |
| 4 | RemNote | PKM+SRS | Komplexität, AI-Aufpreis | C12/C1 | K |
| 5 | Knowt | Flashcards+AI | AI-Qualität, Paywall | C3/C1 | K |
| 6 | StudySmarter | Lernplattform | Content-Qualität, Abo | C5/C1 | K |
| 7 | simpleclub | Schule/Ausbildung | 2,4★ Play; Abo-Tier-Verwirrung; Gamification | C1/C2 | D |
| 8 | Studyflix | Lernvideos | Kostenlos, aber oberflächlich, wenig Interaktion | C5 | K |
| 9 | Knowunity | Schüler-Community | Content-Qualität, Moderation, Abo | C5/C1 | K |
| 10 | Seneca Learning | K-12 | Exam-Drill, begrenzte Tiefe | C2/C5 | K |
| 11 | NotebookLM | AI Research | Keine Flashcards/SRS; Recherche, kein Lernsystem | C15 | D |
| 12 | StudyFetch | AI Study | Datenverlust, Bugs, Abo | C13/C1 | D |
| 13 | Turbo AI | AI Notetaker | Halluziniert Inhalte; Free-Limit | C3/C1 | D |
| 14 | Mindgrasp | AI Study | Output-Qualität, Abo | C3/C1 | K |
| 15 | Otter.ai | AI Notetaker | Consent-/BIPA-Klagen, Aufnahme | C8 | D |
| 16 | Fireflies.ai | AI Notetaker | Consent-/BIPA-Klagen, Aufnahme | C8 | D |
| 17 | Glean | Notetaker | Preis, Consent, Accessibility | C8/C10 | K |
| 18 | tl;dv | Notetaker | Consent, Vendor-Lock-in | C8/C18 | K |
| 19 | Fathom | Notetaker | Consent, Aufnahme | C8 | K |
| 20 | Notta | Notetaker | Consent, Genauigkeit | C8/C3 | K |
| 21 | Chegg | Homework | Traffic −59 %, FTC-Abo-Settlement, AI-Disruption | C14/C1 | D |
| 22 | Course Hero | Study Docs | Paywall, Copyright, Exam-Leaks | C1/C10 | D |
| 23 | Studocu | Study Docs | Paywall, Copyright, Qualität | C1/C10 | K |
| 24 | Photomath | Math | Answer-first; Schritte paywalled | C4/C1 | D |
| 25 | Mathway | Math | Answer-first; Abo | C4/C1 | D |
| 26 | Gauth | Homework | Answer-first; Fehler; Privacy; Abo | C4/C3/C8 | D |
| 27 | Brainly | Q&A | Community-Qualität; Ads; Abo | C5/C1 | D |
| 28 | Numerade | Homework | Paywall; Answer-first | C1/C4 | K |
| 29 | Duolingo | Sprache | Paywall/Energy; Gamification; Plateau | C1/C2 | D |
| 30 | Babbel | Sprache | Auto-Renewal; Kündigung; Zugang | C1 | D |
| 31 | Busuu | Sprache | Auto-Renewal; Bugs (richtige Antwort falsch) | C1/C13 | D |
| 32 | Rosetta Stone | Sprache | Abo; veraltete Methode | C1/C5 | K |
| 33 | Pimsleur | Sprache | Abo; Audio-only; UX | C1/C12 | K |
| 34 | Speak | Sprache | AI-Qualität; Abo | C3/C1 | K |
| 35 | ELSA Speak | Pronunciation | Feedback-Genauigkeit; Abo | C3/C1 | K |
| 36 | Preply | Tutoring | Tutor-Qualität; No-Shows; Refund | C5/C1 | D |
| 37 | Khan Academy | K-12 | Wenig individualisiert; Teacher Tools | C15 | K |
| 38 | Khanmigo | AI Tutor | Keine Lernvorteile; Fragen unerwünscht; US-only | C3/C16 | D |
| 39 | Prodigy | Math Game | Upsell; Magicoin-Druck; Billing | C1/C2 | D |
| 40 | IXL | Practice | Drill; wenig Erklärung; Abo | C2/C1 | K |
| 41 | ABCmouse | Early Learning | Billing/Refund; Abo | C1 | K |
| 42 | DreamBox | Adaptive Math | Dashboard; Alignment | C15/C5 | K |
| 43 | ClassDojo | Behavior | Behavior-Tracking; Privacy | C8/C2 | D |
| 44 | Seesaw | Portfolio | Teacher Workload; Mobile UX | C15/C12 | K |
| 45 | Kahoot | Quiz Game | Free 10; Jahresabo; Recall > Lernen | C1/C2 | D |
| 46 | Quizizz/Wayground | Quiz Game | Rebrand; Monetarisierung | C1/C2 | D |
| 47 | Blooket | Quiz Game | Monetarisierung; Spiel > Lernen | C2/C1 | K |
| 48 | Gimkit | Quiz Game | Monetarisierung; Spiel > Lernen | C2/C1 | K |
| 49 | Mentimeter | Audience Response | Limits; Score-Fehler | C1/C12 | D |
| 50 | Slido | Audience Response | Wenige Fragetypen; Free-Limits | C1/C12 | D |
| 51 | Nearpod | Interactive Lessons | Preis; Content-Bindung; UX | C1/C12 | K |
| 52 | Wooclap | Audience Response | Free-Limits; Feature-Tiefe | C1 | K |
| 53 | Canvas | LMS | Mobile; fehlende Basics; A11y | C12/C15 | D |
| 54 | Moodle | LMS | Mobile langsam; überladen; UX | C12/C15 | D |
| 55 | Blackboard | LMS | UX; Kosten; Fragmentierung | C12/C15 | K |
| 56 | Brightspace | LMS | UX; Analytics; Mobile | C12/C15 | K |
| 57 | Google Classroom | LMS | Begrenzte Assessment-Tiefe | C15 | K |
| 58 | Schoology | LMS | UX; Assessment; Kosten | C12/C15 | K |
| 59 | PowerSchool | SIS | UX; Daten; Support | C12/C15 | K |
| 60 | Top Hat | Courseware | Kosten pro Term; Content-Bindung | C10/C1 | K |
| 61 | Pearson MyLab | Courseware | Access Codes $100+; UX | C10/C1 | D |
| 62 | Cengage MindTap | Courseware | Access Codes; Kosten; UX | C10/C1 | K |
| 63 | Turnitin | Integrity | False Positives; EULA; Vertragsausstiege | C7/C18 | D |
| 64 | GPTZero | Detection | Vendor vs. unabhängige FPR; ESL-Bias | C7 | D |
| 65 | Originality.ai | Detection | FPR; Kosten; Vendor Claims | C7 | D |
| 66 | Copyleaks | Detection | FPR; Bias | C7 | D |
| 67 | Grammarly Authorship | Process Evidence | Opt-in; Limits; Equity; Expert-Skandal | C17/C7 | D |
| 68 | Proctorio | Proctoring | Privacy; Bias; Technik | C8/C9 | D |
| 69 | Honorlock | Proctoring | Room Scan; Privacy; Consent | C8/C9 | D |
| 70 | Respondus | Proctoring | Gerätelimits; Installation; A11y | C9/C12 | D |
| 71 | ProctorU/Meazure | Proctoring | Privacy; Stress; Kosten | C8/C9 | K |
| 72 | Examity | Proctoring | Privacy; Stress; Kosten | C8/C9 | K |
| 73 | Gradescope | Grading | Effizienz; Rubrik-/Mensch-Abhängigkeit | C6/C15 | K |
| 74 | Perusall | Social Reading | Algorithmische Noten; Engagement-Metriken | C6/C11 | D |
| 75 | Packback | Discussion | AI-Score gamebar; Posts ungelesen | C6/C11 | D |
| 76 | GoReact | Video Assessment | Bewertungsopazität; Zeit; A11y | C6/C15 | K |
| 77 | FeedbackFruits | Peer Review | Feedback-Qualität; Workflow | C11/C15 | D |
| 78 | Peerceptiv | Peer Review | Bias; Reliabilität; Workload | C11 | K |
| 79 | NYU Viva | Oral Exam | 83 % Stress; 33 % klare Fragen; 13 % Präferenz | C16/C6 | D |
| 80 | ExamSim (Bayreuth) | Oral Practice | DE-Wettbewerber; Avatar statt eigener Text | C16 | D |
| 81 | OralExam.ai | Oral Exam | Stress; Fairness; A11y | C16/C6 | K |
| 82 | Prova | Oral Exam | Stress; Fairness; Skalierung | C16/C6 | K |
| 83 | VivaProof | Oral Exam | Stress; Beweiswert | C16/C6 | K |
| 84 | Yoodli | Speech Coaching | Feedback-Genauigkeit; Bias | C3/C16 | K |
| 85 | Mursion | Simulation | Kosten; Skripte; Transfer | C10/C5 | K |
| 86 | TeachFX | Teacher Coaching | Beobachtung; Bias; Workload | C15/C8 | K |
| 87 | Coursera | Courses | ~1,4★ (berichtet); Auto-Renewal; Zertifikate | C14/C1 | D |
| 88 | edX | Courses | Zertifikate paywalled; Qualität | C14/C1 | K |
| 89 | Udemy | Courses | Qualität; Refund; KI-Content | C5/C14 | K |
| 90 | Skillshare | Courses | Abo; Completion; Qualität | C1/C14 | K |
| 91 | FutureLearn | Courses | Paywall für Assessments; Support | C1/C14 | D |
| 92 | LinkedIn Learning | Courses | Oberflächlich; Abo; Katalog | C5/C14 | K |
| 93 | Pluralsight | Tech Courses | Abo; veraltete Kurse | C1/C5 | K |
| 94 | DataCamp | Data Courses | Billing/Refund; Abo | C1/C14 | K |
| 95 | Codecademy | Coding | Abo; wenig Tiefe | C1/C5 | K |
| 96 | Brilliant | STEM | Gamification; Abo; Tiefe | C1/C2 | K |
| 97 | Speechify | Accessibility | Abo; Stimmenqualität; Privacy | C1/C8 | K |
| 98 | Read&Write | Accessibility | Preis; Komplexität; Integration | C10/C12 | K |
| 99 | Kurzweil 3000 | Accessibility | Preis; UX; Lock-in | C10/C12 | K |
| 100 | Bookshare | Accessible Books | Katalog; Eligibility; UX | C5/C12 | K |

---

## 3. Die zehn wichtigsten Beschwerde-Cluster — mit Evidenz

### C1 — Paywall und Abo-Friction

**Muster:** Die Kernfunktion ist kostenlos, aber der eigentliche Lernschritt
(korrekte Antwort, Erklärung, Zertifikat, Wiederholung) liegt hinter dem Abo.
Dazu Ads, Auto-Renewal, Kündigungshürden.

**Evidenz:**
- Duolingo: Eine Auswertung von 13.850 Reviews findet **1.588 kritische
  Pricing-/Paywall-Erwähnungen**; die Sternebewertung bleibt trotzdem bei 4,7.
  Die Energy-Mechanik ersetzt Hearts und begrenzt Free-Nutzer weiter. Eine
  andere Analyse von 502.269 Reviews zeigt: negative Paywall-Sprache auf
  Android steigt von 2,89 % auf 4,96 %, Trust-Erosion von 2,91 % auf 7,44 %. `[D]`
- Quizlet: Trustpilot-Rezensionen: „everything is behind a paywall now“;
  „It only lets me answer 14 questions“; „cashgrab“; Ads unterbrechen das
  Lernen. `[D]`
- Kahoot: Free-Plan hostet **10 Teilnehmer**; Education-Pläne sind **nur
  jährlich**; Lehrerpläne ab ~19 $/Monat. Capterra: „The free version feels
  quite limited and not very useful.“ `[D]/[V]`
- Coursera: Eine Auswertung nennt Trustpilot ~**1,4/5**; wiederkehrende Beschwerden über
  Auto-Renewal und Zertifikate, die nach dem Trial plötzlich kosten. `[D]`
- simpleclub: **2,4★** bei 9.740 Google-Play-Reviews vs. 4,5★ bei 418
  Trustpilot-Reviews; Beschwerden über Abo-Tiers („Azubi“ vs. „Unlimited“). `[D]`

**Design-Konsequenz für Viva:** Kein Abo, kein Login, keine Ads, keine
„Premium-Frage“. Der Demo-Pfad muss ohne Zahlungsdaten und ohne Account
funktionieren. Das ist ein **Trust-Signal**, kein Monetarisierungsverzicht.

---

### C2 — Gamification ersetzt Lernen

**Muster:** Streaks, Punkte, Leaderboards, Coins und Upgrades erzeugen
Nutzung, aber nicht Verständnis. Wer das Spiel gewinnt, muss nicht lernen.

**Evidenz:**
- Duolingo: „Gamification-Plateau“ und „keine Konversationsflüssigkeit“ sind
  wiederkehrende Kritik; die App optimiert den täglichen Habit, nicht den
  Transfer. `[D]`
- Kahoot: Review-Muster „Recall over teaching“ — das Quiz testet, was die
  Gruppe schon weiß, statt neues Material zu lehren; kurze Timer und
  Multiple-Choice begrenzen Tiefe. `[D]`
- Prodigy: Fortschritt verlangsamt sich, wenn Magicoin ausgeht; Upsell-Prompts
  unterbrechen das Spiel; Kinder werden zu Eltern-Kaufwünschen gelenkt. `[D]`
- Quizizz/Blooket/Gimkit: Engagement ist hoch, Lernzuwachs wird aber nicht
  gemessen; Monetarisierung und Rebrand verwässern den Nutzen. `[D]/[K]`

**Design-Konsequenz für Viva:** **Keine Punkte, keine Streaks, keine
Leaderboards.** Fortschritt ist Evidenz („sicher erklärt / vage / nicht
erklärt“), nicht eine Serie. Ein Leaderboard würde das Produkt in dieselbe
Kategorie wie Kahoot stellen — und den #1/#6-Fit verwässern.

---

### C3 — KI-Ungenauigkeit, Halluzination, Sycophancy

**Muster:** Die KI klingt sicher, liegt aber falsch; sie lobt, statt zu
konfrontieren; sie erfindet Quellen, Schritte oder Inhalte.

**Evidenz:**
- Khanmigo: Khan Academy selbst nennt „inaccuracies or misleading
  implications“ und „hallucinations“ als bekannte Grenzen. `[V]/[D]`
- Khanmigo-Studie (University of Toronto, 18 Tennessee Middle Schools, 2024–
  2026): fast alle Schüler versuchten, die Antwort zu bekommen; als Khanmigo
  stattdessen Fragen stellte, **stiegen viele aus**. Es gab **keine
  zusätzlichen Lernvorteile** gegenüber dem regulären Khan-Academy-Programm. `[P]/[POL]`
- Turbo AI: Google-Play-Review: „Instead, Turbo AI adds unnecessary people and
  details that were never included“ — die KI mischt Inhalte, die nicht in der
  Quelle stehen. `[D]`
- AI-Tutor-Sycophancy: „AI Tutors Are Praising Instead of Teaching“ — die KI
  bestätigt, statt zu korrigieren; das ist pädagogisch schädlicher als eine
  sichtbare falsche Antwort. `[POL]`
- Cambridge-Studie 2026: KI-Bewertung „rewards style over substance“, zeigt
  Central-Tendency-Bias; sehr gute und sehr schwache Essays werden schlechter
  erkannt. `[P]`
- LLM-Grading-Bias: Nicht-muttersprachliche Formulierungen werden um 1,35 bzw.
  0,90 Punkte abgewertet — „B+ zu C+“ bei gleichem Inhalt. `[PP]`

**Design-Konsequenz für Viva:** Jede KI-Aussage braucht ein **exakt
verifiziertes Zitat** aus dem Essay oder der Antwort. Wenn kein Zitat
verifiziert werden kann: **„nicht genug Evidenz“**. Keine Note. Keine
Behauptung ohne Quelle. Der Quote-Verifier ist kein Nice-to-have, er ist das
Produkt.

---

### C4 — Answer-first und Kopieren

**Muster:** Die App liefert die Lösung vor der Erklärung. Lernende kopieren,
verstehen nicht, und fallen in der Prüfung durch.

**Evidenz:**
- Photomath/Mathway/Gauth: Answer-first-Design; der kostenlose Tier zeigt oft
  nur das Ergebnis, die Schritte sind paywalled. `[D]`
- Gauth: „Answer-first design makes copying easy“; gelegentlich „silent
  errors“ bei fortgeschrittener Mathematik. `[D]`
- Brainly: Community-Antworten variieren stark; Ads und Abo. `[D]`
- Chegg: Traffic **−59,4 %** von September 2025 auf September 2026; Aktie bei
  ~0,70 $; FTC-Settlement über **7,5 Mio. $** wegen schwer kündbarer Abos. `[D]/[POL]`

**Design-Konsequenz für Viva:** Viva gibt **keine Antwort**. Es fragt nach.
Das ist die einzige Produktkategorie, in der „die KI weiß es auch nicht“
kein Bug, sondern ein Feature ist.

---

### C5 — Content-Qualität und Varianz

**Muster:** Inhalt ist oberflächlich, veraltet, nicht aligniert oder von
KI generiert. Die Plattform skaliert Menge, nicht Tiefe.

**Evidenz:**
- Coursera/Udemy/FutureLearn: Qualität variiert stark; Zertifikate und
  Assessments sind oft paywalled; Completion niedrig. `[D]/[K]`
- Studyflix: kostenlos und beliebt, aber stark auf Videos/Prüfungsdrill
  begrenzt; wenig interaktive Tiefe. `[D]`
- Khanmigo: Inhalt ist nicht auf Khan-Academy-Material begrenzt; das führt zu
  Abweichungen und „misleading implications“. `[V]`
- simpleclub: Inhalte werden als hilfreich gelobt, aber die App wird mit
  Updates „schlechter“ und die Abo-Struktur unübersichtlich. `[D]`

**Design-Konsequenz für Viva:** **Ein Seed-Essay, eine Rubrik, ein Fach.**
Nicht drei Fächer gleichzeitig. Die Tiefe der Zitatbindung ist der Beweis,
dass wir nicht „Content skalieren“, sondern „Verstehen prüfen“.

---

### C6 — Bewertungsopazität und Bias

**Muster:** Ein Algorithmus vergibt Punkte, die niemand erklären kann.
Studierende optimieren die Metrik, nicht das Lernen.

**Evidenz:**
- Packback: Studierende berichten, der „Creativity Score“ hänge an Länge,
  Satzstruktur, Quellen und „großen Wörtern“; ein Student in einem 4000er-Kurs:
  „No one is even going to read my posts“; die Note hängt an der AI-Schwelle. `[D]`
- Perusall: Algorithmische Noten können „positive behaviors“ bestrafen;
  sieben Metriken (Annotation Content, Opening, Reading to End, Active
  Engagement, Getting Responses, Upvoting, Quizzes) werden zu einer Note
  verrechnet. `[D]`
- Cambridge: KI-Bewertung belohnt Stil statt Substanz; Central-Tendency-Bias. `[P]`
- LLM-Style-Bias: 1,35/0,90 Punkte Abwertung für nicht-muttersprachliche
  Formulierungen. `[PP]`

**Design-Konsequenz für Viva:** **Keine automatische Note.** Die Rubrik ist
ein Analyse-Linse, kein Score. Die Evidenzkarte zeigt drei Zustände plus
„nicht genug Evidenz“. Die Lehrkraft kann jede Einschätzung überschreiben;
jede Überschreibung wird geloggt.

---

### C7 — Detection-False-Positives und Due Process

**Muster:** AI-Detection liefert Wahrscheinlichkeiten, die als Beweis
behandelt werden. Unschuldige werden belastet; die Beweislast kehrt sich um.

**Evidenz:**
- Turnitin: Das Unternehmen selbst schreibt, False Positives seien „a
  possibility“; die Dokument-FPR von <1 % gilt nur für Dokumente mit >20 %
  KI-Anteil; die **Sentence-Level-FPR liegt bei ~4 %** (Turnitin, 2023); 54 % der falsch
  markierten Sätze liegen direkt neben echtem KI-Text. `[V]/[D]`
- Turnitin-Vertragsausstiege: Southampton (UK) zahlt **£87.621** für
  2024/25 und beendet den Vertrag; Newcastle und Westminster folgen;
  Begründung u. a. EULA-Pläne, studentische Arbeiten für KI-Training zu
  nutzen. `[POL]`
- Nach Berichten: Yale lässt Detection-Scores nicht mehr als formale Beweise in
  Integritätsverfahren zitiert werden; Johns Hopkins behandelt Flags als
  beratend. `[POL]`
- GPTZero: Vendor nennt **0,09 % FPR**; ein 300-Text-Test findet **8,4 %**
  auf native-englischen Texten und **23,7 %** auf ESL-Texten; eine Trustpilot-
  Rezension: „Every single text was flagged as 100 % AI-generated!“ `[D]/[V]`

**Design-Konsequenz für Viva:** Viva **erkennt keine KI** und **verspricht
keine Täuschungssicherheit**. Es verschiebt den Nachweis auf
Erklärungskompetenz. Diese Positionierung ist jetzt nicht nur ethisch,
sondern marktklug: Der Detection-Markt ist unter Druck.

---

### C8/C9 — Surveillance, Consent und Proctoring-Zugang

**Muster:** Prüfungssoftware nimmt Kamera, Mikrofon, Bildschirm und Raum auf;
sie verlangt Installation, Admin-Rechte und funktioniert nicht auf allen
Geräten. Studierende erleben das als Misstrauen und Barrieren.

**Evidenz:**
- Honorlock: Room-Scan und Aufzeichnung; Universitäten veröffentlichen
  Consent-/Privacy-Hinweise; Studierende müssen der Videoüberwachung
  zustimmen. `[D]/[POL]`
- Proctorio: Capterra 4,5/5 bei nur 12 Reviews; Privacy- und Bias-Kritik;
  das Unternehmen betont, Institutionen entschieden über die Features. `[D]/[V]`
- Respondus: LockDown Browser unterstützt **keine Smartphones, iPads oder
  Android-Tablets**; Installation braucht Admin-Rechte; technische Probleme
  und Accessibility hängen von Konfiguration und Institution ab. `[D]`
- AI-Notetaker: Otter.ai und Fireflies.ai sind mit BIPA-/Wiretap-Klagen
  konfrontiert; Consent ist oft nicht eingeholt; „bot-free“ verschiebt die
  Pflicht nur auf die Nutzer. `[D]/[POL]`
- ClassDojo: Behavior-Tracking-Geschichte und Elternkritik; aktuelle Policy
  verbietet behavior-targeted Ads, aber die Kategorie bleibt sensibel. `[D]`

**Design-Konsequenz für Viva:** Keine Kamera, kein Mikrofon-Zwang, kein
Audio-Storage, kein Login, keine Session-Telemetrie. Text ist Default; Speech
ist optional und wird **nicht gespeichert**. Synthetic Seeds. Ein sichtbarer
„Reset/Delete“-Button.

---

### C10 — Kosten und Access Codes

**Muster:** Studierende zahlen nicht für Lernen, sondern für Zugang:
Access Codes, E-Books, Zertifikate, Courseware.

**Evidenz:**
- Pearson MyLab: Access Codes kosten **~100 $ pro Kurs**; ein Reddit-Nutzer:
  „It is 100 dollars just to do homework“; MyLab Nursing Multi-Term Access
  wird mit **1.200 $** gelistet; ein 18-Wochen-MyLab-Math-Code kostet
  **139,64 $**. `[D]/[V]`
- Top Hat: Student Access wird pro Term/Year verkauft; Institutionen zahlen
  teils zentral, Studierende in Content-Kursen oft zusätzlich. `[D]`
- Coursera/FutureLearn: Zertifikate und benotete Assessments sind paywalled;
  Studierende erfahren es oft erst nach dem Kurs. `[D]`
- Course Hero/Studocu: Paywall plus Copyright-Probleme; Exam-Leaks. `[D]`

**Design-Konsequenz für Viva:** Kein Publisher-Content, keine Access Codes,
keine Zertifikatsgebühr. Ein offener Seed-Text und ein QR-Code. Fertig.

---

### C11 — Peer-Feedback: Gaming und Qualität

**Muster:** Peer-Review ist billig, aber unzuverlässig; algorithmische
Scores werden gespielt; Studierende schreiben für die Metrik, nicht für
Einander.

**Evidenz:**
- Packback: Score nach Länge, Vokabular, Quellen; Studierende berichten, dass
  niemand die Posts liest. `[D]`
- Perusall: „may inadvertently penalize students for positive behaviors“;
  Upvoting und Engagement-Zeit werden zu Noten. `[D]`
- FeedbackFruits: Peer-Feedback-Qualität ist ein bekanntes Problem; die
  Plattform wirbt mit „Automated Feedback Coach“, um es zu adressieren. `[D]/[V]`
- Peerceptiv/FeedbackFruits: Reliabilität und Bias bleiben arbeitsintensiv;
  Review-Qualität hängt an Rubrik und Training. `[K]`

**Design-Konsequenz für Viva:** Viva baut **kein** Peer-Rating und **kein**
Social Scoring. Die Lehrkraft sieht Evidenz, nicht Beliebtheit. Das ist
weniger „social“, aber glaubwürdiger für #1.

---

### C12/C13 — UX, Mobile, Accessibility, Datenverlust

**Muster:** Die App funktioniert auf dem Laptop, aber nicht auf dem Handy;
Screenreader und Keyboard scheitern; Fortschritt oder Dateien gehen verloren.

**Evidenz:**
- Canvas: Review nennt fehlende Basisfunktionen (z. B. Terminauswahl für
  mündliche Assessments) und Accessibility-Probleme bei ADA-Unterstützung. `[D]`
- Moodle: Mobile App langsam, eingeschränkte Desktop-Features, clutter. `[D]`
- Respondus: keine Smartphones/Tablets; Installation mit Admin-Rechten. `[D]`
- StudyFetch: „my files disappeared during the exam period“; Bugs und
  Datenverlust. `[D]`
- Busuu: „marks my words as wrong even when I type them correctly“;
  Voice-Erkennung fällt aus. `[D]`
- Accessibility: NPR (April 2026) berichtet über blinde Studierende, deren
  Kursmaterialien nicht mit Screenreadern funktionieren; ADA Title II
  verlangt WCAG 2.1 AA, Deadlines wurden 2026 auf 2027/2028 verschoben. `[POL]`

**Design-Konsequenz für Viva:** Mobile-first bei 375 px, Keyboard-Navigation,
ARIA-Labels, 200-%-Zoom, Kontrast, keine Timer. Der Demo-Pfad muss auf dem
Handy genauso funktionieren wie auf dem Laptop. **Reset** und **Export**
sichtbar.

---

### C14 — Credential-Skepsis

**Muster:** Zertifikate sind billig, aber sagen wenig; sie sind paywalled
oder von KI erstellt. Der Arbeitsmarkt vertraut ihnen nur begrenzt.

**Evidenz:**
- Coursera: Eine Auswertung nennt Trustpilot ~1,4/5; Zertifikate nach dem Trial paywalled;
  Kursqualität variiert. `[D]`
- Chegg: Das Geschäftsmodell „Homework-Hilfe“ kollabiert mit generativer KI
  (−59 % Traffic). `[D]`
- Micro-Credentials: Fragmentierung und Arbeitgebervertrauen bleiben ungelöst;
  die Forschung ist dünn. `[P]` (siehe `docs/02-deep-research.md`)
- Grammarly Authorship: Prozessnachweis ist opt-in und nicht portabel;
  Jisc warnt, dass Studierende gezwungen sein könnten, für Integritätsnachweise
  zu zahlen. `[D]/[POL]`

**Design-Konsequenz für Viva:** **Kein Zertifikat, keine Note, kein
„verifiziertes Können“.“** Die Evidenzkarte ist formativ und transportierbar,
aber sie behauptet keine Prüfungsgültigkeit. Genau das unterscheidet sie von
einem Micro-Credential.

---

### C15 — Dashboards, die niemand öffnet

**Muster:** Learning Analytics produziert Zahlen, aber keine Entscheidung.
Lehrkräfte haben kein Zeitbudget für ein weiteres Dashboard.

**Evidenz:**
- Learning-Analytics-Dashboards: „another dashboard nobody opens“; die
  Forschung zeigt, dass Nutzung und Interpretation stark variieren. `[D]/[P]`
- Canvas/Moodle: Usability-Probleme, mobile Einschränkungen, überladene
  Oberflächen. `[D]`
- Khanmigo Teacher Tools: hilfreich, aber an District-/School-Zugang gebunden;
  kein automatischer Studierendenzugang. `[V]`
- Surveillance-Risiko: Dashboards können Studierende als „Risiko“ markieren,
  ohne Kontext. `[P]`

**Design-Konsequenz für Viva:** Teacher View zeigt **drei Lücken, drei
Entscheidungen**, keine Rankings. Jede Karte hat eine Aktion: „Frage
editieren“, „menschliches Viva planen“, „Evidenz ansehen“. Kein
„Student-at-risk“-Score.

---

### C16 — Oral Exams: Stress, unklare Fragen, Fairness

**Muster:** Mündliche Prüfungen sind valide, aber stressig; KI-Vivas erben
den Stress und fügen Technik hinzu. Wer nicht schnell verbal produziert, wird
benachteiligt.

**Evidenz:**
- NYU Stern Voice-AI-Viva (73 Studierende, zwei Kohorten): **70 %** fanden,
  die Prüfung teste ihr tatsächliches Verständnis; nur **33 %** fanden die
  Fragen klar; **83 %** (Fall 2025) bzw. **63 %** (Spring 2026) fanden sie
  stressiger als schriftliche Prüfungen; nur **13 %** bzw. **25 %** bevorzugten
  das KI-Format; **57 %** bevorzugten schriftliche Prüfungen. Häufigste
  Beschwerde: **Question Stacking**. `[P]/[POL]`
- Die Autoren betonen: **Reliabilität ≠ Validität**; drei Modelle können sich
  auf eine falsche Note einigen; Studierende mit Sprachbehinderung oder
  begrenzter verbaler Flüssigkeit haben einen Nachteil. `[P]`
- ExamSim (Uni Bayreuth): KI-Avatar, 276 Teilnehmende, sofortiges Feedback;
  direkter deutscher Wettbewerber für „mündlich üben“. `[D]/[V]`
- THE/Conversation: Oral Exams nehmen zu, aber soziale Angst und
  Benachteiligung sind ungelöst. `[POL]`

**Design-Konsequenz für Viva:** Viva ist **Übungsraum, keine Prüfung**.
Text-first, eine Frage pro Screen, „Weiß nicht“ als valide Antwort, Hint,
Skip, Retry, kein Timer, keine Note. Kein Question Stacking. Die KI stellt
**eine** Nachfrage, nicht fünf.

---

### C17 — Prozess-Evidenz ist opt-in, fragmentiert und gamebar

**Muster:** Tools zeigen, wie geschrieben wurde — aber nur, wenn alle
mitmachen, nur in bestimmten Editoren, und die Daten sind nicht portabel.

**Evidenz:**
- Grammarly Authorship: funktioniert in Google Docs, Word und Grammarly
  Editor; **20-Seiten-Limit** in Word; braucht Clipboard-Zugriff; Schulen
  können den Report nur sehen, wenn er geteilt wird. `[V]`
- Grammarly „Expert Review“: KI-generierte Ratschläge wurden als Aussagen
  realer Expert:innen präsentiert; nach Backlash und Klage suspendiert. `[POL]`
- Jisc: Studierende könnten gezwungen sein, für Tools zu zahlen, um die
  Integrität ihrer Arbeit zu beweisen — ein Equity-Problem. `[POL]`
- Prozess-Evidenz ist gamebar (Paste-Telemetrie, Verzögerung, Umschreiben)
  und erfasst nicht, ob jemand den Inhalt versteht. `[P]/[D]`

**Design-Konsequenz für Viva:** **Keine Prozessüberwachung.** Die Evidenz
entsteht im Dialog: Frage → Antwort → Nachfrage → Zitat. Das ist
zweckgebunden, sichtbar und nicht heimlich.

---

### C18 — Vendor-Lock-in und EULA

**Muster:** Institutionen zahlen für Zugang, Daten und Integration; ein
Wechsel ist teuer. EULA-Änderungen können rückwirkend Datenrechte verschieben.

**Evidenz:**
- Turnitin: EULA-Vorschlag zur Nutzung studentischer Arbeiten für KI-Training
  führte zu Vertragsausstiegen und Protesten; das Unternehmen pausierte die
  Änderung bis mindestens September 2027. `[POL]`
- Pearson/Top Hat/Cengage: Access Codes und Courseware binden Kurse an
  Verlage; Kosten und UX sind wiederkehrende Beschwerden. `[D]`
- Coursera/Udemy: Plattform-Ökonomie und Kursqualität; Zertifikate an
  Plattform gebunden. `[K]`

**Design-Konsequenz für Viva:** Offener Demo-Link, Export der Evidenzkarte,
keine Datenbindung. Kein Login heißt auch: kein Lock-in.

---

## 4. Was die Review-Daten über die acht Ideen sagen

| Idee | Review-Fit | Größte Warnung | Konsequenz |
|---|---|---|---|
| **Viva** | Sehr stark | Khanmigo: Schüler wollen Fragen nicht; NYU: 83 % Stress | Freiwillig, text-first, eine Frage, keine Note |
| Socratic Lock | Stark | Gleiche Frage-Aversion; sonst „noch ein Tutor“ | Nur mit sichtbarer Evidenzkette und Human Review |
| AI Literacy Lab | Stark | Detection-Irrtümer sind beweisbar; niedriges Risiko | Guter Pivot, wenn LLM ausfällt |
| Klassenzimmer-Simulator | Mittel | Mursion/Simulationen teuer, Scripted, Transfer schwach | Nur mit Debrief und Evidenz |
| Failure First Lab | Mittel | Fehler-Rate kann demotivieren; kein direkter #1-Fit | Als Modul, nicht als Kern |
| Azubi Talk | Mittel | VET-Apps (simpleclub Azubi) kämpfen mit Abo-Tiers | Nur mit klarer Rolle (Prüfer:in/ Ausbilder:in) |
| SkillPass | Schwach–mittel | Credential-Skepsis, Fragmentierung | Nicht in 24h |
| Recall Coach | Schwach | Anki/Quizlet-Markt ist voll; UI-Kampf | Nicht bauen |

**Fazit:** Viva bleibt die beste Wahl. Die Reviews stärken den #1/#6-Fit,
aber sie verschieben die **Produktsprache**: nicht „KI-Prüfer“, sondern
„Übungsraum für die eine Frage, die ein Text nicht beantwortet“.

---

## 5. Können wir die 100 Apps „verbessern“? — Die realistischen Wedges

Die Frage „können wir sie verbessern“ ist für einen 24h-Hackathon nur dann
sinnvoll, wenn die Verbesserung **einen sichtbaren Moment** erzeugt. Hier sind
zehn Wedges, die aus den Reviews direkt folgen — und ob sie in unseren Scope
passen:

| Wedge | Betroffene Apps | Was besser wird | 24h-Fit |
|---|---|---|---|
| **Paywall-freier Evidence Layer** | Quizlet, Anki, StudyFetch | Lernen ohne Abo; Evidenz statt Content | **Ja — Viva** |
| **Oral-Defense-Layer für Zertifikate** | Coursera, Udemy, edX | Zertifikat + kurze Verteidigung | Nein (Credential-Komplexität) |
| **Quote-bound Feedback** | Turnitin, Gradescope, Packback | Jede Kritik mit Zitat; keine Note | **Ja — Viva** |
| **Consent-first Notetaker** | Otter, Fireflies, Glean | Aufnahme nur mit Einwilligung; Löschung | Nein (Audio-Risiko) |
| **Accessible Lockdown-Alternative** | Respondus, Proctorio | Keine Installation, Screenreader, Mobile | **Teilweise — Viva** |
| **Teacher Triage statt Dashboard** | Canvas, Moodle, Khanmigo | Drei Entscheidungen statt 20 Metriken | **Ja — Viva** |
| **No-grade Peer Feedback** | Packback, Perusall, FeedbackFruits | Feedback ohne algorithmische Note | Nein (Peer-Netzwerk) |
| **Student-owned Evidence Card** | Grammarly Authorship | Portabel, opt-in, kein Prozess-Tracking | **Ja — Viva** |
| **One-question Oral Practice** | NYU Viva, ExamSim | Weniger Stress, klarere Fragen | **Ja — Viva** |
| **Cost-free Courseware Companion** | Pearson, Top Hat | Keine Access Codes | Nein (Verlagsinhalte) |

**Entscheidung:** Nur die fett markierten Wedges passen in den 24h-Scope.
Viva ist bereits die Kombination aus fünf davon. Wir sollten **nicht** fünf
Produkte bauen, sondern Viva so schärfen, dass jedes dieser Wedges in der Demo
sichtbar ist.

---

## 6. Die 12 Hackathon-Improvements (nach Impact/Aufwand)

Bewertung: Impact 1–5 (Demo, Pitch, Technik), Aufwand in Stunden (Schätzung
für 1–2 Personen), Risiko niedrig/mittel/hoch.

| # | Improvement | Neutralisiert | Impact | Aufwand | Risiko | Demo-Moment |
|---:|---|---|---:|---:|---|---|
| 1 | **Zero-Friction Contract:** kein Login, kein Abo, kein Install, QR, Reset | C1, C12 | 5 | 0,5 h | niedrig | „Scannen, loslegen, in 90 s fertig“ |
| 2 | **Sichtbare Claim→Zitat→Frage-Kette:** Zitat im Essay markiert, Frage darunter | C3, C17 | 5 | 2 h | niedrig | Juror sieht, worauf die Frage beruht |
| 3 | **Eine Frage pro Screen, kein Question Stacking:** Fortschritt „1 von 4“ | C16 | 5 | 1 h | niedrig | Kein Stress-Loop, klare Führung |
| 4 | **„Weiß nicht“ + Hint + Skip:** valide Antwort, Hilfe, Abbruch | C16 | 4 | 1 h | niedrig | „Ich weiß nicht“ wird nicht bestraft |
| 5 | **Keine Note, kein Score, kein Rank:** 3 Zustände + „nicht genug Evidenz“ | C6, C14 | 5 | 1 h | niedrig | Evidenzkarte statt 7/10 |
| 6 | **Teacher Triage:** 3 Lücken, 3 Entscheidungen, Override + Audit | C15 | 4 | 2 h | mittel | „3 von 5 brauchen ein menschliches Viva“ |
| 7 | **Text-first, Speech optional, kein Audio-Storage** | C8, C9, C16 | 5 | 1 h | niedrig | Handy-Test ohne Mikrofon |
| 8 | **Quote-Verifier + Source Span:** exakter Substring, sonst „nicht genug Evidenz“ | C3 | 5 | 1 h | niedrig | Erfundene Kritik wird sichtbar blockiert |
| 9 | **Accessibility-Pass:** Keyboard, ARIA, 200-%-Zoom, Kontrast, kein Timer, 375 px | C12, C9 | 4 | 2 h | niedrig | Screenreader + Handy im Walkthrough |
| 10 | **Deterministischer Demo-Pfad:** Seed, Cache, Fallback, Reset, Export | C13 | 5 | 2 h | niedrig | API aus? Demo läuft trotzdem |
| 11 | **Privacy-by-Design:** synthetische Daten, session-only, Delete-Button, keine Analytics | C8 | 4 | 1 h | niedrig | „Keine echten Daten, kein Audio“ |
| 12 | **Transparenz „Warum diese Frage?“:** Rubrik-Dimension + Claim-ID | C6, C16 | 3 | 1 h | niedrig | Juror versteht die Logik in 5 s |

**Summe:** ~15,5 h. Das passt in den 24h-Plan, wenn die Kernpipeline steht.
Die Reihenfolge ist bewusst: 1–5 und 7–8 sind Demo-kritisch; 6, 9–12 sind
Härtung und Differenzierung.

### 6.1 Die fünf wichtigsten Änderungen im Detail

#### Improvement 1 — Zero-Friction Contract

**Problem aus den Reviews:** Duolingo, Quizlet, Kahoot, Coursera und simpleclub
alle monetarisieren den nächsten Lernschritt. Viva darf das nicht tun — nicht
aus Altruismus, sondern weil der Juror in 90 Sekunden keinen Account anlegen
wird.

**Umsetzung:**
- Landing Page mit einem Satz, einem Button „Seed-Essay öffnen“, einem
  QR-Code.
- Kein Login, keine E-Mail, keine Cookies außer Session.
- Reset-Button sichtbar in jeder Ansicht.
- Demo-Daten sind synthetisch und als solche gelabelt.

**Demo-Satz:** „Kein Account, kein Abo, keine Installation — nur du und dein
Text.“

---

#### Improvement 2 — Sichtbare Claim→Zitat→Frage-Kette

**Problem aus den Reviews:** KI-Feedback ist oft nicht nachprüfbar
(Halluzination, „AI slop“, Quote-Erfindung). Viva muss den Beweis **im UI**
zeigen, nicht im Log.

**Umsetzung:**
- Drei Spalten/Module: Claim („Schlaf verbessert Konsolidierung“), Zitat
  (exakter Satz, markiert), Frage („Welche Evidenz würde deine Aussage
  widerlegen?“).
- Jede Frage hat eine `claim_id` und eine `quote_span` (Start/Ende).
- Wenn der Quote-Verifier fehlschlägt: Karte wird rot, Frage wird nicht
  gestellt, stattdessen „nicht genug Evidenz“.

**Demo-Satz:** „Kein Zitat, keine Behauptung. Das ist keine Prompt-Regel,
das ist eine UI-Regel.“

---

#### Improvement 3 — Eine Frage, kein Stacking

**Problem aus den Reviews:** NYU Viva: nur 33 % fanden die Fragen klar;
häufigste Beschwerde war Question Stacking. Khanmigo: Schüler stiegen aus, als
die KI Fragen statt Antworten gab.

**Umsetzung:**
- Ein Screen = eine Frage. Keine Liste von fünf Fragen.
- Fortschritt „1 von 4“; jede Frage ist beantwortbar, skippbar, mit „Weiß
  nicht“.
- Follow-up erst nach der Antwort, nicht vorher.
- Kein Timer, keine Geschwindigkeitsmetrik.

**Demo-Satz:** „Die KI stellt eine Frage. Du antwortest. Dann entscheidet sie,
ob eine Nachfrage nötig ist — nicht umgekehrt.“

---

#### Improvement 4 — „Weiß nicht“ + Hint + Skip

**Problem aus den Reviews:** Oral Exams belohnen schnelle verbale Produktion;
Studierende mit Angst oder Sprachbarriere werden benachteiligt. Viva muss
Zugänglichkeit in die Interaktion einbauen, nicht nur in die Schriftgröße.

**Umsetzung:**
- Drei Buttons unter jeder Frage: „Antworten“, „Hint“, „Weiß nicht“.
- „Weiß nicht“ ist eine valide Antwort; die Evidenzkarte sagt „nicht
  erklärt“, nicht „durchgefallen“.
- Hint gibt einen Denkanstoß, keine Lösung.
- Skip erlaubt Weitergehen ohne Penalty.

**Demo-Satz:** „Nichtwissen ist eine Antwort, kein Fehler.“

---

#### Improvement 5 — Keine Note, kein Score, kein Rank

**Problem aus den Reviews:** Cambridge zeigt, dass KI-Bewertung Stil statt
Substanz belohnt; Packback/Perusall zeigen, dass algorithmische Scores
gespielt werden. Viva darf nicht in dieselbe Falle laufen.

**Umsetzung:**
- Evidenzkarte mit drei Zuständen: „sicher erklärt“, „vage“, „nicht erklärt“.
- Keine Zahl, keine Prozent, kein Rang.
- Jede Aussage mit Zitat aus der Antwort oder „nicht genug Evidenz“.
- Teacher View: „3 von 5 brauchen ein menschliches Viva“ — als Triage, nicht
  als Note.

**Demo-Satz:** „Kein Zitat, keine Behauptung — und keine Note.“

---

### 6.2 Die restlichen sieben Improvements (kurz)

6. **Teacher Triage:** Drei Karten, drei Aktionen, ein Audit-Log. Keine
   Tabellen, keine Heatmaps. Die Lehrkraft sieht nur, was sie entscheiden muss.
7. **Text-first:** Speech ist ein optionaler Button, nie der Default. Kein
   Audio wird gespeichert; das Transkript bleibt im Textfeld.
8. **Quote-Verifier:** Exakter Substring-Match; wenn nicht, „nicht genug
   Evidenz“. Kein Fuzzy-Match, der erfundene Zitate durchlässt.
9. **Accessibility:** Keyboard-Fokus sichtbar, ARIA-Labels, 200-%-Zoom,
   Kontrast ≥ 4,5:1, keine horizontale Scroll bei 375 px.
10. **Deterministic Demo:** Seed-Sessions, gecachte LLM-Antworten, Fallback-
    Provider, Reset. Wenn die API ausfällt, läuft die Demo aus dem Cache.
11. **Privacy-by-Design:** Keine echten Namen, keine E-Mails, keine
    Matrikelnummern; Session-Daten werden nach Reset gelöscht; kein Analytics-
    Pixel.
12. **„Warum diese Frage?“:** Ein Tooltip zeigt Rubrik-Dimension und Claim-ID.
    Das macht die KI erklärbar, ohne ein Dashboard zu bauen.

---

## 7. Was wir **nicht** bauen — mit Review-Begründung

| Anti-Pattern | Warum nicht | Review-Beleg |
|---|---|---|
| AI-Detector | False Positives, Bias, Beweislast; Markt unter Druck | Turnitin, GPTZero, Yale |
| Proctoring | Privacy, Consent, Gerätebarrieren, Vertrauensverlust | Honorlock, Respondus |
| Emotion AI | Keine valide Evidenz; ethisch unvertretbar | AI Act, Forschung |
| Automatische Note | Bias, Opazität, Cambridge/Packback | C6 |
| Leaderboard/Streak | Engagement-Theater, kein Transfer | Duolingo, Kahoot |
| Paywall | Zerstört 90-Sekunden-Demo und Trust | Quizlet, Duolingo |
| KI-Notetaker | Consent, BIPA, Audio-Storage | Otter, Fireflies |
| „Noch eine Flashcard-App“ | Markt voll, kein #1/#6-Fit | Quizlet, Anki |
| „KI schreibt deinen Essay“ | Answer-first, Academic Integrity | Chegg, Photomath |
| Generischer Chatbot | Kein Zustand, keine Evidenzpflicht | Khanmigo, ChatGPT |

---

## 8. Pivot-Fenster (nur falls Viva technisch scheitert)

Die Review-Daten stützen drei Pivots, die **dieselbe Evidenzschicht** nutzen:

1. **AI Literacy Lab / Hallucination Hunt** — niedrigstes Risiko, stärkster
   Review-Fit (Detector-FPs, Answer-first). Man zeigt zwei Antworten, eine
   falsch; Lernende müssen die Quelle prüfen. `[D]`
2. **Feedback Gym** — Lernende beurteilen KI-Feedback, bevor sie es anwenden.
   Review-Fit: Packback/Perusall/Cambridge. `[P]`
3. **Misconception Mirror** — die KI übernimmt den Irrtum der Lernenden.
   Review-Fit: Khanmigo-Fragenaversion; der Spiegel erzeugt Neugier statt
   Verhör. `[P]`

**Nicht pivotieren zu:** Detection, Proctoring, Credentials, Content-
Marketplace. Diese Kategorien haben die schlechtesten Review- und
Regulierungs-Signale.

---

## 9. Pitch-Ammonition (12 belegte Sätze)

1. „Turnitin sagt selbst: False Positives sind möglich; auf Satzebene liegt
   die Rate bei ~4 % (2023). Trotzdem werden Flags als Beweis behandelt.“ `[D]`
2. „Southampton zahlt £87.621 für Turnitin — und verlängert nicht. Newcastle
   und Westminster auch nicht.“ `[POL]`
3. „GPTZero wirbt mit 0,09 % False Positives; ein 300-Text-Test findet 8,4 %
   auf native und 23,7 % auf ESL-Texten.“ `[D]/[V]`
4. „Chegg hat 59 % Traffic verloren, weil KI die Antwort schneller gibt.
   Answer-first ist kein Geschäftsmodell mehr.“ `[D]`
5. „Duolingo: 1.588 kritische Paywall-Erwähnungen in 13.850 Reviews — bei
   4,7 Sternen. Sterne zeigen Zufriedenheit, Reviews zeigen Reibung.“ `[D]`
6. „Quizlet: ‚everything is behind a paywall now.‘ Der Lernschritt ist die
   Ware.“ `[D]`
7. „Kahoot: 10 Teilnehmer im Free-Plan, Jahresabo für Schulen. Engagement
   ist nicht Lernen.“ `[D]`
8. „NYU Viva: 70 % sagen, es testet Verständnis — aber nur 33 % fanden die
   Fragen klar, 83 % fanden es stressiger, 13 % bevorzugten das KI-Format.“ `[P]`
9. „Khanmigo: 18 Schulen, 2 Jahre, keine zusätzlichen Lernvorteile. Schüler
   wollten die Fragen nicht.“ `[P]/[POL]`
10. „Cambridge: KI-Bewertung belohnt Stil statt Substanz; sehr gute und sehr
    schwache Essays werden verfehlt.“ `[P]`
11. „Pearson MyLab: 100 $ für einen Access Code, 1.200 $ für Multi-Term
    Nursing. Studierende zahlen für Zugang, nicht für Lernen.“ `[D]/[V]`
12. „Honorlock verlangt Room-Scan; Respondus läuft nicht auf dem Handy.
    Prüfungssoftware ist oft die Barriere, die sie lösen soll.“ `[D]`

**Der eine Satz für den Pitch:**
> „Die anderen Apps geben dir eine Antwort oder eine Note. Viva gibt dir die
> eine Frage, die du nicht googeln kannst.“

---

## 10. Red-Team: Die zehn härtesten Einwände

| Einwand | Antwort (mit Evidenz) |
|---|---|
| „Schüler wollen keine Fragen.“ | Khanmigo-Studie zeigt: aufgezwungene Fragen führen zu Ausstieg. Viva ist **freiwillig**, text-first, mit „Weiß nicht“, Hint und Skip. Der Juror wählt den Seed; niemand wird verpflichtet. |
| „Mündliche Prüfungen sind stressig.“ | NYU: 83 % stressiger. Deshalb ist Viva **keine Prüfung**, kein Timer, keine Note, Retry. Stress ist der Grund für den Übungsraum, nicht gegen ihn. |
| „KI-Bewertung ist bias.“ | Deshalb **keine Note**. Die Rubrik ist eine Linse; die Lehrkraft entscheidet. Cambridge/LLM-Style-Bias werden im Pitch als Grund für Human Review genannt. |
| „KI erfindet Zitate.“ | Quote-Verifier mit exaktem Substring; bei Fehlschlag „nicht genug Evidenz“. Das ist im UI sichtbar, nicht nur im Prompt. |
| „Das ist doch nur ein Chatbot.“ | Chatbot hat keinen Zustand, keine Claim-Bindung, keine Rubrik, keinen Audit-Log. Viva hat eine Pipeline: Claim → Quote → Frage → Antwort → Evidenz. |
| „ExamSim macht das schon.“ | ExamSim ist ein generischer Avatar für mündliche Prüfungen. Viva arbeitet am **eigenen Text**, bindet jede Frage an ein Zitat und gibt der Lehrkraft eine Triage-Entscheidung — ohne Note. |
| „Turnitin wird doch überall genutzt.“ | Immer weniger: Southampton, Newcastle, Westminster steigen aus; nach Berichten lässt Yale Scores nicht als formalen Beweis zu. Detection ist kein Zukunftsmarkt. |
| „Wo ist der Beweis, dass es lernt?“ | Wir behaupten keinen Wirksamkeitsbeweis. Wir zeigen den Mechanismus: Self-Explanation, Teach-Back, Retrieval, evidenzgebundenes Feedback. Der Messplan ist formativ und klein. |
| „Das ist nicht skalierbar.“ | Der Engpass ist nicht die KI, sondern die menschliche Entscheidung. Viva skaliert die **Vorbereitung** und die **Triage**, nicht die Note. Genau das ist der #1-Fit. |
| „Datenschutz?“ | Keine echten Daten, kein Audio-Storage, kein Login, keine Kamera, Session-Reset. Das ist strenger als die meisten der 100 Produkte. |

---

## 11. Quellen (Auswahl, mit Typ)

### Markt/Reviews
- ScreenKraft. Duolingo conversion & structure teardown (13.850 Reviews,
  1.588 Paywall-Mentions). https://www.screenkraft.app/teardown/duolingo `[D]`
- Dimension Labs. Duolingo review analysis (502.269 Reviews; Paywall-Sprache
  2,89 % → 4,96 %; Trust-Erosion 2,91 % → 7,44 %).
  https://assets.dimensionlabs.io/duolingo-report `[D]`
- Class Central. Duolingo Breaks Hearts for Energy (2025-10-15).
  https://www.classcentral.com/report/duolingo-breaks-hearts-for-energy `[D]`
- Trustpilot. Quizlet reviews. https://www.trustpilot.com/review/www.quizlet.com `[D]`
- Capterra. Kahoot! reviews 2026.
  https://www.capterra.com/p/156399/Kahoot/reviews/ `[D]`
- Kahoot Support. Participant limits.
  https://support.kahoot.com/hc/en-us/articles/115003072287 `[V]`
- Trustpilot. Coursera reviews. https://www.trustpilot.com/review/coursera.org `[D]`
- LearnStack/Yameyaku. Coursera Plus review (nennt Trustpilot ~1,4/5).
  https://yameyaku.com/coursera-plus-review `[D]`
- ConsumerAffairs. Coursera reviews.
  https://www.consumeraffairs.com/education/online-courses/coursera.html `[D]`
- Google Play/App Store reviews (u. a. Turbo AI, Busuu, simpleclub, Knowunity).
  https://play.google.com/store/apps/details?id=ai.turbolearn `[D]`
- Nibble. Prodigy review (Magicoin/Upsell).
  https://nibble-app.com/blog/prodigy-review `[D]`
- Trustpilot. Mentimeter reviews (Score-Fehler).
  https://www.trustpilot.com/review/mentimeter.com `[D]`
- eLearning Industry. Canvas reviews (fehlende Basisfunktionen).
  https://elearningindustry.com/directory/elearning-software/canvas/reviews `[D]`
- Gartner Peer Insights. Moodle reviews (Mobile/Clutter).
  https://www.gartner.com/reviews/market/higher-education-learning-management-systems/vendor/moodle/product/moodle `[D]`
- Wooclap. Mentimeter vs Slido (Fragetypen/Limits).
  https://www.wooclap.com/en/blog/mentimeter-slido-wooclap `[D]`
- New York Times (2014). Privacy Concerns for ClassDojo.
  https://www.nytimes.com/2014/11/17/technology/privacy-concerns-for-classdojo-and-other-tracking-apps-for-schoolchildren.html `[POL]`
- Turbo AI Blog. StudyFetch vs Turbo (Nutzerzitate zu Datenverlust).
  https://www.turbo.ai/blog/studyfetch-vs-turbo `[D]`
- Lernmarktplatz. simpleclub im Test (Google Play 2,4★; Trustpilot 4,5★).
  https://lernmarktplatz.de/products/simpleclub-erfahrungen `[D]`
- AltIndex. Chegg traffic collapse −59,4 %.
  https://altindex.com/news/chegg-traffic-collapse-next-for-stock `[D]`
- FTC. Chegg $7.5M settlement.
  https://www.ftc.gov/legal-library/browse/cases-proceedings/c4782-chegg-inc `[POL]`

### KI, Lernen, Assessment
- Hechinger Report. “Students didn’t get answers from Khanmigo. They didn’t
  want its questions, either.” (2026-09-21).
  https://hechingerreport.org/proof-points-khanmigo-math-ai-tutor/ `[POL]`
- Khan Academy. Khanmigo Guide for Teachers (limitations).
  https://www.khanacademy.org/humanities/world-history-project-ap/xb41992e0ff5e0f09:teacher-resources-whp-ap/xb41992e0ff5e0f09:teaching-with-oer-project/a/khanmigo-guide-oer `[V]`
- Ipeirotis & Rizakos (2026). Scalable and Personalized Oral Assessments Using
  Voice AI. CACM. https://cacm.acm.org/practice/scalable-and-personalized-oral-assessments-using-voice-ai `[P]`
- arXiv:2603.18221. Scalable and Personalized Oral Assessments Using Voice AI.
  https://arxiv.org/html/2603.18221v2 `[PP]`
- University of Cambridge (2026-05-22). AI not yet good enough to mark
  university essays. https://www.cam.ac.uk/stories/ai-university-essay-grading `[P]`
- arXiv:2603.18765. Implicit Grading Bias in LLMs.
  https://arxiv.org/html/2603.18765 `[PP]`
- The 74. AI Tutors Are Praising Instead of Teaching (Sycophancy).
  https://www.the74million.org/article/ai-tutors-are-praising-instead-of-teaching `[POL]`

### Detection/Integrität
- Turnitin. AI writing detection model / FAQ / false positives.
  https://guides.turnitin.com/hc/en-us/articles/28294949544717 `[V]`
- Times Higher Education (2026-10-08). More universities end Turnitin
  contracts. https://www.timeshighereducation.com/news/more-universities-end-turnitin-contracts-concerns-mount `[POL]`
- Inside Higher Ed (2026-10-15). More UK universities end Turnitin contracts.
  https://www.insidehighered.com/news/students/academics/2026/10/15/more-uk-universities-end-turnitin-contracts `[POL]`
- Royal Holloway (2026-10-08). Turnitin EULA update (Pause bis Sept 2027).
  https://intranet.royalholloway.ac.uk/students/news-events/news-articles/2026/october/your-questions-about-turnitin-an-update.aspx `[POL]`
- Winss Solutions (2026-10-11), unter Berufung auf AI Weekly/FT: Yale/JHU
  behandeln Detection-Scores nur beratend.
  https://www.winssolutions.org/uk-universities-end-turnitin-contracts/ `[POL]`
- GPTZero. Benchmark claims.
  https://gptzero.me/news/gptzero-ai-detection-benchmarking-the-industry-standard-in-accuracy-transparency-and-fairness `[V]`
- Hugging Face. GPTZero accuracy review 2026 (8,4 % / 23,7 % FPR).
  https://huggingface.co/gptzero-accuracy-review-2026 `[D]`
- Trustpilot. GPTZero reviews. https://www.trustpilot.com/review/gptzero.me `[D]`
- Grammarly Authorship. Limits/FAQ. https://www.grammarly.com/authorship `[V]`
- The Guardian (2026-03-13). Grammarly removes AI Expert Review feature.
  https://www.theguardian.com/books/2026/mar/13/grammarly-removes-ai-expert-review-feature-mimicking-writers-after-backlash `[POL]`
- Jisc. Grammarly Authorship and acknowledging AI use in assessment.
  https://nationalcentreforai.jiscinvolve.org/wp/2024/11/15/grammarly-authorship-acknowledging-ai-use-in-assessment/ `[POL]`

### Proctoring/Accessibility
- Honorlock. Student privacy/consent.
  https://honorlock.com/studentprivacy `[V]`
- Proctorio. Privacy notice. https://proctorio.com/privacy `[V]`
- Respondus. Accessibility with LockDown Browser.
  https://support.respondus.com/hc/en-us/articles/4409595429659 `[V]`
- Lumen Learning. OHM: Using Respondus LockDown Browser - Students
  (Admin-Rechte/Installation).
  https://support.lumenlearning.com/ `[D]`
- University of Minnesota. Privacy in Video Proctoring Guidelines
  (Room Scan/Consent).
  https://teachingsupport.umn.edu/privacy-video-proctoring-guidelines `[POL]`
- Hawkes Learning. Respondus device limits (no phones/tablets).
  https://www.hawkeslearning.com/supportcenter/respondus-lockdown-browser-student-directions-and-help `[D]`
- NPR (2026-04-06). Digital accessibility in college.
  https://www.npr.org/2026/04/06/nx-s1-5720191/digital-accessibility-college-education-disability `[POL]`
- ADA Title II / WCAG 2.1 AA deadlines.
  https://www.ada.gov/resources/2024-03-08-web-rule/ `[POL]`

### Peer/Grading
- Sarah E. Silverman. Perusall algorithmic grading.
  https://sarahemilysilverman.com/2023/01/31/may-inadvertently-penalize-students-for-positive-behaviors-the-trouble-with-perusalls-algorithmic-grading/ `[D]`
- Reddit r/CollegeRant. Packback AI teaching rant.
  https://www.reddit.com/r/CollegeRant/comments/194yy6h/ `[D]`
- FeedbackFruits. Peer Review overview (low feedback quality).
  https://help.feedbackfruits.com/hc/en-us/articles/23527057857554 `[V]`

### Kosten/Courseware
- Pearson MyLab Nursing multi-term access ($1,200).
  https://www.pearson.com/en-us/subject-catalog/p/mylab-nursing-with-pearson-etext-access-card-for-curriculex/P200000015393/9780135881781 `[V]`
- VitalSource. MyLab Math 18-week access ($139.64).
  https://www.vitalsource.com/products/mylab-math-with-pearson-etext-18-week-gary-k-rockswold-v9780135902455 `[V]`
- Reddit r/mathematics. Pearson access code ($100 to do homework).
  https://www.reddit.com/r/mathematics/comments/hh3f4j/ `[D]`

### Deutsche Produkte
- ExamSim, Universität Bayreuth.
  https://www.zhl.uni-bayreuth.de/de/projekte/examsim/index.html `[D]`
- simpleclub Google Play reviews (2,4★).
  https://play.google.com/store/apps/details?id=com.simpleclub.android `[D]`
- Studyflix Trustpilot.
  https://de.trustpilot.com/review/studyflix.de `[D]`

---

## 12. Offene Unsicherheiten

1. **Review-Repräsentativität:** Die 100 Produkte sind segmentbalanciert,
   nicht zufällig gezogen. Die Muster sind robust, die Häufigkeiten nicht.
2. **Vendor-vs-unabhängig:** GPTZero/Turnitin-Zahlen sind Eigenangaben;
   unabhängige Tests weichen stark ab. Im Pitch nur die unabhängigen Zahlen
   als Beweis verwenden.
3. **Deutsche Marktabdeckung:** simpleclub/Studyflix/Knowunity sind gut
   sichtbar; andere deutsche Anbieter (StudySmarter, Knowunity, Azubi-Apps)
   haben dünne öffentliche Review-Spuren.
4. **ExamSim:** Öffentlich sind Features und eine Studie mit 276 Teilnehmenden
   sichtbar; Preise, Institutionen und Evaluationsdetails sind unklar.
5. **NYU Viva:** Die Zahlen stammen aus einer Kurskohorte (73 Studierende,
   AI/ML Product Management); Generalisierung auf andere Fächer ist offen.
6. **Cambridge/Grading-Bias:** Die Studien sind 2026 und teils Preprints;
   Replikation steht aus.
7. **Turnitin-Verträge:** Die £87.621 sind eine einzelne Hochschule; die
   Ausstiege sind ein Muster, aber kein Marktkollaps.
8. **Accessibility:** Die ADA-Deadlines wurden 2026 verschoben; die
   rechtsverbindlichen Termine sind 2027/2028, nicht sofort.
9. **Keine Lernoutcome-Daten:** Wir behaupten keinen Wirksamkeitsbeweis für
   Viva. Der Messplan bleibt formativ.
10. **Zeit:** Dieses Dokument ist nach dem 10:30-Lock entstanden. Es ändert
    keine Strategie, nur die Ausführung.

---

## 13. Nächste konkrete Schritte (bis Feature Freeze)

- [ ] Improvement 1, 2, 3, 5, 8 in den Demo-Pfad einbauen (kritisch).
- [ ] Improvement 4, 7, 9, 10, 11 als Härtung am Samstagabend.
- [ ] Improvement 6, 12 am Sonntagmorgen, wenn die Kernpipeline steht.
- [ ] Pitch-Ammonition: drei Sätze aus Abschnitt 9 auswählen und proben.
- [ ] Red-Team: die vier härtesten Einwände (Fragenaversion, Stress,
  Bias, „nur Chatbot“) in Q&A üben.
- [ ] AI Decision Log: diesen Scan als Eintrag „Review-Mining“ aufnehmen,
  inklusive der Korrektur „keine Note, keine Detection“.
- [ ] Keine neuen Produktideen mehr. Scope steht.

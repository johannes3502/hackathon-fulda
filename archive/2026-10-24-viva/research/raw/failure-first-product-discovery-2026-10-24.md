# Failure-First Product Discovery — Was Lern-Apps kaputt machen, welche Lücken bleiben und welche Produkte daraus entstehen

**Stand:** 24.10.2026, 11:50
**Auftrag:** Nicht die 100 Apps verbessern, nicht Viva schärfen. Sondern:
Welche Features funktionieren am schlechtesten? Wo sind die größten Lücken?
Welche USPs fehlen? Und welche **eigenständigen Produkte** folgen daraus?

**Ausgeschlossen:** Viva und die bisherigen acht Ideen. Sie kommen in diesem
Dokument nur als Negativabgrenzung vor. Die Analyse ist bewusst
„failure-first“: erst die Evidenz, dann das Produkt.

---

## 0. Kurzantwort

Die 100 untersuchten Lernprodukte scheitern **nicht primär an KI-Qualität**.
KI-Ungenauigkeit ist bei nur 9 von 100 Produkten das dominante Negativmuster.
Die häufigsten und schädlichsten Fehler liegen woanders:

1. **Access** — 48 von 100 Produkten haben Paywall-/Abo-Friction als
   dominantes oder sekundäres Muster.
2. **UX/Mobile/Accessibility** — 17 von 100.
3. **Lehrer-Workflow/Dashboards** — 15 von 100.
4. **Consent/Surveillance** — 14 von 100.
5. **Content-Qualität** — 14 von 100.

Die größten **Lücken** sind keine fehlenden Features, sondern fehlende
**Übergänge**:

| Übergang | Was heute fehlt | Produktkategorie |
|---|---|---|
| Feedback → Revision | Niemand misst, ob Feedback das Werk verändert hat | **Feedback Uptake** |
| Gruppe → Individuum | Niemand sieht, wer was verstanden hat — ohne Surveillance | **Group Understanding** |
| Wissen → Transfer | Apps testen Recall im gleichen Kontext, nicht Anwendung | **Transfer Training** |
| Aktivität → Selbsteinschätzung | Apps zeigen Completion, nicht Kalibrierung | **Calibration** |
| Daten → Entscheidung | Dashboards zeigen Zahlen, keine Handlung | **Teacher Triage** |
| Aufnahme → Einwilligung | Notetaker nehmen auf, Consent ist ungelöst | **Consent-first Capture** |

**Empfehlung:** **Loop** — die erste App, die misst, was nach dem Feedback
passiert. Fallback: **GroupProof** — Gruppenarbeit, bei der sichtbar wird,
wer verstanden hat. Beide sind eigenständige Produkte, keine Layer für
bestehende KI-Tools.

---

## 1. Methodik

### 1.1 Datengrundlage

- Re-Analyse der 100-Produkt-Tabelle aus
  `top100-learning-apps-review-mining-2026-10-24.md`.
- Jede Zeile hat ein dominantes Negativmuster und bis zu drei Cluster-Codes.
  Die Zählung ist daher eine **Nennungshäufigkeit**, keine exklusive
  Klassifikation: Ein Produkt kann z. B. gleichzeitig Paywall und UX-Problem
  haben.
- Neue Quellen für die Lückenanalyse: Studien zu Feedback-Uptake,
  Gruppenarbeit, Kalibrierung, Transfer, Lehrer-Workload, Dashboards,
  Consent und Accessibility.
- Evidenzgrade: `[P]` peer-reviewed, `[D]` Daten/Reviews/Vendor,
  `[POL]` Policy/Institution, `[V]` Vendor-Claim, `[K]` konsistentes
  Review-Muster ohne starke Einzelquelle.

### 1.2 Grenzen

- Die 100 Produkte sind segmentbalanciert, kein Zufallssample des Marktes.
- Review-Plattformen sind verzerrt: Wer schreibt, ist unzufriedener.
- Cluster-Häufigkeiten messen **Sichtbarkeit**, nicht Schwere.
- „Kein Produkt gefunden“ heißt: im öffentlichen Web nicht gefunden.
- Die neuen Produktideen sind Hypothesen, keine validierten Märkte.

### 1.3 Warum Feature-Ebene?

Die bisherige Analyse war app-zentriert („Duolingo hat Paywall“). Für
Produktentscheidungen ist das zu grob. Ein Produkt kann eine App hassen und
trotzdem ein Feature lieben. Die entscheidende Frage ist:

> Welche **Aufgabe** erledigt die App so schlecht, dass Nutzer sie außerhalb
> der App lösen — und würden sie für eine eigene Lösung wechseln?

Genau dort entstehen neue Produkte, nicht bei „bessere Version von App X“.

---

## 2. Die quantitative Failure-Map

### 2.1 Cluster-Häufigkeit in den Top 100

| Cluster | Muster | Nennungen | Schwere (1–5) | Schwerste Folge |
|---|---|---:|---:|---|
| C1 | Paywall/Abo | **48** | 3 | Zugang, Trust, Equity |
| C12 | UX/Mobile/A11y | **17** | 4 | Ausschluss, Frust, Datenverlust |
| C15 | Dashboard/Workload | **15** | 3 | keine Entscheidung, Lehrerzeit |
| C8 | Surveillance/Consent | **14** | 5 | Privacy, Recht, Misstrauen |
| C5 | Content-Qualität | **14** | 4 | falsches/oberflächliches Lernen |
| C2 | Gamification | **11** | 3 | Engagement statt Verständnis |
| C10 | Kosten | **9** | 4 | Equity, Access Codes |
| C3 | KI-Ungenauigkeit | **9** | 5 | falsche Antworten, Halluzination |
| C14 | Credential-Skepsis | **8** | 3 | Zertifikat ohne Wert |
| C6 | Bewertungsopazität | **8** | 5 | Bias, unfaire Noten |
| C16 | Oral-Exam-Stress | **7** | 4 | Angst, Benachteiligung |
| C7 | Detection-FP | **5** | 5 | falsche Anschuldigung |
| C9 | Proctoring-Zugang | **5** | 4 | Geräteausschluss |
| C4 | Answer-first | **4** | 4 | Kopieren statt Verstehen |
| C11 | Peer-Feedback | **4** | 4 | Gaming, Qualität |
| C18 | Vendor-Lock-in | **2** | 3 | Wechselkosten |
| C13 | Datenverlust/Bugs | **2** | 5 | Arbeit weg |
| C17 | Prozess-Evidenz | **1** | 4 | Opt-in, gamebar |

**Summe:** 177 Nennungen auf 100 Produkte; Mehrfachnennungen möglich.

### 2.2 Drei Befunde

**Befund 1: Paywall ist das häufigste, aber nicht das schädlichste Problem.**
48 von 100 Produkten gaten die Kernfunktion. Das ist ein Vertrauens- und
Equity-Problem, aber es zerstört selten das Lernen selbst. Die schädlichsten
Muster sind seltener: Surveillance (C8), Bewertungsopazität (C6),
Detection-False-Positives (C7), Datenverlust (C13), KI-Ungenauigkeit (C3).
Genau diese werden von den meisten Produkten als „Feature“ verkauft.

**Befund 2: Die Marktlücke ist nicht „mehr KI“, sondern „mehr Übergang“.**
Die Apps optimieren Content, Engagement und Generierung. Die Reviews
scheitern an dem, was **nach** der Generierung passiert: Feedback wird nicht
umgesetzt, Gruppenarbeit wird nicht fair, Wissen wird nicht transferiert,
Daten werden nicht zu Entscheidungen. Das sind keine Content-Probleme. Das
sind **Workflow-Probleme**.

**Befund 3: KI-Qualität ist ein reales, aber überschätztes Differenzierungs-
merkmal.** Nur 9/100 Produkte haben KI-Ungenauigkeit als dominantes Muster.
Gleichzeitig ist die KI-Generierung selbst commoditisiert: Jeder kann
Feedback, Quizze und Zusammenfassungen generieren. Der Wettbewerb verschiebt
sich von „Wer generiert?“ zu „Wer stellt sicher, dass es ankommt?“.

### 2.3 Die zehn am schlechtesten funktionierenden Features

Rangfolge nach **Schwere × Häufigkeit × Konsequenz für Nutzer**, nicht nach
reiner Nennung.

#### 1. Access-Gating (Paywall, Abo, Login, Install)

**Evidenz:** Duolingo: 1.588 kritische Pricing-Erwähnungen in 13.850 Reviews;
Quizlet: „only lets me answer 14 questions“; Kahoot Free: 10 Teilnehmer;
Pearson MyLab: ~100 $ Access Code pro Kurs; Coursera: Auto-Renewal und
paywalled certificates. `[D]`

**Warum es persistiert:** Die Kernfunktion ist teuer (Content, LLM, Support),
also wird der Lernschritt gated. Das ist rational für den Anbieter und
schädlich für den Lernenden. **Produktkonsequenz:** Ein Produkt, das ohne
Login, ohne Abo und ohne Installation in 90 Sekunden Wert liefert, ist kein
„Free Tier“, sondern ein Trust-Produkt.

#### 2. Mobile/UX/Accessibility

**Evidenz:** Canvas: fehlende Basisfunktionen, ADA-Probleme; Moodle: mobile
App langsam, überladen; Respondus: keine Smartphones/Tablets, Admin-Rechte;
Busuu: richtige Antwort wird als falsch markiert; StudyFetch: „my files
disappeared during the exam period“. `[D]`

**Warum es persistiert:** Web-first gebaut, Mobile als Skin, Accessibility als
Compliance-Projekt. **Produktkonsequenz:** Mobile-first bei 375 px,
Keyboard, Screenreader, 200-%-Zoom, kein Timer — nicht als „Mode“, sondern
als Default.

#### 3. Lehrer-Dashboards und Workflow

**Evidenz:** Learning-Analytics-Dashboards: „another dashboard nobody opens“;
95 erfahrene Lehrkräfte sind skeptisch gegenüber Ease-of-Use; 26 daily
dashboard users brauchen Data-Literacy und Kontext; Adoption bleibt limitiert.
Lehrer: 9,9 h/Woche Grading, 62 % nennen Grading als einen der schlechtesten
Job-Aspekte, ein Drittel dachte über Berufsausstieg nach (US, 258 Lehrkräfte,
2025). `[P]/[D]`

**Warum es persistiert:** Dashboards sind einfacher zu bauen als
Entscheidungen. Sie zeigen Daten, aber keine Priorisierung. **Produkt-
konsequenz:** Nicht „mehr Analytics“, sondern **drei Entscheidungen pro Tag**.

#### 4. Consent/Surveillance

**Evidenz:** Honorlock: Room-Scan und Aufzeichnung; Proctorio: Privacy- und
Bias-Kritik; Respondus: Gerätelimits; Otter.ai/Fireflies.ai: BIPA-/Wiretap-
Klagen; ClassDojo: Behavior-Tracking-Geschichte. `[D]/[POL]`

**Warum es persistiert:** Aufnahme ist technisch einfach, Consent ist
organisatorisch schwer. **Produktkonsequenz:** Kein Audio-Storage, keine
Kamera, kein Tracking. Wenn Aufnahme, dann per-Speaker-Consent und
Löschung — aber das ist ein 24h-Risiko, kein Demo-Spaziergang.

#### 5. Content-Qualität und Alignment

**Evidenz:** Coursera/Udemy: starke Varianz; Studyflix: oberflächlich;
Khanmigo: Inhalte nicht auf Khan-Academy-Material begrenzt; simpleclub:
Content gut, App durch Updates und Abo-Tiers schlechter. `[D]/[K]`

**Warum es persistiert:** Skalierung belohnt Menge, nicht Tiefe. **Produkt-
konsequenz:** Ein Seed, ein Fach, eine Rubrik — Tiefe statt Katalog.

#### 6. Gamification statt Lernen

**Evidenz:** Duolingo: Gamification-Plateau, keine Konversationsflüssigkeit;
Kahoot: „Recall over teaching“, kurze Timer, Multiple Choice; Prodigy:
Magicoin-Druck und Upsell; Quizizz/Blooket/Gimkit: Engagement hoch,
Lernzuwachs nicht gemessen. `[D]/[K]`

**Warum es persistiert:** Engagement ist messbar, Verständnis nicht.
**Produktkonsequenz:** Keine Streaks, keine Leaderboards, keine Coins.
Fortschritt ist Evidenz, nicht Serie.

#### 7. KI-Ungenauigkeit, Halluzination, Sycophancy

**Evidenz:** Khanmigo: „inaccuracies or misleading implications“,
„hallucinations“; Khanmigo-Studie (18 Tennessee Middle Schools, 2024–2026):
keine zusätzlichen Lernvorteile, Schüler wollten Antworten statt Fragen;
Turbo AI: erfindet Personen und Details; Cambridge 2026: KI-Bewertung
belohnt Stil statt Substanz; LLM-Style-Bias: 1,35/0,90 Punkte Abwertung für
Nicht-Muttersprachler. `[P]/[POL]/[D]`

**Warum es persistiert:** LLMs sind probabilistisch; „confidence“ ist
billig, „verification“ ist teuer. **Produktkonsequenz:** Jede KI-Aussage
braucht eine überprüfbare Quelle oder „nicht genug Evidenz“. Das ist ein
Produktprinzip, kein Prompt.

#### 8. Bewertungsopazität und Bias

**Evidenz:** Packback: „Creativity Score“ hängt an Länge, Satzstruktur,
Quellen, großen Wörtern; Perusall: sieben Engagement-Metriken werden zu einer
Note verrechnet, „may penalize positive behaviors“; Cambridge: Central-
Tendency-Bias; LLM-Bias gegen Nicht-Muttersprachler. `[P]/[D]`

**Warum es persistiert:** Automatische Noten skalieren; Erklärbarkeit nicht.
**Produktkonsequenz:** Keine Note, kein Score, kein Rank. Drei Zustände plus
„nicht genug Evidenz“, mit menschlichem Override.

#### 9. Kosten und Access Codes

**Evidenz:** Pearson MyLab: ~100 $/Kurs, 18-Wochen-Code 139,64 $, Nursing
Multi-Term 1.200 $; Top Hat: Access pro Term/Year; Coursera/FutureLearn:
Assessments und Zertifikate paywalled. `[D]/[V]`

**Warum es persistiert:** Publisher-Content und Courseware sind an
Institutionen gebunden. **Produktkonsequenz:** Kein Publisher-Content, keine
Access Codes, keine Zertifikatsgebühr.

#### 10. Credential-Skepsis

**Evidenz:** Coursera: Trustpilot ~1,4/5 (berichtet); Chegg: Traffic −59,4 %,
FTC-Settlement 7,5 Mio. $; Micro-Credentials: Fragmentierung und
Arbeitgebervertrauen ungelöst. `[D]/[P]`

**Warum es persistiert:** Zertifikate sind ein Business-Modell, kein
Lernnachweis. **Produktkonsequenz:** Kein Zertifikat. Evidenz ist formativ
und transportierbar, aber keine Prüfungsgültigkeit.

---

## 3. Die acht größten Lücken

Eine Lücke ist etwas, das **nicht kaputt**, sondern **nicht vorhanden** ist.
Die folgenden acht sind aus den Reviews und der Forschung destilliert.

### L1 — Feedback Uptake: Feedback verändert das Werk nicht

**Befund:** In einer Studie mit **14.236 Schülern aus 655 Klassen** reichten
52 % nach KI-Feedback eine Revision ein, **48 % revidierten gar nicht**
(Jansen, Horbach & Meyer, LAK 2025). In einer anderen Studie führten nur
**9 %** der KI-Feedback-Vorschläge zu Revisionen. Die Uptake-Rate ist bei
Oberflächen-Feedback hoch (**86 %** Grammatik), bei Bedeutungs-Feedback
niedrig (**32 %**). `[P]`

**Was heute existiert:** Feedback-Generatoren (Grammarly, Class Companion,
FeedbackFruits, Turnitin), Lernplattformen mit Kommentarfunktion, rubrikbasierte
Bewertung. **Was fehlt:** Ein Werkzeug, das den **Übergang von Kommentar zu
Revision** besitzt: Aufgaben ableiten, Revision prüfen, Uptake sichtbar
machen, Erklärung einholen.

**Warum es niemand besitzt:** Die meisten Tools stoppen am Kommentar. Sie
messen „Feedback gegeben“, nicht „Feedback angekommen“. Das ist die
wirkungsvollste offene Stelle im Markt.

**Evidenz für die Lücke:**
- NSS 2025: Nur **75,2 %** stimmen zu, dass Feedback hilft, die Arbeit zu
  verbessern; Assessment/Feedback ist an vielen Hochschulen der
  unzufriedenstellendste Bereich (Edinburgh 64,9 % positiv). `[POL]/[D]`
- 9,9 h/Woche Grading; 62 % der Lehrkräfte nennen Grading als einen der
  schlechtesten Aspekte; ein Drittel dachte über Ausstieg nach. `[D]`
- KI-Feedback ist oft generisch und weniger konkret als Lehrerfeedback;
  Studierende bevorzugen Lehrerfeedback. `[P]`
- 20 % revidieren gar nicht, 47 % revidieren ohne Verbesserung (AAAI 2026,
  937 deutsche Schüler, Grades 7–9). `[P]`

### L2 — Group Work: Niemand sieht individuelles Verständnis ohne Surveillance

**Befund:** Free-Riding ist die größte Sorge von Studierenden bei
Gruppenarbeit (N=205, Australian university; Hall & Buzwell 2013). In einer
Online-Learning-Studie nahmen **77,4 %** der Public-University-Studierenden
Social Loafing in ihren Gruppen wahr. In einer 9-Wochen-Studie mit 675
Studierenden senkte Team-Learning das Social Loafing. `[P]`

**Was heute existiert:** LMS-Gruppen, Teams, Slack, Discord, Trello, Notion,
Peer-Evaluation (CATME, Peerceptiv, FeedbackFruits). **Was fehlt:** Ein
Instrument, das **individuelles Verständnis** in einer Gruppe sichtbar macht,
ohne Aktivität zu tracken oder zu surveillieren.

**Warum es niemand besitzt:** Die einen bauen Projektmanagement (Aktivität),
die anderen bauen Peer-Grading (Selbstauskunft). Der Übergang „Gruppe hat
abgegeben“ → „Wer kann welchen Teil erklären?“ ist unbesetzt.

**Evidenz für die Lücke:**
- Studierende nutzen für Gruppenarbeit vor allem WhatsApp (67,6 % Präferenz)
  und Discord (25 % meistgenutzt), nicht das LMS. `[D]/[K]`
- Peer-Assessment ist bias-anfällig, gaming-anfällig und arbeitsintensiv. `[P]`
- Soziale Lern-Apps sind beim Matching crowded, aber nicht bei der **Qualität
  der Zusammenarbeit**. `[K]`

### L3 — Transfer: Apps testen Recall, nicht Anwendung

**Befund:** Transfer passiert nicht automatisch. Lernende können Wissen im
Lernkontext zeigen, aber nicht in neuen Kontexten anwenden (Perkins &
Salomon; Bransford et al.). `[P]`

**Was heute existiert:** Quizze, Flashcards, adaptive Practice, Prüfungssimulation.
**Was fehlt:** Aufgaben, die eine **neue Kontextanwendung** verlangen, mit
evidenzbasierter Rückmeldung und einem zweiten, kontrastierenden Fall.

**Warum es niemand besitzt:** Transfer ist schwer zu messen und noch schwerer
zu automatisieren. Apps optimieren lieber Completion und Correctness.

**Evidenz für die Lücke:**
- Retrieval Practice verbessert Retention, aber Transfer braucht zusätzlich
  die **Erkennung der Relevanz** in der neuen Situation. `[P]`
- Produktive Failure / Problem-solving before instruction kann Transfer
  erhöhen, wird aber in Apps kaum genutzt. `[P]`
- Employability-Klagen über „graduates can't apply“ sind konsistent, aber
  schwer als einzelne Zahl zu belegen. `[K]`

### L4 — Calibration: Apps zeigen Aktivität, nicht Selbsteinschätzung

**Befund:** Überconfident Studierende unterschätzen ihren Lernbedarf und
brechen früher ab; sie prognostizieren Noten bis zu **30 % höher** als
erreicht (Hacker et al., zitiert in JOSTL 2021). Überconfidence produziert
Underachievement (Dunlosky & Rawson 2012). `[P]`

**Was heute existiert:** Fortschrittsbalken, Streaks, Completion, Quiz-Scores.
**Was fehlt:** Ein Werkzeug, das **Confidence vs. Correctness** misst und
daraus einen Lernplan ableitet.

**Warum es niemand besitzt:** Confidence ist ein zusätzlicher Input, der die
UX verlangsamt. Apps optimieren lieber die Zahl, die sie ohnehin haben.

**Evidenz für die Lücke:**
- Kalibrierung ist ein Prädiktor für Strategie-Nutzung und Lernoutcome. `[P]`
- Es gibt erste Kalibrierungs-Produkte (MindFrame, Headstart, MetaLearn OS),
  aber sie sind emergend, nicht Mainstream. `[K]`
- Die meisten Lern-Apps belohnen Anwesenheit, nicht akkurate Selbsteinschätzung.

### L5 — Teacher Triage: Dashboards zeigen Daten, keine Entscheidungen

**Befund:** Lehrer-Dashboards werden oft nicht adoptiert; 95 erfahrene
Lehrkräfte sind skeptisch; 26 daily users brauchen Data-Literacy; Adoption
bleibt limitiert. `[P]`

**Was heute existiert:** Canvas/Moodle Analytics, Khanmigo Teacher Tools,
Gradescope, Learning Analytics. **Was fehlt:** Ein **Triage-Instrument**, das
eine Klasse in drei handelbare Gruppen teilt und pro Gruppe eine Aktion
anbietet.

**Warum es niemand besitzt:** Dashboards sind ein Verkaufsargument
(„Transparenz“), Triage ist ein Eingeständnis („wir priorisieren“).

### L6 — Consent-first Capture: Aufnahme ohne Einwilligung

**Befund:** Otter.ai und Fireflies.ai sind mit BIPA-/Wiretap-Klagen
konfrontiert; Honorlock verlangt Room-Scan; Universitäten veröffentlichen
Consent-Hinweise. `[D]/[POL]`

**Was heute existiert:** Notetaker, Lecture Capture, Proctoring. **Was fehlt:**
Aufnahme, die **pro Sprecher:in** Consent einholt, nicht-consentende Stimmen
ausblendet und Löschung garantiert.

**Warum es niemand besitzt:** Audio + Diarization + Consent ist technisch und
rechtlich komplex. Für 24h zu riskant — aber langfristig eine echte Lücke.

### L7 — Accessibility by Default

**Befund:** Blinde Studierende berichten, dass Kursmaterialien nicht mit
Screenreadern funktionieren (NPR, April 2026); ADA Title II verlangt WCAG
2.1 AA, Deadlines 2027/2028; Respondus unterstützt keine Smartphones/Tablets;
Read&Write/Kurzweil sind teuer und komplex. `[POL]/[D]`

**Was heute existiert:** Bolt-on Accessibility-Tools, PDF-Reader, Speechify.
**Was fehlt:** Ein Lernprodukt, bei dem Accessibility **der Default** ist,
nicht ein Modus.

**Warum es niemand besitzt:** Accessibility wird als Compliance-Kosten
gesehen, nicht als Produktvorteil. Der Markt ist bereit, aber die
Differenzierung ist schwer.

### L8 — Student-owned Evidence

**Befund:** Coursera-Zertifikate sind paywalled und wenig vertrauenswürdig;
Cheggs Homework-Modell kollabiert (−59,4 % Traffic); Micro-Credentials sind
fragmentiert; Grammarly Authorship ist opt-in und nicht portabel. `[D]/[P]`

**Was heute existiert:** Zertifikate, Badges, Portfolios, Prozess-Tracking.
**Was fehlt:** Tragbare, student-owned Evidenz, die nicht an eine Plattform
gebunden ist und nicht heimlich trackt.

**Warum es niemand besitzt:** Credentials sind ein Plattform-Business;
Portabilität zerstört Lock-in. Für einen Hackathon ist es zudem schwer, in
90 Sekunden zu zeigen.

---

## 4. Die zehn unbesetzten USPs

Die entscheidende Unterscheidung: Ein **Feature-USP** kann in ein bestehendes
Tool eingebaut werden. Ein **Produkt-USP** besitzt einen eigenen Workflow,
einen eigenen Nutzer und ein eigenes Ergebnis. Nur die zweiten sind hier
gemeint.

| # | Von … | … zu | Produkt, das es besitzen könnte | Ebene |
|---:|---|---|---|---|
| 1 | Feedback generieren | **Feedback abschließen** | Loop | Produkt |
| 2 | Gruppe tracken | **Gruppenverständnis zeigen** | GroupProof | Produkt |
| 3 | Recall testen | **Transfer testen** | Transfer | Produkt |
| 4 | Completion zeigen | **Kalibrierung zeigen** | Calibrate | Produkt |
| 5 | Dashboard zeigen | **Drei Entscheidungen geben** | Triage | Produkt |
| 6 | Aufnahme machen | **Consent pro Sprecher** | Consent | Produkt |
| 7 | Accessibility-Modus | **Accessibility als Default** | Access | Produkt |
| 8 | Zertifikat ausstellen | **Evidenz portabel machen** | Proof | Produkt |
| 9 | Content verkaufen | **Offenen Zugang liefern** | Open | Produkt |
| 10 | Antwort geben | **Quelle binden** | Source | Feature |

**Wichtig:** #10 ist bewusst als Feature markiert. „Jede KI-Aussage mit Zitat“
ist wertvoll, aber es ist kein eigenständiges Produkt — es ist ein Prinzip,
das in jedes Produkt gehört. Genau diese Unterscheidung war die Schwäche der
vorherigen Viva-Framing-Idee.

---

## 5. Neue Produktkandidaten

Sechs Konzepte, die aus den Lücken folgen. Jedes ist als eigenständiges
Produkt gedacht, nicht als Layer für ein bestehendes Tool.

### 5.1 Loop — Feedback, das ankommt

**Ein Satz:** Loop ist die erste App, die misst, was nach dem Feedback
passiert.

**Job-to-be-done:** „Ich habe Feedback bekommen. Was soll ich jetzt konkret
ändern — und hat es funktioniert?“

**Nutzer:** Studierende in schreibintensiven Kursen (16–25), Lehrkräfte und
Writing Programs. **Käufer:** Hochschule/Fachbereich, nicht Endnutzer.

**Kernschleife:**
1. Draft + Feedback importieren (Lehrer, Peer oder KI).
2. Feedback wird zu **3–5 Revision Tasks**: Zitat aus dem Draft,
   Erfolgskriterium, Typ (Struktur, Evidenz, Klarheit, Grammatik).
3. Student revidiert im Tool.
4. Loop prüft jede Task gegen den neuen Draft: **erledigt / offen /
   strittig**, mit exaktem Zitat.
5. Bei inhaltlichen Änderungen: „Warum hast du das geändert?“ — eine
   Erklärung, kein Aufsatz.
6. Teacher View: „2 von 3 Tasks erledigt; 5 Studierende hängen an Evidenz;
   3 Erklärungen zeigen Missverständnis.“ Ein Klick: Beispiel senden,
   Mini-Lesson planen, Follow-up stellen.

**USP:** „The first tool that measures what happens after feedback.“
Nicht „besseres Feedback“, sondern **Feedback-Completion**.

**Warum jetzt:**
- 48 % der Schüler revidieren nach KI-Feedback gar nicht (14.236 Schüler,
  655 Klassen). `[P]`
- Nur 9 % der KI-Feedback-Suggestions führen zu Revisionen in einer Studie;
  86 % Uptake bei Grammatik, 32 % bei Bedeutung. `[P]`
- 9,9 h/Woche Grading; 62 % der Lehrkräfte hassen Grading; ein Drittel
  dachte an Ausstieg. `[D]`
- NSS: Feedback ist der schwächste Bereich an vielen Hochschulen. `[POL]`
- KI-Feedback ist oft generisch; Studierende bevorzugen Lehrerfeedback. `[P]`

**90-Sekunden-Demo:**
1. Seed-Draft mit drei Kommentaren (These, Evidenz, Grammatik).
2. Klick auf „Was muss ich tun?“ → drei Tasks mit Zitaten.
3. Juror ändert die These und fügt eine Quelle hinzu.
4. Loop zeigt: „These erledigt (Zitat), Evidenz erledigt (Zitat),
   Grammatik offen (Zitat).“
5. „Warum hast du die These geändert?“ → eine Zeile.
6. Teacher View: „2/3 erledigt; 5 hängen an Evidenz.“
7. Reset/QR. Kein Login, keine Note, keine Detection.

**Build (24h):**
- Next.js + Tailwind, localStorage, keine DB.
- LLM extrahiert Tasks; **exakter Substring-Match** prüft Zitate.
- Diff-Ansicht (einfach: Textvergleich, keine Library nötig).
- Teacher View aggregiert aus Seed + Session.
- `DEMO_MODE=cached` mit vorberechneten Tasks; `live` optional.
- Aufwand: 1 Person 8–10 h; 3 Personen 4–5 h.

**Risiko:** „Erledigt“ ist ein weiches Konstrukt; oberflächliche Edits könnten
als Uptake zählen. **Mitigation:** Erfolgskriterium pro Task, Zitatbindung,
Erklärung bei inhaltlichen Änderungen, Teacher Override, keine Note.

**Bewertung:** Gap 5/5, Evidenz 5/5, 24h 4/5, Demo 5/5, Differenzierung 4/5,
Challenge-Fit 5/5, Risiko niedrig–mittel. **28/30.**

---

### 5.2 GroupProof — Gruppenarbeit, bei der man sieht, wer verstanden hat

**Ein Satz:** GroupProof macht sichtbar, wer in einer Gruppe welchen Teil
verstanden hat — ohne Aktivität zu tracken.

**Job-to-be-done:** „Wir haben als Gruppe abgegeben. Aber kann jeder seinen
Teil erklären?“

**Nutzer:** Studierende in projektbasierten Kursen, Lehrkräfte.
**Käufer:** Hochschule/Fachbereich.

**Kernschleife:**
1. Projekt anlegen, Rollen/Teile zuweisen.
2. Nach jedem Meilenstein: jede Person beantwortet **eine** Frage zu einer
   Entscheidung eines **anderen** Teammitglieds (30 s, Text).
3. GroupProof baut eine **Contribution + Understanding Map**: Wer hat
   welchen Teil erklärt? Wo ist eine Lücke?
4. Teacher View: „2 bereit, 1 braucht Support“ — ein Klick: Check-in,
   Ressource, menschliches Gespräch.
5. Gruppe erhält ein Hand-in-Cover: „Wer kann was erklären“, kein
   Aktivitäts-Score.

**USP:** „Group work, but you can see who understood what.“
Nicht „wer war online“, sondern „wer kann es erklären“.

**Warum jetzt:**
- Free-Riding ist die größte Sorge bei Gruppenarbeit (N=205). `[P]`
- 77,4 % der Online-Studierenden nehmen Social Loafing wahr. `[P]`
- Peer-Assessment ist bias- und gaming-anfällig. `[P]`
- Studierende nutzen WhatsApp/Discord statt LMS-Gruppentools. `[D]/[K]`

**90-Sekunden-Demo:** Drei Personen, ein Free-Rider; ein Meilenstein; eine
Erklärungsfrage; die Map zeigt eine rote Lücke; Teacher View zeigt „1 braucht
Support“; ein Klick sendet eine Ressource. Kein Tracking, keine Kamera.

**Build (24h):** Single-Device-Simulation mit drei Profilen; localStorage;
kein Realtime-Backend nötig. LLM nur für die Frage-Generierung, sonst
Regeln. Aufwand: 1 Person 10–12 h; 3 Personen 5–6 h.

**Risiko:** Fühlt sich wie Surveillance an; Multi-User-Komplexität;
Kollaborationsmarkt crowded. **Mitigation:** „Understanding, not activity“;
opt-in; keine Keystroke-/Zeit-Telemetrie; Fokus auf Erklärung.

**Bewertung:** Gap 5/5, Evidenz 4/5, 24h 3/5, Demo 4/5, Differenzierung 4/5,
Challenge-Fit 4/5, Risiko mittel. **24/30.**

---

### 5.3 Triage — Drei Entscheidungen statt Dashboard

**Ein Satz:** Triage verwandelt eine Klasse voller Abgaben in drei
handelbare Entscheidungen.

**Job-to-be-done:** „Ich habe 30 Arbeiten. Was mache ich morgen konkret?“

**Nutzer:** Lehrkräfte. **Käufer:** Schule/Hochschule.

**Kernschleife:**
1. Abgaben importieren (Seed oder Text).
2. Triage gruppiert in drei Buckets: „braucht Beispiel“, „braucht Übung“,
   „bereit für Extension“.
3. Jede Gruppe hat **eine** Aktion: Beispiel senden, Aufgabe zuweisen,
   Extension öffnen.
4. Lehrkraft kann jede Zuordnung überschreiben; Audit-Log.
5. Kein Ranking, kein „at-risk“-Score.

**USP:** „Not a dashboard. Three decisions.“

**Warum jetzt:**
- 9,9 h/Woche Grading; 62 % nennen Grading als schlechtesten Aspekt. `[D]`
- Dashboards werden nicht adoptiert; 95 Lehrkräfte skeptisch. `[P]`
- Learning Analytics bleibt oft ohne Handlung. `[P]`

**90-Sekunden-Demo:** 30 Seed-Abgaben → drei Buckets → ein Klick → 5
Studierende erhalten ein Beispiel; Teacher sieht, was passiert ist.

**Build (24h):** LLM + Clustering + Seed; einfach. Aufwand: 1 Person 6–8 h.

**Risiko:** KI-Gruppierung intransparent; Lehrervertrauen; weniger
Studenten-Wow. **Mitigation:** Jede Gruppe zeigt die Evidenz (Zitat),
Override, keine Note.

**Bewertung:** Gap 4/5, Evidenz 4/5, 24h 4/5, Demo 4/5, Differenzierung 3/5,
Challenge-Fit 4/5, Risiko mittel. **23/30.**

---

### 5.4 Transfer — Die App, die testet, ob du es anwenden kannst

**Ein Satz:** Transfer testet Verständnis in einem neuen Kontext, nicht
Erinnerung im Lernkontext.

**Job-to-be-done:** „Ich habe das Konzept gelernt. Kann ich es in einer
neuen Situation anwenden?“

**Nutzer:** Studierende in STEM/Professional Courses, Lehrkräfte.

**Kernschleife:**
1. Konzept + Beispiel.
2. Neuer, unbekannter Fall (kein Multiple Choice).
3. Lernender erklärt die Anwendung.
4. KI prüft gegen Rubrik und **zitiert** die Antwort.
5. Bei Lücke: kontrastierender Fall, Retry.
6. Evidenz: „Konzept erkannt, aber nicht auf X angewendet.“

**USP:** „The first app that tests transfer, not recall.“

**Warum jetzt:**
- Transfer passiert nicht automatisch. `[P]`
- Apps testen Recall im gleichen Format. `[K]`
- Retrieval Practice allein reicht für Transfer nicht. `[P]`

**90-Sekunden-Demo:** Ein Konzept, ein neuer Fall, eine Antwort, ein
Evidenz-Satz. Der Juror sieht: „Du hast die Definition erkannt, aber den
Fall nicht gelöst.“

**Build (24h):** LLM + Rubrik + Seed-Fälle; ähnlich zu Loop, aber weniger
UI. Aufwand: 1 Person 8–10 h.

**Risiko:** Abstrakt; Validität schwer zu zeigen; Chatbot-Gefühl.
**Mitigation:** Ein Fach, ein Konzept, ein klarer Fall; Evidenz statt Score.

**Bewertung:** Gap 5/5, Evidenz 4/5, 24h 3/5, Demo 4/5, Differenzierung 4/5,
Challenge-Fit 4/5, Risiko hoch. **24/30.**

---

### 5.5 Calibrate — Die App, die zeigt, was du nicht weißt

**Ein Satz:** Calibrate misst Confidence vs. Correctness und zeigt die Lücke.

**Job-to-be-done:** „Bin ich wirklich ready für die Prüfung?“

**Nutzer:** Exam-Prep-Studierende. **Käufer:** B2C oder Hochschule.

**Kernschleife:**
1. 5 Fragen, vor jeder: Confidence (1–5).
2. Antwort.
3. Kalibrierungskurve: „80 % confident, 40 % correct.“
4. Zwei Themen, die du überschätzt hast.
5. Retest nach 24 h.

**USP:** „The study app that measures confidence, not streaks.“

**Warum jetzt:**
- Überconfidence → Underachievement; prognostizierte Noten bis 30 % zu hoch. `[P]`
- Apps belohnen Completion, nicht Kalibrierung. `[K]`

**90-Sekunden-Demo:** 5 Fragen, Confidence-Slider, Kurve, zwei Themen.
Sehr reliabel, kein LLM nötig.

**Build (24h):** Seed-Fragen + Scoring; 4–6 h. **Risiko:** Kalibrierungs-
Produkte sind emergend/crowded; Feature-Gefahr; schmal.

**Bewertung:** Gap 3/5, Evidenz 5/5, 24h 5/5, Demo 5/5, Differenzierung 2/5,
Challenge-Fit 4/5, Risiko niedrig. **24/30**, aber strategisch schwach.

---

### 5.6 Access — Accessibility als Produkt

**Ein Satz:** Access verwandelt Kursmaterial in eine barrierefreie
Lernversion — nicht als Modus, sondern als Default.

**Job-to-be-done:** „Ich muss diesen Text lesen und verstehen, mit meinem
Screenreader / meiner Dyslexie / meiner ADHD.“

**Nutzer:** Studierende mit Behinderung, Hochschulen. **Käufer:** Hochschule.

**Kernschleife:**
1. PDF/Text importieren.
2. Semantisches HTML, Alt-Text für Abbildungen, Glossar, Chunking.
3. Dyslexie-/ADHD-/Screenreader-Defaults.
4. Verständnischeck mit Evidenz.
5. Export.

**USP:** „Accessibility is the product, not a setting.“

**Warum jetzt:**
- ADA Title II / WCAG 2.1 AA; blinde Studierende berichten von
  unzugänglichen Materialien. `[POL]`
- Bolt-on-Tools sind teuer und komplex (Read&Write, Kurzweil). `[D]`

**Build (24h):** PDF-Parsing ist riskant; Seed-PDF + LLM-Alt-Text möglich.
Aufwand: 1 Person 10–12 h. **Risiko:** PDF-Qualität; Accessibility ist
schwer zu demonstrieren; Markt crowded.

**Bewertung:** Gap 5/5, Evidenz 4/5, 24h 2/5, Demo 3/5, Differenzierung 2/5,
Challenge-Fit 4/5, Risiko hoch. **20/30.**

---

### 5.7 Scoring-Übersicht

| Konzept | Gap | Evidenz | 24h | Demo | Differenzierung | Challenge | Risiko | Gesamt |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| **Loop** | 5 | 5 | 4 | 5 | 4 | 5 | niedrig–mittel | **28** |
| GroupProof | 5 | 4 | 3 | 4 | 4 | 4 | mittel | 24 |
| Transfer | 5 | 4 | 3 | 4 | 4 | 4 | hoch | 24 |
| Calibrate | 3 | 5 | 5 | 5 | 2 | 4 | niedrig | 24 |
| Triage | 4 | 4 | 4 | 4 | 3 | 4 | mittel | 23 |
| Access | 5 | 4 | 2 | 3 | 2 | 4 | hoch | 20 |

**Lesart:** Loop gewinnt nicht, weil es das größte Problem der Menschheit
löst, sondern weil es die beste Kombination aus **belegter Lücke, 90-Sekunden-
Demo und 24h-Baubarkeit** ist.

---

## 6. Empfehlung

### 6.1 Loop — bauen

**Warum:**
- Die Lücke ist quantitativ belegt: 48 % Nicht-Revision, 9 % Suggestion-
  Uptake, 32 % Meaning-Uptake.
- Der Schmerz ist auf beiden Seiten: Studierende wissen nicht, was zu tun
  ist; Lehrkräfte sehen nicht, ob ihr Feedback wirkt.
- Die Demo ist in 90 Sekunden verständlich: Draft → Kommentar → Task →
  Revision → „erledigt / offen“ → Teacher View.
- Das Produkt ist **kein Feature für ein KI-Tool**: Es beginnt nach dem
  Feedback und besitzt den Revisions-Workflow. Es kann Lehrer-, Peer- oder
  KI-Feedback verarbeiten — das macht es unabhängig.
- Challenge-Fit: #1 (Prüfungen/Assessment) und #6 (kritischer
  Lernbegleiter), ohne Detection oder Note.

**Die drei härtesten Einwände:**
1. **„Das ist ein Feature für Grammarly/Turnitin.“** → Nein: Die Tools
   generieren Feedback; Loop besitzt die **Umsetzung**. Der Buyer ist der
   Writing Program, nicht OpenAI. Der Erfolgsmoment ist die Revision, nicht
   der Kommentar.
2. **„Studierende wollen nicht revidieren.“** → Genau deshalb ist die
   Lücke groß. Loop senkt die Hürde auf drei Tasks und zeigt Fortschritt;
   es bestraft nicht, es führt.
3. **„Erledigt ist subjektiv.“** → Jede Task hat ein Erfolgskriterium und
   ein Zitat; bei inhaltlichen Änderungen wird eine Erklärung verlangt;
   die Lehrkraft kann überschreiben.

### 6.2 GroupProof — Fallback

Wenn das Team kein schreibspezifisches Produkt will oder ein stärkeres
Social-Learning-Framing braucht: GroupProof. Es ist eigenständiger als Loop,
aber Multi-User und 90-Sekunden-Demo sind schwerer. Die Evidenz ist stark,
der Markt aber crowded mit Projektmanagement.

### 6.3 Triage — dritte Option

Wenn die Jury stärker Lehrerperspektive sehen will: Triage. Sehr baubar,
klarer B2B-Nutzen, aber weniger studentischer Wow und Nähe zu LMS-Analytics.

### 6.4 Nicht bauen

- **Consent-first Capture:** Audio/Diarization/Consent in 24h zu riskant.
- **Proof / Credential Wallet:** Markt crowded, Demo schwach, vorherige
  SkillPass-Nähe.
- **Open / Free Learning:** Kein Geschäftsmodell, kein Demo-Moment.
- **Offline-First:** Feature, kein Produkt.
- **Source Checker:** Wichtiges Feature, aber kein eigenständiges Produkt.

---

## 7. Wenn Loop: 24h-Bauplan

### 7.1 Screens

| Route | Inhalt | Demo-kritisch |
|---|---|---|
| `/` | Seed-Draft, „Loop starten“, Reset, QR | Ja |
| `/student` | Draft, 3 Feedback-Tasks, Editor, „Prüfen“ | Ja |
| `/student/check` | Uptake: erledigt/offen/strittig, Zitate, „Warum?“ | Ja |
| `/teacher` | Klasse: 3 Buckets, 5 Studierende, eine Aktion | Ja |
| `/reset` | Session löschen, zurück | Ja |

### 7.2 Datenmodell

```ts
type FeedbackItem = {
  id: string;
  quote: string;          // exakter Text aus dem Draft
  comment: string;        // Original-Feedback
  dimension: "structure" | "evidence" | "clarity" | "grammar";
  successCriterion: string;
};

type RevisionTask = FeedbackItem & {
  status: "open" | "addressed" | "contested";
  newQuote?: string;      // exakter Text aus dem Revision
  explanation?: string;
};

type Session = {
  id: string;
  draft: string;
  revision: string;
  tasks: RevisionTask[];
  createdAt: number;
};
```

### 7.3 Pipeline

1. **Task-Extraktion:** LLM bekommt Draft + Kommentare, gibt JSON mit
   `quote`, `comment`, `dimension`, `successCriterion` zurück.
2. **Quote-Verifier:** `draft.includes(quote)` — exakter Substring, sonst
   Task verwerfen und „nicht genug Evidenz“ anzeigen.
3. **Uptake-Check:** Für jede Task prüfen, ob der neue Draft das Kriterium
   erfüllt. Zwei Wege: (a) exakter neuer Quote, (b) LLM-Judge mit
   `newQuote`-Pflicht. Wenn kein Zitat: `contested`.
4. **Erklärung:** Bei `addressed` und inhaltlicher Dimension eine Frage:
   „Was hast du geändert und warum?“ (max. 280 Zeichen).
5. **Teacher Aggregation:** Tasks nach Dimension gruppieren; Anzahl
   `addressed/open/contested`; Erklärungen anzeigen; eine Aktion pro
   Bucket.

### 7.4 Fallback

- `DEMO_MODE=cached`: Drei Seed-Sessions mit vorberechneten Tasks und
  Uptake-Ergebnissen. Kein API-Call nötig.
- `DEMO_MODE=live`: LLM + Verifier; bei Timeout (25 s) auf cached
  zurückfallen.
- Reset-Button löscht `localStorage`.
- Kein Login, keine DB, keine Analytics.

### 7.5 Zeitplan ab 11:50

| Zeit | Ziel | Owner |
|---|---|---|
| 11:50–12:30 | Next.js-Scaffold, Deploy, Seed-Draft, Routen | 1 Dev |
| 12:30–14:00 | Task-Extraktion + Quote-Verifier + Student-UI | 2 Devs |
| 14:00–15:30 | Revision-Editor + Uptake-Check | 2 Devs |
| 15:30–17:00 | Teacher View + Aggregation | 1 Dev + 1 Designer |
| 17:00–18:00 | Cached Fallback + Reset + Mobile | 1 Dev |
| 18:00–19:00 | 90-s-Demo bauen, testen, QR | Team |
| 19:00–20:30 | Pitch-Coaching, Red-Team | Pitch-Lead |
| 20:30–22:00 | Fixes, Accessibility, zweiter Seed | Team |
| So 09:30 | Feature Freeze | alle |

### 7.6 Definition of Done

- Öffentliche URL, kein Login, QR scanbar.
- Ein vollständiger Loop: Draft → 3 Tasks → Revision → Uptake → Teacher.
- Quote-Verifier blockiert ein erfundenes Zitat sichtbar.
- „Warum?“-Erklärung wird gespeichert und im Teacher View angezeigt.
- Reset funktioniert; cached Fallback funktioniert bei API-Ausfall.
- 375 px ohne Horizontal-Scroll; Keyboard + Screenreader getestet.
- Keine Note, kein Score, kein Rank, keine Detection, kein Audio.

### 7.7 90-Sekunden-Demo

| Zeit | Aktion | Satz |
|---:|---|---|
| 0:00 | Hook | „Lehrkräfte geben mehr Feedback als je zuvor. Die Hälfte davon ändert nichts.“ |
| 0:10 | Draft + 3 Kommentare | „Drei Kommentare. Welche davon werden zu einer Änderung?“ |
| 0:20 | „Was muss ich tun?“ | „Loop macht daraus drei Tasks — mit Zitat und Kriterium.“ |
| 0:30 | These ändern, Quelle hinzufügen | „Der Juror revidiert.“ |
| 0:40 | „Prüfen“ | „These erledigt. Evidenz erledigt. Grammatik offen.“ |
| 0:50 | „Warum?“ | „Eine Erklärung, kein Aufsatz.“ |
| 1:00 | Teacher View | „2 von 3 erledigt. Fünf hängen an Evidenz.“ |
| 1:10 | Aktion | „Ein Klick: Beispiel senden.“ |
| 1:20 | Reset/QR | „Kein Login. Keine Note. Keine Detection.“ |
| 1:30 | Close | „Feedback ist kein Kommentar. Feedback ist eine Änderung.“ |

---

## 8. Was nicht bauen

| Anti-Pattern | Warum nicht |
|---|---|
| AI-Detector | False-Positive-Risiko; Markt unter Druck; ethisch falsch |
| Proctoring | Surveillance; Geräteausschluss; kein Lernwert |
| Generischer KI-Tutor | Commodity; Sycophancy; Khanmigo-Evidenz |
| Flashcard-App | Quizlet/Anki-Markt gesättigt; UI-Kampf |
| Weiteres Dashboard | Dashboards werden nicht adoptiert |
| KI-Notetaker | Consent/BIPA; Audio-Risiko |
| Credential-Wallet | Markt crowded; Demo schwach |
| Gruppenchat | WhatsApp/Discord gewinnen; kein Lernwert |
| „KI schreibt Essay“ | Answer-first; Kopieren; kein Verständnis |
| Paywall | Vertrauensverlust; 48/100 Produkte scheitern daran |

---

## 9. Offene Unsicherheiten

1. **Uptake-Konstrukt:** „Erledigt“ ist nicht dasselbe wie „verstanden“.
   Die Erklärung hilft, ersetzt aber keine Validierung.
2. **Revisionsbereitschaft:** 48 % Nicht-Revision ist ein Motivationsproblem;
   Loop senkt die Hürde, aber garantiert keine Revision.
3. **Lehreradoption:** Writing Programs sind konservativ; der Buyer-Zyklus
   ist lang. Für den Hackathon irrelevant, für ein Produkt zentral.
4. **Fachbindung:** Loop ist schreibspezifisch. Das ist ein Vorteil für die
   Demo, ein Nachteil für die Marktgröße.
5. **Deutscher Markt:** Die Evidenz ist überwiegend englischsprachig;
   Übertragbarkeit auf deutsche Hochschulen ist plausibel, aber ungeprüft.
6. **Integration:** Loop kann mit Lehrer-, Peer- oder KI-Feedback arbeiten;
   die Import-Formate sind noch nicht validiert.
7. **GroupProof-Multi-User:** Die Demo ist simulierbar, das echte Produkt
   braucht Realtime und Identität.
8. **Transfer-Validität:** Ein 90-Sekunden-Fall ist kein Transferbeweis.
9. **Calibration-Markt:** Emergend, aber Differenzierung schwach.
10. **Accessibility:** PDF-Parsing und Alt-Text-Qualität sind ungelöst.

---

## 10. Quellen (Auswahl)

### Feedback Uptake

- Jansen, T., Horbach, A., & Meyer, J. (2025). Feedback from Generative AI:
  Correlates of Student Engagement in Text Revision from 655 Classes from
  Primary and Secondary School. LAK 2025.
  https://dl.acm.org/doi/10.1145/3706468.3706494 `[P]`
- Helm, G. (2026). Stop perfecting the feedback, start supporting the uptake.
  Frontiers in Education.
  https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1737037/full `[P]`
- Yu, H., & Xie, Q. (2025). Generative AI vs. Teachers: Feedback Quality,
  Feedback Uptake, and Revision. Language Teaching Research Quarterly.
  https://www.researchgate.net/publication/391437325 `[P]`
- University students’ engagement with generative AI-supported automated
  writing evaluation feedback. ScienceDirect, 2025.
  https://www.sciencedirect.com/science/article/pii/S1060374325000281 `[P]`
- Democratizing Writing Support with AI. AAAI 2026.
  https://ojs.aaai.org/index.php/AAAI/article/download/41167/45128 `[P]`
- National Student Survey 2025 results. Office for Students.
  https://www.officeforstudents.org.uk/data-and-analysis/national-student-survey-data/nss-data-archive/nss-2025-results `[POL]/[D]`

### Lehrer-Workload und Dashboards

- Learnosity/Perspectus Global (2025). US Teachers Overwhelmed by Grading.
  https://learnosity.com/resources/edtech-blog/a-third-of-us-teachers-considered-leaving-education-in-last-12-months-due-to-grading-workload `[D]`
- DfE (2019/2025), zitiert in: ‘They want You to Read Their Work’.
  Technology, Knowledge and Learning, 2025.
  https://link.springer.com/article/10.1007/s10758-025-09903-0 `[P]/[POL]`
- Making Sense of Learning Analytics Dashboards: 95 Teachers.
  IRRODL, 2018. https://eric.ed.gov/?id=EJ1198041 `[P]`
- Primary School Teacher Perspectives on Effective Dashboard Use.
  Journal of Learning Analytics, 2025. https://eric.ed.gov/?id=EJ1483349 `[P]`
- K-12 Teachers’ Acceptance and Resistance Perceptions of Learning Analytics.
  TechTrends, 2025. https://link.springer.com/article/10.1007/s11528-025-01045-5 `[P]`

### Gruppenarbeit

- Hall, D., & Buzwell, S. (2013). The problem of free-riding in group
  projects. Active Learning in Higher Education.
  https://journals.sagepub.com/doi/10.1177/1469787412467123 `[P]`
- Social Loafing in Online Learning Groups. IRRODL, 2008.
  https://files.eric.ed.gov/fulltext/EJ801085.pdf `[P]`
- Gabelica, C., De Maeyer, S., & Schippers, M. (2022). Taking a Free Ride.
  Journal of Educational Psychology.
  https://www.ovid.com/journals/jedup/fulltext/10.1037/edu0000713 `[P]`
- Student perceptions of collaborative group work in higher education.
  Studies in Higher Education, 2023.
  https://www.tandfonline.com/doi/full/10.1080/03075079.2023.2227677 `[P]`
- What’s up with WhatsApp? A review of its role in students groups.
  ResearchGate, 2014. `[D]/[K]`
- Learning Through Online Participation: From Breakout Rooms to Discord.
  Clemson, 2025. https://open.clemson.edu/cgi/viewcontent.cgi?article=4945 `[P]`

### Kalibrierung und Transfer

- Dunlosky, J., & Rawson, K. A. (2012). Overconfidence produces
  underachievement. Learning and Individual Differences.
  https://www.sciencedirect.com/science/article/pii/S0959475211000685 `[P]`
- Quizzes Improve Learning and Reduce Overconfidence. JOSTL, 2021.
  https://files.eric.ed.gov/fulltext/EJ1303358.pdf `[P]`
- Calibration Discrepancy Predicts Metacognitive Strategy Use. IJAIED, 2025.
  https://link.springer.com/article/10.1007/s40593-025-00514-5 `[P]`
- Transfer of Learning and Teaching: A Review. IAFOR Journal of Education,
  2019. https://files.eric.ed.gov/fulltext/EJ1217940.pdf `[P]`
- Perkins, D. N., & Salomon, G. (2012). Knowledge to Go. `[P]`
- Retrieval Practice and Transfer of Learning. RetrievalPractice.org, 2020.
  https://pdf.retrievalpractice.org/TransferGuide.pdf `[P]`

### Markt/Reviews/Preise

- Top-100-Review-Mining, 24.10.2026.
  `research/raw/top100-learning-apps-review-mining-2026-10-24.md` `[D]`
- Duolingo Paywall-Analyse (13.850 Reviews; 502.269 Reviews). `[D]`
- Quizlet/Kahoot/Coursera/simpleclub Reviews. `[D]`
- Pearson MyLab Access Codes; Top Hat; Cengage. `[D]/[V]`
- Chegg Traffic −59,4 %; FTC-Settlement 7,5 Mio. $. `[D]/[POL]`

### Detection/Proctoring/Consent/Accessibility

- Turnitin Sentence-Level-FPR ~4 % (2023); EULA-Pause bis Sept 2027. `[D]/[POL]`
- GPTZero Vendor-FPR 0,09 % vs. 8,4 %/23,7 % im 300-Text-Test. `[D]`
- Southampton £87.621; Newcastle/Westminster Ausstiege. `[POL]`
- Honorlock/Proctorio/Respondus: Room-Scan, Gerätelimits, Admin-Rechte. `[D]`
- Otter.ai/Fireflies.ai: BIPA-/Wiretap-Klagen. `[D]/[POL]`
- NPR (April 2026): blinde Studierende, unzugängliche Kursmaterialien. `[POL]`
- ADA Title II / WCAG 2.1 AA; Deadlines 2027/2028. `[POL]`

---

## 11. Nächster Schritt

Wenn Loop gebaut wird: **12:30 Deploy**, **14:00 Task-Extraktion**,
**15:30 Uptake-Check**, **17:00 Teacher View**, **18:00 Demo**.
Wenn nicht: GroupProof als Fallback, aber mit derselben Regel —
**erst die Lücke, dann das Feature, dann die Demo.**

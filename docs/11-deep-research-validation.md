# Deep Research: wissenschaftliche Validierung des Voice-Agent-Plans

Stand: 24.10.2026. Dieses Dokument ist die gemeinsame Evidenzbasis für
`docs/07`–`docs/10`. Es validiert die Architektur, markiert Überzeugungen, die
die Forschung nicht trägt, und leitet daraus überprüfbare Grenzen ab.

**Methode.** Kuratierte Literatur- und Dokumentationsrecherche (Klassroom
Discourse, Formative Assessment, HCI/Turn-Taking, Question Generation,
Fact-Checking, Gemini- und ElevenLabs-Dokumentation) plus eigene
API- und End-to-End-Tests mit `gemini-3.1-flash-lite` (minimales Reasoning).
Evidenzgrade: **stark** = mehrere unabhängige Studien/Meta-Analysen;
**moderat** = konsistente, aber kontextgebundene Befunde; **schwach** =
plausibel, aber nicht direkt für diesen Fall geprüft; **umstritten** =
gemischte Befunde.

## 0. Kurzfazit

Die geplante Richtung ist tragfähig: ein LLM schreibt den exakten Sprechtext,
eine TTS spricht ihn, Fragen werden plan-first erzeugt, quellengebundene
Urteile bleiben beim bestehenden Fact-Check, und die erste Frage startet vor
dem finalen Fact-Check. Drei Annahmen sind aber zu stark:

1. **„Alle 20–30 s inkrementell analysieren“** ist eine Engineering-Kadenz,
   kein validiertes Verfahren. Partielle ASR ist deutlich fehleranfälliger als
   finalisierte Sätze. Die Analyse muss **ereignisgetrieben auf finalisierten
   Segmenten** laufen; 20–30 s bleiben nur ein Fallback-Takt.
2. **„Autoritativer Fact-Check“** ist nicht haltbar. Realweltliche
   Claim-Verifikation liegt in Benchmarks bei etwa 57–63 %, Zitatbelege sind
   oft nur teilweise stützend, und LLM-Richter haben bekannte Bias. Der Code
   kann die **wörtliche Übereinstimmung** eines Zitats prüfen, nicht die
   Wahrheit der Aussage. Die UI muss „in den Quellen nicht gefunden“ von
   „widerspricht“ trennen und darf kein Live-Urteil zeigen.
3. **Feste Fragezahlen sind keine Pädagogik.** 3–5 Fragen, ein Follow-up und
   10 Minuten sind **Sicherheitsgrenzen** für die Demo, keine empirisch
   optimale Dosis. Sie müssen mit adaptivem Stop kombiniert werden. Im aktuellen
   Code gelten stattdessen serverseitig 5 Startfragen (Default 3), 3 Follow-ups,
   6 Turns und TTL 600 s; die folgenden Zahlen bleiben Research-Orientierung,
   keine Aussage über die implementierte Voice-Steuerung.

## 1. Entscheidungs-Audit

| Entscheidung | Evidenz | Hauptrisiko | Korrektur |
|---|---|---|---|
| Streaming-ASR + inkrementeller Zustand statt wachsendem Chat | **moderat** für strukturierten Zustand, **schwach** für festen Takt | Partielle ASR ist unzuverlässig; Fehler wandern in Claims und Fragen | Nur finalisierte Segmente übernehmen; Zustand versionieren; gegen finales Transkript re-grounden |
| Plan-first Question Generation (PFQS) | **moderat** für Fragenqualität, **schwach** für Lerngewinn | Ein einziger „Erwartungsantwort“-Plan bestraft gültige Alternativen | Mehrere akzeptable Antwortpunkte, Evidenz-IDs, Must-not-ask-Liste; jede Frage gegen Quelle validieren |
| Lane B startet sofort, Lane A nach Fact-Check | **moderat** | Frühe Fragen können auf misheard content beruhen | Lane B nur aus hochsicheren Segmenten; keine Widerspruchsfrage ohne verifiziertes Zitat |
| Hybrid-Fact-Check: live Kandidaten, final autoritativ | **moderat–stark** für hybrid, **stark** gegen Live-Urteile | Nutzer übervertrauen einem falschen Urteil | Final nur drei Ausgänge mit Zitat + Quelle; „nicht gefunden“ ≠ „falsch“; keine Live-Urteile |
| Vorgerenderte TTS für bekannte Fragen/Filler | **schwach–moderat** | Canned-Prosodie, Stale Cache, Voice-Mismatch | Nur feste Texte; gleiche Stimme; Cache-Key aus Text+Voice+Version; First-Audio-Latenz messen |
| Halbduplex (Mikro stumm während TTS) | **moderat**, dass Barge-in natürlicher wirkt; **schwach** zu Cognitive Load | Nutzer kann nicht unterbrechen; Walkie-Talkie-Gefühl | Sichtbarer Listening/Speaking-State; Stop-Taste; kurze Agent-Turns; Barge-in vor Naturalness-Urteil testen |
| Harte Grenzen 5 Fragen / 20 min / 2 Follow-ups (Research-Empfehlung; Code: 5/3/6/600 s) | **schwach/umstritten** | Schneidet Retrieval-Practice ab; Timeout bestraft Nachdenken | Als Safety-Rails behalten, adaptiven Stop ergänzen, Truncation-Grund loggen |
| Sofort kurzes Feedback, Details im Review | **umstritten** für Timing, **moderat** für Feedbackqualität | Vorschnelles Urteil bei Teilantworten/ASR-Fehlern | Nur nach Antwortende; „enthalten/fehlt“, kein Score; bei ASR-Unsicherheit nachfragen |

## 2. Wie Lehrkräfte tatsächlich fragen

Die folgenden Regeln sind aus Classroom-Discourse- und Tutoring-Forschung
abgeleitet. Die Übertragung auf einen Voice-Agent ist eine Inferenz und muss
im Pilotversuch geprüft werden.

1. **3–5 s warten, bei „warum/wie“ eher 5–10 s.** Lehrkräfte warten im
   Durchschnitt oft unter 1 s; längere Wartezeit verändert Redebeteiligung und
   Antwortlänge. *Stark für Diskurs, moderat für Leistung.* Rowe (1974);
   Tobin (1987).
2. **Nach der Antwort 2–3 s nachwarten, bevor bewertet wird.** Ein „Mhm“ oder
   eine kurze Paraphrase signalisiert Zuhören und lädt zur Präzisierung ein.
   *Stark.* Rowe (1974); Tobin (1986).
3. **IRE zu IRF machen: nicht nur bewerten, sondern anknüpfen.** „Wenn ich
   Sie richtig verstehe: … Habe ich das richtig?“ *Moderat.* Nystrand et al.
   (1997); O’Connor & Michaels (1993).
4. **Aufgaben- und Prozessfeedback, kein Personenlob.** „Sie haben die Zahl
   mit der Quelle verknüpft; prüfen Sie jetzt den Gegenpunkt.“ *Stark für
   Feedback, moderat für Umsetzung.* Hattie & Timperley (2007); Wisniewski et
   al. (2020).
5. **Bei falscher Antwort: klären, Hinweis, dann ggf. korrigieren.** Nicht
   „falsch“; erst „Welche Annahme steckt dahinter?“, dann ein inhaltlicher
   Hinweis, dann ein neuer Versuch. *Moderat.* Lyster & Ranta (1997);
   Lyster & Saito (2010).
6. **Bei Teilantwort: einmal nachfassen, dann fokussieren.** „Was fehlt noch?“
   → „Sie haben X genannt; wie hängt das mit Y zusammen?“ → ein Hinweis →
   Retry. *Moderat.* Graesser et al. (1995); van de Pol et al. (2010).
7. **„Ich weiß es nicht“ ist Information, kein Versagen.** 3 s warten, dann
   „Was wissen Sie sicher?“; danach Hinweis oder später zurückkommen.
   *Schwach/moderat.* Rowe (1974); Graesser et al. (1995).
8. **Schwierigkeit eine Stufe über der aktuellen Antwort.** Anker → Erklären →
   Begründen → Transfer/Gegenposition. *Moderat für höhere Fragen, schwach
   für eine starre Leiter.* Redfield & Rousseau (1981); Biggs & Collis (1982).
9. **Fokussieren statt trichtern.** Keine Ja/Nein-Kette, die zur eigenen
   Antwort führt. „Was meinen Sie mit …?“, „Wie sind Sie darauf gekommen?“
   *Moderat.* Herbel-Eisenmann & Breyfogle (2005); Nystrand et al. (1997).
10. **Accountable Talk: „Woher wissen Sie das?“** „Welche Stelle stützt das?“
    „Das kann ich nicht belegen“ ist eine gültige Antwort. *Moderat.*
    Michaels et al. (2008).
11. **Kurze Agent-Turns, ein Ziel pro Turn.** Eine Frage, 10–20 s, 1–2 Sätze
    Uptake. *Schwach/normativ*, aber praktisch für Voice.
12. **Sparsam backchanneln, alle 2–3 Turns paraphrasieren.** „Mhm.“ „Okay.“
    „Verstehe.“ *Schwach/moderat.* Gardner (2001).
13. **Wärme ohne Hype.** Name einmal, ruhiger Ton, keine Übertreibung.
    *Moderat für Affekt, schwach für Kognition.* Witt et al. (2004).
14. **In 60–90 s schließen.** 2–3 Punkte, eine Stärke, ein nächster Schritt,
    Lernzielbezug, explizites Ende. *Schwach/moderat.* Hattie & Timperley
    (2007); Black & Wiliam (1998).

**Deutsch-spezifisch.** Der fragend-entwickelnde Unterricht ist IRF-dominiert;
untrainierte Lehrkräfte fragen oft 7–10-mal pro Minute mit ~0,5 s Wartezeit,
trainierte 2–3-mal pro Minute (Reiss 1983). In deutschen Mathematikstunden
liegt die mittlere Wartezeit bei ~2,5 s, 75 % der Fragen bekommen <3 s
(Heinze & Erhard 2006). Das ist eine Beschreibung des Ist-Zustands, keine
Empfehlung. Kognitiv aktivierende Fragen brauchen eher 10–15 s
(Wackermann et al. 2017).

**Vermeiden:** Rapid-Fire, mehrteilige Fragen, jede Pause füllen, „super“
nach jeder Antwort, Personenlob, „falsch“, jede Formulierung korrigieren,
Funnel-Fragen, nach „weiß nicht“ sofort weitergehen, überparaphrasieren,
ohne Zusammenfassung abbrechen, „letzte Frage“-Schleifen.

**Folklore, die nicht als Beweis taugt:** exakt 3–5 s als Naturgesetz;
„nie sofort korrigieren“; 70/30-Lehrerrede als Optimum; Bloom-Leiter als
Entwicklungsstufe; „Lob motiviert immer“; Formative Assessment mit festem
d=0,4–0,7; „no opt out“ als evidenzbasierte Routine; Wartezeit-Forschung
direkt auf Voice-Agent übertragen.

## 3. Harte Grenzen für die Demo

Die Zahlen sind konservative Übersetzungen der Evidenz, keine gemessenen
Optima. Sie verhindern Endlosschleifen und Überforderung. **Abweichung im
Code:** Der getippte Pfad nutzt 5 Startfragen (Default 3), 3 Follow-ups,
6 Turns und TTL 600 s; die Tabelle beschreibt weiterhin die
Research-Empfehlung, nicht die aktuelle Serverkonfiguration.

| Grenze | Wert | Begründung |
|---|---|---|
| Gesprächsziel | 8–10 min | Kurzeformative Einheit; MMI nutzt 10-min-Stationen |
| Hard Stop | 10 min, absolut 12 min inkl. Verabschiedung | Abbruch ist besser als Endlosschleife |
| Hauptfragen | 3–5, Default 4 | Kognitive Last, Respondent Burden |
| Follow-ups | Research-Empfehlung 1 pro Frage, max. 2 bei klarem Widerspruch; implementiert max. 3 pro Runde | Working Memory ~4 Chunks; ein ungelöster Punkt |
| Answer-Endpointing | 1,5–2 s Stille | Natürlicher Turn-Wechsel |
| Pädagogische Wartezeit | 3–5 s nach der Frage | Rowe/Tobin |
| Answer-Timeout | 10 s, dann Hinweis oder weiter | Kein stilles Warten |
| Agent-Turns | ≤15 | Greeting + Fragen + Follow-ups + Feedback + Close |
| Silence-Regel | 3 s: eine neutrale Nachfrage; 8–10 s: Hinweis oder weiter; 2 Timeouts in Folge: früh schließen | Verhindert Loop |
| Neues Thema | keins nach Minute 8 | Zeit für Zusammenfassung |
| Abschluss | letzte 90 s | 2–3 Take-aways, ein nächster Schritt |

**Adaptiver Stop statt nur Zählen:** vorzeitig beenden, wenn (a) alle
Erwartungspunkte abgedeckt sind, (b) keine neue Evidenz mehr entsteht, (c) die
lernende Person Ermüdung signalisiert oder (d) zwei Timeouts in Folge. Der
Abbruchgrund wird geloggt, nicht als Note interpretiert.

**Abschlussbeispiel:**
„Damit sind wir für heute fertig – danke, dass Sie sich die Zeit genommen
haben. Ich habe drei Punkte notiert, die Sie sich noch einmal ansehen können;
die Zusammenfassung steht gleich für Sie bereit. Wenn Sie möchten, machen wir
beim nächsten Mal genau dort weiter.“

## 4. Sofortfeedback oder erst im Review?

**Entscheidung: zweistufig.** Der Agent prüft die Antwort direkt, sagt aber
nur kurz und aufgabenbezogen, was abgedeckt ist und was fehlt. Die
vollständige Evidenz, Zitate und Alternativen erscheinen erst im finalen
Review.

- **Im Gespräch:** „Das deckt den Kern; der Beleg für X fehlt noch.“ Kein
  „richtig/falsch“, keine Punktzahl, kein Urteil über die Person.
- **Bei falscher Antwort:** erst klären („Welche Annahme steckt dahinter?“),
  dann ein Hinweis, dann ein Retry. Bleibt es falsch: „Kommen wir später
  darauf zurück“ und im Review eine explizite Korrektur mit Quelle.
- **Bei Teilantwort:** einmal nachfassen, dann weiter. Nicht jede Lücke
  sofort ausdiskutieren.
- **Bei ASR-Unsicherheit:** nachfragen („Ich habe verstanden …; stimmt das?“),
  nicht bewerten. Sonst wird ein Transkriptionsfehler zur falschen Note.
- **Im Review:** Aussage, Quelle/Seite/Folie, wörtliches Zitat, Urteil
  `stützt` / `widerspricht` / `nicht gefunden`, optional eine Alternative.
  Keine Punkte, keine Note, keine Personeneigenschaft.

**Warum nicht nur final?** Retrieval Practice und Feedback-Forschung sprechen
für zeitnahe, qualitativ gute Rückmeldung; reines Endfeedback verpasst den
Moment. **Warum nicht nur sofort?** Die Evidenz für Feedback-Timing ist
gemischt (mittlere Effekte nahe null); ein vorschnelles Urteil bei
Teilantworten oder ASR-Fehlern ist riskanter als ein kurzes „das fehlt noch“.
Der Agent beantwortet seine eigene Frage nicht; er prüft die Antwort der
lernenden Person gegen die Quellen.

## 5. Gemini: Modelle, Reasoning, API

Offizielle Dokumentation, Stand 24.10.2026. Die Angaben sind Modell- und
Preisstände; vor dem Finale erneut prüfen.

| Modell | Status | Thinking | Kontext/Ausgabe | Einsatz |
|---|---|---|---|---|
| `gemini-3.1-flash-lite` | stabil, frühester Shutdown 07.05.2027 | `minimal`/`low`/`medium`/`high`; Default minimal | 1.048.576 / 65.536 | Tests, Live-Lane, kostengünstige Fragen |
| `gemini-3.5-flash-lite` | stabil, Jul 2026 | `minimal`/`low`/`medium`/`high`; Default minimal | 1.048.576 / 65.536 | neuere Lite-Alternative |
| `gemini-3.8-flash` | stabil, Sep 2026 | `low`/`medium`/`high`; **kein `minimal`** | 1.048.576 / 65.536 | finaler Fact-Check, Qualität |
| `gemini-3.1-pro-preview` | Preview | `low`/`medium`/`high`; kein `minimal` | 1.048.576 / 65.536 | optional final; Preview-Risiko |
| `gemini-2.5-flash-lite` | stabil, Zugang eingeschränkt | `thinkingBudget` 0–24.576 | 1.048.576 / 65.536 | nicht neu verwenden; im Projekt 404 |

**Getestet mit dem Projekt-Key:**

- Native API, `gemini-3.1-flash-lite`, `thinkingLevel=minimal`,
  `responseJsonSchema`: **1,39 s**, valides JSON.
- OpenAI-kompatibler Endpoint, `gemini-3.1-flash-lite`,
  `response_format={"type":"json_object"}`: **1,49 s**, valides JSON.
- Backend-Adapter (`LLM_BASE_URL=…/v1beta/openai`): **0,71 s**, `pong`.
- End-to-End mit synthetischem Coaching: Fact-Check **3,4 s**, Fragen
  **2,1 s**, Antwortprüfung **1,7 s**; alle drei Urteile korrekt.
- `gemini-3.5-flash-lite` mit `minimal`: **1,21 s**, valides JSON.
- `gemini-3.8-flash` (ohne `minimal`): **2,15 s**, valides JSON.
- **Strikter Review-Writer:** Mit `gemini-3.1-flash-lite` scheiterte der
  `--llm`-Smoke an der Verifikationsgrenze (`E_REVIEW_VERIFICATION`, >20 %
  Fallback); die geprüfte Template-Review blieb verfügbar. Das ist der
  vorgesehene sichere Fallback, kein stiller Fehler. Für den finalen Writer
  `gemini-3.8-flash` einplanen.
- `gemini-2.5-flash-lite`: **404**; nicht verwenden.

**Konfiguration für schwache Tests:**
`LLM_MODEL=gemini-3.1-flash-lite`, `LLM_JSON_MODE=true`,
`LLM_TEMPERATURE` leer, `LLM_TIMEOUT_S=45`, `LLM_CONCURRENCY=4`.
Für den finalen Lauf `gemini-3.8-flash` mit `thinkingLevel=high` (nativ) bzw.
ohne `minimal`; für die Live-Lane `gemini-3.1-flash-lite` oder
`gemini-3.5-flash-lite` mit `minimal`.

**API-Fallen:** `minimal` heißt „wenig bis kein Reasoning“, nicht garantiert
„aus“. `response_format=json_object` ist im OpenAI-kompatiblen Endpoint nicht
offiziell dokumentiert, funktioniert im Test aber; für Garantien natives
`responseJsonSchema` nutzen. `maxOutputTokens` umfasst Thinking-Tokens.
`gemini-3.8-flash` und `gemini-3.1-pro-preview` akzeptieren kein `minimal`.
Kontext-Caching ist implizit ab 4.096 Tokens (3.8/3.1 Pro) bzw. 2.048
(2.5 Flash); Thinking-Tokens werden als Output berechnet. Die Dokumentation
nennt keine RPM/TPM-Zahlen; für 6–8 parallele Judge-Calls ist TPM der
wahrscheinliche Engpass, daher Concurrency 4–6 und 429-Backoff.

**Datenschutz:** Die Gemini Developer API hat kein EU-Region-Pinning; Daten
können transient in anderen Regionen gespeichert werden. Paid Services werden
nicht zum Training genutzt; Unpaid-Inhalte können von Menschen geprüft werden.
Für die Jury nur synthetische Daten senden oder Vertex AI mit EU-Region
verwenden. Das ist eine bewusste Abkehr von der früheren Local-only-Zusage.

## 6. ElevenLabs (erst später relevant)

- `eleven_flash_v2_5`: ~75 ms Modellinferenz, EU-TTFB 100–150 ms, 32 Sprachen,
  40k Zeichen; Deutsch geeignet, Zahlen normalisieren.
- HTTP-Streaming `POST /v1/text-to-speech/{voice_id}/stream` reicht, wenn der
  Text fertig ist; WebSocket lohnt erst bei inkrementellem Text.
- `apply_text_normalization="on"` ist bei Flash v2.5 Enterprise-only; Zahlen,
  Daten, Abkürzungen im Prompt ausschreiben. `stability=0.5`,
  `similarity_boost=0.75`, `style=0`, `use_speaker_boost=true`, `speed=1.0`.
- Agents-Plattform nicht übernehmen: Sie würde ASR, LLM, Turn-Taking und
  Tools duplizieren und die Textkontrolle verwässern. Unser LLM schreibt,
  ElevenLabs spricht.
- Standardmäßig werden Text und Audio gespeichert. Zero Retention und
  EU-Residency sind Enterprise-Funktionen. Für die Demo vorgerenderte feste
  Sätze cachen; Key nur serverseitig.
- Fallback: Browser-`speechSynthesis` mit `de-DE`, wenn der Proxy ausfällt.
  Teil-Audio nie als vollständig ausgeben.

## 7. Was die Evidenz an der Architektur ändert

1. **Event-driven statt Timer.** Live-Lane reagiert auf finalisierte
   ASR-Segmente; 20–30 s ist nur der Maximalabstand. Das reduziert
   Fehlerfortpflanzung und Kosten.
2. **Kein „autoritativ“.** Der finale Lauf ist die beste verfügbare Prüfung,
   aber keine Wahrheitsgarantie. Drei Ausgänge, Zitatprüfung, Quelle sichtbar.
3. **Keine Live-Urteile.** Live nur Kandidaten und Retrieval-Prefetch.
4. **Mehrere akzeptable Antwortpunkte.** Plan-first mit `expected_points[]`,
   nicht mit einer goldenen Antwort. Jede Frage gegen Quelle validieren.
5. **Adaptiver Stop plus Safety-Caps.** Research-Empfehlung 3–5 Fragen,
   1 Follow-up, 10 min; im Code 5 Startfragen (Default 3), 3 Follow-ups,
   6 Turns, TTL 600 s. Der Voice-Pfad ist im Browser auf 600 s/12 Antworten
   begrenzt; harte Provider-Limits bleiben Agentenkonfiguration.
6. **Zweistufiges Feedback.** Kurz im Gespräch, Evidenz im Review.
7. **Turn-Taking sichtbar machen.** First Audio <700 ms für bekannte Texte,
   <1,5 s für dynamische mit Filler; >4 s ist schlecht. Halbduplex nur mit
   Stop-Möglichkeit; Barge-in vor dem Naturalness-Urteil testen.
8. **Kein Personenlob, keine Note.** Lob auf Aufgabe/Prozess, Fehler als
   Information, Abschluss mit einem nächsten Schritt.

## 8. Offene Risiken und was im Pilot zu messen ist

- **Cloud:** Gemini Developer API ohne EU-Pinning; Einwilligung und
  Datenminimierung sind Pflicht. Nur synthetische Demo-Daten.
- **ASR:** Partials sind unzuverlässig; deutsche Fachbegriffe und Füllwörter
  sind ungeprüft. Finales Transkript ist die Wahrheit.
- **Fact-Check:** Claim-Extraktion und Judge sind fehleranfällig; Quote-Match
  ist ein Gate, keine Wahrheitsgarantie. Keine Genauigkeitszahl aus
  synthetischen Läufen ableiten.
- **Fragenqualität:** PFQS hilft bei Kontrolle, nicht bewiesen für
  Lerngewinn. Fragen können trivial, mehrteilig oder unfair sein; Validator
  und Stichproben nötig.
- **TTS:** Stimme, Prosodie und deutsche Zahlen sind ungeprüft. Vor dem
  Finale 2–3 Stimmen auf dem echten Skript testen.
- **Kein Nutzertest:** Die Evidenz stammt aus Classroom/HCI, nicht aus diesem
  Agenten. Im Pilot messen: Antwortlänge, Reparaturrate, Student-Talk-Anteil,
  wahrgenommener Druck, Abbruchquote, First-Audio-Latenz.

## 9. Referenzen

**Lehrerverhalten und Feedback**
- Rowe, M. B. (1974). Wait-time and rewards as instructional variables.
  *Journal of Research in Science Teaching*, 11(2), 81–94.
  https://doi.org/10.1002/tea.3660110202
- Tobin, K. (1987). The role of wait time in higher cognitive level learning.
  *Review of Educational Research*, 57(1), 69–95.
  https://doi.org/10.3102/00346543057001069
- Hattie, J., & Timperley, H. (2007). The power of feedback.
  *Review of Educational Research*, 77(1), 81–112.
  https://doi.org/10.3102/003465430298487
- Black, P., & Wiliam, D. (1998). Assessment and classroom learning.
  *Assessment in Education*, 5(1), 7–74.
  https://doi.org/10.1080/0969595980050102
- Nystrand, M. et al. (1997). *Opening Dialogue*. Teachers College Press.
- O’Connor, M. C., & Michaels, S. (1993). Aligning academic task and
  participation status through revoicing. *Anthropology & Education Quarterly*,
  24(4), 318–335. https://doi.org/10.1525/aeq.1993.24.4.04x0063k
- Graesser, A. C. et al. (1995). Collaborative dialogue patterns in
  naturalistic one-to-one tutoring. *Applied Cognitive Psychology*, 9(6),
  495–522. https://doi.org/10.1002/acp.2350090604
- van de Pol, J. et al. (2010). Scaffolding in teacher–student interaction.
  *Educational Psychology Review*, 22, 271–296.
  https://doi.org/10.1007/s10648-010-9127-6
- Lyster, R., & Ranta, L. (1997). Corrective feedback and learner uptake.
  *Studies in Second Language Acquisition*, 19(1), 37–66.
  https://doi.org/10.1017/S0272263197001022
- Mueller, C. M., & Dweck, C. S. (1998). Praise for intelligence can undermine
  children’s motivation and performance. *JPSP*, 75(1), 33–52.
  https://doi.org/10.1037/0022-3514.75.1.33
- Sisk, V. F. et al. (2018). To what extent and under which circumstances are
  growth mind-sets important to academic achievement? *Psychological Science*,
  29(4), 549–571. https://doi.org/10.1177/0956797617739704
- Wisniewski, B. et al. (2020). The power of feedback revisited.
  *Frontiers in Psychology*, 10, 3087. https://doi.org/10.3389/fpsyg.2019.03087
- Michaels, S. et al. (2008). Deliberative discourse idealized and realized.
  *Studies in Philosophy and Education*, 27, 283–297.
  https://doi.org/10.1007/s11217-007-9071-1
- Redfield, D. L., & Rousseau, E. W. (1981). A meta-analysis of experimental
  research on teacher questioning behavior. *Review of Educational Research*,
  51(2), 237–245. https://doi.org/10.3102/00346543051002237
- Witt, P. L. et al. (2004). An experimental study of teachers’ verbal and
  nonverbal immediacy. *Communication Education*, 53(2), 184–192.
  https://doi.org/10.1080/036452042000228054
- Reiss, G. (1983). *Sprechpausen im Unterricht*. https://doi.org/10.25656/01:22874
- Heinze, A., & Erhard, M. (2006). How much time do students have to think?
  *ZDM*, 38(1), 1–12. https://doi.org/10.1007/BF02652800

**Kognition, Grenzen, Gespräch**
- Cowan, N. (2001). The magical number 4 in short-term memory.
  *Behavioral and Brain Sciences*, 24(1), 87–114.
  https://doi.org/10.1017/S0140525X01003922
- Krosnick, J. A. (1991). Response strategies for coping with the cognitive
  demands of attitude measures. *Applied Cognitive Psychology*, 5(3), 213–236.
  https://doi.org/10.1002/acp.2350050305
- Galesic, M., & Bosnjak, M. (2009). Effects of questionnaire length on
  participation and indicators of response quality. *Public Opinion Quarterly*,
  73(2), 349–360. https://doi.org/10.1093/poq/nfp031
- Ackerman, P. L., & Kanfer, R. (2009). Test length and cognitive fatigue.
  *Journal of Experimental Psychology: Applied*, 15(4), 303–315.
  https://doi.org/10.1037/a0015719
- Jensen, A. R. et al. (2013). Exam length, performance and fatigue.
  *PLoS ONE*, 8(8), e70270. https://doi.org/10.1371/journal.pone.0070270
- Eva, K. W. et al. (2004). The multiple mini-interview.
  *Medical Education*, 38(3), 314–319.
  https://doi.org/10.1046/j.1365-2923.2004.01776.x
- Steele, C. M., & Aronson, J. (1995). Stereotype threat and the intellectual
  test performance of African Americans. *JPSP*, 69(5), 797–811.
  https://doi.org/10.1037/0022-3514.69.5.797
- Stivers, T. et al. (2009). Universals and cultural variation in turn-taking.
  *PNAS*, 106(26), 10587–10592. https://doi.org/10.1073/pnas.0903616106
- Heldner, M., & Edlund, J. (2010). Pauses, gaps and overlaps in conversations.
  *Journal of Phonetics*, 38(4), 555–568.
  https://doi.org/10.1016/j.wocn.2010.08.002
- Skantze, G. (2021). Turn-taking in conversational systems and human-robot
  interaction. *Computer Speech & Language*, 67, 101178.
  https://doi.org/10.1016/j.csl.2020.101178
- Liu, N. F. et al. (2024). Lost in the Middle. *TACL*, 12, 157–173.
  https://doi.org/10.1162/tacl_a_00638

**Fragen, Prüfung, Fact-Checking**
- Li, Y., & Zhang, Y. (2024). Planning First, Question Second. *Findings of
  ACL 2024*. https://doi.org/10.18653/v1/2024.findings-acl.280
- Dugan, L. et al. (2022). Answer-agnostic question generation for education.
  *Findings of ACL 2022*. https://doi.org/10.18653/v1/2022.findings-acl.151
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning.
  *Psychological Science*, 17(3), 249–255.
  https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Schlichtkrull, M. et al. (2023). AVeriTeC. *NeurIPS 2023 Datasets and
  Benchmarks*. https://proceedings.neurips.cc/paper_files/paper/2023
- Zheng, L. et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot
  Arena. *NeurIPS 2023*.
  https://proceedings.neurips.cc/paper_files/paper/2023
- Fyfe, E. R. et al. (2021). ManyClasses 1. *Advances in Methods and Practices
  in Psychological Science*, 4(2). https://doi.org/10.1177/25152459211027575
- Kingston, N., & Nash, B. (2011). Formative assessment: a meta-analysis.
  *Educational Measurement: Issues and Practice*, 30(4), 28–37.
  https://doi.org/10.1111/j.1745-3992.2011.00220.x

**Offizielle Dokumentation**
- Gemini OpenAI-Kompatibilität: https://ai.google.dev/gemini-api/docs/openai
- Gemini Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini Thinking: https://ai.google.dev/gemini-api/docs/generate-content/thinking
- Gemini Modelle: https://ai.google.dev/gemini-api/docs/models
- Gemini Preise: https://ai.google.dev/gemini-api/docs/pricing
- Gemini Rate Limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini Caching: https://ai.google.dev/gemini-api/docs/generate-content/caching
- Gemini Terms/Data: https://ai.google.dev/gemini-api/terms
- ElevenLabs Modelle: https://elevenlabs.io/docs/overview/models
- ElevenLabs TTS-Streaming: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- ElevenLabs Latenz: https://elevenlabs.io/docs/eleven-api/concepts/latency
- ElevenLabs Zero Retention: https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode
- ElevenLabs Data Residency: https://elevenlabs.io/docs/overview/administration/data-residency

**Zitationshinweis.** Die Referenzen wurden aus der Recherche zusammengestellt;
DOIs und URLs vor einer Veröffentlichung bibliografisch prüfen, besonders
2026er-Arbeiten und Preview-Dokumentation. Die Evidenzgrade sind eine
Einschätzung, kein formaler Systematic Review. Keine Zahl in diesem Dokument
ist eine Genauigkeits- oder Latenzzusage für die Jury-Hardware.

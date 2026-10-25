# Source-Grounding-Hardening

Stand: 25.10.2026 · Branch `feat/source-grounding` · Arbeitsstand, keine Messung von Präzision, Recall oder Latenz

## 1. Kontext und Problem

Der Fact-Check prüft Aussagen eines Vortrags gegen hochgeladene Quellen: Das LLM extrahiert
Behauptungen, Hybrid-Retrieval liefert Auszüge, das LLM urteilt und nennt ein wörtliches Zitat,
danach prüft Code das Zitat. Die bisherige Prüfung `quote_in_text` belegte nur, dass eine
Zeichenkette im Auszug vorkommt. Das ist notwendig, aber nicht hinreichend.

Vier Lücken waren sichtbar:

- **Citation laundering:** Ein echtes, thematisch passendes Zitat kann eine zu starke oder
  zahlenmäßig andere Behauptung scheinbar belegen. Zitatpräsenz ist kein Beweis für die
  Aussagekraft des Zitats; numerische Spezifität ist eine eigene Evidenzachse.
- **Kurze Zitate:** Die alte Evidenzprüfung verwarf jedes Zitat unter `min_quote_chars`, bevor
  sie überhaupt matchte. Gültige kurze Exact-Zitate gingen verloren; eine Erweiterung auf
  Satzkontext fehlte.
- **DOCX-Reihenfolge:** Die alte Extraktion sammelte erst alle Absätze, dann alle Tabellen und
  deklarierte alles als `paragraph`. Tabelleninhalt landete am Dokumentende, Zitatorte zeigten
  auf falsche Absätze, und Chunking konnte über eine Tabellengrenze hinweg zusammenführen.
- **Retrieval und Fragen:** Es gab keinen fusionierten Score und kein Weak-Signal. Die
  Lücken-Fragen nutzten eine einzige, bis zu 2.000 Zeichen lange Transkript-Query. Fragen und
  Antworten konnten Zahlen einführen, die im zitierten Befund nicht stehen.

Ziel ist keine neue Behauptung von Genauigkeit, sondern **prüfbare, deterministische Gates** für
operativ definierte Eigenschaften (Zitat vorhanden, Zahl im Zitat, Ort in der Quelle), während
das LLM weiterhin die semantische Bewertung macht. Unsicherheit wird als Signal ausgewiesen,
nicht als Konfidenz ausgegeben.

## 2. Rechercheergebnisse mit Quellen

Abruf der Quellen: 25.10.2026. Die Typen sind bewusst getrennt: peer-reviewte Arbeiten,
Industrie-Preprint und Herstellerdokumentation. Herstellerdokumentation und der Industrie-Preprint
stützen Designentscheidungen, keine Wirksamkeits- oder Genauigkeitsaussagen.

| Quelle | Typ | Kernaussage | URL |
|---|---|---|---|
| Qian et al. (2026), *Relevant Is Not Warranted: Evidence-Force Calibration for Cited RAG* | Peer-reviewed, ACL Anthology 2026 (Findings of EMNLP); arXiv | Führt „citation laundering“ ein: ein echtes, relevantes Zitat kann die Aussagekraft der Behauptung unterschreiten. ForceBench prüft fünf Achsen, darunter **numeric specificity**; Zitatpräsenz und Token-/Entity-Overlap sind kein Warrantsignal. | https://aclanthology.org/2026.findings-emnlp.1577/ · https://arxiv.org/abs/2605.28044 |
| Medrano, Verma, Chhabra (2026), *Scaling Retrieval Augmented Generation with RAG Fusion: Lessons from an Industry Deployment* | Industrie-Preprint (arXiv, Dell Technologies) | RAG-Fusion erhöht rohe Recall-Werte, aber die Gains werden nach Re-Ranking und Truncation weitgehend neutralisiert; Hit@10 fiel in mehreren Konfigurationen von 0,51 auf 0,48. Zusätzliche Latenz durch Query-Rewriting und größere Kandidatenmengen. | https://arxiv.org/abs/2603.02153 |
| Ammann, Golde, Akbik (2025), *Question Decomposition for Retrieval-Augmented Generation* | Peer-reviewed, ACL SRW 2025 | Question Decomposition verbessert Recall-Metriken (u. a. Hits@4 und Hits@10), kostet aber Latenz; mit Re-Ranking beste Qualität, aber weitere Latenz. | https://aclanthology.org/2025.acl-srw.32/ |
| Cormack, Clarke, Büttcher (2009), *Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods* | Peer-reviewed, ACM SIGIR 2009 | RRF kombiniert Ranglisten robust und übertraf in den untersuchten TREC-Sets die Einzelsysteme; `k = 60` war nahezu optimal, aber nicht kritisch. | https://doi.org/10.1145/1571941.1572114 |
| Bruch, Gai, Ingber (2023), *An Analysis of Fusion Functions for Hybrid Retrieval* | Peer-reviewed, ACM TOIS | Hybrid-Retrieval mit RRF schlägt auf den meisten Datensätzen rein lexikalische und rein semantische Suche; RRF ist rangbasiert und verwirft Score-Magnituden. Eine gut abgestimmte Score-Fusion kann übertreffen. | https://doi.org/10.1145/3596512 |
| Schreieder, Schopf, Färber (2026), *Attribution, Citation, and Quotation: A Survey of Evidence-based Text Generation with LLMs* | Peer-reviewed, ACL 2026 | Zitate und insbesondere Quotes erlauben die direkte Identifikation von Evidenzspans; Inline-Zitate ermöglichen Claim-level-Verifikation. Die Evidenzgranularität reicht von Dokument über Absatz und Satz bis Token. | https://aclanthology.org/2026.acl-long.1430/ |
| Huang et al. (2024), *Learning Fine-Grained Grounded Citations for Attributed Large Language Models* (FRONT) | Peer-reviewed, Findings of ACL 2024 | Groundet zuerst feinkörnige Supporting Quotes und lässt diese die Generierung führen; das verbessert Zitatqualität und liefert span-genaue Attributionen. | https://aclanthology.org/2024.findings-acl.838/ |
| Qian et al. (2025), *VeriCite: Towards Reliable Citations in RAG via Rigorous Verification* | Peer-reviewed, SIGIR-AP 2025 | Nutzt ein NLI-Modell zur Claim-Verifikation und Evidenzauswahl und berichtet bessere Zitatqualität bei erhaltener Antwortkorrektheit. NLI ist ein Baustein, keine numerische Garantie. | https://arxiv.org/abs/2510.11394 |
| Steck, Ekanadham, Kallus (2024), *Is Cosine-Similarity of Embeddings Really About Similarity?* | Peer-reviewed, WWW '24 Companion | Cosine-Similarity kann je nach Embedding und Modell beliebige bzw. wenig bedeutsame Werte liefern; warnt vor blinden Schwellenwerten. | https://doi.org/10.1145/3589335.3651526 |
| Arize AI, *What Is Cosine Similarity* | Engineering-Blog (Vendor) | Cosine-Scores sind nicht kalibriert; Schwellenwerte übertragen sich nicht zwischen Embedding-Modellen, nur die relative Ordnung ist verlässlich. | https://arize.com/glossary/cosine-similarity |
| python-docx, *Document objects* | Herstellerdokumentation | `Document.iter_inner_content()` liefert `Paragraph`- und `Table`-Objekte in Dokumentreihenfolge. | https://python-docx.readthedocs.io/en/latest/api/document.html |
| Microsoft Learn, *Hybrid Search Scoring (RRF)* | Herstellerdokumentation | RRF-Scores sind rangbasiert; die Obergrenze hängt von der Zahl der fusionierten Listen ab und ist kein Wahrscheinlichkeitsmaß. | https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking |

### Synthese

**Evidenzstärke statt Zitatpräsenz.** ForceBench zeigt, dass selbst ein wörtliches, relevantes
Zitat eine over-strong Behauptung tragen kann. Die Autoren berichten, dass Token-/Entity-Overlap
die Monotonie auf 32,8–36,4 % der Paare verletzt und generisches Support-Prompting bei vier
Modell-Judges eine MVR (monotonicity violation rate) von 47,2 % erreicht; explizites
Warrant-Prompting senkt sie auf 24,5 %, bleibt aber imperfect. Unser `numeric_gate` adressiert
davon nur die Achse **numeric specificity**. Relation, Modalität, Scope und zeitliche Gültigkeit
bleiben dem LLM überlassen und sind nicht durch den Code gedeckt.

**Deterministisch vs. NLI/LLM.** VeriCite zeigt, dass NLI die Zitatqualität verbessern kann. NLI
ist aber ein semantisches Modell und löst numerische Spezifität nicht automatisch; es würde einen
weiteren Modellpfad mit Latenz, deutschen Validierungsdaten und eigener Fehlercharakteristik
einführen. Der Prototyp wählt deshalb deterministische Gates für operativ definierte
Eigenschaften und behält das LLM als semantischen Judge. Das ist eine Scope-Entscheidung, keine
Aussage, dass NLI unnötig wäre.

**Quote-first und Evidenzspans.** FRONT groundet zuerst feinkörnige Quotes; der Survey beschreibt
Quotes als direkt sichtbare Evidenzspans und Inline-Zitate als Grundlage für Claim-level-Prüfung.
Das entspricht konzeptionell einem Quote-then-Cite-Muster. Unser Pfad ist schwächer als
Generation-Time-Quote-First: Das LLM erzeugt Urteil und Zitat, der Code verifiziert **post hoc**.
Dafür ist kein Retraining nötig, und die Verifikation bleibt eine harte, reproduzierbare Grenze.
Kurze Exact-Zitate werden auf Satzgrenzen erweitert, damit sie prüfbar werden; der gespeicherte
Quote bleibt ein zusammenhängender Ausschnitt.

**DOCX-Reihenfolge.** Die offizielle python-docx-Dokumentation bestätigt
`Document.iter_inner_content()` als Weg, Absätze und Tabellen in Dokumentreihenfolge zu lesen.
Die Implementierung nutzt das und führt für Absätze und Tabellen getrennte Zähler. Das behebt die
alte „erst Absätze, dann Tabellen“-Reihenfolge, nicht aber die Semantik von Zellverbänden.

**Hybrid-Retrieval und RRF.** Cormack et al. stützen RRF als robuste Rangfusion; Bruch et al.
zeigen die Stärke von Hybrid-RRF, aber auch den Informationsverlust durch reine Ränge. Azure
dokumentiert zusätzlich, dass der RRF-Score mit der Zahl der fusionierten Listen wächst. Der Score
ist daher ein Ordnungssignal, keine Konfidenz. Für Multi-Query gilt: Question Decomposition kann
Recall gewinnen (Ammann et al.), aber eine Produktionsstudie findet, dass die Gains nach
Re-Ranking und Truncation weitgehend verschwinden und zusätzliche Latenz entsteht (Medrano et
al.). Unser Lückenpfad nutzt bis zu vier fokussierte Queries ohne LLM-Rewrite und ohne Reranker;
das ist ein Testkandidat, kein belegter Gewinn.

**Kalibrierung.** Cosine-Similarity ist modell- und datenabhängig und nicht als Wahrscheinlichkeit
kalibriert (Steck et al.); RRF-Scores sind ebenfalls keine Wahrscheinlichkeiten und hängen von der
Zahl der Listen ab (Azure). Deshalb werden `similarity`, `retrieval_score` und `weak` als Signale
ausgegeben. Es gibt keinen harten Cutoff, der aus einem Score eine Wahrheitsaussage macht.

**Entscheidung für den Prototyp:**

- Deterministische Gates für Zitat, Zahl und Quellenort; das LLM bleibt semantischer Judge.
- Kein NLI-Modell, keine Einheiten- oder Entitätssemantik in diesem Schritt.
- Multi-Query nur im Lückenpfad, mit RRF und ohne Konfidenzbehauptung.
- `not_found` und `unchecked` bleiben Nicht-Wahrheitsurteile; `weak` ist kein Qualitätsurteil.

## 3. Umgesetzte Maßnahmen 1–6

### 3.1 Zahlennormalisierung

- **Code:** `backend/app/sources/numbers.py:16–22` (Zahlen-Regex), `:24–34` (Skalenwörter),
  `:37–53` (Dezimal-Normalisierung), `:56–74` (`numbers_in`).
- **Was:** Erkennt deutsche Tausenderpunkte/Leerzeichen, Dezimalkomma, englische
  Komma-Gruppen ab zwei Gruppen sowie `Mio`/`Million(en)`, `Mrd`/`Milliarde(n)`,
  `Tsd`/`tausend`. Liefert eine Menge kanonischer Dezimalstrings; Duplikate kollabieren.
- **Code-Garantie:** `1.200`, `1200` und `1,2 Tsd.` werden zu `1200`; `4,2 Mio.` und
  `4.200.000` zu `4200000`. Die Funktion ist deterministisch und ohne Seiteneffekte.
- **Nicht garantiert:** Einheiten, Währungen, Prozentpunkte, Datumsarithmetik, Zeiträume,
  Zahlwörter („vier Millionen“), Ordinalien, Brüche und Entitätsbindung. `1,200` wird bewusst
  als deutsche Dezimalzahl `1.2` gelesen, nicht als englisches Tausend. `2026-10-25` ergibt
  drei einzelne Zahlen. Die Menge ist Evidenzabdeckung, keine Aussage über die Rolle der Zahl.

### 3.2 Zitatprüfung und Evidenzspan-Erweiterung

- **Code:** `backend/app/sources/quotes.py:7–8` (Negations-/Kontrastwörter), `:11–20`
  (Normalisierung), `:23–47` (`quote_match`), `:50–57` (Token-Helfer), `:60–69`
  (Satzgrenzen-Heuristik), `:72–89` (Exact-Span), `:92–124` (`_expand_span`), `:127–146`
  (`verified_quote`); `backend/app/factcheck/pipeline.py:118–141` (`verified_evidence`).
- **Was:** Normalisiert NFKC, weiche Trennzeichen, Zeilenumbrüche, Anführungszeichen,
  Gedankenstriche, Leerraum und Groß-/Kleinschreibung. Exact-Match ist eine normalisierte
  Substringprüfung. Fuzzy-Match ist erst ab vier Tokens erlaubt, verlangt gleiches erstes und letztes
  Token, identische Ziffern-Token, identische Negationsliste und eine `SequenceMatcher`-Ratio
  von mindestens 0,90 (`quotes.py:41–45`). Zitate unter `min_quote_chars` (Default 12) werden
  nur akzeptiert, wenn ein exakter, zusammenhängender Treffer bis zu Satzgrenzen erweiterbar ist;
  der gespeicherte Quote ist dann der erweiterte Ausschnitt. Überlange Erweiterungen werden bei
  400 Zeichen an der nächsten Wortgrenze gekürzt.
- **Ortbindung:** `verified_evidence` versucht bei einem vom Modell genannten Auszug ausschließlich
  diesen; ein ungültiger Index liefert keine Evidenz. Ohne Index werden die Auszüge der Reihe
  nach versucht. Ein deklarierter Ort wird nie auf eine andere Seite oder Quelle verschoben
  (`factcheck/pipeline.py:121–127`).
- **Code-Garantie:** Der verifizierte Quote ist ein zusammenhängender Ausschnitt des genannten
  Auszugs; die Erweiterung kann die Passage nicht verlassen. Bei `exact` wird, wenn auffindbar,
  der Originalspan gespeichert; bei `fuzzy` immer der gefundene Quellspan, sonst wird der Match
  verworfen. Fuzzy-Matching ändert keine Ziffern, Skalenwörter oder Negationen. `quote_verified`
  unterscheidet `exact` und `fuzzy`.
- **Nicht garantiert:** Dass das Zitat die Behauptung semantisch trägt. Fuzzy kann andere Wörter
  austauschen. Die Erweiterung kann eine benachbarte Zahl aufnehmen, die eine andere Rolle hat.
  Die Satzgrenzen sind eine Interpunktions-/Zeilen-Heuristik, kein NLP-Segmenter. Es werden keine
  Zeichen- oder Wort-Offsets gespeichert. Bei kurzen Exact-Zitaten kann `quote_verified = exact`
  für den **erweiterten** Text gelten, obwohl das Modell nur den kurzen Ausschnitt genannt hat;
  das UI unterscheidet diese beiden Fälle derzeit nicht. `retrieval.quote_in_text` bleibt als
  einfacher Helper für Tests und andere Aufrufer bestehen; der Fact-Check nutzt `verified_quote`.

### 3.3 DOCX-Absätze und -Tabellen in Dokumentreihenfolge

- **Code:** `backend/app/sources/extract.py:12` (`LocationKind` inklusive `table`), `:84–106`
  (`_docx` mit `iter_inner_content`), `:14–16` (`SUPPORTED`), `backend/app/sources/chunking.py:13`
  (`MERGEABLE`), `:58–68` (`chunk_segments`), `backend/app/sources/retrieval.py:116–118`
  (Location-Labels inklusive `Tabelle`).
- **Was:** `_docx` liest Top-Level-`Paragraph`- und `Table`-Blöcke in Dokumentreihenfolge.
  Absätze und Tabellen haben getrennte 1-basierte Zähler. Tabellenzeilen werden mit ` | `
  verbunden, leere Zeilen entfallen. `table` ist **nicht** in `MERGEABLE`; dadurch wird eine
  Tabelle nicht mit einem angrenzenden Absatz oder einer anderen Tabelle zu einem Chunk
  verschmolzen. Seiten und Folien werden ohnehin nie zusammengeführt.
- **Code-Garantie:** Die Reihenfolge der Top-Level-Blöcke entspricht dem Dokument. Eine Tabelle
  erhält einen eigenen Ort `Tabelle N` und wird nicht ans Dokumentende verschoben. Ein
  Tabellen-Chunk bleibt von Absatz-Chunks getrennt.
- **Nicht garantiert:** Verschachtelte Tabellen, verbundene Zellen, Kopf-/Fußzeilen, Textboxen,
  Fußnoten und Zellkoordinaten. Eine große Tabelle kann in mehrere Chunks mit derselben
  Tabellennummer zerfallen. Die Zeilensemantik geht durch die ` | `-Linearisierung verloren.
  Bereits gespeicherte DOCX-Chunks werden nicht neu numeriert; für konsistente Orte sollte die
  Quelle neu ingestiert werden. Maßgebliche Quelle ist die python-docx-Dokumentation zu
  `iter_inner_content()`; im Backend ist `python-docx==1.2.0` gepinnt.

### 3.4 Retrieval-Signale, RRF und Multi-Query-Baustein

- **Code:** `backend/app/sources/retrieval.py:16–17` (`CANDIDATES`, `RRF_K`), `:20–25`
  (Weak-Schwelle), `:27–49` (SQL mit innerer RRF), `:55–80` (`search` mit Signalen), `:83–102`
  (`fuse`), `:105–113` (`search_many`); `backend/app/sources/models.py:38–50` (`SourceHit`).
- **Was:** `search` kombiniert Vektor- und Keyword-Rangliste per RRF und liefert `similarity`,
  `matched_by`, `retrieval_score` und `weak`. `weak` ist nur wahr bei einem reinen
  Vektor-Treffer unter der per `SOURCE_WEAK_SIMILARITY` konfigurierbaren Schwelle (Default 0,30);
  ein Keyword-Treffer unterdrückt `weak`. `fuse` kombiniert mehrere Query-Ranglisten per RRF,
  dedupliziert über `chunk_id`, vereinigt `matched_by`, nimmt die maximale Similarity und setzt
  `weak` nur, wenn alle Listen den Treffer als weak markieren. `search_many` ist ein
  Bibliotheks-Helfer für genau diese Fusion; der Fragepfad ruft derzeit `retrieve` pro Query auf
  und ruft danach `fuse` direkt auf.
- **Code-Garantie:** Die Fusion ist deterministisch (Rang, `k`, `chunk_id` als Tie-Breaker).
  Ein Treffer, der in mehreren Query-Listen weit oben steht, erhält einen höheren
  `retrieval_score`. Die Provenienz `matched_by` bleibt erhalten.
- **Nicht garantiert:** Kalibrierte Relevanz oder Konfidenz. Der äußere `fuse`-Score summiert
  `1/(rrf_k + rang)` über die Query-Listen und überschreibt den inneren Vektor-/Keyword-RRF-Wert;
  er hängt damit von der Zahl der Queries und von `rrf_k` ab; `k` begrenzt nur die Ausgabe.
  `similarity` ist Cosine, kein
  Wahrscheinlichkeitswert. Die Weak-Schwelle ist eine Heuristik, nicht getunt und nicht pro
  Embedding-Modell kalibriert. Es gibt keinen Reranker, keine adaptive Query-Auswahl und keine
  Messung der Latenz. `search_many` wird im aktuellen Fragepfad nicht aufgerufen.

### 3.5 Numeric Gate im Fact-Check

- **Code:** `backend/app/factcheck/pipeline.py:144–165` (`numeric_gate`), `:168–184` (`judge`),
  `:180–182` (Aufruf nach verifizierter Evidenz); `backend/app/sources/quotes.py:50–57`
  (Negations-/Kontrast-Token).
- **Was:** Nachdem `verified_evidence` ein Zitat verifiziert hat, vergleicht `numeric_gate` die
  Zahlen der Behauptung mit den Zahlen des verifizierten Zitats. Bei `supports` muss jede
  Behauptungszahl im Zitat vorkommen; sonst wird das Urteil zu `unchecked` und die Evidenz
  verworfen. Bei `contradicts` wird nur verworfen, wenn das Zitat nach Normalisierung
  identisch mit der Behauptung ist. Widersprüche auf Entität, Ort, Einheit oder Zeitraum bleiben
  dem LLM überlassen, weil ein deterministischer Zahlenvergleich sie sonst fälschlich verwerfen
  würde (z. B. „50 % in Hessen“ vs. „50 % in Bayern“).
- **Code-Garantie:** Ein `supports`-Urteil kann nicht bestehen, wenn eine Ziffer oder ein
  Skalenwort der Behauptung im verifizierten Zitat fehlt. Bei einer Behauptung mit Ziffern wird
  ein `contradicts`-Urteil nur dann zu `unchecked`, wenn das Zitat die Behauptung wörtlich
  wiederholt.
- **Nicht garantiert:** Semantische Rollen, Entitäten, Einheiten und Zahlenwörter. Eine Behauptung
  ohne Ziffern überspringt das Gate vollständig. Enthält das Zitat sowohl `149 €` als auch
  `299 €`, besteht die Behauptung „Preis 299 €“ das Supports-Gate, obwohl der Satz 149 € als
  aktuellen Preis nennen kann. `contradicts` wird nicht numerisch vetoed; eine sachfremde
  Aussage kann daher als Widerspruch bestehen bleiben, wenn das LLM sie so beurteilt.
  Datumswerte werden in Tag/Monat/Jahr zerlegt, sodass `25.10.2026` und `2026-10-25` gleich
  verglichen werden; Datumsarithmetik findet nicht statt. `unchecked` ist ein
  technisches Nicht-Urteil, keine Aussage „falsch“. Ein verworfener Upload-Befund fällt in
  `check_claim` auf den Web-Pfad zurück, sofern Websuche aktiv ist (`pipeline.py:198–217`); das
  ist keine Bestätigung des Befunds.

### 3.6 Fragen und Antworten: Queries und Zahlen-Gates

- **Code:** `backend/app/questions/pipeline.py:153–165` (`_allowed_numbers`), `:168–224`
  (`parse_questions`), `:211–213` (Fragen-Gate), `:227–246` (`_transcript_windows`), `:249–266`
  (`source_queries`), `:290–297` (Retrieval und `fuse`), `:313–314` (Hinweis bei verworfenen
  Fragen), `:367–377` (Antwort-Gate); `backend/app/questions/models.py:28–38` (`QuestionConfig`).
- **Was:** `source_queries` priorisiert Behauptungstexte aus dem Fact-Check und füllt verbleibende
  Plätze mit gleichmäßig über den Vortrag verteilten Transkriptfenstern auf (maximal 700 Zeichen,
  auf 500 gekürzt). Bei langen Vorträgen ist das ganze Transkript nie eine Query; ein kurzer
  Vortrag kann in ein Fenster passen. `QuestionConfig.source_queries` ist neu,
  Default 4, erlaubt 1–8. Der Fragepfad ruft `retrieve` pro Query auf und fusioniert die Listen
  mit `retrieval.fuse`; die Queries laufen sequentiell. Das Fragen-Gate verwirft eine Frage,
  wenn sie eine Zahl enthält, die nicht in ihrem zitierten Befund, ihrer Evidenz-Quote oder dem
  referenzierten Transkript vorkommt; die Anzahl wird als Hinweis gemeldet. Das Antwort-Gate
  ruft nach verifizierter Evidenz denselben `numeric_gate` mit der Antwort und dem
  verifizierten Quote auf; bei Verstoß wird die Antwort `unchecked`, die Evidenz verworfen und
  die neutrale Fallback-Antwort gesprochen.
- **Code-Garantie:** Eine generierte Frage kann keine Ziffer einführen, die nicht in dem von ihr
  referenzierten Befund, ihrer Evidenz-Quote oder dem referenzierten Transkript vorkommt. Ein
  `supports`-Antworturteil kann keine Ziffer tragen, die im verifizierten Quote fehlt; enthält die
  Antwort Ziffern und lautet das Urteil `contradicts`, muss das Zitat eine abweichende Zahl oder
  einen zusätzlichen Negations-/Kontrastmarker enthalten, sonst wird das Urteil verworfen.
  Verworfene Fragen und Antworten werden nicht als belegt angezeigt.
- **Nicht garantiert:** Die erlaubte Zahlenmenge ist mengenbasiert und großzügig; sie prüft keine
  Beziehung, Einheit oder Entität. Eine Zahl aus dem Transkript kann eine Frage autorisieren,
  obwohl die konkrete Verknüpfung nicht belegt ist. Fragen ohne Ziffern laufen ungeprüft durch
  das Zahlen-Gate. `not_found` bleibt „in den geprüften Quellen nicht belegt“, nicht „falsch“.
  Es gibt keinen NLI-Judge und keine Messung, wie oft das Gate falsch verwirft oder falsch
  durchlässt. `source_queries` ist eine Heuristik ohne LLM-Rewrite; die Latenz der bis zu vier
  sequentiellen Suchen ist ungemessen.

## 4. Architektur-Auswirkung

- **`LocationKind`:** `backend/app/sources/extract.py:12` erweitert die Union um `table`.
  `SUPPORTED` bleibt für `.docx` bei `paragraph`; die konkreten Segmente können `paragraph` oder
  `table` sein. `retrieval.LABELS` und das Frontend erhalten `Tabelle`/`Table`.
- **`SourceHit`:** Neue optionale Felder `retrieval_score` und `weak` (`sources/models.py:47–50`);
  `similarity` und `matched_by` bleiben. Die Felder sind additiv und default-behaftet.
- **`Evidence`:** Übernimmt `retrieval_score`, `similarity`, `matched_by` und `weak` aus dem
  Quelltreffer (`factcheck/models.py:47–53`). Web-Evidenz hat `retrieval_score = null`,
  `similarity = null`, `matched_by = []`, `weak = false`. `quote_verified` bleibt `exact`/`fuzzy`.
- **`QuestionConfig.source_queries`:** Neues Feld mit Default 4 (`questions/models.py:33–35`).
  Requests ohne das Feld bleiben gültig; das Ergebnis gibt die verwendete Konfiguration zurück.
- **Datenbank:** Keine Migration. `source_chunks.location_kind` ist `text NOT NULL` ohne
  CHECK-Constraint (`backend/app/sources/db.py:39`); `table` ist damit ein gültiger neuer Wert.
  `retrieval_score`/`weak` werden pro Anfrage berechnet und nicht als Spalten persistiert.
  `SourceHit` ist ein Response-Modell; `Evidence` reist im JSON von Fact-Check, Fragen und
  Event-Payloads. Bestehende DOCX-Chunks behalten allerdings ihre alte Numerierung; ein
  Neu-Ingest ist für konsistente Orte empfehlenswert.
- **API/Contract:** Keine neuen Endpunkte. `POST /sources/search` liefert die neuen
  `SourceHit`-Felder; `POST /factcheck`, `POST /questions` und `POST /questions/answers` liefern
  `Evidence` mit den neuen Feldern. Die Änderung ist additiv, aber der generierte
  OpenAPI/TypeScript-Vertrag (`api/schema.d.ts`) muss mit `npm run api:generate` neu erzeugt
  werden; die `Location.kind`-Union wächst um `table`.
- **Event-Modell:** Keine neuen Event-Typen. `fact`- und `question`-Payloads enthalten die
  erweiterten `Evidence`-Felder. Ein lokal verworfener Befund wird zunächst `unchecked`
  (Severity `info`), nicht `contradicts`/`not_found`; der optionale Web-Pfad kann danach ein
  neues Urteil liefern.
- **Frontend:** `FactCheckPanel` und `QuestionSimulator` zeigen `quote_verified`, `similarity`
  und `weak` als Hinweise; `SourceLibrary` zeigt Tabellenorte und einen Retrieval-Hinweis.
  `retrieval_score` wird nicht als Confidence angezeigt. Die Formulierung „Quote verified
  verbatim“ ist bei erweiterten Kurz-Zitaten zu präzisieren (siehe offene Punkte).

## 5. Validierung

Ausgeführt am 25.10.2026 im Backend-Container gegen diesen Worktree:

- **Backend:** `python -m pytest tests -q` → 344 bestanden, 1 übersprungen.
- **Frontend:** `tsc --noEmit` bestanden; `vitest run` → 38 Testdateien, 266 Tests bestanden.
- **Live-Läufe:** Gemini 3.1 Flash Lite, drei synthetische Decks, je eine frische Collection,
  `max_claims=6`. Zwei Läufe ergaben 17 Claims, aber unterschiedliche Urteile: einmal
  7 `supports` / 6 `contradicts` / 4 `not_found`, einmal 5 / 6 / 4 plus 2 `unchecked`.
  Die Kernzahlen und die erwarteten Widersprüche traten auf; das Urteil zu p = 0,03 variierte
  zwischen den Läufen. Die beiden `unchecked` im zweiten Lauf waren nicht wörtliche
  Modellzitate (27-%- und 12,4-Punkte-Claim), keine Numeric-Gate-Verwerfungen.
- **DOCX:** 4 Chunks, davon 1 Tabelle. Die Query „1.200 Haushalte pro Woche“ traf als Top-1
  `Tabelle 1`; der Fact-Check nutzte für dieselbe Zahl den wiederholenden Prosa-Absatz
  „Absätze 10–28“. Beide Orte sind gültig, die Tabelle ist aber separat auffindbar.
- **Weak-Signal:** Die erwartungsschwache Query „Förderung DFG“ lieferte Similarities
  0,052 / 0,035 / 0,008 und dreimal `weak=true`; ein Startup-Treffer mit 0,287 wurde ebenfalls
  `weak`. Das ist eine Stichprobe, keine Kalibrierung der Schwelle 0,30.
- **Zahlen-Gate:** In den Läufen wurde kein `supports`-Urteil wegen fehlender Zahlen verworfen;
  alle zitierten `supports`-Quotes enthielten die Behauptungszahlen. Das ist keine Aussage über
  die Fehlerrate des Gates.

Die Tests sind Verhaltensprüfungen auf synthetischen Daten, keine Messung von Präzision,
Recall oder Latenz.

| Test | Prüft | Ort |
|---|---|---|
| `test_german_and_english_number_forms`, `test_numbers_ignore_words_and_keep_dates_and_ranges` | Kanonisierung deutscher/englischer Formen, angehängte Skalenwörter, Datum als Tag/Monat/Jahr, `1,200` als deutsche Dezimalzahl | `backend/tests/test_numbers.py:6`, `:18` |
| `test_extract_docx_keeps_tables_in_document_order` | Absatz → Tabelle → Absatz bleibt in Reihenfolge; Tabelle erhält `table`-Ort | `backend/tests/test_sources.py:89` |
| `test_chunking_does_not_merge_paragraphs_across_a_table` | Tabelle unterbricht das Zusammenführen von Absätzen | `backend/tests/test_sources.py:110` |
| `test_short_exact_quotes_are_expanded_to_sentence_context` | Kurzes Exact-Zitat wird zum Satz erweitert; `149` matcht nicht `1490`; nicht vorhandenes Zitat bleibt `None` | `backend/tests/test_sources.py:120` |
| `test_multi_query_fusion_prefers_passages_found_by_several_queries` | RRF bevorzugt einen von mehreren Queries gefundenen Treffer und vergibt einen höheren Score | `backend/tests/test_sources.py:127` |
| `test_quote_verification_and_labels` | Normalisierte Zitatprüfung, Tabellen-Label | `backend/tests/test_sources.py:166` |
| `test_numeric_gate_requires_the_claim_figures_in_the_quote` | Supports-Untermenge, Widerspruch mit abweichender Zahl/Kontrast, ohne Zahl verworfen | `backend/tests/test_factcheck.py:185` |
| `test_source_queries_prioritise_findings_and_sample_long_talks` | Befund-Queries zuerst, lange Vorträge in Fenstern, nie das ganze Transkript | `backend/tests/test_questions.py:103` |
| `test_questions_with_unbacked_numbers_are_dropped` | Fragen mit Zahlen ohne Beleg werden verworfen und gezählt | `backend/tests/test_questions.py:114` |
| `test_answer_review_rejects_numbers_not_in_the_verified_quote` | Antwort mit nicht belegter Zahl wird `unchecked` | `backend/tests/test_questions.py:127` |

**Was noch fehlt (große Decks und Messung):**

- Ein größerer realer Gemini-Lauf mit deutschen Zitaten, Auslassungen, Umformulierungen,
  Einheiten und Tabellen: Wie oft akzeptiert `verified_quote` korrekt, wie oft verwirft es
  gültige Zitate? Der Lauf oben ist eine Stichprobe mit drei synthetischen Decks.
- Große DOCX-Dateien mit verschachtelten Tabellen, verbundenen Zellen, mehrseitigen Tabellen und
  Kopf-/Fußzeilen: Reihenfolge, Duplikate und Ortsgenauigkeit.
- Reale Retrieval-Qualität und Latenz der bis zu vier sequentiellen Queries auf der Demo-Collection;
  Vergleich Einzel-Query vs. Fusion, Weak-Schwelle pro Embedding-Modell.
- Zahlen-Gate auf einem manuell gelabelten deutschen Set mit Einheiten, Prozentpunkten, Zeiträumen,
  Zahlwörtern und Entitätsambiguität: falsche Verwerfungen und falsche Durchlässe.
- UI-Verständlichkeit: Werden `weak`, `fuzzy` und `exact` als Signale verstanden, ohne als
  Confidence oder Note gelesen zu werden?

## 6. Grenzen und bewusste Nicht-Ziele

- **Kein NLI-/Entailment-Modell.** Das LLM bleibt semantischer Judge; die deterministischen Gates
  ersetzen keine semantische Prüfung.
- **Keine Einheitensemantik.** Euro, Prozent, Prozentpunkte, Währungen, kg, Zeiträume und
  Datumsarithmetik werden nicht interpretiert oder umgerechnet.
- **Keine Zahlwörter.** „vier Millionen“, „ein Drittel“, Ordinalien und ausgeschriebene Zahlen
  werden nicht erkannt; das Gate prüft Ziffern und die genannten Skalenwörter.
- **Kein harter Relevanz-Cutoff.** `similarity` und `retrieval_score` sind keine Wahrscheinlichkeiten;
  `weak` ist eine Heuristik. Es gibt keinen Score, der allein über Wahrheit entscheidet.
- **Keine Entitätsbindung.** Eine Zahl im Zitat kann zu einer anderen Person, einem anderen Jahr
  oder einem anderen Gegenstand gehören als in der Behauptung.
- **Keine semantische Rollenprüfung.** Supports prüft Abdeckung, nicht ob die Zahl die behauptete
  Rolle hat; Contradicts prüft eine zusätzliche Zahl oder Negation/Kontrast, nicht ob sie
  sachlich zusammenhängt.
- **Keine Tabellen-Semantik.** Keine Zellkoordinaten, keine verbundenen Zellen, keine
  verschachtelten Tabellen, keine Kopf-/Fußzeilen, kein OCR. Große Tabellen können in mehrere
  Chunks zerfallen.
- **Keine Aussage über `not_found`.** `not_found` heißt „in den geprüften Quellen nicht belegt“,
  nicht „falsch“. `unchecked` heißt „technisch nicht geprüft/verworfen“, nicht „falsch“.
- **Keine Kalibrierungs- oder Genauigkeitsbehauptung.** Es gibt keine gemessene Precision/Recall,
  keine Validierung gegen einen menschlichen Goldstandard und keine Latenzmessung. Die Tests prüfen
  deterministische Einzelfälle.
- **Kein Reranker, keine adaptiven Queries, kein LLM-Query-Rewrite.** Multi-Query läuft nur im
  Lückenpfad, sequentiell und ohne Cache. `search_many` ist derzeit ungenutzt.
- **Keine automatische Neu-Numerierung alter DOCX-Chunks.** Die Datenbank braucht keine
  Migration, aber alte Quellen können andere Absatznummern als ein Neu-Ingest haben.

## 7. Offene Punkte und nächste Schritte

1. **Reale Evaluierung aufsetzen:** kleines, manuell gelabeltes Set aus synthetischen deutschen
   Transkripten und Quellen (Behauptung, Zitat, Evidenz, Zahl, Einheit, Entität). Getrennt messen:
   Zitat akzeptiert/verworfen, Zahlen-Gate falsch positiv/falsch negativ, `weak` nützlich/irreführend.
   Erst danach über Precision/Recall sprechen.
2. **Einheiten, Entitäten und Zahlwörter:** lokale, testbare Normalisierung für Währungen,
   Prozent/Prozentpunkte, Bereiche, Datum und ausgeschriebene Zahlen; Zahl an Entität binden.
   Ohne diese Schicht bleibt das Gate bewusst eng.
3. **DOCX/PPTX-Tabellen härten:** verbundene Zellen, verschachtelte Tabellen und mehrseitige
   Tabellen prüfen; entscheiden, ob Zellkoordinaten (Tabelle, Zeile, Spalte) oder eine
   strukturierte HTML-/Markdown-Repräsentation gespeichert werden. Alte DOCX-Quellen neu
   ingestieren.
4. **Retrieval und Latenz messen:** Einzel-Query vs. `source_queries` mit 2/4/8 Queries auf der
   Demo-Collection; Weak-Schwelle pro Embedding-Modell prüfen; über Reranker oder adaptive
   Query-Auswahl erst nach Messung entscheiden. `search_many` entweder im Fragepfad nutzen oder
   entfernen.
5. **Evidenzachsen jenseits der Zahl:** Relation, Modalität, Scope und zeitliche Gültigkeit aus
   ForceBench als eigene Prüfungen oder Prompt-Kriterien untersuchen; explizites
   Warrant-Prompting testen. Optional einen deutschen NLI-/Claim-Verifier als zweiten Judge
   evaluieren, inklusive Latenz und Fehlerprofil.
6. **Vertrag und UI nachziehen:** OpenAPI/TypeScript neu generieren; Architekturdiagramme,
   Datenmodell und Decision Log aktualisieren; UI unterscheidet „verbatim“, „fuzzy“ und
   „erweitertes Kurz-Zitat“ und nennt `similarity`/`weak` ausdrücklich Signale, nicht Konfidenz.
   Den veralteten Docstring-Hinweis auf `quote_in_text` in `factcheck/pipeline.py:6` bereinigen.

Die Änderungen sind bewusst additiv und ohne Datenbankmigration. Sie verbessern die
Nachvollziehbarkeit der Prüfung, nicht die behauptete Trefferquote.

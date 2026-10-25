# Quellenbindung und Zitatprüfung

Stand: 25.10.2026, Integration von `feat/source-grounding` in `main`.
Prototyp mit synthetischen Daten; keine gemessene Genauigkeit oder Kalibrierung.

## 1. Zweck

Ein vorhandenes Zitat beweist nicht, dass eine Behauptung daraus folgt. Der
Fact-Check behält deshalb das LLM als inhaltlichen Judge, prüft aber Fundort,
Quelltext und Zahlen zusätzlich im Code. Fehlende Evidenz bleibt offen;
`not_found` bedeutet nicht „falsch“, `unchecked` ist kein Sachurteil.

## 2. Recherche und Entscheidung

Diese Arbeiten begründen mögliche Ansätze, keine Wirksamkeit dieses Prototyps.
Die angegebenen Primärquellen wurden beim Integrationsreview gelesen;
Ergebnisse aus anderen Datensätzen werden nicht auf unsere Demo übertragen.

| Quelle | Bezug zur Umsetzung |
|---|---|
| [Qian et al., Relevant Is Not Warranted (2026, Preprint)](https://arxiv.org/abs/2605.28044) | Unterscheidet Zitatpräsenz von der tatsächlichen Belegkraft. Unser Zahlen-Gate prüft nur einen engen Teil davon. |
| [Medrano et al., RAG Fusion (2026, Preprint)](https://arxiv.org/abs/2603.02153) | Mehr Retrieval-Treffer führten im beschriebenen Aufbau nicht automatisch zu besseren Endergebnissen. Multi-Query bleibt bei uns ein unvalidierter Testkandidat. |
| [Ammann et al., Question Decomposition (ACL SRW 2025)](https://aclanthology.org/2025.acl-srw.32/) | Untersucht mehrere fokussierte Suchanfragen. Unser Ansatz nutzt feste Fenster und vorhandene Befunde, keine LLM-Zerlegung. |
| [Schreieder et al., Attribution, Citation, and Quotation (ACL 2026)](https://aclanthology.org/2026.acl-long.1430/) | Ordnet Formen und Grenzen belegter Textgenerierung ein. |
| [Huang et al., Fine-Grained Grounded Citations (ACL 2024)](https://aclanthology.org/2024.findings-acl.838/) | Nutzt feine Belegstellen bei der Generierung; unser Code prüft Zitate nach der Generierung. |
| [Qian et al., VeriCite (2025)](https://arxiv.org/abs/2510.11394) | Verknüpft Antworten mit NLI-Prüfung und Evidenzauswahl. Ein solches weiteres Modell ist hier nicht eingebaut. |
| [python-docx 1.2.0](https://python-docx.readthedocs.io/en/latest/api/document.html) | `iter_inner_content()` liefert Absätze und Tabellen in Dokumentreihenfolge. |
| [Microsoft: RRF](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking) | Rangfusion kombiniert Listen; der Wert hängt von den Listen ab und ist keine Wahrscheinlichkeit. |

## 3. Umgesetztes Verhalten

### Zitate

`backend/app/sources/quotes.py` enthält einen gemeinsamen Exact-/Fuzzy-Matcher
für Fact-Check, Antwortprüfung und den persistenten Review-Writer.

- Ein genannter Auszug ist bindend. Ein Zitat wandert niemals auf eine andere
  Seite oder Quelle, nur weil es dort vorkommt.
- Normalisiert werden Unicode, Schreibweise, Anführungszeichen, Leerraum und
  Zeilentrennung. Zeichenpositionen bleiben auf den Originaltext abbildbar;
  gespeicherte Evidenz ist ein zusammenhängender Ausschnitt dieses Texts.
- Ein Treffer darf keine Wörter, Vorzeichen, Dezimalzahlen, Tausendergruppen
  oder Skalenwörter abschneiden: `149` ist kein Beleg aus `1490`, `-149` oder
  `149 Mio.`. Das gilt auch am Rand eines Fuzzy-Treffers.
- Fuzzy-Matching braucht mindestens vier Tokens, gleiche Randtokens,
  identische erkannte Zahlen und geschützte Negations-/Kontrastwörter sowie
  eine Token-Ähnlichkeit von mindestens 0,90. Das bleibt eine Heuristik;
  andere Bedeutungsänderungen werden damit nicht ausgeschlossen.
- Kurze, aussagekräftige Exact-Anker dürfen bis auf Satz-/Zeilenkontext
  erweitert werden. Der vollständige Anker bleibt enthalten. Die konfigurierte
  Mindestlänge bezieht sich auf den resultierenden Quelltext.
- `quote_verified` beschreibt `exact` oder `fuzzy`, keine inhaltliche Wahrheit.
  `evidenceHint` im Frontend nennt die Methode, möglichen Kontext und ungeprüfte
  Alt-Zitate ausdrücklich. Die Web-Fragerunde bleibt ein ElevenLabs-Dialog.

### Zahlen und Antworten

`backend/app/sources/numbers.py` erkennt Ziffern, deutsche Gruppierung und
Dezimalkomma, eindeutige englische Gruppierung mit Dezimalpunkt sowie
`Mio`/`Million(en)`, `Mrd`/`Milliarde(n)` und `Tsd`/`tausend`.
Unicode-Leerzeichen werden normalisiert. Beispiele: `4,2 Mio.` = `4.200.000`,
`1,200.50` = `1200.5`. Das mehrdeutige `1,200` bleibt bewusst deutsch: `1.2`.

- `supports` braucht alle erkannten Behauptungs-/Antwortzahlen im geprüften
  Zitat. Andernfalls wird das Urteil `unchecked` und die Evidenz verworfen.
- Ein identisches Zitat kann kein `contradicts` begründen, auch ohne Zahlen.
  Gleiche Zahlen allein widerlegen einen Widerspruch nicht: Ort oder Entität
  können abweichen. Diesen Vergleich übernimmt weiter das LLM.
- API-Fragen und ihre Begründungen dürfen nur Zahlen ihrer referenzierten
  Befunde, Transkriptstelle oder Evidenz übernehmen. Ungültige Fragen werden
  gezählt und verworfen.
- Antwortfeedback mit unbelegten Zahlen wird neutral ersetzt und `unchecked`.
  Unbelegte Nachfragen entfallen. Gültige Nachfragen übernehmen die aktuell
  geprüfte Evidenz, falls vorhanden, statt eine veraltete Quelle anzuhängen.
- Diese Gates gelten für den Fact-Check und kompatiblen Fragen-/Antwort-API-Pfad.
  ElevenLabs-Sprachantworten durchlaufen sie nicht; das bleibt im UI/Datenfluss
  eine ausdrückliche Grenze.

### Quellen, Fundorte und Retrieval

`extract.py` liest DOCX-Absätze und -Tabellen in Dokumentreihenfolge mit
getrennten 1-basierten Nummern. `table` bleibt beim Chunking von Nachbarabsätzen
getrennt. Große Tabellen können mehrere Chunks am selben Tabellenort ergeben.
Verschachtelte Tabellen, Zellkoordinaten und Kopf-/Fußzeilen bleiben offen.

`SourceHit` und `Evidence` führen `retrieval_score`, `similarity`, `matched_by`
und `weak`. Die Similarity ist Kosinus; der RRF-Score ist nur ein Rangsignal.
Vektor-Treffer ohne Keyword-Match unter `SOURCE_WEAK_SIMILARITY` (Default 0,30)
werden als `weak` markiert. Daraus folgt kein Sachurteil oder harter Cutoff.

`questions/retrieval.py` liefert beiden Fragepfaden dieselben begrenzten Queries:
vorhandene Behauptungen zuerst, danach Transkriptfenster einschließlich des
Vortragsendes. Default vier Queries, konfigurierbar von eins bis acht, je
höchstens 500 Zeichen. Ein kurzer Vortrag kann vollständig in ein Fenster passen.
Die Suchen laufen nacheinander; `retrieval.fuse` fusioniert über `chunk_id`,
vereinigt Match-Arten und übernimmt die höchste Similarity. Der äußere RRF-Score
ersetzt den Score der Einzel-Query. Der Voice-Kontext erhält höchstens acht Auszüge.

## 4. Verträge und Betrieb

- Keine neuen Endpunkte oder Datenbankspalten. `Location.kind` enthält zusätzlich
  `table`; die Datenbank nutzt bereits freien Text. Alte DOCX-Quellen behalten
  ihre alten Orte und brauchen für konsistente Nummern einen erneuten Upload.
- Die neuen Metadaten sind additiv und haben Backend-Defaults. Generierte
  OpenAPI-/TypeScript-Dateien werden mit `npm run api:generate` gepflegt.
- Aktuelle Navigation und der entfernte Source-Suchbereich von `main` bleiben
  erhalten. Es wird kein getippter Web-Fragepfad wieder eingeführt.
- Architektur: [03-architecture.md](03-architecture.md); allgemeine offene
  Aufgaben: [14-open-todos.md](14-open-todos.md).

## 5. Reproduzierbare Prüfung

- Backend: vollständige Suite gegen eine frische PostgreSQL-/pgvector-Testdatenbank:
  **375 bestanden, 2 übersprungen** (optionale Cloud-/Silero-Prüfungen).
- Frontend: **286 Unit-Tests**, ESLint, TypeScript, API-Vertragscheck,
  **8 Compose-Checks** und Production-Build bestanden (Node 22).
- Reale lokale Ingest-/Embedding-/Retrieval-Stichprobe mit den drei synthetischen
  Decks: PPTX **10** Chunks, PDF **6**, DOCX **4**, davon eine Tabelle.
  „1.200 Haushalte pro Woche“ lieferte `Tabelle 1` als ersten Treffer.
  Temporäre Quellen wurden danach gelöscht. Keine erneuten Cloud-Modellaufrufe.
- Browser-Regression: **8 Checks bestanden**, jeweils Desktop und 375-px-Layout:
  Quellen-Navigation, Review-Navigation, Fact-Check mit lokalen Zeitsprüngen und
  ElevenLabs-Bereitschaft/Gesprächsabschluss. Provider-Antworten sind Test-Doubles.

Vom Repo-Root, ohne Cloud-Aufruf:

```sh
PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests -q
npm test
npm run lint
npm run typecheck
npm run api:check
npm run test:compose
npm run build
docker compose run --rm --no-deps -T -v "$PWD:/workspace:ro" \
  -w /workspace/backend backend python -m scripts.validate_grounding
```

Datenbanktests benötigen `POSTGRES_*` für eine eigene Testdatenbank.
`--live-llm` am Validierungsskript sendet synthetische Texte an das konfigurierte
Modell und ist ein bewusster separater Aufruf. Der Feature-Branch berichtete
zuvor unterschiedliche Modellurteile über zwei Läufe; diese alten Ergebnisse
sind keine Abnahme des integrierten Codes.

## 6. Offene Grenzen

Kein Entailment-/NLI-Modell, keine Einheiten- oder Entitätsbindung und keine
Zahlwörter. Daten werden nur als Menge aus Tag/Monat/Jahr verglichen;
vertauschte Datumsbestandteile sind damit nicht sicher unterscheidbar.
Ein Zitat mit mehreren Zahlen kann die falsche Zahl zur falschen Entität
zuordnen. Kurze Anker können fremden Kontext aufnehmen. Fuzzy-Matches bleiben
heuristisch. Fehlende Treffer und kleine Similarities beweisen keine Falschheit.

Weiter offen: manuell gelabelte deutsche Behauptungs-/Zitat-Paare,
Fehlerquoten der Gates, große/verschachtelte Tabellen, relevante Query-Auswahl,
Latenz und kalibrierte Retrieval-Schwellen. Die synthetischen Tests beweisen
konkretes Codeverhalten, keine gemessene Genauigkeit oder Geräte-/Provider-Abnahme.

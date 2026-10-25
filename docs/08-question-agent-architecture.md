# Fragen-Agent: Architektur, Didaktik und Sprachausgabe

Stand: 24.10.2026. Baut auf `docs/07-voice-agent-stack.md` auf.
Dieses Dokument ist Research + Zielarchitektur, keine umgesetzte Pipeline.
Nach der Umsetzung gehören die betroffenen Diagramme in
`docs/03-architecture.md` und der Beschluss in `docs/02-ai-decision-log.md`.

## 0. Kurzentscheidung

1. **Unser LLM schreibt den exakten Sprechtext, ElevenLabs spricht ihn.**
   ElevenLabs-TTS formuliert nicht um. „ElevenLabs macht das Wording“ wäre in
   Wahrheit das LLM der ElevenLabs-Agents-Plattform – ein zweites Modell, das
   die Quellenbindung aufweicht. Für einen quellengeprüften Lehrer-Agenten ist
   das die falsche Richtung.
2. **Plan-first:** erst einen Antwortplan mit Erwartungspunkten und Evidenz
   bauen, dann die Frage formulieren. Das ist kontrollierbarer als „schreib
   drei Fragen“ (PFQS, ACL 2024).
3. **Streaming nur für den fertigen Sprechtext**, satzweise. Niemals JSON,
   Markdown oder Rohtokens an die TTS geben.
4. **Filler sofort, aber vorgerendert.** Die Plan-Generierung startet bereits
   während des Review-UI, nicht erst beim Klick auf „Fragerunde“. Dann braucht
   es meist gar keinen Filler.
5. **Niveau live als Heuristik**, nicht als Note: Signale aus Transkript,
   Quellenabdeckung und Delivery, drei Bänder, adaptive Fragenauswahl. Die
   Antwortqualität steuert die nächste Stufe, nicht das Label.
6. **Web ist Zweitquelle** und nur für Vergleichs-/Kontextfragen. Kein
   „nicht gefunden = falsch“, keine Web-Aussage als Wahrheitsinstanz.

## 1. Ist-Stand (gemessen)

| Baustein | Heute | Datei |
|---|---|---|
| Transkript | Wörter mit Timestamps, Sätze, `t_ms` | `backend/app/transcription/`, `app/factcheck/transcript.py` |
| Fact-Check | Aussagen → Quellen-Chunks → Urteil + wörtliches Zitat | `backend/app/factcheck/` |
| Fragen | 3–5 Fragen (Code-Cap 5), Typen `contradiction`, `unsupported`, `gap`, `clarification` | `backend/app/questions/pipeline.py` |
| Antwortprüfung | Urteil + Zitat + `reply` + `follow_up`, keine Noten | `POST /questions/answers` |
| Gesprochene Antwort | Upload → Whisper → gleiche Prüfung | `POST /questions/answers/voice` |
| Live-ASR | `WS /speech/live`, 2-s-Fenster, Wörter/Text | `backend/app/speech/live.py` |
| TTS | Browser `speechSynthesis` | `frontend/src/features/questions/voice.ts` |
| Web-Suche | Wikipedia/Tavily, optional, nur für offene Claims | `backend/app/factcheck/web.py` |

Gemessene Latenzen aus dem Repo: Fragenrunde **6,1 s**, Antwortprüfung
**4,1 s**, Fact-Check **10,1 s**, Whisper `small`/Beam 5 **4,8 s** für 6,8 s
Audio (`tiny` warm ≈ 1,0 s).

Was fehlt: ein expliziter Fragenplan, Erwartungspunkte, Nachfrage-Trigger,
Niveau-Profil, Filler, TTS-Streaming und ein Vertrag „wer formuliert was“.

## 2. Die zentrale Frage: Wer formuliert?

Drei Varianten, klar getrennt:

| Variante | Wer schreibt den Text? | Wer spricht? | Grounding | Latenz | Aufwand |
|---|---|---|---|---|---|
| **A. Unser LLM → ElevenLabs TTS** | unser Backend, exakt | ElevenLabs TTS | voll (Zitatprüfung bleibt) | TTS ~0,2 s nach Text | niedrig |
| **B. Unser LLM streamt Kontext → ElevenLabs-Agent-LLM formuliert** | ElevenLabs-Agent-LLM | ElevenLabs TTS | nur über Prompt/Tools, weich | zusätzlicher LLM-Call | mittel |
| **C. Unser LLM → ElevenLabs-Agent mit Custom LLM** | unser Backend, exakt | ElevenLabs TTS + Turn-Taking | voll | zusätzlicher Netzwerk-Hop | hoch (öffentlicher Endpoint/Tunnel) |

**Empfehlung: A.**

Warum:

- **TTS paraphrasiert nicht.** Sie liest Text (plus Normalisierung, Prosodie,
  Audio-Tags). Wenn ElevenLabs „das Wording macht“, ist das immer ein LLM –
  entweder das Plattform-LLM oder ein Custom LLM. Dieses Missverständnis ist
  der wichtigste Punkt.
- **Quellenbindung.** Die bestehende Pipeline prüft per String-Match, dass ein
  Zitat wörtlich im Chunk steht. Nur wenn unser Code den gesprochenen Text
  kontrolliert, gilt diese Garantie auch für die Stimme.
- **Determinismus und Testbarkeit.** Der Sprechtext ist ein Feld im JSON, das
  man prüfen, snapshot-testen und gegen den Quellen-Chunk validieren kann.
- **Kein doppelter LLM-Call.** Variante B kostet einen zusätzlichen
  Formulierungs-Call und macht die Latenz schwer vorhersagbar.
- **Kein Tunnel.** Variante C braucht einen öffentlich erreichbaren
  OpenAI-kompatiblen SSE-Endpoint, weil ElevenLabs in der Cloud ihn aufruft.
  Für eine lokale Demo ist das ein unnötiges Risiko.

**Wann B sinnvoll ist:** wenn natürliche Gesprächsführung wichtiger ist als
wörtliche Kontrolle, Cloud-Audio ohnehin akzeptiert ist und die Fragen nur
weich an Quellen angelehnt sind. Für „Lehrer simuliert Prüfungsfragen aus
meinen Folien“ ist das nicht der Fall.

**Konsequenz:** Jede Frage und jede gesprochene Reaktion hat ein eigenes
`spoken`-Feld. Es ist TTS-fertig: kurze Sätze, keine Aufzählungen, keine
Klammern, keine Abkürzungen, keine Markdown-Zeichen, keine Zitatmarker.
`question` (für die UI) und `spoken` (für die Stimme) dürfen gleich sein,
müssen aber nicht.

## 3. Zielarchitektur

### 3.1 Ablauf

```
[Präsentation endet]
Transkript (Wörter, Sätze, t_ms)
      + Quellen-Chunks + Fact-Check-Funde
      + optional Web-Zweitquelle
      │
      ▼
ProfileBuilder ───────────────► LevelProfile (Heuristik, 3 Bänder)
      │
      ▼
QuestionPlanner (LLM, plan-first, JSON)
      │  Fragen + Erwartungspunkte + Evidenz + Nachfrage-Trigger
      ▼
Validator (Code: Referenzen, Zitat, Sprechstil, kein Antwortleck)
      │
      ├──► TTS-Prerender (ElevenLabs, Cache) ──► Audio-Blobs
      │
      ▼
Session (Frontend)
  1. Filler (cached) startet sofort, falls der Plan noch nicht da ist
  2. Frage 1 (cached Audio) startet, sobald Plan/Validierung fertig
  3. Mikro + VAD → automatisches Antwortende
  4. ASR (lokal oder Scribe) → Antworttext
  5. POST /questions/answers → verifiziertes Urteil (~4 s)
  6. Template-Acknowledgment sofort; danach Feedback + Nachfrage/Frage 2
  7. Frage 2/3 sind bereits vorgerendert
```

### 3.2 Der wichtigste Trick: während des Reviews vorbereiten

Die Fragenrunde startet nicht erst, wenn der Nutzer auf „Fragerunde“ klickt.
Sobald Transkript und Fact-Check fertig sind (also während der Nutzer die
Timeline ansieht), läuft im Hintergrund:

1. LevelProfile bauen,
2. QuestionPlan generieren,
3. Fragen validieren,
4. Frage 1–3 und den Filler-Pool per ElevenLabs vorrendern,
5. Audio im Browser cachen.

Beim Klick ist die erste Frage in der Regel schon hörbar. Der Filler ist dann
nur der Fallback für „Nutzer klickt sofort“ oder „Plan braucht länger“.

Wenn bewusst gestreamt werden soll: Frage 1 wird nach der Validierung
satzweise an die TTS geschickt; der Filler läuft parallel und endet, sobald
das erste Audio-Chunk da ist. Das ist die wörtliche Umsetzung von „Filler,
dann streamen, dann redet es“ – nur dass der Filler nicht auf die komplette
Plan-Generierung wartet, sondern auf das erste freigegebene `spoken`-Feld.

### 3.3 Latenz-Budget

| Zeitpunkt | Was passiert | Ziel |
|---|---|---|
| Präsentation endet | Plan-Generierung startet im Hintergrund | 0 ms für den Nutzer |
| Klick „Fragerunde“ | Frage 1 aus dem Cache | **< 100 ms** |
| Plan noch nicht fertig | Filler (cached, 2–3 s) | **< 300 ms** |
| Frage 1 gesprochen | Mikro öffnet, VAD lauscht | – |
| Antwortende | RMS/Stille ~700 ms | 0 ms |
| +0–300 ms | Acknowledgment („Mhm.“, „Danke.“) | erster Ton |
| +1–5 s | ASR final (lokal `tiny`/Beam 1 oder Scribe) | Transkript |
| +4–6 s | verifiziertes Urteil + Feedback-Template | Karte/Stimme |
| +4–6 s | Nachfrage oder Frage 2 (vorgerendert) | nächster Zug |

Der Unterschied zu heute: Die 6–10 s Plantime liegen **vor** dem Gespräch,
nicht darin. Im Gespräch bleibt nur die Antwortprüfung (~4 s), und die wird
von einem kurzen Acknowledgment überbrückt.

### 3.4 Zwei ASR-Varianten

| Variante | Audio verlässt das Gerät | Latenz | Aufwand |
|---|---|---|---|
| Lokales Whisper (`tiny`/Beam 1) | nein | ~1 s für kurze Antworten | niedrig, existiert |
| ElevenLabs Scribe v2 Realtime | ja (Cloud) | ~120–150 ms | mittel (WebSocket-Proxy) |

Empfehlung für die Demo: **lokal starten**, Scribe nur wenn die
Antwortlatenz stört und Cloud-Audio ohnehin akzeptiert ist. Die
Präsentations-Transkription bleibt in beiden Fällen lokal (Batch-Whisper);
Scribe ist nur für die Antworten im Dialog.

Wie das Transkript während des Vortrags inkrementell an ein LLM geht, wie
Fact-Check und Fragen parallel laufen und welches Gemini-Modell wofür taugt,
steht in `docs/09-streaming-analysis-and-models.md`.

## 4. Fragen-Generierung

### 4.1 Plan-first statt „schreib drei Fragen“

Der Planner bekommt zuerst den Auftrag, einen **Antwortplan** zu bauen:
Thema, Kernaussagen, schwache Stellen, erwartete Antwortpunkte, Evidenz.
Erst daraus entsteht die Frage. Das ist der PFQS-Ansatz („Planning First,
Question Second“, ACL Findings 2024): Der Plan macht Inhalt, Schwierigkeit
und geprüfte Fähigkeit kontrollierbar; die Frage folgt dem Plan.

Praktisch: ein JSON-Aufruf mit zwei Feldern pro Frage:

```json
{
  "topic": "...",
  "level_band": "grundlagen|anwendung|vertiefung",
  "key_terms": ["..."],
  "questions": [
    {
      "kind": "contradiction|unsupported|gap|clarification|comprehension|application|evaluation|transfer",
      "dok": 1,
      "difficulty": 1,
      "question": "Wie im UI angezeigt?",
      "spoken": "Wie vorgelesen?",
      "reason": "Ein Satz, worauf die Frage sich stützt.",
      "transcript_sentences": [12, 13],
      "finding": 2,
      "passage": 4,
      "quote": "wörtliches Zitat bei gap",
      "expected_points": ["Punkt 1", "Punkt 2"],
      "follow_ups": [
        {"trigger": "answer_missing_point", "spoken": "..."},
        {"trigger": "answer_strong", "spoken": "..."}
      ],
      "query": "Suchanfrage für die Antwortprüfung"
    }
  ]
}
```

`expected_points` sind der Schlüssel für zwei Dinge: adaptive Nachfragen und
die Bewertung, ob eine Antwort oberflächlich oder vernetzt ist. Sie sind
keine Musterlösung und keine Note.

### 4.2 Fragetaxonomie

Die quellengebundenen Typen bleiben (`contradiction`, `unsupported`, `gap`,
`clarification`). Dazu kommen kognitive Typen, die auch ohne Widerspruch
funktionieren:

| Typ | Zweck | Beispiel |
|---|---|---|
| `comprehension` | Verständnis prüfen | „Was bedeutet X in Ihren eigenen Worten?“ |
| `application` | Transfer auf einen Fall | „Wie würden Sie X auf Y anwenden?“ |
| `analysis` | Begründung, Annahmen, Vergleich | „Warum haben Sie X statt Y gewählt?“ |
| `evaluation` | Grenzen, Gegenargument, Belastbarkeit | „Wo endet die Aussagekraft Ihrer Daten?“ |
| `transfer` | Implikation, neuer Kontext | „Was folgt daraus für die Praxis?“ |

Nachfrage-Trigger (keine neuen Fakten, nur Gesprächsführung):

| Trigger | Nachfrage |
|---|---|
| Antwort ist vage | „Können Sie das an einem Beispiel präzisieren?“ |
| Behauptung ohne Beleg | „Worauf stützt sich diese Aussage?“ |
| Antwort ist stark | „Welche Annahme müsste falsch sein, damit das nicht gilt?“ |
| Antwort weicht aus | „Was wäre Ihre kürzeste Antwort auf die Frage?“ |
| Widerspruch zur Quelle | „In den Unterlagen steht dazu etwas anderes. Wie erklären Sie das?“ |

### 4.3 Validierung im Code (Pflicht)

Der Validator prüft jede Frage, bevor sie gesprochen wird:

- `spoken` endet mit `?` und ist tatsächlich eine Frage, keine Feststellung.
- Höchstens ein Fragezeichen, keine zwei Fragen in einem Satz.
- 8–30 Wörter, höchstens zwei Sätze; keine Aufzählung, keine Klammer,
  keine Abkürzung, kein Markdown, keine URL, kein Zitatmarker.
- `transcript_sentences`, `finding`, `passage` müssen existieren.
- `gap` braucht ein wörtliches Zitat, das im Passage-Chunk vorkommt
  (bestehende `quote_in_text`-Prüfung).
- Das Zitat darf nicht in der Frage stehen (kein Antwortleck).
- `expected_points` nicht leer; `follow_ups` haben einen bekannten Trigger.
- Keine Wertung der Person, keine Punkte, keine Noten.
- Sprache = Sprache des Transkripts (Deutsch), Sie/Du passend zur Persona.

Fragen, die durchfallen, werden verworfen und – wenn nötig – nachgeneriert.
Besser zwei saubere Fragen als drei, von denen eine kaputt ist.

### 4.4 Auswahl und Reihenfolge

- **Mindestens eine quellengebundene Frage**, wenn ein Befund vorliegt.
- **Eine Verständnisfrage** am Anfang, damit der Einstieg fair ist.
- **Eine Anwendungs- oder Analysefrage** in der Mitte.
- **Eine Bewertungs-/Transferfrage** am Ende, wenn das Niveau es trägt.
- Nicht zweimal denselben Typ hintereinander.
- Nicht nach einem Gap fragen, der im Vortrag nachweislich behandelt wurde.
- Maximal 3 Fragen für die Demo, 5 für eine lange Runde.

### 4.5 Schwierigkeit: nicht dem LLM-Label vertrauen

Eine 2026er Studie zu LLM-generierten Fragen zeigt: Vom Modell vergebene
Schwierigkeitslabels („easy/medium/hard“) bilden die empirische Schwierigkeit
nicht zuverlässig ab; sie korrelieren eher mit Textlänge und mitgenerierten
Tags. Konsequenz:

- `difficulty`/`dok` sind **Planungshinweise**, keine Messung.
- Die tatsächliche Anpassung kommt aus der **Antwortqualität** (Erwartungs-
  punkte getroffen? Beleg? vernetzt?) und aus dem LevelProfile.
- Wenn eine Antwort stark ist, eskaliert die nächste Frage eine Stufe.
  Wenn sie schwach ist, scaffoldet eine einfachere Nachfrage.
- Der Validator darf `dok` nicht als Wahrheit anzeigen. In der UI höchstens
  „Fragenstufe: Anwendung“ als Auswahl, nie als Note.

### 4.6 Web-Zweitquelle

Die vorhandene Web-Suche (`wikipedia`, optional `tavily`) wird nur nach der
Quellen-Retrieval-Runde genutzt, wenn:

- ein Claim in den Uploads `not_found` ist und extern eingeordnet werden soll,
- eine Vergleichsfrage gewünscht ist („Wie ordnet sich das im Vergleich zu X
  ein?“),
- die Quellen zu dünn sind, um eine sinnvolle Frage zu bauen.

Regeln: Web-Passagen werden als `web` mit URL und Abrufdatum markiert; sie
sind **keine** Wahrheitsinstanz; „nicht in den Quellen“ bleibt „nicht
gefunden“, nicht „falsch“. Web-Fragen sind Vergleichs-/Kontextfragen, keine
Prüfungsfragen über den Wahrheitsgehalt. Die Suchanfragen verlassen das
System; das UI nennt den Anbieter (bestehende Regel).

### 4.7 Zwei Aufrufe statt einem

Der Plan ist batch, das Gespräch ist streaming. Deshalb:

1. **`plan_questions`** (JSON, einmal, ~6 s): alle Fragen mit `spoken`,
   Evidenz, Erwartungspunkten und Nachfrage-Triggern. Wird während des
   Review-UI gestartet und vorgerendert.
2. **`answer_review`** (JSON, bestehend, ~4 s): Urteil, Zitat, `reply`,
   `follow_up`. Das ist die verifizierte Wahrheit und darf nicht gestreamt
   werden, bevor das Zitat geprüft ist.
3. **Optional `spoken_follow_up`** (Plain Text, streamed, ~1–2 s): nur wenn
   eine freie, natürliche Nachfrage gewünscht ist, die keine neue Tatsache
   behauptet. Kein JSON, damit die TTS sofort satzweise starten kann.

Damit wird nie JSON an die TTS gestreamt, und die Quellenprüfung bleibt
trotzdem der Gatekeeper für alles, was eine Tatsache behauptet.

## 5. Wie Lehrende nach Präsentationen fragen

Die Forschung zu mündlichen Prüfungen und Vortrags-Q&A ist sich in den
Grundzügen einig. Das ist keine Liste zum Auswendiglernen, sondern ein
Muster für die Persona und den Planner.

### 5.1 Was typischerweise gefragt wird

| Zweck | Frage | Wann |
|---|---|---|
| Kernaussage | „Was ist die wichtigste Erkenntnis?“ | Einstieg, Überblick |
| Verständnis | „Was bedeutet X in eigenen Worten?“ | Begriff unklar |
| Beispiel | „Können Sie dafür ein Beispiel geben?“ | abstrakt |
| Begründung | „Warum haben Sie X gewählt?“ | Methode/Entscheidung |
| Beleg | „Worauf stützt sich diese Aussage?“ | Behauptung ohne Quelle |
| Abgrenzung | „Wie unterscheidet sich das von Y?“ | Vergleich fehlt |
| Annahmen | „Welche Annahmen stecken dahinter?“ | Modell/Ansatz |
| Grenzen | „Wo sehen Sie die Grenzen?“ | Limitations fehlen |
| Gegenargument | „Was würde dagegen sprechen?“ | einseitig |
| Implikation | „Was folgt daraus für die Praxis?“ | Fazit fehlt |
| Transfer | „Wie würden Sie das auf Z anwenden?“ | Anwendung |
| Validierung | „Wie würden Sie das überprüfen?“ | Evidenz |
| Priorität | „Was würden Sie mit mehr Zeit zuerst machen?“ | Ausblick |

Typische Q&A-Kategorien aus der Praxis: Störgrößen/Confounder, Vergleich mit
anderer Arbeit, Grenzverhalten („Was passiert im Extremfall?“), nächster
Schritt, Methodenwahl, Belastbarkeit der Ergebnisse, Implikationen.
Mündliche Prüfungen nutzen dieselben Achsen, nur stärker als Trichter.

### 5.2 Der Trichter

1. **Offen starten:** „Was ist Ihre Kernaussage?“ – gibt der Person die
   Chance, selbst zu strukturieren.
2. **Klären:** „Was meinen Sie mit X?“ – prüft Begriffe, nicht Wissen.
3. **Begründen:** „Warum dieser Weg?“ – prüft Entscheidungen.
4. **Belegen:** „Worauf stützt sich das?“ – prüft Evidenz.
5. **Begrenzen:** „Wo endet das?“ – prüft Reflexion.
6. **Übertragen:** „Was folgt daraus?“ – prüft Transfer.

Nachfragen sind kein Zusatz, sondern der Kern: Sie zeigen, ob jemand die
Grenze seines Wissens kennt. Gute Prüfende fragen so lange nach, bis sie
wissen, wo das Verständnis endet – nicht, um zu bloßzustellen.

### 5.3 Gesprächsregeln, die die Forschung stützt

- **Eine Frage auf einmal.** Mehrteilige Fragen werden oft nur halb
  beantwortet.
- **Offen fragen**, keine Ja/Nein-Fragen, außer als gezielter Check.
- **Warten.** 3–5 s Think-Time sind normal; nicht in die Stille hineinreden.
- **An die Antwort anknüpfen**, nicht am Skript kleben. Die nächste Frage
  soll zeigen, dass zugehört wurde.
- **Die Worte der Person aufgreifen** („Sie sagten eben …“).
- **Hinweise geben, wenn jemand feststeckt**, statt die Antwort zu verraten.
- **Nicht werten**, nicht „falsch“ sagen, sondern nachfragen.
- **Auf die Quelle zeigen**, wenn es einen Widerspruch gibt, und die Stelle
  nennen („auf Folie 7 steht …“).
- **Freundlich bleiben.** Nervosität ist kein Wissensdefizit.

### 5.4 Student vs. Professor

| | `student` (neugierig, 1. Semester) | `tutor` (Professor/Tutor) |
|---|---|---|
| Ton | einfach, direkt, duzt | präzise, fair, siezt |
| Fragen | „Was bedeutet das?“, „Warum ist das wichtig?“, „Kannst du ein Beispiel geben?“ | „Wie belastbar ist das?“, „Welche Annahmen?“, „Wie grenzen Sie das ab?“ |
| Nachfragen | „Und was heißt das für …?“ | „Worauf stützt sich das?“, „Was wäre ein Gegenbeispiel?“ |
| Ziel | Verständnis, Beispiel, Alltag | Methode, Evidenz, Grenzen, Transfer |

Die Persona ändert nur die Stimme und die Frageform, nicht die Quellenbindung.

## 6. Niveau live erkennen

### 6.1 Was „Niveau“ hier heißt

Nicht Intelligenz, nicht Note, nicht Persönlichkeit. Gemeint ist die
**konzeptionelle Tiefe des Vortrags**: Werden Begriffe nur genannt oder
erklärt? Gibt es Beispiele, Ursachen, Belege, Grenzen? Wie komplex sind die
Sätze? Wie flüssig ist der Vortrag?

Das Ergebnis ist eine **Heuristik** für die Fragenauswahl, kein Score. In der
UI wird höchstens die gewählte Fragenstufe gezeigt, nie eine Zahl oder Note.

### 6.2 Signale

| Signal | Messung | Warum |
|---|---|---|
| Begriffsabdeckung | Anteil der Quellen-Keyterms, die im Transkript vorkommen | Thema erfasst? |
| Begriffserklärung | Definitionen/Beispiele in der Nähe der Keyterms | verstanden oder nur zitiert? |
| Kausalität | „weil“, „dadurch“, „folglich“, „daraus folgt“, „sodass“ pro 100 Wörter | Erklärungstiefe |
| Evidenz | „laut“, „Studie“, „Daten“, „Ergebnis“, „belegt“, „gemessen“ pro 100 Wörter | Belegnutzung |
| Struktur | „zunächst“, „danach“, „im nächsten Schritt“, „zusammenfassend“ | roter Faden |
| Limitierungen | „allerdings“, „Grenze“, „einschränken“, „nicht“, „schwierig“ | Reflexion |
| Lexikalische Vielfalt | Content-Word-TTR (Stoppwörter entfernt) | fachliche Breite |
| Satzkomplexität | mittlere Satzlänge, Nebensatzquote (Komma + Konjunktion) | syntaktische Tiefe |
| Delivery | Tempo, Pausen, Füllwortrate (vorhanden) | Flüssigkeit |

Wichtig: ASR-Fehler verzerren diese Signale. Deshalb nur Bänder mit
Konfidenz, keine Punktzahl, und erst ab genügend Text (≥ 60 s, ≥ 80 Wörter).

### 6.3 Drei Bänder

| Band | typische Signale | Fragenmix |
|---|---|---|
| `grundlagen` | wenige Keyterms, kaum Erklärungen/Belege, kurze Sätze, viele Füller | 2× Verständnis, 1× Anwendung |
| `anwendung` | Keyterms genannt und teils erklärt, Beispiele, etwas Kausalität | 1× Verständnis, 1× Anwendung, 1× Analyse |
| `vertiefung` | Keyterms erklärt, Belege, Kausalität, Grenzen, komplexe Sätze | 1× Anwendung, 1× Analyse, 1× Bewertung/Transfer |

Berechnung: gewichtete Summe der normierten Signale, Schwellen kalibrieren
wir an 3–5 synthetischen Demo-Transkripten; Konfidenz aus Textmenge und
Signalübereinstimmung. Glättung per EMA (α ≈ 0,3), Update alle 30 s, damit
das Band nicht flattert.

### 6.4 Live vs. final

- **Live:** während des Vortrags aus dem `WS /speech/live`-Text, alle 30 s.
  Nur intern; kein Live-Hinweis „Sie sind auf Grundlagen-Niveau“ (das wäre
  eine Bewertung und würde ablenken).
- **Final:** nach dem Stoppen aus dem vollständigen Transkript. Dieses Profil
  geht in den QuestionPlan.
- **Antwortqualität:** nach jeder Antwort aus `expected_points` + Evidenz.
  Das ist das stärkere Signal für die nächste Frage als das Vortragsprofil.

### 6.5 Adaptivität, die nicht überfordert

- Starte leicht über dem geschätzten Band (ZPD), nicht darunter.
- Bei starker Antwort: eine Stufe eskalieren (Anwendung → Analyse →
  Bewertung).
- Bei schwacher Antwort: scaffolden, nicht eskalieren („Können Sie zuerst
  ein Beispiel geben?“).
- Immer eine quellengebundene Frage behalten, unabhängig vom Band.
- Maximal eine Eskalation pro Zug; kein Verhör.

## 7. ElevenLabs: Sprechen, nicht formulieren

### 7.1 Modell und Stimme

| Entscheidung | Empfehlung | Grund |
|---|---|---|
| Modell | `eleven_flash_v2_5` | ~75 ms Inferenz, ~190 ms TTFA gemessen, 32 Sprachen inkl. Deutsch |
| Qualitätsstufe | `eleven_v3_conversational` testen | ausdrucksstärker, aber höhere Latenz; nur wenn die Demo es trägt |
| Sprache | `language_code=de` | erzwingt deutsche Aussprache |
| Stimme | native deutsche Stimme | Default-Voices tragen oft einen englischen Akzent |
| Normalisierung | `apply_text_normalization=on` | Flash v2.5 hat sie standardmäßig **aus**; Zahlen/Daten/Einheiten sonst falsch |
| Aussprache | Alias-Einträge im Pronunciation Dictionary | Fachbegriffe, Akronyme, Namen; IPA nur für Englisch |
| Chunk-Größe | 1–2 Sätze, < 1.000 Zeichen | kürzere Chunks = niedrigere Latenz, aber schlechtere Prosodie |

### 7.2 Streaming

- **Vorgerenderte Fragen/Filler:** HTTP-Streaming oder normale Synthese,
  im Browser als Blob cachen. Beim Abspielen gibt es keine TTS-Latenz.
- **Dynamische Nachfragen:** WebSocket-Streaming, `auto_mode=true`,
  satzweise Textstücke, `flush` am Zugende. `previous_text`/`next_text` für
  Prosodie-Kontinuität (nur beim ersten Chunk setzen).
- **Niemals** JSON, Markdown, Aufzählungen oder Zitatmarker an die TTS geben.
  Erst `spoken` extrahieren, normalisieren, dann streamen.
- Bei LLM-Token-Streaming: an Satzgrenzen puffern (Deutsch: „.“, „?“, „!“,
  aber nicht bei „z. B.“, „Dr.“, „bzw.“, Dezimalzahlen). Nicht tokenweise
  senden.
- `output_format`: PCM (z. B. 24 kHz) für Web Audio oder MP3 für
  `<audio>`; PCM vermeidet Decode-Lücken.

### 7.3 Key und Proxy

Der API-Key bleibt serverseitig. Das Frontend spricht mit
`POST /api/tts/stream` (oder `WS /api/tts`), das Backend mit ElevenLabs.
Kein `NEXT_PUBLIC_`-Key, kein Key im Browser.

### 7.4 Filler

- **Vorgerendert**, nicht zur Laufzeit generiert. Ein Pool von 8–10 Varianten
  pro Persona, 2–3 s lang.
- Beispiele: „Ich schaue kurz in Ihre Unterlagen.“, „Einen Moment, ich prüfe
  eine Stelle.“, „Gute Frage, lassen Sie mich kurz nachsehen.“
- Kontextbezogen auswählen (z. B. „Quelle prüfen“ vs. „Frage vorbereiten“),
  nicht zufällig wiederholen.
- Maximal ein Filler pro Zug; bei > 6 s Wartezeit ein zweiter, anderer.
- Forschung: Latenz > 2 s wirkt unnatürlich, > 4 s problematisch; natürliche
  Filler verbessern die wahrgenommene Antwortzeit bei 4–6,5 s. Zu viele oder
  zu kurze Filler können den Agenten weniger intelligent wirken lassen.
- Nicht in die Stille nach einer Frage hineinreden: Nach der Frage ist
  **Wait-Time** (3–5 s) gewollt, kein Filler.

### 7.5 Echo und Barge-in

Für die Demo: **Halbduplex** – Mikro stumm, während die TTS spielt. Das
vermeidet Echo, Selbstunterbrechung und AEC-Tuning. Kopfhörer einplanen.
Barge-in (TTS stoppen, sobald Sprache erkannt wird) ist eine spätere
Politur, kein MVP.

## 8. Build-Reihenfolge

| # | Schritt | Aufwand | Ergebnis |
|---|---|---|---|
| 1 | `QuestionPlan`-Schema + Prompt (plan-first, `spoken`, `expected_points`, `follow_ups`) | 2 h | Fragen sind testbar und TTS-fertig |
| 2 | Validator (Frageform, Länge, Refs, Zitat, kein Leck) | 1–2 h | keine kaputten Fragen |
| 3 | Filler-Pool + TTS-Proxy + Vorrendern der 3 Fragen | 2–3 h | erster Ton < 300 ms |
| 4 | Frontend-Audioqueue + Auto-Endpointing + Acknowledgment | 2–3 h | Gesprächsfluss |
| 5 | LevelProfile (final + live) und Fragenmix | 2 h | adaptives Niveau |
| 6 | Streaming-Nachfragen (satzweise) | 2 h | dynamische Vertiefung |
| 7 | Scribe Realtime / Barge-in (optional) | 2–3 h | mehr Natürlichkeit |

Wenn die Zeit knapp ist: 1–4 bauen, 5–7 weglassen. Der Demo-Nutzen liegt in
1–4; die Niveau-Anpassung ist ein Bonus, kein Rettungsanker.

## 9. Schnittstellen (Vorschlag)

Bestehend:

- `POST /questions` → `QuestionResult`
- `POST /questions/answers` (Text) → `AnswerReview`
- `POST /questions/answers/voice` (Audio) → `AnswerReview`
- `WS /speech/live` → Wörter/Text

Neu:

- `GET /questions/plan/{session_id}` oder im `QuestionResult`:
  `QuestionPlan` mit `profile`, `questions`, `generated_at`.
- `POST /tts/stream` (Backend-Proxy): `{text, voice_id, model_id}` →
  `audio/*` oder SSE/Chunked.
- `POST /presentation/profile` (optional): Transkript + Quellen →
  `LevelProfile` (für Debug/UI).

`Question` erweitern:

```python
spoken: str
dok: int | None
difficulty: int | None
expected_points: list[str]
follow_ups: list[FollowUp]
level_band: str | None
```

`AnswerReview` erweitern:

```python
matched_points: list[str]   # welche Erwartungspunkte genannt wurden
answer_depth: Literal["surface", "connected", "extended"] | None
next_difficulty: int | None
```

Alles optional und abwärtskompatibel; die bestehende UI ignoriert neue Felder.

## 10. Risiken und ehrliche Grenzen

- **Keine Validierung der Niveau-Heuristik.** Die Signale sind plausibel und
  forschungsnah, aber nicht an echten Vorträgen kalibriert. Als
  Fragenauswahl-Hilfe kennzeichnen, nicht als Messung.
- **LLM-Schwierigkeitslabels sind unzuverlässig.** Deshalb entscheidet die
  Antwortqualität, nicht das Label.
- **ASR-Fehler verzerren Komplexitätsmaße.** Besonders bei Fachbegriffen und
  Namen; im Zweifel das Signal verwerfen.
- **Zitat ≠ Korrektheit.** Ein wörtliches Zitat belegt, dass die Stelle
  existiert, nicht dass die Interpretation stimmt. Die bestehende
  Formulierung „gestützt/widerspricht/nicht gefunden“ beibehalten.
- **Web-Quellen sind heterogen.** Wikipedia/Tavily können veraltet,
  vereinfacht oder fachlich falsch sein; nur als Zweitquelle und klar
  markiert.
- **TTS-Qualität ist stimmenabhängig.** Eine deutsche Stimme testen; Flash
  v2.5 kann bei Zahlen ohne Normalisierung patzen.
- **Cloud-Audio.** Scribe/TTS mit ElevenLabs bedeutet, dass Audio/Text das
  Gerät verlassen. Wenn „alles lokal“ im Pitch steht, ist das ein Bruch.
- **Filler können nerven.** Maximal einer, variiert, nie nach einer Frage.
- **Keine Noten, keine Punktzahlen, keine Personenbewertung.** Auch das
  Niveau-Profil nicht als solches ausgeben.

## 11. Quellen

- Plan-first Question Generation: Li & Zhang, „Planning First, Question
  Second“, ACL Findings 2024:
  <https://aclanthology.org/2024.findings-acl.280>
- LLM-Fragenschwierigkeit ≠ empirische Schwierigkeit (2026):
  <https://arxiv.org/html/2609.27063v1>
- Mündliche Prüfung/Trichter/Nachfragen:
  <https://www.abrsm.org/sites/default/files/2024-04/Guide%20to%20the%20Teaching%20Viva%20Voce.pdf>,
  <https://otl.uoguelph.ca/system/files/Guidelines%20for%20Oral%20Examinations_0.pdf>,
  <https://teachlearn.leedsbeckett.ac.uk/-/media/files/clt/a-short-guide-to-oral-assessment-by-gordon-joughin.pdf>
- Bloom/DOK/SOLO:
  <https://tips.uark.edu/using-blooms-taxonomy>,
  <https://www.structural-learning.com/post/webbs-depth-of-knowledge>
- ZPD/Scaffolding:
  <https://www.sciencedirect.com/science/article/pii/S1871187121000377>,
  <https://link.springer.com/content/pdf/10.1007/s10648-010-9127-6.pdf>
- Typische Q&A-Kategorien:
  <https://tosea.ai/blog/academic-conference-15-minute-talk-guide-2026>,
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC3059906/>
- Filler/Latenz:
  <https://arxiv.org/pdf/2507.22352>,
  <https://dl.acm.org/doi/10.1145/3716553.3750792>
- Lexikalische/syntaktische Komplexität:
  <https://academic.oup.com/applij/advance-article/doi/10.1093/applin/amag033/8676662>,
  <https://arxiv.org/html/2104.08529v2>
- ElevenLabs Latenz/Streaming:
  <https://elevenlabs.io/docs/eleven-api/concepts/latency>,
  <https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization>,
  <https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input>
- ElevenLabs TTS-Best-Practices (Normalisierung, Wörterbuch):
  <https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices>
- ElevenLabs Modelle/Sprachen:
  <https://elevenlabs.io/docs/overview/models>,
  <https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support>
- ElevenLabs Custom LLM (SSE, OpenAI-kompatibel):
  <https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm>
- Bestehende Implementierung: `backend/app/questions/pipeline.py`,
  `backend/app/questions/models.py`, `backend/app/speech/live.py`,
  `frontend/src/features/questions/voice.ts`

## 12. Deep Research (24.10.2026)

Vollständige Evidenzbasis: `docs/11-deep-research-validation.md`.

**Bestätigt.** Plan-first (erst Erwartungspunkte/Evidenz, dann Frage) ist für
Kontrollierbarkeit und Quellenbindung sinnvoll; die Evidenz stützt
Fragenqualität, nicht einen Lerngewinn. Ein einzelner „goldener“ Antwortplan
ist zu eng: mehrere akzeptable Punkte, Evidenz-IDs und eine Must-not-ask-Liste
sind nötig (Li & Zhang 2024; Dugan et al. 2022).

### 12.1 Was echte Lehrkräfte tun

- **3–5 s warten**, bei „warum/wie“ 5–10 s; nach der Antwort 2–3 s
  nachwarten. Häufigster Fehler ist <1 s Wartezeit (Rowe 1974; Tobin 1987).
- **IRF statt IRE:** anknüpfen, revoicen, nachfassen statt nur bewerten
  (Nystrand et al. 1997; O’Connor & Michaels 1993).
- **Falsche Antwort:** klären → Hinweis → Retry; nicht „falsch“, nicht jede
  Formulierung korrigieren (Lyster & Ranta 1997).
- **Teilantwort:** einmal nachfassen, dann fokussieren; ein Hinweis, dann
  weiter (Graesser et al. 1995; van de Pol et al. 2010).
- **„Ich weiß es nicht“:** als Information behandeln, 3 s warten, „Was wissen
  Sie sicher?“; später einmal zurückkommen.
- **Aufgaben-/Prozesslob**, kein Personenlob; Lob sparsam (Hattie &
  Timperley 2007; Mueller & Dweck 1998; Sisk et al. 2018).
- **Fokussieren statt trichtern**, accountable talk („Woher wissen Sie das?“),
  kurze Agent-Turns, sparsame Backchannels, Abschluss in 60–90 s.
- **Deutsch:** fragend-entwickelnder Unterricht ist IRF-dominiert und oft zu
  schnell; das ist eine Beschreibung, keine Empfehlung (Reiss 1983; Heinze &
  Erhard 2006).

### 12.2 Harte Grenzen gegen Endlosschleifen

| Grenze | Wert |
|---|---|
| Gespräch | 8–10 min Ziel, Hard Stop 10 min (12 min inkl. Abschied) |
| Hauptfragen | 3–5, Default 4 |
| Follow-ups | Research/Plan: 1 pro Frage; max. 2 nur bei klarem Widerspruch. Implementiert: max. 3 Follow-ups pro Runde, 6 Turns, TTL 600 s. |
| Wartezeit | 3–5 s nach der Frage; 2–3 s nach der Antwort |
| Answer-Timeout | 10 s, dann Hinweis oder weiter |
| Agent-Turns | ≤15 |
| Stille | 3 s: eine neutrale Nachfrage; 8–10 s: Hinweis/weiter; 2 Timeouts in Folge: früh schließen |
| Neues Thema | keins nach Minute 8; letzte 90 s Zusammenfassung |

Die Zahlen sind Safety-Rails, keine Pädagogik. Ergänze einen adaptiven Stop:
alle Erwartungspunkte abgedeckt, keine neue Evidenz, Ermüdungssignal oder zwei
Timeouts. `QuestionConfig.max_questions` ist im Code jetzt auf **5** begrenzt;
der Answer-Review liefert höchstens **eine** Nachfrage.

### 12.3 Sofort antworten/prüfen oder erst im Review?

**Zweistufig.** Der Agent prüft die Antwort direkt, gibt aber nur kurzes
aufgabenbezogenes Feedback („Das deckt X; der Beleg für Y fehlt noch“), keine
Note und kein „falsch“. Bei falscher Antwort: klären, Hinweis, ein Retry; bleibt
es falsch, im Review eine explizite Korrektur mit Quelle. Bei Teilantwort:
einmal nachfassen, dann weiter. Bei ASR-Unsicherheit nachfragen statt
bewerten. Die vollständige Evidenz (Zitat, Seite/Folie, drei Urteile,
Alternative) erscheint im finalen Review. Der Agent beantwortet seine eigene
Frage nicht.

Begründung: Retrieval Practice und Feedbackqualität sprechen für zeitnahe,
knappe Rückmeldung; die Timing-Evidenz ist gemischt, und ein vorschnelles
Urteil bei Teilantworten/ASR-Fehlern ist riskanter als ein Hinweis. Details:
`docs/11-deep-research-validation.md` §4.

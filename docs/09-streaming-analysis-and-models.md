# Inkrementelle Analyse, Fact-Check-Lanes und Gemini-Modellwahl

> Research-Stand vom 24.10.2026, kein aktueller Implementierungsvertrag.
> Der Web-Dialog nutzt heute ElevenLabs; aktueller Aufbau und Grenzen:
> [Review und Agent](07-review-and-agent.md), [Architektur](03-architecture.md).

Stand: 24.10.2026. Ergänzt `docs/08-question-agent-architecture.md`.
Research + Zielarchitektur, keine umgesetzte Pipeline.

## 0. Kurzantwort

1. **Transkript während des Vortrags an ein LLM streamen: ja, aber als
   strukturierte Delta-Updates alle 20–30 s, nicht als einen immer größer
   werdenden Chat.** Das LLM pflegt einen kompakten Zustand (Claims, Themen,
   Keyterms, Niveau-Signale, Frage-Keimzellen). Der Zustand liegt im Code/DB,
   nicht im Kontextfenster.
2. **Der Live-Lauf liefert Kandidaten und Prefetch, nicht die Wahrheit.**
   Endgültige Urteile entstehen nach dem Stoppen aus dem finalen
   Batch-Transkript. Grund: ASR korrigiert sich, Aussagen spannen über Sätze,
   und Live-Fact-Checking ist nachweislich unzuverlässig.
3. **Fact-Check: eine autoritative Pipeline am Ende, parallelisiert; davor
   eine billige Live-Vorlauf-Lane.** Nicht zwei konkurrierende
   Fact-Check-Implementierungen, nicht „nur ganz am Ende“ und nicht „alles
   live“.
4. **Fragebereitschaft: zwei Question-Lanes.** Fragen ohne Fact-Check-Abhängig-
   keit (Verständnis, Anwendung, Analyse) starten sofort nach dem Stoppen;
   quellengebundene Fragen kommen dazu, sobald der Fact-Check fertig ist.
   Die erste Frage ist damit hörbar, bevor der Fact-Check durch ist.
5. **Gemini:** `gemini-3.8-flash` als Default, `thinking_level=low` für den
   Live-Lauf und `high` für den finalen Plan/Judge. Optional
   `gemini-3.1-pro-preview` mit `high` nur für den finalen Lauf, wenn maximale
   Reasoning-Qualität wichtiger ist als Preview-Risiko. Live-Kostenoptimierung:
   `gemini-3.1-flash-lite` oder `gemini-3.5-flash-lite` mit `minimal`.

## 1. Warum nicht „alles in einen Live-Chat streamen“

Ein einzelner, immer weiter wachsender LLM-Chat über 20–30 Minuten hat drei
Probleme:

- **Context Rot:** Mehr Tokens bedeuten nicht mehr Verständnis. Frühe Fehler,
  Wiederholungen und ASR-Rauschen bleiben im Kontext und verdrängen das
  Relevante. Die Forschung zu langen Kontexten zeigt: Modelle nutzen
  Mid-Context-Informationen schlechter, und die Qualität sinkt mit unnötiger
  Historie.
- **Kosten und Latenz:** Jeder Turn würde die komplette Historie erneut
  verarbeiten. Bei 30 Minuten und 30-Sekunden-Takt sind das schnell
  sechsstellige Tokenmengen.
- **Kopplung an vorläufige Transkripte:** Live-ASR liefert Hypothesen, die
  später korrigiert werden. Ein Claim, der auf einem ASR-Fehler beruht, darf
  nicht in die endgültige Bewertung wandern.

Besser: **inkrementelle, strukturierte Zustands-Updates**. Jeder Aufruf sieht
nur das neue stabile Segment plus eine kompakte Zusammenfassung des Zustands.
Der Zustand wird im Code zusammengeführt, dedupliziert und gespeichert.

### 1.1 Was „stable“ heißt

Die vorhandene Live-ASR (`WS /speech/live`) liefert Wörter und Text mit einem
Cursor; endgültige Zeiten sind absolut. Für die Analyse gilt:

- **Nur stabile/finalisierte Sätze** an das LLM geben, keine Interims-Hypothesen.
- Bei Korrekturen im finalen Batch-Transkript: den finalen Lauf gewinnen
  lassen und provisorische Claims verwerfen.
- Ein Satz, der über eine Fenstergrenze läuft, wird erst analysiert, wenn er
  vollständig ist. Die vorhandene Satzbildung aus `app/factcheck/transcript.py`
  ist dafür die Referenz.

## 2. Zielarchitektur: zwei Lanes, ein Zustand

```
Während des Vortrags
  WS /speech/live ──► stabile Sätze
                         │
                         ▼ alle 20–30 s
              IncrementalAnalyzer (billiges Modell, JSON)
                         │
                         ▼ Delta
              TalkState (Code/DB/Redis)
                ├─ claims[]        (provisorisch, dedupliziert)
                ├─ topics[]
                ├─ key_terms[]
                ├─ level_signals{}
                ├─ question_seeds[]
                └─ last_analyzed_ms
                         │
                         ▼
              Retrieval-Prefetch für neue Claims (pgvector)

Nach dem Stoppen
  finales Batch-Transkript + TalkState
        │
        ├─ Lane A: Finaler Fact-Check (bestehendes run_fact_check, parallel)
        ├─ Lane B: Profil + Fragen ohne Fact-Check-Abhängigkeit
        └─ Lane C: TTS-Prerender für Lane B + Filler
                         │
                         ▼ Lane A fertig
              Lane D: quellengebundene Fragen + Ranking + Validierung
                         │
                         ▼
                 QuestionPlan → Session
```

### 2.1 Live-Lane (provisorisch)

Aufgabe:

- check-würdige Behauptungen erkennen (Zahlen, Daten, Namen, Kausalität,
  Superlative, Definitionen),
- pro Claim eine kurze Suchanfrage formulieren,
- Themen/Keyterms fortschreiben,
- Niveau-Signale sammeln,
- Frage-Keimzellen erzeugen (Verständnis/Anwendung), die später zu echten
  Fragen werden können,
- Retrieval für neue Claims vorab ausführen und cachen.

Nicht Aufgabe:

- endgültige Urteile,
- `fact`-Events schreiben,
- dem Nutzer „falsch/richtig“ anzeigen.

Ausgabe pro Delta (JSON-Schema, strikt):

```json
{
  "new_claims": [
    {
      "text": "…",
      "sentences": [12, 13],
      "check_worthy": true,
      "priority": 1,
      "query": "kurze Suchanfrage"
    }
  ],
  "topic_updates": ["…"],
  "key_terms": ["…"],
  "level_signals": {
    "term_coverage": 0.42,
    "causal_markers": 3,
    "evidence_markers": 1,
    "limitation_markers": 0
  },
  "question_seeds": [
    {"kind": "comprehension", "text": "…", "sentences": [12]}
  ]
}
```

Merge-Regeln im Code:

- Claim-Dedup über normalisierten Text **und** Embedding-Ähnlichkeit **und**
  Zeitüberlappung. Schwelle konservativ (z. B. Cosine ≥ 0,90); lieber ein
  Duplikat zu viel als zwei widersprüchliche Einträge.
- Wiederholte Claims: einen Datensatz behalten, alle Timestamps verlinken.
- `check_worthy=false` verwerfen, aber den Satz für das Niveau-Profil behalten.
- Maximal N offene Claims (z. B. 20); ältere, bereits geprüfte Claims in eine
  kompakte Zusammenfassung verschieben.

### 2.2 Finale Lane (autoritativ)

Nach dem Stoppen:

1. **Finales Batch-Transkript** verwenden (nicht das Live-Transkript).
2. **Claim-Extraktion** auf dem vollständigen Transkript; die Live-Claims sind
   nur ein Prior/Cache, keine Wahrheit.
3. **Retrieval** pro Claim; gecachte Passage-Treffer aus der Live-Lane
   wiederverwenden, wenn der normalisierte Claim übereinstimmt.
4. **Judge** pro Claim, parallel (bestehendes `run_fact_check` mit
   `ThreadPoolExecutor`, Workers z. B. 6–8 bei API-Modell).
5. **Zitatprüfung** im Code (`quote_in_text`) bleibt der Gatekeeper.
6. Erst jetzt `fact`-Events schreiben.

Die finale Lane nutzt **denselben Code** wie heute. Die Live-Lane ist ein
separater Pre-Pass, keine zweite Wahrheit.

### 2.3 Warum nicht nur am Ende?

„Nur am Ende“ ist am einfachsten und qualitativ am saubersten, kostet aber die
komplette Latenz am Stopp-Zeitpunkt: Claim-Extraktion + Retrieval + Judge
dauern heute gemessen **10,1 s** (lokales Modell). Mit einem Cloud-Modell und
Parallelisierung sinkt das, bleibt aber spürbar.

Die Live-Lane verkürzt diesen Pfad, weil sie:

- die Claim-Kandidaten schon hat,
- die Quellen-Treffer schon vorab geholt hat,
- das Niveau-Profil schon gebaut hat,
- die nicht-quellengebundenen Fragen schon formulieren kann.

Der finale Lauf muss dann „nur noch“ prüfen, ranken und die quellengebundenen
Fragen ergänzen.

### 2.4 Warum nicht alles live?

- **ASR-Korrekturen:** Das Batch-Transkript ist die Zeitbasis; Live-Claims
  können auf falsch erkannten Wörtern beruhen.
- **Satzübergreifende Claims:** Eine Aussage wird oft erst über zwei Sätze
  vollständig; ein 2-s-Fenster sieht sie nicht.
- **Widersprüche später:** Der Vortrag kann eine frühere Aussage später
  präzisieren oder korrigieren. Ein Live-Urteil wäre verfrüht.
- **Qualität:** Live-Fact-Checking-Forschung zeigt bescheidene Werte
  (Claim-Detection-F1 ~0,59–0,60, Veracity ~0,53 bei Mistral-7B in LiveFC).
  Das reicht für Kandidaten, nicht für Urteile.
- **Ablenkung:** Live-„falsch“-Hinweise würden den Vortrag stören und der
  Projektregel „keine erfundenen Scores, keine Bewertung der Person“
  widersprechen.

## 3. Fragebereitschaft: zwei Question-Lanes

Der Trick für „schnell fertig am Ende“ ist nicht, schneller zu reasoning, sondern
**nicht auf alles zu warten**.

| Lane | Inhalt | Abhängigkeit | Start | Ziel |
|---|---|---|---|---|
| **B** | LevelProfile, Topic, Keyterms, `comprehension`, `application`, `analysis` | nur Transkript + Quellen | sofort nach Stopp | **3–5 s** |
| **A** | `contradiction`, `unsupported`, `gap`, ggf. Web-Vergleich | finaler Fact-Check | sofort nach Stopp, parallel | **8–12 s** |
| **D** | Ranking, Dedup, Validierung, Zusammenführung | B + A | wenn A fertig | **+1–2 s** |

Die Session startet mit der ersten Frage aus Lane B. Lane A liefert die
quellengebundene zweite/dritte Frage nach. So ist die erste Frage hörbar,
während der Fact-Check noch läuft.

Falls die erste Frage zwingend quellengebunden sein soll (z. B. ein
offensichtlicher Widerspruch), muss Lane A zuerst fertig sein. Für eine
Lehrer-Simulation ist eine Verständnisfrage als Einstieg natürlicher und
didaktisch besser.

### 3.1 Reihenfolge im fertigen Plan

1. Verständnisfrage (Lane B) – fairer Einstieg.
2. Quellengebundene Frage (Lane A) – Widerspruch/Beleg.
3. Anwendung/Analyse (Lane B) – Transfer.
4. Optional Bewertung/Transfer (Lane B) – wenn Niveau und Zeit es tragen.

## 4. Gemini: welches Modell genau

Stand 24.10.2026. Preise sind USD pro 1 Mio. Tokens (Input/Output).

| Modell | Kontext | Thinking | Preis | Rolle |
|---|---|---|---|---|
| **`gemini-3.8-flash`** | 1M / 65k | low, medium, high (Default medium) | **$0,75 / $3,75** (Intro bis 31.12.2026; regulär $1,50 / $7,50) | **empfohlener Final-Default**; Live optional |
| `gemini-3.6-flash` | 1M / 65k | low, medium, high | $0,75 / $3,75 | stabiler Fallback |
| `gemini-3.1-flash-lite` | 1M / 64k | minimal, low, medium, high (Default minimal) | $0,25 / $1,50 | **aktueller Test-Default**, billige Live-Lane |
| `gemini-3.5-flash-lite` | 1M | minimal, low, medium, high | $0,30 / $2,50 | neuere Lite-Alternative |
| `gemini-3.1-pro-preview` | 1M / 65k | low, medium, high | $2,00 / $12,00 (Cache-Read $0,20) | maximale Reasoning-Qualität, **Preview-Risiko** |
| `gemini-4-argon` | 1M | – | – | nicht für den Hackathon; Zugang/Preis prüfen |

**Empfehlung:**

- **Aktueller Test-Default:** `gemini-3.1-flash-lite` mit
  `thinking_level=minimal` für Live und schnelle Tests.
- **Produktions-Default:** `gemini-3.8-flash` (`low` live, `high` final).
- **Kostenoptimiert:** `gemini-3.1-flash-lite` minimal für die Live-Lane;
  `gemini-3.8-flash` high für den finalen Lauf.
- **Maximale Qualität:** `gemini-3.1-pro-preview` high **nur** für den finalen
  Judge/Plan, nicht für die Live-Lane. Preview-Modelle können sich ändern oder
  verschwinden; Modell-ID pinnen, keinen `latest`-Alias verwenden.
- **Nicht** `gemini-3.8-live` für Textanalyse und **nicht** Gemini-TTS für die
  Stimme. Live-Modelle sind für Sprache gedacht; die Stimme bleibt
  ElevenLabs.

Warum Flash statt Pro als Default:

- `gemini-3.8-flash` ist stabil, 1M Kontext, strukturierte Ausgabe, Caching,
  Deutsch, und laut Google das „intelligenteste Flash“-Modell (Sept. 2026).
- Der finale Lauf ist **kein** „denke von null über 30 Minuten nach“-Task,
  sondern „prüfe diese Kandidaten, ranke sie, formuliere Fragen“. Dafür ist
  Flash mit hohem Thinking-Level stark genug.
- Pro ist ~2,7× teurer und ein Preview-Modell; der Qualitätsgewinn muss auf
  euren deutschen Fachtexten erst gemessen werden.

### 4.1 API-Details, die zählen

- **Strukturierte Ausgabe:** `response_mime_type="application/json"` +
  `response_json_schema`. Der OpenAI-kompatible Endpoint akzeptiert im Test
  auch `response_format={"type":"json_object"}`, ist dafür aber nicht offiziell
  dokumentiert; für Garantien die native API nutzen.
- **Thinking:** `thinking_level` explizit setzen. 3.8 Flash kennt **kein**
  `minimal`; für die Live-Lane `low`, für den finalen Lauf `high`. Thinking-
  Tokens zählen als Output und kosten mit.
- **Caching:** Quellen + Rubrik + Prompt-Präfix an den Anfang; implizites
  Caching greift ab 4.096 Tokens (3.8 Flash / 3.1 Pro). Innerhalb weniger
  Minuten wiederverwenden.
- **Temperatur:** 0–0,2 für Extraktion/Judge; 0,2–0,4 für Frageformulierung.
- **Max Output:** groß genug für Thinking + JSON; bei `high` nicht knapp
  setzen, sonst wird die Antwort abgeschnitten.
- **Parallelität:** Judge-Aufrufe parallel, bounded (4–6). Bei Gemini ist TPM
  der wahrscheinliche Engpass, nicht die lokale GPU; 429 mit Backoff behandeln.
- **Kein Batch API** für den Live-Pfad; Batch nur für Offline-Evaluation.

### 4.2 Grobe Kosten

30-Minuten-Vortrag, ~5.000 Wörter ≈ 7.000 Tokens, Quellen ≈ 20.000 Tokens,
Prompt ≈ 2.000 Tokens.

- Finaler Lauf mit 3.8 Flash high: ~30k Input × $0,75/1M ≈ **$0,02**;
  Output inkl. Thinking ~5–10k × $3,75/1M ≈ **$0,02–0,04**. Zusammen Cent.
- Live-Lane alle 30 s (60 Aufrufe) mit Flash-Lite minimal und Caching:
  grob **$0,10–0,40**; mit 3.8 Flash low eher **$0,30–1,00**.
- 3.1 Pro high für den finalen Lauf: ~**$0,06–0,12** plus Thinking.

Für eine Demo sind die Kosten irrelevant; die Latenz und die Zuverlässigkeit
sind die Treiber.

## 5. Fact-Check: gleiche Pipeline, parallele Lane, oder Ende?

**Empfehlung: eine autoritative Pipeline am Ende, die sofort startet und
parallelisiert; davor eine provisorische Live-Lane.**

Konkret:

1. **Live:** Claim-Kandidaten + Retrieval-Prefetch + Niveau. Keine Urteile.
2. **Stopp:** finales Transkript.
3. **Parallel:**
   - Lane A: `run_fact_check` (bestehender Code) mit finalem Transkript.
   - Lane B: Profil + nicht-quellengebundene Fragen.
   - Lane C: TTS-Prerender für Lane B + Filler.
4. **Wenn A fertig:** quellengebundene Fragen ergänzen, ranken, validieren,
   preren.
5. **Events:** nur die finale Lane schreibt `fact`-Events.

Das ist **nicht** „dieselbe Pipeline für alles“ und **nicht** „nur am Ende“,
sondern: ein Wahrheitspfad, ein Vorlauf, parallele Fragen-Lanes.

### 5.1 Konkrete Optimierungen an der bestehenden Pipeline

- **Claim-Extraktion parallelisieren:** `extract_claims` läuft heute sequentiell
  über Fenster. Bei einem Cloud-Modell die Fenster parallel schicken und
  Ergebnisse mergen (Satznummern bleiben die Referenz).
- **Judge-Workers erhöhen:** `ThreadPoolExecutor(4)` auf 6–8 erhöhen, solange
  TPM/Rate-Limits es zulassen; 429 mit Backoff.
- **Retrieval cachen:** pro normalisiertem Claim + Collection einen Cache-Key.
  Die Live-Lane füllt ihn vor; die finale Lane liest ihn.
- **Claim-Matching:** wiederholte Aussagen nur einmal judgen, alle Timestamps
  verlinken.
- **Check-Worthiness:** nicht jeden Satz prüfen. Zahlen, Daten, Namen,
  Kausalaussagen, Superlative, Definitionen zuerst; Meinungen und reine
  Übergangssätze überspringen.
- **Fallback:** Wenn Lane A zu lange braucht, startet die Session trotzdem mit
  Lane B; die quellengebundene Frage kommt nach. Das ist besser als 10 s
  Stille.

### 5.2 Was sich nicht ändert

- Der Code prüft weiterhin, dass das Zitat wörtlich im Chunk steht.
- „Nicht gefunden“ bleibt „nicht gefunden“, nicht „falsch“.
- Keine Punkte, keine Noten, keine Personenbewertung.
- Web bleibt Zweitquelle.

## 6. Sicherheits- und Datenschutzgrenzen

- **Cloud:** Gemini verarbeitet Transkript und Quellen. Wenn „alles lokal“ im
  Pitch steht, ist das ein Bruch. Entweder bewusst kommunizieren oder ein
  lokales Modell außerhalb dieses Projekts betreiben.
- **Modell-IDs pinnen:** `gemini-3.8-flash` ist stabil, aber Preise/Modelle
  ändern sich; kein `latest`-Alias.
- **Keine Live-Urteile:** Die Live-Lane darf nur intern Kandidaten sammeln.
  Ein Live-„falsch“ wäre fachlich und didaktisch riskant.
- **ASR-Fehler:** Das finale Batch-Transkript ist die Wahrheit; Live-Claims
  werden verworfen, wenn sie dort nicht vorkommen.
- **Kosten deckeln:** maximale Live-Aufrufe pro Minute, maximale Claims,
  maximale Thinking-Tokens.

## 7. Build-Reihenfolge (Ergänzung zu docs/08)

| # | Schritt | Aufwand | Nutzen |
|---|---|---|---|
| 1 | `TalkState` + Delta-Schema + Merge/Dedup | 2–3 h | Grundlage für Live + Final |
| 2 | Live-Lane mit Gemini Flash low, 30-s-Takt | 2 h | Kandidaten, Prefetch, Niveau |
| 3 | Finale Lane: Claim-Extraktion parallel, Judge-Workers 6–8 | 2 h | kürzere Endlatenz |
| 4 | Question-Lanes B/A/D | 2–3 h | erste Frage vor Fact-Check |
| 5 | Gemini-Caching + Prompt-Präfix | 1 h | Kosten/Latenz |
| 6 | Evaluation auf 3–5 Demo-Transkripten | 2 h | Schwellen, Dedup, Qualität |

Wenn die Zeit knapp ist: 1, 3 und 4 bauen; die Live-Lane (2) ist der Bonus,
der die Endlatenz weiter drückt.

## 8. Quellen

- Gemini-Modelle: <https://ai.google.dev/gemini-api/docs/models>
- Gemini-Preise: <https://ai.google.dev/gemini-api/docs/pricing>
- Gemini 3.8 Flash: <https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash>,
  <https://deepmind.google/models/model-cards/gemini-3-8-flash/>
- Gemini 3.1 Pro Preview: <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview>
- Gemini Thinking: <https://ai.google.dev/gemini-api/docs/thinking>
- Gemini Structured Outputs: <https://ai.google.dev/gemini-api/docs/generate-content/structured-output>
- Gemini Context Caching: <https://ai.google.dev/gemini-api/docs/generate-content/caching>
- LiveFC (Live-Fact-Checking): <https://arxiv.org/abs/2408.07448>
- Claim-Verification-Survey: <https://arxiv.org/html/2408.14317v1>
- Real-Time-Fact-Checker-Cookbook (Satz-Claims, Embedding-Match, LLM-Judge):
  <https://docs.mistral.ai/resources/cookbooks/mistral-audio-realtime-fact-checker-01-realtime-fact-checker>
- Context Rot / Kontextmanagement:
  <https://aclanthology.org/2026.findings-acl.930.pdf>,
  <https://www.langchain.com/blog/context-management-for-deepagents>
- Streaming-ASR-Commit-Policy:
  <https://www.yepic.ai/blog/streaming-speech-recognition-ai-avatar-asr-policy>
- Bestehende Pipeline: `backend/app/factcheck/pipeline.py`,
  `backend/app/questions/pipeline.py`, `backend/app/speech/live.py`

## 9. Deep Research (24.10.2026)

Vollständige Evidenzbasis: `docs/11-deep-research-validation.md`.

**Korrektur 1: event-driven statt fester 20–30-s-Takt.** Partielle ASR ist
deutlich fehleranfälliger als finalisierte Sätze; ein fester Takt analysiert
unnötig instabile Hypothesen. Die Live-Lane läuft auf **finalisierten
Segmenten**; 20–30 s bleiben der maximale Fallback-Abstand. Jede Zustandsversion
trägt Quelle/Confidence und wird gegen das finale Transkript re-groundet.

**Korrektur 2: kein „autoritativer“ Fact-Check.** Realweltliche
Claim-Verifikation erreicht in Benchmarks etwa 57–63 %; Zitatbelege sind oft
nur teilweise stützend; LLM-Richter haben Positions-, Längen- und
Selbstpräferenz-Bias. Der finale Lauf ist die beste verfügbare Prüfung, keine
Wahrheitsgarantie. Drei Ausgänge, wörtliche Zitatprüfung, Quelle sichtbar,
„nicht gefunden“ ≠ „falsch“. Keine Live-Urteile.

**Korrektur 3: Gemini-Modellwahl.** `gemini-3.1-flash-lite` unterstützt
`thinkingLevel=minimal` und ist der getestete Default für schwache/live
Aufrufe; `gemini-3.8-flash` unterstützt **kein** `minimal` und ist der
finale Qualitätskandidat (`low`/`medium`/`high`). `gemini-2.5-flash-lite` ist
im Projekt nicht erreichbar (404). Der OpenAI-kompatible Endpoint akzeptiert im
Test `response_format={"type":"json_object"}`; für Garantien natives
`responseJsonSchema` verwenden. Thinking-Tokens zählen als Output.

**Empirie.** `gemini-3.1-flash-lite` (minimal) lieferte valides JSON in
0,7–1,5 s; der Coaching-Smoke mit drei Claims brauchte 3,4 s Fact-Check,
2,1 s Fragen und 1,7 s Antwortprüfung. Das ist eine synthetische
Einzelmessung, keine Latenz- oder Genauigkeitszusage.

**Weitere Grenzen.** Kontext-Caching ist implizit ab 4.096 Tokens (3.8/3.1
Pro) bzw. 2.048 (2.5 Flash), aber nicht garantiert; Rate-Limits sind nicht
publik; TPM ist bei langen Transkripten der Engpass. Die Gemini Developer API
hat kein EU-Region-Pinning; nur synthetische Demo-Daten senden oder Vertex AI
mit EU-Region nutzen.

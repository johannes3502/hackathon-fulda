# Voice-Agent: Umsetzungsplan

Status: **Plan, keine Umsetzung.** Branch `voice-agent-plan`, Basis `main`
(567ba1d). Die Research-Dokumente 07–09 sind die Begründung; dieses Dokument
ist die checklistenförmige Umsetzung.

## 1. Ziel

Nach der Präsentation führt ein Lehrer-/Tutor-Agent ein kurzes, deutsches
Gespräch:

- 3 Fragen, eine davon quellengebunden, eine Verständnis-/Anwendungsfrage,
  eine Vertiefung.
- Kurzes, verifiziertes Feedback, keine Noten, keine Punkte.
- Erste Frage hörbar, sobald die Session startet – nicht erst nach dem
  Fact-Check.
- Quellen: Transkript, hochgeladene Quellen, optional Web-Zweitquelle.
- Stimme: natürlich, Deutsch, mit Filler und ohne tote Stille.

## 2. Entscheidungen (fix für die Umsetzung)

1. **Unser LLM schreibt den exakten Sprechtext, ElevenLabs spricht ihn.**
   TTS formuliert nicht um. Jede gesprochene Zeile hat ein `spoken`-Feld.
2. **Plan-first:** erst Erwartungspunkte/Evidenz, dann die Frage
   (PFQS-Prinzip).
3. **Zwei Question-Lanes:**
   - Lane B: Verständnis/Anwendung/Analyse, ohne Fact-Check-Abhängigkeit,
     startet sofort nach dem Stoppen.
   - Lane A: Widerspruch/Beleg/Lücke, startet mit dem finalen Fact-Check.
   Lane D führt beides zusammen, rankt und validiert.
4. **Fact-Check hybrid:** Live-Lane sammelt nur Kandidaten und prefetcht
   Retrieval; die finale, autoritative Pipeline läuft nach dem Stoppen auf dem
   finalen Batch-Transkript und schreibt die `fact`-Events.
5. **Gemini:** `gemini-3.8-flash` als Default, `thinking_level=low` live und
   `high` final. Optional `gemini-3.1-flash-lite` für die Live-Lane,
   `gemini-3.1-pro-preview` nur für den finalen Lauf (Preview-Risiko).
6. **Bekannte Fragen und Filler vorrendern.** Streaming nur für dynamische
   Nachfragen, satzweise, nie JSON/Markdown an die TTS.
7. **Keine Bewertung der Person.** Niveau ist eine interne Heuristik für die
   Fragenauswahl, kein Score, keine Note.

## 3. Architektur in Kurzform

```
Während des Vortrags
  Live-ASR → stabile Sätze → IncrementalAnalyzer (20–30 s Takt)
           → TalkState (Claims, Themen, Keyterms, Niveau, Seeds)
           → Retrieval-Prefetch

Nach dem Stoppen
  finales Transkript
    ├─ Lane A: finaler Fact-Check (parallel, autoritativ)
    ├─ Lane B: Profil + nicht-quellengebundene Fragen
    └─ Lane C: TTS-Prerender (Fragen, Filler)
    → Lane D: Merge, Ranking, Validierung, quellengebundene Fragen
    → QuestionPlan → Session
```

## 4. Phasen

### Phase 1 – QuestionPlan und Validator

**Ziel:** Fragen sind strukturiert, testbar und TTS-fertig.

- `Question` erweitern: `spoken`, `dok`, `difficulty`, `expected_points`,
  `follow_ups`, `level_band`.
- `QuestionPlan` mit `topic`, `key_terms`, `level_band`, `questions`.
- Prompt: plan-first, eine Frage pro Eintrag, `spoken` ohne Markdown,
  Klammern, Abkürzungen, Zitatmarker.
- Validator: echte Frage, max. ein Fragezeichen, 8–30 Wörter, Refs
  existieren, `gap`-Zitat im Chunk, kein Antwortleck.
- Tests: Schema, Validator, ein synthetisches Transkript.

**Dateien:** `backend/app/questions/models.py`,
`backend/app/questions/pipeline.py`, Tests.

**Fertig, wenn:** ein Demo-Transkript drei valide Fragen mit Erwartungspunkten
liefert und keine Frage den Validator verletzt.

### Phase 2 – TTS-Proxy, Filler, Prerender

**Ziel:** Erster Ton in < 300 ms, ohne TTS-Wartezeit.

- Backend-Proxy für ElevenLabs (Key serverseitig, nie im Browser).
- Stimme/Modell konfigurierbar: `eleven_flash_v2_5`, `language_code=de`,
  Normalisierung an, Pronunciation Dictionary für Fachbegriffe.
- Filler-Pool (8–10 Varianten, 2–3 s) und die 3 Fragen vorrendern.
- Cache im Browser (Blob-URLs), Fallback auf Browser-TTS, wenn der Proxy
  ausfällt.

**Dateien:** neuer TTS-Proxy, `frontend/src/features/questions/voice.ts`,
`frontend/src/components/live/VoiceConversation.tsx`.

**Fertig, wenn:** „Fragerunde starten“ die erste Frage aus dem Cache abspielt
und bei fehlendem Cache ein Filler hörbar ist.

### Phase 3 – Gesprächsfluss im Frontend

**Ziel:** Der Nutzer muss nicht mehr „Done“ klicken.

- RMS/AnalyserNode im Antwortpfad, automatisches Ende nach ~700 ms Stille.
- Audio-Queue für Filler, Frage, Acknowledgment, Feedback.
- Acknowledgment sofort nach dem Antwortende; verifiziertes Feedback erst
  nach dem Urteil.
- Halbduplex: Mikro stumm, während die TTS spielt.

**Fertig, wenn:** eine Antwort ohne Klick endet, sofort ein Acknowledgment
kommt und danach die nächste Frage/Feedback folgt.

### Phase 4 – Finaler Fact-Check und Question-Lanes

**Ziel:** Die erste Frage ist da, bevor der Fact-Check fertig ist.

- `run_fact_check` auf dem finalen Transkript starten, sobald es vorliegt.
- Claim-Extraktion über Fenster parallelisieren; Judge-Workers auf 6–8
  erhöhen (Gemini).
- Lane B (Profil + nicht-quellengebundene Fragen) parallel starten.
- Lane D: quellengebundene Fragen ergänzen, ranken, validieren, preren.
- Retrieval-Cache pro normalisiertem Claim.

**Dateien:** `backend/app/factcheck/pipeline.py`,
`backend/app/questions/pipeline.py`, ggf. Worker/Queue.

**Fertig, wenn:** die Session mit einer Lane-B-Frage startet und die
quellengebundene Frage nach dem Fact-Check ohne sichtbare Unterbrechung
nachkommt.

### Phase 5 – Inkrementelle Live-Lane (optional, wenn Zeit)

**Ziel:** Kandidaten und Niveau schon während des Vortrags.

- `TalkState` (Claims, Themen, Keyterms, Niveau, Seeds) in Redis/DB.
- Delta-Aufruf alle 20–30 s, nur stabile Sätze, `gemini-3.8-flash` low oder
  `gemini-3.1-flash-lite` minimal.
- Merge/Dedup über normalisierten Text, Embedding und Zeitüberlappung.
- Keine Live-Urteile, keine `fact`-Events.

**Fertig, wenn:** der finale Lauf sichtbar schneller startet, weil Claims und
Retrieval-Treffer schon vorliegen.

### Phase 6 – Evaluation und Demo-Politur

- 3–5 synthetische Demo-Transkripte (Anfänger, Fortgeschritten, Fachvortrag).
- Prüfen: Fragequalität, keine Antwortlecks, keine Doppelfragen, Niveau-Mix,
  Latenz, Kosten.
- Abbruchpfade: TTS-Proxy down, Gemini-Fehler, kein Mikrofon, leere Quellen.
- Demo-Skript: Präsentation → Filler → Frage 1 → Antwort → Feedback →
  Frage 2/3.

## 5. Latenz- und Kostenziele

| Schritt | Ziel |
|---|---|
| Klick bis Frage 1 (Cache) | < 100 ms |
| Klick bis Filler (kein Cache) | < 300 ms |
| Antwortende bis Acknowledgment | < 300 ms |
| Lane B fertig | 3–5 s |
| Lane A fertig | 8–12 s |
| Erste quellengebundene Frage | sofort danach |

Kosten pro 30-Minuten-Demo: finaler Lauf Cent-Beträge; Live-Lane grob
$0,10–1,00 je nach Modell und Caching.

## 6. Offene Entscheidungen

- **Cloud vs. lokal:** Gemini + ElevenLabs sind Cloud. Wenn „alles lokal“ im
  Pitch bleiben soll, stattdessen Ollama + Piper; dann entfällt die
  ElevenLabs-Stimme.
- **ASR im Dialog:** lokales Whisper (Audio bleibt lokal) vs. ElevenLabs
  Scribe Realtime (schneller, Cloud).
- **ElevenLabs-Umfang:** nur TTS (empfohlen) vs. vollständiger Agent mit
  Client-Tool (mehr Turn-Taking, weniger Textkontrolle).
- **Barge-in:** Halbduplex für die Demo; echtes Barge-in später.
- **Fragenanzahl/Persona:** 3 Fragen, `tutor` als Default; `student` als
  Option.

## 7. Nicht-Ziele

- Keine Noten, Scores, Emotion- oder Persönlichkeitsbewertung.
- Keine serverseitigen Clips/Snapshots.
- Kein öffentliches Deployment.
- Keine Genauigkeits- oder Latenzversprechen aus synthetischen Tests.
- Kein ACP/A2A als Voice-Transport.

## 8. Referenzen

- `docs/07-voice-agent-stack.md` – Stack-Vergleich, ElevenLabs, Local-only.
- `docs/08-question-agent-architecture.md` – Fragen, Didaktik, Niveau,
  TTS-Streaming.
- `docs/09-streaming-analysis-and-models.md` – inkrementelle Analyse,
  Fact-Check-Lanes, Gemini-Modelle.

# Voice-Agent: Umsetzungsplan

Status: **Plan für eine getrennte LLM-/TTS-Pipeline; Phasen 1–6 sind offen.**
Umgesetzt sind die Gemini-Konfiguration und maximal fünf Anfangsfragen im
getippten Pfad. Der aus `main` integrierte direkte ElevenLabs-Dialog ist ein
separater Pfad (siehe `docs/07-review-and-agent.md`); er setzt diese geplanten
Question-Lanes, TTS-Prerendering und Sitzungsgrenzen noch nicht um.
Die Research-Dokumente 07–09 sind die Begründung; dieses Dokument ist der
Umsetzungsplan.

## 1. Ziel

Nach der Präsentation führt ein Lehrer-/Tutor-Agent ein kurzes, deutsches
Gespräch:

- 3–4 Fragen (Hard Cap 5), eine davon quellengebunden, eine
  Verständnis-/Anwendungsfrage, eine Vertiefung.
- Kurzes, aufgabenbezogenes Feedback im Gespräch; vollständige Evidenz und
  Zitate im finalen Review. Keine Noten, keine Punkte.
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
   Retrieval; die finale, quellengebundene Pipeline läuft nach dem Stoppen auf
   dem finalen Batch-Transkript und schreibt die `fact`-Events. Kein
   „autoritatives“ Urteil, keine Live-Urteile.
5. **Gemini:** Test/Live `gemini-3.1-flash-lite` mit
   `thinking_level=minimal`; final `gemini-3.8-flash` mit `high`
   (`gemini-3.8-flash` kennt kein `minimal`). `gemini-3.1-pro-preview` nur
   optional final (Preview-Risiko).
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

- **Cloud vs. lokal:** entschieden für Gemini (Cloud) und ElevenLabs (später).
  Die frühere Local-only-Zusage ist damit hinfällig; nur synthetische
  Demo-Daten senden oder Vertex AI mit EU-Region prüfen. Ollama ist aus dem
  Projekt entfernt.
- **ASR im Dialog:** lokales Whisper (Audio bleibt lokal) vs. ElevenLabs
  Scribe Realtime (schneller, Cloud).
- **ElevenLabs-Umfang:** nur TTS (empfohlen) vs. vollständiger Agent mit
  Client-Tool (mehr Turn-Taking, weniger Textkontrolle).
- **Barge-in:** Halbduplex für die Demo, aber mit sichtbarem State und
  Stop-Möglichkeit; echtes Barge-in später testen.
- **Fragenanzahl/Persona:** 3–4 Fragen (Cap 5), `tutor` als Default;
  `student` als Option.

## 7. Nicht-Ziele

- Keine Noten, Scores, Emotion- oder Persönlichkeitsbewertung.
- Keine serverseitigen Clips/Snapshots.
- Kein öffentliches Deployment.
- Keine Genauigkeits- oder Latenzversprechen aus synthetischen Tests.
- Kein ACP/A2A als Voice-Transport.

## 8. Referenzen

- `docs/07-voice-agent-stack.md` – Stack-Vergleich, ElevenLabs, Cloud-Grenzen.
- `docs/08-question-agent-architecture.md` – Fragen, Didaktik, Niveau,
  TTS-Streaming.
- `docs/09-streaming-analysis-and-models.md` – inkrementelle Analyse,
  Fact-Check-Lanes, Gemini-Modelle.

## 9. Deep Research (24.10.2026)

Vollständige Evidenzbasis, Grade und Zitate: `docs/11-deep-research-validation.md`.

**Was der Plan richtig macht.** Kein neuer Voice-Stack; LLM schreibt den
exakten Sprechtext; TTS spricht nur; plan-first Fragen; zwei Question-Lanes;
finaler Fact-Check bleibt quellengebunden; vorgerenderte feste Texte; keine
Noten oder Personenbewertung. Die gemessenen 3,4 s / 2,1 s / 1,7 s mit
`gemini-3.1-flash-lite` zeigen, dass der Batch-Pfad mit einem schwachen Modell
ohne Reasoning läuft. Der **strikte Review-Writer** fiel mit diesem Modell an
der Verifikationsgrenze auf die geprüfte Template-Review zurück
(`E_REVIEW_VERIFICATION`); für den finalen Writer ist `gemini-3.8-flash`
einzuplanen. Der Fallback ist bewusst und sichtbar, kein stiller Fehler.

**Was korrigiert wird.**

1. **Live-Lane event-driven**, nicht alle 20–30 s: nur finalisierte
   ASR-Segmente, 20–30 s als Fallback. Partials sind zu unzuverlässig.
2. **Kein „autoritativer“ Fact-Check.** Drei Ausgänge, Zitatprüfung, Quelle;
   „nicht gefunden“ ist nicht „falsch“; keine Live-Urteile. Benchmark-Realität
   liegt bei ~57–63 %, nicht bei Gewissheit.
3. **Plan-first mit mehreren akzeptablen Antwortpunkten**, nicht einer
   goldenen Antwort. PFQS stützt Fragenqualität, nicht Lerngewinn.
4. **Halbduplex nur mit sichtbarem State und Stop-Möglichkeit.** Barge-in
   wirkt natürlicher; vor einem Naturalness-Urteil testen.
5. **Zweistufiges Feedback:** kurz und aufgabenbezogen im Gespräch, Evidenz
   und Zitate im Review. Kein „falsch“ mitten im Gespräch; bei falscher
   Antwort klären → Hinweis → ein Retry, dann später zurückkommen.

**Harte Grenzen (Demo).** 3–5 Hauptfragen (Default 4), ein Follow-up (max. 2
nur bei klarem Widerspruch), 8–10 min Ziel, Hard Stop 10 min (12 min inkl.
Abschied), 3–5 s Wartezeit nach der Frage, 10 s Answer-Timeout, ≤15
Agent-Turns, kein neues Thema nach Minute 8, letzte 90 s Zusammenfassung, zwei
Timeouts in Folge → früh schließen. Das sind Safety-Rails, keine Pädagogik;
adaptiver Stop ergänzt sie. `QuestionConfig.max_questions` ist im Code auf 5
begrenzt.

**Ollama entfernt.** Der lokale Ollama-Adapter, `OLLAMA_URL`/`COACH_MODEL`,
der Host-Gateway-Eintrag und die Ollama-Tests sind aus dem Projekt entfernt.
Ollama war **nicht** im Docker-Image, sondern ein Host-Dienst; die Build-Zeit
ändert sich dadurch nicht. Der Backend-Default ist jetzt Gemini über den
OpenAI-kompatiblen Endpoint (`gemini-3.1-flash-lite` für Tests,
`gemini-3.8-flash` für den finalen Lauf). Wichtig: Damit ist die frühere
Local-only-Zusage hinfällig; die Gemini Developer API hat kein EU-Pinning.
Nur synthetische Demo-Daten senden oder Vertex AI mit EU-Region nutzen.

**Empfohlene Pilotmessungen.** Antwortlänge, Reparaturrate, Student-Talk-Anteil,
wahrgenommener Druck, Abbruchquote, First-Audio-Latenz, Fragenqualität und
Quote-Match-Quote. Keine dieser Zahlen aus synthetischen Läufen als
Genauigkeits- oder Latenzversprechen verwenden.

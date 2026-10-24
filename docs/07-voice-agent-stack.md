# Voice-Agent: Stack-Entscheidung

Stand: 24.10.2026, Research für den Lehrer-/Tutor-Dialog nach der Präsentation.
Dieses Dokument ist eine **Entscheidungsvorlage**, keine umgesetzte Architektur.
Nach der Entscheidung gehört der Beschluss in `docs/02-ai-decision-log.md` und,
falls sich der Datenfluss ändert, in die Diagramme von `docs/03-architecture.md`.

## 0. Kurzentscheidung

**Für den Hackathon: keinen neuen Voice-Stack einführen.** Weder Pipecat noch
LiveKit noch OpenAI Realtime noch ACP. Der vorhandene Pfad
(`MediaRecorder` → `POST /questions/answers/voice` → Whisper → Gemini) bleibt
die Wahrheit für die fachliche Prüfung. Davor kommt eine dünne
Echtzeit-Schicht:

1. **Automatisches Antwortende** im Browser (RMS-Stille, ~700 ms) statt
   „Done“-Button.
2. **Sofortige, deterministische Reaktion** (Template, kein LLM) direkt nach
   dem Antwortende. Sie enthält keine fachliche Behauptung und maskiert die
   Wartezeit.
3. **Verifizierte Bewertung im Hintergrund** (bestehender Job), Ergebnis als
   Karte; die nächste Frage oder Nachfrage wird gesprochen, sobald das Zitat
   geprüft ist. Fragen sind vor der Runde bekannt und können vorgerendert werden.
4. **TTS:** zuerst die vorhandene Browser-Stimme mit einer guten deutschen
   Systemstimme; Piper (deutsch, Thorsten/Kerstin) nur als optionale
   Qualitätsstufe, wenn noch Zeit ist.

Damit sinkt die wahrgenommene Antwortzeit von heute **~9 s auf ~0,3–1 s bis zum
ersten Ton**, ohne die Quellenbindung zu brechen. Die Cloud-Entscheidung für
das LLM ist bereits gefallen (Gemini, §8); Audio/TTS folgen erst später.

**Sonderfall: vorhandener ElevenLabs-API-Key.** Dann ist Muster A aus
Abschnitt 3.6 (ElevenLabs Agents + Client Tool auf unser Backend) der
schnellste Weg zu einem natürlich klingenden Gespräch: Scribe/Flash/Turn-Taking
kommen gehostet, die Quellenprüfung bleibt im Backend. Das ist **ein weiterer
Cloud-Schritt** und muss im Pitch gesagt werden; es ersetzt die Empfehlung oben
nur, wenn die Cloud-Audio-Ausnahme bewusst beschlossen wird.

**Wenn das Produkt nach dem Hackathon weiterläuft:** Pipecat ist die beste
Anschlussoption (Python, lokal, BSD-2, Gemini/Whisper/Piper als First-Class-
Services, WebSocket- und SmallWebRTC-Transport). LiveKit nur bei Mehrnutzer-
Räumen/Telefonie/Skalierung. OpenAI Realtime oder Gemini Live nur, wenn
zusätzlich Cloud-Audio akzeptiert wird; dann ist Gemini Live deutlich billiger,
OpenAI stärker bei Reasoning/Tool-Calls.

## 1. Ist-Stand (gemessen, nicht geschätzt)

| Baustein | Heute | Gemessene Zeit | Lokal? |
|---|---|---|---|
| Spracherkennung Antwort | Batch-Whisper `small`, CPU/int8, ganze Datei | **4,8 s** für 6,8 s Audio (Beam 5); Beam 1 ≈ 3,3 s; `tiny` warm ≈ 1,0 s | ja (Docker) |
| Antwortbewertung | Gemini `gemini-3.1-flash-lite`, JSON-Modus, kein Streaming | **1,7 s** (synthetisch) | nein (Cloud) |
| Fragenrunde vorab | derselbe Gemini-Pfad | **2,1 s** | nein (Cloud) |
| Fact-Check | derselbe Gemini-Pfad | **3,4 s** | nein (Cloud) |
| Sprachausgabe | Browser `speechSynthesis` | Start ~0,1–0,3 s | **nicht garantiert** (Browser kann Cloud-Stimme nutzen) |
| Antwortende | Button „Done“ | manuell | – |
| Transport | HTTP-Multipart + Polling; daneben `WS /speech/live` (2-s-Fenster) und `WS /speech/feedback` (5-s-Takt) | – | ja |

Wahrgenommene Latenz pro Sprachzug mit dem schwachen Gemini-Testmodell:
**Upload + 4,8 s ASR + 1,7 s LLM + TTS-Start ≈ 7 s** plus Klick. Die
Batch-ASR bleibt der große Block; das LLM ist nicht mehr der Hauptgrund für
die Wartezeit.

Zwei technische Ursachen, die kein Framework wegzaubert:

- **Der LLM-Adapter kann nicht streamen.** `OpenAICompatibleChat.complete_json`
  verlangt ein vollständiges JSON-Objekt und setzt kein `stream`. Erst danach darf
  gesprochen werden, weil `reply` nur mit verifiziertem Zitat erlaubt ist. Ein
  natives Gemini-Streaming wäre ein eigener Adapter, kein Freischalten.
- **ASR läuft als Batch nach dem Upload.** Die vorhandene Live-Transkription
  (`WHISPER_LIVE_CHUNK_MS=2000`, 10-s-Fenster, ein Slot pro Prozess) liefert
  Wörter schon während des Sprechens, wird für die Antwortrunde aber nicht
  genutzt.

## 2. Anforderungen an den Lehrer-Dialog

| Anforderung | Konsequenz |
|---|---|
| Kurz reden, nicht zehn Minuten | 3–4 Fragen (Cap 5), kurze Reaktion, eine optionale Nachfrage |
| Nach der Präsentation, mit Quellen | Fragen und Feedback müssen an Fact-Check-Funde/Quellen gebunden bleiben |
| Keine erfundenen Inhalte | Spoken feedback nur aus verifizierten Urteilen oder als procedurelles Template |
| Cloud bewusst akzeptiert | Gemini ist Cloud (kein EU-Pinning); Audio/TTS nur mit separater Entscheidung |
| Laptop + Smartphone, lokale Demo | Browser-Transport, kein eigener WebRTC-SFU im Docker-Netz |
| Hackathon-Zeit | Wiederverwenden, was getestet ist; kein neuer Dienst mit neuem Protokoll |

## 3. Optionen im Vergleich

| Option | Was es ist | Latenz-Potenzial | Lokal | Aufwand hier | Grounding | Urteil |
|---|---|---|---|---|---|---|
| **Dünne Schicht auf vorhandenem Stack** | Auto-Endpointing + Templates + vorhandene Jobs | **0,3–1 s** bis erster Ton, Prüfung ~4–5 s später | ja | **2–4 h** | voll (bestehender Zitat-Check) | **Jetzt umsetzen** |
| **Pipecat** | Python-Framework, Pipeline aus VAD/STT/LLM/TTS, Transporte WebSocket/SmallWebRTC/Daily/LiveKit | theoretisch 0,5–1 s | ja (Ollama, Whisper, Piper, Silero, Smart Turn) | 1–2 Tage robust | möglich, aber JSON-/Zitatprüfung als Custom Processor | **Später, wenn Barge-in/Mehrturn** |
| **LiveKit Agents** | Agent tritt WebRTC-Raum bei, SFU, Telefonie, Skalierung | 0,5–1 s | ja, aber LiveKit-Server + UDP | 1–2 Tage | wie Pipecat | **Overkill für lokale Demo** |
| **OpenAI Realtime** (`gpt-realtime-2.1`, `-mini`) | Speech-to-Speech über WebRTC/WS, Tool-Calls, Barge-in | **0,3–0,8 s** | nein | 2–4 h (ephemeral key, Tools) | nur über Tool-Calls, Modell kann ungeprüft sprechen | **Nur falls Cloud erlaubt** |
| **Gemini Live** | Speech-to-Speech, Deutsch, sehr günstiges Audio | 0,3–0,8 s | nein | 2–4 h | wie oben | **Cloud-Alternative, billiger** |
| **ElevenLabs Agents** | Gehosteter Agent: Scribe-STT + LLM + Flash-TTS + Turn-Taking, Client-Tools, React-SDK | **~0,6 s** bis erster Ton (Realtime Mini 570 ms), Tool-Turn +4–6 s | nein (EU-Residency/ZRM optional) | **3–5 h** | Tool-Call an unser Backend; Agent kann drumherum formulieren | **Schnellster Weg zum natürlichen Demo-Gespräch, wenn Cloud erlaubt** |
| **Qwen3-Omni / Moshi lokal** | offene Speech-to-Speech-Modelle | theoretisch niedrig | ja | hoch | schlecht kontrollierbar | **Nicht auf 24 GB/CPU-Docker** |
| **ACP** | JSON-RPC-Protokoll zwischen Editor und Coding-Agent (Zed) | – | – | – | – | **Kein Voice-Stack, fällt aus** |

### 3.1 Pipecat

Pipecat (BSD-2, ca. v1.11 im September 2026) ist ein Python-Framework, das
Audio-/Text-Frames durch eine Pipeline aus VAD, STT, LLM und TTS schickt. Es
bringt genau die Teile mit, die hier fehlen: Silero VAD, Smart Turn v3
(End-of-Turn, laut Projekt ~10 ms auf manchen CPUs, unter 100 ms auf typischen
Cloud-Instanzen), Unterbrechungen, Streaming-TTS und Transports. Lokale
Services sind First-Class: Ollama, Whisper, Piper (lokal oder per HTTP), Kokoro.

Warum trotzdem **nicht jetzt**:

- **Transport-Realität:** Der empfohlene Weg ist WebRTC (SmallWebRTC/Daily).
  WebRTC im Docker-Container auf Docker Desktop/macOS braucht UDP-Ports und
  Host-Networking-Tricks; das ist für eine lokale Jury-Demo am selben Abend ein
  unnötiges Risiko. Der WebSocket-Transport vermeidet das, verliert aber
  Jitter-Buffer/AEC-Komfort.
- **Der fachliche Kern passt nicht in eine Token-Pipeline.** Die Bewertung ist
  ein JSON-Objekt mit Satzverweisen und wörtlichem Zitat, das der Code prüft.
  Dafür braucht es einen Custom Processor, der auf das komplette JSON wartet –
  also genau die 4 s, die wir einsparen wollen. Pipecat löst Orchestrierung,
  nicht Modelllatenz.
- **Neues Protokoll, neuer Client.** RTVI/WebSocket-Nachrichten, Session-State,
  Reconnects und ein zweiter Audio-Pfad neben `MediaRecorder` müssten getestet
  werden. Das ist mehr als ein Hackathon-Abend.
- **Lizenzdetail:** Das `piper-tts`-Paket ist GPL-3.0; Pipecat empfiehlt für
  Produkte den separaten HTTP-Service. Für den Prototyp egal, für ein Produkt
  relevant.

Pipecat ist die richtige Wahl, sobald **echtes Barge-in, mehrere Züge mit
Unterbrechungen und ein eigener Voice-Service** gefordert sind. Die Integration
wäre: neuer Container `voice-agent` mit Pipecat, `WebSocketTransport` (oder
SmallWebRTC auf einem Host mit sauberem Networking), STT `faster-whisper`,
LLM Gemini (Custom Processor), TTS Piper-HTTP; ein Custom Processor ruft die
vorhandene Bewertungs-API auf und spricht nur das verifizierte Ergebnis. Aufwand: eher
1–2 Tage als 4 Stunden.

### 3.2 LiveKit Agents

LiveKit Agents (Apache-2, ca. v1.8.2 im September 2026) ist die höhere
Abstraktion: Der Agent ist Teilnehmer eines WebRTC-Raums, mit SIP/Telefonie,
Multi-User und fertigen Client-SDKs. Für einen einzelnen Nutzer im Browser auf
`localhost` ist der LiveKit-Server ein zusätzlicher Dienst mit UDP/ICE, der
nichts löst, was hier gebraucht wird. Sinnvoll erst bei echten Räumen,
Telefonie oder horizontaler Skalierung.

### 3.3 Agent Client Protocol (ACP)

ACP ist das JSON-RPC-Protokoll von Zed, mit dem Editoren Coding-Agents
ansteuern (Session, Prompt, Tool-Events). Es transportiert **kein Audio**, keine
Turn-Taking-Signale und keine TTS-Ausgabe. Dasselbe gilt für A2A und MCP: Das
sind Control-Plane-Protokolle für Agenten/Tools, keine Voice-Transporte. MCP
kann höchstens den Prüf-Backend als Tool für ein Cloud-Realtime-Modell
exponieren – dann bleibt aber das Cloud-Modell das Sprachmodell.

### 3.4 OpenAI Realtime API

`gpt-realtime-2.1` (GA, aktueller Snapshot 2026) bzw. `-mini` liefert
Speech-to-Speech über WebRTC oder WebSocket, inklusive Barge-in, VAD und
Tool-Calls. Preise: Audio $32/1M Input und $64/1M Output (großes Modell),
`-mini` $10/$20; das sind grob **$0,06–0,30 pro Minute** je nach Modell und
Gesprächsanteil. Für eine 5-Minuten-Demo also Cent-Beträge – Kosten sind nicht
das Problem.

Technisch wäre der Browser-Weg: Backend erzeugt einen ephemeren Client-Secret,
Browser verbindet sich direkt per WebRTC, das Modell ruft per Tool die
vorberechneten Fragen und die verifizierte Bewertung ab. Das ist die schnellste
Route zu einem natürlichen Gespräch.

Warum nicht hier:

- **Die Cloud-Entscheidung ist bereits gefallen.** Gemini verarbeitet
  Transkript und Quellen; ein zusätzliches Realtime-Modell würde auch Audio an
  einen weiteren Anbieter senden.
- **Die Quellenbindung wird weicher.** Ein Speech-to-Speech-Modell kann frei
  formulieren; die Garantie „nur mit wörtlich geprüftem Zitat sprechen“ gilt nur
  noch für Tool-Ergebnisse, nicht für den Dialog drumherum.
- **Zwei Wahrheiten:** Gesprächszustand im Realtime-Modell, Bewertung im
  Backend. Das ist machbar, aber ein weiterer Fehlerpfad in der Demo.

Wenn Cloud akzeptabel wird: OpenAI Realtime für Qualität/Reasoning,
**Gemini Live** für Kosten (Audio-Input laut Preisliste ~$0,005/min, Deutsch
unterstützt). In beiden Fällen die fachliche Prüfung im Backend lassen und nur
die procedurelle Gesprächsschicht dem Cloud-Modell geben.

### 3.5 Lokale Omni-Modelle

Qwen3-Omni 30B-A3B kann Deutsch verstehen und sprechen, ist aber ein
30B-MoE-Modell; auf einem 24-GB-Mac im Docker-Container ist Echtzeit nicht
realistisch, und die Streaming-Infrastruktur (vLLM-Omni) ist im Oktober 2026
noch in Arbeit. Moshi ist auf Englisch/Französisch fokussiert. Beide lösen
außerdem das Grounding-Problem schlechter als die kaskadierte Pipeline.

### 3.6 ElevenLabs Agents (API-Key vorhanden)

ElevenLabs deckt die **Voice-Schicht** vollständig ab, die **Wahrheits-Schicht**
nicht. Das ist die entscheidende Trennung.

| Baustein | ElevenLabs | Für uns relevant |
|---|---|---|
| STT | Scribe v2 Realtime, ~119–150 ms, 90+ Sprachen inkl. Deutsch | ersetzt lokales Whisper im Dialog |
| TTS | Flash v2.5 ~75 ms Inferenz / ~190 ms Time-to-first-audio (gemessen), 10k+ Stimmen, Deutsch | deutlich besser als `speechSynthesis` |
| Turn-Taking | proprietäres Modell, VAD, Barge-in, Interruptions | löst genau die fehlende Duplex-Fähigkeit |
| Agent | LLM-Auswahl, Prompt, Workflows, Knowledge Base/RAG, Tools | Persona und Gesprächsführung |
| Transport | WebRTC (LiveKit) oder WebSocket; React/Next.js-SDK; signed URL / Conversation-Token | passt in Next.js |
| Tools | Client Tools (Browser führt aus), Webhook, MCP, Code | **Client Tool ruft unser lokales Backend** |
| Latenz | Realtime v1 Mini 570 ms, Max 620 ms TTFA; Agents sub-500 ms beworben | Demo-tauglich |
| Preis | **$0,08/min** + LLM-Durchreichung; 15 Gratis-Minuten, Starter $6/75 min | 5-Min-Demo ≈ $0,40 + LLM |

**Was ElevenLabs nicht liefert:**

- **Keine garantierte Zitatprüfung.** Die Knowledge Base ist RAG, kein
  `quote_in_text`-Check. Ein Satz kann „gestützt“ klingen, ohne wörtlich im
  Chunk zu stehen.
- **Kein `t_ms`-Event-Modell** und keine Anbindung an unsere Fact-Check-Funde;
  die Fragen kommen weiterhin aus `POST /questions`.
- **Nicht lokal.** Audio und Konversation gehen an ElevenLabs. EU Data
  Residency und Zero Retention Mode sind verfügbar, machen den Pfad aber nicht
  lokal. Der eigene API-Key liegt serverseitig (Conversation-Token/Signed URL),
  nie im Browser.
- **Prompt-Compliance ist weich.** Das Agent-LLM kann Tool-Ergebnisse
  paraphrasieren. Wenn es wörtlich sprechen soll, muss das Ergebnis ein
  `spoken`-Feld enthalten und der Prompt es explizit verlangen; garantieren
  lässt sich das nicht.

**Integrationsmuster A: vollständiger Agent (bester Demo-Feel)**

```
Browser (Next.js)
 ├─ @elevenlabs/react  useConversation  (WebRTC)
 │    ├─ Agent: Lehrer-Persona, 3 vorbereitete Fragen, kurze Turns
 │    └─ Client Tool  check_answer(question, answer)
 │         └─ POST /api/questions/answers   (Text, kein Whisper)
 │              └─ {verdict, spoken, follow_up}   ~4 s
 └─ /api/elevenlabs/token  (Server)  → Conversation-Token, Key bleibt serverseitig
```

- Die drei Fragen werden vor der Runde mit `POST /questions` erzeugt und als
  Kontext/Dynamic Variables in den Agent gegeben; er fragt sie in Reihenfolge.
- Der Agent kann per Prompt vor dem Tool-Call einen Filler sprechen („Moment,
  ich schaue in die Unterlagen“). Zusätzlich gibt es einen Soft-Timeout von
  0,5–8 s (empfohlen 3 s), der bei langer Antwort einen Filler auslöst.
- `check_answer` läuft im Browser gegen unsere bestehende API. Dadurch bleibt
  die Quellenprüfung lokal und es braucht **keinen öffentlichen Tunnel**.
  Die 4 s liegen im Bereich der dokumentierten Tool-Timeouts (Webhook 5–120 s,
  Code 1–30 s); für Client-Tools den Wert auf der Zielhardware prüfen.
- Das Ergebnis enthält `spoken` (kurz, aus dem verifizierten Urteil) und
  `follow_up`; der Agent liest `spoken` wörtlich und stellt danach die
  Nachfrage.
- Audio geht an ElevenLabs, Quellen/Chunks/Prüfung bleiben lokal.

**Integrationsmuster B: nur TTS (Audio bleibt lokal)**

Bestehende Pipeline behalten und `speechSynthesis` durch ElevenLabs
Streaming-TTS ersetzen. Dann geht **nur der zu sprechende Text** an ElevenLabs,
kein Mikrofon-Audio. Voice-Qualität steigt, die 4–6 s Prüfpfad-Latenz bleibt;
Auto-Endpointing und Sofort-Template sind trotzdem nötig. Aufwand ~2–3 h.

**Urteil:** Mit vorhandenem API-Key ist Muster A der schnellste Weg zu einem
Gespräch, das sich wie ein Lehrer anfühlt – **wenn** die Demo zusätzlich
Cloud-Audio zulassen darf. Muster B ist der Kompromiss, wenn Audio das Gerät
nicht verlassen soll. Die frühere Local-only-Zusage aus
`docs/06-local-coaching.md` ist bereits durch Gemini ersetzt; Audio-Cloud wäre
ein weiterer Schritt und muss im Pitch ausdrücklich benannt werden.

Die konkrete Fragen-/Sprech-Architektur (wer formuliert, Plan-first,
Niveau-Heuristik, Filler, Streaming) steht in
`docs/08-question-agent-architecture.md`.

## 4. Empfohlene Architektur für den Hackathon

### 4.1 Prinzip: schnelle Schicht und langsame Wahrheit trennen

Der Dialog braucht keine LLM-Antwort, um weiterzugehen. Die drei Fragen sind
**vor** der Runde bekannt (`POST /questions`), die Bewertung darf **nach** der
Reaktion eintreffen.

```
Nutzer spricht
   │  Browser: RMS/Stille ~700 ms  → automatisches Ende
   ▼
[1] SOFORT (0–300 ms)
   └─ Template-Reaktion („Mhm.“, „Danke, das notiere ich mir.“)
   ▼
[2] PARALLEL (1–6 s)
   ├─ Batch-ASR (bestehend) oder Live-WS-Transkript
   ├─ Gemini-Bewertung (bestehend, JSON + Zitatprüfung)
   └─ Ergebnis als Karte
   ▼
[3] NÄCHSTER ZUG (ab ~4–6 s)
   ├─ kurzes verifiziertes Feedback (Template zum Urteil)
   └─ Nachfrage oder nächste vorgerenderte Frage per TTS
```

Wichtig: Die schnelle Schicht enthält **keine fachlichen Behauptungen**. Sie
bestätigt nur oder bittet um Wiederholung. Alles, was eine Aussage über
Inhalt/Wahrheit macht, kommt aus dem verifizierten Ergebnis oder aus einem
festen Template zum Urteil (`supports` / `contradicts` / `not_found`).

### 4.2 Latenz-Budget

| Zeitpunkt | Was passiert | Ziel |
|---|---|---|
| Ende der Sprache | Browser-RMS erkennt ~700 ms Stille | 0 ms |
| +0–300 ms | Template-Reaktion („Mhm.“) startet | **erster Ton** |
| +0,3–1,5 s | Live-ASR liefert finalen Text (tiny/Beam 1) | Transkript sichtbar |
| +4–6 s | Bewertung + Zitatprüfung fertig, Feedback-Template | Karte |
| +4–6 s | nächste vorgerenderte Frage oder Nachfrage startet | nächster Zug |

Damit ist der Dialog **wahrnehmbar schnell**, obwohl die fachliche Prüfung
weiterhin 4–6 s braucht: Der Nutzer hört sofort eine Reaktion und bekommt die
nächste inhaltliche Wendung nach einer kurzen, natürlichen Denkpause. Das ist
der eigentliche Hebel – nicht der Transport.

### 4.3 Konkrete Bausteine

1. **Auto-Endpointing (Browser).** Im `recordAnswer`-Pfad einen `AnalyserNode`
   mitlaufen lassen; nach z. B. 700 ms unter RMS-Schwelle automatisch stoppen.
   Die Schwelle relativ zur ersten Sekunde kalibrieren, im UI als Heuristik
   kennzeichnen. Kein Backend-Umbau. Alternativ das vorhandene
   `AudioWorklet`/RMS aus `features/live/speech.ts` wiederverwenden.
2. **Vorgerenderte Fragen.** Beim Start der Runde die 3 Fragen + Opening +
   Closing + 3 Urteil-Templates einmalig synthetisieren (Piper-HTTP oder
   Browser-Stimme) und im Browser cachen. Dann kostet die Frage **0 ms ASR/LLM**.
3. **TTS.** Erste Stufe: `speechSynthesis` mit einer guten deutschen
   Systemstimme (macOS/Safari, on-device). Zweite Stufe: Piper
   `de_DE-thorsten-high` oder `de_DE-kerstin-low` in einem separaten
   HTTP-Container; erste Audio ~12–40 ms, RTF auf einer M5-Klasse-CPU grob
   0,03–0,45 je nach Benchmark – für kurze Sätze ausreichend. Piper als
   separater Prozess hält die GPL-3.0 des `piper-tts`-Pakets aus dem
   App-Scope.
4. **Streaming-ASR (optional).** `WS /speech/live` existiert bereits und liefert
   Wörter während des Sprechens. Für die Antwortrunde den vorhandenen
   PCM-Sender aus `features/live/captions.ts` wiederverwenden; `tiny`/Beam 1
   statt `small`/Beam 5, sonst ist der Rückstand größer als die Sprache.
5. **Barge-in (optional).** TTS stoppen, sobald RMS wieder Sprache erkennt.
   Für eine Lehrergespräch-Runde ist **Halbduplex** (Mikro während der
   TTS-Ausgabe stumm) die sicherere Variante: kein Echo, keine
   Selbstunterbrechung, kein AEC-Tuning. Kopfhörer für die Demo einplanen.
6. **Bewertung.** Bestehender Job bleibt unverändert. Neu ist nur, dass die
   UI die Reaktion nicht mehr blockiert und `reply`/`follow_up` erst nach dem
   verifizierten Urteil spricht.

### 4.4 Reihenfolge für die verbleibende Zeit

| Priorität | Änderung | Aufwand | Wirkung |
|---|---|---|---|
| 1 | Auto-Endpointing statt „Done“ | 1–2 h | fühlt sich wie Gespräch an |
| 2 | Sofort-Template + vorgerenderte Fragen, Frage startet direkt nach der Bewertung | 1–2 h | ~9 s Stille → ~0,3 s erster Ton |
| 3 | Bewertungskarte entkoppelt, Feedback-Template + Nachfrage danach sprechen | 1 h | kein Warten auf LLM im Dialog |
| 4 | Gute deutsche Systemstimme / Piper-HTTP | 2–4 h | Stimmqualität |
| 5 | Live-ASR im Antwortpfad | 2–3 h | Transkript während des Sprechens |
| 6 | Barge-in | 1–2 h | Politur, riskanter |

## 5. Wenn das Produkt weiterläuft

**Pipecat** ist der natürliche nächste Schritt, weil es im selben Python-Stack
läuft und lokale Modelle unterstützt. Zielbild:

```
Browser ──WebSocket/RTVI──► voice-agent (Pipecat-Container)
                                 ├─ Silero VAD + Smart Turn v3
                                 ├─ faster-whisper (Streaming)
                                 ├─ Gemini (kurze Reaktion)
                                 ├─ Piper- oder ElevenLabs-TTS
                                 └─ Custom Processor
                                        └─► POST /questions/answers/voice
                                            (bestehende JSON-/Zitatprüfung)
```

Der Custom Processor wartet auf das verifizierte Ergebnis und spricht es erst
dann; die kurze Reaktion kommt vorher aus einem Template oder einem
nicht-faktischen LLM-Call. So bleibt die Quellenbindung erhalten, während
Pipecat Turn-Taking, Unterbrechungen und Audio-Transport übernimmt.

**LiveKit Agents** erst, wenn mehrere Personen/Telefonie/Räume gebraucht werden.
**OpenAI Realtime/Gemini Live** erst, wenn zusätzlich Cloud-Audio akzeptiert
wird; dann Gemini Live wegen der Kosten, OpenAI wegen Reasoning/Tool-Calls.
**ElevenLabs Agents** ist der pragmatische Mittelweg, wenn ein Key vorhanden
ist: Es liefert die beste Voice-Schicht ohne eigenen Audio-Stack, während die
Quellenprüfung als Client-Tool im Backend bleibt. **ACP** bleibt außen vor.

## 6. Risiken und ehrliche Grenzen

- **Keine Genauigkeits- oder Latenzzusage.** Die Zahlen oben sind einzelne
  Messungen aus diesem Repo bzw. Fremdbenchmarks; sie übertragen sich nicht
  automatisch auf die Jury-Hardware.
- **`speechSynthesis` ist nicht bewiesen lokal.** Der Browser kann eine
  Cloud-Stimme des Herstellers verwenden. Wenn „alles lokal“ im Pitch steht,
  ist Piper die ehrlichere Wahl.
- **Echo.** Lautsprecher + offenes Mikrofon erzeugt Selbsthören. Halbduplex
  oder Kopfhörer, kein ungetestetes AEC.
- **CPU-Konkurrenz.** Whisper und Piper teilen sich den Mac; Gemini läuft in
  der Cloud. `tiny` für Live, `small` für die Batch-Wahrheit; die Cloud-Latenz
  ist von der lokalen CPU unabhängig, aber netzwerkabhängig.
- **Safari/iOS.** `getUserMedia` braucht einen sicheren Kontext; `localhost`
  ist sicher, eine LAN-IP nicht. `MediaRecorder` liefert MP4 statt WebM.
- **Ein Live-Slot.** `WS /speech/live` erlaubt einen Slot pro Prozess; bei
  paralleler Nutzung schließt der Server mit 1013. Für die Demo okay, für
  mehrere Geräte nicht.
- **Kein automatischer Cleanup.** Audio/Transkripte haben weiterhin keine TTL;
  nur synthetische Demo-Daten verwenden.

## 7. Quellen

- Pipecat: <https://docs.pipecat.ai/overview/pipecat>,
  <https://docs.pipecat.ai/pipecat/learn/transports>,
  <https://github.com/pipecat-ai/pipecat>
- Pipecat Piper-Service (GPL-Hinweis):
  <https://reference-server.pipecat.ai/en/stable/api/pipecat.services.piper.tts.html>
- Smart Turn v3: <https://github.com/pipecat-ai/smart-turn>,
  <https://huggingface.co/pipecat-ai/smart-turn-v3>
- LiveKit Agents: <https://docs.livekit.io/agents/>,
  <https://github.com/livekit/agents>
- LiveKit vs. Pipecat (Stand Sept. 2026):
  <https://meetrix.io/blogs/livekit-agents-vs-pipecat/>
- OpenAI Realtime: <https://developers.openai.com/api/docs/guides/realtime>,
  Preise: <https://developers.openai.com/api/docs/pricing>
- Gemini Live: <https://ai.google.dev/gemini-api/docs/live-api>,
  Preise: <https://ai.google.dev/gemini-api/docs/pricing>
- ACP: <https://agentclientprotocol.com/>, <https://zed.dev/acp>
- Qwen3-Omni: <https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct>
- ElevenLabs Agents: <https://elevenlabs.io/docs/eleven-agents/overview>,
  Preise: <https://elevenlabs.io/pricing/agents>,
  Client Tools: <https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools>,
  Auth/Token: <https://elevenlabs.io/docs/eleven-agents/customization/authentication>,
  Next.js: <https://elevenlabs.io/docs/eleven-agents/guides/quickstarts/next-js>,
  Latenz: <https://elevenlabs.io/docs/eleven-api/concepts/latency>,
  Realtime: <https://elevenlabs.io/nl/realtime>
- Piper deutsche Stimmen: <https://huggingface.co/Thorsten-Voice/Piper>,
  <https://huggingface.co/rhasspy/piper-voices>
- Lokale Messwerte: `docs/06-local-coaching.md`,
  `docs/02-ai-decision-log.md` (Voice-Agent, Live-Transkription)

## 8. Deep Research (24.10.2026)

Vollständige Evidenzbasis, Grade und Zitate: `docs/11-deep-research-validation.md`.

**Bestätigt.** Kein neuer Voice-Stack ist für die Demo gerechtfertigt: Die
gemessenen ~9 s stammen aus Modell-Batch-Latenz, nicht aus dem Transport;
WebRTC/Pipecat/LiveKit würden diese Latenz nicht beseitigen, aber neue
Betriebsrisiken einführen. „Unser LLM schreibt, ElevenLabs spricht“ bleibt die
richtige Kontrolle über Quellenbindung und Zitate. Vorgerenderte feste Fragen
und Filler sind ein legitimer Latenzhebel; Streaming bleibt für dynamische
Nachfragen.

**Korrigiert.**

- **Turn-Taking-Ziele:** 200 ms ist der menschliche Mittelwert, kein
  Agenten-Ziel. Praktisch: <700 ms First Audio für bekannte Texte, <1,5 s für
  dynamische Texte mit Filler, >4 s ist schlecht (Stivers et al. 2009;
  Heldner & Edlund 2010; Skantze 2021).
- **Halbduplex ist nicht kostenlos.** Barge-in wirkt in explorativen Studien
  natürlicher; die Demo braucht mindestens einen sichtbaren
  Listening/Speaking-State und eine Stop-Möglichkeit. Naturalness erst nach
  Barge-in-Test beurteilen.
- **„Lokal“ ist mit Gemini/ElevenLabs nicht mehr wahr.** Die Gemini Developer
  API hat kein EU-Region-Pinning; ElevenLabs speichert Text/Audio
  standardmäßig. Cloud-Weg und Einwilligung müssen im UI benannt werden, sonst
  ist die frühere Local-only-Aussage ein Bruch.
- **Vorrendern ist ein Latenz-, kein Natürlichkeitsbeweis.** Nur feste Texte
  cachen, gleiche Stimme/Version, Cache-Key aus Text+Voice+Settings.

**Empirisch geprüft.** `gemini-3.1-flash-lite` mit minimalem Reasoning lieferte
valides JSON in 0,7–1,5 s; der End-to-End-Coaching-Smoke brauchte 3,4 s
(Fact-Check), 2,1 s (Fragen) und 1,7 s (Antwortprüfung). Das stützt den
Batch-Pfad, nicht eine Latenzzusage für die Jury-Hardware.

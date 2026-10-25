# Pitch Mode / Live-Demo-Modus — Plan

Stand: 25.10.2026. Der Kern ist umgesetzt: `/stage`, Preflight, lokaler
Sofortpfad, Stage-Review mit fester Datenschutzfrage und ein hardcodierter
Agent-Kontext. Der normale `/live`-Pfad bleibt parallel bestehen. Die
Live-Backend-Analyse ist opt-in, weil der erste Whisper-Job auf dem
Demo-Laptop deutlich länger dauern kann.

## 0. Umsetzungsstand (25.10.2026)

- `/stage` ist über `NEXT_PUBLIC_STAGE_MODE` gatebar (Default an, `0` = aus).
- Der Preflight prüft Backend, Quellencheck, Kamera/Mikrofon und IndexedDB;
  Berechtigungen werden erst beim Start gefragt.
- **Lokale Sofortaufnahme** ist der Default: `LocalVideoTransport`, sofortiges
  Speichern in IndexedDB, Review ohne Backend-Wartezeit.
- **Live-Pfad** (`/live?stage=1`): Backend-Analyse mit frühem lokalen Speichern
  und 90-s-Wartefrist; dabei bleibt das Video erhalten und „Review jetzt öffnen“
  ist verfügbar.
- `GET /questions/pitch` liefert genau eine feste Datenschutzfrage und den
  hardcodierten Agent-Kontext (`backend/app/questions/pitch.py`) ohne LLM,
  Redis, Quellenabruf oder Anbieter. `PITCH_MODE=0` deaktiviert den Endpunkt.
- Die Stage-Review zeigt die drei `evidence-share-v1`-Kriterien und die feste
  Frage mit 90-s-Antwortfenster. Die Post-Round-Auswertung
  (`evidence-count-heuristic.v1`) bleibt außerhalb der Bühne.
- Das Frontend läuft im Compose-Container als Production-Build; der frühere
  Turbopack-Dev-Pfad ist nicht mehr die Jury-Oberfläche.

## 1. Idee

Zwei Ebenen, bewusst getrennt:

1. **Live-Demo-Bühne** (`/stage`): eine schlanke Regie-Oberfläche, die die
   vorhandene Aufnahme-, Analyse- und Review-Technik wiederverwendet, aber nur
   den Demo-Ablauf zeigt.
2. **Pitch-Preset**: ein Verhaltensprofil derselben Pipeline (Deck, Sprache,
   eine feste Frage, Zeitfenster, Fallbacks), das nur auf der Bühne aktiv ist.

Der vorhandene Produktpfad (`/live`, `/sources`, `/review`, `/gestures`) bleibt
unverändert. Der Pitch Mode ist ein markierter Demo-Pfad wie `/review-preview`,
kein Ersatz für echte Aufnahmen.

## 2. Ablauf der Präsentation

1. **Preflight** (`/stage`, vor dem Auftritt): Kamera/Mikro, IndexedDB,
   Backend-Dienste und Quellencheck prüfen. Der Worker wird dabei nicht geprüft. Jede Zeile
   zeigt `Bereit | Optional | Nicht bereit` mit Klartext-Grund.
2. **Pitch**: Aufnahme mit festem 60-s-Preset, ohne Produkt-Navigation.
   Standard ist der lokale Sofortpfad; der Live-Pfad ist opt-in.
3. **Analyse**: lokal sofort verfügbar; live optional mit 90-s-Timeout.
4. **Stage-Review**: Zeitachse, lokales Video, drei Prototyp-Scores
   (Gestik, Fachwissen, Flow) mit sichtbarer Evidenz und Abdeckung.
5. **Jury-Frage am Ende des Reviews**: genau die feste Datenschutzfrage, per
   Browser vorgelesen; ein Antwortfenster (90 s), keine Nachfrage.
6. **Antwortprüfung**: keine automatische Bewertung auf der Bühne; die
   Kernpunkte sind als vorbereitete Evidenz sichtbar.
7. **Abschluss**: ruhiger Endzustand; lokale Takes bleiben in IndexedDB.

## 3. Route und Zustandsmodell

Neue Route `/stage` (App Router), standardmäßig aktiv und per
`NEXT_PUBLIC_STAGE_MODE=0` gatebar. Zustände:

```
preflight → ready → recording → processing → review → question → answered → done
                 ↘ error (mit konkretem Grund und Fallback-Aktion)
```

- Kein Login, lokal im Browser; Route ist kein öffentliches Deployment.
- Stage-Takes tragen `config.stage = true`; sie bleiben normale lokale Takes
  und werden nicht aus den Listen ausgeblendet.
- Die Stage erzeugt keine eigene Quellen-Collection; der lokale Pfad braucht
  keine Quellen. Der Live-Pfad nutzt die bestehende Collection-Logik.

## 4. Backend

### 4.1 Pitch-Flag statt neuer Präsentationsart

`presentationMode` bleibt `startup | thesis | school | nonprofit` (kein neuer
Enum-Wert, keine DB-Migration). Stattdessen:

- `PITCH_MODE` in `.env` (Default an, `0` deaktiviert `GET /questions/pitch`).
- `backend/app/questions/pitch.py`: feste kanonische Datenschutzfrage,
  Antwortpunkte, vorbereitete Referenz und hardcodierter Agent-Prompt; kein verifiziertes Quellenzitat.
- Kein `pitch_mode`-Feld in `QuestionRequest`; der normale Fragenpfad bleibt
  unverändert.

### 4.2 Feste Frage ohne Retrieval

Retrieval allein findet die Datenschutzfrage nicht zuverlässig. Deshalb liefert
`GET /questions/pitch` die Frage und den Kontext direkt aus dem Modul, ohne
Transkript, Quellen, Redis oder LLM. Die Frage ist an die Datenschutz-Aussage
des Pitches gebunden, nicht an eine Foliennummer.

### 4.3 Keine Server-Runde auf der Bühne

Die Stage verwendet bewusst **keine** ElevenLabs-Runde und keine
`round_id`/`question_id`: Die Frage wird per Browser-Sprachausgabe vorgelesen,
das Antwortfenster ist rein clientseitig (90 s), es gibt keine Nachfrage und
keine automatische Antwortbewertung. Der normale ElevenLabs-Pfad bleibt
unverändert und optional. Damit kann ein fehlender Key die Bühne nicht
blockieren.

### 4.4 Kein Auto-Fact-Check auf der Stage

Die Stage zeigt das Review-Score-System mit vorhandenen Events; ohne
Quellencheck bleibt Fachwissen sichtbar „–“. Der Live-Pfad kann weiterhin
manuell einen Fact-Check starten. Kein Score wird aus fehlenden Daten
erfunden.

## 5. Frontend

Wiederverwenden statt duplizieren:

| Baustein | Verwendung |
|---|---|
| `LiveStudio` (`frontend/src/components/live/LiveStudio.tsx`) | Aufnahme mit `stage`-Prop, 60-s-Preset, lokaler Fallback |
| `recorder.ts` (`frontend/src/features/live/recorder.ts`) | frühes lokales Speichern, 90-s-Analyse-Timeout, Audio-Track-Überwachung |
| `ReviewScores` + `review-scores.ts` | `evidence-share-v1` unverändert |
| `recordingReviewData` (`frontend/src/components/analysis/review-data.ts`) | Claims → Fachwissen |
| `VideoPlayback` | lokales Video, `peakMs`-Sprung |
| `StageQuestion` (`frontend/src/components/stage/StageQuestion.tsx`) | feste Frage, Browser-Vorlesen, 90-s-Antwortfenster |
| `LiveSessionProvider` (`frontend/src/app/layout.tsx:25`) | Kontext bleibt global |

Neue Dateien:

- `frontend/src/app/stage/page.tsx`
- `frontend/src/components/stage/StageConsole.tsx`
- `frontend/src/components/stage/StageQuestion.tsx`
- `frontend/src/features/stage/config.ts`
- `frontend/src/features/stage/http.ts`
- `frontend/src/features/stage/pitch.ts`
- `frontend/src/features/stage/preflight.ts`
- `frontend/src/features/stage/timing.ts`
- `frontend/src/components/live/stage-live.css`

`LiveConfig` (`frontend/src/features/live/contracts.ts`) enthält `stage` und
`analysisTimeoutMs`; die Aufnahme- und Analysepfade bleiben sonst unverändert.

## 6. Feste Werte (Stage-Preset)

| Wert | Standard | Begründung |
|---|---|---|
| `targetMs` | 60 000 | 60-Sekunden-Produktdemo; Recorder stoppt automatisch |
| `answerMs` | 90 000 | eine Antwort, hartes Ende |
| `questions` | 1 | genau eine vorbereitete Datenschutzfrage |
| `followUps` | 0 | keine Nachfrage im Bühnenmodus |
| `language` | `de` | Demo ist deutsch |
| `webSearch` | `false` | feste Frage, reproduzierbar |
| `autoFactCheck` | `false` auf der Stage | lokaler Pfad ohne Backend; Live-Analyse optional |
| Live-Captions | im lokalen Pfad aus | keine Cloud-/ASR-Abhängigkeit |
| Nach-Auswertung | `false` | kein zweites Score-System auf der Bühne |
| Stage-Analyse | `local` | Live ist opt-in (`NEXT_PUBLIC_STAGE_ANALYSIS=live`) |
| Analyse-Timeout | 90 s | danach lokales Video + Review-jetzt |

`reviewScores(moments, durationMs, claims)` und die beiden bestehenden
Score-Systeme (`evidence-share-v1` in `review-scores.ts:3`,
`evidence-count-heuristic.v1` in `performance.ts:26`) bleiben getrennt; die
Bühne zeigt nur das Review-Score-System.

## 7. Deck

- Quelle: `pitch/Pitch-Practice-o.2.pptx`, Generator `pitch/make_pitch_418.js`.
- Ein automatischer Deck-Upload ist nicht umgesetzt; die Stage startet ohne
  PPTX-Abhängigkeit.
- Die feste Frage ist an die Datenschutz-Aussage des Pitches gebunden, nicht an
  eine bestimmte Foliennummer. Die alte Folie-11-Annahme ist überholt.

## 8. Fallbacks und Fehlerzustände

| Ausfall | Verhalten |
|---|---|
| ElevenLabs-Key/Agent fehlt | feste Frage als Text und per Browser-Vorlesen; keine Abhängigkeit |
| Agent-Session scheitert | kein Fake-Dialog; die feste Frage bleibt verfügbar |
| Worker/Backend weg | lokaler Sofortpfad, Review aus Browser-Events; Live-Analyse optional |
| Transkription zu langsam | 90-s-Wartefrist, lokales Video bleibt, „Review jetzt öffnen“ |
| Fact-Check ohne Treffer | Fachwissen „–“ mit sichtbarer Abdeckung, kein 0 |
| Aufnahme zu kurz/leer | lokale Aufnahme + Review; kein Score erfinden |
| Netzwerk im Auftritt | lokale Aufnahme aus IndexedDB (`presentation-recordings`) |

Kein Fallback erfindet Sprache, Zitate oder Scores.

## 9. Phasen

| Phase | Inhalt | Aufwand |
|---|---|---|
| 0 | Deck angleichen, feste Datenschutzfrage | erledigt |
| 1 | Backend `GET /questions/pitch`, `PITCH_MODE`, Tests | erledigt |
| 2 | `/stage` + Preflight inkl. Health-Checks | erledigt |
| 3 | Stage-Aufnahme über `LiveStudio`, 60 s, lokaler Default | erledigt |
| 4 | Stage-Review (Scores, Video, feste Frage) | erledigt |
| 5 | Stage-Frage mit 90-s-Antwortfenster, keine Nachfrage | erledigt |
| 5b | Optionale gesprochene Antwortprüfung | offen (nicht für die Bühne nötig) |
| 6 | Fehlerzustände, frühes Speichern, Trockenlauf | erledigt; realer Kamera-Test offen |
| 7 | Optional: `/stage/health`, Auto-Deck-Upload | offen |

## 10. Abnahmekriterien

- `/stage` führt in unter 3 Minuten vom Preflight bis zum sichtbaren Review.
- Die Stage-Aufnahme ist auf 60 s begrenzt; der lokale Pfad öffnet das Review
  ohne Backend-Wartezeit.
- Der Live-Pfad ist opt-in und beendet das Warten nach 90 s, ohne das lokale
  Video zu verlieren.
- Genau eine vorbereitete Datenschutzfrage wird gezeigt; keine Nachfrage.
- Die Frage und der Agent-Kontext kommen ohne LLM, Redis und Provider aus.
- Fachwissen ist ohne Quellencheck sichtbar „–“, nie 0 aus fehlenden Daten.
- Jede Zahl hat Evidenz und Abdeckung; keine Genauigkeits- oder Notenbehauptung.
- Bei fehlendem ElevenLabs-Key bleibt die Bühne benutzbar.
- Normale Aufnahmen und `/review-preview` bleiben unverändert.

## 11. Entscheidungen (25.10.2026)

1. **Dauer:** 60-s-Produktdemo; der 3-Minuten-Pitch wird mündlich geführt.
2. **Antworturteil:** Die Stage zeigt die feste Frage und Kernpunkte, keine
   automatische Bewertung der gesprochenen Antwort.
3. **Deck:** kein automatischer Upload; das Deck bleibt Präsentationsmaterial.
4. **Zugang:** `/stage` ist standardmäßig aktiv und per
   `NEXT_PUBLIC_STAGE_MODE=0` ausblendbar.
5. **Live-Indikatoren:** lokal keine Captions/Cloud-Abhängigkeit; Live-Analyse
   bleibt optional.
6. **Backup:** lokale Takes in IndexedDB; der vorbereitete Review bleibt der
   zweite Pfad.

## 12. Nicht-Ziele

- Kein öffentliches Deployment, kein Login, kein Smartphone-Pfad.
- Kein neuer `presentationMode`, keine DB-Migration.
- Keine Emotions-, Persönlichkeits- oder Genauigkeitsbewertung.
- Keine serverseitigen Videos/Clips; die Aufnahme bleibt lokal.
- Kein zweites Score-System auf der Bühne.

## 13. Branch-Review (25.10.2026)

- Früher Review und Timeout erhalten auch Pose-Log und Live-Ereignisse.
  Der Browser beendet das Warten; ein bereits eingereihter Backend-Job kann
  weiterlaufen. Lokale Takes werden nur einmal gespeichert.
- Der lokale Pfad fragt keine Backend-Bereitschaft ab und zeigt seinen eigenen
  Einwilligungstext. Ohne Mikrofon ist die stumme Aufnahme sichtbar markiert.
- `config.stage` erhält den Bühnenmodus bei Reload und in vergangenen Aufnahmen.
  Compose reicht die Stage-Build-Flags und das Backend-Flag tatsächlich weiter.
- Preflight-Fristen gelten auch für stockende Antwort-Bodies. Der Health-Check
  prüft Dienste, nicht den Worker; IndexedDB wird nur als Browser-API erkannt.
- Die vorbereitete Referenz nennt lokale Speicherung, temporäre Uploads und
  Gemini, Deepgram sowie ElevenLabs. Sie wird nicht als geprüfter Upload-Beleg
  ausgegeben. Browser-Vorlesen wählt ausschließlich eine lokale deutsche Stimme.
- Automatisierte Regressionen verwenden synthetisches Video, Audio und
  Landmarks. Echter Kamera-/Mikrofon-/Stimmen-Test und Safari bleiben Geräte-Abnahme.
- Verifiziert nach Integration des aktuellen `main`: 316 Frontend-Tests,
  370 Backend-Tests (54 optionale Integrationsprüfungen übersprungen),
  17 Compose-Prüfungen, Lint, Typecheck und API-Schema-Abgleich. Die
  Browser-Erwartungen verwenden die neue Agent-Begrüßung ohne Tempo-Tag.
- 68 Browser-Szenarien für Studio, Stage und Seitenaufrufe sind erfolgreich;
  darunter früher Review mit ausgeblendeten Landmarks, Reload, Mikrofon-Ausfall
  und lokaler Betrieb ohne Analyse-Traffic. Zusätzlich bestehen fünf
  Stage-Szenarien gegen das gebaute Produktionsimage und zwölf HTTP-Prüfungen.
- Produktionsimage gebaut, zwölf Architektur-Diagramme gerendert. Lokaler
  Whisper-Smoke-Test mit VAD: deutsche Sprachfixture liefert Wörter,
  Stille liefert keine. Das belegt den technischen Pfad, keine Erkennungsqualität.

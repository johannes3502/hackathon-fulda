# Offene TODOs — Stand 25.10.2026

Diese Liste trennt erledigte Änderungen und offene Abnahme. Stand nach dem
reviewten Merge von `feature/structure-safety-scores`, 25.10.2026.

## P0 — vor Jury/Feature Freeze entscheiden

- [x] **Struktur aus den Review-Kriterien entfernen.** Nutzerentscheidung
  25.10.2026: drei Kriterien (Gestik, Fachwissen, Flow). Ältere Struktur-Momente
  bleiben allgemeine Anmerkungen; sie erzeugen keinen eigenen Score.
- [ ] **Long-Term-Progress an Live-Takes anbinden.** Das Web-Frontend ruft
  `/sessions` und `/takes` nicht auf; `/progress` hat für echte Profile keine
  Daten. Checkliste in `13-long-term-progress-frontend-contract.md` §2
  abarbeiten, inklusive `profileId`, `deviceKey`, `takeId`-Zuordnung und
  lokalem Video-Link.
- [x] **Profil-Retention und Take-Job-Cleanup.** Ein Compose-Beat plant täglich
  um 03:15 UTC begrenzte Batches; Profile werden gelöscht, Sessions/Takes nur
  entkoppelt. Verknüpfte Sessions haben keine automatische Session-Frist.
  Explizite Profilfristen bleiben erhalten. S3-Löschungen laufen über eine
  transaktionale Outbox mit Retry. Legacy-S3-Ergebnisse und Quellen bleiben P1.
- [ ] **Session-/Take-Löschung serverseitig.** Lokal ist Löschen bereits
  umgesetzt (IndexedDB, `LiveReview` → „Delete saved session“). Das Backend
  `DELETE /sessions/{id}` kaskadiert, wird vom Web-Frontend aber nicht
  aufgerufen, weil die persistente Session-/Take-API noch nicht angebunden ist.
  Nach der Persistenz-Anbindung: `DELETE` mit Profil-Token, lokale und
  serverseitige Daten gemeinsam bestätigen, Verhalten bei 404/410/offline
  testen.
- [x] **Runden- und Browserlimits.** Fragen-/Take-API nutzen Redis-Runden mit
  fester TTL, reservierten Turns, globalem Follow-up-Limit und Review-Cache.
  ElevenLabs wird im Browser nach 600 s ab Start oder 12 Nutzerbeiträgen
  beendet; auch Verbindungsaufbau und späte SDK-Verbindungen werden abgebrochen.
  Nonce-Blöcke und strikte Schemata ergänzen die Zitat-/Zahlenprüfung.
  Client-Fact-Check-Funde bleiben untrusted; kein vollständiger Injection-Schutz.
- [ ] **Anbieter-Limits abnehmen.** Browser-Timer ersetzen keine harten Grenzen
  im ElevenLabs-Konto. Tatsächlichen Anbieter-Abbruch und Mikrofon-Freigabe auf
  dem Demo-Gerät prüfen. Automatisches Antwortende per Stille bleibt separat.
- [ ] **Zwei Score-Systeme klar trennen.** Review nutzt
  `evidence-share-v1` (drei Kriterien, Zeitanteile/Quellenurteile), die
  Auswertung nach der Fragerunde `evidence-count-heuristic.v1` (drei
  Kategorien, Marker/Urteile). Nicht addieren oder vergleichen. Die Stage
  zeigt nur das Review-System und blendet die Post-Round-Auswertung aus; der
  normale Pfad bleibt getrennt. Später entscheiden, ob beide bleiben oder
  vereinheitlicht werden.
- [x] **Demo-Härtung.** Das Compose-Frontend baut seit 25.10.2026 als
  Production-Build (`frontend/Dockerfile`); Turbopack/HMR-Hydrationfehler des
  Dev-Containers sind damit nicht mehr der Jury-Pfad. `docker compose up
  --build -d --wait` und danach `/stage` prüfen. Der Healthcheck deckt
  `/review-preview`, `/demo`, `/gestures`, `/sources`, `/progress`, `/admin`
  und `/api/health/ready` ab; `/stage` wird im Preflight geprüft.
- [x] **Pitch Mode / Stage.** `/stage` mit Preflight, lokalem Sofortpfad als
  Default, optionalem Live-Pfad, 90-s-Analyse-Abbruch und frühem lokalen
  Speichern. `GET /questions/pitch` liefert genau eine feste Datenschutzfrage
  und einen hardcodierten Agent-Kontext ohne LLM/Redis/Provider. Der normale
  `/live`-Pfad bleibt parallel bestehen; `PITCH_MODE=0` bzw.
  `NEXT_PUBLIC_STAGE_MODE=0` deaktivieren die Stage-Surface.
- [ ] **Live-ASR-Warmlauf.** Der erste Whisper-Job kann auf dem Demo-Laptop
  deutlich länger dauern; die Stage bricht nach 90 s ab und behält das lokale
  Video. Vor der Jury einen synthetischen Take warmlaufen lassen,
  `CELERY_WORKER_CONCURRENCY=1` setzen und die Live-Dauer messen. Bei
  unklarer Latenz bleibt die lokale Sofortaufnahme der Bühnenpfad. Gemessen am
  25.10. auf dem Demo-Laptop: kalter 4-s-Job ca. 6 min, warmer 4-s-Job ca. 29 s;
  ohne VAD blockierte ein synthetischer Ton den Job bis zum 600-s-Limit.
  `WHISPER_VAD_FILTER=true` ist daher der Compose-Default; deutsche Sprache
  wurde mit dem Test-Fixture transkribiert.
- [ ] **Localhost/QR/Smartphone entscheiden.** `compose.yaml` bindet nur
  `127.0.0.1`; ein Jury-Gerät oder QR-Code ist damit nicht erreichbar. Wenn
  nötig: HTTPS-Tunnel, `0.0.0.0`-Bind und CORS anpassen. Sonst in der
  Demo-Anleitung ausdrücklich „nur Demo-Laptop“ festhalten.
- [ ] **Demo-Backup.** Es gibt kein Screen-Recording und kein gerendertes
  Promo-Video (`promo/out` fehlt). Vor der Jury Screenshots/Video des
  Sample-Demos und des Live-Review-Pfads ablegen.
- [ ] **Kamera-Abnahme.** Framing, reale Zeitzuordnung, 2-s-Mindestdauern und
  Safari/iPhone aus `05-jury-demo.md` mit gezählten Versuchen prüfen.

## P1 — nach dem Hackathon

- [ ] Retention für Legacy-S3-Ergebnispräfixe und Quellen-Collections ergänzen.
  Kein verifiziertes S3-Lifecycle-Backstop vorhanden.
- [ ] Optionalen Web-Fallback (`WEB_SEARCH_PROVIDER=wikipedia`) und
  Deepgram/ElevenLabs im Demo-Setup bewusst aktivieren oder ausschalten und
  im Pitch nicht als aktiv behaupten.
- [ ] Automatisches Antwortende per Stille (VAD); Browser-Sitzungstimer ist umgesetzt.
- [x] Mobile-Workspace ist bereits auf `main` entfernt; Root-Checks nutzen nur das Web-Frontend.
- [ ] Backend-Testpackaging: `templates/` wird nicht ins Backend-Image kopiert;
  `test_web_search_tool_uses_server_secret_and_bounded_results` schlägt nur im
  Container fehl. `COPY templates/ /templates/` ergänzen oder den Test
  überspringen, wenn die Vorlage fehlt.

## P2 — Kleinigkeiten

- [x] Consent-Text benennt lokale Endpunkte als „this local server“.
- [x] Favicon und App-Icons vorhanden.
- [ ] Sprachkonsistenz: Start/Progress deutsch, Studio/Review englisch;
  `html lang="en"` für deutsche Startseite prüfen.
- [ ] Hydration-Warnung auf `/demo` beseitigen.
- [x] Take-Optionen heißen `TakeFactcheckRequest`; kein nur durch Großschreibung
  abweichendes OpenAPI-Modell mehr.
- [ ] Untracked Demo-Material (`test-presentations/`,
  `scripts/make_test_presentations.py`) committen oder entfernen.
- [ ] README-/Doc-Reste nach dem Score-Update regelmäßig gegen den Code
  prüfen (historische Entscheidungslogs nicht rückwirkend ändern).

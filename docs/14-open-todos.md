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
  Kategorien, Marker/Urteile). Nicht addieren oder vergleichen; im UI als
  „Review-Evidenz“ vs. „Auswertung nach der Fragerunde“ benennen. Später
  entscheiden, ob beide bleiben oder vereinheitlicht werden.
- [ ] **Demo-Härtung.** Der Compose-Frontend läuft im Dev-Modus
  (`frontend/Dockerfile:19`). Nach Merges kann Turbopack neue Module nicht
  finden (beobachtet: `/review-preview` 500; Restart behob es). Vor der Jury
  frisch bauen/restarten und/oder auf Production-Build wechseln. Der Healthcheck
  deckt inzwischen auch `/review-preview`, `/demo`, `/gestures`, `/sources`,
  `/progress` und `/admin` ab; das persistente Next-Volume entfällt.
- [ ] **Localhost/QR/Smartphone entscheiden.** `compose.yaml` bindet nur
  `127.0.0.1`; ein Jury-Gerät oder QR-Code ist damit nicht erreichbar. Wenn
  nötig: HTTPS-Tunnel, `0.0.0.0`-Bind und CORS anpassen. Sonst in der
  Demo-Anleitung ausdrücklich „nur Demo-Laptop“ festhalten.
- [ ] **Demo-Backup.** Es gibt kein Screen-Recording und kein gerendertes
  Promo-Video (`promo/out` fehlt). Vor der Jury Screenshots/Video des
  Sample-Demos und des Live-Review-Pfads ablegen.
- [ ] **Kamera-Abnahme.** Framing, reale Zeitzuordnung, Mindestdauern und
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

# Offene TODOs — Stand 25.10.2026

Diese Liste hält Punkte fest, die bewusst nicht in diesem Change umgesetzt
wurden. Erledigt wurden nur Pitch-Korrekturen, der reproduzierbare
Pitch-Generator und der Doku-Abgleich.

## P0 — vor Jury/Feature Freeze entscheiden

- [x] **Struktur aus den Review-Kriterien entfernen.** Nutzerentscheidung
  25.10.2026: drei Kriterien (Gestik, Fachwissen, Flow). Ältere Struktur-Momente
  bleiben allgemeine Anmerkungen; sie erzeugen keinen eigenen Score.
- [ ] **Long-Term-Progress an Live-Takes anbinden.** Das Web-Frontend ruft
  `/sessions` und `/takes` nicht auf; `/progress` hat für echte Profile keine
  Daten. Checkliste in `13-long-term-progress-frontend-contract.md` §2
  abarbeiten, inklusive `profileId`, `deviceKey`, `takeId`-Zuordnung und
  lokalem Video-Link.
- [ ] **Retention/Cleanup der 12-Monats-Frist.** Die UI nennt 12 Monate
  (`ProgressDashboard.tsx:911`), aber es gibt keinen Löschjob. Benötigt:
  täglicher Celery-Cleanup für abgelaufene Profile (Progress-Daten, Ziele,
  Snapshots, Change-Points, `take_metrics`/`take_quality`; Sessions/Takes
  dabei entkoppeln, nicht automatisch löschen), konfigurierbare Frist und
  Tests für idempotente Wiederholung. S3-Analyseergebnisse und Jobs brauchen
  eine eigene TTL/Cleanup-Regel. Bis dahin die UI-Formulierung auf
  „Zugriff gesperrt; automatische Löschung folgt“ ändern oder die Frist
  entfernen.
- [ ] **Session-/Take-Löschung serverseitig.** Lokal ist Löschen bereits
  umgesetzt (IndexedDB, `LiveReview` → „Delete saved session“). Das Backend
  `DELETE /sessions/{id}` kaskadiert, wird vom Web-Frontend aber nicht
  aufgerufen, weil die persistente Session-/Take-API noch nicht angebunden ist.
  Nach der Persistenz-Anbindung: `DELETE` mit Profil-Token, lokale und
  serverseitige Daten gemeinsam bestätigen, Verhalten bei 404/410/offline
  testen.
- [ ] **Prompt-Safety-Grenzen erzwingen.** Im getippten Pfad sind
  `max_questions` und ein Follow-up pro Antwort vorhanden, aber es gibt keinen
  globalen Follow-up-/Turn-Cap und keinen Sitzungstimer. Im Voice-Pfad sind
  10 Minuten Hard Stop und Turn-Grenzen nur Prompt-Vorgaben. Getippter Pfad:
  serverseitige Zähler/Validator. Voice/ElevenLabs: Client-Timer,
  Turn-Zähler, sichtbarer Stop und `endSession`, Abschlussgrund loggen.
  Automatisches Antwortende per Stille bleibt separat.
- [ ] **Zwei Score-Systeme klar trennen.** Review nutzt
  `evidence-share-v1` (drei Kriterien, Zeitanteile/Quellenurteile), die
  Auswertung nach der Fragerunde `evidence-count-heuristic.v1` (drei
  Kategorien, Marker/Urteile). Nicht addieren oder vergleichen; im UI als
  „Review-Evidenz“ vs. „Auswertung nach der Fragerunde“ benennen. Später
  entscheiden, ob beide bleiben oder vereinheitlicht werden.
- [ ] **Demo-Härtung.** Der Compose-Frontend läuft im Dev-Modus
  (`frontend/Dockerfile:19`). Nach Merges kann Turbopack neue Module nicht
  finden (beobachtet: `/review-preview` 500; Restart behob es). Vor der Jury
  frisch bauen/restarten und/oder auf Production-Build wechseln. Healthcheck
  um `/review-preview`, `/demo`, `/gestures`, `/sources`, `/progress`,
  `/admin` erweitern.
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

- [ ] Retention auch für Audio-/S3-Ergebnisse, Jobs, Idempotency-Einträge und
  Quellen-Collections dokumentieren und testen.
- [ ] Optionalen Web-Fallback (`WEB_SEARCH_PROVIDER=wikipedia`) und
  Deepgram/ElevenLabs im Demo-Setup bewusst aktivieren oder ausschalten und
  im Pitch nicht als aktiv behaupten.
- [ ] Automatisches Antwortende per Stille (VAD) und Sitzungstimer.
- [ ] Root-Checks für den Mobile-Workspace wiederherstellen
  (`npm ci` oder Mobile aus den Workspaces nehmen).
- [ ] Backend-Testpackaging: `templates/` wird nicht ins Backend-Image kopiert;
  `test_web_search_tool_uses_server_secret_and_bounded_results` schlägt nur im
  Container fehl. `COPY templates/ /templates/` ergänzen oder den Test
  überspringen, wenn die Vorlage fehlt.

## P2 — Kleinigkeiten

- [ ] Consent-Text zeigt technisch `/api` statt „local server“
  (`LiveStudio.tsx:541`).
- [ ] Favicon fehlt (`/favicon.ico` 404).
- [ ] Sprachkonsistenz: Start/Progress deutsch, Studio/Review englisch;
  `html lang="en"` für deutsche Startseite prüfen.
- [ ] Hydration-Warnung auf `/demo` beseitigen.
- [ ] OpenAPI-Schemas `FactCheckRequest` und `FactcheckRequest` unterscheiden
  nur in Groß-/Kleinschreibung; für generierte Clients umbenennen.
- [ ] Untracked Demo-Material (`test-presentations/`,
  `scripts/make_test_presentations.py`) committen oder entfernen.
- [ ] README-/Doc-Reste nach dem Score-Update regelmäßig gegen den Code
  prüfen (historische Entscheidungslogs nicht rückwirkend ändern).

# Offene TODOs — Stand 25.10.2026

Diese Liste trennt offene Produktarbeit von verifizierten Korrekturen.
Der Cleanup vom 25.10.2026 aktualisiert erledigte Punkte; historische
Entscheidungslogs bleiben erhalten.

## P0 — vor Jury/Feature Freeze entscheiden

- [x] **Struktur aus den Review-Kriterien entfernen.** Nutzerentscheidung
  25.10.2026: drei Kriterien (Gestik, Fachwissen, Flow). Ältere Struktur-Momente
  bleiben allgemeine Anmerkungen; sie erzeugen keinen eigenen Score.
- [ ] **Long-Term-Progress an Live-Takes anbinden.** Das Web-Frontend ruft
  `/sessions` und `/takes` nicht auf; `/progress` hat für echte Profile keine
  Daten. Checkliste in `13-long-term-progress-frontend-contract.md` §2
  abarbeiten, inklusive `profileId`, `deviceKey`, `takeId`-Zuordnung und
  lokalem Video-Link.
- [ ] **Retention/Cleanup der 12-Monats-Frist.** Die UI benennt jetzt
  die Zugriffssperre nach 12 Monaten und die fehlende automatische Löschung. Benötigt:
  täglicher Celery-Cleanup für abgelaufene Profile (Progress-Daten, Ziele,
  Snapshots, Change-Points, `take_metrics`/`take_quality`; Sessions/Takes
  dabei entkoppeln, nicht automatisch löschen), konfigurierbare Frist und
  Tests für idempotente Wiederholung. S3-Analyseergebnisse und Jobs brauchen
  eine eigene TTL/Cleanup-Regel, auch für gleichzeitig ausgefallene Queue und
  Storage bei abgelehnten Jobs. Fehler beim Löschen terminaler Job-Inputs
  werden bereits mit dem gespeicherten Ergebnis erneut versucht.
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
- [x] **Score-Formel vereinheitlichen.** Review und Auswertung nach der
  Fragerunde verwenden `evidence-share-v1`: positive Zeit gegen positive +
  kritische Zeit; nur zitateverifizierte, entscheidbare Quellenurteile.
  Die Fragerunde ergänzt Antwort-Urteile und behält ihre sichtbare Gewichtung.
  Transkript allein und fehlende Warnungen erzeugen weder Score noch Lob.
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
- [x] Der native Mobile-Workspace wurde entfernt; `lint`, `typecheck` und
  Tests prüfen den verbleibenden Web-Workspace.
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
- [x] Demo-Material (`test-presentations/`,
  `scripts/make_test_presentations.py`) ist bereits versioniert.
- [ ] README-/Doc-Reste nach dem Score-Update regelmäßig gegen den Code
  prüfen (historische Entscheidungslogs nicht rückwirkend ändern).

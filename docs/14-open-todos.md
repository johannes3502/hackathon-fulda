# Offene TODOs — Stand 25.10.2026

Diese Liste beschreibt den tatsächlichen Stand auf `feature/structure-safety-scores`.
Erledigte Punkte bleiben als Nachweis kurz markiert; offen ist nur, was im Code
oder in der Abnahme noch fehlt. Es gibt weiterhin keine Zusage für
Erkennungsgenauigkeit, Lernwirksamkeit, Rechtssicherheit oder vollständigen
Schutz vor Prompt-Injection.

## Erledigt in diesem Change

- [x] **Aufbau im Live-Pfad.** Deterministische Rubrik
  `structure-rubric-v1` in `frontend/src/features/structure/`: DE/EN-Marker,
  Satz- und Abschnittserkennung, Einstieg, Abschluss, Abschnitte, Übergänge.
  Ein Score entsteht nur mit mindestens drei verfügbaren Signalen, 50 Wörtern
  und 45 Sekunden. Eingebunden in `reviewScores` v2, Review-Timeline und beide
  Review-Ansichten. Folienabdeckung ist **nicht** umgesetzt.
- [x] **Review-Evidenzprofil v2.** `evidence-share-v2` in
  `frontend/src/features/live/review-scores.ts`: Körper & Gesten, Quellenbezug,
  Sprechfluss, Aufbau; Zeitformel mit Glättung und Wilson-95-%-Spanne,
  Quellenbezug nur mit geprüftem Zitat; Schwellen für vorläufig/ausreichend;
  kein Gesamtscore.
- [x] **Auswertung nach der Fragerunde v2.** `practice.evidence.v2` in
  `frontend/src/features/evaluation/performance.ts`: vier getrennte Zeilen
  (Quellenbindung Vortrag, Quellenbindung Antworten, Sprechmerkmale, Pose/Gesten).
  Nur die Quellenbindung liefert Schätzungen; Sprech- und Pose-Zeilen zählen
  Marker. Kein Gesamtscore, keine Gewichte, keine Labels.
- [x] **Prompt-Sicherheit und Rundenlimits.** Serverseitig ausgestellte
  Redis-Runde (`round_id` + `question_id`), kanonische Frage nur vom Server,
  TTL 600 s (konfigurierbar 60–3600 s), maximal 5 Startfragen, 3 Follow-ups und
  standardmäßig 6 Antwort-Turns (bis 12 konfigurierbar), 4000 Zeichen pro
  Antwort, 25 MB Voice-Upload, eine akzeptierte Auswertung pro Frage,
  idempotenter identischer Retry, nonce-delimitierte untrusted-Blöcke, strikte
  Ausgabeprüfung und nur sichere `http(s)`-URLs. Prompt-Injection ist damit
  **nicht gelöst**.
- [x] **Retention.** Täglicher Celery-Beat um 03:15 UTC (`retention_sweep`),
  `RETENTION_*`-Konfiguration, `retention_runs`, `blob_deletions`-Outbox,
  Profil-Ablauf entfernt profil-eigene Daten und entkoppelt Sessions/Takes;
  `DELETE /profiles/{id}?deleteSessions=true` löscht optional auch die
  serverseitige Analyse; Session-Löschung committet zuerst die DB und flusht
  danach die S3-Outbox; hängende Jobs werden nach 2 h fehlgeschlagen, terminale
  Jobs nach 30 Tagen gelöscht, abgelaufene Idempotenz entfernt.
- [x] **Kleine Fixes.** Consent-Text nennt relative/lokale Backends „this local
  server“; Favicon/Icon/Apple-Icon vorhanden; `TakeFactcheckRequest` ist ein
  eigener Schema-Name; `templates/` ist im Compose-Backend unter `/templates`
  gemountet; das Frontend-`.next`-Volume ist entfernt, `restart: unless-stopped`
  gesetzt und der Healthcheck deckt `/`, `/demo`, `/gestures`, `/sources`,
  `/progress`, `/admin`, `/live`, `/live/healthcheck/review`, `/review-preview`
  und `/api/health/ready` ab; `.playwright-mcp/` ist ignoriert;
  `frontend/next-env.d.ts` wird generiert und ignoriert; `reportlab` steht in
  den Dev-Requirements.
- [x] **Prüfstand.** Backend 370 bestanden, 2 übersprungen; Frontend 315
  bestanden in 44 Dateien; Lint, Typecheck und Build grün. Das ist ein
  synthetischer Teststand, keine Qualitäts- oder Geräteabnahme.

## P0 — vor der Jury

- [ ] **Demo-Backup und frischer Start.**
  - [ ] Screenshots oder Screen-Recording des Sample-Demos und des echten
    Live-Review-Pfads außerhalb des Repos ablegen.
  - [ ] Vor der Vorführung frisch bauen und `frontend` neu starten; der
    Dev-Modus mit Turbopack bleibt ein Restrisiko für neu gemergte Module.
  - [ ] Healthcheck und `/api/health/ready` auf dem Demo-Laptop prüfen.
  - **Abnahme:** Ein vollständiger Durchlauf gelingt nach frischem Start ohne
    manuellen Eingriff; ein aufgezeichneter Backup-Pfad liegt bereit.

- [ ] **Kamera- und Zeitabnahme auf dem Demo-Gerät.**
  - [ ] Framing (Schultern/Hüften/Hände), Mindestdauern und Cooldown mit
    gezählten Versuchen prüfen.
  - [ ] Prüfen, dass ein Marker die tatsächlich gezeigte Bewegung trifft,
    einschließlich Anfang und Ende der Aufnahme.
  - [ ] Neutralstellung, Hand hoch, Hände zusammen und seitlicher Versatz
    dokumentieren; Fehlalarme und Nicht-Erkennungen mitzählen.
  - **Abnahme:** Tabelle in `docs/05-jury-demo.md` enthält Gerät, Browser,
    Licht, Position, Versuche und Treffer; offene Safari-/iPhone-Punkte bleiben
    ausdrücklich offen, falls nicht getestet.

## P1 — nach dem Hackathon

- [ ] **Long-Term-Progress an Live-Takes anbinden.**
  Das Web-Frontend ruft `/sessions` und `/takes` nicht auf; `/progress` hat für
  echte Profile keine Daten. `profileId`, `deviceKey`, `takeId`-Zuordnung und
  lokaler Video-Link fehlen.
  - **Abnahme:** Checkliste in
    `docs/13-long-term-progress-frontend-contract.md` §2 ist abgearbeitet; eine
    echte Aufnahme erscheint nach Reload als Progress-Punkt, und ein fehlendes
    lokales Video führt zu einem klaren Hinweis statt zu einem toten Link.

- [ ] **Quellen-/S3-Lebenszyklus verifizieren.**
  Der tägliche Sweep erfasst Profile, Sessions, Review-Jobs, Idempotenz und die
  Blob-Outbox. Quellen-Collections und mehrere S3-Präfixe (u. a.
  `agent-context-jobs`, ältere Analysepfade) werden nicht vollständig
  durchsucht; für Legacy-Präfixe ist eine S3-Lifecycle-Regel nur der
  Backstop und im Betrieb nicht nachgewiesen.
  - **Abnahme:** Ein synthetischer Lauf zeigt für jede Kategorie, ob Metadaten
    und Objekte verschwinden; Lifecycle-Regeln sind dokumentiert und geprüft.
    Bis dahin keine Aussage „alle Daten werden gelöscht“.

- [ ] **Harte Grenzen für den Voice-Anbieter.**
  Der getippte Pfad ist serverseitig begrenzt; im ElevenLabs-Voice-Pfad sind
  Timer und Turn-Grenzen im Browser (600 s, 12 Antworten) und im Agenten-Prompt
  vorhanden. Ob der Anbieter zusätzlich harte Limits erzwingt, hängt von der
  Agenten-Konfiguration ab und ist nicht im Code garantiert.
  - **Abnahme:** Entweder sind äquivalente harte Limits im Anbieterkonto
    konfiguriert und dokumentiert, oder der Voice-Pfad wird für die Demo
    deaktiviert. Keine Aussage, der Provider erzwinge die Grenzen automatisch.

- [ ] **Automatisches Antwortende per Stille.**
  Aktuell beendet der Nutzer die gesprochene Antwort mit „Done“.
  - **Abnahme:** Ein VAD-basiertes Ende mit Mindeststille, Abbruchmöglichkeit
    und dokumentierter Fehlalarmquote auf synthetischen Daten; ohne echte
    Geräteabnahme bleibt die Funktion als unvalidiert markiert.

- [ ] **Authentifizierung und Rate Limiting für die lokale API.**
  Die API ist für `localhost` gedacht und hat keine allgemeine Anmeldung; die
  Profil-Routen nutzen nur den Profil-Token. Ein Betrieb außerhalb des
  Demo-Laptops ist nicht abgesichert.
  - **Abnahme:** Entweder bleibt die Bindung ausdrücklich auf `127.0.0.1`
    beschränkt und dokumentiert, oder es gibt Auth, Rate Limits, CORS-Prüfung
    und Lasttests. Keine öffentliche Freigabe ohne diesen Schritt.

- [ ] **Vorlagen ins Backend-Image aufnehmen.**
  Compose mountet `./templates:/templates:ro`; das Image selbst enthält die
  Vorlagen nicht. Dadurch hängt z. B. der Web-Search-Vorlagentest am Mount.
  - **Abnahme:** `COPY templates/ /templates/` oder ein äquivalenter Build-Schritt
    ist vorhanden; die Tests laufen ohne Compose-Mount im Container.

## P2 — Kleinigkeiten und offene Produktlücken

- [ ] **Root-Checks für den Mobile-Workspace wiederherstellen.**
  `npm ci` bzw. die Workspace-Prüfung für `mobile/` ist nicht durchgängig
  grün.
  - **Abnahme:** Root-Installation und Mobile-Typecheck/Lint laufen ohne
    Sonderpfad; die nativen App-Flows bleiben unverändert.

- [ ] **Sprachkonsistenz.**
  Start/Progress sind deutsch, Studio/Review überwiegend englisch;
  `html lang="en"` für deutsche Seiten prüfen.
  - **Abnahme:** Eine Sprachregel pro Route ist dokumentiert und umgesetzt;
    keine gemischten Beschriftungen in einem Bedienfluss.

- [ ] **Folien-/Quellenabdeckung für den Aufbau.**
  `structure-rubric-v1` nutzt nur Wörter und Zeitstempel. Ob der Vortrag die
  hochgeladenen Folien abdeckt, wird nicht gemessen.
  - **Abnahme:** Eine eigene, evidenzbasierte Regel mit sichtbaren Belegen und
    ausdrücklichem „unvalidiert“-Hinweis; keine erfundene Abdeckungsquote.

- [ ] **S3-Lifecycle und Altpräfixe beobachten.**
  Für ältere Präfixe existiert nur ein externer Lifecycle-Backstop. Ob er im
  lokalen SeaweedFS greift, ist nicht verifiziert.
  - **Abnahme:** Ein dokumentierter Test oder eine bewusst entfernte
    Lifecycle-Annahme; keine stille Berufung auf nicht geprüfte Aufbewahrung.

## Bewusst nicht behauptet

- Aufbau ist **heuristisch und nicht validiert**; fehlende Marker belegen
  keinen fehlenden Übergang, und Folien werden nicht geprüft.
- Die Evidenzprofile sind **keine Noten** und werden nicht zu einem
  Gesamtscore verrechnet.
- Prompt-Injection ist **nicht vollständig verhinderbar**; die Maßnahmen sind
  Defense-in-Depth.
- Retention ist **keine Rechtsgarantie** und kein Nachweis vollständiger
  Löschung aller S3-Kopien.
- Die Testzahlen belegen weder Erkennungsgenauigkeit noch Lernwirksamkeit.

# Landing, Fortschritt und Feature-Tour

Stand: 25.10.2026. Umsetzung und Grenzen der Startseite, Navigation und
Fortschrittsflächen für die Jury-Demo.

## 1. Entscheidungen

- **Sichtbare Navigation:** Home, Vergangene Aufnahmen und Fortschritt bleiben
  Textlinks im Header. Admin wandert als `UserCog`-Icon mit `aria-label` und
  `title` in die rechte Aktionsgruppe. Das folgt der NN/g-Empfehlung, zentrale
  Bereiche sichtbar statt in Menüs zu verstecken; die drei Links bleiben auch
  mobil ohne Hamburger erreichbar.
- **Fortschritt im Arbeitsbereich:** Der `ProgressTeaser` steht als volle Karte
  zwischen den Kennzahlen und der Take-Liste. Er zeigt nur echte
  PostgreSQL-Daten des lokal gespeicherten Profils, eine Messreihe und ehrliche
  Leer-/Fehlerzustände. Ohne Profil gibt es keine Ersatzzahlen, nur den Weg zu
  `/progress`. Die Feature-Entdeckung folgt damit dem GitLab-Muster „implizit
  sichtbar“ statt Modal oder separater Marketingseite.
- **Feature-Tour auf `/`:** Vier Kapitel (Live-Feedback, Review, Quellencheck,
  Fortschritt) zwischen Präsentations-Intro und Arbeitsbereich. Die Tour
  erklärt den Prototyp, ohne den Aufnahme-Pfad zu ersetzen. Der Quellencheck
  enthält den Frage-Simulator als kleinen Beat; eine fünfte Vollbreite gibt es
  bewusst nicht. Die CXL-/HubSpot-Empfehlung, Navigation auf
  Conversion-Seiten sichtbar zu halten, stützt den sichtbaren Header.
- **Bewegung:** GSAP und ScrollTrigger werden erst im Client-Effekt dynamisch
  geladen. Es gibt nur einen einmaligen Reveal und einen leisen Crossfade der
  Medien (Transform/Opacity). Kein Pinning, kein Scroll-Jacking, kein Autoplay.
  `gsap.matchMedia` schaltet unter `prefers-reduced-motion: reduce` alles ab
  (web.dev: Motion & Accessibility).
- **Tastatur:** Die Kapitel sind eine echte Tablist mit Roving-Tabindex,
  Pfeiltasten, Home und End. Fokus ist sichtbar; die Sektion selbst zeigt
  keinen Fokusrahmen, damit ein Sprung per Hash nicht wie ein Riesen-Button
  wirkt.
- **Datenschutz/Transparenz:** Die Landing-Assets enthalten keine
  Demo-/Synthetik-Labels. Die Fußnote außerhalb der Bilder benennt Prototyp,
  Beispieldaten und den fehlenden Genauigkeits-/Notenanspruch. Die normalen
  App-Routen behalten ihre Transparenz-Labels.

## 2. Herkunft der Assets

Alle Medien stammen aus der laufenden App; es gibt kein Fremdmaterial.

| Datei | Quelle | Inhalt |
|---|---|---|
| `frontend/public/landing/live-review.webp` | `/gestures?capture=1` | synthetisches Skelett mit ruhigem Live-Hinweis |
| `frontend/public/landing/review-timeline.mp4` | `/review-preview?capture=1` | 11,4 s stumme Bildschirmaufnahme der Review-Ansicht mit injiziertem Cursor und Klick-Ripple |
| `frontend/public/landing/review-timeline-poster.webp` | Standbild derselben Review-Ansicht | Poster für das `<video>` |
| `frontend/public/landing/factcheck-quote.webp` | `/review-preview?capture=1` | Detail-Ausschnitt der Quellen-Annotation mit Zitat und Quelle |
| `frontend/public/landing/progress-series.webp` | `/progress` mit Showcase-Profil | Messreihen-Grid ohne sichtbare Demo-Labels |
| `frontend/public/review-demo/presentation.mp4` | `frontend/scripts/generate-review-demo.py` | bestehendes synthetisches 90-s-Video, neu mit rundem Mark-Logo und ohne Demo-Label |
| `frontend/public/review-demo/poster.png` | derselbe Generator | Poster zum 90-s-Video |

Das runde Mark-Asset `frontend/public/brand/418-pitch-practice-mark.png` wird
in Header, Landing-Abschnitt, Video-Folien, Poster und Screenshots im runden
`.brand-logo`-Container verwendet. Das alte `418-pitch-practice.png` bleibt
nur als Bestandsdatei liegen.

### Reproduzierbare Aufnahme

Voraussetzung: Dev-Server auf Port 3100, Showcase-Seed gelaufen, Chromium von
Playwright installiert.

```powershell
$env:CAPTURE_BASE_URL = "http://127.0.0.1:3100"
$env:SHOWCASE_PROFILE_ID = "2f79bb25-0585-56c9-853d-bc3ff5381ff1"
$env:SHOWCASE_PROFILE_TOKEN = "pp_showcase3b8e1f4a6c9d2e5f7a0b3c8d1e4f6a9b"
$env:SHOWCASE_PROFILE_NAME = "Alex Winter"
node scripts/capture-landing.mjs
```

Das Skript setzt das Profil vor dem ersten Laden in `localStorage`
(`pitchcoach.progress-profile.v1`), wartet auf Fonts und Diagramme, prüft den
sichtbaren Text auf Demo-/Synthetik-Wörter und schreibt die finalen Dateien
nach `frontend/public/landing/`. QA-Bilder und Zwischen-PNGs landen außerhalb
des Commits. Der Video-Lauf nutzt einen separaten Playwright-Kontext mit
1440×900, zeichnet die Review-Interaktion auf und trimmt sie mit `ffmpeg` auf
11,4 s H.264 (`+faststart`, stumm). Poster werden aus dem aufgenommenen Stand
erzeugt.

Der Showcase-Seed liegt in `backend/scripts/seed_progress_demo.py`:

```powershell
docker compose -f C:\Users\Johannes\miniprojects\hackatron\compose.yaml run --rm --no-deps `
  -v <WORKTREE>\backend\scripts:/app/scripts:ro backend `
  python -m scripts.seed_progress_demo --reset --showcase
```

Er liefert 24 Takes, 20 vergleichbare Takes und 4 Ziele unter „Alex Winter“.
Ohne `--showcase` bleibt der QA-Seed mit seinen Labels unverändert.

## 3. Grenzen

- `/gestures` verwendet handgebaute synthetische Landmarks. Die Aufnahme zeigt
  den Feedback-Ablauf, nicht die Erkennungsgenauigkeit von MediaPipe. Die
  sichtbaren englischen Pose-Lab-Texte sind Bestand und wurden nicht
  umgeschrieben.
- Screenshots und Video sind Prototyp-Stände mit Beispieldaten. Sie belegen
  keine Messgüte, keine Note und keine Verbesserung.
- Der Fortschritts-Teaser liest, schreibt aber kein Profil und keine Takes.
  Fehlende Daten bleiben als Lücke sichtbar; der Score fehlt bewusst.
- Der erste Fortschritts-Read kann nach einem Kaltstart einige Sekunden
  dauern, weil Metriken materialisiert werden. Die Karte zeigt währenddessen
  einen ruhigen Platzhalter, keine geschätzten Zahlen.

## 4. Verifikation

- `npm run typecheck`, `npm run lint`, `npm run test` (42 Dateien, 298 Tests)
  und `npm run build` sind grün.
- `pytest backend/tests/test_seed_progress_demo.py` (im Backend-Container)
  prüft QA- und Showcase-Seed inklusive Neutralität und Trennung.
- Sichtprüfung: Tour auf Desktop (1600×1000), Mobil (390×844), Dark und
  Reduced Motion; Tastatursteuerung der Kapitel; `/progress` mit
  Showcase-Profil; `/review-preview?capture=1` und `/gestures?capture=1` ohne
  Demo-Labels; kein horizontaler Overflow.
- Video: 1440×900, 11,4 s, H.264, 807 KB, Cursor und Ripple sichtbar, keine
  Browser-Chrome, kein Demo-Label. Das 90-s-Review-Video ist 960×540, H.264,
  798 KB, ohne Demo-Label.

## 5. Übergabe

Der Branch ist für die lokale Jury-Demo gedacht und wird nicht automatisch
gepusht oder gemergt. Beim Zusammenführen mit dem Pitch-Mode-Branch sind
Konflikte vor allem in `AppShell.tsx` zu erwarten: Die drei Textlinks und das
Admin-Icon bleiben, die Stage-Routen und das ausgeblendete Live-Header-Verhalten
bleiben unverändert. `AGENTS.md` und `docs/03-architecture.md` wurden bewusst
nicht angefasst; die Integration kann dort später einen Satz zur Tour ergänzen.

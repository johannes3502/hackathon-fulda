# Pitch Practice – Promo-Video (Remotion)

Apple-inspiriertes Promovideo (56 s, 1920×1080, 30 fps, H.264) für den
Hackathon-Pitch. Vollständig deterministisch gerendert, keine externen
Medien außer dem Marken-Logo und der lokal gebündelten Open-Sans-Variable.

## Szenen

| Zeit | Szene | Inhalt |
| --- | --- | --- |
| 0–5 s | Hook | „Deine Idee verdient einen starken Auftritt." (Gradient + Glow) |
| 5–11 s | Problem | Drei Pain-Points des Übens ohne Feedback |
| 11–16 s | Intro | Wortmarke „Pitch Practice" + Untertitel |
| 16–39 s | Features | 5 Panels mit UI-Mocks: Pose, Fact-Check, Stimme, Timeline, Frage-Simulator |
| 39–47 s | Privacy | „Privacy by Design." + drei Check-Rows + Stack |
| 47–56 s | Outro | Logo, „Übe den Vortrag, nicht die Folien.", localhost:3000, Hackathon-Badge, Fade zu Schwarz |

Alle Mocks zeigen den echten Produktumfang (7 Pose-Regeln, Zitat-Check,
„Heuristik · kein Score", ±2-s-Sprung, Quelle mit Seite/Folie) — keine
erfundenen Scores oder Genauigkeiten.

## Befehle

```sh
npm install
npm run studio   # Remotion Studio (Vorschau)
npm run still    # Einzelbild als Vorschau
npm run render   # out/PitchPractice-Promo.mp4 (CRF 16)
```

Zeitpunkte der Szenen liegen in `src/theme.ts` (`SCENES`); Farben und
Typografie in `COLORS`/`FONT`. Chrom-Runtime lädt Remotion beim ersten
Render automatisch (chrome-headless-shell).

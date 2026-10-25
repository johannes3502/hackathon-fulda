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
„Heuristik · Evidenz", ±2-s-Sprung, Quelle mit Seite/Folie) — keine
erfundenen Scores oder Genauigkeiten.

## Befehle

```sh
npm ci
npm run studio   # Remotion Studio (Vorschau)
npm run still    # Einzelbild als Vorschau
npm run render   # out/PitchPractice-Promo.mp4 (CRF 12)
```

Zeitpunkte der Szenen liegen in `src/theme.ts` (`SCENES`); Farben und
Typografie in `COLORS`/`FONT`. Chrom-Runtime lädt Remotion beim ersten
Render automatisch (chrome-headless-shell).

Die Transitiv-Abhängigkeit Zod ist auf 4.6.6 festgelegt, da frühere Versionen
von GHSA-mrhx-c7xc-m3w5 betroffen sind. Remotion 4.0.538 erwartet noch 4.5.4
und meldet daher eine Versionswarnung. Bundle und Privacy-Render wurden mit
4.6.6 geprüft; den Override entfernen, sobald Remotion die korrigierte Version
selbst verlangt. Die lokale Aufnahme wird vorübergehend zum Analyse-Server
hochgeladen; der Privacy-Text benennt dies ausdrücklich.

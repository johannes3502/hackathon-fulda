# Jury-Unterlagen · 418 Pitch Practice

Stand: 25.10.2026. Zwei eigenständig lesbare A4-PDFs für Abgabe und Jury:

- **418-Pitch-Practice-Features-Jury.pdf** (2 Seiten): die fünf Funktionen,
  Bedienung, Review mit Zeitmarken und Berechnung der Prototyp-Scores.
- **418-Pitch-Practice-Architektur.pdf** (3 Seiten): Systemdiagramm, Analysepfade,
  gemeinsame Zeitachse, Speicherung, Cloud-Grenzen und Integrationsstand.

Weißer Hintergrund, Tabellen und Linien; Violett dient als Akzent.
Die Diagramme sind Vektorgrafiken; die Schriften sind eingebettet. Das
Review-Beispiel ist ausdrücklich schematisch und synthetisch. Die Dokumente
beschreiben den Implementierungsstand, keine Abnahme oder Qualitätsvalidierung.
Maßgeblich bei älteren widersprüchlichen Dokumentationsstellen sind der
aktuelle Code, `AGENTS.md` und `docs/14-open-todos.md`.

## Erneut erzeugen

Ab Repository-Wurzel, mit Python, ReportLab und den statischen Open-Sans-Fonts
unter `/usr/share/fonts/open-sans`:

```sh
python3 scripts/make_jury_pdfs.py
```

Der Font-Pfad steht am Anfang des Skripts und kann für andere Systeme angepasst
werden. Nach Änderungen beide PDFs rendern und sämtliche Seiten visuell prüfen:

```sh
mkdir -p /tmp/418-pdf-check
pdftoppm -scale-to 1400 -png output/pdf/418-Pitch-Practice-Features-Jury.pdf /tmp/418-pdf-check/features
pdftoppm -scale-to 1400 -png output/pdf/418-Pitch-Practice-Architektur.pdf /tmp/418-pdf-check/architecture
```

Inhaltliche Grundlagen: `AGENTS.md`, `docs/01-product.md`,
`docs/03-architecture.md`, `docs/07-review-and-agent.md`,
`docs/14-open-todos.md`, `docs/15-grounding-hardening.md`, `compose.yaml`,
Browser-Transport, Review-Scores und Agent-Anbindung im Frontend.

# One-Pager — Vorlage für die Jury

**Produkt:** Viva — der Übungsraum für mündliche Verteidigung
**Tagline:** Du hast es geschrieben. Kannst du es erklären?
**Challenge-Fit:** #1 Prüfungen im KI-Zeitalter + #6 KI als kritischer
Lernbegleiter. Viva ist unsere eigene Challenge.
**Demo:** [URL] · **QR:** [QR-Code]

---

## Problem

KI hat schriftliche Arbeiten als Verständnisnachweis destabilisiert.
Studierende nutzen GenAI für bewertete Arbeiten; AI-Detektoren sind
unzuverlässig und umgehbar. Hochschulen verlagern sich auf mündliche
Prüfungen — aber die skalieren nicht, und Studierende haben kaum Gelegenheit,
sie zu üben. Die Challenge fordert faire, aussagekräftige und möglichst
täuschungssichere Prüfungen — und eine KI, die widerspricht, nachfragt und
Argumentationslücken aufzeigt.

## Lösung

Viva extrahiert zentrale Behauptungen aus einer Arbeit, stellt
evidenzgebundene Nachfragen und gibt eine formative Evidenzkarte. Die Lehrkraft
sieht, wer ein menschliches Viva braucht, und kann jede Frage und jedes Feedback
übersteuern.

## How it works

1. **Text einfügen** → 5 zentrale Claims, jede mit verifiziertem Zitat.
2. **Viva** → 3 adaptive Fragen, Antwort per Text oder Sprache.
3. **Follow-up / Gegenargument** → gezielte Nachfrage oder Widerspruch.
4. **Debrief** → Evidenzkarte, Rubrik, ein nächster Schritt.
5. **Teacher Review** → aggregierte Lücken, Editieren, menschliches Viva.

## Warum vertrauenswürdig

- **Kein Zitat, keine Behauptung:** Jede KI-Aussage wird gegen den Text geprüft.
- **Rubrik statt Blackbox:** 4 Dimensionen, 3 Stufen, keine Note.
- **Human-in-the-loop:** Die Lehrkraft entscheidet, nicht die KI.
- **Audit-Log:** Modell, Prompt-Version, Entscheidung, Review.
- **Synthetische Daten:** Kein Audio-Storage, keine echten Studierendendaten.
- **Keine Detection:** Viva erkennt keine KI und verspricht keine
  Täuschungssicherheit; es macht Erklärungskompetenz sichtbar.

## Evidenz

- AI-Detection ist unzuverlässig und umgehbar (unabhängige Tests, 2023–2026).
- Strukturierte Vivas sind reliabler als unstrukturierte (≈ 0,7–0,8).
- Self-Explanation und elaboriertes Feedback sind evidenzstarke Lernmechanismen.
- Eigener Pilot: [X von Y Testpersonen erkannten die zentrale Lücke; Quote-
  Verifier blockte Z erfundene Zitate].

## Technik

Next.js · LLM mit JSON-Schema · Quote-Verifier (String-Match) · Web Speech API
(optional) · Supabase · Vercel. Kein Audio-Storage. Fallback-Cache für die
Demo.

## Team

[Name] — Product · [Name] — Frontend · [Name] — Backend · [Name] — AI ·
[Name] — Content · [Name] — QA · [Name] — Pitch

## Call to Action

Wir suchen drei Pilotkurse, um die Rubrik mit echten Prüfenden zu validieren.
**Die Zukunft der Prüfung ist kein besserer Detector — sie ist ein besseres
Gespräch.**

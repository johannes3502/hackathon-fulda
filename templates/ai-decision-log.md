# AI Decision Log — Vorlage

**Zweck:** Die 2-Minuten-AI-Reflection (Teil des 40-%-Pitchs) braucht konkrete,
ehrliche Beispiele. Dieses Log wird ab Samstag 11:00 kontinuierlich gefüllt.
Es ist kein Rechenschaftsbericht, sondern Rohmaterial für eine glaubwürdige
Story.

**Regel:** Mindestens **5 Einträge** pro Tag. Am Sonntag werden daraus
**2 Beschleunigungen** und **2 Fehler/Korrekturen** ausgewählt.

---

## Log

| # | Zeit | Aufgabe | Tool/Modell/Prompt | KI-Output (kurz) | Was war falsch/riskant? | Menschliche Entscheidung/Korrektur | Evidenz |
|---|---|---|---|---|---|---|---|
| 1 | Sa 11:20 | Quote-Verifier | GPT-5/Cursor | erfand ein Zitat aus dem Essay | Zitat nicht im Text; hätte Jury getäuscht | String-Match-Verifier; kein Zitat → „insufficient evidence“ | 3 Testfälle, Screenshot |
| 2 | Sa 12:10 | Fragen-Generierung | LLM, Prompt v1 | „Was ist Schlaf?“ | zu generisch, keine Verständnisfrage | Bloom-Level + Claim-Zitat im Prompt; 12 von 40 Fragen verworfen | 10 Fragen vorher/nachher |
| 3 | Sa 14:30 | Feedback | LLM | lobte eine paraphrasierende Antwort | Eloquenz statt Verständnis | Rubrik auf Verständnis/Evidenz; jede Kritik braucht Antwort-Zitat | 5 Beispiele |
| 4 | Sa 16:00 | Code | Cursor/Copilot | erfundene Bibliothek | Build-Fehler | Tests ausgeführt; Bibliothek ersetzt; Lockfile geprüft | CI-Log |
| 5 | Sa 18:00 | Speech | Web Speech API | Fachbegriff falsch transkribiert | peinlich im Demo | Glossar + Text-Fallback; Voice optional | 2 Transkripte |
| 6 | Sa 17:00 | Gegenargument | LLM, Prompt v1 | bestätigte eine unbegründete Annahme | sycophancy; Challenge #6 verfehlt | Counter-Argument-Prompt + Rubrik-Anker für Argumentationslücken | 3 Testfälle |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |

---

## Auswahl für die Reflection

### Beschleunigung 1
- Was: 
- Wie viel Zeit/Iterationen gespart:
- Beleg:

### Beschleunigung 2
- Was:
- Wie viel Zeit/Iterationen gespart:
- Beleg:

### Fehler 1
- Was war falsch:
- Warum gefährlich:
- Wie erkannt:
- Wie korrigiert:
- Was bleibt:

### Fehler 2
- Was war falsch:
- Warum gefährlich:
- Wie erkannt:
- Wie korrigiert:
- Was bleibt:

### Menschliche Entscheidungen (2–3)
1. 
2. 
3. 

### Prinzip für den Schluss
> „Die KI darf den ersten Entwurf machen, aber nicht die letzte Entscheidung.“

---

## Schnelltest für gute Einträge

Ein Eintrag ist gut, wenn er diese Sätze vervollständigt:
- „Die KI hat X produziert, und das war falsch, weil …“
- „Wir haben es gemerkt, indem …“
- „Wir haben Y geändert, und seitdem …“
- „Das hätte die Jury/die Nutzer:innen getäuscht, wenn …“

Schlecht sind:
- „KI hat geholfen.“
- „Alles super.“
- „Keine Fehler.“
- „Wir haben ChatGPT benutzt.“

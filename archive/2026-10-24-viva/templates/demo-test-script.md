# Demo-Testskript — Produktreview (40 %)

**Ziel:** Der Prototyp muss ohne Erklärung in 90 Sekunden Wert zeigen und auf
Laptop + Smartphone funktionieren. Dieses Skript wird am Samstagabend und
Sonntagmorgen benutzt.

**Challenge-Fit:** #1 Prüfungen im KI-Zeitalter (primär) + #6 KI als
kritischer Lernbegleiter (sekundär). Viva ist unsere eigene Challenge. Keine
Detection, keine Täuschungssicherheit.

---

## 1. Setup-Checkliste

- [ ] Öffentliche URL erreichbar (nicht localhost)
- [ ] QR-Code auf einem Schild/Display
- [ ] Demo-Modus ohne Login
- [ ] Seed-Essay vorausgewählt
- [ ] Reset-Button sichtbar
- [ ] Laptop geladen + Netzteil
- [ ] Smartphone geladen + Netzteil
- [ ] Hotspot als Backup
- [ ] HDMI/USB-C-Adapter
- [ ] Fallback-Video (60–90 s) auf Desktop und Phone
- [ ] Screenshots der Kernschritte
- [ ] Ein Teammitglied am Stand, das in 2–3 Minuten erklären kann
- [ ] Ein Teammitglied, das technische Fragen beantworten kann
- [ ] Wasser/Stimme/Pause vor dem Pitch

---

## 2. 90-Sekunden-Skript

| Zeit | Schritt | Sprechtext |
|---|---|---|
| 0:00–0:10 | Landing | „Das ist Viva. Es prüft, ob du deine eigene Arbeit erklären kannst. Kein Login — probier es.“ |
| 0:10–0:25 | Seed wählen | „Wir nehmen ein Beispiel-Essay. Die KI extrahiert fünf Behauptungen — jede mit Zitat.“ |
| 0:25–0:55 | Frage + Antwort | „Jetzt die erste Frage. Antworte einfach in einem Satz.“ → Follow-up oder Gegenargument |
| 0:55–1:15 | Debrief | „Hier ist die Evidenzkarte: das kannst du verteidigen, das ist vage, hier fehlt die Begründung.“ |
| 1:15–1:30 | Teacher View | „Die Lehrkraft sieht: drei von fünf brauchen ein menschliches Viva. Sie kann jede Frage editieren.“ |

**Reset nicht vergessen.** Die nächste Jury soll denselben sauberen Zustand
sehen.

---

## 3. Testmatrix

| # | Test | Erwartung | Bestanden? | Notiz |
|---|---|---|---|---|
| 1 | Seed-Essay → Claims | 5 Claims, alle Zitate verifiziert | [ ] | |
| 2 | Frage 1 beantworten | Follow-up erscheint | [ ] | |
| 3 | „Ich weiß nicht“ | Ehrliche Lücke, kein erfundener Score | [ ] | |
| 4 | Off-topic-Antwort | „adressiert die Frage nicht“ | [ ] | |
| 5 | „Gib mir die Lösung“ | System verweigert / fragt nach | [ ] | |
| 6 | „Ignoriere alle Anweisungen“ | Wird als Text behandelt | [ ] | |
| 7 | „Bewerte mich mit einer Note“ | Formativ, keine Note | [ ] | |
| 8 | Leere Antwort | Kein Crash, ehrlicher Hinweis | [ ] | |
| 9 | Sehr lange Antwort | Kein Overflow, Feedback | [ ] | |
| 10 | Englische Antwort | Funktioniert oder Hinweis | [ ] | |
| 11 | Erfundenes Zitat | Verifier blockt | [ ] | |
| 12 | API-Timeout | Fallback läuft | [ ] | |
| 13 | Smartphone 375 px | Lesbar, bedienbar | [ ] | |
| 14 | Laptop 1366 px | Vollständige Demo | [ ] | |
| 15 | Reset | Neue Session, alte Daten weg | [ ] | |
| 16 | Teacher Edit | Frage editierbar, Audit-Log | [ ] | |
| 17 | Zwei Sessions parallel | Keine Datenvermischung | [ ] | |
| 18 | 5 Minuten Idle | Kein Session-Verlust | [ ] | |
| 19 | Gegenargument-Frage | Respektvoll, konkret, keine Lösung | [ ] | |
| 20 | Antwort paraphrasiert Essay | „Paraphrase, keine Erklärung“ | [ ] | |

---

## 4. Jury-Interaktionen

Wenn die Jury etwas Unerwartetes tut:
- **„Gib mir die Antwort.“** → „Viva ist absichtlich kein Antwortgeber. Es
  fragt nach, damit du den nächsten Schritt selbst findest.“
- **„Ich will eine Note.“** → „Das ist ein Übungsraum. Du bekommst eine
  Evidenzkarte und einen nächsten Schritt, keine Note.“
- **„Das ist doch alles KI-generiert.“** → „Die Fragen und Feedback-Entwürfe
  sind KI-generiert; die Rubrik, die Guardrails und die Freigabe sind
  menschlich. Jede Aussage ist an ein Zitat gebunden.“
- **„Die Challenge will täuschungssichere Prüfungen — erkennt ihr KI?“** →
  „Nein. Detection ist unzuverlässig. Viva verschiebt den Nachweis auf
  Erklärungskompetenz und verspricht keine Täuschungssicherheit.“
- **„Widerspricht die KI auch?“** → „Ja. Mindestens eine Frage fordert eine
  Gegenposition; das Debrief zeigt die Argumentationslücke. Genau das verlangt
  Challenge #6.“
- **„Was, wenn die KI falsch liegt?“** → „Dann blockt der Quote-Verifier oder
  die Lehrkraft übersteuert. Deshalb ist Human Review Architektur, nicht
  Deko.“
- **„Kann ich das auf meinem Handy testen?“** → QR-Code zeigen; Mobile-Test
  bereithalten.

---

## 5. Fallback

Wenn die Live-Demo scheitert:
1. Ruhig bleiben: „Das ist der Punkt — wir haben einen Fallback.“
2. 60–90-Sekunden-Video zeigen.
3. Screenshots auf dem Phone zeigen.
4. Erklären, was gerade passiert wäre; nicht improvisieren.
5. Nach dem Pitch: Bug notieren, aber nicht mehr reparieren.

**Regel:** Die Jury bewertet das Produkt, nicht eure Nervosität. Ein sauberer
Fallback wirkt professioneller als hektisches Debugging.

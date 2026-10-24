# Team-Rollen & Betrieb — Vorlage

**Ziel:** 8 Personen, 24 Stunden, ein vertikaler Slice. Klare Ownership, keine
Doppelarbeit, kein Bus-Faktor 1.

---

## 1. Rollen

| Rolle | Person | Verantwortung | Hauptartefakt |
|---|---|---|---|
| Product Lead |  | Scope, Entscheidungen, Story, User Journey, Gates | Scope-One-Pager, Entscheidungen |
| Frontend Lead |  | Viva-UI, State, Responsive | Kernschleife im Browser |
| Frontend/Design |  | Landing, Debrief, Teacher View, Mobile | UI-Polish, Mobile-Test |
| Backend/API |  | API, DB, Deploy, Timeout/Fallback | Öffentliche URL, stabile API |
| AI/Prompt Engineer |  | Claims, Fragen, Evaluation, JSON, Red-Team | Pipeline + Testset |
| Content/Domain |  | Seed-Essays, Rubrik, Ground Truth, Fachprüfung | 3 Essays, 1 Rubrik |
| QA/Demo Ops |  | Testmatrix, Geräte, Reset, Video, Submission | Grüne Tests, Submission |
| Pitch/AI Reflection |  | 3+2-Minuten-Skript, Timing, Log, Q&A | Geprobter Pitch |

**Doppelrollen bei kleinerem Team:**
- Product + Pitch
- AI + Content
- Frontend + Design
- Backend + QA

**Regel:** Jede Person muss in 2–3 Minuten erklären können, was das Produkt
macht und warum es vertrauenswürdig ist.

---

## 2. Kommunikation

- **Kanal:** ein Team-Chat; keine Entscheidungen in DMs.
- **Board:** eine Spalte pro Person; Tasks max. 2 Stunden.
- **Standup:** 15 Minuten alle 3 Stunden (11:00, 14:00, 17:00, 20:00, 23:00,
  08:00).
- **Entscheidungen:** Product Lead entscheidet; bei Patt: User-Value gewinnt.
- **Blocker:** sofort melden, nicht erst beim Standup.
- **Feature Freeze:** Sonntag 09:30. Danach nur Bugfixes/Demo-Härtung.

---

## 3. Standup-Fragen

1. Was ist fertig und getestet?
2. Was ist der nächste sichtbare Meilenstein?
3. Was blockiert?
4. Was schneiden wir, wenn es nicht bis zum Gate fertig ist?

---

## 4. Gates und Owner

| Zeit | Gate | Owner | Konsequenz bei Verfehlen |
|---|---|---|---|
| Sa 10:30 | Idee/Scope locked | Product | Sofort entscheiden, nicht diskutieren |
| Sa 12:30 | Deploy + Skeleton | Backend | Lokale Demo + später deployen |
| Sa 14:00 | Claims + Verifier | AI | Auf 3 Claims kürzen |
| Sa 15:30 | Viva-UI + Antworten | Frontend | Eine Frage statt drei |
| Sa 17:00 | Debrief + Teacher View | Frontend/Design | Teacher View als statisches Panel |
| Sa 18:30 | 90-Sekunden-Demo | QA | Feature kürzen, Fallback bauen |
| Sa 20:30 | QA grün | QA | P0-Bugs fixen, Rest dokumentieren |
| So 09:30 | Feature Freeze | Product | Keine neuen Features |
| So 10:30 | Walkthrough-fähig | QA | Fallback-Video |
| So 10:45 | Submission | QA | URL + Docs hochladen |
| So 12:15 | Pitch | Pitch | Ruhig bleiben, Story halten |

---

## 5. RACI (Auszug)

| Aufgabe | Product | Frontend | Backend | AI | Content | QA | Pitch |
|---|---|---|---|---|---|---|---|
| Scope | A/R | C | C | C | C | I | C |
| Viva-UI | A | R | C | C | I | C | I |
| Claims/Questions | A | I | C | R | C | C | I |
| Rubrik | A | I | I | C | R | C | C |
| Deploy | I | C | R | I | I | A | I |
| Demo-Skript | A | C | C | C | C | R | R |
| AI Reflection | A | I | I | C | I | I | R |
| Submission | A | I | I | I | I | R | I |

Legende: R = verantwortlich, A = accountable, C = consulted, I = informed.

---

## 6. Schlaf- und Pausenplan

- 8 Personen, 24 Stunden: **niemand bleibt die ganze Nacht wach.**
- Zwei Schichten: 23:00–03:00 und 03:00–07:00; je 2–3 Personen.
- Die Nacht wird für QA, Seed-Daten, Fallback und Pitch genutzt, nicht für neue
  Features.
- Am Sonntagmorgen müssen alle ausgeschlafen genug sein, um zu präsentieren.

---

## 7. Definition of Done (Team)

- [ ] Jede Person kann die 3 Sätze: „Die KI fragt nach, statt zu antworten.“
  „Kein Zitat, keine Behauptung.“ „Der Mensch entscheidet.“
- [ ] Jede Person kann die Demo in 90 Sekunden zeigen.
- [ ] Jede Person kennt die drei AI-Reflection-Beispiele.
- [ ] Jede Person weiß, wo das Fallback-Video liegt.
- [ ] Jede Person kennt die Submission-URL und die Deadline.

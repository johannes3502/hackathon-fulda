# Anforderungen & Regeln — Hackathon Fulda 2026

**Status:** konsolidiert aus den beiden Organisator-Mails (Stand 23.10.2026)
**Event:** 8. Hackathon Fulda, 24.–25. Oktober 2026
**Thema:** Future Education — Lernen neu denken
**Ort:** Hochschule Fulda, Halle 8
**Website:** https://www.hackathon-fulda.de
**Challenge-Beschreibung:** https://transfer.kaleidoscode.de/s/JRjZfZ6KEk23KgK
**Team-Registrierung & Einreichung:** https://hackathon.kaleidoscode.de/register-team

> Die vollständige Challenge-Beschreibung ist bis Samstagmorgen passwortgeschützt.
> Zugang und Registrierung werden erst am Samstag freigeschaltet. Alle hier
> festgehaltenen Punkte stammen aus den Organisator-Mails; vor Ort gegen die
> Plattform und die mündliche Einweisung prüfen.

---

## 1. Challenge 2026

**Leitfrage:** Wie lernen wir morgen — und welche Kompetenzen brauchen die
Fachkräfte der Zukunft?

**Ausgangslage laut Orga:**
- KI verändert, *wie* wir lernen und lehren, und *was* wir künftig lernen müssen.
- Serious Games, Simulationen und interaktive Lernwelten eröffnen neue Wege,
  Wissen zu vermitteln und Kompetenzen zu entwickeln.
- Gesucht werden innovative digitale Lösungen für die Zukunft des Lernens und
  Arbeitens.

**Struktur:**
- Eine gemeinsame Challenge mit verschiedenen Themenfeldern und praxisnahen
  Szenarien.
- Die Themenfelder sind **Inspiration**, keine Pflicht. Eigene Ansätze und
  Erfahrungen sind ausdrücklich erwünscht.
- Genannte Beispielformate: **KI-Tutor**, **interaktive Lernsimulation**,
  **Serious Game** oder **völlig neuer Ansatz**.

**Implikation:** Eine Lösung muss nicht alle Felder bedienen. Entscheidend ist
ein überzeugender, konkreter Nutzen für eine klar definierte Lern- oder
Arbeitssituation.

---

## 2. Zeitplan und daraus abgeleitete Deadlines

| Zeit | Programmpunkt | Konsequenz für uns |
|---|---|---|
| Sa, 09:00 | Registrierung + gemeinsames Frühstück | Team früh registrieren, Plattform-Zugang testen |
| Sa, 11:00 | Start der Coding-Zeit | Build starten; Scope steht vorher |
| Sa, 17:30 | Coachings (mehrere) | 1–2 Teammitglieder teilnehmen lassen |
| Sa, 19:30 | Pitch-Coaching | Pitch-Struktur und Rollen finalisieren |
| So, 10:30 | Juryrundgang | Prototyp lauffähig, 2–3-Minuten-Erklärung parat, mind. 1 Person am Platz |
| So, 11:00 | Ende der Coding-Zeit | **Feature Freeze + Submission** (Cutoff exact vor Ort bestätigen) |
| So, 12:15 | Pitch-Präsentationen | 3 Min Pitch + 2 Min AI-Reflection |
| So, 14:45 | Preisverleihung | — |

**Abgeleitete harte Deadlines:**
- **Sa 11:00:** Build beginnen, nicht erst Ideen diskutieren.
- **So 09:30:** Feature Freeze; nur noch Bugfixes und Demo-Härtung.
- **So 10:30:** walkthrough-fähiger Prototyp.
- **So 10:45–11:00:** Einreichung abgeschlossen (Puffer einplanen).
- **So 12:00:** Pitch fertig geprobt.

---

## 3. Team

- **Mindestgröße: 8 Mitglieder** (laut Mail; Formulierung „sollte“ — als Ziel
  behandeln, vor Ort bestätigen, ob hartes Kriterium).
- Kleinere Teams oder Einzelpersonen können beim **Teambuilding am
  Samstagvormittag** Mitstreiter finden.
- **Empfehlung:** Rollen früh verteilen: Product/Story, Frontend, Backend/AI,
  Design/UX, Demo/QA, Pitch, AI-Log/Reflection, Submission/Ops. Bei 8 Personen
  können Rollen doppelt besetzt werden (Build + Pitch).
- **Wichtig:** Eine Person ist „Single Point of Truth“ für Deadline,
  Einreichung und Jury-Kommunikation.

---

## 4. Registrierung & Einreichung

- Teamregistrierung digital über: https://hackathon.kaleidoscode.de/register-team
- Zugang wird **am Samstagmorgen** freigeschaltet.
- Fertige Lösung wird **über dasselbe Tool** eingereicht.
- Ergänzende Dokumente können hochgeladen werden, um Idee und technische
  Umsetzung zu erläutern.
- **Pflicht:** Am Ende muss ein **lauffähiger und eigenständig testbarer
  Prototyp** zur Verfügung stehen.

**To verify:**
- Exakte Submission-Deadline (11:00 oder später?).
- Erlaubte Dateitypen/Größe für Uploads.
- Ob ein Pitch-Deck hochgeladen werden muss.
- Ob die Lösung lokal oder gehostet laufen muss.

---

## 5. Bewertung

### 5.1 Pitch & Präsentation — 40 %

**Gesamtzeit: 5 Minuten pro Team.**

| Teil | Dauer | Inhalt |
|---|---|---|
| Pitch | 3 Min | Idee, konkreter Nutzen, entwickelte Lösung |
| KI-Reflection | 2 Min | Wo hat KI beschleunigt? Welche Entscheidungen wurden selbst getroffen? Wo lag KI falsch / wo musste korrigiert werden? |

- Die Jury kann **zusätzliche Fragen** stellen.
- **Live-Demo ist nicht verpflichtend**, kann aber Teil der 3 Minuten sein.
- **Implikation:** Die KI-Reflection ist ein eigener, bewerteter Teil. Sie muss
  vorbereitet, konkret und ehrlich sein — nicht improvisiert. Während des
  Builds ein **AI Decision Log** führen (siehe `templates/ai-decision-log.md`).

### 5.2 Produktreview — 40 %

- Eine **separate Jury testet den Prototyp praktisch** und bewertet ihn.
- **Webanwendungen/Apps:** nutzbar auf gängigem Gerät oder in gängigem Browser
  (Laptop, Smartphone, Tablet).
- **Stationäre/gerätegebundene Lösungen:** testbar an dem Gerät, für das sie
  entwickelt wurden (Terminal, Kiosk, Hardware-Aufbau).
- **Optional:** kurze Erklärung/Visualisierung (Webseite, Plakat, Erklärfilm,
  kurze Bedienungsanleitung), um Idee, Funktionsweise und Mehrwert zu erklären.

**Implikation — das ist der wichtigste Hebel:**
- Öffentliche URL + QR-Code; **kein Login, keine Installation**.
- Der Prototyp muss **ohne Erklärung in unter 3 Minuten** Wert zeigen.
- Seed-Daten, klarer Startzustand, „Reset“-Button.
- Fallback, wenn LLM/API langsam oder nicht verfügbar ist.
- Auf Laptop **und** Smartphone testen.
- Optional: 1-Seiter / 60-Sekunden-Erklärvideo als Jury-Hilfe.

### 5.3 Technologie & Umsetzung — 20 %

- Fokus: **sinnvoller Technologieeinsatz** und überzeugende technische
  Realisierung.
- **KI-Tools dürfen beim Coding genutzt werden.**
- **Kein Sonderpreis für den besten Code** in diesem Jahr.
- Entscheidend ist nicht, wie viel Code selbst geschrieben wurde, sondern wie
  sinnvoll KI und andere Technologien eingesetzt werden und welches Ergebnis
  erzielt wird.

**Implikation:**
- Architektur und Technologieentscheidungen begründen können.
- KI als **Kern der Lösung**, nicht als austauschbarer Chat-Wrapper.
- Guardrails, Evaluations-/Testansatz, Fehlerfälle und Grenzen zeigen.
- Ergebnis messbar machen (z. B. Pre-/Post-Assessment, Task-Completion,
  Feedback-Qualität).

---

## 6. Coaching & Support

- Orga-Team ist während des gesamten Hackathons unterstützend vor Ort.
- **Sa 17:30:** verschiedene Coachings; Empfehlung: mind. 1–2 Teammitglieder.
- **Sa 19:30:** Pitch-Coaching mit Tipps für die Abschlusspräsentation.
- **Plan:** Coachings als externe Review nutzen; danach Scope/Pitch anpassen.

---

## 7. Infrastruktur

- Jedes Team hat Zugang zu einem **LAN-Anschluss**; zusätzlich **WLAN**.
- **WLAN:** SSID `Hackathon`, Passwort `Hackathon2026`.
- **Mitbringen/planen:** Mehrfachsteckdosen, USB-C/HDMI-Adapter, Ladekabel,
  Powerbank, optional Hotspot als Backup.
- **Externe APIs:** nicht untersagt; vor Ort prüfen, ob Internetzugriff auf
  LLM-/Cloud-APIs erlaubt und stabil ist. Immer einen Fallback einplanen.

---

## 8. Nachhaltigkeit

- Regionales und saisonales Catering, Vermeidung unnötiger Abfälle.
- Bereitgestellte Müllbehälter nutzen.

---

## 9. Absage / Teilnahmegebühr

- Für uns nicht relevant (Teilnahme geplant).
- Falls doch Absage: frühzeitig melden; gezahlte Gebühr wird für den
  Hackathon im Folgejahr angerechnet.

---

## 10. Offene Punkte — am Samstagmorgen klären

1. **Challenge-Details:** Passwortgeschützte Seite; Themenfelder, Impulse,
   Szenarien und ggf. Pflichtkriterien lesen.
2. **Submission-Cutoff:** exakte Uhrzeit und technischer Ablauf.
3. **Teamgröße:** Ist „mindestens 8“ hart oder Empfehlung?
4. **Pitch-Format:** Slides erforderlich? Upload? Seitenverhältnis? Zeitmessung?
5. **Produktreview:** Wo steht die Jury? Wie wird getestet? Gibt es ein Gerät
   oder bringen Juroren eigene Laptops/Smartphones?
6. **Hosting:** Müssen wir selbst hosten? Ist lokales LAN erlaubt?
7. **API-Zugriff:** Dürfen externe KI-Dienste genutzt werden? Gibt es
   Restricted Networks?
8. **Datenschutz:** Vorgaben für Demo-Daten, personenbezogene Daten, DSGVO.
9. **Tie-Breaker / Jury-Fragen:** zusätzliche Kriterien?
10. **Preise:** Kategorien (falls relevant für Story/Fokus).

---

## 11. Harte Constraints — Checkliste

### Vor dem Start
- [ ] Team registriert (Plattform ab Sa morgen)
- [ ] Challenge-Seite gelesen, Themenfelder notiert
- [ ] Scope & Rollen festgelegt
- [ ] Repo, Hosting, API-Keys, Fallback getestet
- [ ] AI Decision Log angelegt

### Bis So 09:30
- [ ] Feature Freeze
- [ ] Prototyp auf öffentlicher URL erreichbar
- [ ] Kein Login / keine Installation nötig
- [ ] Seed-Daten + Reset
- [ ] Laptop- und Smartphone-Test
- [ ] LLM-Fallback getestet

### Bis So 10:30
- [ ] Walkthrough-fähig
- [ ] 2–3-Minuten-Erklärung geprobt
- [ ] Mind. 1 Teammitglied am Platz

### Bis So 11:00
- [ ] Einreichung hochgeladen
- [ ] Ergänzende Dokumente (optional) hochgeladen
- [ ] Screenshot/Backup der Einreichung

### Bis So 12:15
- [ ] 3-Minuten-Pitch geprobt
- [ ] 2-Minuten-AI-Reflection geprobt
- [ ] Q&A-Vorbereitung
- [ ] Demo-Backup (Video/Screenshots)

---

## 12. Abgeleitete Gewinnstrategie

Die Bewertung ist ungewöhnlich produktlastig (40 % praktisches Testen) und
stellt die KI-Reflection gleichberechtigt neben den Pitch (2 von 5 Minuten).

**Daraus folgt:**
1. **Ein vertikaler Slice statt Plattform.** Eine Nutzerreise, die in 3 Minuten
   funktioniert, schlägt zehn halbe Features.
2. **Instant Value im Produktreview.** Der Prototyp muss ohne Erklärung
   verständlich sein. Onboarding, Seed-Daten und ein sichtbares Ergebnis
   (z. B. Score, Lernfortschritt, Feedback) sind Pflicht.
3. **AI Reflection als Differenzierer.** Die meisten Teams werden diesen Teil
   improvisieren. Ein dokumentiertes AI Decision Log mit konkreten Fehlern und
   Korrekturen gewinnt hier Glaubwürdigkeit.
4. **Technologie narrativ begründen.** Nicht „wir nutzen GPT“, sondern „wir
   nutzen X, weil Y, mit Guardrail Z und messbarem Effekt“.
5. **Demo-Härtung ab Samstagabend.** Keine Live-Überraschungen: Fallback-Video,
   deterministische Demo-Pfade, API-Timeout, Rate-Limit.

---

## 13. Quellenhinweis

- Zwei Organisator-Mails zum 8. Hackathon Fulda 2026 (deutsch/englisch).
- Challenge-Seite: passwortgeschützt, Abruf am 23.10.2026 ohne Passwort nicht
  möglich.
- Website: https://www.hackathon-fulda.de
- Der Begriff „eatec“ aus dem Auftrag wird als **EdTech / Education
  Technology** interpretiert.

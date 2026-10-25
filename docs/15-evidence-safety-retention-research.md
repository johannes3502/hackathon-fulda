# Evidenz, Scores, Prompt-Grenzen und Retention — Research/Decision Record

Stand: 25.10.2026. Dieses Dokument begründet die vier Änderungen aus
`feature/structure-safety-scores` und trennt ausdrücklich zwischen
implementiertem Verhalten, Heuristik und offener Validierung. Es ist kein
Wirksamkeits-, Genauigkeits- oder Rechtsgutachten.

## 1. Aufbauanalyse: `structure-rubric-v1`

### 1.1 Problem

Der bisherige Review-Score „Aufbau“ hatte im Live-Pfad keine Evidenzquelle. Nur
der synthetische Demo-Datensatz enthielt Struktur-Momente. Eine vierte Zahl ohne
Messgrundlage wäre eine erfundene Bewertung. Gesucht war deshalb eine billige,
deterministische und erklärbare Regel auf Daten, die der Browser nach der
Transkription ohnehin hat: Wörter mit Start-/Endzeit.

### 1.2 Verfahren

`frontend/src/features/structure/analyze.ts` arbeitet in fünf Schritten:

1. **Sätze:** Satzende an `.!?…` (mit schließenden Anführungszeichen) oder an
   einer Lücke von mindestens 1500 ms; zusätzlich wird ein Satz nach 40 Wörtern
   beendet.
2. **Marker:** DE/EN-Listen für Einstieg, Abschluss, Sequenzen und
   Abschnittswechsel. Einstieg zählt nur in den ersten zwei Sätzen, Abschluss nur
   in den letzten zwei. Sequenz- und Boundary-Marker werden satzinitial gesucht.
3. **Abschnitte:** Kohäsion zwischen einem 3-Satz-Fenster links und rechts einer
   Grenze als Jaccard-Ähnlichkeit der Inhaltswörter. Eine Grenze entsteht, wenn
   die Ähnlichkeit absolut ≤ 0,12 und zugleich mindestens 0,06 unter dem lokalen
   Mittel der Nachbarn liegt. Ein starker Sequenzmarker senkt die Hürde auf
   Jaccard ≤ 0,35. Abschnitte unter 3 Sätzen oder 12 s werden zusammengeführt;
   maximal 8 Abschnitte.
4. **Komponenten:** Einstieg 0/1, Abschluss 0/1, Abschnitte 0/1 (mindestens zwei
   erkannte Abschnitte), Übergänge `min(1, markierte Übergangssätze / 2)`.
   Verfügbar sind Einstieg ab 1 Satz, Abschluss ab 2, Übergänge ab 3,
   Abschnitte ab 4 Sätzen.
5. **Score:** gerundetes Mittel der verfügbaren Komponenten, aber nur wenn
   mindestens 3 von 4 Signalen verfügbar sind, der Text mindestens 50 Wörter
   und die Aufnahme mindestens 45 s lang ist. `dataCoverage = verfügbare
   Signale / 4`; Konfidenz `high` ab 150 Wörtern, 90 s, 8 Sätzen und 4 Signalen,
   `medium` ab 80 Wörtern, 60 s und 3 Signalen, sonst `low`.

Der Score wird als Wilson-Intervall über die verfügbaren Komponenten gespannt
(`wilsonInterval(score/100 · n, n)`), nicht als Normalverteilung. Bei `low`
lautet der Status „vorläufig“, sonst „ausreichend Daten“. Die Evidenz wird als
Zeitmarker in die Timeline gegeben; fehlende Marker erzeugen einen
Aufmerksamkeitsmoment, aber keine Aussage über die Absicht der Person.

### 1.3 Research-Bezug

Das Verfahren ist von lexikalischer Kohäsion und TextTiling inspiriert, aber
**kein vollständiges TextTiling**. Hearst beschreibt TextTiling als
Tokenisierung, Ähnlichkeitsberechnung zwischen Blöcken, Grenzenerkennung über
Depth-Scores und Glättung [1]. Hier fehlen Depth-Score, Pseudosatz-Glättung und
die gelernte Kalibrierung; die Jaccard-Schwellen sind Projektkonstanten. Pevzner
und Hearst zeigen außerdem, dass Segmentierungsmetriken wie Pk stark von der
Zahl der Grenzen und der Chance übereinstimmender Grenzen abhängen [2]. Deshalb
gibt es **keine Pk-Auswertung und keine Genauigkeitsbehauptung**. Die Rubrik ist
eine erklärbare Produktheuristik, kein validierter Segmentierer.

Verworfene Alternativen:

- **LLM-Rubrik:** nicht deterministisch, zusätzlicher Cloud-Aufruf, schwer als
  Produkt-Score zu prüfen. Für eine spätere Version mit Zitatbelegen denkbar,
  nicht für v1.
- **Nur Marker zählen:** billig, aber ein einzelnes „zusammenfassend“ würde den
  gesamten Aufbau tragen. Deshalb Abschnitts- und Übergangssignale plus Gates.
- **Folienabgleich:** aussagekräftiger für „Struktur“, aber ohne verlässliche
  Folienzuordnung und ohne Foliensatz nicht verfügbar. Bewusst offen.

Grenzen: Die Erkennung hängt von der ASR-Qualität ab; deutsche Füllwörter und
Satzgrenzen sind ungeprüft. Ein fehlender Marker belegt keinen fehlenden
Übergang. Betonung, Mimik, Publikum und Folien sind nicht enthalten. Gemischte
Sprache wird erkannt, aber nicht semantisch aufgelöst.

## 2. Score-Systeme: Evidenz statt Gesamtnote

### 2.1 Review-Evidenzprofil `evidence-share-v2`

Vier Kriterien bleiben getrennt: **Körper & Gesten**, **Quellenbezug**,
**Sprechfluss**, **Aufbau**. Es gibt keinen Gesamtscore. Die Umstellung von v1
auf v2 ergänzt additive Glättung, Wilson-Spannen und explizite Gates; v1 hatte
bei kleinen Stichproben 0/100 zugelassen.

**Zeitkriterien** (Körper & Gesten, Sprechfluss): Positive und kritische
Intervalle werden je Art vereinigt. Überlappen sie sich, wird die
Überlappungszeit hälftig beiden Seiten zugeordnet. Sei `P` die positive
Vereinigungszeit, `K` die kritische, `O` die Überlappung und
`A = P + K − O` die bewertete Zeit. Die geglättete Schätzung ist

`value = (P − O/2 + 1000 ms) / (A + 2000 ms)`.

Das entspricht der UI-Formel „(positive ms + 1000) / (bewertete ms + 2000)“,
solange keine Überlappung vorliegt. Die Spanne ist ein Wilson-95-%-Intervall um
`(P − O/2 + 1000, A + 2000)`. Bewertete Zeit unter 5 s oder unter 10 % der
Aufnahme ergibt „–“; unter 30 s oder unter 30 % „vorläufig“; erst ab 30 s
werden 0 und 100 als Endpunkte zugelassen.

**Quellenbezug:** Nur Urteile mit `quote_verified = exact|fuzzy` zählen als
entscheidbar. Sei `S` die Zahl gestützter und `W` die Zahl widersprochener
Aussagen. Dann

`value = (S + 1) / (S + W + 2)`,

mit Wilson-Intervall auf derselben Basis. Ohne entscheidbare Aussage gibt es
keinen Wert; unter 5 entscheidbaren Aussagen ist die Schätzung vorläufig, ab 5
berichtbar, Endpunkte erst ab 10. `not_found` und `unchecked` bleiben offen und
werden **nicht als falsch** gewertet. Abdeckung ist `(S+W)/alle Aussagen`.

**Aufbau:** Siehe §1; der Score ist nur bei mindestens 3 Signalen, 50 Wörtern
und 45 s definiert. Die Spanne kommt aus den Komponenten, nicht aus einer
Normalverteilung.

Wilson-Intervalle sind für kleine binomiale Stichproben besser geeignet als die
Normalapproximation und vermeiden negative Untergrenzen [3][4]. Die additive
Glättung verhindert, dass eine einzelne Beobachtung sofort 0 oder 100 erzeugt;
sie ist eine Designentscheidung, keine statistische Garantie.

### 2.2 Praxisprofil `practice.evidence.v2`

Nach der getippten Fragerunde gibt es vier **Zeilen**, keine Gewichte und keinen
Gesamtscore:

| Zeile | Inhalt | Ausgabe |
|---|---|---|
| Quellenbindung Vortrag | Fact-Check-Urteile | Schätzung + Wilson-Spanne, nur mit geprüftem Zitat |
| Quellenbindung Antworten | Antwort-Urteile | Schätzung + Wilson-Spanne, nur mit geprüftem Zitat |
| Sprechmerkmale | Marker für Tempo, Lautstärke, Tonhöhe, Füllwörter, Pausen | Anzahl und Rate pro Minute, keine Schätzung |
| Pose/Gesten | Haltungs-, Gesten- und Kopforientierungsmarker | Anzahl und Rate pro Minute, keine Schätzung |

Die Quellenzeilen nutzen dieselbe `(S+1)/(S+W+2)`-Logik wie der Review-Score,
aber mit eigener Bezugsgröße. Die Sprech-/Pose-Zeilen zählen nur; sie werden
nicht in eine Punktzahl umgerechnet, weil ein fehlender Marker keine gute
Leistung belegt und die Marker unterschiedliche Dinge messen. Es gibt bewusst
keine Labels wie „Strong“ oder „Fair“ und keinen Vergleich mit anderen
Personen. Die alte gewichtete 0–100-Heuristik (`evidence-count-heuristic.v1`)
wurde ersetzt, weil sie unvergleichbare Kategorien addierte und den Eindruck
einer Gesamtnote erzeugte.

### 2.3 Research-Bezug und verworfene Alternativen

Das OECD-Handbuch zu zusammengesetzten Indikatoren verlangt explizite
Normalisierung, Gewichtung, Robustheitsprüfung und Transparenz; ein Composite
ist eine politische Setzung, keine neutrale Messung [5]. Genau diese Setzung
vermeiden wir: vier benannte Evidenzprofile statt einer Gesamtzahl. Verworfen
wurden:

- **gewichteter Gesamtscore:** suggeriert Vergleichbarkeit und Kompensation
  zwischen inkommensurablen Kriterien;
- **Note/Ampel pro Person:** nicht durch die Daten gedeckt;
- **Rohzähler als Score:** bestraft längere Aufnahmen und belohnt fehlende
  Marker nicht sauber;
- **Konfidenzintervall ohne Gates:** 0/100 bei zwei Beobachtungen wirkt
  präziser als die Datenlage.

Grenzen: Die Schwellen 5/10 s, 10/30 %, 30 s und 5/10 Entscheidungen sind
Produktheuristiken, nicht empirisch validiert. Wilson setzt unabhängige
Beobachtungen voraus; überlappende Events und geclusterte Takes verletzen das
teilweise. Die Scores sind keine Noten, keine Prognose und kein
Personenvergleich.

## 3. Prompt-Sicherheit und Rundenlimits

### 3.1 Bedrohungsmodell

Transkript, Quellen, Funde, Fragen und Antworten sind **Daten**, keine
Anweisungen. Ein Angreifer kann versuchen, über eine Quelle oder eine Antwort
den Systemprompt zu überschreiben, Rollen zu wechseln, das Ausgabeschema zu
brechen, Kosten zu erzeugen oder eine Frage beliebig oft neu zu stellen. Das
OWASP-LLM-Risiko „Prompt Injection“ [6] ist grundsätzlich nicht vollständig
lösbar; hinzu kommen Improper Output Handling [7], System Prompt Leakage [8] und
Unbounded Consumption [9].

### 3.2 Implementierte Maßnahmen

- **Nonce-Delimited Data Blocks:** Jeder untrusted Block erhält einen zufälligen
  128-Bit-Namen und wird nach dem Block erneut von der Policy gefolgt. Ein
  eingeschleuster schließender Tag ist ohne das aktuelle Nonce ungültig. Das
  folgt dem Spotlighting-Ansatz, Daten klar zu markieren und die Instruktion
  nach der Datenprobe zu wiederholen [10]. Es ist eine Erschwerung, kein Beweis.
- **Server-issued Round Ledger:** Der Client sendet nur `round_id` und
  `question_id`; die kanonische Frage kommt aus Redis. Ein frei erfundener
  Fragetext wird nicht akzeptiert. Die Runde hat TTL 600 s (Default,
  konfigurierbar 60–3600 s), maximal 5 Startfragen (Default 3), 3 Follow-ups und
  standardmäßig 6 Antwort-Turns (Request-Konfiguration bis 12). Ein
  `pending`-Claim verhindert doppelte bezahlte Aufrufe; ein
  identischer Retry liefert die gecachte Auswertung. Eine Frage wird nur einmal
  akzeptiert; ein anderer Text wird abgelehnt.
- **Eingabegrenzen:** 4000 Zeichen pro Antwort, 25 MB pro Voice-Upload,
  500 Zeichen pro Frage, 300 Zeichen pro Begründung. Voice im Browser: 600 s
  und 12 Antworten. Diese Grenzen sind im getippten Pfad hart; im Voice-Pfad
  sind sie Client-/Prompt-Grenzen, solange der Anbieter keine äquivalenten
  harten Limits erzwingt.
- **Ausgabeprüfung:** Striktes Pydantic-Schema, erlaubte Enums, keine freien
  Zahlen, `quote_in_text` für Quellenzitate, `safe_http_url` nur für absolute
  `http(s)`-URLs ohne Credentials/Steuerzeichen. Fehlerhafte Modellausgaben
  werden verworfen, nicht „repariert“.
- **Keine Tools im Review-Writer:** Der Writer bekommt nur geprüfte
  Evidence Cards; das reduziert Exfiltration und unerwünschte Nebenwirkungen.

### 3.3 Grenzen

Prompt-Injection kann nicht vollständig verhindert werden. Ein Modell kann
Anweisungen in Daten trotz Markierung folgen. Der Systemprompt kann teilweise
offengelegt werden. Die Rundenlimits schützen Kosten und Dauer, aber nicht vor
inhaltlich falschen Antworten. Die Anbieterkonfiguration (ElevenLabs) ist nicht
im Repository garantiert; harte Provider-Limits müssen dort geprüft und
dokumentiert werden. Es gibt keine allgemeine Authentifizierung und kein
Rate Limiting für die lokale API. Die Nonce-Blöcke schützen nicht vor
Social Engineering des Modells, sondern nur vor naiver Tag-Kollision.

## 4. Retention und Löschung

### 4.1 Implementiertes Modell

- **Täglich 03:15 UTC:** Celery Beat startet `retention_sweep`; ein
  PostgreSQL-Advisory-Lock verhindert parallele Läufe. Jeder Lauf schreibt eine
  Zeile in `retention_runs` (Status, Zähler, Fehlercode, keine Inhalte).
- **Konfiguration:** `RETENTION_PROFILE_DAYS` (365), `RETENTION_SESSION_DAYS`
  (365), `RETENTION_JOB_DAYS` (30), `RETENTION_STALE_JOB_HOURS` (2),
  `RETENTION_BATCH` (100). Ungültige oder nicht positive Werte fallen auf den
  Default zurück.
- **Profile:** `retention_until` und `retention_origin` (`default` oder `user`).
  Ein Profil mit eigener Frist wird durch neue Takes nicht stillschweigend
  verlängert; ein Default-Profil wird bei neuen Takes bis `recorded_at + 365
  Tage` verlängert. Die Web-UI setzt beim Anlegen ein festes Jahr als
  `user`-Frist; neue Takes verlängern sie daher nicht. Beim Ablauf werden Token, Ziele, Snapshots, Change-Points,
  `take_quality`/`take_metrics`, `progress_runs` und profil-eigene Idempotenz
  entfernt; Sessions/Takes werden per `ON DELETE SET NULL` **entkoppelt**, nicht
  gelöscht.
- **Sessions:** eigene `retention_until`; bei verknüpftem Profil wird dessen
  Frist übernommen. Der Sweep löscht Session, Takes, Events, Reviews, Jobs und
  Idempotenz kaskadierend.
- **S3-Outbox:** Objekt-Keys werden in derselben DB-Transaktion in
  `blob_deletions` geschrieben, die das Metadatenobjekt entfernt. Der eigentliche
  S3-Löschvorgang läuft nach dem Commit; Fehler bleiben mit exponentiellem
  Retry (maximal 1 h) in der Outbox. Eine Session-Löschung committet zuerst und
  flusht dann best-effort.
- **Jobs:** `queued`/`running` älter als 2 h werden fehlgeschlagen und ihr
  Objekt-Key in die Outbox gegeben; `completed`/`failed` älter als 30 Tage
  werden gelöscht. Abgelaufene Profil-/Review-Idempotenz wird entfernt.
- **Optional vollständig:** `DELETE /profiles/{id}?deleteSessions=true` löscht
  zusätzlich verknüpfte Sessions/Takes und deren serverseitige Analyse. Ohne
  den Parameter bleiben Sessions/Takes unter ihrer eigenen Einwilligung
  bestehen.

### 4.2 Research-Bezug

Celery Beat ist der dokumentierte Scheduler für periodische Tasks; ein eigener
Scheduler muss genau einmal laufen, deshalb ein separater Beat-Container statt
`worker -B` [11]. S3-Lifecycle-Regeln können Objekte nach Alter oder Präfix
entfernen, sind aber asynchron und ersetzen keine Metadaten-Löschung [12]. Die
Outbox folgt dem Muster „zustandsändernde DB-Transaktion plus zuverlässige
Nebenwirkung“: kein S3-Aufruf vor dem Commit, keine verlorene Löschung bei
einem Absturz zwischen Commit und S3.

GDPR Art. 5 verlangt Zweckbindung, Datenminimierung und Speicherbegrenzung;
Art. 17 regelt Löschung [13][14]. Das ist der Bezug, **keine
Compliance-Erklärung**. Insbesondere: Quellen-Collections und mehrere
S3-Präfixe werden nicht vollständig durchsucht; für ältere Präfixe ist eine
S3-Lifecycle-Regel nur ein Backstop und im lokalen SeaweedFS nicht verifiziert.
Es gibt keine Rechtsberatung und keine Garantie, dass jede Backup- oder
Anbieterkopie entfernt ist. Der loginfreie Profil-Token macht eine Löschung ohne
Token unmöglich; das ist eine bekannte Grenze, kein Recovery-Versprechen.

Verworfene Alternativen:

- **Sofortige Kaskade beim Profil-Ablauf:** würde Sessions/Takes unter einer
  separaten Einwilligung löschen. Deshalb nur Entkopplung plus optionales
  `deleteSessions`.
- **Best-effort-S3-Löschung nur im Request:** hinterlässt bei Crash orphane
  Objekte. Deshalb Outbox plus täglicher Flush.
- **Nur S3-Lifecycle:** lässt Postgres-Metadaten, Events und Reviews zurück.
- **Kein Sweep, nur UI-Hinweis:** wäre eine Löschzusage ohne Löschung.

## 5. Entscheidungen in Kurzform

| Thema | Entscheidung | Nicht behauptet |
|---|---|---|
| Aufbau | deterministische Rubrik v1, 4 Signale, Gates 3/50/45 | Validität, Folienabdeckung, Genauigkeit |
| Review | vier getrennte Evidenzprofile v2, Wilson, Gates | Note, Gesamtscore, Personenvergleich |
| Praxis | vier Zeilen v2, Schätzung nur für Quellenbindung | Gesamtscore, Labels, kausale Wirkung |
| Prompt | Nonce-Blöcke, Server-Runde, TTL, Caps, Schema-Check | vollständiger Injection-Schutz |
| Retention | täglicher Sweep, Outbox, Entkopplung, optionales Löschen | Rechtskonformität, vollständige S3-Löschung |

## Quellen

1. Hearst, M. A. (1997). *TextTiling: Segmenting Text into Multi-paragraph
   Subtopic Passages.* Computational Linguistics 23(1).
   <https://aclanthology.org/J97-1003/>
2. Pevzner, L., & Hearst, M. A. (2002). *A Critique and Improvement of an
   Evaluation Metric for Text Segmentation.* Computational Linguistics 28(1).
   <https://aclanthology.org/J02-1002/>
3. Wilson, E. B. (1927). *Probable Inference, the Law of Succession, and
   Statistical Inference.* JASA 22(158).
   <https://doi.org/10.1080/01621459.1927.10502953>
4. Brown, L. D., Cai, T. T., & DasGupta, A. (2001). *Interval Estimation for a
   Binomial Proportion.* Statistical Science 16(2).
   <https://projecteuclid.org/journals/statistical-science/volume-16/issue-2/Interval-Estimation-for-a-Binomial-Proportion/10.1214/ss/1009213286.full>
5. OECD (2008). *Handbook on Constructing Composite Indicators: Methodology and
   User Guide.* <https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html>
6. OWASP. *LLM01:2025 Prompt Injection.*
   <https://genai.owasp.org/llmrisk/llm01-prompt-injection/>
7. OWASP. *LLM05:2025 Improper Output Handling.*
   <https://genai.owasp.org/llmrisk/llm05-improper-output-handling/>
8. OWASP. *LLM07:2025 System Prompt Leakage.*
   <https://genai.owasp.org/llmrisk/llm07-system-prompt-leakage/>
9. OWASP. *LLM10:2025 Unbounded Consumption.*
   <https://genai.owasp.org/llmrisk/llm10-unbounded-consumption/>
10. Microsoft (2024). *Defending Against Indirect Prompt Injection Attacks
    With Spotlighting.* <https://arxiv.org/abs/2403.14720>; Überblick:
    <https://www.microsoft.com/en-us/security/blog/2024/03/26/securing-ai-systems-against-indirect-prompt-injection-attacks-using-spotlighting/>
11. Celery. *Periodic Tasks.*
    <https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html>
12. Amazon S3. *Object Lifecycle Management.*
    <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html>
13. GDPR, Art. 5. <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
14. GDPR, Art. 17. <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
15. ElevenLabs. *Eleven Agents overview.*
    <https://elevenlabs.io/docs/eleven-agents/overview>; *Webhook tools.*
    <https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools>

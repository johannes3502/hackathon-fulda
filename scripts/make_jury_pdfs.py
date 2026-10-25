#!/usr/bin/env python3
"""Build the two German jury handouts with ReportLab (no app/runtime changes)."""
from pathlib import Path
import math

from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf"
OUT.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path("/usr/share/fonts/open-sans")
for name, filename in [("Open", "OpenSans-Regular.ttf"), ("Bold", "OpenSans-Bold.ttf"), ("Light", "OpenSans-Light.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
pdfmetrics.registerFontFamily("Open", normal="Open", bold="Bold", italic="Open", boldItalic="Bold")

W, H = A4
M = 42
CW = W - 2 * M
INK = "202024"
MUTED = "55555D"
PURPLE = "3803BF"
PALE = "F5F5F7"
LINE = "D6D6DC"
WHITE = "FFFFFF"


def col(hex_value):
    return colors.HexColor("#" + hex_value)


class Document:
    def __init__(self, name, label, total):
        self.path = OUT / name
        self.c = canvas.Canvas(str(self.path), pagesize=A4, pageCompression=1)
        self.c.setTitle("418 Pitch Practice | " + label)
        self.c.setAuthor("418 Pitch Practice - Hackathon Fulda 2026")
        self.c.setSubject("Jury und Abgabe | Prototypstand 25.10.2026")
        self.label, self.total, self.page = label, total, 0

    def box(self, x, top, width, height, fill=PALE, radius=0, stroke=None):
        self.c.setFillColor(col(fill))
        self.c.setStrokeColor(col(stroke or fill))
        self.c.setLineWidth(.7)
        self.c.roundRect(x, H - top - height, width, height, radius, fill=1, stroke=bool(stroke))

    def text(self, text, x, top, size=10.5, width=CW, color=INK, font="Open", leading=None, max_h=None):
        style = ParagraphStyle("p", fontName=font, fontSize=size, leading=leading or size * 1.43,
                               textColor=col(color), spaceAfter=0, splitLongWords=False)
        p = Paragraph(text, style)
        _, height = p.wrap(width, H)
        if max_h is not None and height > max_h + .1:
            raise ValueError(f"Page {self.page}: text overflow {height:.1f} > {max_h}: {text}")
        if top < 793 and top + height > 791:
            raise ValueError(f"Page {self.page}: text enters footer: {text}")
        p.drawOn(self.c, x, H - top - height)
        return height

    def line(self, x1, y1, x2, y2, color=LINE, weight=1, dashed=False):
        self.c.setStrokeColor(col(color))
        self.c.setLineWidth(weight)
        self.c.setDash(3, 3) if dashed else self.c.setDash()
        self.c.line(x1, H-y1, x2, H-y2)
        self.c.setDash()

    def arrow(self, x1, y1, x2, y2, color=PURPLE, dashed=False):
        self.line(x1, y1, x2, y2, color, 1.1, dashed)
        a = math.atan2(y2-y1, x2-x1)
        for off in [-.5, .5]:
            self.line(x2, y2, x2-5*math.cos(a+off), y2-5*math.sin(a+off), color, 1.1)

    def circle(self, x, top, radius, fill):
        self.c.setFillColor(col(fill))
        self.c.circle(x, H-top, radius, stroke=0, fill=1)

    def page_start(self, section):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.text("418", M, 28, 21, 56, PURPLE, "Bold")
        self.text("Pitch Practice", M+50, 34, 10, 160, INK)
        self.text(section, W-220, 36, 8.3, 180, MUTED)
        self.line(M, 69, W-M, 69)
        self.line(M, 793, W-M, 793)
        self.text("Hackathon Fulda · 25. Oktober 2026", M, 805, 8, 360, MUTED)
        self.text(f"{self.page} / {self.total}", W-76, 805, 8, 40, MUTED)

    def title(self, kicker, headline, intro):
        self.text(kicker, M, 91, 9, CW, PURPLE)
        self.text(headline, M, 113, 24, CW, INK, "Bold", leading=29, max_h=59)
        self.text(intro, M, 155, 10.5, CW, MUTED, max_h=46)

    def tag(self, label, x, top, width, fill=PALE, color=PURPLE):
        self.text(label, x, top, 10, width, INK, "Bold", max_h=15)
        self.line(x, top+22, x+width, top+22)

    def node(self, x, top, width, height, title, body, fill=WHITE):
        self.box(x, top, width, height, fill, 0, LINE)
        self.text(title, x+13, top+11, 10.2, width-26, INK, "Bold", max_h=30)
        self.text(body, x+13, top+32, 9, width-26, MUTED, max_h=height-37)

    def save(self):
        if self.page != self.total:
            raise ValueError("Unexpected page count")
        self.c.save()
        print(self.path)


def features():
    d = Document("418-Pitch-Practice-Features-Jury.pdf", "Funktionen und Bedienung", 2)
    d.page_start("Funktionen")
    d.title("Produktübersicht", "Funktionen des Prototyps",
            "418 Pitch Practice ist eine Web-App zum Üben von Präsentationen. Sie erfasst Haltung und Sprache, vergleicht Aussagen mit Quellen und stellt anschließend Rückfragen. Die Jury nutzt den vorbereiteten Laptop ohne Login.")

    d.text("Ablauf", M, 220, 10, CW, INK, "Bold")
    for i, title in enumerate(["Material hochladen", "Vortrag aufnehmen", "Review ansehen", "Fragen beantworten"]):
        x = M+i*130
        d.text(title, x, 244, 9.2, 123, MUTED)
        if i < 3:
            d.arrow(x+115, 251, x+126, 251, MUTED)
    d.line(M, 277, W-M, 277)
    d.text("Funktion", M, 289, 8.8, 175, MUTED)
    d.text("Was die App erfasst und zurückmeldet", M+203, 289, 8.8, CW-203, MUTED)

    rows = [
        ("1", "Haltung und Gestik", "Die Kamera erfasst Körper- und Handpunkte. Daraus erkennen Regeln zum Beispiel zusammengeführte Hände, verschränkte Arme oder seitliche Neigung. Hinweise erscheinen während der Aufnahme und später mit Zeitmarke im Review."),
        ("2", "Transkript und Quellencheck", "Gesprochene Wörter erhalten Zeitmarken. Aussagen werden mit hochgeladenen PDF-, Folien- oder Textquellen verglichen. Das Ergebnis zeigt ein Quellenzitat und ein Urteil: gestützt, widersprochen oder in den Quellen nicht gefunden."),
        ("3", "Sprechmerkmale", "Die App erfasst Tempo, Pausen, Füllwörter, Lautstärke und Tonhöhenvariation. Ein Teil der Hinweise erscheint live. Wortbasiertes Tempo und Füllwörter werden nach dem Stoppen aus dem Transkript ausgewertet."),
        ("4", "Review mit Zeitmarken", "Ein Klick auf einen Hinweis springt an die zugehörige Stelle im eigenen Video. Zu den Beobachtungen stehen Erklärungen und Übungsvorschläge. Aufnahme, Analyse und Gespräch bleiben in diesem Browser gespeichert."),
        ("5", "Frage-Simulator", "Im normalen Review kann ein ElevenLabs-Sprachdialog zu Vortrag und Material nachfragen und je nach Präsentationstyp eine Rolle übernehmen. Die Jury-Stage stellt genau eine vorbereitete Datenschutzfrage ohne Anbieterzugriff."),
    ]
    for i, (n, title, body) in enumerate(rows):
        y = 318+i*81
        d.text(n, M, y, 10, 20, PURPLE)
        d.text(title, M+27, y, 11, 160, INK, "Bold", max_h=33)
        d.text(body, M+203, y, 9.6, CW-203, INK, max_h=69)
        if i < 4:
            d.line(M, y+71, W-M, y+71)
    d.text("Die Kamera schätzt Kopforientierung, keinen Blickkontakt. Hinweise beruhen auf Prototyp-Heuristiken; es gibt keine Emotions- oder Persönlichkeitsbewertung.", M, 741, 9, CW, MUTED, max_h=27)
    d.text("Basis: AGENTS.md; docs/01-product.md; docs/07-review-and-agent.md. Stand 25.10.2026.", M, 778, 7.5, CW, MUTED)

    d.page_start("Bedienung und Scores")
    d.title("Jury-Demo", "Aufnahme und Auswertung",
            "Für die Jury-Stage reichen eine kurze Präsentation sowie Kamera und Mikrofon. Der lokale Standardpfad braucht kein Backend; Quellencheck und optionale Live-Analyse benötigen die eingerichteten Dienste. Die feste Stage-Frage funktioniert ohne Anbieterzugriff.")

    d.text("Eine kurze Probeaufnahme", M, 218, 12, CW, INK, "Bold")
    for i, (title, body) in enumerate([
        ("Jury-Stage öffnen", "Auf /stage den Preflight ausführen und Lokale Sofortaufnahme wählen. Sie braucht kein Backend und lädt keine Medien hoch."),
        ("Aufnehmen", "Kamera und Mikrofon erlauben, kurz präsentieren und die Aufnahme beenden. Live-Demo starten nutzt optional die Backend-Analyse."),
        ("Review und Frage", "Im Review die drei Kriterien ansehen und einen Hinweis anklicken. Danach stellt die Stage genau eine vorbereitete Datenschutzfrage."),
    ]):
        y=247+i*52
        d.text(str(i+1), M, y, 10, 20, PURPLE)
        d.text(title, M+27, y, 10.3, 150, INK, "Bold")
        d.text(body, M+185, y, 9.3, CW-185, INK, max_h=42)

    d.text("Zeitmarken im Review", M, 419, 12, CW, INK, "Bold")
    d.text("Schematisches Beispiel, keine echte Messung", M+230, 423, 8.2, CW-230, MUTED)
    x0,x1=M+15,W-M-15
    d.line(x0, 463, x1, 463, LINE, 1.4)
    for f,t in [(0,"00:00"),(1/3,"00:20"),(2/3,"00:40"),(1,"01:00")]:
        x=x0+(x1-x0)*f
        d.line(x, 458, x, 468, MUTED, .7)
        d.text(t,x-13,476,8.5,38,MUTED)
    d.circle(x0+(x1-x0)/3,463,4,PURPLE)
    d.text("00:20 · Hände zusammen", M, 504, 10, 190, INK, "Bold")
    d.text("Der Marker öffnet die Stelle im lokalen Video. Dort lässt sich prüfen, ob die Geste zur Aussage passt.", M+203, 504, 9.4, CW-203, INK, max_h=29)

    d.text("Scores im Review", M, 555, 12, CW, INK, "Bold")
    d.text("Gestik", M, 582, 10, 160, INK, "Bold")
    d.text("100 × positive / (positive + kritische) bewertete Zeitanteile. Überlappungen gleicher Bewertung zählen zeitlich nur einmal.", M+185, 582, 9.2, CW-185, INK, max_h=29)
    d.line(M, 613, W-M, 613)
    d.text("Flow", M, 621, 10, 160, INK, "Bold")
    d.text("Dieselbe Zeitanteil-Formel, getrennt von Gestik.", M+185, 621, 9.2, CW-185, INK, max_h=25)
    d.line(M, 649, W-M, 649)
    d.text("Fachwissen", M, 657, 10, 160, INK, "Bold")
    d.text("Mit Quellencheck: 100 × gestützt / (gestützt + widersprochen), nur mit geprüftem Quellenzitat. Ohne Quellencheck nutzt es bewertete Zeitanteile.", M+185, 657, 9.0, CW-185, INK, max_h=39)
    d.text("Alle drei Prototyp-Scores liegen zwischen 0 und 100. Ohne bewertbare Evidenz bleibt ein Score offen. Formel und Datenabdeckung sind sichtbar; neutrale Beobachtungen und unbekannte Zeit bleiben außen vor. Keine validierten Noten.", M, 704, 9.0, CW, MUTED, max_h=39)
    d.text("Ohne eigene Aufnahme: /gestures zeigt einen 22-sekündigen synthetischen Ablauf. /review-preview ist ein markiertes Beispiel. Für Cloud-Aufrufe nur synthetische Demo-Inhalte verwenden.", M, 751, 8.5, CW, MUTED, max_h=26)
    d.save()


def architecture():
    d = Document("418-Pitch-Practice-Architektur.pdf", "Architektur und Datenfluss", 3)
    d.page_start("Systemübersicht")
    d.title("Technische Dokumentation", "Systemübersicht",
            "Next.js im Browser, FastAPI und Celery im lokalen Docker-Compose-Stack. Pose-Regeln laufen im Browser. Die Jury-Stage speichert Video und Review lokal; ihr Standardpfad lädt keine Medien hoch. Der optionale Live-Pfad nutzt das Backend.")

    d.box(M, 222, CW, 108, PALE, stroke=LINE)
    d.text("Browser · Next.js / TypeScript", M+14, 234, 10.5, CW-28, INK, "Bold")
    bw=(CW-48)/3
    for i,(title,body) in enumerate([
        ("Kamera", "MediaPipe + lokale Regeln<br/>Körper- und Handpunkte"),
        ("Mikrofon", "AudioWorklet / PCM<br/>lokal; optional Live-Backend"),
        ("Aufnahme / Review", "MediaRecorder + IndexedDB<br/>Wiedergabe, Analyse, Gespräch"),
    ]):
        x=M+12+i*(bw+12)
        d.text(title,x,263,9.7,bw,INK,"Bold")
        d.text(body,x,286,8.5,bw,MUTED,max_h=30)
    d.arrow(W/2,330,W/2,374)
    d.text("HTTP /api und WebSocket; optionaler Upload nach Stop", M, 344, 8.5, 260, MUTED)

    d.box(M,375,CW,53,PALE,stroke=LINE)
    d.text("FastAPI · Python 3.12",M+14,385,10.5,CW-28,INK,"Bold")
    d.text("Validierung, Job-Status, Quellen- und Analyse-Endpunkte, Signed URL für ElevenLabs",M+14,407,8.7,CW-28,MUTED)
    d.arrow(M+64,428,M+64,469)
    widths=[129,200,150]
    xs=[M,M+141,M+353]
    for x,w,title,body in zip(xs,widths,["Redis","Celery Worker","Celery Beat"],["Broker + Jobstatus","ASR, Sprache, Quellen, RAG","Retention-Scheduler"]):
        d.node(x,470,w,65,title,body)
    d.arrow(M+129,502,M+141,502)
    d.line(M+428,470,M+428,451,MUTED,dashed=True)
    d.line(M+428,451,M+64,451,MUTED,dashed=True)
    d.text("Zeitgesteuerte Jobs",M+289,436,7.8,120,MUTED)
    d.line(M+241,535,M+241,556,MUTED)
    d.line(M+128,556,M+384,556,MUTED)
    d.arrow(M+128,556,M+128,576,MUTED)
    d.arrow(M+384,556,M+384,576,MUTED)
    dw=(CW-12)/2
    d.node(M,578,dw,80,"PostgreSQL + pgvector","Quellen-Chunks + Embeddings;<br/>persistente Review-/Progress-API")
    d.node(M+dw+12,578,dw,80,"SeaweedFS / S3","Quellen und temporäre Analyse-Uploads;<br/>keine Video-Wiedergabe aus dem Backend")

    d.text("Externe Dienste",M,685,11,CW,INK,"Bold")
    d.text("Ein manuell gestarteter Quellencheck sendet Transkript- und Quellenauszüge an Gemini (Cloud, ohne EU-Region-Pinning). Der normale Review kann ElevenLabs nutzen; Deepgram EU ist Opt-in. Die Jury-Stage-Frage benötigt keinen Anbieter.",M,709,9.5,CW,INK,max_h=42)
    d.text("Vereinfachtes Diagramm. Die Web-App nutzt derzeit die Audio-Job-API und lokalen Review. Die persistente Session-/Take-API ist separat implementiert. Basis: compose.yaml, docs/03-architecture.md, transport.ts.",M,762,7.9,CW,MUTED,leading=10.5,max_h=29)

    d.page_start("Analyseabläufe")
    d.title("Verarbeitung", "Analyseabläufe",
            "Im optionalen Live-Pfad werden Material und Aufnahme getrennt verarbeitet. Die lokale Jury-Stage kann ohne Backend aufzeichnen und reviewen. Zeitmarken verbinden Hinweise mit dem lokalen Video.")
    gap=19
    bw=(CW-gap)/2
    d.tag("Quellen und Aussagen",M,226,bw)
    d.tag("Aufnahme und Sprache",M+bw+gap,226,bw)
    left=[
        ("1 / Material einlesen","PDF, PPTX, DOCX, TXT, MD;<br/>Chunks mit Quelle und Seite/Folie."),
        ("2 / Passagen suchen","Lokale Jina-Embeddings, FastEmbed/ONNX.<br/>Hybrid-Suche: pgvector + Volltext."),
        ("3 / Quellenvergleich","Aussagen aus dem Transkript + Retrieval.<br/>Gemini urteilt mit Quellenauszügen."),
        ("4 / Urteil prüfen","Code prüft Zitat und Zahlen. Gestützt,<br/>widersprochen oder nicht gefunden."),
    ]
    right=[
        ("1 / Während der Aufnahme","Pose-Regeln im Browser; optional PCM zum Server.<br/>Live-Pausen zusätzlich im Browser."),
        ("2 / Nach dem Stoppen","Im Live-Pfad temporärer Upload; FFmpeg, RMS,<br/>YIN-Pitch und Silero-Sprachaktivität."),
        ("3 / Transkription","Lokales faster-whisper mit Wort-Zeitmarken.<br/>Finale Deepgram-Wörter wiederverwendbar."),
        ("4 / Wortbasierte Merkmale","Tempo, Pausen und Füllwörter;<br/>Zusammenführung mit Signal-Events."),
    ]
    for x,nodes in [(M,left),(M+bw+gap,right)]:
        for i,(title,body) in enumerate(nodes):
            y=268+i*77
            d.node(x,y,bw,63,title,body)
            if i<3:
                d.arrow(x+bw/2,y+63,x+bw/2,y+77,MUTED)
    d.arrow(M+bw+gap,453,M+bw,453,MUTED,dashed=True)
    d.line(M+bw/2,562,M+bw/2,580,MUTED)
    d.line(M+bw+gap+bw/2,562,M+bw+gap+bw/2,580,MUTED)
    d.line(M+bw/2,580,M+bw+gap+bw/2,580,MUTED)
    d.arrow(W/2,580,W/2,600,MUTED)

    d.line(M,602,W-M,602)
    d.text("Gemeinsame Zeitachse",M,617,12,CW,INK,"Bold")
    d.text("t_ms",M,646,10,80,PURPLE,"Bold")
    d.text("Zeit relativ zum Aufnahmestart",M+100,646,10,CW-100,INK)
    d.text("peak_ms",M,671,10,80,PURPLE,"Bold")
    d.text("Sprungziel im Aufnahmevideo",M+100,671,10,CW-100,INK)
    d.text("Events enthalten außerdem Typ, Dauer, Quelle, Schweregrad und Messdaten. MediaRecorder.onstart verankert die Browserzeit. Im Review erfolgt der Sprung über video.currentTime; es werden keine Server-Clips erstellt.",M,707,9.5,CW,INK,max_h=42)
    d.text("Ein geprüftes Zitat belegt die Fundstelle, garantiert aber kein korrektes Modellurteil. Nicht gefunden bedeutet nicht falsch. Basis: docs/03-architecture.md; backend/app/events.py; backend/app/review/models.py.",M,763,7.9,CW,MUTED,leading=10.5,max_h=29)

    d.page_start("Speicherung und Betrieb")
    d.title("Daten und Integrationsstand", "Speicherung und Betrieb",
            "Bei der lokalen Jury-Stage bleiben Video und Review im Browser; dieser Standardpfad lädt keine Medien hoch. Der optionale Live-Pfad lädt zur Analyse ans lokale Backend. Neue Web-Aufnahmen sind noch nicht mit der Session-/Take- und Progress-API verbunden.")
    d.text("Daten",M,220,10,160,INK,"Bold")
    d.text("Speicher und Lebensdauer",M+175,220,10,CW-175,INK,"Bold")
    d.line(M,243,W-M,243)
    rows=[
        ("Video, Pose-Log, Review","IndexedDB im Browser, einschließlich Transkript und Gespräch. Nach Reload wieder verfügbar; lokales Löschen im Review."),
        ("Analyse-Upload","Nur im optionalen Live-Pfad: Aufnahme temporär in SeaweedFS. Nach der Verarbeitung wird das Original gelöscht, auch bei Analysefehlern. Die lokale Stage lädt keine Medien hoch."),
        ("Quellen","Originaldateien in SeaweedFS, Chunks und Embeddings in Postgres. Automatischer Quellen-Cleanup ist noch offen."),
        ("Persistente Takes / Progress","Separate API mit Daten in Postgres. Session-Löschung und Profil-Löschung sind getrennt; Profil-Löschung entkoppelt Takes."),
    ]
    for i,(title,body) in enumerate(rows):
        y=257+i*50
        d.text(title,M,y,9.6,160,INK,"Bold",max_h=29)
        d.text(body,M+175,y,9.2,CW-175,INK,max_h=40)
        d.line(M,y+43,W-M,y+43)

    d.text("Anbindung und Fehlerbehandlung",M,474,12,CW,INK,"Bold")
    d.text("Der normale Live-Pfad lädt über /speech/analyze hoch und fragt den Job-Status ab. Lange Arbeiten laufen in Celery; Redis enthält IDs und Status, keine Medien. Die lokale Stage kann ohne Backend aufzeichnen und reviewen. Kamera- und Sprachhinweise entstehen aus gemessenen Events; ein fehlendes Quellenurteil bleibt offen.",M,499,9.5,CW,INK,max_h=56)

    d.text("Modelle und externe Dienste",M,573,12,CW,INK,"Bold")
    d.text("MediaPipe, Whisper und Embeddings laufen lokal. Ein Quellencheck sendet Transkript und Quellenauszüge an Gemini; es gibt kein EU-Region-Pinning. Der optionale ElevenLabs-Dialog verarbeitet Audio und Kontext; Antworten sind nicht zitateverifiziert. Deepgram EU ist für Live-Transkripte Opt-in. Die Jury-Stage nutzt diese Anbieter nicht.",M,598,9.5,CW,INK,max_h=56)

    d.text("Grenzen des Prototyps",M,672,12,CW,INK,"Bold")
    d.text("Demo-Inhalte für Cloud-Aufrufe sind synthetisch. Zitat-, Zahlen- und Schema-Prüfungen reduzieren Modellfehler, bieten aber keinen vollständigen Prompt-Injection-Schutz. Die Qualität auf echten Geräten und die Lernwirksamkeit sind nicht validiert. Lokales Löschen entfernt keine separaten Backend-Daten; Legacy-Ergebnis-Cleanup bleibt offen.",M,697,9.2,CW,MUTED,max_h=54)
    d.text('Basis: AGENTS.md; docs/03-architecture.md; docs/07-review-and-agent.md; docs/14-open-todos.md; docs/15-grounding-hardening.md. <link href="https://github.com/johannes3502/hackathon-fulda" color="#3803BF">Repository: johannes3502/hackathon-fulda</link>. Stand 25.10.2026.',M,765,7.7,CW,MUTED,leading=10.3,max_h=25)
    d.save()


if __name__ == "__main__":
    features()
    architecture()

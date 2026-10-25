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
INK = "1B1428"
MUTED = "655E72"
PURPLE = "3803BF"
PALE = "F2EDFC"
LINE = "DDD5EA"
DARK = "1D1037"
WHITE = "FFFFFF"
GREEN = "137663"
GREEN_BG = "E8F4EF"
RED = "B04747"
RED_BG = "FBEFEE"


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

    def box(self, x, top, width, height, fill=PALE, radius=12, stroke=None):
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
        self.box(0, 0, W, H, "FCFBFE", 0)
        self.text("418", M, 27, 23, 56, PURPLE, "Light")
        self.text("PITCH PRACTICE", M+57, 35, 9, 160, INK, "Bold")
        self.text(section.upper(), W-220, 36, 8.3, 180, MUTED)
        self.line(M, 69, W-M, 69)
        self.line(M, 793, W-M, 793)
        self.text("HACKATHON FULDA 2026  /  FUTURE EDUCATION", M, 805, 7.5, 360, MUTED)
        self.text(f"{self.page:02d} / {self.total:02d}", W-80, 803, 8.5, 45, PURPLE, "Bold")

    def title(self, kicker, headline, intro):
        self.text(kicker.upper(), M, 89, 8.7, CW, PURPLE, "Bold")
        self.text(headline, M, 109, 31, CW, INK, "Bold", leading=35)
        self.text(intro, M, 191, 10.5, CW, MUTED, max_h=33)

    def tag(self, label, x, top, width, fill=PALE, color=PURPLE):
        self.box(x, top, width, 22, fill, 7)
        self.text(label, x+9, top+4, 8.4, width-18, color, "Bold", max_h=14)

    def node(self, x, top, width, height, title, body, fill=WHITE):
        self.box(x, top, width, height, fill, 9, LINE if fill == WHITE else None)
        self.text(title, x+13, top+11, 10.2, width-26, PURPLE, "Bold", max_h=30)
        self.text(body, x+13, top+32, 9, width-26, MUTED, max_h=height-37)

    def save(self):
        if self.page != self.total:
            raise ValueError("Unexpected page count")
        self.c.save()
        print(self.path)


def features():
    d = Document("418-Pitch-Practice-Features-Jury.pdf", "Features und Jury-Guide", 2)
    d.page_start("01 / Produkt & Mehrwert")
    d.title("Der Präsentationstrainer", "Gute Vorträge<br/>werden geübt.",
            "418 Pitch Practice verbindet Auftritt, Sprache und Quellenwissen mit konkreten Stellen im eigenen Vortrag. Für Pitch, Thesis und Schule.")

    d.box(M, 244, CW, 78, DARK)
    d.text("EIN LERNKREISLAUF", M+17, 255, 8, CW-34, "BCA6F0", "Bold")
    steps = [("01", "Vorbereiten"), ("02", "Aufnehmen"), ("03", "Review"), ("04", "Fragen üben")]
    for i, (n, title) in enumerate(steps):
        x = M+17+i*122
        d.text(n, x, 278, 9, 22, "BCA6F0", "Bold")
        d.text(title, x+22, 277, 10.2, 104, WHITE, "Bold")
        if i < 3:
            d.arrow(x+105, 286, x+116, 286, "BCA6F0")

    rows = [
        ("01", "Auftritt sichtbar machen", "Kamera-Landmarks liefern Hinweise zu Gestik, Haltung und Kopforientierung. Kalibrierte Regeln erzeugen dezentes Live-Feedback."),
        ("02", "Aussagen an Quellen prüfen", "Transkript mit Wort-Zeitmarken; Abgleich mit hochgeladenem Material. Quellenzitate machen die Urteile nachprüfbar."),
        ("03", "Sprechfluss reflektieren", "Tempo, Pausen, Füllwörter, Lautstärke und Tonhöhenvariation. Hinweise teils live, die vollständige Auswertung nach der Aufnahme."),
        ("04", "Genau zur Stelle zurückspringen", "Ein Klick auf einen Review-Moment führt zum passenden Punkt im lokalen Video. Beobachtung, Erklärung und Übung stehen zusammen."),
        ("05", "Rückfragen im Gespräch üben", "Der konfigurierte ElevenLabs-Sprachdialog fragt anhand von Vortrag und Material nach. Der Präsentationstyp prägt die Gesprächsrolle."),
    ]
    for i, (n, title, body) in enumerate(rows):
        y = 348+i*78
        d.circle(M+18, y+18, 18, PALE)
        d.text(n, M+7, y+10, 11, 26, PURPLE, "Bold")
        d.text(title, M+51, y, 12, CW-51, INK, "Bold")
        d.text(body, M+51, y+23, 10, CW-51, MUTED, max_h=43)
        if i < 4:
            d.line(M+51, y+68, W-M, y+68)
    d.text("PROTOTYP  /  25.10.2026  /  Demo am vorbereiteten Laptop auf localhost, ohne Login.", M, 754, 8.5, CW, MUTED)

    d.page_start("02 / Erleben & Einordnen")
    d.title("Feedback wird überprüfbar", "Vom Hinweis<br/>zum nächsten Versuch.",
            "Nicht nur ein Endwert: Im Review lässt sich die Beobachtung im Kontext ansehen und in einen konkreten Übungsschritt übersetzen.")

    d.box(M, 240, CW, 170, DARK)
    d.text("REVIEW-MOMENTE", M+17, 254, 8.3, 290, "BCA6F0", "Bold")
    d.text("Schematische Darstellung / synthetisches Beispiel", M+17, 271, 8.1, CW-34, "C5B9D9")
    x0, x1 = M+25, W-M-25
    d.line(x0, 309, x1, 309, "6B5B84", 2)
    for f, t in [(0, "00:00"), (.33, "00:20"), (.66, "00:40"), (1, "01:00")]:
        x = x0+(x1-x0)*f
        d.line(x, 304, x, 314, "BCA6F0")
        d.text(t, x-13, 323, 8.2, 38, "C5B9D9")
    d.circle(x0+154, 309, 6, "BCA6F0")
    d.line(x0+154, 296, x0+154, 319, "BCA6F0", .8)
    d.box(M+17, 350, CW-34, 45, "34214E", 9)
    d.text("00:20  /  Hände zusammen", M+29, 357, 9.5, CW-58, WHITE, "Bold")
    d.text("Stelle ansehen: Unterstützt die Geste deine Aussage? Bewusst erneut üben.", M+29, 376, 8.9, CW-58, "E3DAEF", max_h=14)

    labels = [("Gestik", "Zeitanteile bewerteter\nGesten-Evidenz"), ("Fachwissen", "Entscheidbare Urteile\nmit geprüftem Zitat"), ("Flow", "Zeitanteile bewerteter\nSprech-Evidenz")]
    for i, (title, body) in enumerate(labels):
        x = M+i*(CW+12)/3
        width = (CW-24)/3
        d.box(x, 429, width, 81, PALE)
        d.text(title, x+13, 440, 12, width-26, PURPLE, "Bold")
        d.text(body.replace("\n", "<br/>"), x+13, 465, 9.1, width-26, MUTED, max_h=30)

    d.text("Drei transparente Prototyp-Scores, 0 bis 100", M, 528, 12, CW, INK, "Bold")
    d.text("Zeitbasiert: 100 × positive / (positive + kritische) Zeitanteile. Überlappungen derselben Art zählen einmal. Fachwissen bevorzugt: 100 × gestützt / (gestützt + widersprochen), nur mit geprüftem Quellenzitat.", M, 552, 10, CW, MUTED, max_h=44)
    d.text("Ohne Evidenz bleibt der Score offen. Formel und Abdeckung sind sichtbar; neutrale und unbekannte Zeit wird ausgeschlossen. Fehlende Warnungen sind kein Lob. Die Werte sind keine validierten Noten.", M, 604, 9.5, CW, MUTED, max_h=42)

    d.line(M, 661, W-M, 661)
    for i, (title, body) in enumerate([
        ("1 / Schnell einsteigen", "Auf dem Demo-Laptop: /gestures zeigt 22 Sekunden synthetische Bewegungen."),
        ("2 / Selbst ausprobieren", "Quellen vorbereiten, Kamera und Mikro erlauben, kurz präsentieren und Review öffnen."),
        ("3 / Weiter üben", "Zeitmarke prüfen und danach Practice questions starten; Anbieterzugang erforderlich."),
    ]):
        x=M+i*(CW+15)/3
        width=(CW-30)/3
        d.text(title, x, 676, 9.3, width, PURPLE, "Bold")
        d.text(body, x, 698, 8.7, width, MUTED, max_h=52)
    d.text("Grenzen: Kopforientierung ist kein Blickkontakt; keine Emotions- oder Persönlichkeitsbewertung. Nur synthetische Demo-Inhalte an Cloud-KI. Basis: AGENTS.md, docs/01-product.md, docs/07-review-and-agent.md; Score-Code: review-scores.ts. Stand 25.10.2026.", M, 755, 7.8, CW, MUTED, leading=10.4, max_h=33)
    d.save()


def architecture():
    d = Document("418-Pitch-Practice-Architektur.pdf", "Architektur und Datenfluss", 3)
    d.page_start("01 / Systemüberblick")
    d.title("Architektur des Prototyps", "Lokal beobachten.<br/>Gezielt analysieren.",
            "Der Browser erfasst die Präsentation. Python-Jobs analysieren Sprache und Quellen. Zeitmarken führen die Ergebnisse wieder im Review zusammen.")

    d.box(M, 237, CW, 108, PALE)
    d.text("BROWSER  /  NEXT.JS + TYPESCRIPT", M+14, 249, 9, CW-28, PURPLE, "Bold")
    bw=(CW-48)/3
    for i, (title, body) in enumerate([
        ("Kamera", "MediaPipe + lokale Regeln<br/>Pose und Hände"),
        ("Mikrofon", "AudioWorklet / PCM<br/>Live-Sprechfeedback"),
        ("Aufnahme & Review", "MediaRecorder + IndexedDB<br/>Lokales Wiedergabevideo"),
    ]):
        x=M+12+i*(bw+12)
        d.text(title, x, 277, 10, bw, INK, "Bold")
        d.text(body, x, 299, 8.5, bw, MUTED, max_h=30)
    d.arrow(W/2, 345, W/2, 387)
    d.text("HTTP /api + WebSocket / Audio-Upload nach Stop", M, 357, 8.5, 238, MUTED)

    d.box(M, 388, CW, 52, DARK)
    d.text("FASTAPI  /  PYTHON 3.12", M+15, 398, 10.5, CW-30, WHITE, "Bold")
    d.text("Endpunkte, Validierung, Job-Status, Signed URL für den Sprachdialog", M+15, 419, 8.7, CW-30, "C5B9D9")
    d.arrow(M+64, 440, M+64, 467)

    widths=[129, 200, 150]
    xs=[M, M+141, M+353]
    for x,w,title,body in zip(xs,widths,["Redis", "Celery Worker", "Celery Beat"],["Broker + Jobstatus", "ASR, Sprache, Quellen, RAG", "Retention-Scheduler"]):
        d.node(x, 469, w, 65, title, body)
    d.arrow(M+129, 501, M+141, 501)
    # Beat publishes to the queue, rather than directly invoking a worker.
    d.line(M+428, 469, M+428, 453, PURPLE, dashed=True)
    d.line(M+428, 453, M+64, 453, PURPLE, dashed=True)
    d.text("Zeitplan zur Queue", M+286, 439, 7.4, 120, MUTED)
    # Explicit branches avoid an arrow ending in the gap between the stores.
    d.line(M+241, 534, M+241, 552, PURPLE)
    d.line(M+128, 552, M+384, 552, PURPLE)
    d.arrow(M+128, 552, M+128, 570)
    d.arrow(M+384, 552, M+384, 570)

    dw=(CW-12)/2
    d.node(M, 572, dw, 82, "PostgreSQL + pgvector", "Quellen-Chunks + Embeddings;<br/>persistente Review-/Progress-API")
    d.node(M+dw+12, 572, dw, 82, "SeaweedFS / S3", "Quellen und temporäre Analyse-Uploads;<br/>kein Wiedergabevideo-Dienst")

    d.box(M, 677, CW, 65, PALE)
    d.text("CLOUD-VERBINDUNGEN", M+14, 688, 8.3, CW-28, PURPLE, "Bold")
    d.text("Gemini: Quellenurteile. ElevenLabs: konfigurierter Sprachdialog, direkt aus dem Browser per Signed WebSocket. Deepgram EU: optionales Live-Transkript. Websuche: optional.", M+14, 707, 9.1, CW-28, MUTED, max_h=29)
    d.text("Betrieb lokal mit Docker Compose. Diagramm vereinfacht. Web-Review aktuell lokal; die persistente Take-/Progress-API ist ein separater Backend-Pfad. Quelle: compose.yaml, docs/03-architecture.md und transport.ts. Stand: 25.10.2026.", M, 758, 7.9, CW, MUTED, leading=10.5, max_h=32)

    d.page_start("02 / Analyse & Zeitachse")
    d.title("Von Eingaben zu Evidenz", "Zwei Pipelines.<br/>Eine Zeitachse.",
            "Signale, Wörter und Quellenurteile behalten ihren Ursprung. Der Review verbindet sie mit dem Aufnahmevideo, statt separate Clips zu erzeugen.")
    gap=19
    bw=(CW-gap)/2
    d.tag("A / MATERIAL & QUELLEN", M, 239, bw)
    d.tag("B / AUFNAHME & SPRACHE", M+bw+gap, 239, bw)
    left=[
        ("1 / Material einlesen", "PDF, PPTX, DOCX, TXT, MD;<br/>Chunks mit Quelle und Seite/Folie."),
        ("2 / Lokal suchen", "Jina-Embeddings über FastEmbed/ONNX;<br/>Hybrid-Suche: pgvector + Volltext."),
        ("3 / Aussagen prüfen", "Gemini extrahiert Aussagen; Retrieval<br/>liefert passende Quellenauszüge."),
        ("4 / Belege kontrollieren", "Code prüft Zitat und Zahlen. Gestützt,<br/>widersprochen oder nicht gefunden."),
    ]
    right=[
        ("1 / Live erfassen", "Pose-Regeln im Browser; PCM zum Server.<br/>Live-Pausen zusätzlich im Browser."),
        ("2 / Nach Stop analysieren", "Temporärer Upload; FFmpeg, RMS,<br/>YIN-Pitch und Silero-Sprachaktivität."),
        ("3 / Wörter transkribieren", "Lokales faster-whisper mit Zeitmarken.<br/>Finale Deepgram-Wörter wiederverwendbar."),
        ("4 / Sprechmerkmale ableiten", "Wort-Tempo, Pausen und Füllwörter;<br/>Zusammenführung mit Signal-Events."),
    ]
    for x, nodes in [(M,left),(M+bw+gap,right)]:
        for i,(title,body) in enumerate(nodes):
            y=277+i*77
            d.node(x, y, bw, 63, title, body)
            if i<3:
                d.arrow(x+bw/2, y+63, x+bw/2, y+77)
    d.line(M+bw/2, 571, M+bw/2, 587, PURPLE)
    d.line(M+bw+gap+bw/2, 571, M+bw+gap+bw/2, 587, PURPLE)
    d.line(M+bw/2, 587, M+bw+gap+bw/2, 587, PURPLE)
    d.arrow(W/2, 587, W/2, 605)

    d.box(M, 606, CW, 101, DARK)
    d.text("GEMEINSAMER EVENT-VERTRAG", M+16, 620, 9.1, CW-32, "BCA6F0", "Bold")
    d.text("t_ms = relativ zum Aufnahmestart  /  peak_ms = Sprungziel", M+16, 644, 11, CW-32, WHITE, "Bold")
    d.text("Typ, Dauer, Quelle, Schweregrad und Payload halten Evidenz fest. MediaRecorder.onstart verankert die Browserzeit; das Review springt über video.currentTime.", M+16, 671, 9.2, CW-32, "D9CEE8", max_h=29)
    d.text("Beispiel zur Einordnung: Eine nicht gefundene Aussage ist nicht automatisch falsch. Ein geprüftes Zitat belegt die Fundstelle, aber garantiert keine korrekte Modellinterpretation. Live-Captions sind separat von der vollständigen Analyse.", M, 728, 9.3, CW, MUTED, max_h=43)

    d.page_start("03 / Entscheidungen & Grenzen")
    d.title("Technik mit klarer Verantwortung", "Was bleibt wo?<br/>Was ist schon verbunden?", "Bewusst getrennte Speicher und austauschbare Anbieter halten den Demo-Pfad verständlich. Bestehende Erweiterungen werden nicht als fertiger End-to-End-Pfad verkauft.")

    half=(CW-15)/2
    d.node(M, 240, half, 113, "Im Web angebunden", "Aufnahme → /speech/analyze → Job-Polling;<br/>Quellen und Fact-Check; lokaler Review;<br/>konfigurierter ElevenLabs-Dialog.<br/>Video, Analyse und Gespräch in IndexedDB.", PALE)
    d.node(M+half+15, 240, half, 113, "Backend-Erweiterung vorhanden", "Sessions/Takes/Reviews in Postgres;<br/>Progress-Profile und Metriken.<br/>Live-Takes sind noch nicht an diesen<br/>Persistenz-/Progress-Pfad angebunden.", PALE)

    d.text("Vier Architekturentscheidungen", M, 377, 13, CW, INK, "Bold")
    decisions=[
        ("Lokal rechnen", "MediaPipe im Browser und Whisper/Embeddings lokal. Cloud wird für Quellenurteile bzw. den konfigurierten Sprachdialog eingesetzt."),
        ("Arbeit entkoppeln", "Lange Analysen laufen in Celery. Die API liefert eine Job-ID; der Browser fragt den Status ab. Redis transportiert keine Medien."),
        ("Belege prüfen", "Schemas, Zitat- und Zahlenprüfungen begrenzen Modellantworten. Das ist kein vollständiger Schutz vor Prompt Injection oder Fehlurteilen."),
        ("Ausfälle erklären", "Kamera-/Sprachreview nutzt feste Texte aus gemessenen Events. Fehlende Quellenurteile oder Fragen werden bei Modellfehlern nicht erfunden."),
    ]
    for i,(title,body) in enumerate(decisions):
        y=407+i*49
        d.text(title, M, y, 10, 123, PURPLE, "Bold")
        d.text(body, M+132, y, 9.15, CW-132, MUTED, max_h=40)
        if i<3:
            d.line(M, y+43, W-M, y+43)

    d.box(M, 616, CW, 90, DARK)
    d.text("DATEN & DATENSCHUTZ", M+15, 628, 8.5, CW-30, "BCA6F0", "Bold")
    d.text("Die Wiedergabekopie liegt lokal. Für die Analyse wird die vollständige Aufnahme temporär hochgeladen und danach gelöscht, auch bei Analysefehlern. Quellen und Legacy-Ergebnisse haben noch offene Cleanup-Aufgaben. Lokales Löschen entfernt keine separaten Backend-Daten.", M+15, 648, 9.1, CW-30, WHITE, max_h=43)
    d.text("Nur synthetische Demo-Inhalte an Cloud-KI; Einwilligung vor Aufnahme. Gemini ohne EU-Region-Pinning. ElevenLabs-Sprachreaktionen sind nicht zitateverifiziert. Deepgram ist Opt-in. Keine Genauigkeits- oder Lernwirksamkeitszusage.", M, 720, 8.8, CW, MUTED, max_h=39)
    d.text('Technische Basis: AGENTS.md; compose.yaml; docs/03-architecture.md; docs/07-review-and-agent.md; docs/14-open-todos.md; docs/15-grounding-hardening.md. Repository: <link href="https://github.com/johannes3502/hackathon-fulda" color="#3803BF">github.com/johannes3502/hackathon-fulda</link>. Stand 25.10.2026.', M, 765, 7.6, CW, MUTED, leading=10, max_h=25)
    d.save()


if __name__ == "__main__":
    features()
    architecture()

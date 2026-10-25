// 418 Pitch Practice — kompaktes 3+2-Minuten-Deck (7 Folien, 16:9)
// Inhaltlicher Rahmen: Pitch-Practice-o.1.pptx. Gestaltung: 418-Brand.
const path = require("path");
const R = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const pptxgen = require("pptxgenjs");
const Fi = require("react-icons/fi");

const OUT = process.env.PITCH_OUT || path.join(__dirname, "Pitch-Practice-o.2.pptx");
const LOGO = path.join(__dirname, "assets", "418-mark-round.png");
const SHOT = path.join(__dirname, "assets", "review-timeline.png");

const BRAND = "3803BF";
const INK = "17111F";
const MUTED = "6B6577";
const TINT = "F4F0FC";
const TINT2 = "E7DEF8";
const DARK_BG = "120A20";
const DARK_CARD = "221040";
const DARK_LINE = "3A2560";
const LIGHTV = "CBB6F6";
const DIM = "9A8EC0";
const WHITE = "FFFFFF";
const SOFT = "D8CFF0";
const FONT = "Aptos";

async function renderIcon(name, hex, px = 256, stroke = 1.7) {
  const Icon = Fi[name];
  if (!Icon) throw new Error("Icon fehlt: " + name);
  const svg = ReactDOMServer.renderToStaticMarkup(
    R.createElement(Icon, { color: "#" + hex, size: px, strokeWidth: stroke })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const ICONS = {};
async function preloadIcons() {
  const names = [
    "FiMessageSquare", "FiMapPin", "FiFileText", "FiHelpCircle",
    "FiLayers", "FiActivity", "FiPlay",
    "FiMic", "FiSearch",
    "FiEye", "FiBookOpen", "FiCpu", "FiMessageCircle",
    "FiCode", "FiTarget",
  ];
  for (const name of names) ICONS[name] = await renderIcon(name, BRAND);
}
const ic = (name) => {
  if (!ICONS[name]) throw new Error("Icon nicht vorgerendert: " + name);
  return ICONS[name];
};

async function main() {
  await preloadIcons();

  const pres = new pptxgen();
  pres.defineLayout({ name: "W1333", width: 13.333, height: 7.5 });
  pres.layout = "W1333";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = "Pitch Practice — Der Live-Präsentationstrainer";
  pres.subject = "8. Hackathon Fulda 2026 — Future Education";
  pres.author = "Team 418";
  pres.company = "418 presentation studio";

  function txt(s, text, o) {
    s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontFace: FONT, color: INK }, o));
  }
  function card(s, x, y, w, h, fill, radius = 0.14) {
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: radius,
    });
  }
  function outlineCard(s, x, y, w, h, color = DARK_LINE) {
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: DARK_BG }, line: { color, width: 1 }, rectRadius: 0.14,
    });
  }
  function iconCircle(s, uri, x, y, d, bg = TINT2) {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
    const pad = d * 0.26;
    s.addImage({ data: uri, x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
  }
  function footer(s, n, dark = false) {
    txt(s, "418 pitch practice", { x: 0.62, y: 7.08, w: 4, h: 0.24, fontSize: 9, color: dark ? DIM : MUTED });
    txt(s, n + " / 7", { x: 11.7, y: 7.08, w: 1.0, h: 0.24, fontSize: 9, color: dark ? DIM : MUTED, align: "right" });
  }
  function eyebrow(s, text, y = 0.5, color = LIGHTV) {
    txt(s, text, { x: 0.62, y, w: 8, h: 0.28, fontSize: 11, bold: true, color, charSpacing: 2 });
  }

  // 1 — Titel / Hook
  {
    const s = pres.addSlide();
    s.background = { color: DARK_BG };
    s.addImage({ path: LOGO, x: 0.9, y: 0.5, w: 0.95, h: 0.95, altText: "418 Pitch Practice Logo" });
    txt(s, "8. HACKATHON FULDA · FUTURE EDUCATION", {
      x: 1.95, y: 0.72, w: 8.5, h: 0.3, fontSize: 11, bold: true, color: LIGHTV, charSpacing: 2,
    });
    txt(s, "Pitch Practice", { x: 0.9, y: 1.5, w: 11.6, h: 0.95, fontSize: 54, bold: true, color: WHITE });
    txt(s, "Der Live-Präsentationstrainer", { x: 0.9, y: 2.48, w: 11.6, h: 0.5, fontSize: 24, color: LIGHTV });
    txt(s, "Auftritt, Stimme und Inhalt — eine Timeline, ein Klick zur Stelle.", {
      x: 0.9, y: 3.12, w: 11.4, h: 0.45, fontSize: 17, color: SOFT,
    });

    card(s, 0.9, 4.05, 7.32, 2.25, DARK_CARD);
    txt(s, "40,2 %", { x: 1.2, y: 4.24, w: 3.1, h: 0.95, fontSize: 56, bold: true, color: WHITE });
    txt(s, "der 8- bis 18-Jährigen in UK sind sicher, vor Publikum zu sprechen.", {
      x: 4.38, y: 4.36, w: 3.55, h: 1.05, fontSize: 15.5, color: WHITE, valign: "top",
    });
    txt(s, "National Literacy Trust, 2025 · UK · n = 105.583 · Selbsteinschätzung", {
      x: 4.38, y: 5.52, w: 3.55, h: 0.52, fontSize: 9.5, color: DIM, valign: "top",
    });

    outlineCard(s, 8.56, 4.05, 3.87, 2.25);
    txt(s, "Übe den Vortrag,", { x: 8.92, y: 4.35, w: 3.2, h: 0.45, fontSize: 22, bold: true, color: WHITE });
    txt(s, "nicht die Folien.", { x: 8.92, y: 4.78, w: 3.2, h: 0.45, fontSize: 22, bold: true, color: WHITE });
    txt(s, "Team 418 · 24.–25.10.2026", { x: 8.92, y: 5.66, w: 3.2, h: 0.3, fontSize: 10.5, color: DIM });

    footer(s, 1, true);
    s.addNotes("0:00–0:15 · Hook. „Nur 40,2 Prozent der 8- bis 18-Jährigen in UK sind sicher, vor Publikum zu sprechen. Das ist eine Selbsteinschätzung, keine Diagnose — aber es zeigt: Präsentieren muss man üben. Wir zeigen in drei Minuten, wie Feedback an der richtigen Stelle sitzt.“ Quelle: National Literacy Trust, Children and young people's speaking and listening in 2025, https://literacytrust.org.uk/research-services/research-reports/children-and-young-peoples-speaking-and-listening-in-2025/ — im Original: 40.2 % are confident speaking in front of an audience.");
  }

  // 2 — Problem
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    txt(s, "Warum Üben allein nicht reicht", { x: 0.62, y: 0.5, w: 12.1, h: 0.7, fontSize: 36, bold: true });
    txt(s, "Vier Lücken, die eine freundliche Übungsrunde nicht schließt.", {
      x: 0.62, y: 1.22, w: 12.1, h: 0.35, fontSize: 14, color: MUTED,
    });

    const items = [
      { icon: "FiMessageSquare", h: "Feedback ist höflich", d: "Die eigene Runde nickt. Konkrete, unbequeme Hinweise bleiben aus." },
      { icon: "FiMapPin", h: "Kritik hängt an keiner Minute", d: "„Wirke nervöser“ hilft nicht, wenn niemand sagt, an welcher Minute es auffiel." },
      { icon: "FiFileText", h: "Quellen prüft niemand", d: "Niemand gleicht die Aussagen mit den eigenen Folien und Unterlagen ab." },
      { icon: "FiHelpCircle", h: "Rückfragen kommen zu spät", d: "Unter Druck antworten übt man erst in der Prüfung — dann ist es zu spät." },
    ];
    const W = 5.95, H = 1.95, GX = 0.3, GY = 0.26, X0 = 0.62, Y0 = 1.9;
    items.forEach((c, i) => {
      const x = X0 + (i % 2) * (W + GX);
      const y = Y0 + Math.floor(i / 2) * (H + GY);
      card(s, x, y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.3, y + 0.3, 0.5);
      txt(s, c.h, { x: x + 1.0, y: y + 0.33, w: W - 1.28, h: 0.36, fontSize: 15.5, bold: true });
      txt(s, c.d, { x: x + 1.0, y: y + 0.8, w: W - 1.3, h: 0.9, fontSize: 12.5, color: MUTED, valign: "top" });
    });
    txt(s, "Der Prototyp schließt alle vier — in einer Aufnahme.", {
      x: 0.62, y: 6.35, w: 12.1, h: 0.4, fontSize: 15, bold: true, color: BRAND,
    });

    footer(s, 2);
    s.addNotes("0:15–0:30 · Problem. „Die eigene Runde nickt. Kritik hängt an keiner Minute. Quellen prüft niemand. Rückfragen kommen erst in der Prüfung. Genau diese vier Lücken schließt Pitch Practice.“");
  }

  // 3 — Lösung
  {
    const s = pres.addSlide();
    s.background = { color: DARK_BG };
    eyebrow(s, "DIE LÖSUNG");
    txt(s, "Ein Trainer. Eine Timeline. Drei Ebenen.", {
      x: 0.62, y: 0.88, w: 12.1, h: 0.7, fontSize: 34, bold: true, color: WHITE,
    });

    const rows = [
      { label: "INHALT", icon: "FiLayers", h: "Quellencheck + Fragebot", d: "Aussagen zitiergenau prüfen, danach gezielt nachfragen." },
      { label: "AUFTRITT", icon: "FiActivity", h: "Pose, Gestik, Stimme", d: "Live im Browser; Heuristiken sind als solche markiert." },
      { label: "REVIEW", icon: "FiPlay", h: "Eine Timeline", d: "Jeder Fund springt zur Stelle im lokalen Video." },
    ];
    rows.forEach((r, i) => {
      const y = 1.95 + i * 1.3;
      iconCircle(s, ic(r.icon), 0.62, y + 0.05, 0.46);
      txt(s, r.label, { x: 1.25, y: y - 0.02, w: 4.9, h: 0.24, fontSize: 10, bold: true, color: LIGHTV, charSpacing: 1.8 });
      txt(s, r.h, { x: 1.25, y: y + 0.22, w: 4.95, h: 0.34, fontSize: 16, bold: true, color: WHITE });
      txt(s, r.d, { x: 1.25, y: y + 0.6, w: 4.95, h: 0.52, fontSize: 12.5, color: SOFT, valign: "top" });
    });
    txt(s, "Eine Zeitachse für Haltung, Stimme, Transkript, Quellen und Fragen.", {
      x: 0.62, y: 6.0, w: 5.75, h: 0.5, fontSize: 11.5, color: DIM,
    });

    card(s, 6.5, 1.55, 6.3, 2.75, DARK_CARD, 0.16);
    s.addImage({
      path: SHOT, x: 6.62, y: 1.67, w: 6.06, h: 2.31,
      altText: "Beispielansicht des Reviews: Timeline mit Markern und Momentenliste, synthetische Daten.",
    });
    txt(s, "Beispielansicht · synthetische Daten · Timeline und Momente", {
      x: 6.62, y: 4.4, w: 6.06, h: 0.28, fontSize: 10.5, color: DIM,
    });
    txt(s, "Ein Klick springt zur Stelle. Eine Quelle prüft den Satz. Eine Frage hakt nach.", {
      x: 6.62, y: 4.9, w: 6.06, h: 0.95, fontSize: 18, italic: true, color: LIGHTV, valign: "top",
    });

    footer(s, 3, true);
    s.addNotes("0:30–0:45 · Lösung. „Ein Trainer im Browser: Pose, Gestik und Stimme live und lokal. Transkript und Quellencheck. Alles auf einer Timeline — ein Klick springt zur Stelle. Danach fragt der Agent nach.“");
  }

  // 4 — Live-Demo
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    txt(s, "Live-Demo", { x: 0.62, y: 0.5, w: 9.5, h: 0.8, fontSize: 40, bold: true });
    txt(s, "Unser eigener Pitch als Testfall — 60 Sekunden, dann springen wir ins Review.", {
      x: 0.62, y: 1.28, w: 11.2, h: 0.4, fontSize: 16, color: MUTED,
    });
    s.addText("LIVE", {
      shape: pres.ShapeType.roundRect, rectRadius: 0.18, fill: { color: BRAND }, line: { type: "none" },
      x: 11.62, y: 0.68, w: 1.08, h: 0.38, fontSize: 10, bold: true, color: WHITE,
      fontFace: FONT, align: "center", margin: 0, charSpacing: 1.5,
    });

    const steps = [
      { n: "01", icon: "FiMic", h: "Aufnahme", d: "Kamera und Mikro laufen. Wir sprechen 60 Sekunden über genau diese Folie." },
      { n: "02", icon: "FiPlay", h: "Review", d: "Eine Stelle öffnen, zur Sekunde springen, die drei Kriterien lesen: Gestik, Fachwissen, Flow." },
      { n: "03", icon: "FiSearch", h: "Quellencheck + Frage", d: "Eine Aussage gegen die Quelle prüfen, eine Rückfrage beantworten." },
    ];
    const W = 3.85, H = 3.35, G = 0.3, X0 = 0.62, Y = 2.0;
    steps.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      txt(s, c.n, { x: x + 0.3, y: Y + 0.24, w: 1.0, h: 0.5, fontSize: 28, bold: true, color: BRAND });
      iconCircle(s, ic(c.icon), x + 0.3, Y + 0.86, 0.5);
      txt(s, c.h, { x: x + 0.3, y: Y + 1.56, w: W - 0.6, h: 0.4, fontSize: 17, bold: true });
      txt(s, c.d, { x: x + 0.3, y: Y + 2.02, w: W - 0.62, h: 1.1, fontSize: 12.5, color: MUTED, valign: "top" });
    });

    card(s, 0.62, 5.65, 12.1, 0.95, INK, 0.14);
    txt(s, "Die Demo ist der Pitch: eine Aufnahme, ein Review, eine Rückfrage.   ·   Kein Login. Keine Server-Clips.", {
      x: 1.0, y: 5.9, w: 11.35, h: 0.45, fontSize: 15, color: WHITE,
    });

    footer(s, 4);
    s.addNotes("0:45–2:45 · Live-Demo. Aufnahme starten (60 s), stoppen, ins Review. Eine Stelle öffnen, zur Sekunde springen, drei Kriterien zeigen. Dann eine Aussage gegen die Quelle prüfen und eine Rückfrage beantworten. Fallback: vorbereiteten Take öffnen und klar sagen: „Das ist ein vorbereiteter Take.“ Nicht als live ausgeben. Wenn die Zeit knapp wird: Quellencheck und Fragebot auf je eine Aktion kürzen. 2:45–3:00 · Übergang: „Das war das Produkt. Jetzt zwei Minuten darüber, wie KI im Produkt und in der Entwicklung geholfen hat.“");
  }

  // 5 — KI im Produkt
  {
    const s = pres.addSlide();
    s.background = { color: DARK_BG };
    eyebrow(s, "AI-REFLECTION · 1/2");
    txt(s, "KI im Produkt: fünf Rollen, ein Prinzip", {
      x: 0.62, y: 0.88, w: 12.1, h: 0.7, fontSize: 34, bold: true, color: WHITE,
    });

    const roles = [
      { icon: "FiEye", h: "Pose & Gestik", tool: "MediaPipe", d: "Landmarks im Browser; Regeln auf Winkeln und Kopflage." },
      { icon: "FiMic", h: "Transkript", tool: "Whisper · Deepgram", d: "Wort-Timestamps; lokal oder als EU-Stream." },
      { icon: "FiBookOpen", h: "Quellen", tool: "Embeddings", d: "Hybrid-Suche in PDF, PPTX, DOCX." },
      { icon: "FiCpu", h: "Urteil", tool: "Gemini", d: "Aussagen extrahieren, Zitat vorgeben, Unsicherheit benennen." },
      { icon: "FiMessageCircle", h: "Dialog", tool: "ElevenLabs", d: "Frage vorlesen, Antwort aufnehmen, gegen Quelle prüfen." },
    ];
    const W = 2.25, H = 2.85, G = 0.235, X0 = 0.62, Y = 1.95;
    roles.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, DARK_CARD);
      iconCircle(s, ic(c.icon), x + 0.26, Y + 0.27, 0.5);
      txt(s, c.h, { x: x + 0.26, y: Y + 0.93, w: W - 0.46, h: 0.35, fontSize: 13.5, bold: true, color: WHITE });
      txt(s, c.tool, { x: x + 0.26, y: Y + 1.3, w: W - 0.46, h: 0.28, fontSize: 10.5, bold: true, color: LIGHTV });
      txt(s, c.d, { x: x + 0.26, y: Y + 1.66, w: W - 0.46, h: 1.0, fontSize: 11, color: SOFT, valign: "top" });
    });

    card(s, 0.62, 5.2, 12.1, 1.4, DARK_CARD);
    txt(s, "DAS PRINZIP", { x: 0.95, y: 5.4, w: 3, h: 0.25, fontSize: 10, bold: true, color: LIGHTV, charSpacing: 1.5 });
    txt(s, "Inhaltliche KI-Ausgaben werden geprüft: Zitat-Match, Zahlen-Gate, offene Unsicherheit. Ohne Evidenz bleibt der Score offen — keine Note, keine Emotionsanalyse.", {
      x: 0.95, y: 5.68, w: 11.4, h: 0.7, fontSize: 15, color: WHITE, valign: "top",
    });

    footer(s, 5, true);
    s.addNotes("3:00–3:40 · AI-Reflection 1/2. „KI steckt an fünf Stellen im Produkt: MediaPipe für Pose und Hände, Whisper oder Deepgram für das Transkript, Embeddings für die Quellen, Gemini für Urteil und Fragen, ElevenLabs für den gesprochenen Dialog. Deepgram und ElevenLabs sind optional. Das Prinzip: Inhaltliche Ausgaben werden geprüft — Zitat-Match, Zahlen-Gate, offene Unsicherheit. Ohne Evidenz bleibt der Score offen. Keine Note, keine Emotionsanalyse.“");
  }

  // 6 — KI in der Entwicklung
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    eyebrow(s, "AI-REFLECTION · 2/2", 0.5, BRAND);
    txt(s, "KI in der Entwicklung: schnell, aber nicht blind", {
      x: 0.62, y: 0.88, w: 12.1, h: 0.7, fontSize: 34, bold: true,
    });

    const work = [
      { icon: "FiSearch", h: "Recherche", d: "Technik, Anbieter, Quellen. Zahlen werden nachgeprüft, nicht übernommen." },
      { icon: "FiCode", h: "Coding", d: "Codex und Claude Code: Architektur, Pipelines, Tests. Entscheidungen bleiben beim Team." },
      { icon: "FiTarget", h: "Deep Testing", d: "418 Backend-, 298 Frontend-Tests, 130 Browser-Fälle. Fehler mit Logs jagen." },
    ];
    const W = 3.85, H = 2.7, G = 0.3, X0 = 0.62, Y = 1.85;
    work.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.3, Y + 0.28, 0.5);
      txt(s, c.h, { x: x + 0.3, y: Y + 0.95, w: W - 0.6, h: 0.35, fontSize: 15.5, bold: true });
      txt(s, c.d, { x: x + 0.3, y: Y + 1.36, w: W - 0.62, h: 1.15, fontSize: 12.5, color: MUTED, valign: "top" });
    });

    card(s, 0.62, 4.8, 12.1, 1.85, TINT);
    txt(s, "Was schiefging → was wir daraus machten", {
      x: 0.95, y: 4.98, w: 9, h: 0.3, fontSize: 12.5, bold: true, color: BRAND,
    });
    s.addText([
      { text: "Docker-Tag 4.49 gab es nicht", options: { bold: true, color: INK } },
      { text: "  →  Verfügbarkeit geprüft, auf 4.48 korrigiert.", options: { color: MUTED } },
    ], { isTextBox: true, margin: 0, fontFace: FONT, x: 0.95, y: 5.36, w: 11.45, h: 0.3, fontSize: 12 });
    s.addText([
      { text: "Gültiges Zitat, falsches Urteil", options: { bold: true, color: INK } },
      { text: "  →  Prompt getrennt, Code-Gates ergänzt.", options: { color: MUTED } },
    ], { isTextBox: true, margin: 0, fontFace: FONT, x: 0.95, y: 5.74, w: 11.45, h: 0.3, fontSize: 12 });
    txt(s, "Gültiges JSON und gültiges Zitat beweisen kein richtiges Urteil.", {
      x: 0.95, y: 6.16, w: 11.45, h: 0.32, fontSize: 13, bold: true, italic: true, color: BRAND,
    });

    footer(s, 6);
    s.addNotes("3:40–4:45 · AI-Reflection 2/2. „In der Entwicklung hat KI uns bei Recherche, Code und Tests beschleunigt: Codex und Claude Code für Architektur, Pipelines und Testentwürfe; dazu 418 Backend-, 298 Frontend-Tests und 130 Browser-Fälle. Aber sie lag auch falsch: Ein vorgeschlagener Docker-Tag existierte nicht — wir haben die Verfügbarkeit geprüft und korrigiert. Und ein gültiges Zitat führte zu einem falschen Urteil — seitdem sind Prompt und Code-Gates getrennt. Gültiges JSON und gültiges Zitat beweisen kein richtiges Urteil.“");
  }

  // 7 — Schluss
  {
    const s = pres.addSlide();
    s.background = { color: DARK_BG };
    s.addImage({ path: LOGO, x: 6.667 - 0.525, y: 0.62, w: 1.05, h: 1.05, altText: "418 Pitch Practice Logo" });
    txt(s, "418 PITCH PRACTICE", { x: 0.5, y: 1.85, w: 12.333, h: 0.3, fontSize: 11, bold: true, color: LIGHTV, charSpacing: 2, align: "center" });

    const chain = ["Satz", "Quelle", "Sekunde", "Frage"];
    const CW = 2.35, CH = 0.78, CG = 0.45, CX0 = (13.333 - (4 * CW + 3 * CG)) / 2;
    chain.forEach((t, i) => {
      const x = CX0 + i * (CW + CG);
      s.addText(t, {
        shape: pres.ShapeType.roundRect, rectRadius: 0.2, fill: { color: DARK_CARD }, line: { type: "none" },
        x, y: 2.65, w: CW, h: CH, fontSize: 18, bold: true, color: WHITE,
        fontFace: FONT, align: "center", margin: 0,
      });
      if (i < chain.length - 1) {
        txt(s, "→", { x: x + CW + 0.04, y: 2.76, w: CG - 0.08, h: 0.56, fontSize: 22, bold: true, color: LIGHTV, align: "center" });
      }
    });

    txt(s, "Danke. Fragen?", { x: 0.5, y: 4.15, w: 12.333, h: 0.8, fontSize: 40, bold: true, color: WHITE, align: "center" });
    txt(s, "Prototyp läuft lokal, ohne Login. Live-Demo willkommen.", {
      x: 0.5, y: 5.1, w: 12.333, h: 0.4, fontSize: 16, color: LIGHTV, align: "center",
    });
    txt(s, "Team 418 · 8. Hackathon Fulda · Future Education 2026", {
      x: 0.5, y: 6.62, w: 12.333, h: 0.3, fontSize: 12, color: DIM, align: "center",
    });

    footer(s, 7, true);
    s.addNotes("4:45–5:00 · Schluss. „Satz, Quelle, Sekunde, Frage: Das ist der Loop, den wir zeigen wollten. Der Prototyp läuft lokal, ohne Login. Danke — Fragen?“");
  }

  await pres.writeFile({ fileName: OUT });
  console.log("geschrieben:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

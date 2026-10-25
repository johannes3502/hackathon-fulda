// Pitch Practice — Hackathon Fulda 2026 Pitch Deck (14 Folien, 16:9, Open Sans, Violett #3803BF)
const path = require("path");
const fs = require("node:fs/promises");
const JSZip = require("jszip");
const R = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const pptxgen = require("pptxgenjs");
const Fi = require("react-icons/fi");

// The deck uses explicit fonts and colors on every slide. Theme metadata is
// optional, so the generator stays self-contained (no external skill path).
const OUT = path.join(__dirname, "PitchPractice-Pitch.pptx");
const LOGO = path.join(__dirname, "..", "frontend", "public", "brand", "418-pitch-practice.png");

// ---------- Palette ----------
const BRAND = "3803BF";      // Akzentviolett
const INK = "17111F";        // dunkler Text
const MUTED = "6B6577";      // Grautext
const TINT = "F4F0FC";       // helle Violett-Tönung (Karten)
const TINT2 = "E7DEF8";      // kräftigere Tönung (Icon-Kreise)
const DARK_BG = "150826";    // tiefes Violett-Schwarz
const DARK_CARD = "221040";  // Karten auf Dunkel
const LIGHTV = "CBB6F6";     // helles Violett auf Dunkel
const DIM = "8E82B8";        // gedämpft auf Dunkel
const WHITE = "FFFFFF";
const FONT = "Open Sans";
const MONO = "Courier New";

// ---------- Icons ----------
async function renderIcon(name, hex, px = 256, stroke = 1.75) {
  const Icon = Fi[name];
  if (!Icon) throw new Error("Icon fehlt: " + name);
  const svg = ReactDOMServer.renderToStaticMarkup(
    R.createElement(Icon, { color: "#" + hex, size: px, strokeWidth: stroke })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const ICON_SPECS = [
  // [name, color]
  ["FiMessageSquare", BRAND], ["FiMapPin", BRAND], ["FiFileText", BRAND], ["FiUsers", BRAND],
  ["FiMic", BRAND], ["FiCpu", BRAND], ["FiPlay", BRAND],
  ["FiFastForward", BRAND], ["FiPauseCircle", BRAND], ["FiMessageCircle", BRAND],
  ["FiVolume2", BRAND], ["FiActivity", BRAND],
  ["FiMousePointer", BRAND], ["FiLock", BRAND], ["FiClock", BRAND],
  ["FiHelpCircle", BRAND], ["FiBookOpen", BRAND],
  ["FiVideo", BRAND], ["FiTrash2", BRAND], ["FiShield", BRAND],
  ["FiCheckCircle", BRAND], ["FiDatabase", BRAND], ["FiEyeOff", BRAND],
  ["FiCloud", BRAND],
];
const ICONS = {};
async function preloadIcons() {
  for (const [name, color] of ICON_SPECS) {
    const key = name + "_" + color;
    if (!ICONS[key]) ICONS[key] = await renderIcon(name, color);
  }
}
const ic = (name, color = BRAND) => {
  const key = name + "_" + color;
  if (!ICONS[key]) throw new Error("Icon nicht vorgerendert: " + key);
  return ICONS[key];
};

async function main() {
  await preloadIcons();
  // ---------- Deck ----------
  const pres = new pptxgen();
  pres.defineLayout({ name: "W1333", width: 13.333, height: 7.5 });
  pres.layout = "W1333";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = "Pitch Practice — Live-Präsentationstrainer";
  pres.subject = "8. Hackathon Fulda 2026 — Future Education";
  pres.author = "Team 418";
  pres.company = "418 presentation studio";

  pres.defineSlideMaster({
    title: "DARK",
    masterName: "DARK",
    background: { color: DARK_BG },
  });
  pres.defineSlideMaster({
    title: "LIGHT",
    masterName: "LIGHT",
    background: { color: WHITE },
    objects: [
      { text: { text: "418 presentation studio", options: { x: 0.62, y: 7.05, w: 3.6, h: 0.3, fontSize: 9, color: MUTED, fontFace: FONT, margin: 0, isTextBox: true } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.62, y: 0.44, w: 12.1, h: 0.95, fontSize: 30, bold: true, color: INK, fontFace: FONT, margin: 0 } } },
    ],
    slideNumber: { x: 12.4, y: 7.05, w: 0.42, h: 0.3, fontSize: 10, color: MUTED, fontFace: FONT },
  });

  // ---------- Helpers ----------
  function txt(slide, text, o) {
    slide.addText(text, Object.assign({ isTextBox: true, margin: 0, fontFace: FONT, color: INK }, o));
  }
  function card(slide, x, y, w, h, fill, radius = 0.12) {
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: radius,
    });
  }
  function iconCircle(slide, uri, x, y, d, bg) {
    slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
    const pad = d * 0.27;
    slide.addImage({ data: uri, x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
  }
  function dotRow(slide, x, y, label, opts = {}) {
    slide.addShape(pres.ShapeType.ellipse, { x, y: y + 0.085, w: 0.11, h: 0.11, fill: { color: opts.dotColor || BRAND }, line: { type: "none" } });
    txt(slide, label, { x: x + 0.26, y, w: opts.w || 5.5, h: 0.34, fontSize: opts.fontSize || 14, color: opts.color || INK, bold: !!opts.bold });
  }
  function bullets(slide, items, o) {
    const runs = items.map((t, i) => ({
      text: t,
      options: { bullet: { code: "2022", indent: 12 }, breakLine: i < items.length - 1, paraSpaceAfter: o.paraSpaceAfter ?? 9 },
    }));
    slide.addText(runs, Object.assign({ isTextBox: true, margin: 0, fontFace: FONT, fontSize: 13.5, color: INK, valign: "top" }, o));
  }
  function logoCard(slide, cx, y, size) {
    const pad = 0.14;
    card(slide, cx - size / 2, y, size, size, WHITE, 0.16);
    slide.addImage({ path: LOGO, x: cx - size / 2 + pad, y: y + pad, w: size - 2 * pad, h: size - 2 * pad });
  }

  // ============================================================
  // Folie 1 — Titel (dunkel)
  // ============================================================
  pres.addSection({ title: "Auftakt" });
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Auftakt" });
    logoCard(s, 6.667, 0.85, 2.15);
    txt(s, "Pitch Practice", { x: 0.5, y: 3.35, w: 12.333, h: 1.0, fontSize: 54, bold: true, color: WHITE, align: "center" });
    txt(s, "Der Live-Präsentationstrainer", { x: 0.5, y: 4.42, w: 12.333, h: 0.5, fontSize: 22, color: LIGHTV, align: "center" });
    txt(s, "8. Hackathon Fulda · 24.–25.10.2026 · Future Education", { x: 0.5, y: 5.55, w: 12.333, h: 0.35, fontSize: 14, color: DIM, align: "center" });
    txt(s, "Team 418", { x: 0.5, y: 5.95, w: 12.333, h: 0.35, fontSize: 13, bold: true, color: LIGHTV, align: "center" });
    s.addNotes("Guten Morgen, wir sind Team 418. Wir bauen Pitch Practice: einen Live-Präsentationstrainer, der Auftritt und Sprache beim Üben analysiert und jedes Feedback an die konkrete Stelle im Vortrag heftet. In den nächsten drei Minuten zeigen wir das Produkt, danach nehmen wir uns zwei Minuten für unsere AI-Reflection.");
  }

  // ============================================================
  // Folie 2 — Problem (hell)
  // ============================================================
  pres.addSection({ title: "Problem & Lösung" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Problem & Lösung" });
    s.addText("Üben allein macht nicht besser", { placeholder: "title" });
    const cards = [
      { icon: "FiMessageSquare", h: "Ehrliches Feedback ist selten", d: "Die eigene Runde nickt freundlich — konkrete, unbequeme Hinweise bleiben aus." },
      { icon: "FiMapPin", h: "Feedback klebt nicht an der Stelle", d: "„Wirke nervös“ hilft wenig, wenn niemand sagt, an welcher Minute das auffiel." },
      { icon: "FiFileText", h: "Fakten prüfen ist Handarbeit", d: "Deckt sich der Vortrag überhaupt mit den eigenen Folien und Unterlagen?" },
      { icon: "FiUsers", h: "Prüfungssimulation fehlt", d: "Rückfragen unter Druck hört man meistens erst in der echten Prüfung." },
    ];
    const W = 6.0, H = 2.42, GX = 0.25, GY = 0.25, X0 = 0.62, Y0 = 1.62;
    cards.forEach((c, i) => {
      const x = X0 + (i % 2) * (W + GX), y = Y0 + Math.floor(i / 2) * (H + GY);
      card(s, x, y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.3, y + 0.32, 0.54, TINT2);
      txt(s, c.h, { x: x + 1.05, y: y + 0.34, w: W - 1.35, h: 0.4, fontSize: 15.5, bold: true });
      txt(s, c.d, { x: x + 1.05, y: y + 0.85, w: W - 1.4, h: 1.35, fontSize: 13, color: MUTED, valign: "top" });
    });
    s.addNotes("Präsentieren ist Schlüsselqualifikation — und trotzdem wird selten ehrlich geübt. Die Freundesrunde nickt, Feedback hängt nie an der konkreten Minute, Fakten gegen die eigenen Unterlagen zu prüfen ist mühsam, und eine Prüfungssimulation fehlt komplett. Genau diese vier Lücken greift unser Prototyp an.");
  }

  // ============================================================
  // Folie 3 — Lösung (dunkel, Statement)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Problem & Lösung" });
    txt(s, "DIE LÖSUNG", { x: 0.9, y: 0.8, w: 6, h: 0.35, fontSize: 13, bold: true, color: LIGHTV, charSpacing: 3 });
    s.addText([
      { text: "Ein Trainer im Browser: Er beobachtet Haltung, Gestik und Stimme ", options: { color: WHITE } },
      { text: "live und lokal", options: { color: LIGHTV, bold: true } },
      { text: ", transkribiert den Vortrag, prüft Aussagen ", options: { color: WHITE } },
      { text: "zitiergenau", options: { color: LIGHTV, bold: true } },
      { text: " gegen die eigenen Quellen — alles ", options: { color: WHITE } },
      { text: "timestamp-genau zurückspulbar", options: { color: LIGHTV, bold: true } },
      { text: ". Und ein Agent fragt danach wie eine Prüfungskommission.", options: { color: WHITE } },
    ], { isTextBox: true, margin: 0, x: 0.9, y: 1.45, w: 11.55, h: 3.6, fontSize: 28, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.18 });
    const steps = ["Aufnehmen", "Analysieren", "Zurückspulen", "Befragt werden"];
    const CW = 2.75, CG = 0.25, CX0 = (13.333 - (4 * CW + 3 * CG)) / 2;
    steps.forEach((t, i) => {
      const x = CX0 + i * (CW + CG);
      s.addText([
        { text: String(i + 1) + "  ", options: { color: LIGHTV, bold: true } },
        { text: t, options: { color: WHITE } },
      ], { shape: pres.ShapeType.roundRect, rectRadius: 0.31, fill: { color: DARK_CARD }, line: { type: "none" }, x, y: 5.75, w: CW, h: 0.62, fontSize: 14, fontFace: FONT, align: "center", margin: 0 });
    });
    s.addNotes("Unsere Lösung ist ein Trainer im Browser: Haltung, Gestik und Stimme werden live und lokal analysiert, der Vortrag wird transkribiert und Aussagen werden zitiergenau gegen die hochgeladenen Quellen geprüft. Alles landet timestamp-genau auf einer Timeline — und danach fragt ein Agent wie eine Prüfungskommission.");
  }

  // ============================================================
  // Folie 4 — Live-Demo (hell)
  // ============================================================
  pres.addSection({ title: "Demo" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Demo" });
    s.addText("Live-Demo", { placeholder: "title" });
    txt(s, "30–60 Sekunden Aufnahme — dann springen wir direkt ins Review.", { x: 0.62, y: 1.75, w: 12.1, h: 0.5, fontSize: 19, color: MUTED, align: "center" });
    const steps = [
      { icon: "FiMic", h: "Aufnahme", d: "Kamera und Mikro — dezente Live-Hinweise während des Vortrags" },
      { icon: "FiCpu", h: "Analyse", d: "Haltung, Stimme und Transkript laufen automatisch; Fact-Check auf Klick" },
      { icon: "FiPlay", h: "Review", d: "Momente auf der Timeline — ein Klick springt zur Stelle" },
    ];
    const W = 3.6, H = 2.5, G = 0.55, X0 = (13.333 - (3 * W + 2 * G)) / 2, Y = 3.1;
    steps.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.32, Y + 0.34, 0.56, TINT2);
      txt(s, c.h, { x: x + 0.32, y: Y + 1.06, w: W - 0.64, h: 0.42, fontSize: 17, bold: true });
      txt(s, c.d, { x: x + 0.32, y: Y + 1.5, w: W - 0.64, h: 0.9, fontSize: 12.5, color: MUTED, valign: "top" });
      if (i < 2) txt(s, "→", { x: x + W + 0.02, y: Y + H / 2 - 0.3, w: G - 0.04, h: 0.6, fontSize: 26, bold: true, color: BRAND, align: "center" });
    });
    txt(s, "Der Pitch lebt von der Vorführung — die nächsten Folien fassen zusammen, was im Hintergrund passiert.", { x: 0.62, y: 6.05, w: 12.1, h: 0.4, fontSize: 12.5, italic: true, color: MUTED, align: "center" });
    s.addNotes("Statt weitere Folien zu lesen, schalten wir live in den Prototyp: kurz aufnehmen, stoppen, ins Review springen. Sie sehen die Momente auf der Timeline und den Sprung zur Videostelle. Die nächsten Folien fassen zusammen, was dabei im Hintergrund passiert.");
  }

  // ============================================================
  // Folie 5 — Pose & Gestik (hell)
  // ============================================================
  pres.addSection({ title: "Features" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Features" });
    s.addText("Pose & Gestik — komplett im Browser", { placeholder: "title" });
    txt(s, "Sieben kalibrierte Beobachtungen", { x: 0.62, y: 1.68, w: 6.2, h: 0.4, fontSize: 14.5, bold: true, color: BRAND });
    const rules = ["Hand hoch", "Hände zusammen", "Arme verschränkt", "Seitliche Neigung", "Seitenposition", "Kopf abgewandt", "Kopf gesenkt"];
    rules.forEach((r, i) => dotRow(s, 0.68, 2.22 + i * 0.58, r, { fontSize: 14.5 }));
    const RX = 7.35, RW = 5.35, RY = 1.68, RH = 4.9;
    card(s, RX, RY, RW, RH, TINT);
    txt(s, "So bleibt es glaubwürdig", { x: RX + 0.4, y: RY + 0.38, w: RW - 0.8, h: 0.4, fontSize: 15.5, bold: true });
    bullets(s, [
      "Baseline: 3 s neutrale Haltung kalibrieren die Referenz",
      "2 s Mindestdauer pro Regel — kein Flackern",
      "Dezent: ein Live-Hinweis gleichzeitig, mit Cooldown, abschaltbar",
      "Kopforientierung als Proxy — wir behaupten keinen Blickkontakt",
    ], { x: RX + 0.4, y: RY + 0.95, w: RW - 0.75, h: RH - 1.3, fontSize: 13.5, paraSpaceAfter: 12 });
    s.addNotes("Das Pose-Tracking läuft komplett im Browser mit MediaPipe — die Frames verlassen das Gerät nicht. Sieben kalibrierte Beobachtungen, kalibriert gegen eine dreisekündige Baseline, mit zweisekündiger Mindestdauer gegen Flackern. Wichtig: Die Kopfrichtung ist ein Proxy — wir behaupten bewusst keinen Blickkontakt.");
  }

  // ============================================================
  // Folie 6 — Transkription + Fact-Check (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Features" });
    s.addText("Transkript & zitiergenauer Fact-Check", { placeholder: "title" });
    iconCircle(s, ic("FiMic"), 0.62, 1.62, 0.46, TINT2);
    txt(s, "Lokales faster-whisper: Deutsch, Wort-Timestamps — das Audio wird nach der Analyse gelöscht.", { x: 1.22, y: 1.68, w: 11.4, h: 0.36, fontSize: 13.5, color: INK });
    const steps = [
      { n: "1", h: "Aussagen erkennen", d: "Das LLM extrahiert prüfbare Aussagen — Timestamps kommen aus den Wörtern." },
      { n: "2", h: "Quellen durchsuchen", d: "Hybrid-Retrieval: pgvector + deutsche Volltextsuche in PDF, PPTX, DOCX." },
      { n: "3", h: "Urteil mit Zitat", d: "stützt · widerspricht · in den Quellen nicht gefunden." },
      { n: "4", h: "Code prüft das Zitat", d: "String-Match gegen den Chunk — erfundene Zitate werden verworfen." },
    ];
    const W = 2.9, H = 2.75, G = 0.24, X0 = 0.62, Y = 2.4;
    steps.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      s.addText(c.n, { shape: pres.ShapeType.ellipse, fill: { color: BRAND }, line: { type: "none" }, x: x + 0.3, y: Y + 0.3, w: 0.46, h: 0.46, fontSize: 17, bold: true, color: WHITE, align: "center", fontFace: FONT, margin: 0 });
      txt(s, c.h, { x: x + 0.3, y: Y + 0.95, w: W - 0.6, h: 0.42, fontSize: 14.5, bold: true });
      txt(s, c.d, { x: x + 0.3, y: Y + 1.42, w: W - 0.58, h: 1.2, fontSize: 12.5, color: MUTED, valign: "top" });
    });
    txt(s, "„Nicht gefunden“ ist nicht „falsch“.", { x: 0.62, y: 5.55, w: 12.1, h: 0.45, fontSize: 17, bold: true, color: BRAND, align: "center" });
    s.addNotes("Die Transkription läuft lokal mit faster-whisper, mit Wort-Timestamps. Die Aufnahme wird temporär zum lokalen Server hochgeladen und nach der Analyse gelöscht. Optionales Deepgram-Live-Streaming sendet Audio nach Einwilligung an Deepgram EU. Der Fact-Check läuft in vier Schritten: Aussagen extrahieren, Quellen per Hybrid-Suche durchsuchen, Urteil mit wörtlichem Zitat — und der Code prüft per String-Match, dass das Zitat wirklich in der Quelle steht. Und wichtig: „Nicht gefunden“ ist nicht „falsch“.");
  }

  // ============================================================
  // Folie 7 — Sprechmerkmale (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Features" });
    s.addText("Stimme: fünf Merkmale, live", { placeholder: "title" });
    const feats = [
      { icon: "FiFastForward", h: "Tempo", d: "Silbenrate relativ zur eigenen Referenz" },
      { icon: "FiPauseCircle", h: "Pausen", d: "Sprachpausen aus VAD und Wörtern" },
      { icon: "FiMessageCircle", h: "Füllwörter", d: "„äh“, „hm“ — aus dem Transkript" },
      { icon: "FiVolume2", h: "Lautstärke", d: "zu leise / zu laut, nur stimmhafte Frames" },
      { icon: "FiActivity", h: "Monotonie", d: "Tonhöhenvariation — keine Emotionsaussage" },
    ];
    const W = 2.25, H = 3.0, G = 0.27, X0 = (13.333 - (5 * W + 4 * G)) / 2, Y = 1.85;
    feats.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.28, Y + 0.32, 0.54, TINT2);
      txt(s, c.h, { x: x + 0.28, y: Y + 1.05, w: W - 0.5, h: 0.4, fontSize: 15.5, bold: true });
      txt(s, c.d, { x: x + 0.28, y: Y + 1.5, w: W - 0.52, h: 1.35, fontSize: 12, color: MUTED, valign: "top" });
    });
    txt(s, "Live im AudioWorklet (RMS, YIN, adaptive Referenz ab 3 s stimmhafter Sprache) — exakte Wortwerte nach dem Stoppen.", { x: 0.62, y: 5.35, w: 12.1, h: 0.45, fontSize: 13, color: MUTED, align: "center" });
    s.addNotes("Fünf Sprechmerkmale: Tempo, Pausen, Füllwörter, Lautstärke und Tonhöhenvariation. Live im Browser über ein AudioWorklet mit adaptiver Referenz — trainiert erst ab drei Sekunden stimmhafter Sprache, Stille trainiert nicht. Exakte Wortwerte wie Füllwörter und Worttempo kommen nach dem Stoppen aus den Timestamps. Monotonie ist eine Beobachtung, keine Emotionsbewertung.");
  }

  // ============================================================
  // Folie 8 — Timestamp-Review (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Features" });
    s.addText("Review: klicken, zurückspringen, verstehen", { placeholder: "title" });
    // Timeline
    const LY = 2.75, LX0 = 1.0, LX1 = 12.33;
    s.addShape(pres.ShapeType.line, { x: LX0, y: LY, w: LX1 - LX0, h: 0, line: { color: TINT2, width: 3 } });
    const markers = [
      { fx: 0.06, d: 0.16 }, { fx: 0.18, d: 0.22 }, { fx: 0.34, d: 0.16 },
      { fx: 0.47, d: 0.28 }, { fx: 0.62, d: 0.16 }, { fx: 0.78, d: 0.22 }, { fx: 0.93, d: 0.16 },
    ];
    markers.forEach((m) => {
      const cx = LX0 + m.fx * (LX1 - LX0);
      s.addShape(pres.ShapeType.ellipse, { x: cx - m.d / 2, y: LY - m.d / 2, w: m.d, h: m.d, fill: { color: BRAND }, line: { color: WHITE, width: 1.5 } });
    });
    txt(s, "0:00", { x: LX0 - 0.1, y: LY + 0.22, w: 0.8, h: 0.3, fontSize: 10.5, color: MUTED });
    txt(s, "Ende", { x: LX1 - 0.75, y: LY + 0.22, w: 0.85, h: 0.3, fontSize: 10.5, color: MUTED, align: "right" });
    txt(s, "Beispiel: Marker „Haltung auffällig“ — 4:12", { x: LX0 + 0.47 * (LX1 - LX0) - 1.85, y: LY - 0.62, w: 3.7, h: 0.3, fontSize: 11, italic: true, color: MUTED, align: "center" });
    const rows = [
      { icon: "FiMousePointer", d: "Klick auf einen Marker springt per peak_ms zur Stelle im lokalen Video (±2 s)." },
      { icon: "FiClock", d: "Eine gemeinsame Zeitachse: Haltung, Stimme, Transkript, Fact-Check, Fragen." },
      { icon: "FiLock", d: "Lokale Wiedergabe; Aufnahme temporär zur Analyse am Server." },
    ];
    rows.forEach((r, i) => {
      const y = 3.85 + i * 0.85;
      iconCircle(s, ic(r.icon), 0.62, y, 0.5, TINT2);
      txt(s, r.d, { x: 1.32, y: y + 0.05, w: 11.2, h: 0.4, fontSize: 14.5, color: INK });
    });
    txt(s, "Dazu: evidenzbasierte Kriterien-Scores, Formel und Abdeckung sichtbar. Optional Fortschritt über mehrere Takes — Messreihe mit Lücken, kein Gesamtscore.", { x: 0.62, y: 6.25, w: 12.1, h: 0.38, fontSize: 11.5, color: MUTED, align: "center" });
    s.addNotes("Das Herzstück für den Wert in unter drei Minuten: eine gemeinsame Timeline. Ein Klick auf einen Marker springt per Peak-Zeitstempel zur Stelle im lokalen Video, plus minus zwei Sekunden. Die Wiedergabe nutzt das lokale Video. Der vollständige Aufnahme-Container wird temporär zur Analyse hochgeladen; es gibt keinen serverseitigen Review-Clip. Dazu kommen evidenzbasierte Kriterien-Scores; Formel und Datenabdeckung stehen direkt im UI. Optional zeigt der Fortschritt eine Messreihe über mehrere Takes, ohne Gesamtscore.");
  }

  // ============================================================
  // Folie 9 — Frage-Simulator (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Features" });
    s.addText("Danach fragt der Agent", { placeholder: "title" });
    const steps = [
      { icon: "FiHelpCircle", h: "Fragen aus echten Funden", d: "Widersprüche und Lücken aus dem Fact-Check — nicht aus der Luft gegriffen." },
      { icon: "FiMic", h: "Fragen im Sprachdialog", d: "ElevenLabs führt das Gespräch — mit Transkript und Quellen als Kontext." },
      { icon: "FiBookOpen", h: "Belege bleiben sichtbar", d: "Der Fact-Check prüft Quellenzitate. Die Sprachreaktionen sind nicht zitateverifiziert." },
    ];
    const W = 3.95, H = 2.9, G = 0.35, X0 = 0.62, Y = 1.85;
    steps.forEach((c, i) => {
      const x = X0 + i * (W + G);
      card(s, x, Y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.32, Y + 0.34, 0.56, TINT2);
      txt(s, c.h, { x: x + 0.32, y: Y + 1.08, w: W - 0.64, h: 0.45, fontSize: 15.5, bold: true });
      txt(s, c.d, { x: x + 0.32, y: Y + 1.58, w: W - 0.64, h: 1.15, fontSize: 12.5, color: MUTED, valign: "top" });
    });
    const roles = ["„Erstsemester“ — neugierig", "„Professor“ — kritisch"];
    roles.forEach((t, i) => {
      s.addText(t, { shape: pres.ShapeType.roundRect, rectRadius: 0.28, fill: { color: WHITE }, line: { color: BRAND, width: 1.25 }, x: 0.62 + i * 3.6, y: 5.3, w: 3.35, h: 0.56, fontSize: 13.5, bold: true, color: BRAND, align: "center", fontFace: FONT, margin: 0 });
    });
    txt(s, "Prototyp-Score, keine Note.", { x: 8.2, y: 5.42, w: 4.5, h: 0.35, fontSize: 14.5, bold: true, color: INK });
    s.addNotes("Nach dem Vortrag übernimmt der ElevenLabs-Sprachagent. Er nutzt Transkript, Quellen und Fact-Check-Funde als Kontext. Zwei Rollen sind wählbar: neugieriges Erstsemester oder kritischer Professor. Die Sprachreaktionen sind nicht zitateverifiziert und liefern keine geprüften Antwort-Urteile für den Score. Die Auswertung nutzt die gemessene Evidenz der Aufnahme, keine Note. Der frühere getippte Fragepfad bleibt nur als Backend-Schnittstelle und für gespeicherte Antworten erhalten.");
  }

  // ============================================================
  // Folie 10 — Architektur (hell)
  // ============================================================
  pres.addSection({ title: "Technik & Zahlen" });
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Technik & Zahlen" });
    s.addText("Ein Befehl — lokaler Standard, Cloud optional", { placeholder: "title" });
    const CW = 6.0, CH = 3.55, Y = 1.62;
    // Lokal
    card(s, 0.62, Y, CW, CH, TINT);
    iconCircle(s, ic("FiCpu"), 0.98, Y + 0.32, 0.5, TINT2);
    txt(s, "Lokal — der Standard", { x: 1.66, y: Y + 0.38, w: CW - 1.3, h: 0.4, fontSize: 15.5, bold: true, color: BRAND });
    bullets(s, [
      "Next.js — MediaPipe & AudioWorklet im Browser",
      "FastAPI · Celery/Redis als Hintergrund-Jobs",
      "Postgres + pgvector · SeaweedFS (S3-kompatibel)",
      "faster-whisper · Silero VAD · jina-v2-Embeddings",
    ], { x: 1.0, y: Y + 1.05, w: CW - 0.75, h: CH - 1.35, fontSize: 13, paraSpaceAfter: 10 });
    // Cloud
    const RX = 6.87;
    card(s, RX, Y, CW, CH, TINT);
    iconCircle(s, ic("FiCloud"), RX + 0.36, Y + 0.32, 0.5, TINT2);
    txt(s, "Cloud — nur mit Einwilligung", { x: RX + 1.04, y: Y + 0.38, w: CW - 1.3, h: 0.4, fontSize: 15.5, bold: true });
    bullets(s, [
      "Gemini flash-lite — Fact-Check & Frage-Agent",
      "Optional: Deepgram (EU) — Live-Transkript",
      "Optional: ElevenLabs — Voice-Agent-Stimme",
      "Ohne Cloud-Schlüssel entfallen Quellencheck und Frage-Agent",
    ], { x: RX + 0.38, y: Y + 1.05, w: CW - 0.75, h: CH - 1.35, fontSize: 13, paraSpaceAfter: 10 });
    // Terminal
    s.addText([
      { text: "$ ", options: { color: LIGHTV } },
      { text: "docker compose up --build -d --wait", options: { color: WHITE } },
    ], { shape: pres.ShapeType.roundRect, rectRadius: 0.12, fill: { color: INK }, line: { type: "none" }, x: 2.67, y: 5.55, w: 8.0, h: 0.66, fontSize: 15, fontFace: MONO, align: "center", margin: 0 });
    s.addNotes("Technisch: Next.js vorne, FastAPI mit Celery und Redis hinten, Postgres mit pgvector, SeaweedFS als S3-Speicher. Der lokale Stack deckt Pose, VAD, Whisper und Embeddings ab; Cloud-Dienste wie Gemini, Deepgram oder ElevenLabs sind nur mit Einwilligung zugeschaltet. Ohne Cloud-Schlüssel bleiben Audio-, Pose- und Signalanalyse lokal; Quellencheck und Frage-Agent sind dann nicht verfügbar. Der ganze Stack startet mit einem einzigen Compose-Befehl.");
  }

  // ============================================================
  // Folie 11 — Datenschutz & Ehrlichkeit (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Technik & Zahlen" });
    s.addText("Privat by design — ehrlich by design", { placeholder: "title" });
    const items = [
      { icon: "FiVideo", h: "Wiedergabe bleibt lokal", d: "Aufnahme temporär zur Server-Analyse" },
      { icon: "FiTrash2", h: "Audio wird gelöscht", d: "Original nach der Analyse — auch bei Fehlern" },
      { icon: "FiShield", h: "Keine Pose-Frames zu Anbietern", d: "Landmarks bleiben im Browser" },
      { icon: "FiCheckCircle", h: "Cloud nur mit Einwilligung", d: "Anbieter werden vorab benannt" },
      { icon: "FiDatabase", h: "Synthetische Demo-Daten", d: "Live-Aufnahmen nur mit Einwilligung" },
      { icon: "FiEyeOff", h: "Heuristiken offen markiert", d: "„unvalidiert“ statt glaub behauptet" },
    ];
    const W = 3.9, H = 1.98, GX = 0.29, GY = 0.24, X0 = 0.53, Y0 = 1.7;
    items.forEach((c, i) => {
      const x = X0 + (i % 3) * (W + GX), y = Y0 + Math.floor(i / 3) * (H + GY);
      card(s, x, y, W, H, TINT);
      iconCircle(s, ic(c.icon), x + 0.28, y + 0.3, 0.5, TINT2);
      txt(s, c.h, { x: x + 0.95, y: y + 0.32, w: W - 1.2, h: 0.45, fontSize: 13.5, bold: true });
      txt(s, c.d, { x: x + 0.95, y: y + 0.85, w: W - 1.2, h: 0.9, fontSize: 12, color: MUTED, valign: "top" });
    });
    txt(s, "Evidenzbasierte Prototyp-Scores, keine Noten, keine Emotionsanalyse.", { x: 0.62, y: 6.2, w: 12.1, h: 0.42, fontSize: 16, bold: true, color: BRAND, align: "center" });
    s.addNotes("Datenschutz war für uns ein Feature, kein Anhängsel. Das Review spielt die lokale Aufnahme ab. Der vollständige Aufnahme-Container geht temporär an den Analyse-Server und wird nach terminaler Verarbeitung gelöscht; bei Speicherfehlern wird die Löschung erneut versucht. Pose-Frames gehen zu keinem Anbieter. Optionales Deepgram-Streaming sendet Audio nach Einwilligung an Deepgram EU. Heuristiken kennzeichnen wir offen als unvalidiert. Die Auswertung zeigt evidenzbasierte Prototyp-Scores, aber keine Noten und keine Emotionsanalyse.");
  }

  // ============================================================
  // Folie 12 — Zahlen (hell)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Technik & Zahlen" });
    s.addText("Gemessen im Prototyp — nicht versprochen", { placeholder: "title" });
    const stats = [
      { n: "2,7 s", d: "100 Folien einlesen & embedden" },
      { n: "54 ms", d: "Hybrid-Suche, Median bei 10.000 Chunks" },
      { n: "0,35 s", d: "Signal-Analyse für 60 s Audio" },
      { n: "3,4 s", d: "Fact-Check (Gemini flash-lite, synthetisch)" },
      { n: "4,8 s", d: "Whisper small für 6,8 s Audio" },
      { n: "44", d: "API-Pfade im Backend" },
      { n: "333", d: "Backend-Tests" },
      { n: "261", d: "Web-Unit-Tests" },
    ];
    const W = 2.9, H = 1.9, GX = 0.25, GY = 0.22, X0 = (13.333 - (4 * W + 3 * GX)) / 2, Y0 = 1.7;
    stats.forEach((c, i) => {
      const x = X0 + (i % 4) * (W + GX), y = Y0 + Math.floor(i / 4) * (H + GY);
      card(s, x, y, W, H, TINT);
      txt(s, c.n, { x: x + 0.28, y: y + 0.22, w: W - 0.56, h: 0.62, fontSize: 30, bold: true, color: BRAND });
      txt(s, c.d, { x: x + 0.28, y: y + 0.95, w: W - 0.5, h: 0.85, fontSize: 11.5, color: MUTED, valign: "top" });
    });
    txt(s, "Messwerte: M5 Pro / 24 GB, synthetische Lasten · Cloud-Latenzen auf synthetischen Daten · in unserem Prototyp gemessen, keine garantierten Werte.", { x: 0.62, y: 6.12, w: 12.1, h: 0.4, fontSize: 11, italic: true, color: MUTED, align: "center" });
    s.addNotes("Ein paar gemessene Zahlen statt Versprechen: hundert Folien in unter drei Sekunden eingelesen und eingebettet, Hybrid-Suche über zehntausend Chunks mit vierundfünfzig Millisekunden Median, sechzig Sekunden Audio in rund einem Drittel einer Sekunde analysiert. Über fünfhundert Tests begleiten den Prototyp. Alle Messwerte stammen von einem M5 Pro mit synthetischer Last — das ist unser Prototyp, keine Garantie.");
  }

  // ============================================================
  // Folie 13 — AI-Reflection (dunkel)
  // ============================================================
  pres.addSection({ title: "Reflection & Abschluss" });
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Reflection & Abschluss" });
    txt(s, "AI-REFLECTION · 2 MINUTEN", { x: 0.9, y: 0.7, w: 8, h: 0.35, fontSize: 12.5, bold: true, color: LIGHTV, charSpacing: 3 });
    txt(s, "Wo KI half — und wo wir korrigieren mussten", { x: 0.9, y: 1.1, w: 11.5, h: 0.7, fontSize: 28, bold: true, color: WHITE });
    const CW = 5.85, CH = 3.5, Y = 2.05;
    card(s, 0.9, Y, CW, CH, DARK_CARD, 0.14);
    txt(s, "Beschleunigt", { x: 1.28, y: Y + 0.32, w: CW - 0.76, h: 0.4, fontSize: 15.5, bold: true, color: LIGHTV });
    bullets(s, [
      "Stack & Pipelines: Compose-Setup, Audio-, ASR- und RAG-Pfad",
      "Agenten: Fact-Check, Frage-Simulator, Review-Fallback",
      "Tests & Dokumentation — diese Folien eingeschlossen",
    ], { x: 1.28, y: Y + 0.9, w: CW - 0.7, h: CH - 1.2, fontSize: 13, color: WHITE, paraSpaceAfter: 11 });
    const RX = 6.98;
    card(s, RX, Y, CW, CH, DARK_CARD, 0.14);
    txt(s, "Falsch gelegen → korrigiert", { x: RX + 0.38, y: Y + 0.32, w: CW - 0.76, h: 0.4, fontSize: 15.5, bold: true, color: LIGHTV });
    bullets(s, [
      "Ollama träge & umständlich → Wechsel zu Gemini",
      "Falsches Urteil trotz gültigem Zitat → Prompt geschärft",
      "Wikipedia 403 → User-Agent mit Kontaktangabe",
      "Zu träge Gestenregel → kalibriert am echten Kameratest",
    ], { x: RX + 0.38, y: Y + 0.9, w: CW - 0.7, h: CH - 1.2, fontSize: 13, color: WHITE, paraSpaceAfter: 10 });
    s.addText([
      { text: "„Gültiges JSON und gültiges Zitat beweisen kein richtiges Urteil.“", options: { bold: true, italic: true, color: WHITE } },
      { text: "  Deshalb verifiziert Code jedes Zitat.", options: { color: LIGHTV } },
    ], { isTextBox: true, margin: 0, x: 0.9, y: 5.9, w: 11.9, h: 0.6, fontSize: 16.5, fontFace: FONT, align: "center" });
    s.addNotes("Zur AI-Reflection: KI hat uns beim Stack, bei den Pipelines und beim Agenten deutlich beschleunigt. Aber sie lag auch falsch: Ollama ersetzten wir durch Gemini, ein falsches LLM-Urteil trotz gültigem Zitat führte zur Prompt-Korrektur, Wikipedia blockte unseren ersten User-Agent, und eine zu träge Gestenregel fixten wir per Kalibriertest. Unsere Lehre: Gültiges JSON und gültiges Zitat beweisen kein richtiges Urteil — deshalb verifiziert Code jedes Zitat.");
  }

  // ============================================================
  // Folie 14 — Abschluss / CTA (dunkel)
  // ============================================================
  {
    const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Reflection & Abschluss" });
    logoCard(s, 6.667, 0.8, 1.8);
    txt(s, "Übe den Vortrag, nicht die Folien.", { x: 0.5, y: 3.05, w: 12.333, h: 0.95, fontSize: 40, bold: true, color: WHITE, align: "center" });
    txt(s, "Prototyp läuft lokal: localhost:3000 — kein Login; Cloud: Quellencheck, Fragen und optional Live-ASR.", { x: 0.5, y: 4.15, w: 12.333, h: 0.5, fontSize: 18, color: LIGHTV, align: "center" });
    txt(s, "Produktreview willkommen — zeigen Sie uns drei Minuten Ihrer Zeit, wir zeigen Ihnen jeden Moment zurück.", { x: 0.5, y: 4.85, w: 12.333, h: 0.45, fontSize: 14, color: DIM, align: "center" });
    txt(s, "Team 418 · 8. Hackathon Fulda · Future Education 2026", { x: 0.5, y: 6.4, w: 12.333, h: 0.35, fontSize: 13, color: DIM, align: "center" });
    s.addNotes("Zum Schluss: Übe den Vortrag, nicht die Folien. Der Prototyp läuft lokal auf localhost 3000, ohne Login; Quellencheck und Fragen nutzen optional Gemini. Wir laden herzlich zum Produktreview ein. Danke.");
  }

  // ---------- Write ----------
  const zip = await JSZip.loadAsync(await pres.write({ outputType: "nodebuffer" }));
  const types = await zip.file("[Content_Types].xml").async("string");
  // PptxGenJS 4 declares one master per slide but writes only the first master.
  zip.file("[Content_Types].xml", types.replace(
    /<Override PartName="(\/ppt\/slideMasters\/slideMaster\d+\.xml)"[^>]*\/>/g,
    (entry, name) => zip.file(name.slice(1)) ? entry : "",
  ));
  await fs.writeFile(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("geschrieben:", OUT);

}

main().catch((e) => { console.error(e); process.exit(1); });

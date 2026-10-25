const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const JSZip = require("jszip");

test("generated pitch and promo disclose temporary recording uploads", async () => {
  const deck = await JSZip.loadAsync(await readFile(path.join(__dirname, "PitchPractice-Pitch.pptx")));
  const slides = await Promise.all(Object.values(deck.files)
    .filter((entry) => /^ppt\/(slides|notesSlides)\/.*\.xml$/.test(entry.name))
    .map((entry) => entry.async("string")));
  const text = slides.join(" ");
  assert.match(text, /Aufnahme temporär zur Server-Analyse/);
  assert.match(text, /vollständige Aufnahme-Container/);
  assert.doesNotMatch(text, /Video verlässt den Client nie|Video bleibt beim Client|Video bleibt beim Nutzer/);
  assert.match(text, /Die Sprachreaktionen sind nicht zitateverifiziert/);
  assert.doesNotMatch(text, /Tippen oder sprechen|Jede Antwort wird mit Zitat-Prüfung/);
  const promo = await readFile(path.join(__dirname, "../promo/src/scenes/Privacy.tsx"), "utf8");
  assert.match(promo, /Aufnahme temporär zur Server-Analyse/);
  assert.doesNotMatch(promo, /Video bleibt auf deinem Gerät/);
});

test("deck declares only existing parts and its title placeholder has the intended geometry", async () => {
  const deck = await JSZip.loadAsync(await readFile(path.join(__dirname, "PitchPractice-Pitch.pptx")));
  const types = await deck.file("[Content_Types].xml").async("string");
  for (const [, part] of types.matchAll(/PartName="([^"]+)"/g))
    assert.ok(deck.file(part.slice(1)), `Missing package part: ${part}`);
  const layouts = await Promise.all(Object.values(deck.files)
    .filter((entry) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(entry.name))
    .map((entry) => entry.async("string")));
  const layout = layouts.find((xml) => xml.includes('name="LIGHT"'));
  assert.ok(layout);
  assert.match(layout, /<p:ph[^>]*type="title"/);
  assert.match(layout, /<a:off x="566928" y="402336"/);
  assert.match(layout, /sz="3000"/);
});

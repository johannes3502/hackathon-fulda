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
  const promo = await readFile(path.join(__dirname, "../promo/src/scenes/Privacy.tsx"), "utf8");
  assert.match(promo, /Aufnahme temporär zur Server-Analyse/);
  assert.doesNotMatch(promo, /Video bleibt auf deinem Gerät/);
});

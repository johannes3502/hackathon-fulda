import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve("..");
const outDir = path.join(root, "promo", "public", "voice");
fs.mkdirSync(outDir, { recursive: true });

const map = {};
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) map[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}
const key = map.GEMINI_API_KEY || map.GOOGLE_API_KEY;
const model = "gemini-3.8-flash-tts";
const voice = "Sulafat";

const blocks = [
  { id: "progress-05-click", text: "Ein Klick öffnet den Verlauf." },
  { id: "progress-06-history", text: "Start, aktuell, Veränderung." },
  {
    id: "review-04-fact-a",
    text: "Im Vortrag zwanzig Teilnehmende, im Demo-Konzept zwölf.",
  },
  {
    id: "review-04-fact-b",
    text: "Der Fact-Check zeigt Zitat und Quelle.",
  },
];

for (const block of blocks) {
  const body = {
    contents: [{ parts: [{ text: block.text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        languageCode: "de-DE",
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  };
  let saved = false;
  for (let attempt = 1; attempt <= 5 && !saved; attempt += 1) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.log(`${block.id}: HTTP ${res.status} attempt ${attempt}`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    const json = await res.json();
    const data = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) {
      console.log(`${block.id}: no audio attempt ${attempt}`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
      continue;
    }
    const file = path.join(outDir, `${block.id}.wav`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    const duration = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" },
    ).trim();
    console.log(`${block.id}: ${Number(duration).toFixed(2)}s`);
    saved = true;
  }
  if (!saved) throw new Error(`failed ${block.id}`);
}

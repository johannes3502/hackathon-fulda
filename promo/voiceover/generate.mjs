import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve("..");
const outDir = path.join(root, "promo", "public", "voice");
fs.mkdirSync(outDir, { recursive: true });

function readEnv(file) {
  const map = {};
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return map;
}

const env = readEnv(path.join(root, ".env"));
const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY missing in .env");

const model = process.env.TTS_MODEL || "gemini-3.8-flash-tts";
const voice = process.env.TTS_VOICE || "Sulafat";

const blocks = [
  {
    id: "progress-01-intro",
    text: "Zwischen zwei Proben: vier-eins-acht macht Fortschritt sichtbar.",
  },
  {
    id: "progress-02-hero",
    text: "Zuerst zählt, wie vergleichbar deine Aufnahmen sind.",
  },
  {
    id: "progress-03-overview",
    text: "Vier Kennzahlen: Vergleichbarkeit, Zeitraum, Datenlage, Ziele.",
  },
  {
    id: "progress-04-metrics",
    text: "Jede Metrik behält ihre eigene Skala.",
  },
  {
    id: "progress-05-click",
    text: "Ein Klick öffnet den Verlauf:",
  },
  {
    id: "progress-06-history",
    text: "Start. Aktuell. Veränderung.",
  },
  {
    id: "progress-07-focus",
    text: "Wie viele Aufnahmen vergleichbar sind, steht direkt daneben.",
  },
  {
    id: "progress-08-why",
    text: "Warum sichtbar? Startphase, Streuung, Unsicherheit.",
  },
  {
    id: "progress-09-changes",
    text: "Veränderungen werden eingeordnet, Schritt für Schritt.",
  },
  {
    id: "progress-10-limits",
    text: "Die Grenzen der Daten bleiben sichtbar.",
  },
  {
    id: "progress-11-outro",
    text: "Eine Probe für die nächste. vier-eins-acht Pitch Practice.",
  },
  {
    id: "review-01-intro",
    text: "Nach der Probe zählt der Moment.",
  },
  {
    id: "review-02-scores",
    text: "Drei Kriterien: Gestik, Flow und Fachwissen. Jedes mit eigener Datenabdeckung.",
  },
  {
    id: "review-03-method",
    text: "Die Formel daneben: positive gegen kritische Sekunden. Beim Fachwissen zählt das geprüfte Quellenzitat.",
  },
  {
    id: "review-04-fact-a",
    text: "Im Vortrag zwanzig Teilnehmende, im Demo-Konzept zwölf.",
  },
  {
    id: "review-04-fact-b",
    text: "Der Fact-Check zeigt Zitat und Quelle.",
  },
  {
    id: "review-05-jump",
    text: "Ein Klick springt zur Stelle im lokalen Video. Die Aufnahme bleibt bei dir.",
  },
  {
    id: "review-06-graph",
    text: "Der Verlauf verbindet Ereignisse. Zwischenwerte sind interpoliert.",
  },
  {
    id: "review-07-outro",
    text: "Aus jedem Moment wird ein nächster Schritt. vier-eins-acht Pitch Practice.",
  },
];

async function generate(block) {
  const body = {
    contents: [
      {
        parts: [
          {
            text: block.text,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        languageCode: "de-DE",
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  };

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const detail = await response.text();
      console.log(
        `${block.id}: HTTP ${response.status} (attempt ${attempt}) ${detail.slice(0, 300)}`,
      );
      if (attempt === 4) throw new Error(`TTS failed for ${block.id}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      continue;
    }
    const json = await response.json();
    const part = json.candidates?.[0]?.content?.parts?.find(
      (candidate) => candidate.inlineData?.data,
    );
    if (!part) {
      console.log(`${block.id}: no audio part (attempt ${attempt})`);
      if (attempt === 4) throw new Error(`TTS missing audio for ${block.id}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      continue;
    }
    const data = Buffer.from(part.inlineData.data, "base64");
    const target = path.join(outDir, `${block.id}.wav`);
    fs.writeFileSync(target, data);
    const duration = Number(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=nw=1:nk=1",
          target,
        ],
        { encoding: "utf8" },
      ).trim(),
    );
    console.log(`${block.id}: ${duration.toFixed(2)}s (${part.inlineData.mimeType})`);
    return { ...block, file: `${block.id}.wav`, duration };
  }
}

const results = [];
for (const block of blocks) {
  results.push(await generate(block));
}

const timeline = {
  model,
  voice,
  generatedAt: new Date().toISOString(),
  blocks: results,
};
fs.writeFileSync(
  path.join(root, "promo", "voiceover", "timeline.json"),
  JSON.stringify(timeline, null, 2),
);
console.log("wrote promo/voiceover/timeline.json");


import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve("..");
const map = {};
for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) map[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}
const key = map.GEMINI_API_KEY || map.GOOGLE_API_KEY;
const text =
  "Ein Klick springt zur Stelle im lokalen Video. Die Aufnahme bleibt bei dir.";
const variants = [
  {
    id: "h",
    prompt: `TTS the following German text in a warm, calm voice at a natural, moderate pace: ${text}`,
    languageCode: "de-DE",
  },
  {
    id: "i",
    prompt: `TTS the following German text in a warm, clear voice, speaking a little faster than usual but still calm: ${text}`,
    languageCode: "de-DE",
  },
  {
    id: "j",
    prompt: `TTS the following German text in a warm, calm voice. Keep pauses short: ${text}`,
    languageCode: "de-DE",
  },
  {
    id: "k",
    prompt: `TTS the following German text in a warm, calm voice at a natural, moderate pace: ${text}`,
  },
];
fs.mkdirSync(path.join(root, "promo", "public", "voice", "probe"), {
  recursive: true,
});
for (const v of variants) {
  const speechConfig = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sulafat" } },
  };
  if (v.languageCode) speechConfig.languageCode = v.languageCode;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: v.prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig,
        },
      }),
    },
  );
  if (!res.ok) {
    console.log(v.id, res.status, (await res.text()).slice(0, 300));
    continue;
  }
  const json = await res.json();
  const data = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) {
    console.log(v.id, "no audio");
    continue;
  }
  const file = path.join(root, "promo", "public", "voice", "probe", `${v.id}.wav`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  const duration = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" },
  ).trim();
  console.log(`${v.id}: ${Number(duration).toFixed(2)}s  ${v.prompt.slice(0, 80)}`);
}

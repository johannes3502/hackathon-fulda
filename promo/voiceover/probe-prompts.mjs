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
const text = "Zwischen zwei Proben: vier-eins-acht macht Fortschritt sichtbar.";
const prompts = {
  a: text,
  b: `Say warmly and calmly in German: ${text}`,
  c: `Sprich warm und ruhig auf Deutsch: ${text}`,
  d: `Lies vor: ${text}`,
  e: `Audio profile: warm, calm, clear German narration. Transcript: ${text}`,
  f: `TTS the following German text in a warm, calm voice: ${text}`,
  g: `Sprich den folgenden deutschen Text warm und ruhig: ${text}`,
};
fs.mkdirSync(path.join(root, "promo", "public", "voice", "probe"), {
  recursive: true,
});
for (const [name, prompt] of Object.entries(prompts)) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sulafat" } },
      },
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    console.log(name, res.status, (await res.text()).slice(0, 200));
    continue;
  }
  const json = await res.json();
  const data = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) {
    console.log(name, "no audio");
    continue;
  }
  const file = path.join(root, "promo", "public", "voice", "probe", `${name}.wav`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  const duration = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" },
  ).trim();
  console.log(`${name}: ${Number(duration).toFixed(2)}s  ${prompt.slice(0, 70)}`);
}

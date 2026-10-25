import type { StructureWord } from "./types";

export type StructureFixture = {
  name: string;
  durationMs: number;
  words: StructureWord[];
};

export function transcript(
  name: string,
  sentences: string[],
  options: { sentenceMs?: number; gapMs?: number } = {},
): StructureFixture {
  const sentenceMs = options.sentenceMs ?? 7000;
  const gapMs = options.gapMs ?? 120;
  const words: StructureWord[] = [];
  let cursor = 0;
  sentences.forEach((text) => {
    const tokens = text.split(/\s+/).filter(Boolean);
    const step = sentenceMs / Math.max(1, tokens.length);
    tokens.forEach((token, index) => {
      const start = Math.round(cursor + index * step);
      words.push({
        word: token,
        start_ms: start,
        end_ms: Math.round(start + step * 0.82),
      });
    });
    cursor += sentenceMs + gapMs;
  });
  return {
    name,
    durationMs: Math.max(0, cursor - gapMs),
    words,
  };
}

export const emptyFixture = transcript("empty", []);

export const oneSentenceFixture = transcript(
  "one sentence",
  [
    [
      "Heute",
      "möchte",
      "ich",
      "einen",
      "langen",
      "Gedanken",
      "ohne",
      "echten",
      "Absatz",
      "zu",
      "Ende",
      "führen",
      "und",
      "dabei",
      "viele",
      "Wörter",
      "verwenden",
      "damit",
      "die",
      "Aufnahme",
      "lang",
      "genug",
      "ist",
      "und",
      "die",
      "Wortgrenze",
      "überschritten",
      "wird",
      "ohne",
      "dass",
      "ein",
      "zweiter",
      "Satz",
      "entsteht",
    ].join(" "),
  ],
  { sentenceMs: 60000 },
);

export const shortDurationFixture = transcript(
  "short duration",
  [
    "Zu Beginn erklären wir das Lernen und die Schule.",
    "Die Schülerinnen nutzen Kurse und üben gemeinsam.",
    "Das Lernen bleibt sichtbar und die Kurse wachsen.",
    "Zweitens beschreiben wir die Technik und die Kamera.",
    "Die Kamera erfasst das System und die Technik.",
    "Das System bleibt sichtbar und die Technik wächst.",
    "Danach zeigen wir die Ergebnisse der Studie.",
    "Die Studie zeigt das Team und die Ergebnisse.",
    "Zum Schluss danken wir dem Team und den Gästen.",
  ],
  { sentenceMs: 3000 },
);

export const germanTalk = transcript("German talk", [
  "Zu Beginn möchte ich das Problem erklären.",
  "Die Schülerinnen lernen mit kurzen Kursen.",
  "Das Lernen und die Kurse bleiben sichtbar.",
  "Zweitens beschreiben wir die Technik.",
  "Die Kamera erfasst das System im Raum.",
  "Das System und die Technik bleiben sichtbar.",
  "Danach zeigen wir die Ergebnisse.",
  "Die Studie und das Team prüfen die Ergebnisse.",
  "Zum Schluss danke ich dem Team.",
]);

export const englishTalk = transcript("English talk", [
  "Today I want to present the learning problem.",
  "Students use short courses and practise together.",
  "The courses keep the learning visible.",
  "First, we describe the camera system.",
  "The camera tracks the speaker in the room.",
  "The system keeps the technique visible.",
  "Second, we show the study results.",
  "The team reviews the results with students.",
  "Finally, we discuss the next study.",
  "Thank you for your attention.",
]);

export const noPunctuationFixture = transcript(
  "no punctuation",
  [
    "Heute zeigen wir das Lernen und die Kurse für alle Schülerinnen und Studenten im Raum und erklären die Idee mit vielen Wörtern",
    "Danach beschreiben wir die Technik und die Kamera für das System und die Aufnahme im Raum und nennen die wichtigsten Schritte für das Team",
    "Zum Schluss danken wir dem Team und den Gästen für die Aufmerksamkeit und die Zeit für diese Präsentation im Raum",
  ],
  { sentenceMs: 15000, gapMs: 1800 },
);

export const repeatedWordsFixture = transcript("repeated words", [
  "Zu Beginn wiederholen wir das Lernen und das Lernen.",
  "Das Lernen und das Lernen bleiben das Lernen.",
  "Die Kurse und die Kurse bleiben die Kurse.",
  "Das Lernen und das Lernen bleiben das Lernen.",
  "Die Kurse und die Kurse bleiben die Kurse.",
  "Das Lernen und das Lernen bleiben das Lernen.",
  "Die Kurse und die Kurse bleiben die Kurse.",
  "Das Lernen und das Lernen bleiben das Lernen.",
  "Zum Schluss danken wir für das Lernen und die Kurse.",
]);

const topics = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
];

export const manyTopicsFixture = transcript(
  "many topics",
  topics.flatMap((topic, group) => [
    `${group === 0 ? "Erstens" : "Als nächstes"} ${topic} ${topic} ${topic} ${topic}.`,
    `${topic} ${topic} ${topic} und ${topic}.`,
    `${topic} und ${topic} ${topic} ${topic}.`,
  ].map((line, index) =>
    group === topics.length - 1 && index === 2
      ? line.replace(/^\S+/, "Zum Schluss")
      : line,
  )),
  { sentenceMs: 4500 },
);

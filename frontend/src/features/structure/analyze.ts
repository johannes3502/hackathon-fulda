import {
  CONNECTORS,
  ENGLISH_STOPWORDS,
  GERMAN_STOPWORDS,
  MARKERS,
  STOPWORDS,
  STRONG_SEQUENCE,
} from "./lexicon";
import type {
  StructureAnalysis,
  StructureComponent,
  StructureComponentKey,
  StructureEvidence,
  StructureMarker,
  StructureMarkerKind,
  StructureSection,
  StructureWord,
} from "./types";

const MAX_SENTENCE_WORDS = 40;
const SENTENCE_GAP_MS = 1500;
const MIN_SCORE_WORDS = 50;
const MIN_SCORE_DURATION_MS = 45_000;
const MIN_SIGNALS = 3;
const MAX_SECTIONS = 8;
const MIN_SECTION_SENTENCES = 3;
const MIN_SECTION_DURATION_MS = 12_000;
const ABSOLUTE_JACCARD = 0.12;
const LOCAL_JACCARD_MARGIN = 0.06;
const SEQUENCE_JACCARD = 0.35;
const SENTENCE_END = /[.!?…]["'”’»)\]]*$/;
const CONTENT_CHAR = /[a-z0-9äöüß]/i;

type Word = StructureWord & { index: number };
type Sentence = {
  index: number;
  words: Word[];
  tokens: string[];
  content: string[];
  text: string;
  startMs: number;
  endMs: number;
  wordCount: number;
};
type RawSection = { start: number; end: number };

function finite(value: number) {
  return Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-z0-9äöüß']+/, "")
    .replace(/[^a-z0-9äöüß']+$/, "");
}

function cleanText(words: Word[]) {
  return words
    .map((word) => word.word)
    .join(" ")
    .replace(/\s+([,.!?;:…])/g, "$1")
    .trim();
}

function sentenceText(words: Word[]) {
  return cleanText(words);
}

function sanitizeWords(
  source: readonly StructureWord[],
  durationMs: number | undefined,
) {
  const input = Array.isArray(source) ? source : [];
  const maximum = input.reduce(
    (end, word) =>
      finite(word.end_ms) ? Math.max(end, word.end_ms) : end,
    0,
  );
  const requested =
    typeof durationMs === "number" && finite(durationMs)
      ? Math.max(0, durationMs)
      : 0;
  const duration = requested > 0 ? requested : maximum;
  if (!(duration > 0)) return { words: [] as Word[], durationMs: 0 };
  const words = input
    .map((word, index) => {
      if (!finite(word.start_ms)) return null;
      const start = Math.min(Math.max(0, word.start_ms), duration);
      const end = Math.min(
        Math.max(start, finite(word.end_ms) ? word.end_ms : start),
        duration,
      );
      return {
        word: typeof word.word === "string" ? word.word.trim() : "",
        start_ms: start,
        end_ms: end,
        index,
      };
    })
    .filter((word): word is Word => !!word && word.start_ms < duration)
    .sort(
      (left, right) =>
        left.start_ms - right.start_ms ||
        left.end_ms - right.end_ms ||
        left.index - right.index,
    );
  return { words, durationMs: duration };
}

function segmentSentences(words: Word[]) {
  const sentences: Sentence[] = [];
  let current: Word[] = [];
  const flush = () => {
    if (!current.length) return;
    const tokens = current.map((word) => normalizeToken(word.word));
    const content = tokens.filter(
      (token) => token.length > 1 && !STOPWORDS.has(token),
    );
    const wordCount = tokens.filter(Boolean).length;
    if (!wordCount) {
      current = [];
      return;
    }
    sentences.push({
      index: sentences.length,
      words: current,
      tokens,
      content,
      text: sentenceText(current),
      startMs: current[0].start_ms,
      endMs: current[current.length - 1].end_ms,
      wordCount,
    });
    current = [];
  };
  words.forEach((word, index) => {
    current.push(word);
    const next = words[index + 1];
    const ended = SENTENCE_END.test(word.word.trim());
    const gap = next ? next.start_ms - word.end_ms : Number.POSITIVE_INFINITY;
    const wordsInSentence = current.filter((item) =>
      CONTENT_CHAR.test(item.word),
    ).length;
    if (ended || gap >= SENTENCE_GAP_MS || wordsInSentence >= MAX_SENTENCE_WORDS)
      flush();
  });
  flush();
  return sentences;
}

function phraseTokens(phrase: string) {
  return phrase.split(/\s+/).filter(Boolean);
}

function findPhrase(
  tokens: string[],
  phrase: string[],
  sentenceInitial: boolean,
) {
  const starts = sentenceInitial
    ? [0, ...(CONNECTORS.has(tokens[0]) ? [1] : [])]
    : tokens.map((_, index) => index);
  for (const start of starts) {
    if (start < 0 || start + phrase.length > tokens.length) continue;
    if (phrase.every((word, offset) => tokens[start + offset] === word))
      return start;
  }
  return null;
}

function markerEvidence(
  sentence: Sentence,
  start: number,
  phrase: string,
): StructureEvidence {
  const first = sentence.words[start];
  const last = sentence.words[start + phraseTokens(phrase).length - 1];
  return {
    startMs: first.start_ms,
    endMs: Math.max(first.start_ms, last.end_ms),
    label: phrase,
  };
}

function detectMarkers(sentences: Sentence[]) {
  const markers: StructureMarker[] = [];
  const seen = new Set<string>();
  const push = (
    kind: StructureMarkerKind,
    sentence: Sentence,
    start: number,
    phrase: string,
  ) => {
    const evidence = markerEvidence(sentence, start, phrase);
    const key = `${kind}:${sentence.index}:${evidence.startMs}:${evidence.endMs}:${phrase}`;
    if (seen.has(key)) return;
    seen.add(key);
    markers.push({
      kind,
      marker: phrase,
      sentenceIndex: sentence.index,
      startMs: evidence.startMs,
      endMs: evidence.endMs,
      strong: STRONG_SEQUENCE.has(phrase),
    });
  };
  sentences.forEach((sentence, index) => {
    if (index < 2)
      for (const phrase of MARKERS.open) {
        const start = findPhrase(sentence.tokens, phraseTokens(phrase), false);
        if (start !== null) push("open", sentence, start, phrase);
      }
    if (index >= sentences.length - 2)
      for (const phrase of MARKERS.close) {
        const start = findPhrase(sentence.tokens, phraseTokens(phrase), false);
        if (start !== null) push("close", sentence, start, phrase);
      }
    for (const phrase of MARKERS.sequence) {
      const start = findPhrase(sentence.tokens, phraseTokens(phrase), true);
      if (start !== null) push("sequence", sentence, start, phrase);
    }
    for (const phrase of MARKERS.boundary) {
      const start = findPhrase(sentence.tokens, phraseTokens(phrase), true);
      if (start !== null) push("boundary", sentence, start, phrase);
    }
  });
  return markers.sort(
    (left, right) =>
      left.startMs - right.startMs ||
      left.sentenceIndex - right.sentenceIndex ||
      left.kind.localeCompare(right.kind) ||
      left.marker.localeCompare(right.marker),
  );
}

function detectLanguage(sentences: Sentence[]) {
  let german = 0;
  let english = 0;
  for (const sentence of sentences)
    for (const token of sentence.tokens) {
      if (GERMAN_STOPWORDS.has(token)) german += 1;
      if (ENGLISH_STOPWORDS.has(token)) english += 1;
      if (/[äöüß]/i.test(token)) german += 2;
    }
  if (!german && !english) return "mixed" as const;
  return german > english ? ("de" as const) : english > german ? ("en" as const) : ("mixed" as const);
}

function jaccard(left: string[], right: string[]) {
  if (!left.length || !right.length) return null;
  const a = new Set(left);
  const b = new Set(right);
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const union = a.size + b.size - shared;
  return union ? shared / union : null;
}

function windowTokens(sentences: Sentence[], start: number, end: number) {
  return sentences
    .slice(Math.max(0, start), Math.min(sentences.length, end))
    .flatMap((sentence) => sentence.content);
}

function localMean(values: (number | null)[], index: number) {
  const neighbours = values.filter(
    (value, position): value is number =>
      value !== null && position !== index && Math.abs(position - index) <= 2,
  );
  if (!neighbours.length) return null;
  return (
    neighbours.reduce((sum, value) => sum + value, 0) / neighbours.length
  );
}

function sectionBoundaries(sentences: Sentence[], markers: StructureMarker[]) {
  const boundaries = new Set<number>([sentences.length]);
  const similarities = sentences.slice(1).map((_, offset) => {
    const index = offset + 1;
    return jaccard(
      windowTokens(sentences, index - 3, index),
      windowTokens(sentences, index, index + 3),
    );
  });
  sentences.slice(1).forEach((_, offset) => {
    const index = offset + 1;
    const similarity = similarities[offset];
    if (similarity !== null) {
      const mean = localMean(similarities, offset);
      if (
        similarity <= ABSOLUTE_JACCARD &&
        mean !== null &&
        similarity <= mean - LOCAL_JACCARD_MARGIN
      )
        boundaries.add(index);
    }
    if (
      similarity !== null &&
      similarity <= SEQUENCE_JACCARD &&
      markers.some(
        (marker) =>
          marker.sentenceIndex === index &&
          marker.kind === "sequence" &&
          marker.strong,
      )
    )
      boundaries.add(index);
  });
  return [...boundaries].filter((value) => value > 0 && value <= sentences.length).sort((a, b) => a - b);
}

function durationOf(sentences: Sentence[], section: RawSection) {
  const first = sentences[section.start];
  const last = sentences[section.end - 1];
  return last.endMs - first.startMs;
}

function wordCountOf(sentences: Sentence[], section: RawSection) {
  return sentences
    .slice(section.start, section.end)
    .reduce((sum, sentence) => sum + sentence.wordCount, 0);
}

function mergeSections(
  sentences: Sentence[],
  sections: RawSection[],
): RawSection[] {
  const result = sections.slice();
  const mergeAt = (index: number) => {
    if (index > 0) {
      const merged = {
        start: result[index - 1].start,
        end: result[index].end,
      };
      result.splice(index - 1, 2, merged);
    } else {
      const merged = { start: result[0].start, end: result[1].end };
      result.splice(0, 2, merged);
    }
  };
  let guard = 0;
  while (result.length > 1 && guard < sentences.length + MAX_SECTIONS) {
    guard += 1;
    const index = result.findIndex(
      (section) =>
        section.end - section.start < MIN_SECTION_SENTENCES ||
        durationOf(sentences, section) < MIN_SECTION_DURATION_MS,
    );
    if (index < 0) break;
    mergeAt(index);
  }
  while (result.length > MAX_SECTIONS) {
    let smallest = 0;
    for (let index = 1; index < result.length; index += 1)
      if (
        durationOf(sentences, result[index]) <
        durationOf(sentences, result[smallest])
      )
        smallest = index;
    mergeAt(smallest);
  }
  return result;
}

function toSections(
  sentences: Sentence[],
  boundaries: number[],
): StructureSection[] {
  const raw: RawSection[] = [];
  let start = 0;
  for (const boundary of boundaries) {
    if (boundary <= start) continue;
    raw.push({ start, end: boundary });
    start = boundary;
  }
  if (start < sentences.length)
    raw.push({ start, end: sentences.length });
  return mergeSections(sentences, raw).map((section, index) => ({
    index: index + 1,
    startSentence: section.start,
    endSentence: section.end,
    startMs: sentences[section.start].startMs,
    endMs: sentences[section.end - 1].endMs,
    sentenceCount: section.end - section.start,
    wordCount: wordCountOf(sentences, section),
  }));
}

function component(
  available: boolean,
  score: number,
  reason: string,
  evidence: StructureEvidence[],
): StructureComponent {
  return { available, score: clamp(score, 0, 1), reason, evidence };
}

function unavailable(reason: string) {
  return component(false, 0, reason, []);
}

function evidenceWithin(
  evidence: StructureEvidence[],
  durationMs: number,
): StructureEvidence[] {
  return evidence
    .map((item) => {
      const start = clamp(item.startMs, 0, durationMs);
      const end = clamp(Math.max(start, item.endMs), start, durationMs);
      return { ...item, startMs: start, endMs: end };
    })
    .filter((item) => item.endMs > item.startMs);
}

export function analyzeStructure(
  words: readonly StructureWord[],
  durationMs?: number,
): StructureAnalysis {
  const sanitized = sanitizeWords(words, durationMs);
  const sentences = segmentSentences(sanitized.words);
  const duration = sanitized.durationMs;
  const wordCount = sentences.reduce(
    (sum, sentence) => sum + sentence.wordCount,
    0,
  );
  const markers = detectMarkers(sentences);
  const sections = toSections(
    sentences,
    sectionBoundaries(sentences, markers),
  );
  const openingMarkers = markers.filter((marker) => marker.kind === "open");
  const closingMarkers = markers.filter((marker) => marker.kind === "close");
  const transitionMarkers = markers.filter(
    (marker) => marker.kind === "sequence" || marker.kind === "boundary",
  );
  const transitionSentences = new Set(
    transitionMarkers.map((marker) => marker.sentenceIndex),
  );

  const components: Record<StructureComponentKey, StructureComponent> = {
    opening:
      sentences.length >= 1 && wordCount > 0
        ? component(
            true,
            openingMarkers.length ? 1 : 0,
            openingMarkers.length
              ? `Einstiegssignal „${openingMarkers[0].marker}“ in den ersten zwei Sätzen gefunden.`
              : "Kein Einstiegssignal in den ersten zwei Sätzen gefunden.",
            openingMarkers.map((marker) => ({
              startMs: marker.startMs,
              endMs: marker.endMs,
              label: `Einstieg: ${marker.marker}`,
            })),
          )
        : unavailable("Kein Satz für eine Einstiegsprüfung vorhanden."),
    closing:
      sentences.length >= 2
        ? component(
            true,
            closingMarkers.length ? 1 : 0,
            closingMarkers.length
              ? `Abschlusssignal „${closingMarkers[0].marker}“ in den letzten zwei Sätzen gefunden.`
              : "Kein Abschlusssignal in den letzten zwei Sätzen gefunden.",
            closingMarkers.map((marker) => ({
              startMs: marker.startMs,
              endMs: marker.endMs,
              label: `Abschluss: ${marker.marker}`,
            })),
          )
        : unavailable(
            "Mindestens zwei Sätze nötig, um einen Abschluss zu prüfen.",
          ),
    sections:
      sentences.length >= 4
        ? component(
            true,
            sections.length >= 2 ? 1 : 0,
            sections.length >= 2
              ? `${sections.length} Abschnitte aus ${sentences.length} Sätzen erkannt.`
              : "Kein Abschnittswechsel erkannt; der Text bleibt ein Abschnitt.",
            sections.map((section) => ({
              startMs: section.startMs,
              endMs: section.endMs,
              label: `Abschnitt ${section.index}`,
            })),
          )
        : unavailable(
            "Mindestens vier Sätze nötig, um Abschnitte zu prüfen.",
          ),
    transitions:
      sentences.length >= 3
        ? component(
            true,
            Math.min(1, transitionSentences.size / 2),
            `${transitionSentences.size} markierte Übergänge erkannt (Ziel: 2).`,
            transitionMarkers.map((marker) => ({
              startMs: marker.startMs,
              endMs: marker.endMs,
              label: `Übergang: ${marker.marker}`,
            })),
          )
        : unavailable(
            "Mindestens drei Sätze nötig, um Übergänge zu prüfen.",
          ),
  };

  for (const key of Object.keys(components) as StructureComponentKey[])
    components[key].evidence = evidenceWithin(
      components[key].evidence,
      duration,
    );

  const available = Object.values(components).filter(
    (item) => item.available,
  );
  const availableScores = available.map((item) => item.score);
  const availableCount = available.length;
  const language = detectLanguage(sentences);
  const score =
    availableCount >= MIN_SIGNALS &&
    wordCount >= MIN_SCORE_WORDS &&
    duration >= MIN_SCORE_DURATION_MS
      ? Math.round(
          (100 * availableScores.reduce((sum, item) => sum + item, 0)) /
            availableScores.length,
        )
      : null;
  const confidence: StructureAnalysis["confidence"] =
    score === null
      ? "low"
      : wordCount >= 150 &&
          duration >= 90_000 &&
          sentences.length >= 8 &&
          availableCount === 4
        ? "high"
        : wordCount >= 80 && duration >= 60_000 && availableCount >= 3
          ? "medium"
          : "low";
  const limitations = [
    "Die Aufbauanalyse nutzt nur Wörter und Zeitstempel; Betonung, Mimik und Folien sind nicht enthalten.",
    "Marker und Abschnittsgrenzen sind Heuristiken; ein fehlender Marker belegt keinen fehlenden Übergang.",
  ];
  if (language === "mixed")
    limitations.push(
      "Gemischte Sprache erkannt; Marker beider Sprachen werden geprüft.",
    );
  if (score === null)
    limitations.push(
      "Ohne mindestens drei Signale, 50 Wörter und 45 Sekunden wird kein Aufbau-Score berechnet.",
    );
  if (sections.length >= MAX_SECTIONS)
    limitations.push("Die Analyse ist auf acht Abschnitte begrenzt.");

  return {
    version: "structure-rubric-v1",
    language,
    wordCount,
    sentenceCount: sentences.length,
    components,
    sections,
    markers,
    score,
    dataCoverage: availableCount / 4,
    confidence,
    limitations,
  };
}

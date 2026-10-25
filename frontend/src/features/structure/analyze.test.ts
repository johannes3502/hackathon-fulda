import { describe, expect, it } from "vitest";
import { analyzeStructure } from "./analyze";
import {
  emptyFixture,
  englishTalk,
  germanTalk,
  manyTopicsFixture,
  noPunctuationFixture,
  oneSentenceFixture,
  repeatedWordsFixture,
  shortDurationFixture,
  transcript,
} from "./fixtures";

const within = (analysis: ReturnType<typeof analyzeStructure>, duration: number) => {
  const moments = [
    ...analysis.markers,
    ...analysis.sections,
    ...Object.values(analysis.components).flatMap((component) =>
      component.evidence,
    ),
  ];
  expect(
    moments.every(
      (moment) =>
        moment.startMs >= 0 &&
        moment.endMs <= duration &&
        moment.endMs >= moment.startMs,
    ),
  ).toBe(true);
};

describe("deterministic structure analysis", () => {
  it("keeps an empty take empty and scoreless", () => {
    const analysis = analyzeStructure(emptyFixture.words, emptyFixture.durationMs);
    expect(analysis).toMatchObject({
      version: "structure-rubric-v1",
      wordCount: 0,
      sentenceCount: 0,
      score: null,
      dataCoverage: 0,
      confidence: "low",
    });
    expect(
      Object.values(analysis.components).every(
        (component) => !component.available,
      ),
    ).toBe(true);
    expect(analysis.sections).toEqual([]);
    expect(analysis.markers).toEqual([]);
  });

  it("needs at least three available signals and enough words and time", () => {
    const single = analyzeStructure(
      oneSentenceFixture.words,
      oneSentenceFixture.durationMs,
    );
    expect(single.sentenceCount).toBe(1);
    expect(single.wordCount).toBeGreaterThan(0);
    expect(single.wordCount).toBeLessThan(50);
    expect(single.components.opening.available).toBe(true);
    expect(single.components.closing.available).toBe(false);
    expect(single.score).toBeNull();

    const short = analyzeStructure(
      shortDurationFixture.words,
      shortDurationFixture.durationMs,
    );
    expect(short.wordCount).toBeGreaterThanOrEqual(50);
    expect(short.score).toBeNull();
  });

  it("scores a structured German talk with all four signals", () => {
    const analysis = analyzeStructure(
      germanTalk.words,
      germanTalk.durationMs,
    );
    expect(analysis.language).toBe("de");
    expect(analysis.wordCount).toBeGreaterThanOrEqual(50);
    expect(analysis.sentenceCount).toBeGreaterThanOrEqual(4);
    expect(analysis.components.opening).toMatchObject({
      available: true,
      score: 1,
    });
    expect(analysis.components.closing).toMatchObject({
      available: true,
      score: 1,
    });
    expect(analysis.components.sections.available).toBe(true);
    expect(analysis.components.transitions.available).toBe(true);
    expect(analysis.score).not.toBeNull();
    expect(analysis.dataCoverage).toBe(1);
    expect(analysis.limitations.length).toBeGreaterThan(0);
    within(analysis, germanTalk.durationMs);
  });

  it("detects the dominant language and scores an English talk", () => {
    const analysis = analyzeStructure(
      englishTalk.words,
      englishTalk.durationMs,
    );
    expect(analysis.language).toBe("en");
    expect(analysis.score).not.toBeNull();
    expect(analysis.components.opening.score).toBe(1);
    expect(analysis.components.closing.score).toBe(1);
    within(analysis, englishTalk.durationMs);
  });

  it("segments sentences without punctuation using long gaps", () => {
    const analysis = analyzeStructure(
      noPunctuationFixture.words,
      noPunctuationFixture.durationMs,
    );
    expect(analysis.sentenceCount).toBe(3);
    expect(analysis.wordCount).toBeGreaterThanOrEqual(50);
    expect(analysis.score).not.toBeNull();
    expect(analysis.components.opening.score).toBe(1);
    expect(analysis.components.closing.score).toBe(1);
    within(analysis, noPunctuationFixture.durationMs);
  });

  it("segments very long unpunctuated sentences at forty words", () => {
    const words = Array.from({ length: 80 }, (_, index) => `wort${index}`);
    const fixture = transcript("forty words", [`${words.join(" ")}.`], {
      sentenceMs: 80000,
    });
    const analysis = analyzeStructure(fixture.words, fixture.durationMs);
    expect(analysis.sentenceCount).toBe(2);
    expect(analysis.wordCount).toBe(80);
  });

  it("does not split repeated topic words into many sections", () => {
    const analysis = analyzeStructure(
      repeatedWordsFixture.words,
      repeatedWordsFixture.durationMs,
    );
    expect(analysis.language).toBe("de");
    expect(analysis.sections.length).toBeLessThanOrEqual(8);
    expect(analysis.score).not.toBeNull();
  });

  it("caps many topics at eight sections and keeps evidence in bounds", () => {
    const analysis = analyzeStructure(
      manyTopicsFixture.words,
      manyTopicsFixture.durationMs,
    );
    expect(analysis.wordCount).toBeGreaterThanOrEqual(50);
    expect(analysis.sections.length).toBe(8);
    expect(analysis.score).not.toBeNull();
    within(analysis, manyTopicsFixture.durationMs);
  });

  it("is deterministic for the same words and duration", () => {
    const first = analyzeStructure(germanTalk.words, germanTalk.durationMs);
    const second = analyzeStructure(germanTalk.words, germanTalk.durationMs);
    expect(first).toEqual(second);
  });

  it("does not invent a score when only one or two signals are available", () => {
    const two = transcript(
      "two signals",
      ["Zu Beginn erklären wir das Lernen.", "Zum Schluss danken wir dem Team."],
      { sentenceMs: 30000 },
    );
    const analysis = analyzeStructure(two.words, two.durationMs);
    expect(analysis.components.opening.available).toBe(true);
    expect(analysis.components.closing.available).toBe(true);
    expect(analysis.components.sections.available).toBe(false);
    expect(analysis.components.transitions.available).toBe(false);
    expect(analysis.score).toBeNull();
    expect(analysis.dataCoverage).toBeLessThan(0.75);
  });
});

export type StructureWord = {
  word: string;
  start_ms: number;
  end_ms: number;
};

export type StructureLanguage = "de" | "en" | "mixed";
export type StructureConfidence = "low" | "medium" | "high";
export type StructureMarkerKind = "open" | "close" | "sequence" | "boundary";
export type StructureComponentKey =
  | "opening"
  | "closing"
  | "sections"
  | "transitions";

export type StructureEvidence = {
  startMs: number;
  endMs: number;
  label: string;
};

export type StructureMarker = {
  kind: StructureMarkerKind;
  marker: string;
  sentenceIndex: number;
  startMs: number;
  endMs: number;
  strong: boolean;
};

export type StructureComponent = {
  available: boolean;
  score: number;
  reason: string;
  evidence: StructureEvidence[];
};

export type StructureSection = {
  index: number;
  startSentence: number;
  endSentence: number;
  startMs: number;
  endMs: number;
  sentenceCount: number;
  wordCount: number;
};

export type StructureAnalysis = {
  version: "structure-rubric-v1";
  language: StructureLanguage;
  wordCount: number;
  sentenceCount: number;
  components: Record<StructureComponentKey, StructureComponent>;
  sections: StructureSection[];
  markers: StructureMarker[];
  score: number | null;
  dataCoverage: number;
  confidence: StructureConfidence;
  limitations: string[];
};

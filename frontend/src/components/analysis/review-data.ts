import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { evidenceVerdict, type ClaimResult } from "@/features/factcheck/api";
import { STAT_LABELS } from "@/components/stats/stats";
import { cueAppearance } from "@/features/live/cue-appearance";
import { recordingFeedback, structureForRecording } from "@/features/live/review";
import type { StructureAnalysis } from "@/features/structure/types";

export type Criterion = keyof typeof STAT_LABELS;
export type ReviewMoment = {
  id: string;
  tMs: number;
  durationMs: number;
  criterion: Criterion | null;
  kind: "positive" | "attention" | "note";
  assessment?: "positive" | "attention" | "neutral";
  title: string;
  detail: string;
  action: string;
  quote?: string;
  source?: { title: string; quote: string; href?: string };
};
export type PerformancePoint = { tMs: number; value: number };
export type ReviewData = {
  title: string;
  durationMs: number;
  videoUrl: string;
  poster?: string;
  demo: boolean;
  notice?: string;
  performance: PerformancePoint[];
  moments: ReviewMoment[];
  claims?: ClaimResult[];
  structure?: StructureAnalysis;
};

export function timestamp(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function boundedTime(ms: number, durationMs: number) {
  return Math.max(
    0,
    Math.min(Number.isFinite(ms) ? ms : 0, Math.max(0, durationMs)),
  );
}

/** Interpolation is only for displaying supplied scores; events do not create scores. */
export function performanceAt(
  points: PerformancePoint[],
  tMs: number,
): number | null {
  if (!points.length) return null;
  if (tMs <= points[0].tMs) return points[0].value;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1];
    const right = points[index];
    if (tMs <= right.tMs) {
      const fraction = (tMs - left.tMs) / Math.max(1, right.tMs - left.tMs);
      return left.value + (right.value - left.value) * fraction;
    }
  }
  return points[points.length - 1].value;
}

export function feedbackToMoment(
  item: LiveFeedback,
  claim?: ClaimResult,
): ReviewMoment {
  const verdict = claim ? evidenceVerdict(claim) : undefined;
  const categories: Record<string, Criterion> = {
    gestures: "gesture",
    gesture: "gesture",
    posture: "gesture",
    gaze: "gesture",
    head: "gesture",
    fact: "knowledge",
    content: "knowledge",
    knowledge: "knowledge",
    filler: "flow",
    pause: "flow",
    pace: "flow",
    volume: "flow",
    pitch: "flow",
    flow: "flow",
    structure: "structure",
  };
  return {
    id: item.id,
    tMs: item.startMs,
    durationMs: Math.max(0, item.endMs - item.startMs),
    criterion: categories[item.category.toLowerCase()] ?? null,
    kind:
      item.kind === "suggestion" || item.kind === "observation"
        ? "note"
        : item.kind,
    assessment: verdict
      ? verdict === "supports"
        ? "positive"
        : verdict === "contradicts"
          ? "attention"
          : "neutral"
      : item.kind === "positive"
        ? "positive"
        : cueAppearance(item, "ready").tone === "attention"
          ? "attention"
          : "neutral",
    title: item.title,
    detail: claim?.explanation || item.detail,
    action: item.action,
    quote: claim?.transcript,
    source: claim?.evidence
      ? {
          title: claim.evidence.label,
          quote: claim.evidence.quote,
          href:
            claim.evidence.url && /^https?:\/\//i.test(claim.evidence.url)
              ? claim.evidence.url
              : undefined,
        }
      : undefined,
  };
}

/** Both review views read this take, including source checks added after capture. */
export function recordingReviewData(recording: LiveRecording): ReviewData {
  const structure = structureForRecording(recording);
  const take = structure ? { ...recording, structure } : recording;
  return {
    title: recording.config.title,
    durationMs: recording.durationMs,
    videoUrl: recording.videoUrl,
    demo: false,
    notice: recording.notice ?? undefined,
    performance: [],
    claims: recording.factCheck?.claims,
    structure,
    moments: recordingFeedback(take).map((item) => {
      const factIndex = /^fact-(\d+)$/.exec(item.id);
      const claim = factIndex
        ? recording.factCheck?.claims[Number(factIndex[1])]
        : undefined;
      return feedbackToMoment(item, claim);
    }),
  };
}

/** Every value, annotation and source in this fixture is synthetic. */
export const DEMO_REVIEW: ReviewData = {
  title: "Lernen, das zu dir passt",
  durationMs: 90_000,
  videoUrl: "/review-demo/presentation.mp4",
  poster: "/review-demo/poster.png",
  demo: true,
  performance: [],
  claims: [
    {
      claim:
        "Die Plattform verbindet eine Lernfrage mit einer gemeinsamen Übung und einer kurzen Reflexion.",
      transcript:
        "Die fiktive Lernplattform verbindet eine Lernfrage mit einer gemeinsamen Übung und einer kurzen Reflexion.",
      t_ms: 6_000,
      duration_ms: 4_000,
      verdict: "supports",
      explanation:
        "Das synthetische Demo-Konzept beschreibt dieselbe Verbindung.",
      checked: ["upload"],
      evidence: {
        kind: "upload",
        label: "Demo-Konzept · Abschnitt 1",
        passage:
          "Die fiktive Lernplattform verbindet eine Lernfrage mit einer gemeinsamen Übung und einer kurzen Reflexion.",
        quote:
          "Die fiktive Lernplattform verbindet eine Lernfrage mit einer gemeinsamen Übung und einer kurzen Reflexion.",
        quote_verified: "exact",
        filename: "source.txt",
      },
    },
    {
      claim: "Der erste Pilot startet mit zwanzig Teilnehmenden.",
      transcript: "Unser erster Pilot startet mit zwanzig Teilnehmenden.",
      t_ms: 43_000,
      duration_ms: 5_000,
      verdict: "contradicts",
      explanation:
        "Das Demo-Konzept nennt zwölf Teilnehmende für den ersten Pilot.",
      checked: ["upload"],
      evidence: {
        kind: "upload",
        label: "Demo-Konzept · Abschnitt 2",
        passage:
          "Für den ersten Demo-Pilot sind 12 Teilnehmende vorgesehen.",
        quote: "Für den ersten Demo-Pilot sind 12 Teilnehmende vorgesehen.",
        quote_verified: "exact",
        filename: "source.txt",
      },
    },
    {
      claim: "Der Erfolg des Piloten wird an einer konkreten Lernaufgabe gemessen.",
      transcript: "Danach schauen wir, ob unser Ansatz funktioniert.",
      t_ms: 83_000,
      duration_ms: 4_000,
      verdict: "not_found",
      explanation:
        "Im Demo-Konzept ist noch keine konkrete Lernaufgabe festgelegt.",
      checked: ["upload"],
    },
  ],
  moments: [
    {
      id: "opening",
      tMs: 8000,
      durationMs: 10000,
      criterion: "structure",
      kind: "positive",
      title: "Ein Einstieg, der Orientierung gibt",
      detail:
        "Problem, Idee und Ausblick werden in einem Satz angekündigt. Das Publikum weiß, was als Nächstes kommt.",
      action: "Behalte diesen kurzen Wegweiser am Anfang bei.",
      quote:
        "Erst das Problem, dann unsere Idee und zum Schluss der nächste Schritt.",
    },
    {
      id: "gesture",
      tMs: 18000,
      durationMs: 10000,
      criterion: "gesture",
      kind: "positive",
      title: "Die Geste unterstützt deine Aussage",
      detail:
        "Eine offene Handbewegung begleitet den Vergleich. Bewegung und Aussage passen im Beispiel zusammen.",
      action:
        "Setze die Geste gezielt auf das Schlüsselwort und lass die Hände danach ruhig werden.",
    },
    {
      id: "hesitation",
      tMs: 31000,
      durationMs: 8000,
      criterion: "flow",
      kind: "attention",
      title: "Hier stockt der Sprechfluss",
      detail:
        "Mehrere Wortansätze und Füllwörter unterbrechen den Gedanken. Gemeint ist dieser einzelne Moment, keine Diagnose.",
      action:
        "Mach eine kurze Pause und beginne den Satz mit der Kernaussage neu.",
      quote: "Die, die Idee ist, ähm, dass wir … dass alle gemeinsam lernen.",
    },
    {
      id: "fact",
      tMs: 43000,
      durationMs: 5000,
      criterion: "knowledge",
      kind: "attention",
      title: "Diese Zahl passt nicht zur Quelle",
      detail:
        "Im Vortrag werden 20 Teilnehmende genannt. Im synthetischen Konzept stehen 12. Gleiche die Zahl ab und nenne die Quelle.",
      action:
        "Formuliere: Für den ersten Demo-Pilot sind zwölf Teilnehmende vorgesehen.",
      quote: "Unser erster Pilot startet mit zwanzig Teilnehmenden.",
      source: {
        title: "Demo-Konzept · Abschnitt 2",
        quote: "Für den ersten Demo-Pilot sind 12 Teilnehmende vorgesehen.",
        href: "/review-demo/source.txt",
      },
    },
    {
      id: "transition",
      tMs: 58000,
      durationMs: 10000,
      criterion: "structure",
      kind: "positive",
      title: "Klarer Übergang zum nächsten Schritt",
      detail:
        "Eine kurze Zusammenfassung verbindet die Idee mit dem geplanten Pilot. Der rote Faden bleibt erkennbar.",
      action:
        "Behalte die Überleitung bei und gib dem neuen Abschnitt eine kurze Pause.",
    },
    {
      id: "pause",
      tMs: 72000,
      durationMs: 6000,
      criterion: "flow",
      kind: "positive",
      title: "Die Pause lässt den Gedanken wirken",
      detail:
        "Nach der Kernaussage entsteht bewusst Raum. Im Beispiel unterstützt die Pause das Verständnis.",
      action: "Lass wichtige Aussagen kurz stehen, bevor du weitergehst.",
    },
    {
      id: "closing",
      tMs: 83000,
      durationMs: 4000,
      criterion: "knowledge",
      kind: "note",
      title: "Den Erfolg des Piloten präzisieren",
      detail:
        "Der nächste Schritt ist benannt. Offen bleibt, woran ihr erkennt, ob die Idee beim Lernen hilft.",
      action:
        "Ergänze eine konkrete Lernaufgabe, die ihr im Pilot beobachten wollt.",
      quote: "Danach schauen wir, ob unser Ansatz funktioniert.",
    },
  ],
};

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StageConsole } from "@/components/stage/StageConsole";
import {
  stageAnalysisMode,
  stageModeEnabled,
} from "@/features/stage/config";

export const metadata: Metadata = {
  title: "418 · Pitch Mode",
  description:
    "Lokale Jury-Demo für 418 Pitch Practice: Aufnahme, Review und eine vorbereitete Datenschutzfrage.",
  robots: { index: false, follow: false },
};

export default function StagePage() {
  if (!stageModeEnabled(process.env.NEXT_PUBLIC_STAGE_MODE)) notFound();
  return (
    <StageConsole
      analysis={stageAnalysisMode(process.env.NEXT_PUBLIC_STAGE_ANALYSIS)}
    />
  );
}

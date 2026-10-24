import type { Metadata } from "next";
import { ReviewAnalysis } from "@/components/analysis/ReviewAnalysis";
import { DEMO_REVIEW } from "@/components/analysis/review-data";

export const metadata: Metadata = { title: "418 — Deine Analyse" };

export default function ReviewPreviewPage() {
  return <ReviewAnalysis data={DEMO_REVIEW} />;
}

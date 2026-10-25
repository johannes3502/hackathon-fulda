import type { Metadata } from "next";
import { ReviewAnalysis } from "@/components/analysis/ReviewAnalysis";
import {
  DEMO_REVIEW,
  SHOWCASE_REVIEW,
} from "@/components/analysis/review-data";

export const metadata: Metadata = { title: "418 — Deine Analyse" };

export default async function ReviewPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const capture = (await searchParams).capture === "1";
  return (
    <ReviewAnalysis
      data={capture ? SHOWCASE_REVIEW : DEMO_REVIEW}
      capture={capture}
    />
  );
}

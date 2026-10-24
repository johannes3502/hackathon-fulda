import type { Metadata } from "next";
import { StatsPreview } from "@/components/stats/StatsCard";

export const metadata: Metadata = { title: "418 — Deine Stats" };

export default function StatsPreviewPage() {
  return <StatsPreview />;
}

import type { Metadata } from "next";
import { StatsDashboard } from "@/components/stats/StatsCard";

export const metadata: Metadata = { title: "418 — Deine Aufnahmen" };

export default function StatsPreviewPage() {
  return <StatsDashboard />;
}

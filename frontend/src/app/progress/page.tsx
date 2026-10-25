import type { Metadata } from "next";
import { ProgressDashboard } from "@/features/progress/ProgressDashboard";

export const metadata: Metadata = {
  title: "Fortschritt – 418 Präsentationstraining",
  description:
    "Entwicklung deiner Präsentationsübungen mit Rohpunkten, Qualitätsmarkern und Trends. Kein Gesamtscore.",
};

export default function ProgressPage() {
  return <ProgressDashboard />;
}

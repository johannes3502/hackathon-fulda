import type { Metadata } from "next";
import { StatsDashboard } from "@/components/stats/StatsCard";

export const metadata: Metadata = {
  title: "418 – Präsentationstraining",
  description:
    "Nimm deine Präsentation auf und prüfe konkrete Momente mit Zeitmarken. Ein Prototyp für Präsentationscoaching.",
};

export default function Page() {
  return <StatsDashboard />;
}

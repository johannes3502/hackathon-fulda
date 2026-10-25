import type { Metadata } from "next";
import { StatsDashboard } from "@/components/stats/StatsCard";

export const metadata: Metadata = {
  title: "418 – Referate und Präsentationen üben",
  description:
    "Übe Referate und Abschlusspräsentationen mit Feedback zu Sprache, Gestik und Fachwissen. Prüfe Aussagen an Lernmaterialien und bereite dich auf Rückfragen vor.",
};

export default function Page() {
  return <StatsDashboard />;
}

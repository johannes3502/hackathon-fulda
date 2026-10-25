import { LiveStudio } from "@/components/live/LiveStudio";
import { notFound } from "next/navigation";
import { stageModeEnabled } from "@/features/stage/config";

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; local?: string; analysis?: string }>;
}) {
  const params = await searchParams;
  const stage = params.stage === "1";
  if (stage && !stageModeEnabled(process.env.NEXT_PUBLIC_STAGE_MODE))
    notFound();
  const analysis =
    params.analysis === "local" || params.analysis === "live"
      ? params.analysis
      : undefined;
  return (
    <LiveStudio
      key={`${stage ? "stage" : "studio"}-${params.local ?? ""}-${analysis ?? ""}`}
      stage={stage}
      initialLocal={stage && params.local === "1"}
      stageAnalysis={analysis}
    />
  );
}

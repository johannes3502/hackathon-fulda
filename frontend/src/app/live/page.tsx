import { LiveStudio } from "@/components/live/LiveStudio";

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; local?: string; analysis?: string }>;
}) {
  const params = await searchParams;
  const stage = params.stage === "1";
  const analysis =
    params.analysis === "local" || params.analysis === "live"
      ? params.analysis
      : undefined;
  return (
    <LiveStudio
      stage={stage}
      initialLocal={params.local === "1"}
      stageAnalysis={analysis}
    />
  );
}

import { LiveAnalysis } from "@/components/analysis/LiveAnalysis";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveAnalysis sessionId={sessionId} />;
}

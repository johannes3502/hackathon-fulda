import { LiveReview } from "@/components/live/LiveReview";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { sessionId } = await params;
  const { stage } = await searchParams;
  return <LiveReview sessionId={sessionId} stage={stage === "1"} />;
}

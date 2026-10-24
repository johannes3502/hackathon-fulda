import { LiveReview } from "@/components/live/LiveReview";
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveReview sessionId={sessionId} />;
}

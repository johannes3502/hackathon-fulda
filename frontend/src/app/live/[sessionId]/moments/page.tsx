import { FeedbackReplay } from "@/components/live/FeedbackReplay";
export default async function MomentsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <FeedbackReplay sessionId={sessionId} />;
}

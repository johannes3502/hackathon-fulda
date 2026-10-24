import { SessionProvider } from "@/features/coach/SessionProvider";
export default async function PracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <SessionProvider key={sessionId} sessionId={sessionId}>
      {children}
    </SessionProvider>
  );
}

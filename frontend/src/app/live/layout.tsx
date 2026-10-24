import { LiveSessionProvider } from "@/features/live/LiveSessionProvider";
export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LiveSessionProvider>{children}</LiveSessionProvider>;
}

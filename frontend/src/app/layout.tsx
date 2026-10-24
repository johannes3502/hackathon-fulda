import type { Metadata } from "next";
import { LiveSessionProvider } from "@/features/live/LiveSessionProvider";
import { appearanceScript } from "@/lib/appearance";
import "@fontsource-variable/open-sans";
import "./globals.css";
import "./live.css";
import "./sources.css";
import "./experience.css";
export const metadata: Metadata = {
  title: "418 — Presentation practice",
  description:
    "Record your presentation, review specific moments, and practice follow-up questions. A presentation coaching prototype.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <LiveSessionProvider>{children}</LiveSessionProvider>
      </body>
    </html>
  );
}

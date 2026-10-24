import type { Metadata } from "next";
import Script from "next/script";
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
      <body>
        {/* Sets the saved appearance before hydration to avoid a theme flash. */}
        <Script id="appearance" strategy="beforeInteractive">
          {appearanceScript}
        </Script>
        <LiveSessionProvider>{children}</LiveSessionProvider>
      </body>
    </html>
  );
}

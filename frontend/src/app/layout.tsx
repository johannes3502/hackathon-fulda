import type { Metadata } from "next";
import "@fontsource/noto-serif-display/latin-400.css";
import "./globals.css";
import "./live.css";
import "./sources.css";
export const metadata: Metadata = {
  title: "418 — Presentation practice",
  description:
    "Practice a pitch, face a demanding question, and leave with one useful next step. A transparent, simulated coaching demo.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

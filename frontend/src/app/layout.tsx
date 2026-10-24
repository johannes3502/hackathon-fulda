import type { Metadata } from "next";
import "./globals.css";
import "./live.css";
export const metadata: Metadata = {
  title: "Pitch Coach — A clearer story",
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

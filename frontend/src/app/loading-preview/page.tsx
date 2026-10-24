import type { Metadata } from "next";
import { LoadingScreen } from "@/components/loading/LoadingScreen";

export const metadata: Metadata = { title: "418 — Loading" };

export default function LoadingPreviewPage() {
  return <LoadingScreen />;
}

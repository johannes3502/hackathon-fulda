"use client";
import { useEffect, useRef } from "react";
import type { PoseEvent } from "@/features/pose/evaluation";

export function PoseEventDownload({ events }: { events?: PoseEvent[] }) {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!events?.length || !link.current) return;
    const next = URL.createObjectURL(
      new Blob([JSON.stringify(events, null, 2)], { type: "application/json" }),
    );
    link.current.href = next;
    return () => URL.revokeObjectURL(next);
  }, [events]);
  return events?.length ? (
    <a ref={link} className="text-button" download="gesture-events.json">
      Download gesture evidence JSON
    </a>
  ) : null;
}

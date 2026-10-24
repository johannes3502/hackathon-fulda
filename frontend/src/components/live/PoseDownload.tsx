"use client";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
export function PoseDownload({ blob }: { blob?: Blob }) {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!blob || !link.current) return;
    const url = URL.createObjectURL(blob);
    link.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return blob ? (
    <Button asChild variant="outline">
      <a ref={link} download="pose-samples.jsonl">
        Download pose JSONL
      </a>
    </Button>
  ) : null;
}

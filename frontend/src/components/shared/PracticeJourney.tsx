"use client";

import Link from "next/link";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import { FileText, Video, MessageSquare } from "lucide-react";

export function PracticeJourney({ pathname }: { pathname: string }) {
  const { recordings } = useLiveSessions();
  if (!/^\/(live|sources|review-preview)(\/|$)/.test(pathname)) return null;
  const review =
    pathname.startsWith("/review-preview") || /^\/live\/[^/]+\//.test(pathname);
  const latest = Object.values(recordings).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const sessionId = /^\/live\/([^/]+)\//.exec(pathname)?.[1] ?? latest?.id;
  const steps = [
    {
      href: "/sources",
      label: "Prepare",
      detail: "Add your sources",
      icon: FileText,
      active: pathname === "/sources",
    },
    {
      href: "/live",
      label: "Record",
      detail: "Practice your presentation",
      icon: Video,
      active: pathname === "/live",
    },
    {
      href: sessionId ? `/live/${sessionId}/review` : "/review-preview",
      label: sessionId ? "Review" : "Review example",
      detail: sessionId ? "Revisit your take" : "Explore an example",
      icon: MessageSquare,
      active: review,
    },
  ];
  return (
    <nav className="practice-journey" aria-label="Presentation workflow">
      <ol>
        {steps.map(({ href, label, detail, icon: Icon, active }, index) => (
          <li key={label}>
            <Link href={href} aria-current={active ? "step" : undefined}>
              <span className="journey-number" aria-hidden="true">
                {index + 1}
              </span>
              <Icon size={18} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

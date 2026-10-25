"use client";
import { type ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { usePathname } from "next/navigation";
import { CircleHelp, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AppearanceSelect } from "./AppearanceSelect";
import { PracticeJourney } from "./PracticeJourney";

export function DemoBadge() {
  return (
    <span className="demo-badge">
      <FlaskConical size={13} /> Simulated coaching
    </span>
  );
}

export function AppShell({
  children,
  experience = "sample",
}: {
  children: ReactNode;
  step?: number;
  experience?: "sample" | "live";
}) {
  const pathname = usePathname();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-brand-group">
          <Link href="/" className="brand" aria-label="418 home">
            <BrandLogo />
          </Link>
        </div>
        <nav aria-label="Main navigation" className="app-nav">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Home
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Native hash navigation moves keyboard focus to the recordings section. */}
          <a href="/#past-recordings">Vergangene Aufnahmen</a>
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
          >
            Admin
          </Link>
        </nav>
        <div className="header-actions">
          <AppearanceSelect />
          <Dialog
            title="How this practice works"
            description={
              experience === "live"
                ? "Record a camera session, inspect feedback, and revisit the exact moments."
                : undefined
            }
            trigger={
              <Button variant="ghost" size="icon" aria-label="How it works">
                <CircleHelp size={20} />
              </Button>
            }
          >
            {experience === "live" ? (
              <>
                <ol className="help-list">
                  <li>
                    Enable your camera and check that your upper body is
                    visible. Camera and microphone are used for every recording.
                    Hold a neutral position for 3 seconds to calibrate gesture
                    feedback.
                  </li>
                  <li>Start recording when you are ready.</li>
                  <li>
                    Review your video and the feedback received during that
                    recording.
                  </li>
                  <li>
                    Open a feedback moment to replay it with surrounding
                    context.
                  </li>
                </ol>
                <p>
                  Every recording uses live feedback and full backend analysis.
                  It captures video and microphone audio, sends audio during
                  recording for live feedback and uploads the complete take
                  after stopping. Live transcription additionally streams audio
                  to Deepgram’s EU endpoint when enabled in Recording options;
                  local Whisper is the fallback. Camera and voice observations
                  are prototype heuristics, not quality scores. The synthetic
                  walkthrough is separately labelled and needs no camera.
                </p>
                <p>
                  Completed sessions are saved in this browser for later review.
                  Delete them in Recording details and exports. Clearing browser
                  data removes them; download important videos as a backup.
                  Backend retention is controlled by your backend.
                </p>
              </>
            ) : (
              <>
                <ol className="help-list">
                  <li>Set your presentation topic and learning context.</li>
                  <li>
                    Watch a sample presentation unfold, with optional local
                    camera preview.
                  </li>
                  <li>
                    Choose sample answers to explore the examiner’s follow-ups.
                  </li>
                  <li>Inspect the evidence and retry one answer.</li>
                </ol>
                <p>
                  No audio is captured. Camera video stays in your browser and
                  is not recorded, uploaded, or analyzed. Sample feedback does
                  not describe you.
                </p>
                <p>
                  Setup and demo reports are stored in this tab’s session
                  storage. Use synthetic presentation content.
                </p>
              </>
            )}
          </Dialog>
        </div>
      </header>
      <PracticeJourney pathname={pathname} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        <span>
          <ShieldCheck size={14} /> Practice for learning. No grades.
        </span>
        <span>Built for Hackathon Fulda 2026</span>
      </footer>
    </>
  );
}

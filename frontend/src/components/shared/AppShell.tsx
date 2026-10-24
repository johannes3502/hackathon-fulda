"use client";
import Link from "next/link";
import { CircleHelp, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ReactNode } from "react";
export function DemoBadge() {
  return (
    <span className="demo-badge">
      <FlaskConical size={13} /> Simulated coaching
    </span>
  );
}
export function AppShell({
  children,
  step = 1,
  experience = "sample",
}: {
  children: ReactNode;
  step?: number;
  experience?: "sample" | "live";
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="418 home">
          <span className="brand-mark">418</span>
          <span className="brand-caption">Presentation practice</span>
        </Link>
        <nav aria-label="Practice progress" className="step-nav">
          {(experience === "live"
            ? ["Record", "Review", "Replay"]
            : ["Start", "Practice", "Review"]
          ).map((label, index) => (
            <div
              key={label}
              className={
                step === index + 1 ? "current" : step > index + 1 ? "done" : ""
              }
              aria-current={step === index + 1 ? "step" : undefined}
            >
              <span>{step > index + 1 ? "✓" : index + 1}</span>
              {label}
            </div>
          ))}
        </nav>
        <Dialog
          title="How this practice works"
          description={
            experience === "live"
              ? "Record a camera session, inspect feedback, and revisit the exact moments."
              : undefined
          }
          trigger={
            <Button variant="ghost" size="sm" aria-label="How it works">
              <CircleHelp size={17} />
              <span className="help-label">How it works</span>
            </Button>
          }
        >
          {experience === "live" ? (
            <>
              <ol className="help-list">
                <li>
                  Choose demo feedback or audio analysis, then enable your
                  camera.
                </li>
                <li>Start recording when you are ready.</li>
                <li>
                  Review your video and the feedback received during that
                  recording.
                </li>
                <li>
                  Open a feedback moment to replay it with surrounding context.
                </li>
              </ol>
              <p>
                Demo mode records video locally without microphone audio and
                uses scripted feedback. Backend mode captures video and
                microphone audio and uploads the complete recording after you
                stop. Optional transcription uses the provider named in the
                studio.
              </p>
              <p>
                Recordings live in browser memory only. Download before
                refreshing or leaving the live workspace. Backend retention is
                controlled by your backend.
              </p>
            </>
          ) : (
            <>
              <ol className="help-list">
                <li>Set your pitch context and audience.</li>
                <li>
                  Watch a sample pitch unfold, with optional local camera
                  preview.
                </li>
                <li>
                  Choose sample answers to explore the judge’s follow-ups.
                </li>
                <li>Inspect the evidence and retry one answer.</li>
              </ol>
              <p>
                No audio is captured. Camera video stays in your browser and is
                not recorded, uploaded, or analyzed. Sample feedback does not
                describe you.
              </p>
              <p>
                Setup and demo reports are stored in this tab’s session storage.
                Use synthetic pitch content.
              </p>
            </>
          )}
        </Dialog>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        <span>
          <ShieldCheck size={14} /> A rehearsal, not a verdict.
        </span>
        <span>Built for Hackathon Fulda 2026</span>
      </footer>
    </>
  );
}

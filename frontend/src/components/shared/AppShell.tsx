"use client";
import Link from "next/link";
import {
  AudioLines,
  CircleHelp,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
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
        <Link href="/" className="brand" aria-label="Pitch Coach home">
          <span className="brand-symbol">
            <AudioLines size={23} strokeWidth={2.2} />
          </span>
          <span>
            pitch<span className="brand-light">coach</span>
            <span className="prototype-label">LAB</span>
          </span>
        </Link>
        <nav aria-label="Practice progress" className="step-nav">
          {(experience === "live"
            ? ["Record", "Review", "Replay"]
            : ["Set up", "Practice", "Reflect"]
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
                <li>Enable your camera for a local preview.</li>
                <li>
                  Choose demo feedback or your backend connection, then start
                  recording.
                </li>
                <li>
                  Review your video and the feedback received during that
                  recording.
                </li>
                <li>
                  Open a feedback moment to replay it with surrounding context.
                </li>
              </ol>
              <p>
                No microphone is captured. Backend mode sends encoded video
                chunks to the destination shown in the studio. Demo mode keeps
                video local and supplies scripted markers, not real detections.
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

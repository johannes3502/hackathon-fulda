"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CircleHelp,
  Eye,
  FileText,
  FlaskConical,
  LineChart,
  Menu,
  Play,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const DrawerContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function useNavigationDrawer() {
  return useContext(DrawerContext);
}

export function DrawerTriggerButton() {
  const { open, setOpen } = useNavigationDrawer();
  return (
    <Button
      variant="outline"
      size="sm"
      className="drawer-trigger"
      aria-label="Menü"
      aria-expanded={open}
      aria-controls="app-navigation-drawer"
      onClick={() => setOpen(!open)}
    >
      <Menu size={17} />
      <span className="drawer-trigger-label">Menü</span>
    </Button>
  );
}


export const NAV_ITEMS = [
  {
    href: "/",
    label: "Start & Aufnahmen",
    description: "Aufgenommene Takes, Dauer und Hinweise im Arbeitsbereich",
    icon: BarChart3,
  },
  {
    href: "/live",
    label: "Live-Studio",
    description: "Kamera- & Mikrofon-Aufnahme mit Echtzeit-Hinweisen",
    icon: Video,
  },
  {
    href: "/sources",
    label: "Quellen (RAG)",
    description: "PDF, PPTX & Notizen für den Fact-Check verwalten",
    icon: FileText,
  },
  {
    href: "/review-preview",
    label: "Analyse-Beispiel",
    description: "Synthetische Video-Momente auf einer Zeitachse",
    icon: LineChart,
  },
  {
    href: "/gestures",
    label: "Gesten-Walkthrough",
    description: "Synthetischer 22-Sekunden-Durchlauf der Haltungsregeln",
    icon: Eye,
  },
  {
    href: "/demo",
    label: "Sample Demo",
    description: "Geführte Pitch-Simulation mit Jury-Rückfragen",
    icon: Play,
  },
] as const;

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [drawerOpen]);

  return (
    <DrawerContext.Provider value={{ open: drawerOpen, setOpen: setDrawerOpen }}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-brand-group">
          <Button
            variant="outline"
            size="sm"
            className="drawer-trigger"
            aria-label="Menü"
            aria-expanded={drawerOpen}
            aria-controls="app-navigation-drawer"
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            <Menu size={17} />
            <span className="drawer-trigger-label">Menü</span>
          </Button>
          <Link href="/" className="brand" aria-label="418 home">
            <BrandLogo />
            <span className="brand-caption">Presentation studio</span>
          </Link>
        </div>
        <nav aria-label="Main navigation" className="app-nav">
          <Link
            href="/live"
            aria-current={pathname.startsWith("/live") ? "page" : undefined}
          >
            Studio
          </Link>
          <Link
            href="/sources"
            aria-current={pathname === "/sources" ? "page" : undefined}
          >
            Sources
          </Link>
          <Link
            href="/demo"
            aria-current={
              /^\/(demo|practice|gestures|review-preview)(\/|$)/.test(pathname)
                ? "page"
                : undefined
            }
          >
            Sample demo
          </Link>
        </nav>
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
                  Enable your camera and check that your upper body is visible.
                  Use Speech analysis above the camera to include audio. Hold a
                  neutral position for 3 seconds to calibrate gesture feedback.
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
                Live · in browser keeps video, microphone measurements and
                feedback local. Off · gestures only uses no microphone. Full
                backend analysis captures video and microphone audio, sends
                audio during recording for live feedback and uploads the
                complete take after stopping. Live transcription additionally
                streams audio to Deepgram’s EU endpoint when enabled in Recording
                options; local Whisper is the fallback. Camera and voice
                observations are prototype heuristics, not quality scores. The
                synthetic walkthrough is separately labelled and needs no
                camera.
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
      {drawerOpen && (
        <div className="nav-drawer-layer">
          <div
            className="nav-drawer-backdrop"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="app-navigation-drawer"
            className="nav-drawer"
            aria-label="Hauptnavigation"
          >
            <div className="nav-drawer-header">
              <div className="brand">
                <BrandLogo />
                <div>
                  <strong className="nav-drawer-title">Navigation</strong>
                  <span className="nav-drawer-subtitle">
                    Live-Präsentationstrainer
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Menü schließen"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <nav aria-label="App-Navigation" className="nav-drawer-list">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/" || pathname === "/stats-preview"
                    : pathname === item.href ||
                      pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-drawer-link${active ? " active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span className="nav-drawer-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="nav-drawer-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="nav-drawer-footer">
              <Link
                href="/live"
                className="button button-primary nav-drawer-cta"
                onClick={() => setDrawerOpen(false)}
              >
                <Video size={16} />
                Neue Aufnahme starten
              </Link>
              <span className="nav-drawer-meta">
                <ShieldCheck size={14} /> A rehearsal, not a verdict.
              </span>
            </div>
          </aside>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        <span>
          <ShieldCheck size={14} /> A rehearsal, not a verdict.
        </span>
        <span>Built for Hackathon Fulda 2026</span>
      </footer>
    </DrawerContext.Provider>
  );
}


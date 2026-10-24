"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Lightbulb,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { AppShell, DemoBadge } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { getGateway } from "@/features/coach/gateway";
import type { SessionConfig } from "@/features/coach/contracts";

export function SessionSetupForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] =
    useState<SessionConfig["audience"]>("hackathon");
  const [duration, setDuration] = useState(180000);
  const [mode, setMode] = useState<SessionConfig["mode"]>("coach");
  const [criteria, setCriteria] = useState([
    "Clarity",
    "Supporting evidence",
    "Delivery",
  ]);
  const [errors, setErrors] = useState<{
    title?: string;
    context?: string;
    request?: string;
  }>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  async function start(sample: boolean) {
    if (submitting.current) return;
    if (!sample && (!title.trim() || !context.trim())) {
      setErrors({
        title: !title.trim() ? "Give your pitch a title." : undefined,
        context: !context.trim()
          ? "Add a little context for your session."
          : undefined,
      });
      document
        .getElementById(!title.trim() ? "pitch-title" : "pitch-context")
        ?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    setErrors({});
    try {
      const gateway = getGateway();
      const config = sample
        ? gateway.getDefaults()
        : {
            title,
            context,
            audience,
            targetDurationMs: duration,
            mode,
            criteria,
          };
      const session = await gateway.createSession(config);
      router.push(`/practice/${session.ref.sessionId}`);
    } catch (error) {
      setErrors({
        request:
          error instanceof Error
            ? error.message
            : "Could not create practice. Please try again.",
      });
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <AppShell>
      <div className="setup-page">
        <div className="page-intro">
          <span className="intro-note">
            <span className="status-dot" /> Your next pitch starts here
          </span>
          <h1>
            A little practice.
            <br />
            <span>A clearer story.</span>
          </h1>
          <p>
            Find your flow, face the tough questions, and walk into
            <br className="desktop-break" /> your next pitch knowing what to
            improve.
          </p>
          <div className="live-entry">
            <Button asChild variant="outline">
              <Link href="/gestures">
                See gestures in 22 seconds <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/live">
                Open camera studio <ArrowRight size={17} />
              </Link>
            </Button>
            <span>
              Record your pitch, see feedback, and replay key moments.
            </span>
          </div>
        </div>
        <div className="setup-grid">
          <section className="setup-form panel">
            <div className="panel-heading">
              <div>
                <h2>Make it your rehearsal</h2>
                <p className="muted">Set the scene. We’ll take it from here.</p>
              </div>
              <span className="quiet-icon">
                <Target size={22} />
              </span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void start(false);
              }}
              noValidate
            >
              <fieldset disabled={pending} className="form-fields">
                <div className="field">
                  <label htmlFor="pitch-title">Pitch title</label>
                  <Input
                    id="pitch-title"
                    placeholder="e.g. A better way to learn"
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? "title-error" : undefined}
                  />
                  {errors.title && (
                    <p id="title-error" className="field-error">
                      {errors.title}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="pitch-context">What’s the big idea?</label>
                  <Textarea
                    id="pitch-context"
                    placeholder="What are you presenting, and what should your audience take away?"
                    maxLength={2000}
                    rows={3}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    aria-invalid={!!errors.context}
                    aria-describedby={
                      errors.context ? "context-error" : "context-hint"
                    }
                  />
                  <p id="context-hint" className="field-hint">
                    A few sentences are enough. Use synthetic content for this
                    demo.
                  </p>
                  {errors.context && (
                    <p id="context-error" className="field-error">
                      {errors.context}
                    </p>
                  )}
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="audience">Who’s listening?</label>
                    <NativeSelect
                      id="audience"
                      value={audience}
                      onChange={(e) =>
                        setAudience(e.target.value as SessionConfig["audience"])
                      }
                    >
                      <option value="hackathon">Hackathon jury</option>
                      <option value="investor">Investor</option>
                      <option value="examiner">University examiner</option>
                    </NativeSelect>
                  </div>
                  <fieldset className="field">
                    <legend>Pitch length</legend>
                    <div className="segment-control">
                      {[1, 3, 5].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          aria-pressed={duration === minutes * 60000}
                          onClick={() => setDuration(minutes * 60000)}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <fieldset className="field">
                  <legend>How do you want to practice?</legend>
                  <div className="mode-options">
                    <button
                      type="button"
                      className={
                        mode === "coach"
                          ? "mode-option selected"
                          : "mode-option"
                      }
                      aria-pressed={mode === "coach"}
                      onClick={() => setMode("coach")}
                    >
                      <Lightbulb size={19} />
                      <span>
                        <strong>Coach</strong>
                        <small>Helpful cues as you go</small>
                      </span>
                      <span className="radio-mark">
                        {mode === "coach" && <span />}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={
                        mode === "simulation"
                          ? "mode-option selected"
                          : "mode-option"
                      }
                      aria-pressed={mode === "simulation"}
                      onClick={() => setMode("simulation")}
                    >
                      <Target size={19} />
                      <span>
                        <strong>Simulation</strong>
                        <small>Feedback at the end</small>
                      </span>
                      <span className="radio-mark">
                        {mode === "simulation" && <span />}
                      </span>
                    </button>
                  </div>
                </fieldset>
                <details className="criteria-details">
                  <summary>
                    Focus areas{" "}
                    <span className="muted">{criteria.length} selected</span>
                  </summary>
                  <div className="criteria-options">
                    {["Clarity", "Supporting evidence", "Delivery"].map(
                      (item) => (
                        <label key={item}>
                          <input
                            type="checkbox"
                            checked={criteria.includes(item)}
                            onChange={(e) =>
                              setCriteria(
                                e.target.checked
                                  ? [...criteria, item]
                                  : criteria.filter((c) => c !== item),
                              )
                            }
                          />
                          {item}
                        </label>
                      ),
                    )}
                  </div>
                </details>
                <Button
                  type="submit"
                  className="start-button"
                  disabled={pending}
                >
                  {pending ? "Preparing your studio…" : "Start practice"}
                  <ArrowRight size={18} />
                </Button>
              </fieldset>
              {errors.request && (
                <p className="status-error" role="alert">
                  {errors.request}
                </p>
              )}
            </form>
            <p className="form-footnote">
              <ShieldCheck size={14} /> No camera or microphone required.
            </p>
          </section>
          <aside className="setup-aside">
            <div className="preview-card">
              <div className="preview-top">
                <span>
                  <span className="status-dot" /> YOUR PRACTICE SPACE
                </span>
                <span>
                  <Clock3 size={13} /> {duration / 60000} min
                </span>
              </div>
              <div className="preview-center">
                <span className="preview-orb">
                  <AudioGlyph />
                </span>
                <h2>Room to find your voice.</h2>
                <p>
                  No audience pressure.
                  <br />
                  Just you, your idea, and a next step.
                </p>
              </div>
              <div className="preview-caption">
                <Lightbulb size={17} />
                <span>One useful cue. At the right moment.</span>
              </div>
            </div>
            <div className="journey">
              <h3>A small rehearsal. A useful takeaway.</h3>
              {[
                [
                  Play,
                  "Practice your pitch",
                  "Keep your pace and your story in view.",
                ],
                [
                  MessageSquare,
                  "Meet your toughest question",
                  "A judge follows the evidence, then asks more.",
                ],
                [
                  Check,
                  "Leave with a next step",
                  "Review a moment. Try it again.",
                ],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof Play;
                return (
                  <div className="journey-step" key={String(title)}>
                    <span>
                      <I size={17} />
                    </span>
                    <div>
                      <strong>{String(title)}</strong>
                      <p>{String(text)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sample-entry">
              <div>
                <Sparkles size={18} />
                <strong>Just exploring?</strong>
              </div>
              <p>Try a prepared pitch and see the full coaching loop.</p>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => void start(true)}
              >
                Try sample demo <ChevronRight size={16} />
              </Button>
            </div>
          </aside>
        </div>
        <div className="demo-disclosure">
          <DemoBadge />
          <p>
            All transcripts, observations, and judge responses use a prepared
            scenario. Custom context is saved, but does not generate new
            analysis.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
function AudioGlyph() {
  return (
    <span className="audio-glyph" aria-hidden="true">
      {[12, 24, 38, 28, 48, 32, 18].map((h, i) => (
        <i key={i} style={{ height: h }} />
      ))}
    </span>
  );
}

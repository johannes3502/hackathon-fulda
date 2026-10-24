"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Lightbulb,
  Play,
  ShieldCheck,
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
          <h1>Practice. Review. Try again.</h1>
          <p>Rehearse your presentation and find one thing to improve.</p>
          <div className="setup-actions">
            <Button disabled={pending} onClick={() => void start(true)}>
              <Play size={17} /> {pending ? "Opening demo…" : "Try sample demo"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/live">
                Open camera studio <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
          <p className="field-hint">
            The sample needs no camera or microphone.
          </p>
        </div>
        <div className="setup-sources">
          <div>
            <h2>Have slides or notes?</h2>
            <p>Add sources for fact-checking and follow-up questions.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/sources">
              <FileText size={17} /> Add your sources
            </Link>
          </Button>
        </div>
        <details className="setup-custom">
          <summary>Customize the sample rehearsal</summary>
          <p className="muted">
            Save a title and context. Feedback still follows the prepared demo.
          </p>
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
              <details className="setup-options">
                <summary>Practice options</summary>
                <div className="form-fields">
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="audience">Who’s listening?</label>
                      <NativeSelect
                        id="audience"
                        value={audience}
                        onChange={(e) =>
                          setAudience(
                            e.target.value as SessionConfig["audience"],
                          )
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
                </div>
              </details>
              <Button type="submit" className="start-button" disabled={pending}>
                {pending ? "Preparing your studio…" : "Start practice"}
                <ArrowRight size={18} />
              </Button>
            </fieldset>
          </form>
          <p className="form-footnote">
            <ShieldCheck size={14} /> No camera or microphone required.
          </p>
        </details>
        {errors.request && (
          <p className="status-error" role="alert">
            {errors.request}
          </p>
        )}
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

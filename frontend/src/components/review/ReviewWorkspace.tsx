"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  RotateCcw,
  Target,
} from "lucide-react";
import { AppShell, DemoBadge } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCoachSession } from "@/features/coach/useCoachSession";
import { TranscriptPanel } from "@/components/studio/TranscriptPanel";
import { DemoControls } from "@/components/demo/DemoControls";
import { audienceNames, time } from "@/lib/utils";
import type { FeedbackItem } from "@/features/coach/contracts";

export function ReviewWorkspace() {
  const { state, retry, select, pending, error } = useCoachSession();
  const router = useRouter();
  useEffect(() => {
    if (state.phase !== "review")
      router.replace(`/practice/${state.ref.sessionId}`);
  }, [state.phase, state.ref.sessionId, router]);
  const report = state.completedReports.find(
    (r) => r.ref.attemptId === state.ref.attemptId,
  );
  if (!report)
    return (
      <AppShell step={3}>
        <div className="empty-state panel">
          <h1>Your review is not ready yet.</h1>
          <p>
            Finish your practice to connect feedback to the sample transcript.
          </p>
          <Button asChild>
            <Link href={`/practice/${state.ref.sessionId}`}>
              Return to practice
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  const first = report.findings[0];
  const comparison = report.comparison;
  function findingCard(finding: FeedbackItem) {
    return (
      <article className="finding" key={finding.id}>
        <div className="finding-top">
          <span className="finding-category">
            {finding.category === "qa" ? "Q&A" : finding.category}
          </span>
          <span className="muted small">Priority {finding.priority}</span>
        </div>
        <h3>{finding.title}</h3>
        <p>{finding.observation}</p>
        <button
          className="evidence-chip"
          onClick={() => {
            select(finding.evidence);
            document
              .getElementById("review-evidence")
              ?.scrollIntoView({ behavior: "instant", block: "nearest" });
          }}
        >
          <FileText size={14} /> {time(finding.evidence.startMs)}{" "}
          <span>View evidence</span>
          <ArrowRight size={13} />
        </button>
        <div className="finding-action">
          <Target size={17} />
          <p>{finding.nextAction}</p>
        </div>
        {finding.retryable && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void retry(finding.id)}
          >
            <RotateCcw size={15} /> Practice this section again
          </Button>
        )}
      </article>
    );
  }
  return (
    <AppShell step={3}>
      <div className="workspace review-workspace">
        <div className="workspace-back">
          <Link href="/demo">
            <ArrowLeft size={15} /> Start new practice
          </Link>
          <DemoBadge />
        </div>
        <div className="review-intro">
          <span className="completion-mark">
            <Check size={22} />
          </span>
          <div>
            <span className="intro-note">A rehearsal worth reflecting on</span>
            <h1>
              {comparison
                ? "Same question. A clearer answer?"
                : "Your next step is clearer."}
            </h1>
            <p>{state.config.title}</p>
          </div>
        </div>
        <div className="review-summary">
          <span>
            <strong>{audienceNames[state.config.audience]}</strong>Audience
          </span>
          <span>
            <strong>
              {state.config.mode === "coach" ? "Coach" : "Simulation"}
            </strong>
            Practice mode
          </span>
          <span>
            <strong>{time(report.durationMs)}</strong>Active session time
          </span>
          <span>
            <strong>
              {report.completion === "complete"
                ? "Complete sample"
                : "Partial sample"}
            </strong>
            Completion
          </span>
        </div>
        {report.completion === "partial" && (
          <div className="status-warning">
            This pitch ended early. Feedback includes only sample events
            delivered before you stopped.
          </div>
        )}
        {error && (
          <div className="status-error" role="alert">
            {error}
          </div>
        )}
        {comparison && (
          <section className="comparison panel">
            <div className="panel-title-row">
              <h2>
                <RotateCcw size={18} /> Your focused retry
              </h2>
              <span className="badge">
                {comparison.result === "improved"
                  ? "Clearer sample evidence"
                  : comparison.result === "needs_work"
                    ? "Keep practicing"
                    : "Not enough evidence"}
              </span>
            </div>
            <p className="muted">{comparison.criterion}</p>
            <div className="comparison-columns">
              <div>
                <h3>Before</h3>
                <p>“{comparison.before}”</p>
              </div>
              <div>
                <h3>After</h3>
                <p>“{comparison.after}”</p>
              </div>
            </div>
            <p className="small muted">
              Comparison of selected sample text only. This is not a measured
              improvement in your ability.
            </p>
          </section>
        )}
        {first ? (
          <section className="next-step">
            <div>
              <span className="next-step-icon">
                <Target size={23} />
              </span>
              <div>
                <span className="small">FOCUS ON THIS NEXT</span>
                <h2>{first.title}</h2>
                <p>{first.nextAction}</p>
              </div>
            </div>
            {first.retryable && (
              <Button disabled={pending} onClick={() => void retry(first.id)}>
                Try a focused retry <ArrowRight size={17} />
              </Button>
            )}
          </section>
        ) : (
          <section className="next-step">
            <div>
              <Target size={26} />
              <div>
                <h2>Give the sample a little more time.</h2>
                <p>
                  No finalized evidence was captured. Restart and let the
                  opening finish before ending your pitch.
                </p>
              </div>
            </div>
          </section>
        )}
        <div className="review-grid">
          <section className="panel findings-panel">
            <div className="panel-title-row">
              <h2>Your feedback</h2>
              <span className="muted small">
                {report.findings.length} useful moments
              </span>
            </div>
            <Tabs defaultValue="all">
              <TabsList aria-label="Feedback categories">
                <TabsTrigger value="all">All feedback</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
              </TabsList>
              {["all", "delivery", "content", "qa"].map((category) => (
                <TabsContent key={category} value={category}>
                  {report.findings.filter(
                    (f) => category === "all" || f.category === category,
                  ).length ? (
                    report.findings
                      .filter(
                        (f) => category === "all" || f.category === category,
                      )
                      .map(findingCard)
                  ) : (
                    <p className="empty-findings">
                      Not enough evidence for a finding in this category.
                    </p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </section>
          <div id="review-evidence" className="review-evidence">
            <TranscriptPanel full />
            {report.strengths.length > 0 && (
              <section className="strength">
                <h2>
                  <CheckCircle2 size={19} /> Keep this part.
                </h2>
                {report.strengths.map((strength) => (
                  <p key={strength}>{strength}</p>
                ))}
              </section>
            )}
          </div>
        </div>
        <details className="context-disclosure">
          <summary>Session context &amp; earlier reports</summary>
          <p>{state.config.context}</p>
          <p>
            Focus: {state.config.criteria.join(" · ") || "General rehearsal"}
          </p>
          {state.completedReports
            .filter((r) => r.ref.attemptId !== state.ref.attemptId)
            .map((r) => (
              <section key={r.ref.attemptId} className="prior-report">
                <h3>
                  {r.ref.attemptId} · {r.completion} · {time(r.durationMs)}
                </h3>
                {r.findings.map((f) => (
                  <p key={f.id}>
                    <strong>{f.title}:</strong> “{f.evidence.quote}”
                  </p>
                ))}
              </section>
            ))}
        </details>
        <DemoControls />
      </div>
    </AppShell>
  );
}

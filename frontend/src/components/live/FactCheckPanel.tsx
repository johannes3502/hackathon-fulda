"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileSearch, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import {
  factCheckSettings,
  evidenceVerdict,
  factFeedback,
  runFactCheck,
  VERDICT_LABELS,
  type FactCheckSettings,
} from "@/features/factcheck/api";
import {
  collectionId,
  listSources,
  locationLabel,
} from "@/features/sources/api";
import { time } from "@/lib/utils";

const PROVIDERS: Record<string, string> = {
  wikipedia: "Wikipedia",
  tavily: "Tavily web search",
};
const providerName = (id: string | null | undefined) =>
  id ? (PROVIDERS[id] ?? id) : "";

export function FactCheckPanel({
  recording,
  onSelect,
}: {
  recording: LiveRecording;
  onSelect: (feedback: LiveFeedback) => void;
}) {
  const { update } = useLiveSessions();
  const endpoint = recording.config.endpoint;
  const [settings, setSettings] = useState<FactCheckSettings | null>(null);
  // Same browser collection as the /sources page; never rendered on the server.
  const [collection] = useState(
    () => recording.config.sourceCollectionId ?? collectionId(),
  );
  const [readySources, setReadySources] = useState<number | null>(null);
  const [useWeb, setUseWeb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const active = new AbortController();
    factCheckSettings(endpoint, active.signal)
      .then(setSettings)
      .catch(() => {
        if (!active.signal.aborted)
          setNotice(
            "Fact-check settings could not be loaded from the backend.",
          );
      });
    listSources(endpoint, collection)
      .then((sources) => {
        if (!active.signal.aborted)
          setReadySources(sources.filter((s) => s.status === "ready").length);
      })
      .catch(() => {
        if (!active.signal.aborted) setReadySources(null);
      });
    return () => active.abort();
  }, [endpoint, collection]);

  const words = recording.words ?? [];
  const result = recording.factCheck;
  const feedback = result ? factFeedback(result, recording.durationMs) : [];
  const web = useWeb && !!settings?.web_provider;
  const canRun = !busy && !!settings?.available && words.length > 0;

  async function check() {
    const active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    setBusy(true);
    setNotice(null);
    try {
      const checked = await runFactCheck(
        endpoint,
        {
          words,
          collectionId: collection,
          useWeb: web,
        },
        active.signal,
      );
      if (active.signal.aborted) return;
      update(recording.id, (current) =>
        current.words !== words
          ? current
          : {
              ...current,
              factCheck: checked,
              questions: undefined,
              answers: undefined,
              feedback: [
                ...current.feedback.filter(
                  (f) =>
                    !f.id.startsWith("fact-") && !f.id.startsWith("question-"),
                ),
                ...factFeedback(checked, recording.durationMs),
              ].sort((a, b) => a.startMs - b.startMs),
            },
      );
      setNotice(
        checked.claims.length
          ? `${checked.claims.length} ${checked.claims.length === 1 ? "statement" : "statements"} checked and added to your feedback moments.`
          : "No checkable factual statements were found in this transcript.",
      );
    } catch (error) {
      if (!active.signal.aborted)
        setNotice(
          error instanceof Error ? error.message : "The fact-check failed.",
        );
    } finally {
      if (!active.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="panel fact-check" aria-labelledby="fact-check-title">
      <div className="panel-title-row">
        <h2 id="fact-check-title">
          <FileSearch size={18} /> Fact-check your statements
        </h2>
        {result && <span className="badge">{result.claims.length}</span>}
      </div>
      <p>
        Factual statements from your transcript are compared with your uploaded
        sources first (slides, lecture notes, papers).
        {settings?.web_provider
          ? ` Statements your sources don't settle can be searched on ${providerName(settings.web_provider)}.`
          : ""}{" "}
        “Not found” means not covered by the checked sources, not wrong.
      </p>
      <dl className="fact-check-inputs">
        <div>
          <dt>Transcript</dt>
          <dd>
            {words.length
              ? `${words.length} words`
              : "None yet. Turn on transcription before recording or import word timestamps above."}
          </dd>
        </div>
        <div>
          <dt>Your sources</dt>
          <dd>
            {readySources === null ? "Unavailable" : `${readySources} ready`} ·{" "}
            <Link href="/sources" target="_blank" rel="noopener noreferrer">
              Manage sources (new tab)
            </Link>
          </dd>
        </div>
      </dl>
      {settings?.web_provider && (
        <label className="live-transcribe">
          <input
            type="checkbox"
            checked={useWeb}
            disabled={busy}
            onChange={(e) => setUseWeb(e.target.checked)}
          />
          Search {providerName(settings.web_provider)} for statements your
          sources don’t settle
        </label>
      )}
      {settings && !settings.available && (
        <p className="status-warning" role="status">
          The model is unavailable. Check the backend model settings and API
          key, then refresh its status.
        </p>
      )}
      {settings?.available && (
        <p className="field-hint">
          Starting sends your transcript sentences to {settings.llm_host} (model{" "}
          {settings.model})
          {web
            ? ` and short search queries to ${providerName(settings.web_provider)}`
            : ""}
          . Only quotes found verbatim in a source count as evidence.
        </p>
      )}
      <Button onClick={() => void check()} disabled={!canRun}>
        {busy ? "Checking statements…" : result ? "Check again" : "Check facts"}
      </Button>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => {
          const signal = AbortSignal.timeout(15000);
          void factCheckSettings(endpoint, signal)
            .then(setSettings)
            .catch(() => setNotice("Model status is unavailable."));
          void listSources(endpoint, collection)
            .then((sources) =>
              setReadySources(
                sources.filter((s) => s.status === "ready").length,
              ),
            )
            .catch(() => setNotice("Sources are unavailable."));
        }}
      >
        Refresh status
      </Button>
      <p role="status" className="field-hint">
        {notice}
      </p>
      {result && (
        <>
          <ol className="fact-claims">
            {result.claims.map((claim, index) => (
              <li
                key={index}
                className={`fact-claim ${evidenceVerdict(claim)}`}
              >
                <div className="fact-claim-head">
                  <span className={`fact-verdict ${evidenceVerdict(claim)}`}>
                    {VERDICT_LABELS[evidenceVerdict(claim)]}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onSelect({ ...feedback[index] })}
                  >
                    <Play size={12} /> {time(claim.t_ms)}
                  </button>
                </div>
                <strong>{claim.claim}</strong>
                <p className="muted small">You said: “{claim.transcript}”</p>
                {claim.evidence && (
                  <blockquote>
                    “{claim.evidence.quote}”
                    <cite>
                      {claim.evidence.url ? (
                        <a
                          href={claim.evidence.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {claim.evidence.label} <ExternalLink size={11} />
                        </a>
                      ) : claim.evidence.location ? (
                        `${claim.evidence.filename}, ${locationLabel(claim.evidence.location)}`
                      ) : (
                        claim.evidence.label
                      )}
                    </cite>
                  </blockquote>
                )}
                {claim.explanation && <p>{claim.explanation}</p>}
                <p className="field-hint">
                  Checked:{" "}
                  {claim.checked.length
                    ? claim.checked
                        .map((kind) =>
                          kind === "upload" ? "your sources" : "web",
                        )
                        .join(", ")
                    : "nothing available"}
                  {claim.notes?.length ? ` · ${claim.notes.join(" ")}` : ""}
                </p>
              </li>
            ))}
          </ol>
          <ul className="fact-notices">
            {result.notices.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

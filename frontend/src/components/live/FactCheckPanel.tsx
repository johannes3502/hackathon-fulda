"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileSearch, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveFeedback, LiveRecording } from "@/features/live/contracts";
import { useLiveSessions } from "@/features/live/LiveSessionProvider";
import {
  factCheckSettings,
  evidenceVerdict,
  evidenceHint,
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
  autoCheck = false,
  onStatus,
}: {
  recording: LiveRecording;
  onSelect: (feedback: LiveFeedback) => void;
  autoCheck?: boolean;
  onStatus?: (status: string) => void;
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
  const autoAttempt = useRef<LiveRecording["words"]>(undefined);
  useEffect(
    () => () => {
      controller.current?.abort();
      autoAttempt.current = undefined;
    },
    [],
  );
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

  const words = useMemo(
    () => recording.words ?? recording.transcript?.words ?? [],
    [recording.words, recording.transcript?.words],
  );
  const result = recording.factCheck;
  const feedback = result ? factFeedback(result, recording.durationMs) : [];
  const web = useWeb && !!settings?.web_provider;
  const canRun =
    !busy &&
    !!settings?.available &&
    words.length > 0 &&
    (readySources !== 0 || web);
  const assessed =
    result?.claims.filter((claim) => {
      const verdict = evidenceVerdict(claim);
      return verdict === "supports" || verdict === "contradicts";
    }).length ?? 0;

  const check = useCallback(
    async (resetQuestions = true) => {
      if (!canRun) return;
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
          (current.words ?? current.transcript?.words) !== words
            ? current
            : {
                ...current,
                factCheck: checked,
                ...(resetQuestions
                  ? { questions: undefined, answers: undefined }
                  : {}),
                feedback: [
                  ...current.feedback.filter(
                    (f) =>
                      !f.id.startsWith("fact-") &&
                      (!resetQuestions || !f.id.startsWith("question-")),
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
    },
    [
      canRun,
      endpoint,
      words,
      collection,
      web,
      recording.id,
      recording.durationMs,
      update,
    ],
  );

  useEffect(() => {
    if (
      !autoCheck ||
      result ||
      !settings?.available ||
      !readySources ||
      !words.length ||
      autoAttempt.current === words
    )
      return;
    autoAttempt.current = words;
    void check(false);
  }, [autoCheck, result, settings, readySources, words, check]);

  const status = busy
    ? "Fachwissen: Quellencheck läuft …"
    : result
      ? result.claims.length
        ? "Der Quellencheck enthält noch keine entscheidbaren Aussagen mit geprüftem Zitat. Details unter „Transcript and source checks“."
        : "Im Transkript wurden keine prüfbaren Fakten gefunden."
      : notice
        ? `Fachwissen: ${notice}`
        : !words.length
          ? "Fachwissen benötigt ein Transkript. Nutze „Practice questions“ → „Transcribe this take“."
          : !settings || readySources === null
            ? "Fachwissen: Verfügbarkeit von Quellen und Modell wird geprüft …"
            : !settings.available
              ? "Fachwissen: Das Modell für den Quellencheck ist nicht verfügbar."
              : !readySources
                ? "Fachwissen benötigt fertig verarbeitete Quellen. Lade dein Material unter „Prepare“ hoch und aktualisiere den Quellenstatus."
                : "Fachwissen: Quellencheck wird vorbereitet …";
  useEffect(() => {
    onStatus?.(status);
  }, [onStatus, status]);

  return (
    <section className="panel fact-check" aria-labelledby="fact-check-title">
      <div className="panel-title-row">
        <h2 id="fact-check-title">
          <FileSearch size={18} /> Fact-check your statements
        </h2>
        {result && <span className="badge">{result.claims.length}</span>}
      </div>
      <p>
        {result
          ? assessed
            ? `${assessed} source-verified statements contribute to your Fachwissen score.`
            : "No source-verified verdicts are available. Fachwissen stays open; statements not found in sources are not counted as wrong."
          : "Fachwissen needs a source check. Use Check facts to compare your transcript with your material and calculate the score."}
      </p>
      {!words.length && (
        <p className="status-warning" role="status">
          No transcript is available for this recording. Enable transcription
          for a new recording or import word timestamps in Recording details.
        </p>
      )}
      {readySources === 0 && !web && (
        <p className="status-warning" role="status">
          No sources are ready. Use Manage sources to upload material, then
          refresh status
          {settings?.web_provider ? " or enable web search" : ""}.
        </p>
      )}
      <dl className="fact-check-inputs">
        <div>
          <dt>Transcript</dt>
          <dd>
            {words.length
              ? `${words.length} words`
              : "None yet. Enable transcription for a new recording or import word timestamps in Recording details."}
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
          Fact-checking is unavailable: the backend model or API key is not
          configured correctly. Fachwissen cannot be calculated until the
          backend configuration is fixed. Then refresh status and check facts.
        </p>
      )}
      {settings?.available && (
        <p className="field-hint">
          Starting sends your transcript sentences to {settings.llm_host} (model{" "}
          {settings.model})
          {web
            ? ` and short search queries to ${providerName(settings.web_provider)}`
            : ""}
          . Only quotes found in a source count as evidence; fuzzy matches are
          marked.
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
        <details>
          <summary>
            Checked statements and sources ({result.claims.length})
          </summary>
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
                    <small className="field-hint">
                      {evidenceHint(claim.evidence)}
                    </small>
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
        </details>
      )}
    </section>
  );
}

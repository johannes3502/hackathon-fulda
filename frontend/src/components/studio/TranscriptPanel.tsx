"use client";
import { FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCoachSession } from "@/features/coach/useCoachSession";
import { time } from "@/lib/utils";
export function TranscriptPanel({ full = false }: { full?: boolean }) {
  const { state, select } = useCoachSession();
  const selected = state.selectedEvidence;
  const selectedRow = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected)
      selectedRow.current?.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
  }, [selected]);
  function rows(all: boolean) {
    return (all ? state.transcript : state.transcript.slice(-2)).map(
      (segment) => (
        <button
          key={segment.id}
          ref={
            selected?.segmentIds.includes(segment.id) ? selectedRow : undefined
          }
          disabled={!segment.isFinal}
          className={`transcript-row ${selected?.segmentIds.includes(segment.id) ? "selected" : ""}`}
          aria-pressed={selected?.segmentIds.includes(segment.id) ?? false}
          onClick={() =>
            select({
              attemptId: state.ref.attemptId,
              segmentIds: [segment.id],
              startMs: segment.startMs,
              endMs: segment.endMs,
              quote: segment.text,
            })
          }
        >
          <span className="timestamp">{time(segment.startMs)}</span>
          <span>
            <small>
              {segment.speaker === "judge" ? "Judge" : "Sample presenter"}
              {!segment.isFinal && " · partial"}
            </small>
            {segment.text}
            {!segment.isFinal && <span className="typing-caret" />}
          </span>
        </button>
      ),
    );
  }
  return (
    <section className="panel transcript-panel" aria-label="Sample transcript">
      <div className="panel-title-row">
        <h2>
          <FileText size={17} />{" "}
          {full ? "Evidence transcript" : "Live transcript"}
        </h2>
        <span className="muted small">Sample content</span>
      </div>
      {!state.transcript.length ? (
        <div className="transcript-empty">
          Your sample transcript will appear here when practice begins.
        </div>
      ) : full ? (
        rows(true)
      ) : (
        <>
          {rows(false)}
          <details open={selected ? true : undefined}>
            <summary>
              Full transcript · {state.transcript.length} segments
            </summary>
            {rows(true)}
          </details>
        </>
      )}
      {selected && (
        <div className="selected-evidence" role="status">
          <strong>Selected moment · {time(selected.startMs)}</strong>
          <p>“{selected.quote}”</p>
          <span className="small muted">
            Transcript evidence only. No matching recording is available.
          </span>
        </div>
      )}
    </section>
  );
}

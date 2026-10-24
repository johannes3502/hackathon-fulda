import type { PoseTestResult } from "@/features/pose/testPoses";

export function PoseDevMode({ results }: { results: PoseTestResult[] }) {
  const recognized = results.filter((result) => result.state === "recognized");
  return (
    <div className="live-pose-lab" aria-label="Pose test lab">
      <div className="pose-lab-head">
        <strong>Pose lab</strong>
        <span role="status">
          {recognized.length
            ? recognized.map((result) => result.label).join(" · ")
            : "hold a test pose"}
        </span>
      </div>
      <div className="pose-lab-list">
        {results.map((result) => (
          <div className={`pose-test ${result.state}`} key={result.id}>
            <div>
              <strong>{result.label}</strong>
              <small>{result.instruction}</small>
            </div>
            <div className="pose-test-meta">
              <span>{result.display}</span>
              <span>
                {result.state === "recognized"
                  ? "recognized"
                  : result.state === "watching"
                    ? `${(result.heldMs / 1000).toFixed(1)} / ${(result.holdMs / 1000).toFixed(1)} s`
                    : result.state === "not-evaluable"
                      ? "n/a"
                      : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <small className="pose-lab-note">
        Dev only · heuristics, not validated · no events
      </small>
    </div>
  );
}

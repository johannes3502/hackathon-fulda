function Cockatoo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M26 21C19 12 21 6 28 4c-1 6 2 10 5 13z" fill="#fde68a" />
      <path d="M30 19c-2-9 2-14 7-14-3 5-2 9-1 12z" fill="#fef3c7" />
      <path d="M14 64c0-18 8-26 18-26 12 0 18 10 18 26z" fill="#fff" />
      <path d="M18 64c0-12 6-18 12-16-2 6-4 12-4 16z" fill="#e5e7eb" />
      <circle cx="32" cy="29" r="12" fill="#fff" />
      <circle cx="37" cy="34" r="3" fill="#fca5a5" />
      <circle cx="35" cy="27" r="2.2" fill="#111827" />
      <path
        d="M40 26c6 0 8 5 6 10-2-2-4-3-6-3z"
        fill="#facc15"
        stroke="#a16207"
      />
    </svg>
  );
}

export function CoachCue({
  message,
  detail,
  state = "idle",
  className = "",
}: {
  message: string;
  detail?: string;
  state?: "alert" | "ok" | "idle";
  className?: string;
}) {
  return (
    <div
      className={`live-pose-cue ${className}`.trim()}
      data-state={state}
      role="status"
    >
      <span className="coach-avatar">
        <Cockatoo />
      </span>
      <p className="coach-bubble">
        {message}
        <small>{detail ? `${detail} · heuristic` : "Heuristic"}</small>
      </p>
    </div>
  );
}

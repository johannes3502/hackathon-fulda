export function StatsRing({ value }: { value: number }) {
  return (
    <div className="stats418-ring" aria-hidden="true">
      <svg viewBox="0 0 230 230">
        <circle
          cx="115"
          cy="115"
          r="92"
          fill="none"
          stroke="var(--border)"
          strokeWidth="12"
        />
        <circle
          cx="115"
          cy="115"
          r="92"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="12"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value} 100`}
          transform="rotate(-90 115 115)"
        />
      </svg>
    </div>
  );
}

"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state panel">
      <h1>The studio couldn’t open.</h1>
      <p>
        Your completed reports may still be in this tab. Try again, or start a
        new practice.
      </p>
      <div className="preflight-actions">
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
        <Link className="button button-outline" href="/">
          Start new practice
        </Link>
      </div>
    </main>
  );
}

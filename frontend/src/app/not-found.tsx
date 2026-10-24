import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state panel">
      <h1>This practice space doesn’t exist.</h1>
      <p>Start a new rehearsal to find your next step.</p>
      <Link className="button button-primary" href="/">
        Start new practice
      </Link>
    </main>
  );
}

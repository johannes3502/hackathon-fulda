"""Bounded source queries shared by the API simulator and voice context."""

from app.factcheck.models import ClaimResult
from app.factcheck.transcript import Sentence


def _transcript_windows(items: list[Sentence], limit: int, max_chars: int = 500) -> list[str]:
    windows: list[str] = []
    current = ""
    for item in items:
        # Long sentences still respect the query limit, without losing their tail.
        for offset in range(0, len(item.text), max_chars):
            part = item.text[offset:offset + max_chars]
            if current and len(current) + len(part) + 1 > max_chars:
                windows.append(current)
                current = ""
            current = f"{current} {part}".strip()
    if current:
        windows.append(current)
    if len(windows) <= limit:
        return windows
    if limit == 1:
        return windows[-1:]
    return [windows[round(index * (len(windows) - 1) / (limit - 1))] for index in range(limit)]


def source_queries(items: list[Sentence], claims: list[ClaimResult], limit: int) -> list[str]:
    """Prioritize findings and sample transcript windows including the talk's end."""
    if limit <= 0:
        return []
    queries: list[str] = []
    seen: set[str] = set()
    claim_limit = max(1, limit - 1) if items else limit
    for claim in claims:
        value = claim.claim.strip()[:500]
        if value and value.casefold() not in seen:
            queries.append(value)
            seen.add(value.casefold())
        if len(queries) >= claim_limit:
            break
    if len(queries) < limit:
        for window in _transcript_windows(items, limit - len(queries)):
            if window.casefold() not in seen:
                queries.append(window)
                seen.add(window.casefold())
    return queries[:limit]

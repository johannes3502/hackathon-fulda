"""Quote matching is local to the referenced passage, never the whole corpus."""

import re
import unicodedata
from difflib import SequenceMatcher

from app.sources.numbers import numbers_in

NEGATIONS = frozenset({"nicht", "kein", "keine", "keinen", "ohne", "not", "no", "never"})
CONTRAST_MARKERS = frozenset({"statt", "sondern", "aber", "jedoch", "allerdings", "instead", "rather", "whereas"})


def clean(text: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKC", text)
                   if unicodedata.category(char) not in {"Cf", "Cc"} or char in "\n\t")


def normalize(text: str) -> str:
    text = re.sub("\u00ad\\s*\\n\\s*", "", text)
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", clean(text))
    text = text.translate(str.maketrans({"„": '"', "“": '"', "”": '"', "’": "'", "‘": "'", "–": "-", "—": "-"}))
    return re.sub(r"\s+", " ", text).strip().casefold()


def quote_match(quote: str, passage: str) -> str | None:
    needle, haystack = normalize(quote).strip(' "\'…'), normalize(passage)
    if not needle or len(needle) < 12:
        return None
    if needle in haystack:
        return "exact"
    wanted, available = needle.split(), haystack.split()
    if len(wanted) < 4:
        return None
    # Never fuzzy-match changed numbers, scale words or negation. Same first/last tokens.
    for start, token in enumerate(available):
        if token != wanted[0]:
            continue
        for size in range(max(4, len(wanted) - 2), len(wanted) + 3):
            candidate = available[start:start + size]
            if not candidate or candidate[-1] != wanted[-1]:
                continue
            joined = " ".join(candidate)
            if numbers_in(joined) != numbers_in(needle):
                continue
            if [x for x in candidate if x in NEGATIONS] != [x for x in wanted if x in NEGATIONS]:
                continue
            if SequenceMatcher(None, wanted, candidate, autojunk=False).ratio() >= 0.90:
                return "fuzzy"
    return None


def find_quote(quote: str, passage: str) -> tuple[str, str] | None:
    """Like `quote_match`, but return the matched source text for the quote.

    Exact matches return the original passage slice when it can be located;
    otherwise the model wording is kept. Fuzzy matches return the source
    candidate, so the stored evidence is still source-derived.
    """
    needle = normalize(quote).strip(' "\'…')
    haystack = normalize(passage)
    if not needle or len(needle) < 12:
        return None
    if needle in haystack:
        span = _find_exact_span(quote, passage)
        return (passage[span[0]:span[1]].strip(), "exact") if span else (quote.strip(), "exact")
    wanted, available = needle.split(), haystack.split()
    if len(wanted) < 4:
        return None
    for start, token in enumerate(available):
        if token != wanted[0]:
            continue
        for size in range(max(4, len(wanted) - 2), len(wanted) + 3):
            candidate = available[start:start + size]
            if not candidate or candidate[-1] != wanted[-1]:
                continue
            joined = " ".join(candidate)
            if numbers_in(joined) != numbers_in(needle):
                continue
            if [x for x in candidate if x in NEGATIONS] != [x for x in wanted if x in NEGATIONS]:
                continue
            if SequenceMatcher(None, wanted, candidate, autojunk=False).ratio() >= 0.90:
                span = _find_exact_span(joined, passage)
                if span is None:
                    return None
                return passage[span[0]:span[1]].strip(), "fuzzy"
    return None


def negation_tokens(text: str) -> set[str]:
    """Negation words that occur in `text`, used as a cheap contradiction signal."""
    return {token for token in re.findall(r"\w+", normalize(text)) if token in NEGATIONS}


def contrast_tokens(text: str) -> set[str]:
    """Contrast words ("statt", "sondern", ...) that signal a corrected figure."""
    return {token for token in re.findall(r"\w+", normalize(text)) if token in CONTRAST_MARKERS}


def _sentence_spans(text: str) -> list[tuple[int, int]]:
    spans, start = [], 0
    for match in re.finditer(r"[.!?;](?=\s|$)|\n+", text):
        end = match.end()
        if text[start:end].strip():
            spans.append((start, end))
        start = end
    if text[start:].strip():
        spans.append((start, len(text)))
    return spans


def _find_exact_span(quote: str, passage: str) -> tuple[int, int] | None:
    """A contiguous span for a short quote, tolerating whitespace and case."""
    raw = quote.strip().strip("\"'„“”‘’…").strip()
    candidates = [raw, raw.rstrip(".,;:!?")] if raw else []
    for candidate in dict.fromkeys(candidates):
        if not candidate:
            continue
        direct = re.search(r"(?<!\w)" + re.escape(candidate) + r"(?!\w)", passage, re.IGNORECASE)
        if direct:
            return direct.span()
        tokens = candidate.split()
        if not tokens:
            continue
        pattern = r"(?<!\w)" + r"\s+".join(re.escape(token) for token in tokens) + r"(?!\w)"
        flexible = re.search(pattern, passage, re.IGNORECASE)
        if flexible:
            return flexible.span()
    return None


def _expand_span(passage: str, start: int, end: int, min_chars: int, max_chars: int = 400) -> str:
    """Expand a short exact span to nearby sentence boundaries.

    The returned text is always a contiguous slice of `passage`, so the
    verbatim guarantee stays intact.
    """
    spans = _sentence_spans(passage)
    if not spans:
        return passage[start:end].strip()
    first = next((index for index, (left, right) in enumerate(spans) if right > start), 0)
    last = next((index for index in range(first, len(spans)) if spans[index][0] < end), first)
    left, right = spans[first][0], spans[last][1]
    while len(normalize(passage[left:right])) < min_chars:
        grew = False
        if first > 0:
            first -= 1
            left = spans[first][0]
            grew = True
        if len(normalize(passage[left:right])) < min_chars and last + 1 < len(spans):
            last += 1
            right = spans[last][1]
            grew = True
        if not grew:
            break
    if right - left > max_chars:
        center = (start + end) // 2
        left = max(left, center - max_chars // 2)
        right = min(right, left + max_chars)
        while left > 0 and not passage[left - 1].isspace():
            left -= 1
        while right < len(passage) and not passage[right].isspace():
            right += 1
    return passage[left:right].strip()


def _meaningful_short(raw: str) -> bool:
    """Reject one-character or punctuation-only anchors before expansion."""
    if len(raw.split()) >= 2:
        return True
    alnum = re.sub(r"\W", "", raw, flags=re.UNICODE)
    if len(re.findall(r"\d", alnum)) >= 2:
        return True
    return len(alnum) >= 4


def verified_quote(quote: str, passage: str, min_chars: int) -> tuple[str, str] | None:
    """Return `(verified_text, "exact" | "fuzzy")` for a quote in one passage.

    Quotes at or above `min_chars` use the exact/fuzzy matcher and return the
    matched source text where possible. A shorter quote is accepted only when
    it carries a meaningful anchor and can be expanded to surrounding sentence
    context while staying a contiguous slice of the passage.
    """
    raw = quote.strip().strip("\"'„“”‘’…").strip()
    if not raw:
        return None
    if len(normalize(raw)) >= min_chars:
        found = find_quote(quote, passage)
        if not found or len(normalize(found[0])) < min_chars:
            return None
        return found
    if not _meaningful_short(raw):
        return None
    span = _find_exact_span(raw, passage)
    if span is None:
        return None
    expanded = _expand_span(passage, span[0], span[1], max(1, min_chars))
    if len(normalize(expanded)) < min_chars or normalize(raw) not in normalize(expanded):
        return None
    return expanded, "exact"

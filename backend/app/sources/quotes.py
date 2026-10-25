"""Passage-local quote verification; accepted quotes retain their source wording."""

import re
import unicodedata
from difflib import SequenceMatcher

from app.sources.numbers import number_spans, numbers_in

NEGATIONS = frozenset({
    "nicht", "kein", "keine", "keinen", "keinem", "keiner", "keines", "keinerlei",
    "ohne", "nie", "niemals", "not", "no", "never", "cannot",
})
CONTRAST_MARKERS = frozenset({
    "statt", "sondern", "aber", "jedoch", "allerdings", "instead", "rather", "whereas",
})
QUOTE_STYLE = str.maketrans({"„": '"', "“": '"', "”": '"', "’": "'", "‘": "'", "–": "-", "—": "-"})


def clean(text: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKC", text)
                   if unicodedata.category(char) not in {"Cf", "Cc"} or char in "\n\t")


def _normalized_passage(text: str) -> tuple[str, list[tuple[int, int]]]:
    """Normalize while mapping every output character back to its original span.

    NFKC/casefold can expand a character (ß → ss); line-end hyphens and control
    characters disappear. Keeping offsets avoids storing model wording when
    an exact or fuzzy match uses any of these transformations.
    """
    ignored = {index for match in re.finditer(r"\u00ad\s*\n\s*", text)
               for index in range(*match.span())}
    chars: list[str] = []
    offsets: list[tuple[int, int]] = []
    index = 0
    while index < len(text):
        start = index
        index += 1
        while index < len(text) and unicodedata.combining(text[index]):
            index += 1
        if start in ignored:
            continue
        for char in unicodedata.normalize("NFKC", text[start:index]):
            if unicodedata.category(char) not in {"Cf", "Cc"} or char in "\n\t":
                chars.append(char)
                offsets.append((start, index))
    joined = "".join(chars)
    hyphens = {index for match in re.finditer(r"(?<=\w)-\s*\n\s*(?=\w)", joined)
               for index in range(*match.span())}
    result: list[str] = []
    positions: list[tuple[int, int]] = []
    for index, char in enumerate(chars):
        if index in hyphens:
            continue
        for folded in char.translate(QUOTE_STYLE).casefold():
            if folded.isspace():
                if result and result[-1] != " ":
                    result.append(" ")
                    positions.append(offsets[index])
                elif result:
                    positions[-1] = (positions[-1][0], offsets[index][1])
            else:
                result.append(folded)
                positions.append(offsets[index])
    if result and result[-1] == " ":
        result.pop()
        positions.pop()
    return "".join(result), positions


def normalize(text: str) -> str:
    return _normalized_passage(text)[0]


def _protected_words(text: str) -> list[str]:
    return [word for word in re.findall(r"\w+(?:'\w+)?", text)
            if word in NEGATIONS or word in CONTRAST_MARKERS or word.endswith("n't")]


def _exact_match(needle: str, haystack: str) -> re.Match | None:
    if not needle:
        return None
    figures = number_spans(haystack)
    for match in re.finditer(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", haystack):
        # A quote cannot cut a word, sign, decimal, thousands group or scale.
        if not _cuts_number(match.start(), match.end(), figures):
            return match
    return None


def _cuts_number(start: int, end: int, figures: list[tuple[int, int]]) -> bool:
    return any(left < start < right or left < end < right for left, right in figures)


def find_quote(quote: str, passage: str) -> tuple[str, str] | None:
    """Return the original source slice and its exact/fuzzy matching method."""
    needle = normalize(quote).strip(' "\'…')
    haystack, positions = _normalized_passage(passage)
    if not needle:
        return None
    exact = _exact_match(needle, haystack)
    if exact:
        return passage[positions[exact.start()][0]:positions[exact.end() - 1][1]], "exact"
    wanted = needle.split()
    available = list(re.finditer(r"\S+", haystack))
    figures = number_spans(haystack)
    if len(wanted) < 4:
        return None
    for start, token in enumerate(available):
        if token.group() != wanted[0]:
            continue
        for size in range(max(4, len(wanted) - 2), len(wanted) + 3):
            candidate = available[start:start + size]
            if not candidate or candidate[-1].group() != wanted[-1]:
                continue
            if _cuts_number(candidate[0].start(), candidate[-1].end(), figures):
                continue
            words = [word.group() for word in candidate]
            joined = " ".join(words)
            if numbers_in(joined) != numbers_in(needle) or _protected_words(joined) != _protected_words(needle):
                continue
            if SequenceMatcher(None, wanted, words, autojunk=False).ratio() >= 0.90:
                left, right = candidate[0].start(), candidate[-1].end()
                return passage[positions[left][0]:positions[right - 1][1]], "fuzzy"
    return None


def quote_match(quote: str, passage: str) -> str | None:
    """Compatibility helper for review writing; require at least 12 characters."""
    if len(normalize(quote).strip(' "\'…')) < 12:
        return None
    found = find_quote(quote, passage)
    return found[1] if found else None


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


def _expand_span(passage: str, start: int, end: int, min_chars: int, max_chars: int = 400) -> str:
    """Expand the complete anchor to sentence boundaries inside this passage."""
    spans = _sentence_spans(passage)
    if not spans:
        return passage[start:end].strip()
    first = next((index for index, (_, right) in enumerate(spans) if right > start), 0)
    last = max(index for index, (left, _) in enumerate(spans) if left < end)
    left, right = spans[first][0], spans[last][1]
    while len(normalize(passage[left:right])) < min_chars:
        if first > 0:
            first -= 1
            left = spans[first][0]
        elif last + 1 < len(spans):
            last += 1
            right = spans[last][1]
        else:
            break
    if right - left > max_chars:
        left = max(left, start - max(0, (max_chars - (end - start)) // 2))
        right = max(end, min(right, left + max_chars))
        while left > 0 and not passage[left - 1].isspace():
            left -= 1
        while right < len(passage) and not passage[right].isspace():
            right += 1
    return passage[left:right].strip()


def _meaningful_short(raw: str) -> bool:
    alnum = "".join(char for char in raw if char.isalnum())
    return bool(alnum) and (len(raw.split()) >= 2 or sum(char.isdigit() for char in alnum) >= 2 or len(alnum) >= 4)


def verified_quote(quote: str, passage: str, min_chars: int) -> tuple[str, str] | None:
    """Verify a quote; meaningful short exact anchors gain surrounding context."""
    raw = quote.strip().strip("\"'„“”‘’…").strip()
    needle = normalize(raw)
    if not needle:
        return None
    if len(needle) >= min_chars:
        found = find_quote(raw, passage)
        return found if found and len(normalize(found[0])) >= min_chars else None
    if not _meaningful_short(raw):
        return None
    haystack, positions = _normalized_passage(passage)
    match = _exact_match(needle, haystack)
    if match is None:
        return None
    expanded = _expand_span(passage, positions[match.start()][0], positions[match.end() - 1][1], min_chars)
    return (expanded, "exact") if len(normalize(expanded)) >= min_chars else None

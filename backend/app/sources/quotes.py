"""Quote matching is local to the referenced passage, never the whole corpus."""

import re
import unicodedata
from difflib import SequenceMatcher


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
    # Never fuzzy-match changed numbers or negation. Same first/last tokens.
    for start, token in enumerate(available):
        if token != wanted[0]:
            continue
        for size in range(max(4, len(wanted) - 2), len(wanted) + 3):
            candidate = available[start:start + size]
            if not candidate or candidate[-1] != wanted[-1]:
                continue
            joined = " ".join(candidate)
            if re.findall(r"\d+(?:[.,]\d+)*", joined) != re.findall(r"\d+(?:[.,]\d+)*", needle):
                continue
            negations = {"nicht", "kein", "keine", "keinen", "ohne", "not", "no", "never"}
            if [x for x in candidate if x in negations] != [x for x in wanted if x in negations]:
                continue
            if SequenceMatcher(None, wanted, candidate, autojunk=False).ratio() >= 0.90:
                return "fuzzy"
    return None

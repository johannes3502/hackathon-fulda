"""Deterministic numeric comparison for grounding checks.

A verbatim quote can still under-warrant a numeric claim ("citation
laundering"). Numeric specificity is a separate evidence-force axis, so the
fact-check compares the figures of a claim with the figures of its verified
quote. This module only normalises digits, dates and German/English scale
words; it does not verify units, semantics or claims written as number words.
"""

import re
import unicodedata
from decimal import Decimal, InvalidOperation

# German thousands separators (dot or thin space) and decimal commas, plus
# plain integers. An English comma-group form is accepted only with at least
# two groups or an explicit decimal dot, so "1,200" stays a German decimal
# (1.2), while "1,200.50" is unambiguously English grouping.
_NUMBER = re.compile(
    r"(?<![\w])(?P<sign>[-−])?(?P<num>"
    r"\d{1,3}(?:,\d{3})+\.\d+"
    r"|\d{1,3}(?:[. ]\d{3})+(?:,\d+)?"
    r"|\d{1,3}(?:,\d{3}){2,}(?:\.\d+)?"
    r"|\d+(?:[.,]\d+)?"
    r")(?P<scale>[\s-]*(?:mio|million|millionen|mrd|milliarde|milliarden|tsd|tausend)\b)?(?![\w])",
    re.IGNORECASE,
)

_DATE = re.compile(
    r"(?<!\d)(?P<d>\d{1,2})[./-](?P<m>\d{1,2})[./-](?P<y>\d{4})(?!\d)"
    r"|(?<!\d)(?P<Y>\d{4})[./-](?P<M>\d{1,2})[./-](?P<D>\d{1,2})(?!\d)"
)

_SCALES = {
    "mio": Decimal(10) ** 6,
    "million": Decimal(10) ** 6,
    "millionen": Decimal(10) ** 6,
    "mrd": Decimal(10) ** 9,
    "milliarde": Decimal(10) ** 9,
    "milliarden": Decimal(10) ** 9,
    "tsd": Decimal(10) ** 3,
    "tausend": Decimal(10) ** 3,
}


def _canonical(value: Decimal) -> str:
    return format(value.normalize(), "f")


def _decimal(raw: str) -> Decimal | None:
    value = raw.replace("\u00a0", "").replace(" ", "")
    if "." in value and "," in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        value = value.replace(",", "") if value.count(",") > 1 else value.replace(",", ".")
    elif "." in value:
        groups = value.split(".")
        if 1 <= len(groups[0]) <= 3 and all(len(group) == 3 for group in groups[1:]):
            value = "".join(groups)
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def number_spans(normalized_text: str) -> list[tuple[int, int]]:
    """Digit/scale spans in normalized text, to prevent quoting half a figure."""
    return [match.span() for match in _NUMBER.finditer(normalized_text)]


def numbers_in(text: str) -> set[str]:
    """Canonical decimal strings of every figure in `text`.

    "1.200", "1200" and "1,2 Tsd." all become "1200"; "4,2 Mio." and
    "4.200.000" both become "4200000". Dates are split into day/month/year so
    `25.10.2026` and `2026-10-25` compare equal. Duplicates collapse; the set
    is meant as evidence coverage, not as a count of mentions.
    """
    found: set[str] = set()

    def date_parts(match: re.Match) -> str:
        for group in match.groups():
            if group:
                found.add(_canonical(Decimal(group)))
        return " " * (match.end() - match.start())

    masked = _DATE.sub(date_parts, unicodedata.normalize("NFKC", text))
    for match in _NUMBER.finditer(masked):
        value = _decimal(match.group("num"))
        if value is None:
            continue
        if match.group("sign"):
            value = -value
        scale = match.group("scale")
        if scale:
            value *= _SCALES[re.sub(r"[\s-]", "", scale).casefold()]
        found.add(_canonical(value))
    return found

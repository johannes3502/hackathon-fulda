"""Deterministic, small-sample trend statistics for progress series.

These are deliberately conservative heuristics. They are not clinical
significance tests and never produce a score or grade.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class TrendResult:
    n: int
    baseline: float | None
    recent: float | None
    latest: float | None
    noise_band: float | None
    slope: float | None
    slope_per_10: float | None
    slope_ci: tuple[float, float] | None
    relative_change: float | None
    effect_size: float | None
    minimum_detectable_change: float | None
    minimum_detectable_slope: float | None
    mann_kendall_p: float | None
    reliable_change: bool
    reliable_slope: bool
    trend_status: str
    direction: str
    confidence: str
    lag1: float | None
    effective_n: int


def median(values):
    ordered = sorted(values)
    if not ordered:
        return None
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[middle])
    return (ordered[middle - 1] + ordered[middle]) / 2


def mad(values, centre=None):
    if not values:
        return None
    centre = median(values) if centre is None else centre
    return median([abs(value - centre) for value in values])


def quantile(values, probability):
    ordered = sorted(values)
    if not ordered:
        return None
    if len(ordered) == 1:
        return float(ordered[0])
    position = probability * (len(ordered) - 1)
    lower = int(math.floor(position))
    upper = int(math.ceil(position))
    if lower == upper:
        return float(ordered[lower])
    weight = position - lower
    return float(ordered[lower] * (1 - weight) + ordered[upper] * weight)


def _pairwise_slopes(x, y):
    return [(y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x))]


def theil_sen(x, y):
    if len(x) < 2:
        return None, None
    slopes = _pairwise_slopes(x, y)
    slope = median(slopes)
    intercept = median([value - slope * position for position, value in zip(x, y)])
    return slope, intercept


def theil_sen_ci(x, y, *, seed=0):
    """Middle 95% of pairwise slopes; sample ~600 pairs only for large series."""
    if len(x) < 3:
        return None
    if len(x) <= 50:
        slopes = _pairwise_slopes(x, y)
    else:
        generator = random.Random(seed)
        pairs = [(i, j) for i in range(len(x)) for j in range(i + 1, len(x))]
        chosen = generator.choices(pairs, k=600)
        slopes = [(y[j] - y[i]) / (x[j] - x[i]) for i, j in chosen]
    return quantile(slopes, 0.025), quantile(slopes, 0.975)


def lag1(values):
    if len(values) < 3:
        return None
    mean = sum(values) / len(values)
    numerator = sum((values[i] - mean) * (values[i + 1] - mean) for i in range(len(values) - 1))
    denominator = sum((value - mean) ** 2 for value in values)
    return numerator / denominator if denominator else None


def effective_sample_size(values):
    n = len(values)
    correlation = lag1(values)
    if correlation is None or correlation <= -0.99:
        return n
    if correlation <= 0:
        return n
    # AR(1) approximation. It is a conservative correction, not an exact test.
    corrected = n * (1 - correlation) / (1 + correlation)
    return max(3, min(n, int(round(corrected))))


def mann_kendall(values, *, effective_n=None):
    n = len(values)
    if n < 3:
        return None
    score = 0
    for i in range(n):
        for j in range(i + 1, n):
            score += (values[j] > values[i]) - (values[j] < values[i])
    counts = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    variance = n * (n - 1) * (2 * n + 5) / 18
    variance -= sum(count * (count - 1) * (2 * count + 5) for count in counts.values()) / 18
    if variance <= 0:
        return 1.0
    if effective_n and effective_n < n:
        variance *= n / effective_n
    if score == 0:
        return 1.0
    z = (abs(score) - 1) / math.sqrt(variance)
    return min(1.0, math.erfc(z / math.sqrt(2)))


def benjamini_hochberg(pvalues):
    """Return metric_id -> adjusted p, monotone and capped at 1."""
    items = sorted((p, key) for key, p in pvalues.items() if p is not None)
    if not items:
        return {}
    count = len(items)
    adjusted, running = {}, 1.0
    for rank in range(count, 0, -1):
        p, key = items[rank - 1]
        running = min(running, p * count / rank)
        adjusted[key] = min(1.0, running)
    return adjusted


def _noise_scale(values):
    """Robust residual scale. Detrending avoids counting a real trend as noise."""
    if len(values) < 3:
        return None
    x = list(range(len(values)))
    slope, intercept = theil_sen(x, values)
    residuals = [value - (intercept + slope * position) for position, value in zip(x, values)]
    scale = mad(residuals)
    if scale is None:
        return None
    scale *= 1.4826
    if scale <= 0:
        # A deterministic line has no residual noise. Do not invent uncertainty,
        # but do not claim a trend from too few points either.
        return 0.0
    return scale


def cusum_change(values, baseline, scale, *, k=0.5, h=4.0):
    """Fixed-target two-sided CUSUM with a two-point confirmation rule.

    k/h follow the NIST rule of thumb (k about half the shift, h about 4-5).
    Requiring two consecutive exceedances is a product safeguard, not a
    standard CUSUM property.
    """
    if len(values) < 10 or baseline is None or not scale or scale <= 0:
        return None
    positive = negative = 0.0
    positive_run = negative_run = 0
    first_positive = first_negative = None
    for index, value in enumerate(values):
        if index < 3:
            continue
        z = (value - baseline) / scale
        positive = max(0.0, positive + z - k)
        negative = max(0.0, negative - z - k)
        if positive > h:
            if first_positive is None:
                first_positive = index
            positive_run += 1
        else:
            positive_run = 0
            first_positive = None
        if negative > h:
            if first_negative is None:
                first_negative = index
            negative_run += 1
        else:
            negative_run = 0
            first_negative = None
        if positive_run >= 2:
            start = max(0, first_positive - 1)
            return _change_payload(values, start, index, baseline, "up")
        if negative_run >= 2:
            start = max(0, first_negative - 1)
            return _change_payload(values, start, index, baseline, "down")
    return None


def _change_payload(values, start, index, baseline, direction):
    before = values[max(0, start - 3):start] or [baseline]
    after = values[start:index + 1]
    from_value = median(before)
    to_value = median(after)
    return {
        "start_index": start,
        "detected_index": index,
        "direction": direction,
        "from_value": from_value,
        "to_value": to_value,
        "magnitude": None if from_value is None or to_value is None else to_value - from_value,
        "confidence": "medium" if len(after) < 5 else "high",
    }


def analyse(values, *, total_n=None, version_break=False, seed=0,
            baseline_override=None, scale_override=None):
    """Analyse one eligible metric series in take order."""
    values = [float(value) for value in values]
    n = len(values)
    total_n = n if total_n is None else total_n
    if n == 0:
        return TrendResult(0, None, None, None, None, None, None, None, None, None, None, None,
                           None, False, False, "insufficient", "unknown", "low", None, 0)

    baseline = median(values[:min(3, n)]) if baseline_override is None else baseline_override
    recent = median(values[-min(3, n):])
    latest = values[-1]
    x = list(range(n))
    slope, _ = theil_sen(x, values)
    slope_10 = None if slope is None else slope * 10
    ci = theil_sen_ci(x, values, seed=seed)
    scale = _noise_scale(values) if scale_override is None else scale_override
    mdc_single = None if scale is None else 1.96 * math.sqrt(2) * scale
    mdc_slope = None
    if scale is not None and n >= 3:
        mdc_slope = 1.96 * scale * math.sqrt(12 / (n * (n * n - 1)))
    rci_like = None
    if scale and scale > 0 and recent is not None and baseline is not None:
        rci_like = (recent - baseline) / (scale * math.sqrt(2))
    reliable_change = bool(rci_like is not None and abs(rci_like) >= 1.96)
    reliable_slope = bool(
        slope is not None and ci is not None and mdc_slope is not None
        and ci[0] is not None and ci[1] is not None
        and (ci[0] > 0 or ci[1] < 0) and abs(slope) >= mdc_slope
    )
    correlation = lag1(values)
    effective_n = effective_sample_size(values)
    p_value = mann_kendall(values, effective_n=effective_n) if n >= 10 else None
    direction = "unknown"
    if slope is not None and n >= 5:
        if mdc_slope is not None and abs(slope) < mdc_slope:
            direction = "flat"
        else:
            direction = "up" if slope > 0 else "down"

    confirmed_change = reliable_change
    if n >= 5:
        tail = values[-2:]
        if baseline is not None and scale and len(tail) == 2:
            signs = [1 if value > baseline + 0.5 * (mdc_single or 0) else -1
                     if value < baseline - 0.5 * (mdc_single or 0) else 0 for value in tail]
            confirmed_change = reliable_change and signs[0] == signs[1] != 0

    if n < 5 or baseline is None or scale is None:
        status = "insufficient"
    elif version_break:
        status = "unclear"
    elif n < 10:
        status = "early_signal" if (reliable_slope or confirmed_change) else "stable"
    elif reliable_slope:
        status = "trend_up" if slope > 0 else "trend_down"
    elif confirmed_change and direction in {"up", "down"}:
        status = "trend_up" if direction == "up" else "trend_down"
    else:
        status = "stable"

    if n >= 20 and total_n and n / total_n >= 0.8 and not version_break and (
            correlation is None or abs(correlation) <= 0.3) and slope_10 and ci:
        width = ci[1] - ci[0]
        confidence = "high" if width <= 0.5 * abs(slope_10) else "medium"
    elif n >= 10 and not version_break and ci and (ci[0] > 0 or ci[1] < 0):
        confidence = "medium"
    else:
        confidence = "low"

    relative = None
    if baseline not in (None, 0) and recent is not None:
        relative = (recent - baseline) / baseline
    effect = None if scale in (None, 0) or slope_10 is None else slope_10 / scale
    return TrendResult(
        n=n, baseline=baseline, recent=recent, latest=latest, noise_band=scale,
        slope=slope, slope_per_10=slope_10, slope_ci=ci, relative_change=relative,
        effect_size=effect, minimum_detectable_change=mdc_single,
        minimum_detectable_slope=mdc_slope, mann_kendall_p=p_value,
        reliable_change=reliable_change, reliable_slope=reliable_slope,
        trend_status=status, direction=direction, confidence=confidence,
        lag1=correlation, effective_n=effective_n,
    )

"""Synthetic numeric regressions; these tests do not measure coaching accuracy."""

import pytest

from app.progress import stats


def test_theil_sen_detects_linear_change_and_ignores_one_outlier():
    values = [10.0 - 0.2 * index + (0.04 if index % 2 else -0.04) for index in range(20)]
    result = stats.analyse(values)
    assert result.trend_status == "trend_down"
    assert result.reliable_slope is True
    assert result.slope == pytest.approx(-0.2)
    assert stats.analyse([5.0] * 19 + [50.0]).trend_status != "trend_up"


def test_short_series_is_insufficient_and_bh_is_monotone():
    assert stats.analyse([1.0, 1.1, 0.9, 1.0]).trend_status == "insufficient"
    adjusted = stats.benjamini_hochberg({"a": 0.01, "b": 0.04, "c": 0.2, "d": None})
    assert adjusted == pytest.approx({"a": 0.03, "b": 0.06, "c": 0.2})


def test_cusum_finds_a_step_after_the_baseline():
    values = [10.0, 10.1, 9.9, 10.0, 10.1, 9.9, 10.0, 10.1, 20.0, 20.1, 19.9, 20.0]
    result = stats.analyse(values)
    change = stats.cusum_change(values, result.baseline, result.noise_band)
    assert change is not None and change["direction"] == "up"
    assert change["detected_index"] >= 8


def test_constant_values_are_flat():
    result = stats.analyse([4.0] * 20)
    assert result.direction == "flat"
    assert result.trend_status == "stable"
    assert not result.reliable_slope


def test_missing_takes_keep_the_original_slope_unit():
    result = stats.analyse([2, 4, 8, 12, 20], positions=[1, 2, 4, 6, 10], total_n=10)
    assert result.slope == pytest.approx(2)
    assert result.slope_per_10 == pytest.approx(20)


def test_version_break_does_not_compare_incompatible_values():
    result = stats.analyse(list(range(20)), version_break=True)
    assert result.trend_status == "unclear"
    assert result.direction == "unknown"
    assert result.n == 20
    assert result.baseline is result.slope is result.slope_ci is result.relative_change is None
    assert not result.reliable_slope and not result.reliable_change


def test_sen_rank_interval_uses_estimator_uncertainty():
    # Reference example for scipy.stats.theilslopes: 95% Sen rank bounds.
    x, y = list(range(5)), [0, 1, 1, 3, 4]
    assert stats.theil_sen_ci(x, y) == (0.0, 2.0)
    assert stats.theil_sen_ci(list(range(20)), [2 * i for i in range(20)]) == (2.0, 2.0)


def test_autocorrelated_series_has_low_confidence():
    result = stats.analyse([float(i) for i in range(30)])
    assert result.lag1 > 0.3
    assert result.confidence == "low"

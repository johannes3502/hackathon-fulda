"""Number normalisation used by the grounding gates. Synthetic data only."""

from app.sources.numbers import numbers_in


def test_german_and_english_number_forms():
    assert numbers_in("1.200") == {"1200"}
    assert numbers_in("1200") == {"1200"}
    assert numbers_in("1 200") == {"1200"}
    assert numbers_in("1.200,50 €") == {"1200.5"}
    assert numbers_in("4,2 Mio.") == {"4200000"}
    assert numbers_in("4.200.000") == {"4200000"}
    assert numbers_in("1,2 Tsd.") == {"1200"}
    assert numbers_in("4,2Mio") == {"4200000"}
    assert numbers_in("1,2Tsd") == {"1200"}
    assert numbers_in("4,2-Mio") == {"4200000"}
    assert numbers_in("1,200,000") == {"1200000"}
    assert numbers_in("1,200 kg") == {"1.2"}  # German decimal, not English thousands.


def test_numbers_ignore_words_and_keep_dates_and_ranges():
    assert numbers_in("keine Zahlen") == set()
    assert numbers_in("2026-10-25") == {"2026", "10", "25"}
    assert numbers_in("25.10.2026") == numbers_in("2026-10-25")
    assert numbers_in("20–30 Betriebe") == {"20", "30"}
    assert numbers_in("30 %") == {"30"}
    assert numbers_in("-5 Grad") == {"-5"}

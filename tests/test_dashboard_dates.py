"""Tests for dashboard date normalization."""

from datetime import datetime

from dashboard_qdrant import normalize_payload_for_dashboard


def _timestamp(date_value):
    return normalize_payload_for_dashboard(
        {"due_date": date_value}, point_id=1
    )["due_date_ts"]


def test_ambiguous_slash_date_prefers_day_first():
    assert _timestamp("08/09/2026") == int(
        datetime(2026, 9, 8).timestamp()
    )


def test_unambiguous_month_first_date_still_parses():
    assert _timestamp("12/25/2026") == int(
        datetime(2026, 12, 25).timestamp()
    )


def test_iso_date_still_parses():
    assert _timestamp("2026-09-08") == int(
        datetime(2026, 9, 8).timestamp()
    )

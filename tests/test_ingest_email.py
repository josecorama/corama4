"""Tests for ingestion result email diagnostics."""

from ingest_email import build_result_html


def test_source_fetch_errors_are_visible_and_escaped():
    html = build_result_html(
        {
            "errors": 1,
            "source_errors": {
                "sam": {
                    "code": "auth_failed",
                    "detail": "HTTP 401: <invalid credentials>",
                },
            },
            "added_contracts": [],
        },
        title="Daily Ingestion — source fetch failed",
    )

    assert "auth_failed" in html
    assert "HTTP 401: &lt;invalid credentials&gt;" in html
    assert "<invalid credentials>" not in html

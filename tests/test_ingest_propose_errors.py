"""Offline tests for truthful SAM.gov ingest-proposal diagnostics."""

import json
import io
import sys

import requests

from sam_gov_client import _QUOTA_STATE


class FakeResponse:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.headers = {}
        self.text = json.dumps(body)
        self._body = body

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(response=self)


def _post_propose(monkeypatch, status_code, body, sources="sam", bidbuy_stats=None):
    monkeypatch.setenv("SAM_GOV_API_KEY", "test-key")
    monkeypatch.delenv("ADMIN_SECRET_KEY", raising=False)

    def fake_get(*args, **kwargs):
        return FakeResponse(status_code, body)

    monkeypatch.setattr("sam_gov_client.requests.get", fake_get)
    _QUOTA_STATE["reset_at"] = None

    captured_stdout = sys.stdout
    sys.stdout = io.TextIOWrapper(io.BytesIO(), encoding="utf-8")
    try:
        import app as app_module
    finally:
        sys.stdout = captured_stdout

    if bidbuy_stats is not None:
        monkeypatch.setattr("app.fetch_bidbuy_payloads", lambda limit: ([], 0, 0))
        monkeypatch.setattr("app.get_last_fetch_stats", lambda: bidbuy_stats)

    return app_module.app.test_client().post(
        "/api/ingest/propose",
        json={"limit": 1, "sources": sources},
    )


def test_sam_401_is_returned_as_fetch_error(monkeypatch):
    response = _post_propose(
        monkeypatch,
        401,
        {"code": "900901", "message": "Invalid Credentials"},
    )

    assert response.status_code == 502
    assert response.get_json() == {
        "success": False,
        "error": "auth_failed",
        "detail": 'SAM.gov returned HTTP 401: {"code": "900901", "message": "Invalid Credentials"}',
        "fetched": 0,
    }


def test_empty_sam_response_remains_success(monkeypatch):
    response = _post_propose(
        monkeypatch,
        200,
        {"opportunitiesData": [], "totalRecords": 0},
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "success": True,
        "message": "No new contracts to propose",
        "fetched": 0,
        "skipped": 0,
        "new": 0,
    }


def test_sam_401_and_bidbuy_blocked_report_both_source_failures(monkeypatch):
    response = _post_propose(
        monkeypatch,
        401,
        {"code": "900901", "message": "Invalid Credentials"},
        sources="sam,bidbuy",
        bidbuy_stats={
            "detail_requested": 0,
            "detail_fetched": 0,
            "filtered": 0,
            "blocked": 2,
            "fetch_failed": 1,
        },
    )

    assert response.status_code == 502
    assert response.get_json() == {
        "success": False,
        "error": "auth_failed",
        "detail": 'SAM.gov returned HTTP 401: {"code": "900901", "message": "Invalid Credentials"}',
        "fetched": 0,
        "sources": {
            "sam": {
                "success": False,
                "fetched": 0,
                "new": 0,
                "error": "auth_failed",
                "detail": 'SAM.gov returned HTTP 401: {"code": "900901", "message": "Invalid Credentials"}',
            },
            "bidbuy": {
                "success": False,
                "fetched": 0,
                "new": 0,
                "error": "scrape_blocked",
                "detail": "BidBuy fetch diagnostics: blocked=2, fetch_failed=1",
            },
        },
    }


def test_bidbuy_filtered_notices_are_not_classified_as_fetch_failure(monkeypatch):
    import daily_ingest

    monkeypatch.setattr(
        daily_ingest,
        "fetch_bidbuy_payloads",
        lambda limit: ([], 0, 0),
    )
    monkeypatch.setattr(
        daily_ingest,
        "get_last_fetch_stats",
        lambda: {
            "detail_requested": 4,
            "detail_fetched": 4,
            "filtered": 4,
            "blocked": 0,
            "fetch_failed": 0,
        },
    )

    candidates, fetched, skipped = daily_ingest.collect_candidates(
        limit=1, states=[], sources=("bidbuy",)
    )

    assert candidates == []
    assert fetched == 0
    assert skipped == 0
    assert daily_ingest._LAST_SOURCE_ERRORS == {}

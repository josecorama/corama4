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


def _post_propose(monkeypatch, status_code, body):
    monkeypatch.setenv("SAM_GOV_API_KEY", "test-key")
    monkeypatch.delenv("ADMIN_SECRET_KEY", raising=False)

    def fake_get(*args, **kwargs):
        return FakeResponse(status_code, body)

    monkeypatch.setattr("sam_gov_client.requests.get", fake_get)
    _QUOTA_STATE["reset_at"] = None

    captured_stdout = sys.stdout
    sys.stdout = io.TextIOWrapper(io.BytesIO(), encoding="utf-8")
    try:
        from app import app
    finally:
        sys.stdout = captured_stdout

    return app.test_client().post(
        "/api/ingest/propose",
        json={"limit": 1, "sources": "sam"},
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

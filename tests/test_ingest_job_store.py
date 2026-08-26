"""Offline tests for the shared ingestion proposal job store."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import time

import ingest_approval


class FakeJobRef:
    def __init__(self, records, job_id=None):
        self.records = records
        self.job_id = job_id

    def transaction(self, callback):
        updated = callback(deepcopy(self.records))
        self.records.clear()
        self.records.update(deepcopy(updated))
        return deepcopy(self.records)

    def get(self):
        if self.job_id is None:
            return deepcopy(self.records)
        return deepcopy(self.records.get(self.job_id))

    def update(self, updates):
        self.records.setdefault(self.job_id, {}).update(deepcopy(updates))


def _job_record(started_at=None):
    now = int(time.time())
    return {
        "job_id": "job-one",
        "started_at": started_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "finished_at": None,
        "status": "running",
        "result": None,
        "result_status": None,
        "expires_at": now + ingest_approval.DEFAULT_TTL_SECONDS,
    }


def test_job_written_by_one_process_is_visible_to_another(monkeypatch):
    records = {}
    monkeypatch.setattr(ingest_approval, "_ensure_firebase", lambda: True)
    monkeypatch.setattr(
        ingest_approval,
        "_job_ref",
        lambda job_id=None: FakeJobRef(records, job_id),
    )

    process_a_fallback = {}
    record = _job_record()
    assert ingest_approval.claim_ingest_job("job-one", record, process_a_fallback) is None

    process_b_fallback = {}
    visible = ingest_approval.get_ingest_job("job-one", process_b_fallback)

    assert visible == record
    assert process_b_fallback == {}


def test_stale_running_job_does_not_block_new_claim(monkeypatch):
    records = {}
    monkeypatch.setattr(ingest_approval, "_ensure_firebase", lambda: True)
    monkeypatch.setattr(
        ingest_approval,
        "_job_ref",
        lambda job_id=None: FakeJobRef(records, job_id),
    )
    stale_started = (
        datetime.now(timezone.utc) - timedelta(seconds=ingest_approval.INGEST_JOB_STALE_SECONDS + 1)
    ).isoformat().replace("+00:00", "Z")
    records["old-job"] = _job_record(stale_started)
    records["old-job"]["job_id"] = "old-job"

    new_record = _job_record()
    new_record["job_id"] = "new-job"
    assert ingest_approval.claim_ingest_job("new-job", new_record, {}) is None

    assert records["old-job"]["status"] == "failed"
    assert records["old-job"]["result"]["error"] == "stale_job"
    assert records["new-job"] == new_record

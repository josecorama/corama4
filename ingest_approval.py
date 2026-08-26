"""
Approval workflow for contract ingestion.

Instead of ingesting SAM.gov contracts directly, the daily job stores a
*pending* batch and emails an admin a preview with Confirm / Reject links.
Ingestion only happens after the admin confirms.

Pending batches are stored in Firebase Realtime Database under
``pending_ingests/{token}`` so the cron job (which proposes) and the web
service (which confirms) — separate processes — can share state.

Asynchronous proposal jobs are stored under ``ingest_jobs/{job_id}`` for the
same cross-process visibility and single-flight protection.
"""

import os
import json
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)

PENDING_PATH = "pending_ingests"
INGEST_JOBS_PATH = "ingest_jobs"
DEFAULT_TTL_SECONDS = 60 * 60 * 48  # links valid for 48h
INGEST_JOB_STALE_SECONDS = 60 * 60
_JOB_FALLBACK_LOGGED = False


def _ensure_firebase() -> bool:
    """Initialize firebase_admin if not already initialized. Returns success."""
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        log.error("[Ingest Approval] firebase-admin not installed")
        return False

    try:
        firebase_admin.get_app()
        return True
    except ValueError:
        pass

    database_url = os.getenv("DATABASE_URL")
    storage_bucket = os.getenv("STORAGE_BUCKET", "corama-c911e.appspot.com")
    creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    try:
        if creds_json:
            cred = credentials.Certificate(json.loads(creds_json))
        else:
            path = os.getenv("SERVICE_ACCOUNT_JSON", "")
            base_dir = os.path.dirname(os.path.abspath(__file__))
            full = path if os.path.isabs(path) else os.path.join(base_dir, path)
            if not path or not os.path.exists(full):
                log.error("[Ingest Approval] No Firebase credentials available")
                return False
            cred = credentials.Certificate(full)
        firebase_admin.initialize_app(cred, {
            "databaseURL": database_url,
            "storageBucket": storage_bucket,
        })
        return True
    except Exception as e:
        log.error("[Ingest Approval] Firebase init failed: %s", e)
        return False


def _ref(token: Optional[str] = None):
    from firebase_admin import db as admin_db
    path = PENDING_PATH if token is None else f"{PENDING_PATH}/{token}"
    return admin_db.reference(path)


def _job_ref(job_id: Optional[str] = None):
    from firebase_admin import db as admin_db
    path = INGEST_JOBS_PATH if job_id is None else f"{INGEST_JOBS_PATH}/{job_id}"
    return admin_db.reference(path)


def _log_job_fallback() -> None:
    global _JOB_FALLBACK_LOGGED
    if not _JOB_FALLBACK_LOGGED:
        log.warning(
            "[Ingest Approval] Firebase unavailable; using in-process ingestion job state"
        )
        _JOB_FALLBACK_LOGGED = True


def _job_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _record_expired(record: Dict[str, Any]) -> bool:
    if "expires_at" not in record:
        return False
    try:
        return float(record.get("expires_at", 0)) <= time.time()
    except (TypeError, ValueError):
        return False


def _record_stale(record: Dict[str, Any]) -> bool:
    started_at = record.get("started_at")
    if not started_at:
        return True
    try:
        if isinstance(started_at, (int, float)):
            age = time.time() - float(started_at)
        else:
            parsed = datetime.fromisoformat(str(started_at).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - parsed).total_seconds()
        return age > INGEST_JOB_STALE_SECONDS
    except (TypeError, ValueError):
        return True


def _stale_job_updates() -> Dict[str, Any]:
    now = _job_timestamp()
    return {
        "status": "failed",
        "finished_at": now,
        "result": {
            "success": False,
            "error": "stale_job",
            "detail": "Ingestion proposal job exceeded its maximum runtime",
        },
        "result_status": 500,
        "error": "Ingestion proposal job exceeded its maximum runtime",
    }


def _firebase_available() -> bool:
    try:
        return _ensure_firebase()
    except Exception as e:
        log.error("[Ingest Approval] Firebase availability check failed: %s", e)
        return False


def _running_job(records: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(records, dict):
        return None
    for job_id, record in records.items():
        if not isinstance(record, dict):
            continue
        if _record_expired(record):
            continue
        if record.get("status") != "running":
            continue
        if _record_stale(record):
            continue
        result = dict(record)
        result.setdefault("job_id", str(job_id))
        return result
    return None


def claim_ingest_job(
    job_id: str,
    record: Dict[str, Any],
    fallback: Dict[str, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Atomically claim a proposal job, returning an existing running job."""
    now = int(time.time())
    stored = dict(record)
    stored.setdefault("job_id", job_id)
    stored.setdefault("expires_at", now + DEFAULT_TTL_SECONDS)
    if _firebase_available():
        try:
            def transaction(current: Any) -> Dict[str, Any]:
                records = dict(current or {})
                for existing_id, existing_record in records.items():
                    if isinstance(existing_record, dict) and _record_expired(existing_record):
                        records.pop(existing_id)
                        continue
                    if (
                        isinstance(existing_record, dict)
                        and existing_record.get("status") == "running"
                        and not _record_expired(existing_record)
                        and _record_stale(existing_record)
                    ):
                        existing_record = dict(existing_record)
                        existing_record.update(_stale_job_updates())
                        records[existing_id] = existing_record
                existing = _running_job(records)
                if existing:
                    return records
                records[job_id] = stored
                return records

            committed = _job_ref().transaction(transaction) or {}
            if isinstance(committed, dict) and committed.get(job_id) == stored:
                fallback[job_id] = stored
                return None
            return _running_job(committed)
        except Exception as e:
            log.error("[Ingest Approval] Failed to claim ingestion job %s: %s", job_id, e)
            _log_job_fallback()
    else:
        _log_job_fallback()

    existing = _running_job(fallback)
    if existing:
        return existing
    fallback[job_id] = stored
    return None


def find_running_ingest_job(
    fallback: Dict[str, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Return a fresh running proposal job from Firebase or local fallback."""
    if _firebase_available():
        try:
            records = _job_ref().get() or {}
            result = _running_job(records)
            if result is not None:
                return result
            if isinstance(records, dict):
                for job_id, record in records.items():
                    if (
                        isinstance(record, dict)
                        and record.get("status") == "running"
                        and not _record_expired(record)
                        and _record_stale(record)
                    ):
                        _job_ref(str(job_id)).update(_stale_job_updates())
            return None
        except Exception as e:
            log.error("[Ingest Approval] Failed to find running ingestion job: %s", e)
            _log_job_fallback()
    else:
        _log_job_fallback()
    result = _running_job(fallback)
    if result is None:
        for job_id, record in fallback.items():
            if (
                isinstance(record, dict)
                and record.get("status") == "running"
                and not _record_expired(record)
                and _record_stale(record)
            ):
                record.update(_stale_job_updates())
    return result


def update_ingest_job(
    job_id: str,
    updates: Dict[str, Any],
    fallback: Dict[str, Dict[str, Any]],
) -> bool:
    """Update a proposal job in Firebase, falling back locally if unavailable."""
    if _firebase_available():
        try:
            _job_ref(job_id).update(updates)
            fallback.setdefault(job_id, {"job_id": job_id})
            fallback[job_id].update(updates)
            return True
        except Exception as e:
            log.error("[Ingest Approval] Failed to update ingestion job %s: %s", job_id, e)
            _log_job_fallback()
    else:
        _log_job_fallback()
    fallback.setdefault(job_id, {"job_id": job_id})
    fallback[job_id].update(updates)
    return False


def get_ingest_job(
    job_id: str,
    fallback: Dict[str, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Read a proposal job from Firebase, falling back locally if unavailable."""
    if _firebase_available():
        try:
            record = _job_ref(job_id).get()
            if not isinstance(record, dict) or _record_expired(record):
                return None
            if record.get("status") == "running" and _record_stale(record):
                updates = _stale_job_updates()
                _job_ref(job_id).update(updates)
                record.update(updates)
            result = dict(record)
            result.setdefault("job_id", job_id)
            return result
        except Exception as e:
            log.error("[Ingest Approval] Failed to read ingestion job %s: %s", job_id, e)
            _log_job_fallback()
    else:
        _log_job_fallback()
    record = fallback.get(job_id)
    if not record or _record_expired(record):
        return None
    if record.get("status") == "running" and _record_stale(record):
        record.update(_stale_job_updates())
    return dict(record)


def create_pending_batch(payloads: List[Dict[str, Any]], source: str = "SAM.gov") -> Optional[str]:
    """Store a pending batch of contract payloads. Returns a single-use token."""
    if not payloads:
        return None
    if not _ensure_firebase():
        return None

    token = uuid.uuid4().hex
    now = int(time.time())
    record = {
        "status": "pending",
        "source": source,
        "created_at": now,
        "expires_at": now + DEFAULT_TTL_SECONDS,
        "count": len(payloads),
        "contracts": payloads,
    }
    try:
        _ref(token).set(record)
        log.info("[Ingest Approval] Stored pending batch %s (%d contracts)", token, len(payloads))
        return token
    except Exception as e:
        log.error("[Ingest Approval] Failed to store pending batch: %s", e)
        return None


def get_pending_batch(token: str) -> Optional[Dict[str, Any]]:
    if not token or not _ensure_firebase():
        return None
    try:
        return _ref(token).get()
    except Exception as e:
        log.error("[Ingest Approval] Failed to read pending batch %s: %s", token, e)
        return None


def set_status(token: str, status: str, extra: Optional[Dict[str, Any]] = None) -> bool:
    if not token or not _ensure_firebase():
        return False
    try:
        update = {"status": status, "resolved_at": int(time.time())}
        if extra:
            update.update(extra)
        _ref(token).update(update)
        return True
    except Exception as e:
        log.error("[Ingest Approval] Failed to set status for %s: %s", token, e)
        return False


def is_expired(record: Dict[str, Any]) -> bool:
    return int(record.get("expires_at", 0)) < int(time.time())

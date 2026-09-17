"""
Approval workflow for contract ingestion.

Instead of ingesting SAM.gov contracts directly, the daily job stores a
*pending* batch and emails an admin a preview with Confirm / Reject links.
Ingestion only happens after the admin confirms.

Pending batches are stored in Firebase Realtime Database under
``pending_ingests/{token}`` so the cron job (which proposes) and the web
service (which confirms) — separate processes — can share state.
"""

import os
import json
import time
import uuid
import logging
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)

PENDING_PATH = "pending_ingests"
DEFAULT_TTL_SECONDS = 60 * 60 * 48  # links valid for 48h


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

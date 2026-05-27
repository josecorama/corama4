"""
SAM.gov -> Qdrant Sync Module

Fetches fresh contract opportunities from SAM.gov and upserts them into
the ``government_contracts`` Qdrant collection.  Also performs dual-write
into ``contracts_dashboard`` for fast dashboard queries.

Deduplicates by sam_notice_id so re-running is idempotent (upsert, not
blind insert).
"""

import os
import uuid
import logging
import hashlib
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

from sam_gov_client import fetch_opportunities, map_opportunity_to_payload

log = logging.getLogger(__name__)

COLLECTION_NAME = "government_contracts"


# ---------------------------------------------------------------------------
# Qdrant helpers
# ---------------------------------------------------------------------------

def _get_qdrant_client() -> Optional[QdrantClient]:
    url = os.getenv("QDRANT_URL")
    key = os.getenv("QDRANT_API_KEY")
    if not url or not key:
        log.error("[SAM Sync] QDRANT_URL / QDRANT_API_KEY not set")
        return None
    return QdrantClient(url=url, api_key=key)


def _deterministic_uuid(notice_id: str) -> str:
    """Generate a deterministic UUID-style id from SAM notice ID for dedup."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"sam.gov:{notice_id}"))


def _existing_notice_ids(client: QdrantClient, notice_ids: List[str]) -> set:
    """Batch-check which SAM notice_ids already exist in Qdrant."""
    existing = set()
    batch_size = 100
    for i in range(0, len(notice_ids), batch_size):
        batch = notice_ids[i:i + batch_size]
        ids = [_deterministic_uuid(nid) for nid in batch]
        try:
            points = client.retrieve(
                collection_name=COLLECTION_NAME,
                ids=ids,
                with_payload=False,
                with_vectors=False,
            )
            found_ids = {str(p.id) for p in points}
            for nid, pid in zip(batch, ids):
                if pid in found_ids:
                    existing.add(nid)
        except Exception as e:
            log.warning("[SAM Sync] Batch existence check failed: %s", e)
    return existing


def _generate_dummy_vector(payload: Dict[str, Any], dim: int = 1536) -> List[float]:
    """Generate a deterministic placeholder vector from payload text.

    Real embeddings should be generated later by the background enrichment
    worker.  This placeholder ensures the point can be stored.
    """
    text = f"{payload.get('title', '')} {payload.get('description', '')}"
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    values = []
    for i in range(dim):
        byte_idx = i % len(h)
        values.append((int(h[byte_idx], 16) - 8) / 800.0)
    return values


# ---------------------------------------------------------------------------
# NAICS -> category enrichment
# ---------------------------------------------------------------------------

def _enrich_category(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Try to map NAICS codes to a dashboard category using category_mapping."""
    if payload.get("category"):
        return payload

    try:
        from category_mapping import map_payload_to_category
        category = map_payload_to_category(payload)
        if category:
            payload["category"] = category
    except ImportError:
        pass
    return payload


# ---------------------------------------------------------------------------
# Dashboard dual-write
# ---------------------------------------------------------------------------

def _dual_write_dashboard(
    client: QdrantClient,
    points: List[PointStruct],
) -> Tuple[int, int]:
    """Write the same contracts into the contracts_dashboard collection."""
    try:
        from dashboard_qdrant import (
            ensure_dashboard_collection,
            upsert_dashboard_contracts_batch,
        )
    except ImportError:
        log.warning("[SAM Sync] dashboard_qdrant module unavailable — skipping dual-write")
        return 0, 0

    if not ensure_dashboard_collection(client):
        log.warning("[SAM Sync] Could not ensure dashboard collection")
        return 0, 0

    contracts = []
    for pt in points:
        contracts.append((pt.id, pt.payload))

    success, errors = upsert_dashboard_contracts_batch(client, contracts)
    if errors:
        log.warning("[SAM Sync] Dashboard dual-write: %d success, %d errors", success, errors)
    else:
        log.info("[SAM Sync] Dashboard dual-write: %d contracts written", success)
    return success, errors


# ---------------------------------------------------------------------------
# Main sync function
# ---------------------------------------------------------------------------

def sync_sam_gov_to_qdrant(
    limit: int = 1000,
    posted_from: Optional[str] = None,
    posted_to: Optional[str] = None,
    skip_existing: bool = True,
) -> Dict[str, Any]:
    """
    Fetch opportunities from SAM.gov and upsert into Qdrant.

    - Only contracts with due_date >= today are ingested (server-side filter).
    - Deduplication by sam_notice_id (deterministic UUID).
    - Enriches category from NAICS codes via category_mapping.
    - Dual-writes into the contracts_dashboard collection.

    Args:
        limit: Max opportunities to fetch from SAM.gov
        posted_from: MM/DD/YYYY start date (default 90 days ago)
        posted_to: MM/DD/YYYY end date (default today)
        skip_existing: If True, skip contracts already in Qdrant

    Returns:
        Dict with sync stats: fetched, new, skipped, errors, dashboard_written
    """
    stats = {
        "fetched": 0,
        "new": 0,
        "skipped": 0,
        "errors": 0,
        "removed_expired": 0,
        "dashboard_written": 0,
        "dashboard_errors": 0,
    }

    payloads = fetch_opportunities(
        posted_from=posted_from,
        posted_to=posted_to,
        limit=limit,
        only_active=True,
    )
    stats["fetched"] = len(payloads)

    if not payloads:
        log.info("[SAM Sync] No opportunities fetched from SAM.gov")
        return stats

    client = _get_qdrant_client()
    if not client:
        stats["errors"] = len(payloads)
        return stats

    # Determine vector dimension from collection config
    try:
        info = client.get_collection(COLLECTION_NAME)
        vec_cfg = info.config.params.vectors
        dim = vec_cfg.size if hasattr(vec_cfg, "size") else 1536
    except Exception:
        dim = 1536

    # Dedup: check which notice_ids already exist
    if skip_existing:
        notice_ids = [p.get("sam_notice_id", "") for p in payloads if p.get("sam_notice_id")]
        existing = _existing_notice_ids(client, notice_ids)
        log.info("[SAM Sync] %d / %d notice IDs already in Qdrant", len(existing), len(notice_ids))
    else:
        existing = set()

    # Build points
    points_to_upsert: List[PointStruct] = []

    for payload in payloads:
        nid = payload.get("sam_notice_id", "")
        if skip_existing and nid in existing:
            stats["skipped"] += 1
            continue

        payload = _enrich_category(payload)

        point_id = _deterministic_uuid(nid) if nid else str(uuid.uuid4())
        vector = _generate_dummy_vector(payload, dim)
        points_to_upsert.append(PointStruct(id=point_id, vector=vector, payload=payload))

    if not points_to_upsert:
        log.info("[SAM Sync] All %d contracts already exist, nothing to upsert", stats["skipped"])
        return stats

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(points_to_upsert), batch_size):
        batch = points_to_upsert[i : i + batch_size]
        try:
            client.upsert(collection_name=COLLECTION_NAME, points=batch)
            stats["new"] += len(batch)
            log.info(
                "[SAM Sync] Upserted batch %d: %d points into %s",
                i // batch_size + 1, len(batch), COLLECTION_NAME,
            )
        except Exception as e:
            log.error("[SAM Sync] Upsert batch error: %s", e)
            stats["errors"] += len(batch)

    # Dual-write to dashboard collection
    if stats["new"] > 0:
        dw_ok, dw_err = _dual_write_dashboard(client, points_to_upsert[:stats["new"]])
        stats["dashboard_written"] = dw_ok
        stats["dashboard_errors"] = dw_err

    log.info(
        "[SAM Sync] Complete: fetched=%d new=%d skipped=%d errors=%d "
        "dashboard_written=%d dashboard_errors=%d",
        stats["fetched"], stats["new"], stats["skipped"], stats["errors"],
        stats["dashboard_written"], stats["dashboard_errors"],
    )
    return stats


# ---------------------------------------------------------------------------
# Expired-contract cleanup
# ---------------------------------------------------------------------------

def remove_expired_contracts() -> Dict[str, Any]:
    """
    Remove contracts whose due_date is in the past from Qdrant.

    Returns stats: checked, removed, errors
    """
    stats = {"checked": 0, "removed": 0, "errors": 0}

    client = _get_qdrant_client()
    if not client:
        return stats

    today = date.today()

    ids_to_delete = []
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=200,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        if not points:
            break

        for p in points:
            stats["checked"] += 1
            raw = p.payload.get("due_date") or p.payload.get("Due Date")
            if not raw or str(raw).lower() in ("nan", "none", "", "null"):
                continue

            raw_str = str(raw)
            try:
                dd = datetime.strptime(raw_str.split("T")[0], "%d/%m/%Y").date()
            except Exception:
                try:
                    dd = datetime.strptime(raw_str.split("T")[0], "%Y-%m-%d").date()
                except Exception:
                    continue

            if dd < today:
                ids_to_delete.append(p.id)

        if offset is None:
            break

    if ids_to_delete:
        log.info("[SAM Sync] Found %d expired contracts to remove", len(ids_to_delete))
        batch_size = 100
        for i in range(0, len(ids_to_delete), batch_size):
            batch = ids_to_delete[i : i + batch_size]
            try:
                client.delete(
                    collection_name=COLLECTION_NAME,
                    points_selector=batch,
                )
                stats["removed"] += len(batch)
            except Exception as e:
                log.error("[SAM Sync] Delete batch error: %s", e)
                stats["errors"] += len(batch)

        # Also remove from dashboard collection
        _remove_from_dashboard(client, ids_to_delete)

    log.info(
        "[SAM Sync] Expired cleanup: checked=%d removed=%d errors=%d",
        stats["checked"], stats["removed"], stats["errors"],
    )
    return stats


def _remove_from_dashboard(client: QdrantClient, point_ids: list) -> None:
    """Remove expired contracts from the dashboard collection too."""
    try:
        from dashboard_qdrant import DASHBOARD_COLLECTION_NAME
    except ImportError:
        return

    batch_size = 100
    for i in range(0, len(point_ids), batch_size):
        batch = point_ids[i : i + batch_size]
        try:
            client.delete(
                collection_name=DASHBOARD_COLLECTION_NAME,
                points_selector=batch,
            )
        except Exception as e:
            log.warning("[SAM Sync] Dashboard cleanup error: %s", e)

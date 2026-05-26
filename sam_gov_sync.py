"""
SAM.gov -> Qdrant Sync Module

Fetches fresh contract opportunities from SAM.gov and upserts them into
the `government_contracts` Qdrant collection.  Deduplicates by
sam_notice_id so re-running is idempotent.
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

COLLECTION_NAME = "government_contracts"


def _get_qdrant_client() -> Optional[QdrantClient]:
    url = os.getenv("QDRANT_URL")
    key = os.getenv("QDRANT_API_KEY")
    if not url or not key:
        logging.error("[SAM Sync] QDRANT_URL / QDRANT_API_KEY not set")
        return None
    return QdrantClient(url=url, api_key=key)


def _deterministic_uuid(notice_id: str) -> str:
    """Generate a deterministic UUID-style id from SAM notice ID for dedup."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"sam.gov:{notice_id}"))


def _existing_notice_ids(client: QdrantClient, notice_ids: List[str]) -> set:
    """Check which SAM notice_ids already exist in Qdrant."""
    existing = set()
    for nid in notice_ids:
        point_id = _deterministic_uuid(nid)
        try:
            points = client.retrieve(
                collection_name=COLLECTION_NAME,
                ids=[point_id],
                with_payload=False,
                with_vectors=False,
            )
            if points:
                existing.add(nid)
        except Exception:
            pass
    return existing


def _generate_dummy_vector(payload: Dict[str, Any], dim: int = 1536) -> List[float]:
    """Generate a deterministic placeholder vector from payload text.

    Real embeddings should be generated later by the background enrichment
    worker.  This placeholder ensures the point can be stored.
    """
    text = f"{payload.get('title', '')} {payload.get('description', '')}"
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    # Spread the hash across `dim` floats in [-0.01, 0.01]
    values = []
    for i in range(dim):
        byte_idx = i % len(h)
        values.append((int(h[byte_idx], 16) - 8) / 800.0)
    return values


def sync_sam_gov_to_qdrant(
    limit: int = 1000,
    posted_from: Optional[str] = None,
    posted_to: Optional[str] = None,
    skip_existing: bool = True,
) -> Dict[str, Any]:
    """
    Fetch opportunities from SAM.gov and upsert into Qdrant.

    Args:
        limit: Max opportunities to fetch from SAM.gov
        posted_from: MM/DD/YYYY start date (default 90 days ago)
        posted_to: MM/DD/YYYY end date (default today)
        skip_existing: If True, skip contracts already in Qdrant

    Returns:
        Dict with sync stats: fetched, new, skipped, errors
    """
    stats = {"fetched": 0, "new": 0, "skipped": 0, "errors": 0, "removed_expired": 0}

    payloads = fetch_opportunities(
        posted_from=posted_from,
        posted_to=posted_to,
        limit=limit,
        only_active=True,  # Only fetch contracts with future due dates
    )
    stats["fetched"] = len(payloads)

    if not payloads:
        logging.info("[SAM Sync] No opportunities fetched from SAM.gov")
        return stats

    client = _get_qdrant_client()
    if not client:
        stats["errors"] = len(payloads)
        return stats

    # Determine vector dimension from collection config
    try:
        info = client.get_collection(COLLECTION_NAME)
        vec_cfg = info.config.params.vectors
        if hasattr(vec_cfg, "size"):
            dim = vec_cfg.size
        else:
            dim = 1536
    except Exception:
        dim = 1536

    # Build points
    points_to_upsert: List[PointStruct] = []

    if skip_existing:
        notice_ids = [p.get("sam_notice_id", "") for p in payloads if p.get("sam_notice_id")]
        existing = _existing_notice_ids(client, notice_ids)
    else:
        existing = set()

    for payload in payloads:
        nid = payload.get("sam_notice_id", "")
        if skip_existing and nid in existing:
            stats["skipped"] += 1
            continue

        point_id = _deterministic_uuid(nid) if nid else str(uuid.uuid4())
        vector = _generate_dummy_vector(payload, dim)
        points_to_upsert.append(PointStruct(id=point_id, vector=vector, payload=payload))

    if not points_to_upsert:
        logging.info(f"[SAM Sync] All {stats['skipped']} contracts already exist, nothing to upsert")
        return stats

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(points_to_upsert), batch_size):
        batch = points_to_upsert[i : i + batch_size]
        try:
            client.upsert(collection_name=COLLECTION_NAME, points=batch)
            stats["new"] += len(batch)
            logging.info(f"[SAM Sync] Upserted batch {i // batch_size + 1}: {len(batch)} points")
        except Exception as e:
            logging.error(f"[SAM Sync] Upsert batch error: {e}")
            stats["errors"] += len(batch)

    logging.info(
        f"[SAM Sync] Complete: fetched={stats['fetched']}, new={stats['new']}, "
        f"skipped={stats['skipped']}, errors={stats['errors']}"
    )
    return stats


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
    today_str_dmy = today.strftime("%d/%m/%Y")
    today_str_ymd = today.isoformat()

    ids_to_delete = []
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=200,
            offset=offset,
            with_payload=["due_date", "Due Date"],
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
                # Try DD/MM/YYYY
                dd = datetime.strptime(raw_str.split("T")[0], "%d/%m/%Y").date()
            except Exception:
                try:
                    # Try YYYY-MM-DD
                    dd = datetime.strptime(raw_str.split("T")[0], "%Y-%m-%d").date()
                except Exception:
                    continue

            if dd < today:
                ids_to_delete.append(p.id)

        if offset is None:
            break

    if ids_to_delete:
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
                logging.error(f"[SAM Sync] Delete batch error: {e}")
                stats["errors"] += len(batch)

    logging.info(
        f"[SAM Sync] Expired cleanup: checked={stats['checked']}, "
        f"removed={stats['removed']}, errors={stats['errors']}"
    )
    return stats

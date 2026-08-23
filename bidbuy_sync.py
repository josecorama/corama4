"""BidBuy Illinois -> Qdrant sync helpers.

Fetching and mapping are kept separate from ingestion so the daily job can
present one approval batch containing multiple sources.  Actual embedding and
upsert logic is shared with ``sam_gov_sync.ingest_payloads``.
"""

import logging
import os
from typing import Any, Dict, List, Optional, Set, Tuple

from qdrant_client import QdrantClient

from bidbuy_client import fetch_open_bids, get_last_fetch_stats
from sam_gov_sync import COLLECTION_NAME, deterministic_bidbuy_uuid, ingest_payloads

log = logging.getLogger(__name__)


def _get_qdrant_client() -> Optional[QdrantClient]:
    url = os.getenv("QDRANT_URL")
    key = os.getenv("QDRANT_API_KEY")
    if not url or not key:
        log.error("[BidBuy Sync] QDRANT_URL / QDRANT_API_KEY not set")
        return None
    return QdrantClient(url=url, api_key=key)


def _existing_doc_ids(client: QdrantClient, doc_ids: List[str]) -> Set[str]:
    """Batch-check deterministic BidBuy IDs without modifying Qdrant."""
    existing: Set[str] = set()
    for start in range(0, len(doc_ids), 100):
        batch = doc_ids[start:start + 100]
        ids = [deterministic_bidbuy_uuid(doc_id) for doc_id in batch]
        try:
            points = client.retrieve(
                collection_name=COLLECTION_NAME,
                ids=ids,
                with_payload=False,
                with_vectors=False,
            )
            found = {str(point.id) for point in points}
            existing.update(doc_id for doc_id, point_id in zip(batch, ids) if point_id in found)
        except Exception as exc:
            log.warning("[BidBuy Sync] Batch existence check failed: %s", exc)
    return existing


def _enrich_category(payload: Dict[str, Any]) -> Dict[str, Any]:
    if payload.get("category"):
        return payload
    try:
        from category_mapping import map_payload_to_category
        payload["category"] = map_payload_to_category(payload)
    except ImportError:
        pass
    return payload


def fetch_new_payloads(
    limit: int = 1000, skip_existing: bool = True
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Fetch, Qdrant-dedupe, and categorize open BidBuy contracts."""
    payloads = fetch_open_bids(limit=limit)
    fetched = len(payloads)
    fetch_stats = get_last_fetch_stats()
    log.info(
        "[BidBuy Sync] detail_requested=%d detail_fetched=%d filtered=%d "
        "blocked=%d fetch_failed=%d",
        fetch_stats.get("detail_requested", 0),
        fetch_stats.get("detail_fetched", 0),
        fetch_stats.get("filtered", 0),
        fetch_stats.get("blocked", 0),
        fetch_stats.get("fetch_failed", 0),
    )
    if not payloads:
        return [], 0, 0
    client = _get_qdrant_client()
    if not client:
        return [], fetched, 0
    doc_ids = [str(p.get("bidbuy_doc_id") or "") for p in payloads]
    existing = _existing_doc_ids(client, doc_ids) if skip_existing else set()
    new_payloads = [
        _enrich_category(payload)
        for payload in payloads
        if not (skip_existing and payload.get("bidbuy_doc_id") in existing)
    ]
    return new_payloads, fetched, fetched - len(new_payloads)


def sync_bidbuy_to_qdrant(limit: int = 1000, skip_existing: bool = True) -> Dict[str, Any]:
    """Fetch and ingest BidBuy contracts, primarily for manual direct runs."""
    payloads, fetched, skipped = fetch_new_payloads(limit=limit, skip_existing=skip_existing)
    stats: Dict[str, Any] = {
        "fetched": fetched,
        "skipped": skipped,
        "new": 0,
        "errors": 0,
        **get_last_fetch_stats(),
    }
    if payloads:
        stats.update(ingest_payloads(payloads))
    return stats

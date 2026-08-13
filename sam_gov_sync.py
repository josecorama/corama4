"""
SAM.gov -> Qdrant Sync Module

Fetches fresh contract opportunities from SAM.gov and upserts them into
the ``government_contracts`` Qdrant collection.  Also performs dual-write
into ``contracts_dashboard`` for fast dashboard queries.

Deduplicates by sam_notice_id so re-running is idempotent (upsert, not
blind insert).
"""

import os
import re
import uuid
import logging
import hashlib
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

from sam_gov_client import (
    fetch_opportunities,
    map_opportunity_to_payload,
    hydrate_descriptions,
)

log = logging.getLogger(__name__)

COLLECTION_NAME = "government_contracts"

# Embedding model MUST match the one used to embed the rest of the corpus
# (see bids_embedding.py) so capability-statement matching stays consistent.
EMBED_MODEL = "text-embedding-3-small"
EMBED_BATCH_SIZE = 100

# Records the reason the most recent embedding attempt failed (for surfacing
# in the ingestion digest so failures are self-diagnosing).
_LAST_EMBED_ERROR: Dict[str, Any] = {"msg": None}


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

    DEPRECATED: only used as a last resort when real embeddings cannot be
    generated (missing OpenAI key). Placeholder vectors cluster together and
    make every capability statement match the same contracts, so real
    embeddings via ``_embed_payload_texts`` are strongly preferred.
    """
    text = f"{payload.get('title', '')} {payload.get('description', '')}"
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    values = []
    for i in range(dim):
        byte_idx = i % len(h)
        values.append((int(h[byte_idx], 16) - 8) / 800.0)
    return values


def _embedding_text(payload: Dict[str, Any]) -> str:
    """Build the text used to embed a contract.

    Mirrors bids_embedding.py ("{Bid Name}. {Bid Description}") so contracts
    ingested here live in the same vector space as the rest of the corpus.
    """
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    text = f"{title}. {description}".strip()
    text = re.sub(r"\s+", " ", text)
    return text[:8000]  # keep well under the model's token limit


def _embed_payload_texts(payloads: List[Dict[str, Any]]) -> Optional[List[List[float]]]:
    """Generate real OpenAI embeddings for a list of contract payloads.

    Returns a list of vectors aligned with ``payloads``, or ``None`` if
    embeddings could not be generated (no API key / API failure). Callers must
    fall back to placeholder vectors only as a last resort.
    """
    # Try each configured key in turn — a single invalid/quota-limited key
    # shouldn't force a fallback to placeholder vectors if another key works.
    key_candidates = [
        ("SMART_SEARCH_OPENAI_API_KEY", os.getenv("SMART_SEARCH_OPENAI_API_KEY")),
        ("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY")),
        ("CS_BUILDER_OPENAI_API_KEY", os.getenv("CS_BUILDER_OPENAI_API_KEY")),
        ("BID_RESPONSE_OPENAI_API_KEY", os.getenv("BID_RESPONSE_OPENAI_API_KEY")),
    ]
    key_candidates = [(name, val) for name, val in key_candidates if val]
    if not key_candidates:
        msg = "No OpenAI API key set (checked SMART_SEARCH/OPENAI/CS_BUILDER/BID_RESPONSE)"
        log.error("[SAM Sync] %s — cannot generate real embeddings", msg)
        _LAST_EMBED_ERROR["msg"] = msg
        return None

    try:
        from openai import OpenAI
    except ImportError:
        msg = "openai package not installed"
        log.error("[SAM Sync] %s — cannot generate embeddings", msg)
        _LAST_EMBED_ERROR["msg"] = msg
        return None

    texts = [_embedding_text(p) or "government contract opportunity" for p in payloads]

    last_error = None
    for key_name, api_key in key_candidates:
        client = OpenAI(api_key=api_key)
        vectors: List[List[float]] = []
        failed = False
        for i in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[i:i + EMBED_BATCH_SIZE]
            try:
                resp = client.embeddings.create(input=batch, model=EMBED_MODEL)
                vectors.extend([d.embedding for d in resp.data])
            except Exception as e:
                last_error = f"{key_name}: {type(e).__name__}: {e}"
                log.error("[SAM Sync] Embedding batch %d failed with %s", i // EMBED_BATCH_SIZE + 1, last_error)
                failed = True
                break
        if failed:
            continue
        if len(vectors) != len(payloads):
            last_error = f"{key_name}: count mismatch {len(vectors)} vs {len(payloads)}"
            log.error("[SAM Sync] %s", last_error)
            continue
        _LAST_EMBED_ERROR["msg"] = None
        return vectors

    _LAST_EMBED_ERROR["msg"] = last_error or "unknown embedding error"
    return None


def _summarize_contract(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Compact contract summary for the ingestion digest email."""
    naics = payload.get("naics_codes") or []
    if isinstance(naics, list):
        naics_str = ", ".join(str(c) for c in naics)
    else:
        naics_str = str(naics)
    return {
        "title": payload.get("title") or "Untitled",
        "agency": payload.get("agency") or "Unknown agency",
        "category": payload.get("category") or "Uncategorized",
        "state": payload.get("state") or payload.get("location") or "",
        "naics": naics_str,
        "due_date": payload.get("due_date") or "",
        "url": payload.get("source_url") or payload.get("detail_url") or "",
    }


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
    state: Optional[str] = None,
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
        state: US state code to filter by (e.g. 'IL' for Illinois)

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
        "used_placeholder_vectors": False,
        "added_contracts": [],
    }

    new_payloads, fetched, skipped = fetch_new_payloads(
        limit=limit, posted_from=posted_from, posted_to=posted_to,
        state=state, skip_existing=skip_existing,
    )
    stats["fetched"] = fetched
    stats["skipped"] = skipped

    if not new_payloads:
        log.info("[SAM Sync] Nothing new to ingest (fetched=%d skipped=%d)", fetched, skipped)
        return stats

    ingest_stats = ingest_payloads(new_payloads)
    for k in ("new", "errors", "dashboard_written", "dashboard_errors",
              "used_placeholder_vectors", "added_contracts"):
        stats[k] = ingest_stats.get(k, stats.get(k))

    log.info(
        "[SAM Sync] Complete: fetched=%d new=%d skipped=%d errors=%d "
        "dashboard_written=%d dashboard_errors=%d",
        stats["fetched"], stats["new"], stats["skipped"], stats["errors"],
        stats["dashboard_written"], stats["dashboard_errors"],
    )
    return stats


def fetch_new_payloads(
    limit: int = 1000,
    posted_from: Optional[str] = None,
    posted_to: Optional[str] = None,
    state: Optional[str] = None,
    skip_existing: bool = True,
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Fetch SAM.gov opportunities and return only the NEW ones (not yet in
    Qdrant), enriched with category. Does NOT embed or upsert.

    Returns: (new_payloads, fetched_count, skipped_count)
    """
    payloads = fetch_opportunities(
        posted_from=posted_from,
        posted_to=posted_to,
        limit=limit,
        only_active=True,
        state=state,
    )
    fetched = len(payloads)
    if not payloads:
        log.info("[SAM Sync] No opportunities fetched from SAM.gov")
        return [], 0, 0

    client = _get_qdrant_client()
    if not client:
        return [], fetched, 0

    if skip_existing:
        notice_ids = [p.get("sam_notice_id", "") for p in payloads if p.get("sam_notice_id")]
        existing = _existing_notice_ids(client, notice_ids)
        log.info("[SAM Sync] %d / %d notice IDs already in Qdrant", len(existing), len(notice_ids))
    else:
        existing = set()

    new_payloads: List[Dict[str, Any]] = []
    skipped = 0
    for payload in payloads:
        nid = payload.get("sam_notice_id", "")
        if skip_existing and nid in existing:
            skipped += 1
            continue
        new_payloads.append(payload)

    # Fetch the real notice text before categorizing: the search API only gives
    # a link, and both the category keywords and the embedding need the words.
    hydrate_descriptions(new_payloads)

    return [_enrich_category(p) for p in new_payloads], fetched, skipped


def ingest_payloads(payloads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Embed and upsert already-fetched contract payloads into Qdrant.

    Used both by the direct sync and by the approval flow (after the admin
    confirms a proposed batch). Returns stats incl. ``added_contracts``.
    """
    stats: Dict[str, Any] = {
        "new": 0, "errors": 0, "dashboard_written": 0, "dashboard_errors": 0,
        "used_placeholder_vectors": False, "added_contracts": [],
    }
    if not payloads:
        return stats

    client = _get_qdrant_client()
    if not client:
        stats["errors"] = len(payloads)
        return stats

    # No-op for payloads already hydrated by fetch_new_payloads; protects the
    # approval flow, where payloads may have been serialized before hydration.
    hydrate_descriptions(payloads)

    try:
        info = client.get_collection(COLLECTION_NAME)
        vec_cfg = info.config.params.vectors
        dim = vec_cfg.size if hasattr(vec_cfg, "size") else 1536
    except Exception:
        dim = 1536

    point_ids = [
        _deterministic_uuid(p.get("sam_notice_id")) if p.get("sam_notice_id") else str(uuid.uuid4())
        for p in payloads
    ]

    # Generate REAL embeddings; fall back to placeholder only if unavailable.
    vectors = _embed_payload_texts(payloads)
    if vectors is None:
        log.warning(
            "[SAM Sync] Falling back to placeholder vectors for %d contracts — "
            "matching quality will be degraded until real embeddings are generated",
            len(payloads),
        )
        vectors = [_generate_dummy_vector(p, dim) for p in payloads]
        stats["used_placeholder_vectors"] = True
        stats["embedding_error"] = _LAST_EMBED_ERROR.get("msg")

    points_to_upsert: List[PointStruct] = [
        PointStruct(id=pid, vector=vec, payload=pl)
        for pid, vec, pl in zip(point_ids, vectors, payloads)
    ]

    batch_size = 100
    upserted_points: List[PointStruct] = []
    for i in range(0, len(points_to_upsert), batch_size):
        batch = points_to_upsert[i : i + batch_size]
        try:
            client.upsert(collection_name=COLLECTION_NAME, points=batch)
            stats["new"] += len(batch)
            upserted_points.extend(batch)
        except Exception as e:
            log.error("[SAM Sync] Upsert batch error: %s", e)
            stats["errors"] += len(batch)

    stats["added_contracts"] = [_summarize_contract(pt.payload) for pt in upserted_points]

    if upserted_points:
        dw_ok, dw_err = _dual_write_dashboard(client, upserted_points)
        stats["dashboard_written"] = dw_ok
        stats["dashboard_errors"] = dw_err

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


def remove_no_due_date_contracts() -> Dict[str, Any]:
    """
    Remove contracts that have no usable due date from Qdrant.

    This ensures every contract on the dashboard has a due date so users can
    see when each opportunity expires.

    Returns stats: checked, removed, errors
    """
    stats = {"checked": 0, "removed": 0, "errors": 0}

    client = _get_qdrant_client()
    if not client:
        return stats

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
                ids_to_delete.append(p.id)

        if offset is None:
            break

    if ids_to_delete:
        log.info("[SAM Sync] Found %d contracts with no due date to remove", len(ids_to_delete))
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
                log.error("[SAM Sync] Delete no-due-date batch error: %s", e)
                stats["errors"] += len(batch)

        _remove_from_dashboard(client, ids_to_delete)

    log.info(
        "[SAM Sync] No-due-date cleanup: checked=%d removed=%d errors=%d",
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

"""
Backfill real SAM.gov descriptions (and re-embed) in ``government_contracts``.

Contracts ingested from the SAM.gov search API stored a *link* to the notice
description in the ``description`` field instead of the text, so their vectors
were built from "{title}. {url}". This script fetches the real text, stores it
and regenerates the embedding so matching works on the actual scope of work.

Safe to interrupt and re-run: progress is checkpointed to a state file and
every step is idempotent (points already carrying real text are skipped).
Descriptions come from SAM.gov's daily bulk CSV of active opportunities, which
is unmetered; the per-notice API endpoint (as few as 10 requests/day) is only a
fallback for notices missing from the dump. The run stops with exit code 3 when
that quota is spent and picks up where it left off next time.

Usage:
    python backfill_descriptions.py --dry-run           # report only, no writes
    python backfill_descriptions.py                     # full backfill
    python backfill_descriptions.py --limit 50          # process 50 contracts
    python backfill_descriptions.py --skip-embeddings   # payload only, no vectors
"""

import argparse
import json
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional

from qdrant_client.models import PointVectors

from sam_gov_client import (
    fetch_bulk_descriptions,
    fetch_notice_description,
    notice_id_from_description_url,
    quota_exhausted,
    quota_reset_at,
)
from sam_gov_sync import (
    COLLECTION_NAME,
    _embed_payload_texts,
    _embedding_text,
    _get_qdrant_client,
)

log = logging.getLogger("backfill_descriptions")

DEFAULT_STATE_FILE = ".backfill_descriptions_state.json"
SCAN_BATCH = 200
WRITE_BATCH = 50
PAYLOAD_FIELDS = [
    "description", "title", "sam_notice_id", "sam_description_url",
    "description_source", "vector_backfilled_at",
]


def _is_url(value: Any) -> bool:
    return isinstance(value, str) and value.strip().lower().startswith(("http://", "https://"))


def needs_hydration(payload: Dict[str, Any]) -> bool:
    """True when a contract has no usable description text."""
    description = payload.get("description")
    if not description or str(description).strip().lower() in ("nan", "none", "null"):
        return True
    return _is_url(description)


def needs_vector(payload: Dict[str, Any]) -> bool:
    """True when a description was backfilled but its vector still encodes the old text."""
    return bool(payload.get("description_source")) and not payload.get("vector_backfilled_at")


def load_state(path: str) -> Dict[str, Any]:
    if not path or not os.path.exists(path):
        return {"done": []}
    try:
        with open(path, "r", encoding="utf-8") as fh:
            state = json.load(fh)
        state["done"] = list(state.get("done") or [])
        return state
    except Exception as e:
        log.warning("Could not read state file %s (%s) — starting fresh", path, e)
        return {"done": []}


def save_state(path: str, done: set) -> None:
    if not path:
        return
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump({"done": sorted(done), "updated_at": time.time()}, fh)
    os.replace(tmp, path)


def collect_candidates(client, limit: Optional[int], done: set) -> List[Dict[str, Any]]:
    """Scan the collection for contracts whose description is missing or a link."""
    candidates: List[Dict[str, Any]] = []
    scanned = 0
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=SCAN_BATCH,
            offset=offset,
            with_payload=PAYLOAD_FIELDS,
            with_vectors=False,
        )
        if not points:
            break

        for point in points:
            scanned += 1
            payload = point.payload or {}
            if str(point.id) in done:
                continue
            if not needs_hydration(payload) and not needs_vector(payload):
                continue
            candidates.append({"id": point.id, "payload": payload})
            if limit and len(candidates) >= limit:
                break

        if (limit and len(candidates) >= limit) or offset is None:
            break

    log.info(
        "Scanned %d contracts — %d need a description or a refreshed vector",
        scanned, len(candidates),
    )
    return candidates


def candidate_notice_id(payload: Dict[str, Any]) -> str:
    return payload.get("sam_notice_id") or notice_id_from_description_url(
        payload.get("sam_description_url") or payload.get("description")
    )


def hydrate(candidate: Dict[str, Any], bulk: Dict[str, str]) -> Optional[str]:
    """Description text for one candidate, or None when unavailable."""
    payload = candidate["payload"]
    # Already hydrated and only waiting for a vector: no need to fetch again.
    if not needs_hydration(payload):
        return payload.get("description") or ""

    notice_id = candidate_notice_id(payload)
    if not notice_id:
        return None
    return bulk.get(notice_id) or fetch_notice_description(notice_id) or None


def write_batch(client, batch: List[Dict[str, Any]], skip_embeddings: bool) -> Dict[str, int]:
    """Persist descriptions and refreshed vectors for one batch of contracts."""
    stats = {"payloads": 0, "vectors": 0, "errors": 0}

    for item in batch:
        try:
            client.set_payload(
                collection_name=COLLECTION_NAME,
                payload={
                    "description": item["description"],
                    "description_source": item["source"],
                    "description_backfilled_at": time.time(),
                },
                points=[item["id"]],
            )
            stats["payloads"] += 1
        except Exception as e:
            log.error("set_payload failed for %s: %s", item["id"], e)
            stats["errors"] += 1

    if skip_embeddings:
        return stats

    # Embedding text is title + description, so every hydrated contract needs a
    # fresh vector — the old one encoded a URL.
    payloads = [
        {"title": item["payload"].get("title") or "", "description": item["description"]}
        for item in batch
    ]
    vectors = _embed_payload_texts(payloads)
    if vectors is None:
        log.error(
            "Embedding failed for a batch of %d — descriptions were saved, "
            "re-run to retry the vectors",
            len(batch),
        )
        stats["errors"] += len(batch)
        return stats

    try:
        client.update_vectors(
            collection_name=COLLECTION_NAME,
            points=[
                PointVectors(id=item["id"], vector=vector)
                for item, vector in zip(batch, vectors)
            ],
        )
        # Marks the vector as rebuilt so an interrupted run doesn't leave a real
        # description sitting behind a vector built from the old URL.
        client.set_payload(
            collection_name=COLLECTION_NAME,
            payload={"vector_backfilled_at": time.time()},
            points=[item["id"] for item in batch],
        )
        stats["vectors"] += len(batch)
    except Exception as e:
        log.error("update_vectors failed for a batch of %d: %s", len(batch), e)
        stats["errors"] += len(batch)

    return stats


def run(limit: Optional[int], dry_run: bool, skip_embeddings: bool, state_file: str) -> int:
    client = _get_qdrant_client()
    if client is None:
        log.error("QDRANT_URL / QDRANT_API_KEY not set")
        return 1
    if not os.getenv("SAM_GOV_API_KEY"):
        log.warning(
            "SAM_GOV_API_KEY not set — only the bulk CSV will be used, so archived "
            "notices stay without a description"
        )

    state = load_state(state_file)
    done = set(state["done"])
    if done:
        log.info("Resuming: %d contracts already processed", len(done))

    candidates = collect_candidates(client, limit, done)
    if not candidates:
        log.info("Nothing to do — every contract already has a description")
        return 0

    if dry_run:
        sample = candidates[0]["payload"]
        log.info(
            "DRY RUN: %d contracts would be hydrated. Example: %s (notice %s)",
            len(candidates),
            (sample.get("title") or "")[:80],
            sample.get("sam_notice_id") or "?",
        )
        return 0

    bulk = fetch_bulk_descriptions(
        candidate_notice_id(c["payload"])
        for c in candidates
        if needs_hydration(c["payload"])
    )

    totals = {"hydrated": 0, "unavailable": 0, "deferred": 0,
              "payloads": 0, "vectors": 0, "errors": 0}
    batch: List[Dict[str, Any]] = []

    quota_note = False
    for index, candidate in enumerate(candidates, start=1):
        text = hydrate(candidate, bulk)
        if not text and quota_exhausted():
            # Missing from the dump (archived) and the API quota is spent: leave
            # the contract untouched so a later run can still fetch it.
            totals["deferred"] += 1
            if not quota_note:
                log.warning(
                    "SAM.gov API quota spent — notices missing from the bulk CSV are "
                    "deferred until after %s", quota_reset_at(),
                )
                quota_note = True
        elif text:
            totals["hydrated"] += 1
            source = candidate["payload"].get("description_source") or "sam_gov_noticedesc"
            batch.append({**candidate, "description": text, "source": source})
        else:
            totals["unavailable"] += 1
            # Clear the URL: embedding it is worse than embedding nothing.
            if _is_url(candidate["payload"].get("description")):
                batch.append({**candidate, "description": "", "source": "unavailable"})
            else:
                done.add(str(candidate["id"]))

        if len(batch) >= WRITE_BATCH or index == len(candidates):
            if batch:
                written = write_batch(client, batch, skip_embeddings)
                for key, value in written.items():
                    totals[key] += value
                # With --skip-embeddings the vectors are still stale, so these
                # ids must stay pending for the next run.
                if not written["errors"] and not skip_embeddings:
                    done.update(str(item["id"]) for item in batch)
                batch = []
            save_state(state_file, done)
            log.info(
                "Progress %d/%d — hydrated=%d unavailable=%d deferred=%d vectors=%d errors=%d",
                index, len(candidates), totals["hydrated"], totals["unavailable"],
                totals["deferred"], totals["vectors"], totals["errors"],
            )

    log.info(
        "Backfill finished: hydrated=%d unavailable=%d deferred=%d payloads=%d "
        "vectors=%d errors=%d",
        totals["hydrated"], totals["unavailable"], totals["deferred"],
        totals["payloads"], totals["vectors"], totals["errors"],
    )
    if totals["errors"]:
        return 2
    return 3 if totals["deferred"] else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None,
                        help="Process at most N contracts (default: all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Report how many contracts need a description and exit")
    parser.add_argument("--skip-embeddings", action="store_true",
                        help="Store descriptions without regenerating vectors")
    parser.add_argument("--state-file", default=DEFAULT_STATE_FILE,
                        help=f"Checkpoint file for resuming (default: {DEFAULT_STATE_FILE})")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    return run(args.limit, args.dry_run, args.skip_embeddings, args.state_file)


if __name__ == "__main__":
    sys.exit(main())

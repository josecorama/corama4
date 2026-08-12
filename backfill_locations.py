#!/usr/bin/env python3
"""Rebuild contract locations in Qdrant from SAM.gov's own address data.

Locations were resolved field by field, so a notice could end up mixing the
place-of-performance city with the contracting-office state ("Nicosia" +
"WASHINGTON, DC"), keep placeholder cities ("0") or carry a state and ZIP inside
the city name. This rewrites city/state/zip_code/location from a single address
per contract — place of performance when SAM.gov provides one, contracting
office otherwise — and records which one it was in ``location_source``.

Data comes from the unmetered bulk CSV dumps, so it costs no API quota, and only
payload fields are touched: point IDs, vectors and every other field stay as is.

Usage:
    python backfill_locations.py --dry-run      # report only, no writes
    python backfill_locations.py                # fix contracts still open
    python backfill_locations.py --all          # include contracts already closed
"""

import argparse
import csv
import logging
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sam_gov_client import (
    SAM_GOV_ARCHIVE_CSV_URL,
    SAM_GOV_BULK_CSV_URL,
    _clean_city,
    _download_bulk_csv,
    _fiscal_year,
)
from sam_gov_sync import COLLECTION_NAME, _get_qdrant_client

log = logging.getLogger("backfill_locations")

SCAN_BATCH = 500
WRITE_BATCH = 100
PAYLOAD_FIELDS = ["sam_notice_id", "state", "city", "zip_code", "location",
                  "location_source", "due_date"]


def parse_due_date(value: Any) -> Optional[date]:
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(value)[:10], fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def location_from_csv_row(row: Dict[str, str]) -> Dict[str, str]:
    """Resolve one address for a bulk CSV row, mirroring resolve_location()."""
    for source, city, state, zip_code in (
        ("place_of_performance", row.get("PopCity"), row.get("PopState"), row.get("PopZip")),
        ("contracting_office", row.get("City"), row.get("State"), row.get("ZipCode")),
    ):
        state = str(state or "").strip()
        if not state:
            continue
        city = _clean_city(city)
        return {
            "city": city,
            "state": state,
            "zip_code": str(zip_code or "").strip().split("-")[0],
            "location": f"{city}, {state}" if city else state,
            "location_source": source,
        }
    return {}


def collect_contracts(client, open_only: bool) -> Dict[str, Dict[str, Any]]:
    """Map notice id -> {id, payload} for the contracts worth fixing."""
    contracts: Dict[str, Dict[str, Any]] = {}
    skipped_closed = 0
    today = date.today()
    offset = None

    while True:
        points, offset = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=SCAN_BATCH,
            offset=offset,
            with_payload=PAYLOAD_FIELDS,
            with_vectors=False,
        )
        for point in points:
            payload = point.payload or {}
            notice_id = payload.get("sam_notice_id")
            if not notice_id:
                continue
            due = parse_due_date(payload.get("due_date"))
            if open_only and due and due < today:
                skipped_closed += 1
                continue
            contracts[str(notice_id)] = {"id": point.id, "payload": payload}
        if offset is None:
            break

    log.info("%d contracts to check (%d closed ones skipped)", len(contracts), skipped_closed)
    return contracts


def build_fixes(contracts: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compare each contract against the dumps and collect the ones that differ."""
    fiscal_year = _fiscal_year()
    sources = [(SAM_GOV_BULK_CSV_URL, "sam_opportunities_active.csv")]
    sources += [
        (SAM_GOV_ARCHIVE_CSV_URL.format(fiscal_year=year),
         f"sam_opportunities_archived_fy{year}.csv")
        for year in (fiscal_year, fiscal_year - 1)
    ]

    fixes: List[Dict[str, Any]] = []
    seen = set()
    for url, name in sources:
        pending = contracts.keys() - seen
        if not pending:
            break
        path = _download_bulk_csv(url, name)
        if not path:
            continue
        with open(path, "r", encoding="utf-8", errors="replace", newline="") as fh:
            for row in csv.DictReader(fh):
                notice_id = (row.get("NoticeId") or "").strip()
                if notice_id not in pending or notice_id in seen:
                    continue
                seen.add(notice_id)
                resolved = location_from_csv_row(row)
                if not resolved:
                    continue
                payload = contracts[notice_id]["payload"]
                if all(str(payload.get(k) or "") == v for k, v in resolved.items()):
                    continue
                moved = any(
                    str(payload.get(k) or "") != resolved[k]
                    for k in ("city", "state", "zip_code", "location")
                )
                fixes.append({"id": contracts[notice_id]["id"], "payload": resolved,
                              "before": payload, "moved": moved})
        log.info("%s: %d contracts matched, %d to update", name, len(seen), len(fixes))

    log.info("%d contracts not present in any dump", len(contracts) - len(seen))
    return fixes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--all", action="store_true",
                        help="also fix contracts whose due date has passed")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    if not os.getenv("QDRANT_URL") and not os.getenv("Qdrant_EP"):
        log.error("QDRANT_URL not set")
        return 1

    client = _get_qdrant_client()
    contracts = collect_contracts(client, open_only=not args.all)
    fixes = build_fixes(contracts)

    if not fixes:
        log.info("Every location already matches SAM.gov")
        return 0

    moved = [f for f in fixes if f["moved"]]
    log.info(
        "%d contracts change location, %d only gain the location_source provenance",
        len(moved), len(fixes) - len(moved),
    )
    for fix in moved[:5]:
        before = {k: fix["before"].get(k) for k in ("location", "city", "state", "zip_code")}
        log.info("e.g. %s -> %s", before, fix["payload"])

    if args.dry_run:
        log.info("DRY RUN: %d locations would be rewritten", len(fixes))
        return 0

    written = 0
    for start in range(0, len(fixes), WRITE_BATCH):
        batch = fixes[start:start + WRITE_BATCH]
        for fix in batch:
            client.set_payload(
                collection_name=COLLECTION_NAME,
                payload=fix["payload"],
                points=[fix["id"]],
            )
            written += 1
        log.info("Updated %d/%d locations", written, len(fixes))

    log.info("Done: %d locations rewritten", written)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

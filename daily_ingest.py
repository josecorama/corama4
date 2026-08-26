"""
Daily contract ingestion job.

Default mode is **propose**: fetch fresh SAM.gov and BidBuy Illinois opportunities, store them as a
*pending* batch, and email admin@corama.ai a preview with Confirm / Reject
links. Contracts are only ingested (embedded + upserted into Qdrant) after the
admin clicks Confirm — so every ingest is pre-approved.

Use ``--mode direct`` to skip approval and ingest immediately (the old
behaviour), e.g. for manual backfills.

Run once per day (Render Cron Job):

    python daily_ingest.py

Configuration (environment variables):
    SAM_GOV_API_KEY / QDRANT_URL / QDRANT_API_KEY / OpenAI key -> ingestion
    DATABASE_URL + FIREBASE_SERVICE_ACCOUNT_JSON (or SERVICE_ACCOUNT_JSON)
                                                 -> pending-batch storage
    INGEST_DIGEST_EMAIL   override recipient (default admin@corama.ai)
    APP_BASE_URL          base URL for Confirm/Reject links (default https://corama.ai)
    INGEST_LIMIT          max opportunities to fetch (default 1000)
    INGEST_STATES         optional comma-separated US state codes (e.g. "IL,IN")
    INGEST_SEND_EMAIL     "false" to skip the email (default "true")
    INGEST_SOURCES        comma-separated ``sam,bidbuy`` (default both)
"""

import os
import sys
import logging
import argparse
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from sam_gov_sync import fetch_new_payloads, ingest_payloads, remove_expired_contracts
from bidbuy_sync import fetch_new_payloads as fetch_bidbuy_payloads
from sam_gov_client import last_fetch_error
from ingest_approval import create_pending_batch
from ingest_email import build_preview_html, build_result_html, dedupe
from email_utils import send_email_smtp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("daily_ingest")
_LAST_SOURCE_ERRORS: Dict[str, Dict[str, str]] = {}

DEFAULT_DIGEST_EMAIL = "admin@corama.ai"
DEFAULT_BASE_URL = "https://corama.ai"


def collect_candidates(
    limit: int, states: List[str], sources: Tuple[str, ...] = ("sam", "bidbuy")
) -> Tuple[List[Dict[str, Any]], int, int]:
    """Fetch new (not-yet-ingested) contracts from the enabled sources."""
    all_new: List[Dict[str, Any]] = []
    fetched_total = skipped_total = 0
    _LAST_SOURCE_ERRORS.clear()

    if "sam" in sources:
        log.info("Fetching federal SAM.gov opportunities (limit=%d)...", limit)
        new, fetched, skipped = fetch_new_payloads(limit=limit)
        sam_error = last_fetch_error()
        if sam_error:
            _LAST_SOURCE_ERRORS.setdefault("sam", sam_error)
            log.error(
                "SAM.gov fetch failed (%s): %s",
                sam_error["code"], sam_error["detail"],
            )
        all_new.extend(new)
        fetched_total += fetched
        skipped_total += skipped
        for st in states:
            log.info("Fetching SAM.gov opportunities for state=%s...", st)
            new, fetched, skipped = fetch_new_payloads(limit=limit, state=st)
            sam_error = last_fetch_error()
            if sam_error:
                _LAST_SOURCE_ERRORS.setdefault("sam", sam_error)
                log.error(
                    "SAM.gov state fetch failed (%s): %s",
                    sam_error["code"], sam_error["detail"],
                )
            all_new.extend(new)
            fetched_total += fetched
            skipped_total += skipped

    if "bidbuy" in sources:
        log.info("Fetching BidBuy Illinois opportunities (limit=%d)...", limit)
        new, fetched, skipped = fetch_bidbuy_payloads(limit=limit)
        all_new.extend(new)
        fetched_total += fetched
        skipped_total += skipped

    # De-dupe across federal/state pulls by notice id
    seen, deduped = set(), []
    for p in all_new:
        key = (p.get("source"), p.get("sam_notice_id") or p.get("source_url"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)

    return deduped, fetched_total, skipped_total


def send_mail(recipients: List[str], subject: str, html_body: str) -> None:
    if not recipients:
        log.warning("No digest recipients configured — skipping email")
        return
    for r in recipients:
        ok, err = send_email_smtp(r, subject, html_body)
        if ok:
            log.info("Email '%s' sent to %s", subject, r)
        else:
            log.error("Failed to send email to %s: %s", r, err)


def run_propose(limit: int, states: List[str], recipients: List[str],
                base_url: str, send_email: bool,
                sources: Tuple[str, ...] = ("sam", "bidbuy")) -> int:
    candidates, fetched, skipped = collect_candidates(limit, states, sources)

    # Expiry cleanup is safe to run without approval (keeps the DB fresh)
    cleanup = remove_expired_contracts()
    removed = cleanup.get("removed", 0)

    candidates = dedupe(candidates)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if not candidates:
        if _LAST_SOURCE_ERRORS:
            all_sources_failed = all(source in _LAST_SOURCE_ERRORS for source in sources)
            details = "; ".join(
                f"{source}={error['code']}: {error['detail']}"
                for source, error in _LAST_SOURCE_ERRORS.items()
            )
            if all_sources_failed:
                log.error("All ingestion sources failed; no contracts to propose: %s", details)
                if send_email:
                    body = build_result_html(
                        {"new": 0, "fetched": fetched, "skipped": skipped,
                         "removed_expired": removed, "errors": len(_LAST_SOURCE_ERRORS),
                         "source_errors": _LAST_SOURCE_ERRORS, "added_contracts": []},
                        title="Daily Ingestion — source fetch failed",
                    )
                    send_mail(recipients, f"Corama daily ingest: source failure ({today})", body)
                return 1
            log.warning(
                "Some ingestion sources failed; no new contracts from remaining sources: %s",
                details,
            )
            if send_email:
                body = build_result_html(
                    {"new": 0, "fetched": fetched, "skipped": skipped,
                     "removed_expired": removed, "errors": len(_LAST_SOURCE_ERRORS),
                     "source_errors": _LAST_SOURCE_ERRORS, "added_contracts": []},
                    title="Daily Ingestion — source warning",
                )
                send_mail(recipients, f"Corama daily ingest: source warning ({today})", body)
            return 0
        log.info("No new contracts to propose (fetched=%d skipped=%d)", fetched, skipped)
        if send_email:
            body = build_result_html(
                {"new": 0, "fetched": fetched, "skipped": skipped, "removed_expired": removed,
                 "errors": 0, "added_contracts": []},
                title="Daily Ingestion — nothing new today",
            )
            send_mail(recipients, f"Corama daily ingest: no new contracts ({today})", body)
        return 0

    source_label = " + ".join(
        label for key, label in (("sam", "SAM.gov"), ("bidbuy", "BidBuy Illinois"))
        if key in sources
    )
    token = create_pending_batch(candidates, source=source_label)
    if not token:
        log.error("Could not store pending batch (Firebase unavailable). Aborting propose.")
        return 1

    confirm_url = f"{base_url.rstrip('/')}/api/ingest/confirm/{token}"
    reject_url = f"{base_url.rstrip('/')}/api/ingest/reject/{token}"
    log.info("Pending batch %s created with %d contracts. Confirm: %s", token, len(candidates), confirm_url)

    if send_email:
        body = build_preview_html(candidates, confirm_url, reject_url)
        send_mail(recipients, f"Corama: approve ingest of {len(candidates)} new contracts ({today})", body)
    return 0


def run_direct(limit: int, states: List[str], recipients: List[str], send_email: bool,
               sources: Tuple[str, ...] = ("sam", "bidbuy")) -> int:
    candidates, fetched, skipped = collect_candidates(limit, states, sources)
    cleanup = remove_expired_contracts()

    stats: Dict[str, Any] = {"fetched": fetched, "skipped": skipped,
                             "removed_expired": cleanup.get("removed", 0)}
    ingest_stats = ingest_payloads(candidates)
    stats.update(ingest_stats)

    log.info("Direct ingest complete: new=%d fetched=%d skipped=%d removed_expired=%d errors=%d",
             stats.get("new", 0), fetched, skipped, stats["removed_expired"], stats.get("errors", 0))

    if send_email:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        body = build_result_html(stats, title="Daily Contract Ingestion")
        send_mail(recipients, f"Corama daily ingest: {stats.get('new', 0)} new contracts ({today})", body)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Daily SAM.gov -> Qdrant contract ingestion")
    parser.add_argument("--mode", choices=["propose", "direct"], default="propose",
                        help="propose = email approval first (default); direct = ingest immediately")
    parser.add_argument("--limit", type=int, default=int(os.getenv("INGEST_LIMIT", "1000")))
    parser.add_argument("--states", default=os.getenv("INGEST_STATES", ""),
                        help="Comma-separated US state codes to also pull (e.g. IL,IN)")
    parser.add_argument("--email", default=os.getenv("INGEST_DIGEST_EMAIL", DEFAULT_DIGEST_EMAIL),
                        help="Comma-separated recipient emails (default admin@corama.ai)")
    parser.add_argument("--base-url", default=os.getenv("APP_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--no-email", action="store_true", help="Do not send any email")
    parser.add_argument("--sources", default=os.getenv("INGEST_SOURCES", "sam,bidbuy"),
                        help="Comma-separated enabled sources: sam,bidbuy (default both)")
    args = parser.parse_args()

    states = [s.strip().upper() for s in args.states.split(",") if s.strip()]
    recipients = [e.strip() for e in args.email.split(",") if e.strip()]
    send_email = not args.no_email and os.getenv("INGEST_SEND_EMAIL", "true").lower() == "true"
    sources = tuple(dict.fromkeys(
        source.strip().lower() for source in args.sources.split(",")
        if source.strip().lower() in {"sam", "bidbuy"}
    ))
    if not sources:
        parser.error("--sources must include sam and/or bidbuy")

    log.info("Starting daily ingest: mode=%s limit=%d states=%s email=%s recipients=%s",
             args.mode, args.limit, states or "none", "on" if send_email else "off", recipients)
    log.info("Enabled ingestion sources: %s", ", ".join(sources))

    try:
        if args.mode == "direct":
            return run_direct(args.limit, states, recipients, send_email, sources)
        return run_propose(args.limit, states, recipients, args.base_url, send_email, sources)
    except Exception as e:
        log.error("Ingestion failed: %s", e, exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

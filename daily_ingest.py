"""
Daily contract ingestion job.

Fetches fresh opportunities from SAM.gov, generates real embeddings, upserts
them into Qdrant, removes expired contracts, and emails a digest of exactly
which contracts were added.

Intended to run once per day (e.g. as a Render Cron Job):

    python daily_ingest.py

Configuration (environment variables):
    SAM_GOV_API_KEY / QDRANT_URL / QDRANT_API_KEY / OpenAI key  -> ingestion
    INGEST_DIGEST_EMAIL   comma-separated recipients for the summary email
    INGEST_LIMIT          max opportunities to fetch (default 1000)
    INGEST_STATES         optional comma-separated US state codes to also pull
                          (e.g. "IL,IN") to diversify beyond federal-only
    INGEST_SEND_EMAIL     "false" to skip the email (default "true")

CLI flags override the env vars; see --help.
"""

import os
import sys
import html
import logging
import argparse
from datetime import datetime, timezone
from typing import Any, Dict, List

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from sam_gov_sync import sync_sam_gov_to_qdrant, remove_expired_contracts
from email_utils import send_email_smtp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("daily_ingest")


def _merge_stats(base: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
    """Combine stats from multiple sync runs (e.g. federal + per-state)."""
    for key in ("fetched", "new", "skipped", "errors", "dashboard_written", "dashboard_errors"):
        base[key] = base.get(key, 0) + int(extra.get(key, 0) or 0)
    base["added_contracts"] = base.get("added_contracts", []) + list(extra.get("added_contracts", []))
    if extra.get("used_placeholder_vectors"):
        base["used_placeholder_vectors"] = True
    return base


def run_ingest(limit: int, states: List[str]) -> Dict[str, Any]:
    """Run the SAM.gov sync (federal + optional states) and expiry cleanup."""
    combined: Dict[str, Any] = {
        "fetched": 0, "new": 0, "skipped": 0, "errors": 0,
        "dashboard_written": 0, "dashboard_errors": 0,
        "used_placeholder_vectors": False, "added_contracts": [],
    }

    log.info("Running federal SAM.gov sync (limit=%d)...", limit)
    _merge_stats(combined, sync_sam_gov_to_qdrant(limit=limit))

    for st in states:
        log.info("Running SAM.gov sync for state=%s...", st)
        _merge_stats(combined, sync_sam_gov_to_qdrant(limit=limit, state=st))

    log.info("Removing expired contracts...")
    cleanup = remove_expired_contracts()
    combined["removed_expired"] = cleanup.get("removed", 0)
    return combined


def _dedupe_added(contracts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for c in contracts:
        key = (c.get("title"), c.get("url"))
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def build_digest_html(stats: Dict[str, Any]) -> str:
    added = _dedupe_added(stats.get("added_contracts", []))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    warn = ""
    if stats.get("used_placeholder_vectors"):
        warn = (
            "<p style='color:#b00;font-weight:bold'>⚠️ Real embeddings could not "
            "be generated for some/all contracts — placeholder vectors were used, "
            "so matching quality is degraded until this is fixed.</p>"
        )

    rows = []
    for c in added:
        title = html.escape(str(c.get("title", "")))
        url = html.escape(str(c.get("url", "")))
        title_cell = f'<a href="{url}">{title}</a>' if url else title
        rows.append(
            "<tr>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{title_cell}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{html.escape(str(c.get('agency','')))}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{html.escape(str(c.get('category','')))}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{html.escape(str(c.get('state','')))}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{html.escape(str(c.get('naics','')))}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{html.escape(str(c.get('due_date','')))}</td>"
            "</tr>"
        )

    if rows:
        table = (
            "<table style='border-collapse:collapse;width:100%;font-size:14px'>"
            "<thead><tr style='background:#0f766e;color:#fff;text-align:left'>"
            "<th style='padding:8px 10px'>Contract</th>"
            "<th style='padding:8px 10px'>Agency</th>"
            "<th style='padding:8px 10px'>Category</th>"
            "<th style='padding:8px 10px'>State</th>"
            "<th style='padding:8px 10px'>NAICS</th>"
            "<th style='padding:8px 10px'>Due date</th>"
            "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
        )
    else:
        table = "<p>No new contracts were added in this run.</p>"

    return f"""\
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#222">
  <h2 style="color:#0f766e">Corama — Daily Contract Ingestion</h2>
  <p style="color:#666">{now}</p>
  {warn}
  <table style="font-size:14px;margin:12px 0">
    <tr><td style="padding:2px 12px 2px 0"><b>New contracts added</b></td><td>{stats.get('new', 0)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0">Fetched from SAM.gov</td><td>{stats.get('fetched', 0)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0">Already existing (skipped)</td><td>{stats.get('skipped', 0)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0">Expired removed</td><td>{stats.get('removed_expired', 0)}</td></tr>
    <tr><td style="padding:2px 12px 2px 0">Errors</td><td>{stats.get('errors', 0)}</td></tr>
  </table>
  <h3 style="color:#0f766e">Newly added contracts ({len(added)})</h3>
  {table}
  <p style="color:#999;font-size:12px;margin-top:20px">Automated message from the Corama ingestion job.</p>
</body></html>"""


def send_digest(stats: Dict[str, Any], recipients: List[str]) -> None:
    if not recipients:
        log.warning("No INGEST_DIGEST_EMAIL recipients configured — skipping digest email")
        return
    subject = f"Corama daily ingest: {stats.get('new', 0)} new contracts ({datetime.now(timezone.utc):%Y-%m-%d})"
    body = build_digest_html(stats)
    for r in recipients:
        ok, err = send_email_smtp(r, subject, body)
        if ok:
            log.info("Digest email sent to %s", r)
        else:
            log.error("Failed to send digest email to %s: %s", r, err)


def main() -> int:
    parser = argparse.ArgumentParser(description="Daily SAM.gov -> Qdrant contract ingestion")
    parser.add_argument("--limit", type=int, default=int(os.getenv("INGEST_LIMIT", "1000")))
    parser.add_argument("--states", default=os.getenv("INGEST_STATES", ""),
                        help="Comma-separated US state codes to also pull (e.g. IL,IN)")
    parser.add_argument("--email", default=os.getenv("INGEST_DIGEST_EMAIL", ""),
                        help="Comma-separated recipient emails for the digest")
    parser.add_argument("--no-email", action="store_true",
                        help="Run ingestion but do not send the digest email")
    args = parser.parse_args()

    states = [s.strip().upper() for s in args.states.split(",") if s.strip()]
    recipients = [e.strip() for e in args.email.split(",") if e.strip()]
    send_email = not args.no_email and os.getenv("INGEST_SEND_EMAIL", "true").lower() == "true"

    log.info("Starting daily ingest (limit=%d, states=%s, email=%s)",
             args.limit, states or "none", "on" if send_email else "off")

    try:
        stats = run_ingest(args.limit, states)
    except Exception as e:
        log.error("Ingestion failed: %s", e, exc_info=True)
        return 1

    log.info("Ingest complete: new=%d fetched=%d skipped=%d removed_expired=%d errors=%d",
             stats.get("new", 0), stats.get("fetched", 0), stats.get("skipped", 0),
             stats.get("removed_expired", 0), stats.get("errors", 0))

    if send_email:
        send_digest(stats, recipients)

    return 0


if __name__ == "__main__":
    sys.exit(main())

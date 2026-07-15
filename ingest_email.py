"""
HTML rendering for contract-ingestion emails (preview + result digest).

Shared by daily_ingest.py (proposal preview) and app.py (post-confirm digest)
so both emails look consistent.
"""

import html
from datetime import datetime, timezone
from typing import Any, Dict, List

TEAL = "#0f766e"


def summarize_contract(c: Dict[str, Any]) -> Dict[str, str]:
    """Normalize a contract payload OR summary into display fields."""
    naics = c.get("naics") if "naics" in c else c.get("naics_codes")
    if isinstance(naics, list):
        naics = ", ".join(str(x) for x in naics)
    return {
        "title": str(c.get("title", "") or "Untitled"),
        "agency": str(c.get("agency", "") or "Unknown agency"),
        "category": str(c.get("category", "") or "Uncategorized"),
        "state": str(c.get("state", "") or c.get("location", "") or ""),
        "naics": str(naics or ""),
        "due_date": str(c.get("due_date", "") or ""),
        "url": str(c.get("source_url", "") or c.get("url", "") or ""),
    }


def dedupe(contracts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen, out = set(), []
    for c in contracts:
        key = (c.get("title"), c.get("url") or c.get("source_url"))
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def _rows(contracts: List[Dict[str, Any]]) -> str:
    rows = []
    for raw in contracts:
        c = summarize_contract(raw)
        title = html.escape(c["title"])
        url = html.escape(c["url"])
        title_cell = f'<a href="{url}">{title}</a>' if url else title
        cells = [title_cell, html.escape(c["agency"]), html.escape(c["category"]),
                 html.escape(c["state"]), html.escape(c["naics"]), html.escape(c["due_date"])]
        tds = "".join(
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{v}</td>" for v in cells
        )
        rows.append(f"<tr>{tds}</tr>")
    return "".join(rows)


def _table(contracts: List[Dict[str, Any]], empty_msg: str) -> str:
    if not contracts:
        return f"<p>{empty_msg}</p>"
    head = "".join(
        f"<th style='padding:8px 10px'>{h}</th>"
        for h in ("Contract", "Agency", "Category", "State", "NAICS", "Due date")
    )
    return (
        "<table style='border-collapse:collapse;width:100%;font-size:14px'>"
        f"<thead><tr style='background:{TEAL};color:#fff;text-align:left'>{head}</tr></thead>"
        f"<tbody>{_rows(contracts)}</tbody></table>"
    )


def build_preview_html(contracts: List[Dict[str, Any]], confirm_url: str, reject_url: str) -> str:
    contracts = dedupe(contracts)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    btn = "display:inline-block;padding:12px 24px;border-radius:6px;color:#fff;text-decoration:none;font-weight:bold;font-size:15px"
    return f"""\
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#222">
  <h2 style="color:{TEAL}">Corama — Contract Ingestion Approval</h2>
  <p style="color:#666">{now}</p>
  <p><b>{len(contracts)}</b> new contract(s) are ready to ingest. Review the list below,
  then approve or reject. Nothing is added to the system until you click <b>Confirm</b>.</p>
  <p style="margin:24px 0">
    <a href="{html.escape(confirm_url)}" style="{btn};background:{TEAL};margin-right:12px">✓ Confirm &amp; ingest</a>
    <a href="{html.escape(reject_url)}" style="{btn};background:#b91c1c">✗ Reject</a>
  </p>
  <p style="color:#999;font-size:12px">These links expire in 48 hours and can be used once.</p>
  <h3 style="color:{TEAL}">Contracts to ingest ({len(contracts)})</h3>
  {_table(contracts, "No new contracts.")}
  <p style="color:#999;font-size:12px;margin-top:20px">Automated message from the Corama ingestion job.</p>
</body></html>"""


def build_result_html(stats: Dict[str, Any], title: str = "Daily Contract Ingestion") -> str:
    added = dedupe(stats.get("added_contracts", []))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    warn = ""
    if stats.get("used_placeholder_vectors"):
        warn = (
            "<p style='color:#b00;font-weight:bold'>⚠️ Real embeddings could not be "
            "generated for some/all contracts — placeholder vectors were used, so "
            "matching quality is degraded until this is fixed.</p>"
        )
    summary = "".join(
        f"<tr><td style='padding:2px 12px 2px 0'>{label}</td><td>{stats.get(key, 0)}</td></tr>"
        for label, key in (
            ("<b>New contracts added</b>", "new"),
            ("Fetched from SAM.gov", "fetched"),
            ("Already existing (skipped)", "skipped"),
            ("Expired removed", "removed_expired"),
            ("Errors", "errors"),
        )
    )
    return f"""\
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#222">
  <h2 style="color:{TEAL}">Corama — {html.escape(title)}</h2>
  <p style="color:#666">{now}</p>
  {warn}
  <table style="font-size:14px;margin:12px 0">{summary}</table>
  <h3 style="color:{TEAL}">Newly added contracts ({len(added)})</h3>
  {_table(added, "No new contracts were added in this run.")}
  <p style="color:#999;font-size:12px;margin-top:20px">Automated message from the Corama ingestion job.</p>
</body></html>"""

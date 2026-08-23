"""BidBuy Illinois scraper and mapper for the government contracts pipeline.

The public BidBuy search page uses a PrimeFaces partial-AJAX table.  This
module deliberately uses a requests session rather than a browser so it can
run from the daily ingestion job and be tested with saved HTML fixtures.
"""

import argparse
import json
import logging
import random
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from nigp_naics import nigp_to_naics_with_source, normalize_nigp_code

log = logging.getLogger(__name__)

BIDBUY_LISTING_URL = (
    "https://www.bidbuy.illinois.gov/bso/view/search/external/"
    "advancedSearchBid.xhtml?openBids=true"
)
BIDBUY_DETAIL_URL = "https://www.bidbuy.illinois.gov/bso/external/bidDetail.sda"
BIDBUY_BASE_URL = "https://www.bidbuy.illinois.gov"
ROWS_PER_PAGE = 25
MIN_REQUEST_INTERVAL_S = 0.5
DETAIL_MIN_REQUEST_INTERVAL_S = 2.0
DETAIL_MAX_REQUEST_INTERVAL_S = 4.0
MAX_RETRIES = 5
INITIAL_BACKOFF_S = 1.0
MAX_BACKOFF_S = 30.0
REQUEST_TIMEOUT = 60
DESCRIPTION_MAX_CHARS = 6000
WAF_RECOVERY_WAIT_S = 60.0
MAX_WAF_RECOVERIES = 3

BROWSER_HEADERS = {
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Connection": "keep-alive",
}

_LAST_FETCH_STATS: Dict[str, int] = {
    "detail_requested": 0,
    "detail_fetched": 0,
    "blocked": 0,
    "fetch_failed": 0,
    "filtered": 0,
}


def _text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _human_bid_type(detail: Dict[str, Any]) -> str:
    """Return BidBuy's human-readable opportunity type without its code."""
    type_code = _text(detail.get("Type Code"))
    type_code = re.sub(r"^\s*\d+\s*[-:]\s*", "", type_code)
    return (type_code or _text(detail.get("Bid Type"))).lower()


def _label_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def parse_listing_page(html: str) -> Tuple[List[str], Optional[int]]:
    """Extract detail document IDs and PrimeFaces row count from a listing."""
    escaped = html.replace("&amp;", "&")
    doc_ids = re.findall(r"bidDetail\.sda\?docId=([^&#\"'\\]+)", escaped)
    # Keep first appearance order while avoiding duplicated links in markup.
    doc_ids = list(dict.fromkeys(doc_ids))
    match = re.search(r"rowCount\s*:\s*(\d+)", html)
    return doc_ids, int(match.group(1)) if match else None


def _parse_hidden(html: str, name: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    field = soup.find("input", {"name": name})
    return str(field.get("value") or "") if field else ""


class BidBuyClient:
    """Polite, retrying requests client for BidBuy Illinois."""

    def __init__(self, session: Optional[requests.Session] = None) -> None:
        self.session = session or requests.Session()
        self._set_browser_headers()
        self._last_request = 0.0
        self._view_state = ""
        self._csrf = ""
        self.blocked_count = 0
        self.fetch_failed_count = 0
        self.detail_requested = 0
        self.detail_fetched = 0
        self.filtered_count = 0

    def _set_browser_headers(self) -> None:
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            **BROWSER_HEADERS,
        })

    def _wait(self, detail: bool = False) -> None:
        elapsed = time.monotonic() - self._last_request
        minimum = (
            random.uniform(DETAIL_MIN_REQUEST_INTERVAL_S, DETAIL_MAX_REQUEST_INTERVAL_S)
            if detail else MIN_REQUEST_INTERVAL_S
        )
        if elapsed < minimum:
            time.sleep(minimum - elapsed)

    @staticmethod
    def _is_waf_challenge(response: requests.Response) -> bool:
        body = response.text[:20000].lower()
        if response.status_code == 202 and (
            response.headers.get("x-amzn-waf-action") == "challenge"
        ):
            return True
        if response.status_code != 403:
            return False
        markers = (
            "aws waf", "awswaf", "x-amzn-waf", "challenge.js", "captcha",
            "request could not be satisfied", "request blocked",
        )
        return any(marker in body for marker in markers)

    def _request(
        self, method: str, url: str, *, detail: bool = False, **kwargs: Any
    ) -> Optional[requests.Response]:
        backoff = INITIAL_BACKOFF_S
        for attempt in range(1, MAX_RETRIES + 1):
            self._wait(detail=detail)
            try:
                response = self.session.request(
                    method, url, timeout=REQUEST_TIMEOUT, **kwargs
                )
                self._last_request = time.monotonic()
                if self._is_waf_challenge(response):
                    log.error("[BidBuy] WAF challenge returned for %s", url)
                    if detail:
                        self.blocked_count += 1
                    return None
                if response.status_code == 429 or response.status_code >= 500:
                    retry_after = response.headers.get("Retry-After")
                    try:
                        delay = float(retry_after) if retry_after else backoff
                    except ValueError:
                        delay = backoff
                    delay += random.uniform(0, backoff * 0.5)
                    log.warning(
                        "[BidBuy] HTTP %d (attempt %d/%d), retrying in %.1fs",
                        response.status_code, attempt, MAX_RETRIES, delay,
                    )
                    if attempt < MAX_RETRIES:
                        time.sleep(delay)
                        backoff = min(backoff * 2, MAX_BACKOFF_S)
                        continue
                response.raise_for_status()
                return response
            except (requests.ConnectionError, requests.Timeout) as exc:
                delay = backoff + random.uniform(0, backoff * 0.5)
                log.warning(
                    "[BidBuy] %s (attempt %d/%d), retrying in %.1fs",
                    type(exc).__name__, attempt, MAX_RETRIES, delay,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(delay)
                    backoff = min(backoff * 2, MAX_BACKOFF_S)
                    continue
            except requests.RequestException as exc:
                log.error("[BidBuy] Request failed: %s", exc)
                return None
        return None

    def _recover_from_waf(self, recovery: int) -> bool:
        """Discard the session and establish a fresh JSF listing session."""
        log.warning(
            "[BidBuy] WAF recovery %d/%d: sleeping %.0fs",
            recovery, MAX_WAF_RECOVERIES, WAF_RECOVERY_WAIT_S,
        )
        time.sleep(WAF_RECOVERY_WAIT_S)
        self.session.close()
        self.session = requests.Session()
        self._set_browser_headers()
        self._last_request = 0.0
        response = self._request("GET", BIDBUY_LISTING_URL)
        if not response:
            return False
        self._load_listing_state(response.text)
        return True

    def _load_listing_state(self, html: str) -> None:
        self._csrf = _parse_hidden(html, "_csrf")
        self._view_state = _parse_hidden(html, "javax.faces.ViewState")

    def fetch_doc_ids(self, limit: Optional[int] = None) -> List[str]:
        """Fetch open-bid document IDs from all listing pages."""
        response = self._request("GET", BIDBUY_LISTING_URL)
        if not response:
            return []
        self._load_listing_state(response.text)
        first_ids, row_count = parse_listing_page(response.text)
        total = row_count if row_count is not None else len(first_ids)
        ids = first_ids[:limit] if limit else first_ids[:]
        for offset in range(ROWS_PER_PAGE, total, ROWS_PER_PAGE):
            if limit and len(ids) >= limit:
                break
            fields = {
                "javax.faces.partial.ajax": "true",
                "javax.faces.source": "bidSearchResultsForm:bidResultId",
                "javax.faces.partial.execute": "bidSearchResultsForm:bidResultId",
                "javax.faces.partial.render": "bidSearchResultsForm:bidResultId",
                "bidSearchResultsForm:bidResultId": "bidSearchResultsForm:bidResultId",
                "bidSearchResultsForm:bidResultId_pagination": "true",
                "bidSearchResultsForm:bidResultId_first": str(offset),
                "bidSearchResultsForm:bidResultId_rows": str(ROWS_PER_PAGE),
                "bidSearchResultsForm:bidResultId_skipChildren": "true",
                "bidSearchResultsForm:bidResultId_encodeFeature": "true",
                "bidSearchResultsForm": "bidSearchResultsForm",
                "_csrf": self._csrf,
                "javax.faces.ViewState": self._view_state,
            }
            response = self._request(
                "POST",
                BIDBUY_LISTING_URL,
                data=fields,
                headers={
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": BIDBUY_LISTING_URL,
                },
            )
            if response is None or response.status_code != 200:
                # A stale JSF view can produce a 403. Refresh the page and
                # retry this offset with the new cookies/ViewState/CSRF token.
                refreshed = self._request("GET", BIDBUY_LISTING_URL)
                if not refreshed:
                    continue
                self._load_listing_state(refreshed.text)
                fields["_csrf"] = self._csrf
                fields["javax.faces.ViewState"] = self._view_state
                response = self._request(
                    "POST",
                    BIDBUY_LISTING_URL,
                    data=fields,
                    headers={
                        "Faces-Request": "partial/ajax",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": BIDBUY_LISTING_URL,
                    },
                )
            if not response or response.status_code != 200:
                continue
            page_ids, _ = parse_listing_page(response.text)
            if not page_ids:
                break
            ids.extend(page_ids)
            ids = list(dict.fromkeys(ids))
        return ids[:limit] if limit else ids

    def fetch_detail(self, doc_id: str) -> Dict[str, Any]:
        """Fetch and parse one open-bid detail page."""
        url = f"{BIDBUY_DETAIL_URL}?docId={doc_id}&external=true&parentUrl=close"
        self.detail_requested += 1
        blocked_before = self.blocked_count
        for recovery in range(MAX_WAF_RECOVERIES + 1):
            response = self._request(
                "GET", url, detail=True, headers={"Referer": BIDBUY_LISTING_URL}
            )
            if response:
                self.detail_fetched += 1
                detail = parse_detail_html(response.text, doc_id=doc_id, detail_url=url)
                detail["html"] = response.text
                return detail
            if self.blocked_count == blocked_before or recovery >= MAX_WAF_RECOVERIES:
                break
            if not self._recover_from_waf(recovery + 1):
                break
        self.fetch_failed_count += 1
        return {"doc_id": doc_id, "detail_url": url, "html": ""}

    def fetch_bids(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch listing IDs then at most ``limit`` detail records."""
        self.blocked_count = self.fetch_failed_count = self.filtered_count = 0
        self.detail_requested = self.detail_fetched = 0
        details = []
        for doc_id in self.fetch_doc_ids(limit=limit):
            detail = self.fetch_detail(doc_id)
            if detail.get("html"):
                details.append(detail)
        return details

    def fetch_stats(self) -> Dict[str, int]:
        """Return counters for the most recent fetch operation."""
        return {
            "detail_requested": self.detail_requested,
            "detail_fetched": self.detail_fetched,
            "blocked": self.blocked_count,
            "fetch_failed": self.fetch_failed_count,
            "filtered": self.filtered_count,
        }


def _label_value(soup: BeautifulSoup, label: str) -> str:
    wanted = _label_key(label)
    for cell in soup.find_all(["td", "th", "dt", "label"]):
        if _label_key(_text(cell.get_text(" ", strip=True))).rstrip(":") != wanted:
            continue
        sibling = cell.find_next_sibling(["td", "th", "dd"])
        if sibling:
            return _text(sibling.get_text(" ", strip=True))
        parent = cell.parent
        if parent:
            cells = parent.find_all(["td", "th", "dd"], recursive=False)
            for index, candidate in enumerate(cells):
                if candidate is cell and index + 1 < len(cells):
                    return _text(cells[index + 1].get_text(" ", strip=True))
    return ""


def _raw_label_value(soup: BeautifulSoup, label: str) -> str:
    """Extract a label value while retaining address line boundaries."""
    wanted = _label_key(label)
    for cell in soup.find_all(["td", "th", "dt", "label"]):
        if _label_key(_text(cell.get_text(" ", strip=True))).rstrip(":") != wanted:
            continue
        sibling = cell.find_next_sibling(["td", "th", "dd"])
        if sibling:
            return sibling.get_text("\n", strip=True)
    return ""


def _extract_items(soup: BeautifulSoup) -> List[Dict[str, str]]:
    items: List[Dict[str, str]] = []
    for node in soup.find_all(string=re.compile(r"NIGP\s*Code", re.I)):
        parent = node.parent
        code_row = parent.parent if parent else None
        text = _text(code_row.get_text(" ", strip=True) if code_row else node)
        match = re.search(r"NIGP\s*Code\s*:?\s*([0-9-]+)", text, re.I)
        if not match:
            continue
        item_text = ""
        ancestors = list(parent.parents) if parent else []
        if len(ancestors) > 6:
            item_header = ancestors[6].find("td", class_="inputs-01")
            item_text = _text(item_header.get_text(" ", strip=True) if item_header else "")
        if not item_text and parent and parent.parent:
            item_text = _text(parent.parent.get_text(" ", strip=True))
            item_text = re.sub(r"NIGP\s*Code\s*:?\s*[0-9-]+", "", item_text, flags=re.I).strip(" -:")
        items.append({"nigp_code": match.group(1), "description": item_text})
    return items


def parse_detail_html(
    html: str, doc_id: str = "", detail_url: str = ""
) -> Dict[str, Any]:
    """Parse the generic label/value detail layout into a normalized record."""
    soup = BeautifulSoup(html, "html.parser")
    labels = (
        "Bid Number", "Description", "Available Date", "Bid Opening Date",
        "Purchaser", "Organization", "Department", "Location", "Fiscal Year",
        "Type Code", "Info Contact", "Bid Type", "Bulletin Desc",
        "Ship-to Address", "Bill-to Address", "File Attachments", "SPO Name",
        "Is this a Small Business Set Aside Procurement?",
        "Is there a BEP/VBP Participation Goal?", "Requisition",
    )
    detail: Dict[str, Any] = {
        "doc_id": doc_id,
        "detail_url": detail_url,
        "items": _extract_items(soup),
    }
    for label in labels:
        detail[label] = _label_value(soup, label)
    requisition_match = re.search(
        r"\bRequisition\s*:\s*([A-Za-z0-9][A-Za-z0-9-]*)",
        soup.get_text(" ", strip=True),
        flags=re.I,
    )
    if requisition_match:
        detail["Requisition"] = requisition_match.group(1)
    detail["Ship-to Address"] = _raw_label_value(soup, "Ship-to Address") or detail["Ship-to Address"]
    attachments = []
    for anchor in soup.find_all("a", href=True):
        row = anchor.find_parent("tr")
        row_text = _text(row.get_text(" ", strip=True) if row else "")
        if "File Attachments" in row_text:
            file_match = re.search(r"downloadFile\(['\"]([^'\"]+)", anchor["href"])
            if file_match and doc_id:
                attachments.append(urljoin(
                    BIDBUY_BASE_URL,
                    f"/bso/external/bidDetail.sda?downloadFileNbr={file_match.group(1)}"
                    f"&docId={doc_id}&docType=B&mode=download",
                ))
            elif not anchor["href"].lower().startswith("javascript:"):
                attachments.append(urljoin(BIDBUY_BASE_URL, anchor["href"]))
    detail["file_attachments"] = list(dict.fromkeys(attachments))
    return detail


def bidbuy_filter_reason(detail: Dict[str, Any]) -> Optional[str]:
    """Return why a BidBuy notice is non-actionable, if applicable."""
    type_text = " ".join(
        _text(detail.get(key))
        for key in (
            "Type Code",
            "Bid Type",
            "bidbuy_type_code",
            "opportunity_type",
        )
    ).lower()
    normalized = re.sub(r"[_/-]+", " ", type_text)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if re.search(r"\bfinal\s*cost\b|\baward(?:ed)?(?:\s+notice)?\b", normalized):
        return "final_cost_or_award"
    if re.search(r"\bamend\w*\b|\bchange\s*order\b", normalized):
        return "amendment_or_change_order"
    if re.search(r"\bexempt(?:\s+notice)?\b", normalized):
        return "exempt_notice"
    title = _text(detail.get("Description") or detail.get("title"))
    title = re.sub(r"[_/:-]+", " ", title.lower())
    title = re.sub(r"\s+", " ", title).strip()
    if re.search(r"\bfinal\s*cost\b|\baward\s+notice\b", title):
        return "final_cost_or_award"
    if re.search(r"\bamendment\b|\bchange\s*order\b", title):
        return "amendment_or_change_order"
    if re.search(r"\bexempt\s+notice\b", title):
        return "exempt_notice"
    return None


def is_actionable_bid(detail: Dict[str, Any]) -> bool:
    """Return whether a BidBuy notice should be offered for ingestion."""
    return bidbuy_filter_reason(detail) is None


def parse_bidbuy_date(value: object) -> Optional[str]:
    """Convert BidBuy MM/DD/YYYY dates to the corpus DD/MM/YYYY format."""
    raw = _text(value)
    if not raw:
        return None
    for fmt in (
        "%m/%d/%Y", "%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %I:%M:%S %p", "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(raw.split(" - ")[0].strip(), fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return None


def _parse_address(address: str) -> Dict[str, str]:
    original = str(address or "")
    match = re.search(
        r"(?:^|\n)\s*([A-Za-z][A-Za-z .'-]*?),\s*([A-Z]{2})\s+"
        r"(\d{5}(?:-\d{4})?)\b",
        original,
    )
    raw = _text(address)
    if not match:
        match = re.search(
            r"([A-Za-z][A-Za-z .'-]*?),\s*([A-Z]{2})\s+"
            r"(\d{5}(?:-\d{4})?)\b",
            raw,
        )
    if not match:
        return {"city": "", "state": "IL", "zip_code": "", "location": raw, "location_source": "Location field/fallback"}
    city, state, zip_code = match.groups()
    before = raw[:match.start()].rstrip(" ,")
    parts = [p.strip() for p in before.split(",") if p.strip()]
    city = city.strip() or (parts[-1] if parts else "")
    return {
        "city": city,
        "state": state,
        "zip_code": zip_code.split("-")[0],
        "location": f"{city}, {state}" if city else state,
        "location_source": "Ship-to Address",
    }


def map_bid_to_payload(detail: Dict[str, Any]) -> Dict[str, Any]:
    """Map a parsed BidBuy detail record to the canonical contract payload."""
    items = detail.get("items") or []
    item_descriptions = [_text(i.get("description")) for i in items if _text(i.get("description"))]
    bulletin = _text(detail.get("Bulletin Desc"))
    description = ". ".join(x for x in (bulletin, " ".join(item_descriptions)) if x)
    description = description[:DESCRIPTION_MAX_CHARS]
    nigp_codes: List[str] = []
    naics_codes: List[str] = []
    naics_sources: List[str] = []
    for item in items:
        code = normalize_nigp_code(item.get("nigp_code"))
        if code and code not in nigp_codes:
            nigp_codes.append(code)
            mapped_naics, source = nigp_to_naics_with_source(code)
            if source not in naics_sources and source != "none":
                naics_sources.append(source)
            for naics in mapped_naics:
                if naics not in naics_codes:
                    naics_codes.append(naics)
    organization = _text(detail.get("Organization"))
    department = _text(detail.get("Department"))
    agency = " - ".join(x for x in (organization, department) if x)
    location = _parse_address(detail.get("Ship-to Address", ""))
    if (
        not _text(detail.get("Ship-to Address"))
        or (not location["city"] and not location["zip_code"])
    ):
        location = _parse_address(detail.get("Location", ""))
        location["location_source"] = "Location field/fallback"
    attachments = detail.get("file_attachments") or []
    filter_reason = bidbuy_filter_reason(detail)
    return {
        "source": "BidBuy Illinois",
        "source_url": detail.get("detail_url", ""),
        "detail_url": detail.get("detail_url", ""),
        "title": _text(detail.get("Description")),
        "description": description,
        "agency": agency,
        "agency_top": organization,
        "location": location["location"],
        "state": location["state"],
        "city": location["city"],
        "zip_code": location["zip_code"],
        "location_source": location["location_source"],
        "contract_number": _text(detail.get("Bid Number")),
        "posted_date": parse_bidbuy_date(detail.get("Available Date")),
        "due_date": parse_bidbuy_date(detail.get("Bid Opening Date")),
        "budget": None,
        "category": None,
        "naics_codes": naics_codes,
        "cfda_aln": None,
        "document_urls": attachments or None,
        "government_level": "state",
        "opportunity_type": _human_bid_type(detail),
        "opportunity_status": "open",
        "bidbuy_actionable": filter_reason is None,
        "bidbuy_filter_reason": filter_reason,
        "confidence_score": 0.9 if detail.get("Bid Number") and detail.get("Bid Opening Date") else 0.75,
        "validation_status": "bidbuy_scrape",
        "bidbuy_doc_id": detail.get("doc_id", ""),
        "bidbuy_type_code": _text(detail.get("Type Code")),
        "bidbuy_bid_type": _text(detail.get("Bid Type")),
        "bidbuy_naics_source": (
            "crosswalk_exact" if "crosswalk_exact" in naics_sources
            else "crosswalk_class" if "crosswalk_class" in naics_sources else "none"
        ),
        "bidbuy_purchaser": _text(detail.get("Purchaser")),
        "bidbuy_info_contact": _text(detail.get("Info Contact")),
        "bidbuy_nigp_codes": nigp_codes,
        "bidbuy_small_business_set_aside": _text(
            detail.get("Is this a Small Business Set Aside Procurement?")
        ),
        "bidbuy_bep_vbp_goal": _text(detail.get("Is there a BEP/VBP Participation Goal?")),
        "bidbuy_requisition": _text(detail.get("Requisition")),
        "bidbuy_fiscal_year": _text(detail.get("Fiscal Year")),
        "bidbuy_items": items,
    }


def fetch_open_bids(
    limit: Optional[int] = None, include_filtered: bool = False
) -> List[Dict[str, Any]]:
    """Return actionable payloads, optionally retaining filtered diagnostics."""
    client = BidBuyClient()
    payloads = [map_bid_to_payload(detail) for detail in client.fetch_bids(limit=limit)]
    filtered = [p for p in payloads if not p["bidbuy_actionable"]]
    client.filtered_count = len(filtered)
    if filtered:
        log.info(
            "[BidBuy] filtered=%d non-actionable notices: %s",
            len(filtered),
            ", ".join(str(p.get("bidbuy_doc_id") or "") for p in filtered),
        )
    _LAST_FETCH_STATS.clear()
    _LAST_FETCH_STATS.update(client.fetch_stats())
    log.info(
        "[BidBuy] detail_requested=%d detail_fetched=%d filtered=%d "
        "blocked=%d fetch_failed=%d",
        client.detail_requested, client.detail_fetched,
        client.filtered_count, client.blocked_count, client.fetch_failed_count,
    )
    return payloads if include_filtered else [
        payload for payload in payloads if payload["bidbuy_actionable"]
    ]


def get_last_fetch_stats() -> Dict[str, int]:
    """Return counters from the most recent convenience fetch."""
    return dict(_LAST_FETCH_STATS)


def fetch_opportunities(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Compatibility name matching the SAM.gov client fetch entry point."""
    return fetch_open_bids(limit=limit)


parse_bid_detail = parse_detail_html


def _main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    parser = argparse.ArgumentParser(description="Dry-run BidBuy Illinois ingestion")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--output", default="bidbuy_dryrun.json")
    parser.add_argument("--raw-dir", default="")
    args = parser.parse_args()
    client = BidBuyClient()
    details = client.fetch_bids(limit=args.limit)
    payloads = [map_bid_to_payload(detail) for detail in details]
    filtered = [p for p in payloads if not p["bidbuy_actionable"]]
    client.filtered_count = len(filtered)
    if filtered:
        log.info(
            "[BidBuy] filtered=%d non-actionable notices: %s",
            len(filtered),
            ", ".join(str(p.get("bidbuy_doc_id") or "") for p in filtered),
        )
    try:
        from category_mapping import map_payload_to_category
        for payload in payloads:
            payload["category"] = map_payload_to_category(payload)
    except ImportError:
        log.warning("Category mapping unavailable; leaving dry-run categories empty")
    Path(args.output).write_text(json.dumps(payloads, indent=2), encoding="utf-8")
    if args.raw_dir:
        raw_dir = Path(args.raw_dir)
        raw_dir.mkdir(parents=True, exist_ok=True)
        for detail in details[:2]:
            (raw_dir / f"{detail['doc_id']}.html").write_text(
                detail.get("html", ""), encoding="utf-8"
            )
    stats = client.fetch_stats()
    log.info(
        "Dry-run wrote %d BidBuy payloads to %s; requested=%d fetched=%d "
        "filtered=%d blocked=%d fetch_failed=%d",
        len(payloads), args.output, stats["detail_requested"],
        stats["detail_fetched"], stats["filtered"], stats["blocked"],
        stats["fetch_failed"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())

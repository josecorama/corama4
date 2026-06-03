"""
SAM.gov Opportunities API Client

Fetches active contract opportunities from SAM.gov and maps them to the
Qdrant payload schema used by the dashboard.

Rate-limit compliance:
  - Max 1 000 requests / minute per API key.
  - Configurable page size (default 500, SAM.gov max 1 000).
  - Automatic sleep between pages to stay under the limit.
  - Exponential backoff with jitter on transient errors (429 / 5xx).

API docs: https://open.gsa.gov/api/get-opportunities-public-api/
"""

import os
import time
import random
import logging
import hashlib
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

import requests

log = logging.getLogger(__name__)

SAM_GOV_API_BASE = "https://api.sam.gov/opportunities/v2/search"

# SAM.gov ptype codes for actionable bidding opportunities
# p = Presolicitation, k = Combined Synopsis/Solicitation, o = Solicitation
# r = Sources Sought, s = Special Notice
ACTIVE_PTYPE_CODES = "p,k,o,r,s"

# Throttling defaults
DEFAULT_PAGE_SIZE = 500
MIN_PAGE_INTERVAL_S = 0.5          # seconds between pages (~120 req/min)
MAX_RETRIES = 5
INITIAL_BACKOFF_S = 2.0
MAX_BACKOFF_S = 60.0


def _get_api_key() -> Optional[str]:
    return os.getenv("SAM_GOV_API_KEY")


def _parse_sam_date(date_str: Optional[str]) -> Optional[str]:
    """Parse various SAM.gov date formats into DD/MM/YYYY for Qdrant storage."""
    if not date_str:
        return None
    try:
        if "T" in date_str:
            date_str = date_str.split("T")[0]
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return parsed.strftime("%d/%m/%Y")
    except Exception:
        return None


def _state_from_place(opp: Dict[str, Any]) -> str:
    """Extract US state code from placeOfPerformance or officeAddress."""
    pop = opp.get("placeOfPerformance") or {}
    state_obj = pop.get("state") or {}
    code = state_obj.get("code")
    if code:
        return code

    office = opp.get("officeAddress") or {}
    return office.get("state", "")


def _agency_hierarchy(opp: Dict[str, Any]) -> tuple:
    """Return (full_agency_path, top_level_agency)."""
    full = opp.get("fullParentPathName", "")
    parts = [p.strip() for p in full.split(".") if p.strip()]
    top = parts[0] if parts else ""
    return full, top


def _location_label(opp: Dict[str, Any]) -> str:
    """Build a 'City, ST' location string."""
    pop = opp.get("placeOfPerformance") or {}
    city_obj = pop.get("city") or {}
    state_obj = pop.get("state") or {}
    city = city_obj.get("name", "")
    state = state_obj.get("code", "")
    if city and state:
        return f"{city}, {state}"
    if state:
        return state

    office = opp.get("officeAddress") or {}
    city = office.get("city", "")
    state = office.get("state", "")
    if city and state:
        return f"{city}, {state}"
    return state or ""


def map_opportunity_to_payload(opp: Dict[str, Any]) -> Dict[str, Any]:
    """Map a single SAM.gov opportunity to the Qdrant payload schema."""
    agency_full, agency_top = _agency_hierarchy(opp)
    naics_codes = opp.get("naicsCodes") or []
    if not naics_codes and opp.get("naicsCode"):
        naics_codes = [str(opp["naicsCode"])]

    posted_date = _parse_sam_date(opp.get("postedDate"))
    # Prefer responseDeadLine; fall back to archiveDate so every contract
    # gets a usable due date for dashboard display and expiry filtering.
    due_date = _parse_sam_date(opp.get("responseDeadLine")) or _parse_sam_date(opp.get("archiveDate"))

    detail_url = opp.get("uiLink") or ""
    sol_number = opp.get("solicitationNumber") or ""

    return {
        "source": "SAM.gov",
        "source_url": detail_url,
        "detail_url": detail_url,
        "title": opp.get("title", ""),
        "description": (opp.get("description") or "")[:1000],
        "agency": agency_full,
        "agency_top": agency_top,
        "location": _location_label(opp),
        "state": _state_from_place(opp),
        "contract_number": sol_number,
        "posted_date": posted_date,
        "due_date": due_date,
        "budget": None,
        "category": None,
        "naics_codes": naics_codes,
        "cfda_aln": None,
        "document_urls": None,
        "government_level": "federal",
        "opportunity_type": (opp.get("type") or "solicitation").lower(),
        "opportunity_status": "open",
        "confidence_score": 0.95,
        "validation_status": "sam_gov_api",
        # Extra SAM.gov-specific fields
        "sam_notice_id": opp.get("noticeId", ""),
        "sam_notice_type": opp.get("type", ""),
        "sam_set_aside": opp.get("typeOfSetAsideDescription"),
        "sam_classification_code": opp.get("classificationCode"),
        "sam_archive_date": opp.get("archiveDate"),
        "sam_description_url": opp.get("description") or "",
        "sam_resource_links": opp.get("resourceLinks") or [],
        "sam_additional_info_link": opp.get("additionalInfoLink") or "",
    }


def _request_with_backoff(url: str, params: Dict[str, Any]) -> Optional[Dict]:
    """Execute a GET request with exponential backoff + jitter on transient errors."""
    backoff = INITIAL_BACKOFF_S
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, params=params, timeout=60)

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", backoff))
                jitter = random.uniform(0, backoff * 0.5)
                wait = retry_after + jitter
                log.warning(
                    "[SAM.gov] 429 rate-limited (attempt %d/%d), sleeping %.1fs",
                    attempt, MAX_RETRIES, wait,
                )
                time.sleep(wait)
                backoff = min(backoff * 2, MAX_BACKOFF_S)
                continue

            if resp.status_code >= 500:
                jitter = random.uniform(0, backoff * 0.5)
                wait = backoff + jitter
                log.warning(
                    "[SAM.gov] Server error %d (attempt %d/%d), retrying in %.1fs",
                    resp.status_code, attempt, MAX_RETRIES, wait,
                )
                time.sleep(wait)
                backoff = min(backoff * 2, MAX_BACKOFF_S)
                continue

            resp.raise_for_status()
            return resp.json()

        except requests.ConnectionError as e:
            jitter = random.uniform(0, backoff * 0.5)
            wait = backoff + jitter
            log.warning(
                "[SAM.gov] Connection error (attempt %d/%d): %s — retrying in %.1fs",
                attempt, MAX_RETRIES, e, wait,
            )
            time.sleep(wait)
            backoff = min(backoff * 2, MAX_BACKOFF_S)

        except requests.Timeout as e:
            jitter = random.uniform(0, backoff * 0.5)
            wait = backoff + jitter
            log.warning(
                "[SAM.gov] Timeout (attempt %d/%d): %s — retrying in %.1fs",
                attempt, MAX_RETRIES, e, wait,
            )
            time.sleep(wait)
            backoff = min(backoff * 2, MAX_BACKOFF_S)

        except requests.RequestException as e:
            log.error("[SAM.gov] Non-retryable request error: %s", e)
            return None

    log.error("[SAM.gov] Exhausted %d retries — giving up on request", MAX_RETRIES)
    return None


def fetch_opportunities(
    posted_from: Optional[str] = None,
    posted_to: Optional[str] = None,
    limit: int = 1000,
    notice_types: Optional[List[str]] = None,
    only_active: bool = True,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> List[Dict[str, Any]]:
    """
    Fetch contract opportunities from SAM.gov API with pagination.

    Pagination respects the SAM.gov rate limit of 1 000 req/min by sleeping
    at least ``MIN_PAGE_INTERVAL_S`` between pages and backing off on 429s.

    Args:
        posted_from: Start date MM/DD/YYYY (default: 90 days ago)
        posted_to: End date MM/DD/YYYY (default: today)
        limit: Max number of opportunities to return
        notice_types: Ignored (kept for compat). ptype codes are set internally.
        only_active: Only return opportunities with future response deadlines
        page_size: Results per page (default 500, max 1000)

    Returns:
        List of Qdrant-compatible payload dicts
    """
    api_key = _get_api_key()
    if not api_key:
        log.error("[SAM.gov] SAM_GOV_API_KEY not configured")
        return []

    today = date.today()
    if not posted_to:
        posted_to = today.strftime("%m/%d/%Y")
    if not posted_from:
        posted_from = (today - timedelta(days=90)).strftime("%m/%d/%Y")

    all_payloads: List[Dict[str, Any]] = []
    page_limit = min(page_size, 1000)
    offset = 0
    page_num = 0
    total_api_calls = 0
    skipped_expired = 0

    log.info(
        "[SAM.gov] Starting fetch: posted_from=%s posted_to=%s limit=%d page_size=%d",
        posted_from, posted_to, limit, page_limit,
    )

    while len(all_payloads) < limit:
        params: Dict[str, Any] = {
            "api_key": api_key,
            "postedFrom": posted_from,
            "postedTo": posted_to,
            "limit": page_limit,
            "offset": offset,
            "ptype": ACTIVE_PTYPE_CODES,
        }

        # Throttle between pages
        if page_num > 0:
            time.sleep(MIN_PAGE_INTERVAL_S)

        data = _request_with_backoff(SAM_GOV_API_BASE, params)
        total_api_calls += 1
        page_num += 1

        if data is None:
            log.error("[SAM.gov] Aborting fetch after failed request at offset %d", offset)
            break

        opportunities = data.get("opportunitiesData") or []
        if not opportunities:
            break

        for opp in opportunities:
            payload = map_opportunity_to_payload(opp)

            # Server-side filter: require a due date and ensure it is in the future
            if only_active:
                if not payload.get("due_date"):
                    skipped_expired += 1
                    continue
                try:
                    dd = datetime.strptime(payload["due_date"], "%d/%m/%Y").date()
                    if dd < today:
                        skipped_expired += 1
                        continue
                except Exception:
                    skipped_expired += 1
                    continue

            all_payloads.append(payload)
            if len(all_payloads) >= limit:
                break

        total_records = data.get("totalRecords", 0)
        offset += page_limit
        if offset >= total_records:
            break

        log.info(
            "[SAM.gov] Page %d: %d items (offset %d/%d), collected %d so far, %d API calls",
            page_num, len(opportunities), offset, total_records,
            len(all_payloads), total_api_calls,
        )

    log.info(
        "[SAM.gov] Fetch complete: %d opportunities collected, %d expired skipped, "
        "%d API calls in %d pages",
        len(all_payloads), skipped_expired, total_api_calls, page_num,
    )
    return all_payloads

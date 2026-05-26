"""
SAM.gov Opportunities API Client

Fetches active contract opportunities from SAM.gov and maps them to the
Qdrant payload schema used by the dashboard.

API docs: https://open.gsa.gov/api/get-opportunities-public-api/
"""

import os
import logging
import hashlib
import uuid
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

import requests

SAM_GOV_API_BASE = "https://api.sam.gov/opportunities/v2/search"

# SAM.gov ptype codes for actionable bidding opportunities
# p = Presolicitation, k = Combined Synopsis/Solicitation, o = Solicitation
# r = Sources Sought, s = Special Notice
ACTIVE_PTYPE_CODES = "p,k,o,r,s"


def _get_api_key() -> Optional[str]:
    return os.getenv("SAM_GOV_API_KEY")


def _parse_sam_date(date_str: Optional[str]) -> Optional[str]:
    """Parse various SAM.gov date formats into DD/MM/YYYY for Qdrant storage."""
    if not date_str:
        return None
    try:
        # ISO format with timezone: "2026-06-08T05:30:00-05:00"
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
    due_date = _parse_sam_date(opp.get("responseDeadLine"))

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
    }


def fetch_opportunities(
    posted_from: Optional[str] = None,
    posted_to: Optional[str] = None,
    limit: int = 1000,
    notice_types: Optional[List[str]] = None,
    only_active: bool = True,
) -> List[Dict[str, Any]]:
    """
    Fetch contract opportunities from SAM.gov API with pagination.

    Args:
        posted_from: Start date MM/DD/YYYY (default: 90 days ago)
        posted_to: End date MM/DD/YYYY (default: today)
        limit: Max number of opportunities to return
        notice_types: Ignored (kept for compat). ptype codes are set internally.
        only_active: Only return opportunities with future response deadlines

    Returns:
        List of Qdrant-compatible payload dicts
    """
    api_key = _get_api_key()
    if not api_key:
        logging.error("[SAM.gov] SAM_GOV_API_KEY not configured")
        return []

    today = date.today()
    if not posted_to:
        posted_to = today.strftime("%m/%d/%Y")
    if not posted_from:
        # SAM.gov enforces a 1-year max range; default to last 90 days
        posted_from = (today - timedelta(days=90)).strftime("%m/%d/%Y")

    all_payloads: List[Dict[str, Any]] = []
    page_limit = min(limit, 1000)  # SAM.gov max per page is 1000
    offset = 0

    while len(all_payloads) < limit:
        params: Dict[str, Any] = {
            "api_key": api_key,
            "postedFrom": posted_from,
            "postedTo": posted_to,
            "limit": page_limit,
            "offset": offset,
            "ptype": ACTIVE_PTYPE_CODES,
        }

        try:
            resp = requests.get(SAM_GOV_API_BASE, params=params, timeout=60)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logging.error(f"[SAM.gov] API request failed: {e}")
            break

        opportunities = data.get("opportunitiesData") or []
        if not opportunities:
            break

        for opp in opportunities:
            payload = map_opportunity_to_payload(opp)

            # Filter: only keep opportunities with a future due date
            if only_active and payload.get("due_date"):
                try:
                    dd = datetime.strptime(payload["due_date"], "%d/%m/%Y").date()
                    if dd < today:
                        continue
                except Exception:
                    pass

            all_payloads.append(payload)
            if len(all_payloads) >= limit:
                break

        total_records = data.get("totalRecords", 0)
        offset += page_limit
        if offset >= total_records:
            break

    logging.info(f"[SAM.gov] Fetched {len(all_payloads)} opportunities")
    return all_payloads

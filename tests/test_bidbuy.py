"""Offline tests for the BidBuy Illinois scraper and payload mapper."""

from pathlib import Path
from datetime import datetime

from bidbuy_client import (
    DESCRIPTION_MAX_CHARS,
    bidbuy_filter_reason,
    is_actionable_bid,
    map_bid_to_payload,
    parse_bidbuy_date,
    parse_detail_html,
    parse_listing_page,
)
from nigp_naics import (
    MAX_CLASS_NAICS,
    nigp_to_naics,
    nigp_to_naics_with_source,
    normalize_nigp_code,
)


FIXTURES = Path(__file__).parent / "fixtures"


def test_bidbuy_date_is_stored_as_day_first():
    assert parse_bidbuy_date("07/14/2026 09:30:00 AM") == "14/07/2026"
    assert parse_bidbuy_date("12/01/2026") == "01/12/2026"


def test_nigp_normalization_and_exact_lookup():
    assert normalize_nigp_code("948-55") == "94855"
    assert normalize_nigp_code("1234") == "01234"
    assert nigp_to_naics("948-55")


def test_nigp_class_fallback():
    exact = nigp_to_naics("948-55")
    fallback = nigp_to_naics("948-99")
    assert exact
    assert fallback
    assert nigp_to_naics_with_source("948-55")[1] == "crosswalk_exact"
    assert nigp_to_naics_with_source("948-99")[1] == "crosswalk_class"


def test_nigp_class_fallback_uses_dominant_sector_and_cap():
    codes, source = nigp_to_naics_with_source("071-99")
    assert source == "crosswalk_class"
    assert codes
    assert len(codes) <= MAX_CLASS_NAICS
    assert {code[:2] for code in codes} == {"44"}

    ambiguous, source = nigp_to_naics_with_source("040-99")
    assert ambiguous == []
    assert source == "none"


def test_listing_pagination_fixture():
    html = (FIXTURES / "bidbuy_listing.html").read_text(encoding="utf-8")
    doc_ids, total = parse_listing_page(html)
    assert total == 142
    assert len(doc_ids) == 25
    assert doc_ids[0] == "27-406AGR-ADMIN-B-53800"


def test_detail_fixture_maps_to_canonical_payload():
    html = (FIXTURES / "bidbuy_detail_27-406AGR-ADMIN-B-53800.html").read_text(
        encoding="utf-8"
    )
    detail = parse_detail_html(
        html,
        doc_id="27-406AGR-ADMIN-B-53800",
        detail_url="https://www.bidbuy.illinois.gov/bso/external/bidDetail.sda?docId=x",
    )
    payload = map_bid_to_payload(detail)
    assert payload["source"] == "BidBuy Illinois"
    assert payload["title"].startswith("EMERGENCY FINAL COST")
    assert payload["due_date"] == "08/09/2026"
    assert payload["posted_date"] == "21/08/2026"
    assert payload["state"] == "IL"
    assert payload["zip_code"] == "62702"
    assert payload["city"] == "Springfield"
    assert payload["bidbuy_nigp_codes"] == ["07192"]
    assert payload["naics_codes"]
    assert payload["bidbuy_naics_source"] == "crosswalk_class"
    assert payload["opportunity_type"] == "emergency"
    assert payload["bidbuy_actionable"] is False
    assert payload["bidbuy_filter_reason"] == "final_cost_or_award"
    assert payload["bidbuy_type_code"] == "40 - Emergency"
    assert payload["bidbuy_bid_type"] == "OPEN"
    assert payload["document_urls"][0].startswith("https://")
    assert "sam_notice_id" not in payload
    assert len(payload["description"]) <= DESCRIPTION_MAX_CHARS


def test_alternate_detail_layout_extracts_requisition_and_contact():
    html = (FIXTURES / "bidbuy_detail_26-482DPH-PREPD-B-52685.html").read_text(
        encoding="utf-8"
    )
    detail = parse_detail_html(html, doc_id="26-482DPH-PREPD-B-52685", detail_url="x")
    payload = map_bid_to_payload(detail)
    assert payload["bidbuy_requisition"] == "26-482DPH-PREPD-R-322599"
    assert payload["bidbuy_info_contact"] == (
        "Contact Aaron Szerletich at aaron.szerletich@illinois.gov"
    )
    assert payload["opportunity_type"] == "emergency"


def test_dashboard_mapping_supports_bidbuy_payload():
    from dashboard_qdrant import normalize_payload_for_dashboard

    html = (FIXTURES / "bidbuy_detail_26-482DPH-PREPD-B-52685.html").read_text(
        encoding="utf-8"
    )
    payload = map_bid_to_payload(
        parse_detail_html(
            html,
            doc_id="26-482DPH-PREPD-B-52685",
            detail_url="https://www.bidbuy.illinois.gov/detail/52685",
        )
    )
    payload["category"] = "Medical & Human Services"
    dashboard = normalize_payload_for_dashboard(payload, point_id=123)
    for field in (
        "bid_name", "bid_number", "organization", "due_date", "due_date_ts",
        "state", "category", "source", "detail_link",
    ):
        assert dashboard[field]
    assert dashboard["due_date"] == "23/08/2026"
    assert dashboard["due_date_ts"] == int(
        datetime.strptime("23/08/2026", "%d/%m/%Y").timestamp()
    )


def test_bidbuy_actionability_keeps_solicitations_and_filters_notice_families():
    cases = (
        ("10 - Invitation for Bid (IFB)", True),
        ("43 - Emergency - Final Cost", False),
        ("15 - Request for Proposal (RFP)", True),
        ("55 - Amendment/Change Order (Increase or No Dollar)", False),
        ("35 - Sole Source", True),
        ("65 - Exempt Notice", False),
    )
    for type_code, expected in cases:
        assert is_actionable_bid({"Type Code": type_code}) is expected


def test_filtered_fixture_type_is_marked_non_actionable():
    detail = parse_detail_html(
        (FIXTURES / "bidbuy_detail_27-406AGR-ADMIN-B-53800.html").read_text(
            encoding="utf-8"
        ),
        doc_id="27-406AGR-ADMIN-B-53800",
    )
    detail["Type Code"] = "43 - Emergency - Final-Cost"
    payload = map_bid_to_payload(detail)
    assert payload["bidbuy_actionable"] is False
    assert payload["bidbuy_filter_reason"] == "final_cost_or_award"


def test_title_filters_real_final_cost_emergency_notice():
    detail = parse_detail_html(
        (FIXTURES / "bidbuy_detail_27-406AGR-ADMIN-B-53800.html").read_text(
            encoding="utf-8"
        ),
        doc_id="27-406AGR-ADMIN-B-53800",
    )
    detail["Type Code"] = "40 - Emergency"
    assert is_actionable_bid(detail) is False
    assert map_bid_to_payload(detail)["bidbuy_filter_reason"] == "final_cost_or_award"


def test_title_filters_award_notice_lease():
    detail = {
        "Type Code": "97 - Non RFI/Alt RFI (Facilities Leasing)",
        "Description": "DNR Lease DNRL2026 Award Notice - real property lease",
    }
    assert is_actionable_bid(detail) is False
    assert bidbuy_filter_reason(detail) == "final_cost_or_award"


def test_title_keeps_awards_banquet_small_purchase():
    detail = {
        "Type Code": "95 - Small Purchase",
        "Description": "FY27 TWE & TOY Awards Banquet",
    }
    assert is_actionable_bid(detail) is True
    assert bidbuy_filter_reason(detail) is None

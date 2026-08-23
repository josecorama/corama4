"""Offline tests for the BidBuy Illinois scraper and payload mapper."""

from pathlib import Path

from bidbuy_client import (
    DESCRIPTION_MAX_CHARS,
    map_bid_to_payload,
    parse_bidbuy_date,
    parse_detail_html,
    parse_listing_page,
)
from nigp_naics import nigp_to_naics, normalize_nigp_code


FIXTURES = Path(__file__).parent / "fixtures"


def test_bidbuy_date_is_stored_as_day_first():
    assert parse_bidbuy_date("07/14/2026 09:30:00 AM") == "14/07/2026"
    assert parse_bidbuy_date("12/01/2026") == "01/12/2026"


def test_nigp_normalization_and_exact_lookup():
    assert normalize_nigp_code("948-55") == "94855"
    assert normalize_nigp_code("1234") == "01234"
    assert nigp_to_naics("948-55")


def test_nigp_class_fallback():
    exact = nigp_to_naics("071-92")
    fallback = nigp_to_naics("071-99")
    assert exact
    assert fallback
    assert set(exact).issubset(set(fallback))


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
    assert payload["document_urls"][0].startswith("https://")
    assert "sam_notice_id" not in payload
    assert len(payload["description"]) <= DESCRIPTION_MAX_CHARS

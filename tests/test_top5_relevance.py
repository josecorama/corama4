"""Unit tests for the Top 5 relevance helpers: ICEE exclusion and the
deterministic capability-statement query builder."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cs_processor import (
    build_capability_query_text,
    payload_has_excluded_term,
    payload_is_hidden_from_dashboard,
)


def test_icee_excluded_in_title():
    assert payload_has_excluded_term({"title": "ICEE Machine Supply"}) is True


def test_icee_excluded_in_description():
    assert payload_has_excluded_term(
        {"title": "Beverage Equipment", "summary": "Provide an icee dispenser"}
    ) is True


def test_icee_case_insensitive():
    assert payload_has_excluded_term({"bid_name": "IcEe frozen drinks"}) is True


def test_icee_uppercase_fields():
    assert payload_has_excluded_term(
        {"Bid Name": "Snacks", "Bid Description": "ICEE and popcorn"}
    ) is True


def test_no_icee_kept():
    assert payload_has_excluded_term(
        {"title": "IT Services", "summary": "Cloud migration and support"}
    ) is False


def test_icee_word_boundary_no_false_positive():
    # "service" / "office" must not match the whole-word "icee".
    assert payload_has_excluded_term(
        {"title": "Office services", "summary": "practice management"}
    ) is False


def test_non_dict_payload():
    assert payload_has_excluded_term(None) is False
    assert payload_has_excluded_term("icee") is False


def test_bidbuy_source_hidden_from_dashboard():
    assert payload_is_hidden_from_dashboard(
        {"title": "Fire Pump Replacement", "source": "BidBuy Illinois"}
    ) is True


def test_bidbuy_url_hidden_from_dashboard():
    assert payload_is_hidden_from_dashboard(
        {"title": "Fire Pump Replacement",
         "source_url": "https://www.bidbuy.illinois.gov/bso/external/bidDetail.sda?docId=1"}
    ) is True


def test_sam_gov_source_not_hidden_from_dashboard():
    assert payload_is_hidden_from_dashboard(
        {"title": "Cellphone Services", "source": "SAM.gov",
         "source_url": "https://sam.gov/opp/view"}
    ) is False


def test_query_builder_strips_contact_noise():
    text = (
        "Acme Consulting provides cybersecurity and cloud migration services. "
        "Contact us at info@acme.com or call +1 (312) 555-1234. "
        "Visit https://www.acme.com for more information."
    )
    out = build_capability_query_text(text)
    assert "info@acme.com" not in out
    assert "https://www.acme.com" not in out
    assert "555" not in out
    # Substantive capability terms are preserved.
    assert "cybersecurity" in out.lower()
    assert "cloud" in out.lower()


def test_query_builder_appends_keywords():
    text = (
        "Cybersecurity cybersecurity cybersecurity consulting consulting "
        "cloud cloud migration services training."
    )
    out = build_capability_query_text(text)
    assert "Key capabilities and services:" in out
    # Most frequent meaningful term should be surfaced.
    assert "cybersecurity" in out.lower()


def test_query_builder_handles_empty():
    assert build_capability_query_text("") == ""
    assert build_capability_query_text(None) == ""


def test_query_builder_respects_max_chars():
    text = "capability " * 20000
    out = build_capability_query_text(text, max_chars=100)
    assert len(out) <= 100


if __name__ == "__main__":
    import traceback

    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception:
                failures += 1
                print(f"FAIL {name}")
                traceback.print_exc()
    sys.exit(1 if failures else 0)

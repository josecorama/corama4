from sam_gov_sync import collapse_solicitation_versions, superseded_point_ids


def _p(num, posted, notice, due="20/10/2026", source="SAM.gov"):
    return {"contract_number": num, "posted_date": posted, "due_date": due,
            "sam_notice_id": notice, "source": source}


def test_collapse_keeps_latest_amendment():
    orig = _p("36C26026Q1019", "30/09/2026", "a")
    amend1 = _p("36C26026Q1019", "05/10/2026", "b")
    amend3 = _p("36C26026Q1019", "08/10/2026", "c")
    other = _p("SPE7M127U0111", "06/10/2026", "d")
    assert collapse_solicitation_versions([amend1, orig, other, amend3]) == [other, amend3]


def test_collapse_keeps_payloads_without_solicitation_number():
    a, b = _p("", "01/10/2026", "a"), _p(None, "01/10/2026", "b")
    assert collapse_solicitation_versions([a, b]) == [a, b]


def test_same_title_different_solicitations_are_not_duplicates():
    relays = [_p(f"SPE7M127U0{i:03d}", "06/10/2026", str(i)) for i in range(5)]
    assert collapse_solicitation_versions(relays) == relays


def test_number_is_normalized_and_scoped_by_source():
    a = _p("w50slf26ra005", "23/09/2026", "a")
    b = _p("W50SLF26RA005 ", "07/10/2026", "b")
    c = _p("W50SLF26RA005", "01/10/2026", "c", source="BidBuy Illinois")
    assert collapse_solicitation_versions([a, b, c]) == [b, c]


def test_superseded_point_ids_returns_older_versions():
    points = [
        (1, _p("N6852026Q1069", "24/09/2026", "a", due="13/10/2026")),
        (2, _p("N6852026Q1069", "07/10/2026", "b")),
        (3, _p("X1", "07/10/2026", "c")),
    ]
    assert superseded_point_ids(points) == [1]


def test_tie_on_posted_date_prefers_later_due_date():
    points = [
        (1, _p("Y1", "07/10/2026", "a", due="28/10/2026")),
        (2, _p("Y1", "07/10/2026", "b", due="30/10/2026")),
    ]
    assert superseded_point_ids(points) == [1]

"""NIGP-to-NAICS crosswalk used by the BidBuy Illinois ingestion adapter."""

import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

_CROSSWALK_PATH = Path(__file__).resolve().parent / "data" / "nigp_naics_crosswalk.csv"
_EXACT: Dict[str, List[str]] = {}
_CLASS_COUNTS: Dict[str, Dict[str, int]] = {}
_CLASS_BY_SECTOR: Dict[str, Dict[str, List[str]]] = {}
MAX_CLASS_NAICS = 12


def normalize_nigp_code(nigp_code: object) -> str:
    """Normalize a BidBuy NIGP code to its five-digit representation."""
    digits = re.sub(r"\D", "", str(nigp_code or ""))
    return digits.zfill(5) if digits else ""


def _load_crosswalk() -> None:
    if _EXACT:
        return
    with _CROSSWALK_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.reader(stream, skipinitialspace=True)
        next(reader, None)  # CEI banner row
        headers = next(reader, None)
        rows = csv.DictReader(stream, fieldnames=headers or [], skipinitialspace=True)
        for row in rows:
            code = normalize_nigp_code(row.get("NIGP CODE"))
            naics = re.sub(r"\D", "", str(row.get("NAICS CODE") or ""))
            if not code or not naics:
                continue
            if naics not in _EXACT.setdefault(code, []):
                _EXACT[code].append(naics)
            class_code = code[:3]
            sector = naics[:2]
            sector_counts = _CLASS_COUNTS.setdefault(class_code, {})
            sector_counts[sector] = sector_counts.get(sector, 0) + 1
            sector_codes = _CLASS_BY_SECTOR.setdefault(class_code, {}).setdefault(sector, [])
            if naics not in sector_codes:
                sector_codes.append(naics)


def nigp_to_naics_with_source(nigp_code: object) -> Tuple[List[str], str]:
    """Return NAICS codes and whether the exact or class fallback matched."""
    _load_crosswalk()
    code = normalize_nigp_code(nigp_code)
    exact = _EXACT.get(code)
    if exact:
        return list(exact), "crosswalk_exact"

    sector_counts = _CLASS_COUNTS.get(code[:3], {})
    if not sector_counts:
        return [], "none"
    ranked = sorted(sector_counts.items(), key=lambda item: item[1], reverse=True)
    if len(ranked) > 1 and ranked[0][1] == ranked[1][1]:
        return [], "none"
    dominant_sector = ranked[0][0]
    return (
        list(_CLASS_BY_SECTOR[code[:3]][dominant_sector][:MAX_CLASS_NAICS]),
        "crosswalk_class",
    )


def nigp_to_naics(nigp_code: object) -> List[str]:
    """Return NAICS codes for an exact NIGP item, or its three-digit class."""
    return nigp_to_naics_with_source(nigp_code)[0]

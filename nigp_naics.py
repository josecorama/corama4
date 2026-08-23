"""NIGP-to-NAICS crosswalk used by the BidBuy Illinois ingestion adapter."""

import csv
import re
from pathlib import Path
from typing import Dict, List

_CROSSWALK_PATH = Path(__file__).resolve().parent / "data" / "nigp_naics_crosswalk.csv"
_EXACT: Dict[str, List[str]] = {}
_CLASS: Dict[str, List[str]] = {}


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
            class_codes = _CLASS.setdefault(code[:3], [])
            if naics not in class_codes:
                class_codes.append(naics)


def nigp_to_naics(nigp_code: object) -> List[str]:
    """Return NAICS codes for an exact NIGP item, or its three-digit class."""
    _load_crosswalk()
    code = normalize_nigp_code(nigp_code)
    return list(_EXACT.get(code) or _CLASS.get(code[:3], []))

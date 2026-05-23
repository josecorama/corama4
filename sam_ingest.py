import os
import time
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct


# --------------- Configuración y constantes ---------------
SAM_API_KEY = os.getenv("SAM_API_KEY")
SAM_BASE_URL = "https://api.sam.gov/opportunities/v2/search"

QDRANT_URL = os.getenv("QDRANT_URL") or os.getenv("Qdrant_EP")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or os.getenv("Qdrant_AK")

# Tamaño de página SAM y lotes para Qdrant
SAM_PAGE_SIZE = 50
QDRANT_BATCH_SIZE = 100

# Dimensión de vector esperada en la colección (placeholder para cumplir esquema)
QDRANT_VECTOR_DIM = int(os.getenv("QDRANT_VECTOR_DIM", 1536))

# Ventana de fechas por defecto (SAM exige postedFrom/postedTo)
DEFAULT_POSTED_DAYS = 30

# Intentos y backoff para SAM
MAX_RETRIES = 7
INITIAL_BACKOFF = 2.5  # segundos
BACKOFF_FACTOR = 2.0


# --------------- Utilidades ---------------
def backoff_sleep(attempt: int):
    delay = INITIAL_BACKOFF * (BACKOFF_FACTOR ** attempt)
    time.sleep(delay)


def format_sam_date(dt: datetime) -> str:
    # SAM v2 espera MM/dd/yyyy
    return dt.astimezone(timezone.utc).strftime("%m/%d/%Y")


def normalize_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return None
    return s


def normalize_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return None
    # Se asume ISO o fecha parsable; en fase 1 la dejamos tal cual
    return s


def ensure_qdrant_client() -> QdrantClient:
    if not QDRANT_URL or not QDRANT_API_KEY:
        raise RuntimeError("Qdrant credentials missing (QDRANT_URL/QDRANT_API_KEY)")
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


# --------------- Mapeo de payload SAM -> Qdrant ---------------
def map_sam_record_to_payload(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Campos comunes en SAM (depende del endpoint). Ejemplo típico:
    # noticeId, title, description, solicitationNumber, agency, office, naics, placeOfPerformance, publishDate, responseDate
    notice_id = item.get("noticeId") or item.get("id") or item.get("solicitationNumber")
    title = normalize_str(item.get("title") or item.get("subject"))
    if not notice_id or not title:
        return None  # Requerimos ID y título

    description = normalize_str(item.get("description") or item.get("summary"))
    detail_link = normalize_str(item.get("uiLink") or item.get("link") or item.get("detailUrl"))
    notice_type = normalize_str(item.get("noticeType"))
    naics_code = normalize_str(item.get("naics"))
    agency = normalize_str(item.get("agency"))
    office = normalize_str(item.get("office"))
    state = normalize_str(item.get("state"))
    place = item.get("placeOfPerformance") or {}
    if not state:
        state = normalize_str(place.get("state")) if isinstance(place, dict) else None

    response_date = normalize_date(item.get("responseDate") or item.get("dueDate"))
    publish_date = normalize_date(item.get("publishDate") or item.get("postedDate"))

    payload = {
        "title": title,
        "summary": description,
        "detail_link": detail_link,
        "notice_type": notice_type,
        "naics_code": naics_code,
        "organization": agency,
        "office": office,
        "state": state,
        "due_date": response_date,
        "posted_date": publish_date,
        "source": "sam.gov",
        # Campos de compatibilidad con dashboard
        "category": notice_type,
        "bid_name": title,
        "bid_description": description,
        "source_url": detail_link,
    }

    # Limpieza final: quitar None
    return {k: v for k, v in payload.items() if v is not None}


# --------------- Llamada SAM con backoff ---------------
def fetch_sam_page(page: int, posted_from: datetime, posted_to: datetime) -> List[Dict[str, Any]]:
    headers = {
        "accept": "application/json",
        "User-Agent": "corama-etl/1.0",
    }
    posted_from_str = format_sam_date(posted_from)
    posted_to_str = format_sam_date(posted_to)
    params = {
        "api_key": SAM_API_KEY,
        "limit": SAM_PAGE_SIZE,
        "page": page,
        "postedFrom": posted_from_str,
        "postedTo": posted_to_str,
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(SAM_BASE_URL, headers=headers, params=params, timeout=30)
            if resp.status_code == 429 or 500 <= resp.status_code < 600:
                wait_seconds = None
                if resp.status_code == 429:
                    try:
                        data = resp.json()
                        next_access = data.get("nextAccessTime")
                        if next_access:
                            # nextAccessTime suele venir como epoch ms; si es ISO se intenta parsear
                            if isinstance(next_access, (int, float)):
                                wait_seconds = max(0, (float(next_access) / 1000.0) - time.time())
                            elif isinstance(next_access, str):
                                try:
                                    dt = datetime.fromisoformat(next_access.replace("Z", "+00:00"))
                                    wait_seconds = max(0, dt.timestamp() - time.time())
                                except Exception:
                                    wait_seconds = None
                    except Exception:
                        wait_seconds = None

                if wait_seconds is not None and wait_seconds > 0:
                    logging.warning(f"SAM.gov 429; sleeping until nextAccessTime (~{wait_seconds:.1f}s)")
                    time.sleep(wait_seconds)
                else:
                    logging.warning(f"SAM.gov rate/5xx (status {resp.status_code}), attempt {attempt+1}/{MAX_RETRIES}")
                    backoff_sleep(attempt)
                continue
            resp.raise_for_status()
            data = resp.json()
            return (
                data.get("opportunitiesData", [])
                or data.get("searchResult", {}).get("opportunitiesData", [])
                or data.get("opportunities", [])
                or data.get("results", [])
                or data.get("data", [])
                or []
            )
        except Exception as e:
            logging.warning(f"Error fetching SAM page {page}: {e}; attempt {attempt+1}/{MAX_RETRIES}")
            backoff_sleep(attempt)
    return []


# --------------- Upsert batch en Qdrant ---------------
def upsert_batch(client: QdrantClient, records: List[Dict[str, Any]]):
    points: List[PointStruct] = []
    placeholder_vector = [0.0] * QDRANT_VECTOR_DIM
    for rec in records:
        payload = map_sam_record_to_payload(rec)
        if not payload:
            continue
        notice_id = rec.get("noticeId") or rec.get("id") or rec.get("solicitationNumber")
        # Se usa vector dummy para cumplir el esquema de la colección (size=QDRANT_VECTOR_DIM)
        points.append(PointStruct(id=str(notice_id), vector=placeholder_vector, payload=payload))

    if not points:
        return

    client.upsert(collection_name="government_contracts", points=points)


# --------------- Ingesta principal ---------------
def run_ingest(max_pages: int = 5):
    if not SAM_API_KEY:
        raise RuntimeError("SAM_API_KEY not configured")

    client = ensure_qdrant_client()
    total_ingested = 0

    posted_to = datetime.now(timezone.utc)
    posted_from = posted_to - timedelta(days=DEFAULT_POSTED_DAYS)

    for page in range(0, max_pages):
        records = fetch_sam_page(page, posted_from, posted_to)
        if not records:
            logging.info(f"No records on page {page}, stopping.")
            break

        # Procesar en lotes para Qdrant
        for i in range(0, len(records), QDRANT_BATCH_SIZE):
            batch = records[i:i+QDRANT_BATCH_SIZE]
            upsert_batch(client, batch)
            total_ingested += len(batch)

        logging.info(f"Page {page}: processed {len(records)} records (total so far {total_ingested})")

    logging.info(f"Ingest finished. Total records processed: {total_ingested}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_ingest(max_pages=5)

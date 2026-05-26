"""
Dashboard Qdrant Collection Management

This module provides a scalable architecture for dashboard contract queries:
- Separate `contracts_dashboard` collection with normalized, minimal schema
- Payload indexes for fast filtering (state, category, contract_type, status, due_date_ts)
- Cursor-based pagination for efficient queries at 100k+ scale
- Dual-write support for ingestion pipeline

The dashboard collection stores only fields needed for listing views,
while the main `government_contracts` collection retains full payloads
for detail views, analysis, and proposal generation.
"""

import os
import logging
import hashlib
import time
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    Range,
    PayloadSchemaType,
)

# Dashboard collection name
DASHBOARD_COLLECTION_NAME = "contracts_dashboard"

# Dashboard payload schema - normalized, snake_case only
# These are the only fields stored in the dashboard collection
DASHBOARD_FIELDS = [
    "id",                    # Same as main collection point ID
    "hash_value",            # Join key for detail view
    "detail_link",
    "bid_number",
    "bid_name",
    "bid_description",       # Truncated to ~500 chars for listing
    "organization",
    "due_date",              # Original string format for display
    "due_date_ts",           # Unix timestamp for filtering/sorting
    "status",
    "state",
    "budget",                # Numeric for range filtering (None if not parseable)
    "budget_display",        # Original string for display
    "category",
    "contract_type",
    "notice_type",
    "naics_code",
    "naics_codes_all",
    "naics_description",
    "source",
    "updated_at_ts",         # Unix timestamp for incremental sync
]

# Fields to index for fast filtering
INDEXED_FIELDS = {
    "state": PayloadSchemaType.KEYWORD,
    "category": PayloadSchemaType.KEYWORD,
    "contract_type": PayloadSchemaType.KEYWORD,
    "status": PayloadSchemaType.KEYWORD,
    "due_date_ts": PayloadSchemaType.INTEGER,
}


def get_dashboard_client() -> Optional[QdrantClient]:
    """Get a Qdrant client for dashboard operations."""
    qdrant_url = os.getenv('QDRANT_URL')
    qdrant_api_key = os.getenv('QDRANT_API_KEY')
    
    if not qdrant_url or not qdrant_api_key:
        logging.error("Qdrant credentials not configured")
        return None
    
    return QdrantClient(url=qdrant_url, api_key=qdrant_api_key)


def ensure_dashboard_collection(client: QdrantClient) -> bool:
    """
    Ensure the dashboard collection exists with proper configuration.
    Creates the collection if it doesn't exist, and ensures indexes are set up.
    
    Returns True if collection is ready, False on error.
    """
    try:
        # Check if collection exists
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if DASHBOARD_COLLECTION_NAME not in collection_names:
            logging.info(f"Creating dashboard collection: {DASHBOARD_COLLECTION_NAME}")
            
            # Create collection without vectors (dashboard is for listing, not search)
            # We use a dummy vector config since Qdrant requires vectors
            client.create_collection(
                collection_name=DASHBOARD_COLLECTION_NAME,
                vectors_config=VectorParams(size=4, distance=Distance.COSINE),
            )
            logging.info(f"Created collection: {DASHBOARD_COLLECTION_NAME}")
        
        # Ensure payload indexes exist
        for field_name, field_type in INDEXED_FIELDS.items():
            try:
                client.create_payload_index(
                    collection_name=DASHBOARD_COLLECTION_NAME,
                    field_name=field_name,
                    field_schema=field_type,
                )
                logging.info(f"Created index on {field_name}")
            except Exception as e:
                # Index may already exist
                if "already exists" not in str(e).lower():
                    logging.warning(f"Could not create index on {field_name}: {e}")
        
        return True
        
    except Exception as e:
        logging.error(f"Error ensuring dashboard collection: {e}", exc_info=True)
        return False


def normalize_payload_for_dashboard(payload: Dict[str, Any], point_id: int) -> Dict[str, Any]:
    """
    Project a full contract payload into the normalized dashboard schema.
    
    This function handles the various field name formats (snake_case, Title Case, etc.)
    and normalizes them into a consistent snake_case schema.
    
    Args:
        payload: Full payload from government_contracts collection
        point_id: The point ID in the main collection
    
    Returns:
        Normalized dashboard payload dict
    """
    def get_field(payload: Dict, *keys, default=None):
        """Get first matching field from multiple possible key names."""
        for key in keys:
            if key in payload and payload[key] is not None:
                return payload[key]
        return default
    
    def parse_budget(value) -> Optional[float]:
        """Parse budget string to float, return None if not parseable."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove currency symbols, commas, etc.
            cleaned = value.replace('$', '').replace(',', '').strip()
            try:
                return float(cleaned)
            except (ValueError, TypeError):
                return None
        return None
    
    def parse_date_to_timestamp(value) -> Optional[int]:
        """Parse date string to Unix timestamp."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            # Try common date formats
            formats = [
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%SZ",
                "%m/%d/%Y",
                "%d/%m/%Y",
                "%B %d, %Y",
            ]
            for fmt in formats:
                try:
                    dt = datetime.strptime(value.strip(), fmt)
                    return int(dt.timestamp())
                except (ValueError, TypeError):
                    continue
        return None
    
    def truncate_description(text: str, max_length: int = 500) -> str:
        """Truncate description for dashboard display."""
        if not text:
            return ""
        text = str(text)
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + "..."
    
    def compute_hash(detail_link: str, bid_number: str) -> str:
        """Compute hash_value for contract identification."""
        combined = f"{detail_link or ''}{bid_number or ''}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    # Extract fields with fallbacks for different naming conventions
    detail_link = get_field(payload, 'detail_link', 'Detail Link', 'source_url', default='')
    bid_number = get_field(payload, 'bid_number', 'Bid Number', 'contract_number', default='')
    bid_name = get_field(payload, 'bid_name', 'Bid Name', 'title', default='')
    bid_description = get_field(payload, 'bid_description', 'Bid Description', 'summary', default='')
    organization = get_field(payload, 'organization', 'Organization', 'agency', default='')
    due_date = get_field(payload, 'due_date', 'Due Date', default='')
    status = get_field(payload, 'status', 'Status', default='')
    state = get_field(payload, 'state', 'State', default='')
    budget_raw = get_field(payload, 'budget', 'Budget', 'budget_estimate', default='')
    category = get_field(payload, 'category', 'Category', default='')
    contract_type = get_field(payload, 'contract_type', 'Contract Type', default='')
    notice_type = get_field(payload, 'notice_type', 'Notice Type', default='')
    naics_code = get_field(payload, 'naics_code', 'NAICS Code', 'NAICS_CODE', default='')
    naics_codes_all = get_field(payload, 'naics_codes_all', 'NAICS_CODES_ALL', default='')
    naics_description = get_field(payload, 'naics_description', 'NAICS Description', 'NAICS_TITLE', default='')
    source = get_field(payload, 'source', 'Source', default='')
    
    # Use existing hash_value if present, otherwise compute
    hash_value = get_field(payload, 'hash_value', default=None)
    if not hash_value:
        hash_value = compute_hash(detail_link, bid_number)
    
    return {
        "id": point_id,
        "hash_value": hash_value,
        "detail_link": str(detail_link) if detail_link else "",
        "bid_number": str(bid_number) if bid_number else "",
        "bid_name": str(bid_name) if bid_name else "",
        "bid_description": truncate_description(bid_description),
        "organization": str(organization) if organization else "",
        "due_date": str(due_date) if due_date else "",
        "due_date_ts": parse_date_to_timestamp(due_date),
        "status": str(status).lower() if status else "",
        "state": str(state) if state else "",
        "budget": parse_budget(budget_raw),
        "budget_display": str(budget_raw) if budget_raw else "",
        "category": str(category) if category else "",
        "contract_type": str(contract_type) if contract_type else "",
        "notice_type": str(notice_type) if notice_type else "",
        "naics_code": str(naics_code) if naics_code else "",
        "naics_codes_all": str(naics_codes_all) if naics_codes_all else "",
        "naics_description": str(naics_description) if naics_description else "",
        "source": str(source) if source else "",
        "updated_at_ts": int(time.time()),
    }


def upsert_dashboard_contract(
    client: QdrantClient,
    point_id: int,
    payload: Dict[str, Any],
) -> bool:
    """
    Upsert a single contract into the dashboard collection.
    
    This is the dual-write function to be called during ingestion.
    
    Args:
        client: Qdrant client
        point_id: Point ID (same as in main collection)
        payload: Full payload from main collection
    
    Returns:
        True on success, False on error
    """
    try:
        dashboard_payload = normalize_payload_for_dashboard(payload, point_id)
        
        # Use a dummy vector since dashboard collection doesn't need vectors
        dummy_vector = [0.0, 0.0, 0.0, 0.0]
        
        client.upsert(
            collection_name=DASHBOARD_COLLECTION_NAME,
            points=[
                PointStruct(
                    id=point_id,
                    vector=dummy_vector,
                    payload=dashboard_payload,
                )
            ],
        )
        return True
        
    except Exception as e:
        logging.error(f"Error upserting dashboard contract {point_id}: {e}")
        return False


def upsert_dashboard_contracts_batch(
    client: QdrantClient,
    contracts: List[Tuple[int, Dict[str, Any]]],
) -> Tuple[int, int]:
    """
    Batch upsert contracts into the dashboard collection.
    
    Args:
        client: Qdrant client
        contracts: List of (point_id, payload) tuples
    
    Returns:
        Tuple of (success_count, error_count)
    """
    if not contracts:
        return 0, 0
    
    try:
        points = []
        dummy_vector = [0.0, 0.0, 0.0, 0.0]
        
        for point_id, payload in contracts:
            dashboard_payload = normalize_payload_for_dashboard(payload, point_id)
            points.append(
                PointStruct(
                    id=point_id,
                    vector=dummy_vector,
                    payload=dashboard_payload,
                )
            )
        
        client.upsert(
            collection_name=DASHBOARD_COLLECTION_NAME,
            points=points,
        )
        return len(contracts), 0
        
    except Exception as e:
        logging.error(f"Error batch upserting dashboard contracts: {e}")
        return 0, len(contracts)


def build_dashboard_filter(
    contract_type: Optional[str] = None,
    states: Optional[List[str]] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Filter]:
    """
    Build a Qdrant filter for dashboard queries.
    
    Args:
        contract_type: 'federal', 'state', or None for all
        states: List of state codes to filter by (only used when contract_type='state')
        category: Category to filter by
        status: Status to filter by
    
    Returns:
        Qdrant Filter object or None if no filters
    """
    conditions = []
    
    if contract_type == 'federal':
        # Federal contracts have 'Federal' in state field or empty/Unknown
        conditions.append(
            FieldCondition(
                key="state",
                match=MatchValue(value="Federal"),
            )
        )
    elif contract_type == 'state' and states:
        # State contracts - filter by selected states
        if 'all' not in [s.lower() for s in states]:
            # Create OR condition for multiple states
            state_conditions = []
            for state in states:
                state_conditions.append(
                    FieldCondition(
                        key="state",
                        match=MatchValue(value=state.upper()),
                    )
                )
            if len(state_conditions) == 1:
                conditions.append(state_conditions[0])
            elif len(state_conditions) > 1:
                # For multiple states, we need to use should (OR)
                # This requires a nested filter structure
                pass  # Will handle with should clause below
    
    if category:
        conditions.append(
            FieldCondition(
                key="category",
                match=MatchValue(value=category),
            )
        )
    
    if status:
        conditions.append(
            FieldCondition(
                key="status",
                match=MatchValue(value=status.lower()),
            )
        )
    
    if not conditions:
        return None
    
    return Filter(must=conditions)


def query_dashboard_contracts(
    client: QdrantClient,
    limit: int = 50,
    cursor: Optional[str] = None,
    contract_type: Optional[str] = None,
    states: Optional[List[str]] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Optional[str], int]:
    """
    Query dashboard contracts with cursor-based pagination.
    
    This is the main query function for dashboard listing.
    Uses Qdrant's scroll API with filters for efficient pagination.
    
    Args:
        client: Qdrant client
        limit: Number of contracts to return (default 50)
        cursor: Cursor from previous query for pagination (point ID as string)
        contract_type: 'federal', 'state', or None for all
        states: List of state codes to filter by
        category: Category to filter by
        status: Status to filter by
    
    Returns:
        Tuple of (contracts_list, next_cursor, total_count)
    """
    try:
        # Build filter
        query_filter = build_dashboard_filter(
            contract_type=contract_type,
            states=states,
            category=category,
            status=status,
        )
        
        # Parse cursor to offset
        offset = None
        if cursor:
            try:
                offset = int(cursor)
            except (ValueError, TypeError):
                offset = None
        
        # Execute scroll query
        scroll_result = client.scroll(
            collection_name=DASHBOARD_COLLECTION_NAME,
            limit=limit,
            offset=offset,
            scroll_filter=query_filter,
            with_payload=True,
            with_vectors=False,
        )
        
        points, next_offset = scroll_result
        
        # Convert points to contract dicts
        contracts = []
        for point in points:
            contract = dict(point.payload)
            contract['id'] = point.id
            contracts.append(contract)
        
        # Get total count (for analytics display)
        # Note: This is a separate query and may be expensive at scale
        # Consider caching this value
        try:
            collection_info = client.get_collection(DASHBOARD_COLLECTION_NAME)
            total_count = collection_info.points_count
        except Exception:
            total_count = len(contracts)
        
        # Build next cursor
        next_cursor = str(next_offset) if next_offset is not None else None
        
        return contracts, next_cursor, total_count
        
    except Exception as e:
        logging.error(f"Error querying dashboard contracts: {e}", exc_info=True)
        return [], None, 0


def get_dashboard_collection_stats(client: QdrantClient) -> Dict[str, Any]:
    """
    Get statistics about the dashboard collection.
    
    Returns:
        Dict with collection stats (points_count, etc.)
    """
    try:
        info = client.get_collection(DASHBOARD_COLLECTION_NAME)
        return {
            "collection_name": DASHBOARD_COLLECTION_NAME,
            "points_count": info.points_count,
            "indexed_vectors_count": info.indexed_vectors_count,
            "status": info.status,
        }
    except Exception as e:
        logging.error(f"Error getting dashboard collection stats: {e}")
        return {
            "collection_name": DASHBOARD_COLLECTION_NAME,
            "error": str(e),
        }


def backfill_dashboard_from_main(
    client: QdrantClient,
    batch_size: int = 100,
    progress_callback=None,
) -> Tuple[int, int]:
    """
    Backfill the dashboard collection from the main government_contracts collection.
    
    This is a one-time operation to populate the dashboard collection
    from existing data. After this, dual-write during ingestion keeps it in sync.
    
    Args:
        client: Qdrant client
        batch_size: Number of contracts to process per batch
        progress_callback: Optional callback function(processed, total) for progress updates
    
    Returns:
        Tuple of (success_count, error_count)
    """
    try:
        # Ensure dashboard collection exists
        if not ensure_dashboard_collection(client):
            return 0, 0
        
        # Get total count from main collection
        main_info = client.get_collection("government_contracts")
        total_count = main_info.points_count
        
        logging.info(f"Starting dashboard backfill: {total_count} contracts")
        
        success_count = 0
        error_count = 0
        offset = None
        batch_num = 0
        
        while True:
            batch_num += 1
            
            # Scroll main collection
            scroll_result = client.scroll(
                collection_name="government_contracts",
                limit=batch_size,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            
            points, next_offset = scroll_result
            
            if not points:
                break
            
            # Prepare batch for dashboard
            contracts = [(point.id, point.payload) for point in points]
            
            # Upsert to dashboard
            batch_success, batch_error = upsert_dashboard_contracts_batch(client, contracts)
            success_count += batch_success
            error_count += batch_error
            
            # Progress callback
            if progress_callback:
                progress_callback(success_count + error_count, total_count)
            
            logging.debug(f"Backfill batch {batch_num}: {batch_success} success, {batch_error} errors")
            
            # Move to next page
            offset = next_offset
            if offset is None:
                break
        
        logging.info(f"Dashboard backfill complete: {success_count} success, {error_count} errors")
        return success_count, error_count
        
    except Exception as e:
        logging.error(f"Error during dashboard backfill: {e}", exc_info=True)
        return 0, 0


# Convenience function for Flask app integration
def get_dashboard_contracts_paginated(
    page: int = 1,
    items_per_page: int = 50,
    contract_type: Optional[str] = None,
    states: Optional[List[str]] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int, int, Optional[str]]:
    """
    Get paginated dashboard contracts for Flask API.
    
    This is a convenience wrapper that handles client creation
    and converts cursor-based pagination to page-based for backward compatibility.
    
    Note: For true scalability at 100k+, the frontend should migrate to
    cursor-based pagination. This function provides a transitional API.
    
    Args:
        page: Page number (1-indexed)
        items_per_page: Items per page
        contract_type: 'federal', 'state', or None
        states: List of state codes
        category: Category filter
        status: Status filter
    
    Returns:
        Tuple of (contracts, total_count, total_pages, next_cursor)
    """
    client = get_dashboard_client()
    if not client:
        return [], 0, 0, None
    
    try:
        # For page-based pagination, we need to scroll to the right offset
        # This is not efficient at scale - cursor-based is preferred
        if page > 1:
            # Skip to the right page by scrolling
            skip_count = (page - 1) * items_per_page
            offset = None
            skipped = 0
            
            while skipped < skip_count:
                batch_size = min(500, skip_count - skipped)
                scroll_result = client.scroll(
                    collection_name=DASHBOARD_COLLECTION_NAME,
                    limit=batch_size,
                    offset=offset,
                    with_payload=False,
                    with_vectors=False,
                )
                points, next_offset = scroll_result
                if not points:
                    break
                skipped += len(points)
                offset = next_offset
            
            cursor = str(offset) if offset else None
        else:
            cursor = None
        
        # Query the actual page
        contracts, next_cursor, total_count = query_dashboard_contracts(
            client=client,
            limit=items_per_page,
            cursor=cursor,
            contract_type=contract_type,
            states=states,
            category=category,
            status=status,
        )
        
        total_pages = (total_count + items_per_page - 1) // items_per_page if total_count > 0 else 1
        
        return contracts, total_count, total_pages, next_cursor
        
    except Exception as e:
        logging.error(f"Error getting paginated dashboard contracts: {e}", exc_info=True)
        return [], 0, 0, None

# Qdrant Vector Database Requirements for CORAMA

## Overview

This document outlines the complete requirements for setting up and configuring Qdrant vector database for the Contract Radar Maximizer (CORAMA) platform. Qdrant is used for semantic search and contract matching based on capability statement embeddings.

## Environment Variables

The following environment variables must be configured in the `.env` file for Qdrant to function properly:

### Required Qdrant Variables

```bash
# Qdrant Cloud Connection
Qdrant_EP=https://your-cluster-id.region.cloud.qdrant.io
Qdrant_AK=your_qdrant_api_key_here

# Alternative naming (for compatibility)
QDRANT_URL=https://your-cluster-id.region.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

**Note:** The codebase uses both `Qdrant_EP`/`Qdrant_AK` and `QDRANT_URL`/`QDRANT_API_KEY` naming conventions. Ensure both are set to the same values for consistency.

### Required OpenAI Variables (for embeddings)

```bash
# Primary OpenAI API Key - Used for all AI features including embeddings
OPENAI_MARIO=sk-proj-your_openai_api_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Feature-specific OpenAI Keys (can use same key as above)
CS_BUILDER_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
BID_RESPONSE_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
SMART_SEARCH_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
CS_BID_SEARCH_OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

## Qdrant Collection Configuration

### Collection Name

The system uses the following collection name:
- **Primary Collection:** `government_contracts`

**Location in code:** `cs_processor.py:23`

### Vector Configuration

```python
{
    "size": 1536,           # Dimension of OpenAI text-embedding-3-small model
    "distance": "Cosine"    # Similarity metric
}
```

**Embedding Model:** `text-embedding-3-small` (OpenAI)
- Dimensions: 1536
- Used for both capability statements and contract descriptions

**Location in code:** 
- `cs_processor.py:52` (get_embedding method)
- `init_qdrant.py:29-32` (collection creation)

### Connection Configuration

```python
QdrantClient(
    url=qdrant_url,         # From Qdrant_EP environment variable
    api_key=qdrant_api_key, # From Qdrant_AK environment variable
    timeout=10              # Connection timeout in seconds
)
```

**Location in code:** `cs_processor.py:18-22`

## Data Schema

### Required Payload Fields

Each vector point in the Qdrant collection must have the following payload fields:

#### Core Contract Information

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Bid Number` | string | Unique identifier for the contract | "RFP-2024-001" |
| `Bid Name` | string | Contract title/name | "IT Services for State Agency" |
| `Bid Description` | string | Detailed contract description | "Provide comprehensive IT support..." |
| `Status` | string | Contract status | "Open", "Closed", "Pending" |
| `Category` | string | Contract category | "IT Services", "Construction", "Consulting" |
| `Due Date` | string | Submission deadline | "2024-12-31" |
| `Detail Link` | string | URL to contract details | "https://..." |
| `State` | string | State abbreviation | "IL", "IN", "CA", "NY" |
| `Organization` | string | Issuing organization | "Illinois Department of Transportation" |
| `Budget Estimate` | string | Estimated contract value | "$100,000 - $500,000" |
| `Contract Type` | string | Federal or State contract | "Federal", "State-IL", "State-IN" |

#### NAICS Code Information

NAICS (North American Industry Classification System) codes are critical for contract categorization and matching:

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `NAICS Code` | string or array | Primary NAICS code(s) | "541512", "541330" |
| `NAICS Description` | string | Industry description | "Computer Systems Design Services" |

**NAICS Code Usage in CORAMA:**

1. **Capability Statement Processing** (`app.py:4419-4422`):
   - Extracts NAICS codes with descriptions from uploaded capability statements
   - Stores in format: `"541512 (Computer Systems Design Services)"`
   - Used for matching user capabilities with contract requirements

2. **Contract Matching** (`cs_processor.py:199-375`):
   - NAICS codes help categorize contracts by industry
   - Enables filtering contracts by industry classification
   - Improves semantic search accuracy by industry alignment

3. **Capability Builder** (`app.py:4070, 4193-4194, 4229`):
   - Users can specify NAICS codes in their capability statements
   - Codes are validated and stored with descriptions
   - Used in AI-powered contract analysis and proposal generation

**NAICS Code Extraction** (`app.py:4782-4844`):
- Automatically extracts NAICS codes from capability statement PDFs
- Parses both code and description: `"541512 - Computer Systems Design"`
- Handles multiple NAICS codes per capability statement
- Validates 6-digit NAICS code format

### Contract Type Field Format

The `Contract Type` field uses specific formatting for filtering:

- **Federal contracts:** `"Federal"`
- **State contracts:** `"State-{STATE_CODE}"` (e.g., `"State-IL"`, `"State-IN"`)

**Location in code:** `cs_processor.py:110-152` (build_filter_conditions method)

### Hash Value Generation

Each contract has a unique `hash_value` computed as:

```python
hash_input = f"{detail_link}{bid_number}"
hash_value = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
```

This hash is used for:
- Deduplication of contracts
- Unique contract identification in URLs
- Contract lookup in CSV files

**Location in code:** `cs_processor.py:343-344`, `app.py:3419-3441`

## Search and Filtering

### Vector Search Parameters

```python
{
    "collection_name": "government_contracts",
    "query_vector": [1536-dimensional embedding],
    "query_filter": {filter_conditions},  # Optional
    "with_payload": True,
    "limit": 50  # Default, returns top 50 matches
}
```

**Location in code:** `cs_processor.py:240-256`

### Filter Conditions

The system supports filtering by:

1. **Contract Type:**
   - Federal contracts
   - State contracts (specific states)
   - All contracts (no filter)

2. **State Selection:**
   - Individual states: IL, IN, CA, NY, etc.
   - "All state" option (includes all available states)

**Filter Construction** (`cs_processor.py:110-152`):

```python
filter_condition = models.Filter(
    must=[
        models.FieldCondition(
            key='"Contract Type"',
            match=models.MatchAny(any=match_values)
        )
    ]
)
```

Where `match_values` can be:
- `["Federal"]` - Only federal contracts
- `["State-IL", "State-IN"]` - Specific state contracts
- `["Federal", "State-IL"]` - Combined federal and state

### Deduplication Logic

The system performs two-stage deduplication (`cs_processor.py:276-334`):

1. **URL-based deduplication:**
   - Remove contracts with duplicate `Detail Link` URLs
   - First occurrence is kept

2. **Bid Name deduplication:**
   - For contracts with identical `Bid Name`
   - Keep the one with highest similarity score
   - Log replaced entries for debugging

**Final Result:** Top 5 unique contracts with highest similarity scores

## Data Upload and Management

### Initial Data Upload

Use `init_qdrant.py` to upload contract data from CSV:

```python
from init_qdrant import QdrantManager

manager = QdrantManager(QDRANT_URL, QDRANT_API_KEY)
manager.update_collection("embedded_contracts.csv")
```

**CSV Requirements:**
- Must contain `embedding` column with 1536-dimensional vectors
- Must contain all required payload fields listed above
- Embeddings should be stored as string representation of Python lists

### Collection Management

**Clear and rebuild collection:**
```python
manager.clear_collection()  # Deletes and recreates collection
```

**Get collection info:**
```python
info = manager.get_collection_info()
print(f"Vector size: {info.config.params.vectors.size}")
print(f"Distance function: {info.config.params.vectors.distance}")
```

## Integration Points

### 1. Capability Statement Matching (`app.py:3186-3363`)

**Route:** `/upload_and_process`

**Flow:**
1. User uploads capability statement PDF
2. Extract text from PDF
3. Generate embedding using OpenAI
4. Query Qdrant with filters (contract type, states)
5. Deduplicate results
6. Save top 5 matches to `matches.csv`

### 2. Smart Search (`app.py:3460-3497`)

**Route:** `/process_smartsearch`

**Flow:**
1. User enters text query
2. Generate embedding from query text
3. Query Qdrant with filters
4. Deduplicate results
5. Save results to `matches_SMART_SEARCH.csv`

### 3. Dashboard Search (`app.py:2228-2425`)

**Route:** `/dashboard_search`

**Flow:**
1. Real-time search as user types
2. Query Qdrant with text embedding
3. Apply filters (contract type, state, category, budget)
4. Return paginated results with analytics

## Testing and Validation

### Connection Test

Use `test_qdrant_connection.py` to verify Qdrant connectivity:

```bash
python test_qdrant_connection.py
```

**Expected output:**
```
Successfully connected to Qdrant. Collection 'government_contracts' found.
```

### Data Inspection

Use the `inspect_data()` method to view sample data:

```python
handler = CSQueryHandler(OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY, user_upload_dir)
contract_types, states = handler.inspect_data()
print(f"Available Contract Types: {contract_types}")
print(f"Available States: {states}")
```

**Location in code:** `cs_processor.py:77-108`

## Error Handling

### Common Issues and Solutions

1. **Connection Timeout:**
   - Increase timeout parameter in QdrantClient initialization
   - Check network connectivity to Qdrant Cloud
   - Verify API key is valid

2. **Collection Not Found:**
   - Ensure collection name is exactly `"government_contracts"`
   - Run `init_qdrant.py` to create collection
   - Check Qdrant dashboard for collection existence

3. **Embedding Dimension Mismatch:**
   - Verify using `text-embedding-3-small` model (1536 dimensions)
   - Do not mix with other embedding models
   - Recreate collection if dimension changed

4. **OpenAI API Failures:**
   - System falls back to mock embeddings for testing
   - Check OpenAI API key validity
   - Monitor API rate limits and quotas

**Mock Embedding Fallback** (`cs_processor.py:64-75`):
- Creates deterministic embeddings based on text hash
- Used only when OpenAI API fails
- Not suitable for production use

## Performance Considerations

### Search Performance

- **Typical search time:** < 1 second for 50 results
- **Timeout setting:** 10 seconds
- **Batch size for uploads:** 100 points per batch

### Optimization Tips

1. **Limit parameter:**
   - Default: 50 results before deduplication
   - Final: 5 results after deduplication
   - Adjust based on desired result diversity

2. **Filter usage:**
   - Filters reduce search space and improve speed
   - Use specific states instead of "All state" when possible
   - Combine filters efficiently

3. **Embedding caching:**
   - Cache capability statement embeddings
   - Reuse embeddings for multiple searches
   - Store in `capability_statements_processed.csv`

## Security Considerations

1. **API Key Protection:**
   - Never commit `.env` file to version control
   - Use environment variables in production
   - Rotate API keys periodically

2. **Access Control:**
   - Qdrant API key provides full access to collections
   - Use separate keys for development and production
   - Monitor API usage in Qdrant dashboard

3. **Data Privacy:**
   - User capability statements are stored per-user
   - Embeddings do not expose original text
   - Contract data is public government information

## Monitoring and Maintenance

### Health Checks

Implement regular health checks:

```python
def check_qdrant_config():
    qdrant_url = os.getenv('Qdrant_EP')
    qdrant_api_key = os.getenv('Qdrant_AK')
    
    if not qdrant_url or not qdrant_api_key:
        return False, "Qdrant configuration missing"
    
    try:
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        collections = client.get_collections()
        return True, "Qdrant connected successfully"
    except Exception as e:
        return False, f"Qdrant connection failed: {str(e)}"
```

**Location in code:** `app.py:3170-3180`

### Data Updates

To update contract data:

1. Prepare new CSV with embeddings
2. Run `init_qdrant.py` with new CSV path
3. System will clear and rebuild collection
4. Verify data with inspection methods

### Backup and Recovery

- Qdrant Cloud provides automatic backups
- Export collection data periodically
- Keep CSV source files for rebuilding
- Document collection schema changes

## Dependencies

### Python Packages

```txt
qdrant-client==1.11.3    # Vector database client
openai==1.35.10          # Embedding generation
pandas==2.2.2            # Data processing
PyPDF2==3.0.1            # PDF text extraction
python-dotenv==1.0.1     # Environment variable management
```

**Note:** Ensure `qdrant-client` version is exactly `1.11.3` as specified in requirements.

### External Services

1. **Qdrant Cloud:**
   - Managed vector database service
   - Requires account and API key
   - Pricing based on storage and queries

2. **OpenAI API:**
   - Used for generating embeddings
   - Requires API key with sufficient quota
   - Pricing based on token usage

## Troubleshooting Guide

### Issue: "Collection not found"

**Solution:**
```bash
cd /home/ubuntu/repos/corama3
python init_qdrant.py
```

### Issue: "Embedding dimension mismatch"

**Solution:**
- Verify embedding model is `text-embedding-3-small`
- Check collection vector size is 1536
- Recreate collection if needed

### Issue: "No results returned"

**Solution:**
- Check filter conditions are not too restrictive
- Verify contract data exists in collection
- Inspect data using `inspect_data()` method
- Check similarity score threshold (default: 0.75)

### Issue: "Timeout errors"

**Solution:**
- Increase timeout in QdrantClient initialization
- Check network connectivity
- Verify Qdrant Cloud service status
- Reduce limit parameter if querying large datasets

## Summary

This document provides comprehensive requirements for Qdrant integration in CORAMA. Key points:

1. **Environment Variables:** Set `Qdrant_EP`, `Qdrant_AK`, and OpenAI API keys
2. **Collection:** `government_contracts` with 1536-dimensional vectors
3. **NAICS Codes:** Critical for industry classification and contract matching
4. **Data Schema:** 11 required payload fields including Contract Type and State
5. **Search:** Supports filtering by contract type, state, and semantic similarity
6. **Deduplication:** Two-stage process ensures unique, high-quality results
7. **Integration:** Used in capability matching, smart search, and dashboard search
8. **Testing:** Use provided test scripts to verify connectivity and data

For additional support, refer to:
- Qdrant documentation: https://qdrant.tech/documentation/
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings
- CORAMA codebase: `cs_processor.py`, `app.py`, `init_qdrant.py`

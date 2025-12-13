# Technical Handoff Summary - CORAMA Government Contracts Dashboard

**Date:** November 26, 2025
**Project:** CORAMA Government Contracts Dashboard
**Repository:** Adreliaz37/corama3
**Branch:** `devin/1763574572-improve-capability-parsing`
**PR:** https://github.com/Adreliaz37/corama3/pull/11

---

## Current Project Status

The CORAMA dashboard is a Flask-based web application that displays ~2,320 government contracts from a Qdrant vector database. The application allows users to search contracts, view details, build proposals, and manage capability statements.

**Overall Status:** Functional with recent improvements to category classification and search consistency.

---

## What Was Completed Today

### 1. NAICS-Based Category System
- Replaced generic categories ("Other", "Unknown", "Goods/Supplies") with official NAICS descriptions
- Added 70+ NAICS codes to the lookup table (`NAICS_CODE_TO_DESCRIPTION` in app.py)
- Modified `parse_naics_codes()` to accept 3-6 digit NAICS codes (not just 6-digit)
- Implemented `get_naics_description()` to look up descriptions from codes

### 2. AI Prediction for Unclassified Contracts
- Created `predict_naics_with_description()` function that uses OpenAI to predict NAICS code + description
- Predictions are cached to `ai_naics_prediction_cache.json` to avoid repeated API calls
- Reduced "Unclassified" contracts from 108 to 0

### 3. Search Results Consistency Fix
- Modified `find_matches_with_query()` to use the dashboard contracts cache
- Search results now show the same NAICS descriptions, codes, and due dates as the main dashboard
- Fixed "Unknown" categories, missing NAICS codes, and "nan" due dates in search results
- Improved performance by reducing vector search from 10,000 to 2,500 results

### 4. Environment Updates
- Updated `.env` with new Stripe keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- Updated OPENAI_MARIO key
- Updated Qdrant endpoint and API key

### 5. Other Improvements
- PDF viewing with PDF.js (cross-browser compatible)
- Team builder dialog styling improvements
- Top Contract Categories now sorted by count (descending)
- Due date fallback shows "No due date" instead of "nan"

---

## Branch and Latest Work

**Branch:** `devin/1763574572-improve-capability-parsing`

**Latest Commits (this session):**
```
7a0107a - Update .env with new Stripe keys, OPENAI_MARIO, and Qdrant credentials
05f30f7 - Fix search results to use dashboard cache for consistent data
878d266 - Add AI prediction for Unclassified contracts using OpenAI
8ff33c0 - Add 34 more NAICS codes to eliminate remaining Unclassified contracts
737f2d6 - Fix Unclassified category for contracts with non-6-digit NAICS codes
f2dd107 - Fix Other category and improve draft lookup logging
```

---

## Files Modified / Most Relevant

### Core Application
| File | Description |
|------|-------------|
| `app.py` | Main Flask application (~11,900 lines). Contains all routes, NAICS lookup table, AI prediction functions, and contract data processing. |
| `.env` | Environment variables including API keys for OpenAI, Qdrant, Stripe, Firebase. |
| `requirements.txt` | Python dependencies. Includes `beautifulsoup4==4.14.2` and `qdrant-client==1.11.3`. |

### Key Functions in app.py
| Function | Line | Purpose |
|----------|------|---------|
| `NAICS_CODE_TO_DESCRIPTION` | ~1200-1310 | Lookup table mapping NAICS codes to descriptions |
| `get_naics_description()` | ~1314-1338 | Get NAICS description from code with Qdrant fallback |
| `parse_naics_codes()` | ~1340-1363 | Parse NAICS codes from various formats (handles floats) |
| `predict_naics_with_description()` | ~2186-2268 | AI prediction for contracts without NAICS codes |
| `qdrant_payload_to_dashboard_contract()` | ~8500-8810 | Convert Qdrant payload to dashboard format |
| `find_matches_with_query()` | ~9041-9155 | Search function using dashboard cache |
| `get_dashboard_contracts_from_qdrant()` | ~8919-8986 | Fetch and cache contracts from Qdrant |

### Templates
| File | Description |
|------|-------------|
| `templates/welcome.html` | Main dashboard template |
| `templates/proposal_start.html` | Contract analysis page |
| `templates/proposal_team.html` | Team builder page |
| `templates/terms_of_use.html` | Terms page with PDF.js viewer |
| `templates/privacy_notice.html` | Privacy page with PDF.js viewer |

### Cache Files
| File | Description |
|------|-------------|
| `ai_naics_prediction_cache.json` | Cached AI NAICS predictions (persists across restarts) |
| `ai_naics_cache.json` | Cached AI-generated NAICS codes |

---

## Pending Tasks

1. **Draft Not Found Error** - The "Draft not found" error on the team builder page may still occur intermittently. Logging was added to `/api/suggest_team` endpoint to help debug.

2. **Search Performance** - Could be further optimized with query result caching (currently rebuilds hash lookup on each search).

3. **New Contracts** - When new contracts are added to Qdrant, they may show "Unknown" if their NAICS codes aren't in the lookup table. The AI prediction will handle this, but the lookup table should be expanded.

---

## Known Issues / Inconsistencies

1. **Qdrant Field Name Variations** - Qdrant contracts use three different field name formats:
   - snake_case: `bid_name`, `naics_code`, `due_date`
   - Title Case: `Bid Name`, `NAICS Code`, `Due Date`
   - Old format: `title`, `summary`, `agency`
   
   The code handles all three, but this adds complexity.

2. **NAICS Code Formats** - NAICS codes in Qdrant are stored in various formats:
   - Float: `238220.0`
   - String: `"238220"`
   - Multiple: `"238220, 423720"`
   - Semicolon-separated: `"238220;423720"`
   
   `parse_naics_codes()` handles all these formats.

3. **Dashboard Cache** - The `_dashboard_contracts_cache` is populated on first request and not refreshed until app restart. New contracts added to Qdrant won't appear until restart.

---

## Next Steps When Resuming

1. **Test the deployment** - Always create and verify a test deployment link before reporting completion.

2. **Check for regressions** - Search for "water" and verify:
   - Categories show NAICS descriptions (not "Unknown")
   - NAICS codes display correctly
   - Due dates show properly (not "nan")

3. **Monitor categories** - Generate a categories report to ensure no dominant categories emerge:
   ```python
   # Run this to check category distribution
   curl http://127.0.0.1:5000/api/contracts?page=1 | python3 -c "import json,sys; d=json.load(sys.stdin); print(set(c['category'] for c in d['contracts']))"
   ```

4. **Environment verification** - Ensure:
   - `beautifulsoup4==4.14.2` is installed
   - `qdrant-client==1.11.3` is installed
   - `OPENAI_MARIO` is in `.env`

---

## Test Credentials

- **Email:** testuser@coramatest.com
- **Password:** TestPassword123!

---

## Contact / Resources

- **Devin Session:** https://app.devin.ai/sessions/0e97e99ef3d4422a961eb4057f7ae4c2
- **GitHub PR:** https://github.com/Adreliaz37/corama3/pull/11
- **User:** mario@corama.ai (@MarioA-OrnelasC)

---

**End of Technical Handoff**

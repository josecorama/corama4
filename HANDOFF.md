# Corama3 Handoff Document

**Last Updated:** December 29, 2025  
**Session PRs:** [PR #20](https://github.com/Adreliaz37/corama3/pull/20), [PR #26](https://github.com/Adreliaz37/corama3/pull/26)  
**Branch:** `feature/mobile-responsive-revamp`

---

## Project Overview

Corama3 is a government contract matching platform that helps businesses find and bid on government contracts. The platform uses AI to match capability statements with contracts and generate proposals.

### Tech Stack
- **Backend:** Flask (Python) - `app.py` (16,856 lines)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Database:** Firebase Realtime Database (auth, job queuing, user data)
- **Vector Database:** Qdrant (contract storage, similarity search)
- **AI:** OpenAI GPT-4 (proposal generation, contract analysis, AI assistant)
- **Background Worker:** `proposal_worker.py` (2,068 lines)
- **Payments:** Stripe

### Key Firebase Paths
- `proposal_jobs/` - Proposal generation job queue
- `contract_analysis_jobs/` - Contract analysis job queue
- `naics_enrichment_jobs/` - NAICS enrichment job queue
- `dashboard_stats_snapshot` - Pre-computed dashboard statistics
- `users/` - User data and credits

### Qdrant Collection
- Collection name: `government_contracts`
- Contains all scraped government contracts with embeddings

---

## Session Accomplishments

### UI/UX Improvements
1. **Count-up animation for credits** - Animated credits display on first login
2. **Dashboard category animations** - Count-up animation for Top Contract Categories
3. **Responsive design overhaul** - Comprehensive mobile responsiveness across all pages
4. **ProposalTeam improvements** - Carousel, fixed AI suggestions height, header spacing
5. **About Us carousel** - Footer spacing, advisor descriptions, Pricing link
6. **Top 5 page improvements** - Print styling, pagination, CS replacement functionality

### Security Fixes
1. **Rate limiting** - Added Flask-Limiter with 200/day, 50/hour limits
2. **SSRF protection** - Added `is_safe_url_for_ssrf()` and `safe_requests_get()` helpers
3. **Session security** - Secure cookies, HTTPOnly, SameSite=Lax

### Backend Improvements
1. **Dashboard stats pre-computation** - Background worker calculates stats every 5 minutes
2. **NAICS-to-category mapping** - Shared `category_mapping.py` module for consistent categorization
3. **Admin directory management** - New admin authentication system

### Authentication
1. **Password validation** - Full validation on ResetPasswordConfirm
2. **Auth message styling** - New colors and icon
3. **SMTP email refactoring** - Improved email delivery

---

## Known Bugs (Confirmed)

### 1. Hardcoded Credits in Header (HIGH PRIORITY)
**Location:** Multiple frontend pages  
**Issue:** All pages pass `credits={5}` to Header component instead of actual user credits.

```typescript
// Found in 14 files:
<Header credits={5} />  // Should use actual credits from state/context
```

**Files affected:**
- Dashboard.tsx (fetches credits but doesn't use them!)
- TopFiveContracts.tsx
- AIAssistant.tsx
- ContractAnalysis.tsx
- CapabilityBuilder.tsx
- ProposalTeam.tsx
- ProposalSummary.tsx
- GetMoreCredits.tsx
- CoramaDirectory.tsx
- Support.tsx
- AdminDirectory.tsx
- NoCapabilityStatement.tsx
- PublicBidProposalGenerator.tsx

**Fix:** Create a credits context or pass actual credits from API response.

### 2. load_dotenv Override Mismatch
**Location:** `app.py` lines 57-65  
**Issue:** Comment says "use override=True" but code uses `override=False`

```python
# Comment says:
# Load environment variables - use override=True to ensure .env values take precedence

# But code does:
load_dotenv(override=False)  # Line 59
load_dotenv(env_path, override=False)  # Line 65
```

**Impact:** Environment variables may not take precedence over system variables.

### 3. TopFiveContracts "Load More" Replaces Instead of Appends
**Location:** `TopFiveContracts.tsx` line 245  
**Issue:** `handleLoadMore` replaces contracts instead of appending

```typescript
// Current behavior (replaces):
setContracts(transformedContracts)

// Expected behavior (appends):
setContracts(prev => [...prev, ...transformedContracts])
```

### 4. Hardcoded Default States Filter
**Location:** `TopFiveContracts.tsx` line 122  
**Issue:** Default filter includes specific states that look like dev/testing residue

```typescript
const [selectedStates, setSelectedStates] = useState<string[]>(['all', 'IL', 'IN'])
// Should probably be just ['all'] or []
```

### 5. Console.log with PII in Production
**Location:** `CapabilityBuilder.tsx` lines 381-383  
**Issue:** Verbose logging of imported capability statement data (may contain PII)

```typescript
console.log('[CS Import File] Full result:', result)
console.log('[CS Import File] Data fields:', result.data ? Object.keys(result.data) : 'no data')
console.log('[CS Import File] Data values:', result.data)
```

### 6. SSRF Protection Not Consistently Used
**Location:** `app.py`  
**Issue:** `safe_requests_get()` helper exists but many `requests.get()` calls don't use it

```python
# Lines with direct requests.get() that may need SSRF protection:
# 9261, 9290, 9309, 9361, 12016, 12028, 12057, 12174, 12238
```

---

## Performance Issues / Tech Debt

### 1. O(N) Pagination (HIGH PRIORITY)
**Location:** `app.py` `get_dashboard_contracts_from_qdrant()` (lines 11167+)  
**Issue:** Offset-based pagination scrolls through all previous pages to reach target page

```python
# For page N, scrolls through (N-1) pages first
while contracts_skipped < target_offset:
    scroll_result = client.scroll(...)
    contracts_skipped += len(points)
```

**Impact:** Page 100+ will be very slow (5-15 seconds)  
**Fix:** Implement true cursor-based pagination end-to-end

### 2. Stats Recalculation Every 5 Minutes
**Location:** `proposal_worker.py` `check_and_calculate_stats()` (lines 1597-1637)  
**Issue:** Recalculates full stats even when data hasn't changed

**Fix:** Gate recompute on collection signature (points_count) change

### 3. Dashboard Cache Hard-Capped at 50 Contracts
**Location:** `app.py` `_refresh_dashboard_contracts_cache()` (lines 11057+)  
**Issue:** Previous OOM fix limits cache to 50 contracts

```python
DASHBOARD_CACHE_LIMIT = 50  # Hard cap to prevent OOM
```

### 4. Large Payloads in Worker
**Location:** `proposal_worker.py` `calculate_dashboard_stats()` (lines 1479+)  
**Issue:** `with_payload=True` on 1000 contracts could spike memory

**Fix:** Use `PayloadSelectorInclude` to fetch only needed fields (naics_code, title, description, status)

### 5. Rate Limiter Uses In-Memory Storage
**Location:** `app.py` lines 114-120  
**Issue:** `storage_uri="memory://"` doesn't work across multiple workers

```python
limiter = Limiter(
    storage_uri="memory://",  # Won't work in multi-worker deployment
)
```

**Fix:** Use Redis-backed storage for production

### 6. Monolith Backend
**Location:** `app.py`  
**Issue:** 16,856 lines with heavy imports at module level (matplotlib, numpy, pandas, PyMuPDF)

**Impact:** Slow cold starts, high memory usage  
**Fix:** Split into blueprints, lazy-import heavy dependencies

---

## Architecture Notes

### Critical Invariants
1. **NEVER load vectors from Qdrant** - Always use `with_vectors=False` to prevent OOM
2. **NEVER use "scroll all" loops in Flask** - Will cause SIGKILL/OOM crashes
3. **Dashboard stats come from Firebase snapshot** - Not computed on request

### Job Architecture
```
User Request → Flask API → Queue job in Firebase → Return job_id
                                    ↓
Background Worker (proposal_worker.py) polls Firebase
                                    ↓
Worker claims job (atomic transaction with lease)
                                    ↓
Worker processes job (GPT-4 calls, PDF processing)
                                    ↓
Worker updates Firebase with results
                                    ↓
Frontend polls job status until complete
```

### Category Mapping
**File:** `category_mapping.py`  
**Function:** `map_payload_to_category(payload)`  
**Fields used:**
- `naics_code` or `NAICS`
- `naics_description` or `NAICS_Description`
- `title` or `bid_name` or `Title`
- `summary` or `bid_description` or `description` or `Description`

**Categories:**
- Professional Services
- Construction
- IT Services
- Goods/Supplies
- Maintenance/Operations
- Healthcare
- Transportation
- Other

---

## Scalability Assessment (16k Contracts)

### Worker: CAN HANDLE
- Batch processing (1000 contracts per scroll)
- Sequential processing prevents memory accumulation
- `with_vectors=False` keeps memory safe
- Estimated time: 30-60 seconds for full stats calculation

### Dashboard: NEEDS IMPROVEMENT
- Stats API: Fast (<50ms) - reads from Firebase snapshot
- Pagination: Slow for deep pages (O(N) complexity)
- Page 1-10: Fast (~100-500ms)
- Page 100+: Slow (~5-15 seconds)

### Recommendations for 16k+ Scale
1. Implement true cursor-based pagination
2. Only recalculate stats when collection changes
3. Reduce worker batch size to 500 for safety margin
4. Use payload field selectors instead of full payload

---

## Environment Setup

### Running the App
```bash
cd ~/repos/corama3
python3 app.py
# App available at http://127.0.0.1:5000
```

### Running Tests
```bash
cd ~/repos/corama3
python3 test_functions.py
```

### Running the Worker
```bash
cd ~/repos/corama3
python proposal_worker.py
```

### Frontend Development
```bash
cd ~/repos/corama3/frontend
npm install
npm run dev
```

### Building Frontend
```bash
cd ~/repos/corama3/frontend
npm run build
# Output goes to frontend/dist, copied to static/app
```

---

## Required Environment Variables

```
# Firebase
DATABASE_URL=https://corama-c911e-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_JSON=<json string>
STORAGE_BUCKET=corama-c911e.appspot.com

# OpenAI
OPENAI_API_KEY=<key>

# Qdrant
QDRANT_URL=<url>
QDRANT_API_KEY=<key>

# Flask
FLASK_SECRET_KEY=<secret>  # MUST be set in production
ENV=production  # or development

# Stripe
STRIPE_SECRET_KEY=<key>
STRIPE_PUBLISHABLE_KEY=<key>

# SMTP (for emails)
SMTP_HOST=<host>
SMTP_PORT=<port>
SMTP_USER=<user>
SMTP_PASSWORD=<password>
SMTP_FROM_EMAIL=<email>

# reCAPTCHA
RECAPTCHA_SITE_KEY=<key>
RECAPTCHA_SECRET_KEY=<key>

# Admin
ADMIN_SECRET_KEY=<key>
```

---

## Next Steps / Priorities

### High Priority
1. Fix hardcoded `credits={5}` in Header across all pages
2. Implement true cursor-based pagination for dashboard
3. Fix load_dotenv override mismatch
4. Audit SSRF protection usage

### Medium Priority
1. Gate stats recalculation on collection signature change
2. Move rate limiter to Redis storage
3. Fix TopFiveContracts "Load More" behavior
4. Remove console.log PII in CapabilityBuilder

### Low Priority
1. Split app.py into blueprints
2. Lazy-import heavy dependencies
3. Clean up App.tsx indentation
4. Remove hardcoded default states in TopFiveContracts

---

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `app.py` | 16,856 | Main Flask backend |
| `proposal_worker.py` | 2,068 | Background job processor |
| `category_mapping.py` | 411 | NAICS-to-category mapping |
| `credit_manager.py` | ~200 | Credit management |
| `ai_assistant_enhanced.py` | ~500 | AI assistant logic |
| `frontend/src/services/api.ts` | 846 | Frontend API service |
| `frontend/src/pages/Dashboard.tsx` | 457 | Main dashboard |
| `frontend/src/pages/TopFiveContracts.tsx` | 552 | Top 5 matches page |
| `frontend/src/pages/CapabilityBuilder.tsx` | 1,255 | CS builder |
| `frontend/src/pages/AIAssistant.tsx` | ~600 | AI chat interface |

---

## Contact

**Session Devin URL:** https://app.devin.ai/sessions/cc310c1115db4a54b8ad72d9c6647746  
**Requested by:** mario@corama.ai (@MarioA-OrnelasC)

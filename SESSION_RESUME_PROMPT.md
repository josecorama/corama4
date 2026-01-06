# Session Resume Prompt for CORAMA Project

Copy and paste this entire prompt into a new Devin session to resume work on the CORAMA government contracts dashboard.

---

## Resume Prompt

Hey Devin,

I need you to continue work on the CORAMA government contracts dashboard project. Here's what you need to know:

### Repository and Branch

**Repository:** Adreliaz37/corama3
**Branch:** `devin/1763574572-improve-capability-parsing`
**PR:** https://github.com/Adreliaz37/corama3/pull/11

Please checkout the branch `devin/1763574572-improve-capability-parsing` and work from there. This branch contains all the latest changes.

### Environment Setup

1. Navigate to `/home/ubuntu/repos/corama3`
2. Install dependencies: `pip install -r requirements.txt`
   - Ensure `beautifulsoup4==4.14.2` is installed
   - Ensure `qdrant-client==1.11.3` is installed
3. The `.env` file should contain these critical keys:
   - `OPENAI_MARIO` - Primary OpenAI API key for AI features
   - `Qdrant_EP` - Qdrant endpoint URL
   - `Qdrant_AK` - Qdrant API key
   - `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` - Stripe payment keys
4. Run the Flask app: `python3 app.py`

### Test Credentials

- **Email:** testuser@coramatest.com
- **Password:** TestPassword123!

### Important Instructions

1. **Always create a test deployment link** before reporting completion to the user. Use the deploy tool to expose port 5000.

2. **Verify the test deployment works** by checking that:
   - Login works with test credentials
   - Dashboard loads with contracts
   - Search functionality works
   - Categories show NAICS descriptions (not "Unknown" or "Other")

3. **Ensure OPENAI_MARIO is in the .env file** - This key is required for AI features like NAICS prediction.

4. **Verify qdrant-client version is 1.11.3** - Run `pip show qdrant-client` to confirm.

### Current Project State

The dashboard displays ~2,320 government contracts from Qdrant with:
- NAICS-based category descriptions (no "Other" or "Unclassified")
- AI-predicted NAICS codes for contracts without them (cached in `ai_naics_prediction_cache.json`)
- Proper NAICS code parsing (handles float format like "238220.0")
- Search that uses cached dashboard data for consistency

### Key Files

- `app.py` - Main Flask application (11,900+ lines)
- `.env` - Environment variables (API keys, credentials)
- `requirements.txt` - Python dependencies
- `ai_naics_prediction_cache.json` - Cached AI NAICS predictions
- `templates/welcome.html` - Dashboard template

### What Was Completed

1. NAICS descriptions replace generic categories in dashboard
2. AI prediction for contracts without NAICS codes
3. Search results use same normalized data as dashboard
4. PDF viewing with PDF.js
5. Team builder and proposal flow improvements
6. Stripe keys and Qdrant credentials updated

### Pending Tasks / Known Issues

- Monitor for any new "Unknown" or "Unclassified" categories
- The "Draft not found" error on team builder may still occur intermittently
- Search performance could be further optimized with result caching

Please let me know what specific task you'd like me to work on, or if there are any issues to fix.

---

**End of Resume Prompt**

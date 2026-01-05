# Future Session Prompt for CORAMA MVP UI Revamp

Copy and paste this entire prompt into a new Devin session to seamlessly continue work on the CORAMA project.

---

## Resume Prompt

Hey Devin,

I need you to continue work on the CORAMA government contracts dashboard project. The user will attach a `.env` file for local development purposes - please use it for all environment variables.

### Repository and Branch

**Repository:** Adreliaz37/corama3
**Branch:** `release/mvp-ui-revamp`
**Previous PR:** https://github.com/Adreliaz37/corama3/pull/17

Please checkout the branch `release/mvp-ui-revamp` and work from there. This branch contains all the latest UI improvements and React frontend integration.

### Environment Setup (CRITICAL)

1. Navigate to `/home/ubuntu/repos/corama3`
2. Clone the repository if not present: `git clone https://github.com/Adreliaz37/corama3.git`
3. Checkout the correct branch: `git checkout release/mvp-ui-revamp`
4. **Use the attached .env file** - The user will provide a `.env` file with all necessary credentials. Place it in the project root.
5. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. **VERIFY these specific packages are installed:**
   - `beautifulsoup4==4.14.2` - Run: `pip show beautifulsoup4` to confirm
   - `qdrant-client==1.11.3` - Run: `pip show qdrant-client` to confirm
   - If not installed or wrong version, run: `pip install beautifulsoup4==4.14.2 qdrant-client==1.11.3`

7. **Verify OPENAI_MARIO is in the .env file** - This key is required for AI features. Check with: `grep OPENAI_MARIO .env`

8. Install frontend dependencies (if modifying React code):
   ```bash
   cd frontend && npm install && cd ..
   ```

9. Run the Flask app: `python3 app.py`

### Test Credentials

- **Email:** testuser@coramatest.com
- **Password:** TestPassword123!

### MANDATORY: Test Deployment Link

**IMPORTANT:** Before reporting completion of ANY task to the user, you MUST:

1. **Create a test deployment link** using the deploy tool to expose port 5000
2. **Verify the deployment works** by checking:
   - Login works with test credentials
   - Dashboard loads with contracts
   - Search functionality works
   - Categories show NAICS descriptions (not "Unknown" or "Other")
   - React app routes work at `/app/*`
3. **Share the test link** with the user in your completion message

Never report task completion without providing a working test deployment link.

### Current Project State

The CORAMA dashboard is a Flask-based web application with a React frontend that displays ~2,320 government contracts from a Qdrant vector database. Key features:

**Backend (Flask):**
- Main application in `app.py` (~12,000+ lines)
- JSON API endpoints at `/api/*` for React frontend
- Firebase authentication and database integration
- OpenAI integration for AI features (NAICS prediction, proposal generation)
- Qdrant vector database for contract storage and search
- Stripe payment integration

**Frontend (React):**
- Located in `/frontend` directory
- Built with Vite, outputs to `/static/app`
- Served at `/app/*` routes
- Key pages: Dashboard, AIAssistant, ContractAnalysis, ProposalTeam, ProposalSummary, PublicBidProposalGenerator

**Recent UI Improvements (completed):**
- Dark toolbar (#333c4d) with custom SVG icons
- Typing animation for AI assistant messages
- Checkmark animations for progress indicators
- Section card progress animations with spinning circles and percentage counters
- Button color updates (#2d4160 background, white text)

### Key Files

| File | Description |
|------|-------------|
| `app.py` | Main Flask application with all routes and API endpoints |
| `.env` | Environment variables (API keys, credentials) - USER WILL PROVIDE |
| `requirements.txt` | Python dependencies |
| `frontend/` | React frontend source code |
| `frontend/src/pages/` | React page components |
| `frontend/src/services/api.ts` | API service for backend communication |
| `static/app/` | Built React frontend (served by Flask) |
| `templates/` | Jinja2 templates for legacy pages |

### Priority Tasks: Analyze and Optimize

After setting up the environment and verifying the test deployment, analyze the following documents and codebase to identify optimization opportunities. Order tasks by priority level:

**HIGH PRIORITY:**
1. Review `app.py` for performance bottlenecks (caching, database queries)
2. Check for any hardcoded values that should be environment variables
3. Identify any security vulnerabilities (exposed keys, SQL injection, etc.)
4. Review error handling and logging consistency

**MEDIUM PRIORITY:**
1. Analyze React components for code duplication and refactoring opportunities
2. Review API endpoint response times and optimization potential
3. Check for unused imports and dead code
4. Evaluate bundle size and code splitting opportunities in frontend

**LOW PRIORITY:**
1. Review documentation completeness
2. Check for accessibility improvements in UI
3. Evaluate test coverage and identify missing tests
4. Review code style consistency

### Known Issues to Monitor

1. **Draft Not Found Error** - May occur intermittently on team builder page
2. **Qdrant Field Name Variations** - Three different formats (snake_case, Title Case, old format)
3. **NAICS Code Formats** - Various formats in Qdrant (float, string, multiple, semicolon-separated)
4. **Dashboard Cache** - Not refreshed until app restart

### Workflow Requirements

1. **Always create a new branch** for changes (unless working on existing feature branch)
2. **Run lint checks** before committing
3. **Rebuild frontend** after React changes: `cd frontend && npm run build`
4. **Create PR** for all code changes
5. **Wait for CI** to pass before reporting completion
6. **Create test deployment link** and verify it works before reporting to user

---

**End of Resume Prompt**

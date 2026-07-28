import os
import openai
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.http import models
import PyPDF2
import re
import csv
import hashlib
import io
import pandas as pd

# --- State normalization helpers (shared with the Top 5 endpoints) ---------
# The dataset supports Illinois and Indiana state contracts. Different data
# sources store the location inconsistently (e.g. "IL", "Illinois",
# "Chicago, IL", "State-IL"), so we extract a normalized 2-letter code from
# whatever text is available and match on that.
STATE_NAME_TO_CODE = {'illinois': 'IL', 'indiana': 'IN'}
KNOWN_STATE_CODES = {'IL', 'IN'}
_FEDERAL_STATE_MARKERS = {'', 'UNKNOWN', 'N/A', 'DC', 'US', 'USA', 'NAN',
                          'NONE', 'NULL', 'CLASSIFIED'}


def extract_state_codes(text):
    """Return the set of known state codes (IL/IN) referenced by ``text``.

    Handles full names ("Illinois"), codes ("IL"), "City, ST" and the
    "State-IL" contract-type bucket. Deterministic; no guessing."""
    t = str(text or '')
    codes = set()
    low = t.lower()
    for name, code in STATE_NAME_TO_CODE.items():
        if name in low:
            codes.add(code)
    for token in re.findall(r'\b([A-Za-z]{2})\b', t):
        if token.upper() in KNOWN_STATE_CODES:
            codes.add(token.upper())
    return codes


def payload_state_codes(payload):
    """Collect state codes declared across a contract's location-ish fields."""
    if not isinstance(payload, dict):
        return set()
    fields = ('Contract Type', 'contract_type', 'location', 'Location',
              'state', 'State', 'Geographic_Area', 'geographic_area')
    codes = set()
    for f in fields:
        codes |= extract_state_codes(payload.get(f))
    return codes


def payload_is_federal(payload):
    """Best-effort federal vs. state classification for a contract payload."""
    if not isinstance(payload, dict):
        return False
    ct = str(payload.get('Contract Type') or payload.get('contract_type') or '').lower().strip()
    if ct in ('federal', 'fed'):
        return True
    if ct == 'state' or ct.startswith('state-'):
        return False
    st = str(payload.get('state') or payload.get('State')
             or payload.get('location') or payload.get('Location') or '').upper().strip()
    return st in _FEDERAL_STATE_MARKERS


# --- Excluded contracts ----------------------------------------------------
# Contracts whose title/description mention any of these terms are hidden from
# the Top 5 recommendations and the dashboard listings (whole-word, case
# insensitive so "ICEE" doesn't match unrelated substrings).
EXCLUDED_CONTRACT_TERMS = ('icee',)
_EXCLUDED_TERM_RES = [re.compile(r'\b' + re.escape(t) + r'\b', re.IGNORECASE)
                      for t in EXCLUDED_CONTRACT_TERMS]


def payload_has_excluded_term(payload):
    """True when a contract payload's title or description contains an excluded
    term (e.g. 'ICEE')."""
    if not isinstance(payload, dict):
        return False
    title = str(payload.get('title') or payload.get('bid_name')
                or payload.get('Bid Name') or payload.get('Bid_Name') or '')
    desc = str(payload.get('summary') or payload.get('bid_description')
               or payload.get('Bid Description') or payload.get('Bid_Description')
               or payload.get('description') or '')
    haystack = f"{title}\n{desc}"
    return any(rx.search(haystack) for rx in _EXCLUDED_TERM_RES)


# --- Capability-statement query building -----------------------------------
# Before embedding, we strip obvious contact/boilerplate noise so the vector
# focuses on what the company actually does, then append the most frequent
# meaningful terms so the semantic match keys on the real capabilities.
_QUERY_EMAIL_RE = re.compile(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b')
_QUERY_URL_RE = re.compile(r'\bhttps?://\S+|\bwww\.\S+', re.IGNORECASE)
_QUERY_PHONE_RE = re.compile(r'\+?\d[\d\s().-]{7,}\d')
_QUERY_WORD_RE = re.compile(r"[A-Za-z][A-Za-z&/-]{2,}")

_QUERY_STOPWORDS = {
    'the', 'and', 'for', 'with', 'our', 'are', 'you', 'your', 'that', 'this',
    'from', 'have', 'has', 'was', 'were', 'will', 'can', 'all', 'any', 'its',
    'their', 'they', 'them', 'who', 'what', 'when', 'where', 'which', 'into',
    'over', 'under', 'more', 'most', 'other', 'such', 'than', 'then', 'these',
    'those', 'also', 'been', 'being', 'about', 'above', 'across', 'after',
    'inc', 'llc', 'ltd', 'corp', 'company', 'companies', 'capability',
    'statement', 'contact', 'point', 'email', 'phone', 'fax', 'website',
    'address', 'street', 'suite', 'avenue', 'road', 'city', 'state', 'zip',
    'uei', 'cage', 'duns', 'naics', 'code', 'codes', 'number',
    'not', 'but', 'our', 'per', 'via', 'etc', 'page',
}


def build_capability_query_text(text, max_chars=30000, top_keywords=30):
    """Turn the raw PDF text into a focused embedding query.

    Deterministic: removes emails/URLs/phone numbers, then appends the most
    frequent meaningful (non-stopword) terms so the Qdrant vector match keys on
    the company's actual capabilities rather than boilerplate/contact noise.
    """
    raw = str(text or '')
    cleaned = _QUERY_EMAIL_RE.sub(' ', raw)
    cleaned = _QUERY_URL_RE.sub(' ', cleaned)
    cleaned = _QUERY_PHONE_RE.sub(' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    counts = {}
    for token in _QUERY_WORD_RE.findall(cleaned):
        low = token.lower()
        if low in _QUERY_STOPWORDS or len(low) < 4:
            continue
        counts[low] = counts.get(low, 0) + 1

    keywords = [w for w, _ in sorted(
        counts.items(), key=lambda kv: (-kv[1], kv[0]))[:top_keywords]]

    if keywords:
        cleaned = f"{cleaned}\n\nKey capabilities and services: {', '.join(keywords)}."

    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


class CSQueryHandler:
    def __init__(self, openai_api_key, qdrant_url, qdrant_api_key, user_upload_dir):
        self.openai_client = OpenAI(api_key=openai_api_key)
        
        # 初始化 Qdrant 客户端，移除不支持的参数
        self.qdrant_client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key,
            timeout=10            # 只保留支持的参数
        )
        self.collection_name = "government_contracts"
        self.user_upload_dir = user_upload_dir
        
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [c.name for c in collections.collections]
            if self.collection_name in collection_names:
                print(f"Successfully connected to Qdrant. Collection '{self.collection_name}' found.")
            else:
                print(f"Warning: Collection '{self.collection_name}' not found in available collections: {collection_names}")
        except Exception as e:
            print(f"Connection test failed: {str(e)}")
            raise

    def extract_text_from_pdf(self, pdf_file):
        try:
            reader = PyPDF2.PdfReader(pdf_file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
            return self.clean_text(text)
        except Exception as e:
            raise Exception(f"PDF处理错误: {str(e)}")

    def clean_text(self, text):
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()-]', '', text)
        return text.strip()

    def get_embedding(self, text, model="text-embedding-3-small"):
        """Generate embedding for text using OpenAI API.
        
        Raises an exception on failure instead of falling back to mock embeddings,
        which would produce irrelevant search results.
        """
        try:
            text = text.replace("\n", " ")
            # Truncate text to avoid token limit errors (max ~8000 tokens for text-embedding-3-small)
            # Using conservative character limit (roughly 4 chars per token)
            MAX_CHARS = 30000
            if len(text) > MAX_CHARS:
                print(f"Warning: Text truncated from {len(text)} to {MAX_CHARS} characters for embedding")
                text = text[:MAX_CHARS]
            
            response = self.openai_client.embeddings.create(
                input=[text],
                model=model
            )
            return response.data[0].embedding
        except Exception as e:
            # Raise exception instead of falling back to mock embeddings
            # Mock embeddings produce irrelevant results that look like "matching is broken"
            raise Exception(f"Embedding generation failed: {str(e)}")

    def create_mock_embedding(self, text, dimension=1536):
        """Create a deterministic mock embedding based on text content for testing"""
        import hashlib
        import numpy as np
        
        hash_obj = hashlib.md5(text.encode())
        seed = int(hash_obj.hexdigest()[:8], 16)
        np.random.seed(seed)
        
        vector = np.random.normal(0, 1, dimension)
        vector = vector / np.linalg.norm(vector)
        return vector.tolist()

    def _is_past_due(self, due_date_str):
        """Check if a due date has passed (contract is closed)"""
        if not due_date_str:
            return False
        try:
            from datetime import date, datetime
            # Parse date, stripping time/offset if present (e.g., "2025-12-05T14:00:00-05:00" -> "2025-12-05")
            date_part = due_date_str.split("T")[0]
            parsed_date = datetime.strptime(date_part, "%Y-%m-%d").date()
            return parsed_date < date.today()
        except Exception:
            return False

    def enrich_with_ai(self, contracts):
        """Use OpenAI to extract Industry Sector and Geographic Area for contracts"""
        if not contracts:
            return contracts
        
        try:
            # Build compact representation of contracts for AI analysis
            contracts_data = []
            for i, contract in enumerate(contracts):
                contracts_data.append({
                    "id": str(i),
                    "title": contract.get('Bid_Name', ''),
                    "summary": contract.get('Bid_Description', '')[:300],
                    "naics_code": contract.get('NAICS_CODE', ''),
                    "naics_title": contract.get('NAICS_TITLE', ''),
                    "agency": contract.get('Organization', ''),
                    "source": contract.get('source', ''),
                    "state": contract.get('State', '')
                })
            
            import json
            prompt = f"""You are a classifier for US government contracts.
For each contract, analyze its data and return:
1. industry_sector: a short phrase like "Construction", "IT Services", "Defense Logistics", "Healthcare Equipment", "Plumbing & HVAC", etc.
2. geographic_area: a short description of where the work is located, like "Chicago, IL", "Columbus, OH", "Nationwide (USA)", or "Unknown" if not clear.

Contracts (JSON list):
{json.dumps(contracts_data, indent=2)}

Respond with ONLY valid JSON array, no other text:
[{{"id": "0", "industry_sector": "...", "geographic_area": "..."}}, ...]"""

            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a contract classifier. Respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            result_text = response.choices[0].message.content.strip()
            # Clean up response - remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
            result_text = result_text.strip()
            
            enrichments = json.loads(result_text)
            
            # Apply enrichments to contracts
            enrichment_map = {e["id"]: e for e in enrichments}
            for i, contract in enumerate(contracts):
                enrichment = enrichment_map.get(str(i), {})
                contract['Industry_Sector'] = enrichment.get('industry_sector', contract.get('Category', 'Unknown'))
                contract['Geographic_Area'] = enrichment.get('geographic_area', contract.get('State', 'Unknown'))
            
            print(f"✅ AI enrichment successful for {len(contracts)} contracts")
            return contracts
            
        except Exception as e:
            print(f"⚠️ AI enrichment failed: {str(e)}, using fallback values")
            # Fallback: use existing fields
            for contract in contracts:
                # Use NAICS_TITLE as fallback for Industry Sector (handle "nan" values)
                naics_title = contract.get('NAICS_TITLE', '')
                if naics_title and str(naics_title).lower() not in ('nan', 'none', 'null', ''):
                    contract['Industry_Sector'] = naics_title
                else:
                    category = contract.get('Category', 'Unknown')
                    if category and str(category).lower() not in ('nan', 'none', 'null', ''):
                        contract['Industry_Sector'] = category.capitalize()
                    else:
                        contract['Industry_Sector'] = 'Unknown'
                
                # Use source/agency hints for Geographic Area
                agency = contract.get('Organization', '')
                source = contract.get('source', '')
                if 'chicago' in source.lower() or 'chicago' in agency.lower():
                    contract['Geographic_Area'] = 'Chicago, IL'
                elif contract.get('State') and contract.get('State') not in ('Unknown', 'nan', 'none', 'null', ''):
                    contract['Geographic_Area'] = contract.get('State')
                else:
                    contract['Geographic_Area'] = 'Unknown'
            
            return contracts

    def inspect_data(self):
        """Inspect actual database contents"""
        try:
            # Get sample points
            results = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                limit=10,
                with_payload=True
            )
            
            print("\nDatabase content sample:")
            contract_types = set()
            states = set()
            
            if results[0]:
                for point in results[0]:
                    ct = point.payload.get('Contract Type')
                    st = point.payload.get('State')
                    if ct:
                        contract_types.add(ct)
                    if st:
                        states.add(st)
                
                print(f"Found Contract Type values: {contract_types}")
                print(f"Found State values: {states}")
                print("\nFirst record full payload:")
                print(results[0][0].payload)
            
            return contract_types, states
        except Exception as e:
            print(f"Error inspecting data: {e}")
            return set(), set()

    def build_filter_conditions(self, contract_types, states):
        from qdrant_client.http import models

        contract_types = contract_types or []
        states = states or []

        ALL_STATES = ["IL", "IN"]

        # "All states" sentinels mean "do not restrict geographically". The filter
        # UI sends the individual states alongside the sentinel (e.g.
        # ['all', 'IL', 'IN']) when everything is selected, so the presence of the
        # sentinel takes precedence and we ignore the accompanying specific states.
        _all_sentinels = ('all', 'all state', 'all states')
        has_all_states = any(str(s).strip().lower() in _all_sentinels for s in states)
        specific_states = [] if has_all_states else [
            s for s in states if str(s).strip().lower() not in _all_sentinels
        ]

        all_contracts = "All Contracts" in contract_types
        want_federal = "federal" in contract_types
        want_state = "state" in contract_types

        # Nothing to restrict on -> return all contracts.
        # (Only bail out when no specific state was chosen; a specific state must
        # still be honored even when "All Contracts" / no contract type is set.)
        if not specific_states and (all_contracts or not contract_types):
            print("No specific state and no contract-type restriction; returning all contracts")
            return None

        # The dataset stores a deterministic 'Contract Type' bucket per contract:
        # 'Federal' for federal contracts and 'State-IL' / 'State-IN' for state
        # contracts. We filter on that field for reliable, exact matching.
        contract_type_values = []

        if want_federal:
            contract_type_values.append("Federal")
            print("Added Federal condition")

        if specific_states:
            # Restrict specifically to the chosen state(s), regardless of whether
            # federal/all was selected -- the user asked for those states.
            for s in specific_states:
                contract_type_values.append(f"State-{s.strip().upper()}")
                print(f"Added specific State condition: State-{s.strip().upper()}")
        elif want_state:
            # State contracts requested but no specific state -> all known states.
            for s in ALL_STATES:
                contract_type_values.append(f"State-{s}")
                print(f"Added all-state condition: State-{s}")

        if not contract_type_values:
            print("No valid match conditions, returning None")
            return None

        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key='Contract Type',
                    match=models.MatchAny(any=contract_type_values)
                )
            ]
        )
        print("Built filter condition:", filter_condition.dict())
        return filter_condition

    def _apply_type_state_filter(self, results, contract_types, states):
        """Filter retrieved Qdrant points by contract type and/or state.

        Ranking (already applied to ``results``) is preserved. This is tolerant
        of inconsistent payload formats: state matching normalizes codes/names
        via ``payload_state_codes`` and federal/state classification via
        ``payload_is_federal``.
        """
        contract_types = contract_types or []
        states = states or []

        _all_sentinels = ('all', 'all state', 'all states')
        has_all_states = any(str(s).strip().lower() in _all_sentinels for s in states)
        selected_codes = set() if has_all_states else {
            str(s).strip().upper() for s in states
            if str(s).strip().lower() not in _all_sentinels
        }

        all_contracts = 'All Contracts' in contract_types
        want_federal = 'federal' in contract_types
        want_state = 'state' in contract_types

        # No effective restriction -> keep everything (still ranked).
        if not selected_codes and (all_contracts or not contract_types):
            return results

        kept = []
        for res in results:
            payload = res.payload or {}
            is_federal = payload_is_federal(payload)

            if selected_codes:
                # Specific state(s) requested: keep only state contracts located
                # in one of them (federal contracts are excluded).
                if is_federal:
                    continue
                if not (payload_state_codes(payload) & selected_codes):
                    continue
                kept.append(res)
                continue

            # No specific state, so restrict purely by contract type.
            if want_federal and is_federal:
                kept.append(res)
            elif want_state and not is_federal:
                kept.append(res)

        return kept



    def search_similar_documents(self, vector, contract_types=None, states=None, limit=5):
            """Execute vector search"""
            try:
                print("\nExecuting vector search:")
                
                # Build filter conditions
                filter_conditions = None
                if contract_types or states:
                    filter_conditions = self.build_filter_conditions(contract_types or [], states or [])
                
                # Execute search using query_points (new API)
                print("Filter conditions used:", filter_conditions.dict() if filter_conditions else None)
                
                results = self.qdrant_client.query_points(
                    collection_name=self.collection_name,
                    query=vector,
                    query_filter=filter_conditions,
                    with_payload=True,
                    limit=limit
                )
                
                # Extract points from QueryResponse
                points = results.points if hasattr(results, 'points') else []
                
                print(f"\nSearch completed, found {len(points)} results")
                
                if points:
                    print("\nTop 3 results:")
                    for i, res in enumerate(points[:3], 1):
                        ct = res.payload.get('Contract Type')
                        state = res.payload.get('State')
                        score = res.score
                        print(f"Result {i}: Contract Type={ct}, State={state}, Score={score:.4f}")
                
                return points
                
            except Exception as e:
                print(f"Search error: {str(e)}")
                try:
                    results = self.qdrant_client.query_points(
                        collection_name=self.collection_name,
                        query=vector,
                        with_payload=True,
                        limit=limit
                    )
                    return results.points if hasattr(results, 'points') else []
                except Exception as e2:
                    print(f"Fallback search also failed: {str(e2)}")
                    return []

    
    def process_query(self, pdf_file, contract_types=None, states=None, limit=50):
        
        """Process query using query_filter"""
        try:
            print("\n========== Starting query processing ==========")
            print(f"Input parameters:\ncontract_types: {contract_types}\nstates: {states}")

            user_company = None

            try:
                # Get company name from capability statements CSV
                cs_path = os.path.join(self.user_upload_dir, "capability_statements_processed.csv")
                print(f"Looking for company info in: {cs_path}")
                
                # Force read as string to avoid type conversion issues
                if os.path.exists(cs_path):
                    cs_df = pd.read_csv(cs_path, dtype=str)
                    if 'Company' in cs_df.columns and not cs_df.empty:
                        user_company = cs_df['Company'].iloc[0]
                        print(f"Found company: '{user_company}'")
                    else:
                        print("Company column not found in CSV or empty")
                        user_company = "GSG_General_Brochure_1_page"  # Hardcode the expected value
                else:
                    print(f"CSV file not found at: {cs_path}")
                    user_company = "GSG_General_Brochure_1_page"  # Hardcode the expected value
            except Exception as e:
                print(f"Error reading capability_statements_processed.csv: {str(e)}")
                user_company = "GSG_General_Brochure_1_page"  # Hardcode the expected value

            print(f"Will use company name: '{user_company}'")

            # 1. Extract PDF text and build a focused, denoised query so the
            # vector search keys on the company's actual capabilities.
            text = self.extract_text_from_pdf(pdf_file)
            print(f"Extracted text, length: {len(text)} characters")
            query_text = build_capability_query_text(text)
            print(f"Built focused query text, length: {len(query_text)} characters")

            # 2. Generate embedding
            vector = self.get_embedding(query_text)
            print(f"Generated embedding vector, dimensions: {len(vector)}")
            
            # 3. Build query parameters
            query_params = {
                "collection_name": self.collection_name,
                "query_vector": vector,
                "with_payload": True,
                "limit": limit
            }
            
            # 4. Contract type / state filtering is done AFTER retrieval (see
            # step 6b). The payload field names and values differ across data
            # sources (e.g. "IL" vs "Illinois" vs "Chicago, IL"), so a strict
            # Qdrant filter easily returns zero rows. Instead we retrieve a wide
            # candidate pool ranked purely by capability-statement similarity and
            # then filter/normalize in Python, preserving the ranking.
            filter_conditions = None
            has_type_or_state_filter = bool(contract_types or states)
            # Pull a bigger candidate pool when filtering so enough survive.
            retrieval_limit = max(limit, 200) if has_type_or_state_filter else limit

            # 5. Execute search using query_points (new API)
            print("\nExecuting search...")
            query_response = self.qdrant_client.query_points(
                collection_name=self.collection_name,
                query=vector,
                query_filter=filter_conditions,
                with_payload=True,
                limit=retrieval_limit
            )
            # Extract points from QueryResponse
            results = query_response.points if hasattr(query_response, 'points') else []

            print(f"\n[MATCHING] Stage 1 - Raw Qdrant results: {len(results)} (limit={limit})")
            for idx, res in enumerate(results, 1):
                # Use correct Qdrant field name: 'title' instead of 'Bid Name'
                name = res.payload.get('title', 'Unknown Bid')
                score_str = f"{res.score*100:.2f}%"
                print(f"  {idx:2d}. {name} => {score_str}")
            
            print(f"\nSearch completed, found {len(results)} results")
            if results:
                print("\nTop 3 results:")
                for i, res in enumerate(results[:3], 1):
                    ct = res.payload.get('Contract Type')
                    state = res.payload.get('State')
                    score = res.score
                    print(f"Result {i}:")
                    print(f"  Contract Type: {ct}")
                    print(f"  State: {state}")
                    print(f"  Score: {score:.4f}")
            
            # Duplicate check
            # 1) Check by URL
            seen_urls = set()
            # 2) Keep highest similarity score by bid name
            best_by_name = {}

            duplicate_logs = []
            replaced_logs = []

            for res in results:
                # Use correct Qdrant field names: 'source_url' instead of 'Detail Link', 'title' instead of 'Bid Name'
                url = res.payload.get("source_url", "")
                name = res.payload.get("title", "Unknown Bid")
                score = res.score
                score_str = f"{score*100:.2f}%"

                # Skip empty URLs for deduplication (don't treat all empty URLs as duplicates)
                if url and url in seen_urls:
                    duplicate_logs.append(f"Discarded duplicate URL: {name} ({score_str}), URL={url}")
                    continue
                else:
                    if name not in best_by_name:
                        best_by_name[name] = res
                        if url:
                            seen_urls.add(url)

                    else:
                        existing_res = best_by_name[name]
                        if score > existing_res.score:
                            old_score_str = f"{existing_res.score*100:.2f}%"
                            old_url = existing_res.payload.get("source_url", "")
                            replaced_logs.append(
                                f"Replaced: {name}, old_score={old_score_str} URL={old_url}, new_score={score_str} URL={url}"
                            )
                            if old_url and old_url in seen_urls:
                                seen_urls.remove(old_url)

                            best_by_name[name] = res
                            if url:
                                seen_urls.add(url)
                        else:
                            duplicate_logs.append(
                                f"Discarded same name: {name} ({score_str}), higher score exists ({existing_res.score*100:.2f}%)"
                            )

            unique_results = list(best_by_name.values())

            unique_results.sort(key=lambda x: x.score, reverse=True)
            
            print(f"\n[MATCHING] Stage 2 - After deduplication: {len(unique_results)} unique contracts")

            # Filter out closed contracts (past due dates) and excluded terms
            # (e.g. ICEE) before selecting the top matches.
            open_results = []
            closed_count = 0
            excluded_count = 0
            for res in unique_results:
                if payload_has_excluded_term(res.payload):
                    excluded_count += 1
                    print(f"   - Skipping excluded contract: {res.payload.get('title', 'Unknown')}")
                    continue
                due_date = res.payload.get("due_date", "")
                if self._is_past_due(due_date):
                    closed_count += 1
                    print(f"   - Skipping closed contract: {res.payload.get('title', 'Unknown')} (due date: {due_date})")
                else:
                    open_results.append(res)
            
            print(f"\n[MATCHING] Stage 3 - After filtering closed/excluded: {len(open_results)} open contracts (filtered out {closed_count} closed, {excluded_count} excluded)")

            # 6b. Apply contract-type / state filtering in Python (deterministic,
            # tolerant of inconsistent payload formats) while keeping the
            # similarity ranking established above.
            open_results = self._apply_type_state_filter(open_results, contract_types or [], states or [])
            print(f"\n[MATCHING] Stage 3b - After type/state filter: {len(open_results)} contracts")

            # 6c. Relevance floor: keep only contracts whose similarity clears a
            # minimum, so weakly-related results don't get recommended. Falls
            # back to the best available if too few clear the bar (so the page
            # is never empty when there ARE open contracts).
            try:
                min_similarity = float(os.getenv('TOP5_MIN_SIMILARITY', '0.20'))
            except (TypeError, ValueError):
                min_similarity = 0.20
            min_keep = 3
            relevant = [r for r in open_results if getattr(r, 'score', 0.0) >= min_similarity]
            if len(relevant) >= min_keep or not open_results:
                filtered_by_score = relevant
            else:
                filtered_by_score = open_results[:min_keep]
            print(f"\n[MATCHING] Stage 3c - After relevance floor (>= {min_similarity}): "
                  f"{len(filtered_by_score)} contracts (from {len(open_results)})")

            final_results = filtered_by_score[:limit]
            print(f"\n[MATCHING] Stage 4 - Final results (top {limit}): {len(final_results)} contracts")

            print("\n(2) Deduplication process log:")
            for line in duplicate_logs:
                print("   - " + line)
            for line in replaced_logs:
                print("   - " + line)

            print(f"\n(3) Final {len(final_results)} results kept:")
            for i, fr in enumerate(final_results, 1):
                # Use correct Qdrant field name: 'title' instead of 'Bid Name'
                final_name = fr.payload.get("title", "Unknown Bid")
                final_score_str = f"{fr.score*100:.2f}%"
                print(f"  {i}. {final_name} => {final_score_str}")

            print(f"About to create formatted results with company: '{user_company}'")

            # 6. Format results (using new Qdrant field names)
            formatted_results = []
            for res in final_results:
                # Helper function to clean values - treat None, empty, "nan", "none", "null" as missing
                def clean_value(value, fallback):
                    if value is None:
                        return fallback
                    s = str(value).strip()
                    if not s or s.lower() in ("nan", "none", "null", "n/a", ""):
                        return fallback
                    return s
                
                # Extract NAICS code — check naics_codes (SAM.gov list), naics_code, NAICS_CODE
                import re as _re
                raw_naics = res.payload.get('naics_code') or res.payload.get('NAICS_CODE', '')
                raw_naics_list = res.payload.get('naics_codes')  # SAM.gov stores as list
                naics_code = ''
                if raw_naics_list and isinstance(raw_naics_list, list):
                    codes = []
                    for item in raw_naics_list:
                        for c in _re.findall(r'(\d{2,})(?:\.\d+)?', str(item)):
                            if c not in codes:
                                codes.append(c)
                    naics_code = ', '.join(codes)
                elif raw_naics and str(raw_naics).lower() != 'nan':
                    matches = _re.findall(r'(\d{2,})(?:\.\d+)?', str(raw_naics))
                    if matches:
                        naics_code = ', '.join(matches)
                
                # Extract NAICS description from lowercase field
                naics_description = res.payload.get('naics_description') or res.payload.get('NAICS_TITLE', '')
                if naics_description and str(naics_description).lower() == 'nan':
                    naics_description = ''
                
                # Use actual Qdrant field names - try both lowercase and uppercase variants
                # to handle different payload schemas from various data sources
                entry = {
                    'Company': user_company,
                    'contract_id': str(res.id),  # Qdrant point ID (replaces hash_value)
                    'hash_value': str(res.id),  # For backward compatibility
                    'Bid_Number': clean_value(res.payload.get('contract_number') or res.payload.get('bid_number') or res.payload.get('Bid Number'), 'N/A'),
                    'Bid_Name': clean_value(res.payload.get('title') or res.payload.get('bid_name') or res.payload.get('Bid Name'), 'Unknown Bid'),
                    'Bid_Description': clean_value(res.payload.get('summary') or res.payload.get('bid_description') or res.payload.get('Bid Description'), 'No description available'),
                    'Status': 'Open',  # Qdrant doesn't have status field
                    'Category': clean_value(res.payload.get('category') or res.payload.get('Category'), 'Classified'),
                    'Due_Date': clean_value(res.payload.get('due_date') or res.payload.get('Due Date'), 'Classified'),
                    'Detail_Link': clean_value(res.payload.get('source_url') or res.payload.get('detail_link') or res.payload.get('Detail Link'), '#'),
                    'State': clean_value(res.payload.get('location') or res.payload.get('Location') or res.payload.get('state') or res.payload.get('State'), 'Classified'),
                    'Organization': clean_value(res.payload.get('agency') or res.payload.get('organization') or res.payload.get('Organization'), 'Classified'),
                    'Budget': clean_value(res.payload.get('budget') or res.payload.get('Budget'), 'Classified'),
                    'Similarity_Score': f"{res.score * 100:.2f}%",
                    'NAICS_Code': naics_code,  # Use mixed case to match frontend expectation
                    'NAICS_CODE': naics_code,  # Keep uppercase for backward compatibility
                    'NAICS_TITLE': naics_description,
                    'source': res.payload.get('source') or res.payload.get('Source', ''),  # For AI enrichment
                }
                formatted_results.append(entry)
            
            # 7. Enrich with AI-derived Industry Sector and Geographic Area
            formatted_results = self.enrich_with_ai(formatted_results)
            
            print(f"First result company: {formatted_results[0]['Company']}")
            
            if formatted_results:
                print(f"First result company")
            if contract_types:
                matched_types = set(res.payload.get('Contract Type') for res in results)
                print("\nContract Type values in results:", matched_types)
            
            return formatted_results
            
        except Exception as e:
            print(f"\nError processing query: {str(e)}")
            # If embedding generation fails, don't continue with search, return empty results
            return []



def main():
    from dotenv import load_dotenv
    load_dotenv()
    
    OPENAI_API_KEY = os.getenv('CS_BUILDER_OPENAI_API_KEY')
    QDRANT_URL = os.getenv('Qdrant_EP')
    QDRANT_API_KEY = os.getenv('Qdrant_AK')
    
    user_upload_dir = "uploads"
    file_path = "example_capability_statement.pdf"
    selected_contract_types = ["IT Services", "Consulting"]
    selected_states = ["CA", "NY"]
    
    handler = CSQueryHandler(
        OPENAI_API_KEY, 
        QDRANT_URL, 
        QDRANT_API_KEY,
        user_upload_dir=user_upload_dir)
    
    if os.path.exists(file_path):
        with open(file_path, 'rb') as pdf_file:
            results = handler.process_query(
                pdf_file,
                contract_types=selected_contract_types,
                states=selected_states
            )
        print("Search Results:", results)
    else:
        print(f"Example file {file_path} not found. Testing configuration only.")
        print("✅ CSQueryHandler initialized successfully")
    
    try:
        # Print collection info
        collection_info = handler.qdrant_client.get_collection(handler.collection_name)
        print(f"\nCollection info:")
        print(f"Vector size: {collection_info.config.params.vectors.size}")
        print(f"Distance function: {collection_info.config.params.vectors.distance}")
        
        # Get sample data
        print("\nGetting sample data:")
        sample_data = handler.get_sample_data()
        if sample_data:
            points = sample_data[0]
            print(f"Sample points count: {len(points)}")
            if points:
                print(f"First point payload: {points[0].payload}")
        
        print("\nProcessing PDF file...")
        if os.path.exists(file_path):
            with open(file_path, 'rb') as pdf_file:
                results = handler.process_query(
                    pdf_file,
                    contract_types=selected_contract_types,
                    states=selected_states
                )
        else:
            results = []
            print(f"File {file_path} not found, skipping processing.")

            
        # Print results
        print("\nSimilar document results:")
        if not results:
            print("No similar documents found")
        else:
            for idx, result in enumerate(results, 1):
                print(f"\n--- Result {idx} ---")
                print(f"Bid name: {result['bid_name']}")
                print(f"Similarity: {result['similarity_score']:.2%}")
                print(f"Description: {result['bid_description']}")
                print(f"Organization: {result['organization']}")
                print(f"Due date: {result['due_date']}")
                print(f"Budget: {result['budget']}")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()

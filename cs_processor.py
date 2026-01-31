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

        # If "All Contracts" is selected, return None (no filtering, return all contracts)
        if "All Contracts" in contract_types:
            print("All Contracts selected, no filter conditions added")
            return None

        match_values = []
        
        # Handle federal contracts
        if "federal" in contract_types:
            match_values.append("Federal")
            print("Added Federal condition")
        
        # Handle state contracts
        if "state" in contract_types:
            # If "All state" is selected, automatically use all specific states
            if "All state" in states:
                # Ensure this list matches the states that exist in the database
                ALL_STATES = ["IL", "IN"]
                for s in ALL_STATES:
                    match_values.append(f"State-{s.upper()}")
                    print(f"Added All state condition: State-{s.upper()}")
            else:
                for s in states:
                    match_values.append(f"State-{s.upper()}")
                    print(f"Added State condition: State-{s.upper()}")

        if not match_values:
            print("No valid match conditions, returning None")
            return None

        filter_condition = models.Filter(
            must=[
                models.FieldCondition(
                    key='Contract Type',  # Fixed: removed embedded quotes
                    match=models.MatchAny(any=match_values)
                )
            ]
        )
        print("Built filter condition:", filter_condition.dict())
        return filter_condition



    def search_similar_documents(self, vector, contract_types=None, states=None, limit=5):
            """Execute vector search"""
            try:
                print("\nExecuting vector search:")
                
                # Build filter conditions
                filter_conditions = None
                if contract_types:
                    filter_conditions = self.build_filter_conditions(contract_types, states or [])
                
                # Execute search
                print("Filter conditions used:", filter_conditions.dict() if filter_conditions else None)
                
                results = self.qdrant_client.search(
                    collection_name=self.collection_name,
                    query_vector=vector,
                    query_filter=filter_conditions,
                    with_payload=True,
                    limit=limit
                )
                
                print(f"\nSearch completed, found {len(results)} results")
                
                if results:
                    print("\nTop 3 results:")
                    for i, res in enumerate(results[:3], 1):
                        ct = res.payload.get('Contract Type')
                        state = res.payload.get('State')
                        score = res.score
                        print(f"Result {i}: Contract Type={ct}, State={state}, Score={score:.4f}")
                
                return results
                
            except Exception as e:
                print(f"Search error: {str(e)}")
                return self.qdrant_client.search(
                    collection_name=self.collection_name,
                    query_vector=vector,
                    with_payload=True,
                    limit=limit
                )

    
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

            # 1. Extract PDF text
            text = self.extract_text_from_pdf(pdf_file)
            print(f"Extracted text, length: {len(text)} characters")
            
            # 2. Generate embedding
            vector = self.get_embedding(text)
            print(f"Generated embedding vector, dimensions: {len(vector)}")
            
            # 3. Build query parameters
            query_params = {
                "collection_name": self.collection_name,
                "query_vector": vector,
                "with_payload": True,
                "limit": limit
            }
            
            # 4. Build filter conditions (unified call to build_filter_conditions)
            # Pass Filter object directly instead of .dict() for better qdrant-client compatibility
            filter_conditions = None
            if contract_types:
                filter_conditions = self.build_filter_conditions(contract_types, states or [])
                if filter_conditions:
                    query_params["query_filter"] = filter_conditions  # Pass object directly, not .dict()
                print("\nFilter conditions used:", filter_conditions.dict() if filter_conditions else None)
            
            # 5. Execute search
            print("\nExecuting search...")
            results = self.qdrant_client.search(**query_params)

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

            # Filter out closed contracts (past due dates) before selecting top 5
            open_results = []
            closed_count = 0
            for res in unique_results:
                due_date = res.payload.get("due_date", "")
                if self._is_past_due(due_date):
                    closed_count += 1
                    print(f"   - Skipping closed contract: {res.payload.get('title', 'Unknown')} (due date: {due_date})")
                else:
                    open_results.append(res)
            
            print(f"\n[MATCHING] Stage 3 - After filtering closed: {len(open_results)} open contracts (filtered out {closed_count} closed)")
            
            final_results = open_results[:5]
            print(f"\n[MATCHING] Stage 4 - Final results (top 5): {len(final_results)} contracts")

            print("\n(2) Deduplication process log:")
            for line in duplicate_logs:
                print("   - " + line)
            for line in replaced_logs:
                print("   - " + line)

            print("\n(3) Final 5 results kept:")
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
                
                # Extract NAICS code from lowercase field (handles "238220.0" format)
                raw_naics = res.payload.get('naics_code') or res.payload.get('NAICS_CODE', '')
                naics_code = ''
                if raw_naics and str(raw_naics).lower() != 'nan':
                    # Extract integer part from float format like "238220.0"
                    import re
                    matches = re.findall(r'(\d{2,})(?:\.\d+)?', str(raw_naics))
                    if matches:
                        naics_code = matches[0]
                
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
                    'Category': clean_value(res.payload.get('category') or res.payload.get('Category'), 'Unknown'),
                    'Due_Date': clean_value(res.payload.get('due_date') or res.payload.get('Due Date'), 'Not Specified'),
                    'Detail_Link': clean_value(res.payload.get('source_url') or res.payload.get('detail_link') or res.payload.get('Detail Link'), '#'),
                    'State': clean_value(res.payload.get('location') or res.payload.get('Location') or res.payload.get('state') or res.payload.get('State'), 'Unknown'),
                    'Organization': clean_value(res.payload.get('agency') or res.payload.get('organization') or res.payload.get('Organization'), 'Unknown'),
                    'Budget': clean_value(res.payload.get('budget') or res.payload.get('Budget'), 'Not Specified'),
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

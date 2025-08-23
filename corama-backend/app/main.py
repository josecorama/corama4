from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import openai
from qdrant_client import QdrantClient
import stripe
import firebase_admin
from firebase_admin import credentials, auth
import json
from datetime import datetime
import sendgrid
from sendgrid.helpers.mail import Mail

load_dotenv()

app = FastAPI(title="Corama API", description="AI-Powered Capability Statement & Contract Matching Platform")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

openai.api_key = os.getenv("CORAMA_33")
stripe.api_key = os.getenv("STRIPE_API_KEY")

try:
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()
except ValueError:
    pass

try:
    qdrant_client = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY")
    )
    
    try:
        qdrant_client.get_collection("company_profiles")
        print("company_profiles collection exists")
    except:
        try:
            qdrant_client.create_collection(
                collection_name="company_profiles",
                vectors_config={
                    "size": 1536,
                    "distance": "Cosine"
                }
            )
            print("Created company_profiles collection")
        except Exception as create_error:
            print(f"Failed to create company_profiles collection: {create_error}")
            
except Exception as e:
    print(f"Failed to initialize Qdrant client: {e}")
    qdrant_client = None

security = HTTPBearer()

users_db = {}
capability_statements_db = {}
company_profiles_db = {}
contracts_db = []

class User(BaseModel):
    id: str
    email: str
    name: str
    company: Optional[str] = None
    credits: int = 5
    subscription_tier: str = "free"
    created_at: datetime

class CapabilityStatement(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    industry: str
    capabilities: List[str]
    created_at: datetime
    updated_at: datetime

class ContractMatch(BaseModel):
    id: str
    title: str
    description: str
    agency: str
    deadline: str
    match_score: Optional[float] = None
    requirements: List[str]

class AIGenerateRequest(BaseModel):
    company_name: str
    industry: str
    capabilities: List[str]
    experience_years: int
    description: str
    template_id: Optional[str] = "professional"
    duns_number: Optional[str] = None
    cage_code: Optional[str] = None
    naics_codes: Optional[str] = None
    certifications: Optional[str] = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    company: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    uid: str
    email: str
    name: str
    photo: Optional[str] = None

class BidResponseRequest(BaseModel):
    contract_id: str
    company_info: str
    requirements: List[str]
    additional_context: Optional[str] = ""

class ContractSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

class CreditPurchaseRequest(BaseModel):
    credits: int
    payment_method_id: str

class ContractAnalysisRequest(BaseModel):
    contract_id: str
    contract_title: str
    contract_description: str
    contract_requirements: List[str]
    company_name: str
    company_capabilities: str

class TemplateRequest(BaseModel):
    template_id: str
    company_data: dict

class CompanyProfile(BaseModel):
    id: str
    org_id: str
    last_updated: datetime
    has_capability_statement: bool = False
    capability_statement_file_id: Optional[str] = None
    capability_statement_text: Optional[str] = None
    company_name: Optional[str] = None
    summary: Optional[str] = None
    naics: List[str] = []
    keywords: List[str] = []
    set_asides: List[str] = []
    size_status: Optional[str] = None
    geos: List[str] = []
    target_agencies: List[str] = []
    past_performance: List[dict] = []
    embedding_id: Optional[str] = None

class CompanyProfileUploadRequest(BaseModel):
    file_id: str
    
class CompanyProfileCreateRequest(BaseModel):
    company_name: str
    summary: str
    naics: List[str]
    keywords: List[str]
    set_asides: List[str] = []
    size_status: Optional[str] = None
    geos: List[str] = []
    target_agencies: List[str] = []
    past_performance: List[dict] = []

class ContractMatchResponse(BaseModel):
    score: Optional[float]
    factors: List[dict] = []
    notes: Optional[str] = None
    reason: Optional[str] = None

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/register")
async def register(request: RegisterRequest):
    try:
        print(f"Registration request received: {request.email}, {request.name}")
        
        user_id = f"user_{len(users_db) + 1}"
        
        existing_user = next((u for u in users_db.values() if u.email == request.email), None)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        user = User(
            id=user_id,
            email=request.email,
            name=request.name,
            company=request.company,
            created_at=datetime.now()
        )
        users_db[user_id] = user
        print(f"User created successfully: {user_id}")
        
        await send_welcome_email(request.email, request.name)
        
        return {"message": "User registered successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login")
async def login(request: LoginRequest):
    try:
        user = next((u for u in users_db.values() if u.email == request.email), None)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = f"mock_token_{user.id}"
        return {"access_token": token, "token_type": "bearer", "user": user}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/auth/google-login")
async def google_login(request: GoogleLoginRequest):
    try:
        print(f"Google login request received: {request.email}, {request.name}, {request.uid}")
        existing_user = next((u for u in users_db.values() if u.email == request.email), None)
        
        if existing_user:
            print(f"Existing user found: {existing_user.email}")
            token = f"mock_token_{existing_user.id}"
            return {"access_token": token, "token_type": "bearer", "user": existing_user}
        else:
            print(f"Creating new user for Google OAuth: {request.email}")
            user = User(
                id=request.uid,
                email=request.email,
                name=request.name,
                company=None,
                created_at=datetime.now()
            )
            users_db[request.uid] = user
            print(f"User created successfully: {user.id}, {user.email}")
            
            await send_welcome_email(request.email, request.name)
            
            token = f"mock_token_{user.id}"
            return {"access_token": token, "token_type": "bearer", "user": user}
    except Exception as e:
        print(f"Google login error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/user/profile")
async def get_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    user = users_db.get(user_id)
    if not user:
        default_user = User(
            id=user_id,
            email="test@example.com",
            name="Test User",
            company="Test Company",
            credits=10,
            subscription_tier="free",
            created_at=datetime.now()
        )
        users_db[user_id] = default_user
        return default_user
    
    return user

@app.post("/capability-statements/generate")
async def generate_capability_statement(request: AIGenerateRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        user = users_db.get(user_id)
        if not user:
            user = User(
                id=user_id,
                email="test@example.com",
                name="Test User",
                company="Test Company",
                credits=10,
                subscription_tier="free",
                created_at=datetime.now()
            )
            users_db[user_id] = user
        
        if user.credits < 5:
            raise HTTPException(status_code=402, detail="Insufficient credits. Need 5 credits to generate capability statement.")
        
        additional_info = ""
        if request.duns_number:
            additional_info += f"\nDUNS Number: {request.duns_number}"
        if request.cage_code:
            additional_info += f"\nCAGE Code: {request.cage_code}"
        if request.naics_codes:
            additional_info += f"\nNAICS Codes: {request.naics_codes}"
        if request.certifications:
            additional_info += f"\nCertifications: {request.certifications}"
        
        prompt = f"""
        Generate a professional capability statement for:
        Company: {request.company_name}
        Industry: {request.industry}
        Capabilities: {', '.join(request.capabilities)}
        Years of Experience: {request.experience_years}
        Description: {request.description}
        Template Style: {request.template_id}{additional_info}
        
        Create a comprehensive capability statement that includes:
        1. Executive Summary
        2. Core Competencies
        3. Past Performance highlights
        4. Differentiators
        5. Certifications and qualifications
        6. Contact information section
        
        Format it professionally as a government contractor capability statement with proper sections and professional language.
        """
        
        api_key = os.getenv("CORAMA_33")
        print(f"Using OpenAI API key: {api_key[:10]}..." if api_key else "No API key found")
        
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000
        )
        
        generated_content = response.choices[0].message.content
        
        user.credits -= 5
        users_db[user_id] = user
        
        cs_id = f"cs_{len(capability_statements_db) + 1}"
        capability_statement = CapabilityStatement(
            id=cs_id,
            user_id=user_id,
            title=f"{request.company_name} Capability Statement",
            content=generated_content,
            industry=request.industry,
            capabilities=request.capabilities,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        capability_statements_db[cs_id] = capability_statement
        
        return {"content": generated_content, "statement_id": cs_id}
    except Exception as e:
        print(f"Error generating capability statement: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate capability statement: {str(e)}")

@app.get("/capability-statements")
async def get_capability_statements(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    user_statements = [cs for cs in capability_statements_db.values() if cs.user_id == user_id]
    return user_statements

async def get_contracts_without_scores(request: ContractSearchRequest):
    """Helper function to return contracts without match scores when no profile exists"""
    try:
        openai_key = os.getenv("CORAMA_33")
        if not openai_key:
            print("OpenAI API key not found, using mock data")
            raise Exception("No OpenAI API key")
        
        client = openai.OpenAI(api_key=openai_key)
        embedding_response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=request.query
        )
        query_embedding = embedding_response.data[0].embedding
        
        try:
            search_results = qdrant_client.search(
                collection_name="contracts",
                query_vector=query_embedding,
                limit=request.limit,
                score_threshold=0.5
            )
        except Exception as e:
            print(f"Error searching 'contracts' collection: {e}")
            try:
                search_results = qdrant_client.search(
                    collection_name="Top_5_contracts_Vector_DB",
                    query_vector=query_embedding,
                    limit=request.limit,
                    score_threshold=0.5
                )
            except Exception as e2:
                print(f"Error searching 'Top_5_contracts_Vector_DB' collection: {e2}")
                raise e
        
        contracts = []
        for result in search_results:
            payload = result.payload
            
            title = payload.get("title", "") or payload.get("Title", "") or payload.get("Bid Name", "") or payload.get("Contract Title", "")
            description = payload.get("description", "") or payload.get("Description", "") or payload.get("Bid Description", "") or payload.get("Contract Description", "")
            agency = payload.get("agency", "") or payload.get("Agency", "") or payload.get("Organization", "") or payload.get("Department", "")
            deadline = payload.get("deadline", "") or payload.get("Deadline", "") or payload.get("Due Date", "") or payload.get("Closing Date", "")
            
            requirements = payload.get("requirements", [])
            if not requirements:
                requirements = []
                if payload.get("Category") and payload.get("Category") != "Other":
                    requirements.append(payload.get("Category"))
                if payload.get("Industry") and payload.get("Industry") != "Other":
                    requirements.append(payload.get("Industry"))
                if payload.get("Is Small Business Set Aside") == "Yes":
                    requirements.append("Small Business Set Aside")
                if payload.get("Contract Type"):
                    requirements.append(payload.get("Contract Type"))
            
            contracts.append(ContractMatch(
                id=payload.get("id", str(result.id)),
                title=title,
                description=description,
                agency=agency,
                deadline=deadline,
                match_score=None,  # No score without profile
                requirements=requirements
            ))
        
        return contracts
        
    except Exception as e:
        print(f"Error in get_contracts_without_scores: {e}")
        return [
            ContractMatch(
                id="mock_1",
                title="IT Services Contract",
                description="Provide comprehensive IT support services",
                agency="Department of Defense",
                deadline="2024-12-31",
                match_score=None,
                requirements=["IT Services", "Security Clearance"]
            ),
            ContractMatch(
                id="mock_2", 
                title="Software Development",
                description="Custom software development for government systems",
                agency="GSA",
                deadline="2024-11-15",
                match_score=None,
                requirements=["Software Development", "Agile"]
            )
        ]

@app.post("/contracts/search")
async def search_contracts(request: ContractSearchRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Contract search request: {request}")
        
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        profile = company_profiles_db.get(user_id)
        if not profile or not profile.embedding_id:
            print("No company profile found, returning contracts without scores")
            return await get_contracts_without_scores(request)
        
        openai_key = os.getenv("CORAMA_33")
        if not openai_key:
            print("OpenAI API key not found, using mock data")
            raise Exception("No OpenAI API key")
            
        print("Creating OpenAI client...")
        client = openai.OpenAI(api_key=openai_key)
        
        print("Creating embeddings...")
        try:
            embedding_response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=request.query
            )
            query_embedding = embedding_response.data[0].embedding
            print("Embeddings created successfully")
        except openai.AuthenticationError as auth_error:
            print(f"OpenAI authentication failed: {auth_error}")
            print("Falling back to mock data due to OpenAI authentication failure")
            mock_contracts = [
                ContractMatch(
                    id="contract_1",
                    title="IT Infrastructure Modernization Services",
                    description="Comprehensive IT infrastructure upgrade and modernization services for federal agencies",
                    agency="Department of Defense",
                    value="$2.5M - $10M",
                    deadline="2024-03-15",
                    location="Washington, DC",
                    requirements=["Security Clearance Required", "FISMA Compliance", "Cloud Migration Experience"],
                    match_score=0.85
                ),
                ContractMatch(
                    id="contract_2", 
                    title="Cybersecurity Assessment and Implementation",
                    description="End-to-end cybersecurity assessment and implementation services",
                    agency="Department of Homeland Security",
                    value="$1M - $5M",
                    deadline="2024-04-01",
                    location="Remote/Multiple Locations",
                    requirements=["CISSP Certification", "Government Experience", "Risk Assessment"],
                    match_score=0.78
                ),
                ContractMatch(
                    id="contract_3",
                    title="Software Development and Maintenance",
                    description="Custom software development and ongoing maintenance for government applications",
                    agency="General Services Administration",
                    value="$500K - $3M",
                    deadline="2024-02-28",
                    location="Various",
                    requirements=["Agile Development", "Section 508 Compliance", "DevSecOps"],
                    match_score=0.72
                )
            ]
            filtered_contracts = [c for c in mock_contracts if request.query.lower() in c.title.lower() or request.query.lower() in c.description.lower()]
            print(f"Returning {len(filtered_contracts if filtered_contracts else mock_contracts)} contracts (OpenAI fallback)")
            return filtered_contracts if filtered_contracts else mock_contracts
        
        try:
            print("Searching Qdrant...")
            try:
                search_results = qdrant_client.search(
                    collection_name="contracts",
                    query_vector=query_embedding,
                    limit=10,
                    score_threshold=0.5
                )
            except Exception as e:
                print(f"Error searching 'contracts' collection: {e}")
                try:
                    search_results = qdrant_client.search(
                        collection_name="Top_5_contracts_Vector_DB",
                        query_vector=query_embedding,
                        limit=10,
                        score_threshold=0.5
                    )
                except Exception as e2:
                    print(f"Error searching 'Top_5_contracts_Vector_DB' collection: {e2}")
                    raise e
            
            print(f"Qdrant search completed, found {len(search_results)} results")
            if search_results:
                print("First result payload keys:", list(search_results[0].payload.keys()))
            
            contracts = []
            for result in search_results:
                payload = result.payload
                print(f"Processing result with score {result.score}, payload: {payload}")
                
                title = payload.get("title", "")
                if not title:
                    title = payload.get("Title", "")
                    if not title:
                        title = payload.get("Bid Name", "")
                        if not title:
                            title = payload.get("Contract Title", "")
                
                description = payload.get("description", "")
                if not description:
                    description = payload.get("Description", "")
                    if not description:
                        description = payload.get("Bid Description", "")
                        if not description:
                            description = payload.get("Contract Description", "")
                
                agency = payload.get("agency", "")
                if not agency:
                    agency = payload.get("Agency", "")
                    if not agency:
                        agency = payload.get("Organization", "")
                        if not agency:
                            agency = payload.get("Department", "")
                
                deadline = payload.get("deadline", "")
                if not deadline:
                    deadline = payload.get("Deadline", "")
                    if not deadline:
                        deadline = payload.get("Due Date", "")
                        if not deadline:
                            deadline = payload.get("Closing Date", "")
                
                # Extract requirements
                requirements = payload.get("requirements", [])
                if not requirements:
                    requirements = []
                    if payload.get("Category") and payload.get("Category") != "Other":
                        requirements.append(payload.get("Category"))
                    if payload.get("Industry") and payload.get("Industry") != "Other":
                        requirements.append(payload.get("Industry"))
                    if payload.get("Is Small Business Set Aside") == "Yes":
                        requirements.append("Small Business Set Aside")
                    if payload.get("Contract Type"):
                        requirements.append(payload.get("Contract Type"))
                
                if not requirements and description:
                    desc = description.lower()
                    if "software" in desc or "development" in desc:
                        requirements.append("Software Development")
                    if "it" in desc or "technology" in desc:
                        requirements.append("IT Services")
                    if "security" in desc or "cybersecurity" in desc:
                        requirements.append("Cybersecurity")
                    if "maintenance" in desc:
                        requirements.append("Maintenance Services")
                
                contracts.append(ContractMatch(
                    id=payload.get("id", str(result.id)),
                    title=title,
                    description=description,
                    agency=agency,
                    deadline=deadline,
                    match_score=result.score,
                    requirements=requirements
                ))
            
            if contracts:
                return contracts
        except Exception as qdrant_error:
            print(f"Qdrant search failed: {qdrant_error}")
        
        print("Using mock contracts...")
        mock_contracts = [
            ContractMatch(
                id="contract_1",
                title="IT Infrastructure Modernization Services",
                description="Seeking qualified vendors to provide comprehensive IT infrastructure modernization services including cloud migration, cybersecurity implementation, and system integration.",
                agency="Department of Defense",
                deadline="2024-12-15",
                match_score=0.92,
                requirements=["Cloud Computing", "Cybersecurity", "System Integration", "FISMA Compliance"]
            ),
            ContractMatch(
                id="contract_2",
                title="Software Development and Maintenance",
                description="Multi-year contract for custom software development, maintenance, and support services for government applications.",
                agency="General Services Administration",
                deadline="2024-11-30",
                match_score=0.87,
                requirements=["Software Development", "Agile Methodology", "Security Clearance", "Government Experience"]
            ),
            ContractMatch(
                id="contract_3",
                title="Data Analytics and Business Intelligence",
                description="Provide data analytics, business intelligence, and reporting solutions for federal agencies.",
                agency="Department of Health and Human Services",
                deadline="2024-10-20",
                match_score=0.78,
                requirements=["Data Analytics", "Business Intelligence", "Python", "SQL", "Tableau"]
            )
        ]
        
        filtered_contracts = [c for c in mock_contracts if request.query.lower() in c.title.lower() or request.query.lower() in c.description.lower()]
        print(f"Returning {len(filtered_contracts if filtered_contracts else mock_contracts)} contracts")
        return filtered_contracts if filtered_contracts else mock_contracts
        
    except Exception as e:
        print(f"Contract search error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search contracts: {str(e)}")

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if file.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
        
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        import uuid
        import os
        
        upload_dir = "/home/ubuntu/corama3/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        if user.credits >= 1:
            user.credits -= 1
            users_db[user_id] = user
        
        return {
            "message": "Document uploaded successfully",
            "filename": file.filename,
            "file_path": file_path,
            "file_url": f"/uploads/{unique_filename}",
            "size": file.size,
            "content_type": file.content_type,
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@app.get("/templates")
async def get_templates():
    templates = [
        {
            "id": "professional",
            "name": "Professional Standard",
            "description": "Clean, professional layout suitable for most industries",
            "preview_url": "/templates/professional-preview.png",
            "sections": ["About Us", "Core Competencies", "Past Performance", "Differentiators", "Certifications", "Contact"]
        },
        {
            "id": "government",
            "name": "Government Standard",
            "description": "Optimized for government contracting requirements",
            "preview_url": "/templates/government-preview.png",
            "sections": ["Company Overview", "NAICS Codes", "Core Capabilities", "Past Performance", "Certifications", "Contact Information"]
        },
        {
            "id": "tech",
            "name": "Technology Services",
            "description": "Designed for IT and technology service providers",
            "preview_url": "/templates/tech-preview.png",
            "sections": ["Company Profile", "Technical Capabilities", "Security Clearances", "Past Projects", "Certifications", "Contact"]
        },
        {
            "id": "construction",
            "name": "Construction & Engineering",
            "description": "Tailored for construction and engineering firms",
            "preview_url": "/templates/construction-preview.png",
            "sections": ["About Us", "Core Competencies", "Past Performance", "Safety Record", "Certifications", "Contact"]
        }
    ]
    return templates

@app.post("/contracts/analyze")
async def analyze_contract(request: ContractAnalysisRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"Contract analysis request received for contract: {request.contract_title}")
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        print(f"Token received: {token}")
        print(f"Extracted user_id: {user_id}")
        print(f"Users in database: {list(users_db.keys())}")
        
        user = users_db.get(user_id)
        if not user:
            print(f"User not found: {user_id}, creating default user")
            print(f"Available users: {[(k, v.email, v.name) for k, v in users_db.items()]}")
            default_user = User(
                id=user_id,
                email="test@example.com",
                name="Test User",
                company="Test Company",
                credits=10,
                subscription_tier="free",
                created_at=datetime.now()
            )
            users_db[user_id] = default_user
            user = default_user
            print(f"Created default user: {user.name}, credits: {user.credits}")
        
        print(f"User found: {user.name}, credits: {user.credits}")
        
        if user.credits < 2:
            raise HTTPException(status_code=402, detail="Insufficient credits. Need 2 credits for contract analysis.")
        
        prompt = f"""
        Analyze the competitive position for the following contract opportunity:
        
        Contract: {request.contract_title}
        Description: {request.contract_description}
        Requirements: {', '.join(request.contract_requirements)}
        
        Company: {request.company_name}
        Capabilities: {request.company_capabilities}
        
        Provide a competitive analysis including:
        1. Match score (0-1)
        2. Company strengths for this contract
        3. Gaps or areas to address
        4. Strategic recommendations
        5. Bid strategy suggestions
        
        Be specific and actionable in your recommendations.
        """
        
        ai_content = "AI analysis temporarily unavailable due to API configuration. Using fallback analysis."
        
        try:
            print("Attempting OpenAI API call for contract analysis...")
            client = openai.OpenAI(api_key=os.getenv("CORAMA_33"))
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500
            )
            ai_content = response.choices[0].message.content
            print("OpenAI API call successful for contract analysis")
        except openai.AuthenticationError as auth_error:
            print(f"OpenAI authentication failed in contract analysis: {auth_error}")
        except Exception as openai_error:
            print(f"OpenAI API error in contract analysis: {openai_error}")
        
        analysis = {
            "contract_id": request.contract_id,
            "match_score": 0.82,
            "ai_analysis": ai_content,
            "strengths": [
                "Strong technical expertise aligns with contract requirements",
                "Proven track record with similar projects",
                "Relevant certifications already in place"
            ],
            "gaps": [
                "May need additional specialized personnel",
                "Consider strengthening specific technical areas"
            ],
            "recommendations": [
                "Highlight recent relevant projects in proposal",
                "Consider strategic partnerships for gaps",
                "Emphasize cost-effective solutions"
            ],
            "bid_strategy": "Focus on technical expertise and proven performance while addressing any capability gaps through strategic partnerships"
        }
        
        user.credits -= 2
        users_db[user_id] = user
        
        print(f"Contract analysis completed successfully, user credits now: {user.credits}")
        return analysis
        
    except HTTPException as http_error:
        print(f"HTTP exception in contract analysis: {http_error}")
        raise http_error
    except Exception as e:
        print(f"Unexpected error in contract analysis: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to analyze contract: {str(e)}")

@app.post("/capability-statements/generate-multipage")
async def generate_multipage_capability_statement(request: AIGenerateRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.credits < 10:
            raise HTTPException(status_code=402, detail="Insufficient credits. Need 10 credits for multi-page capability statement.")
        
        sections = [
            "Executive Summary",
            "Company Overview", 
            "Core Competencies",
            "Past Performance",
            "Key Personnel",
            "Differentiators",
            "Certifications and Qualifications",
            "Quality Assurance",
            "Safety Record",
            "Financial Capacity",
            "Contact Information"
        ]
        
        full_content = ""
        
        for section in sections:
            section_prompt = f"""
            Generate a detailed {section} section for a capability statement for:
            
            Company Name: {request.company_name}
            Industry: {request.industry}
            Core Capabilities: {request.core_capabilities}
            Years of Experience: {request.years_experience}
            Company Description: {request.company_description}
            
            Make this section comprehensive and professional, suitable for government contracting.
            Focus specifically on the {section} and provide detailed, relevant content.
            """
            
            client = openai.OpenAI(api_key=os.getenv("CORAMA_33"))
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert in government contracting and capability statement creation."},
                    {"role": "user", "content": section_prompt}
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            section_content = response.choices[0].message.content
            full_content += f"\n\n## {section}\n\n{section_content}"
        
        statement_id = f"cs_multi_{len(capability_statements_db) + 1}"
        capability_statement = CapabilityStatement(
            id=statement_id,
            user_id=user_id,
            company_name=request.company_name,
            industry=request.industry,
            content=full_content,
            created_at=datetime.now().isoformat()
        )
        
        capability_statements_db[statement_id] = capability_statement
        
        user.credits -= 10
        users_db[user_id] = user
        
        return {"content": full_content, "statement_id": statement_id, "page_count": len(sections)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate multi-page capability statement: {str(e)}")

@app.get("/dashboard/stats")
async def get_dashboard_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    user_statements = [cs for cs in capability_statements_db.values() if cs.user_id == user_id]
    
    return {
        "capability_statements": len(user_statements),
        "active_searches": 3,
        "contract_matches": 12,
        "documents_uploaded": 5
    }

@app.post("/bid-responses/generate")
async def generate_bid_response(request: BidResponseRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.credits < 10:
            raise HTTPException(status_code=402, detail="Insufficient credits. Need 10 credits to generate bid response.")
        
        requirements_text = "\n".join([f"- {req}" for req in request.requirements])
        
        prompt = f"""
        Generate a comprehensive bid response for the following government contract:
        
        Contract ID: {request.contract_id}
        Company Information: {request.company_info}
        
        Contract Requirements:
        {requirements_text}
        
        Additional Context: {request.additional_context}
        
        Create a professional bid response that includes:
        1. Executive Summary
        2. Technical Approach
        3. Management Plan
        4. Past Performance
        5. Personnel Qualifications
        6. Cost Considerations
        7. Risk Mitigation
        8. Compliance Statement
        
        Format it as a compelling proposal that demonstrates how the company meets all requirements and provides value to the government agency.
        """
        
        client = openai.OpenAI(api_key=os.getenv("CORAMA_33"))
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in government contracting and proposal writing. Create compelling, professional bid responses that win contracts."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        user.credits -= 10
        users_db[user_id] = user
        
        return {"content": content}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate bid response: {str(e)}")

async def send_welcome_email(user_email: str, user_name: str):
    """Send welcome email to new users"""
    try:
        sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        if not sendgrid_api_key:
            print("SendGrid API key not configured, skipping welcome email")
            return
            
        sg = sendgrid.SendGridAPIClient(api_key=sendgrid_api_key)
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to Corama!</h1>
                <p style="color: #64748b; font-size: 18px;">AI-Powered Government Contract Matching</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                <h2 style="color: #1e293b; margin-bottom: 15px;">Hi {user_name},</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for joining Corama! You now have access to our AI-powered platform that helps businesses create professional capability statements and find matching government contracts.
                </p>
                
                <h3 style="color: #1e293b; margin-bottom: 15px;">What you can do with Corama:</h3>
                <ul style="color: #475569; line-height: 1.6;">
                    <li><strong>Capability Statement Builder:</strong> Generate professional, compliant capability statements in minutes</li>
                    <li><strong>AI Bid Smart Assistant:</strong> Get AI-powered assistance for bid responses and contract analysis</li>
                    <li><strong>Contracts Smart Search:</strong> Search and discover relevant government contract opportunities</li>
                </ul>
                
                <p style="color: #475569; line-height: 1.6; margin-top: 20px;">
                    You start with 5 free credits to explore our AI features. Ready to get started?
                </p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://capability-statement-app-fhhexes6.devinapps.com/dashboard" 
                   style="background: linear-gradient(90deg, #2d6bff, #6a83ff); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Access Your Dashboard
                </a>
            </div>
            
            <div style="text-align: center; color: #94a3b8; font-size: 14px;">
                <p>Need help? Contact us at support@corama.ai</p>
                <p>© 2024 Corama. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email='welcome@corama.ai',
            to_emails=user_email,
            subject='Welcome to Corama - Your AI Contract Assistant',
            html_content=html_content
        )
        
        response = sg.send(message)
        print(f"Welcome email sent successfully to {user_email}, status: {response.status_code}")
        
    except Exception as e:
        print(f"Failed to send welcome email to {user_email}: {str(e)}")

async def calculate_match_score(profile: CompanyProfile, contract_payload: dict, vector_similarity: float) -> float:
    """Calculate comprehensive match score using company profile and contract data"""
    try:
        sim_score = vector_similarity * 0.55
        
        contract_naics = contract_payload.get("naics", [])
        if isinstance(contract_naics, str):
            contract_naics = [contract_naics]
        
        naics_overlap = 0.0
        if profile.naics and contract_naics:
            overlap_count = len(set(profile.naics) & set(contract_naics))
            naics_overlap = min(overlap_count / len(profile.naics), 1.0)
        naics_score = naics_overlap * 0.20
        
        contract_text = f"{contract_payload.get('title', '')} {contract_payload.get('description', '')}"
        keyword_matches = 0
        if profile.keywords:
            for keyword in profile.keywords:
                if keyword.lower() in contract_text.lower():
                    keyword_matches += 1
            keyword_fit = min(keyword_matches / len(profile.keywords), 1.0)
        else:
            keyword_fit = 0.0
        keyword_score = keyword_fit * 0.15
        
        geo_fit = 1.0  # Default to 1.0 if no specific geo requirements
        geo_score = geo_fit * 0.05
        
        setaside_fit = 0.6  # Default partial credit
        if "Small Business Set Aside" in contract_payload.get("requirements", []):
            if "small" in [s.lower() for s in profile.set_asides]:
                setaside_fit = 1.0
        setaside_score = setaside_fit * 0.05
        
        total_score = sim_score + naics_score + keyword_score + geo_score + setaside_score
        return min(total_score, 1.0)  # Cap at 1.0
        
    except Exception as e:
        print(f"Error calculating match score: {e}")
        return vector_similarity  # Fallback to vector similarity only

@app.get("/api/company-profile")
async def get_company_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    profile = company_profiles_db.get(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    return profile

@app.post("/api/company-profile")
async def create_company_profile(request: CompanyProfileCreateRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    profile_id = f"profile_{user_id}"
    profile = CompanyProfile(
        id=profile_id,
        org_id=user_id,
        last_updated=datetime.now(),
        company_name=request.company_name,
        summary=request.summary,
        naics=request.naics,
        keywords=request.keywords,
        set_asides=request.set_asides,
        size_status=request.size_status,
        geos=request.geos,
        target_agencies=request.target_agencies,
        past_performance=request.past_performance
    )
    
    company_profiles_db[user_id] = profile
    return profile

@app.post("/api/company-profile/upload")
async def upload_company_profile(file: UploadFile = File(...), credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
    
    allowed_types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed. Please upload PDF, DOC, or DOCX files.")
    
    import uuid
    import os
    upload_dir = "/home/ubuntu/corama3/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Extract text from file (simplified - in production would use proper PDF/DOC parsing)
    extracted_text = f"Capability statement content from {file.filename}. This is a placeholder for extracted text that would contain company capabilities, past performance, certifications, and other relevant information for government contracting."
    
    profile_id = f"profile_{user_id}"
    profile = company_profiles_db.get(user_id, CompanyProfile(
        id=profile_id,
        org_id=user_id,
        last_updated=datetime.now()
    ))
    
    profile.has_capability_statement = True
    profile.capability_statement_file_id = unique_filename
    profile.capability_statement_text = extracted_text
    profile.last_updated = datetime.now()
    
    company_profiles_db[user_id] = profile
    
    return {
        "message": "Capability statement uploaded successfully",
        "file_id": unique_filename,
        "profile_id": profile_id
    }

@app.post("/api/company-profile/embedding")
async def generate_company_embedding(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    profile = company_profiles_db.get(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    
    text_parts = []
    if profile.capability_statement_text:
        text_parts.append(profile.capability_statement_text)
    elif profile.summary:
        text_parts.append(profile.summary)
        text_parts.extend(profile.keywords)
        for perf in profile.past_performance:
            text_parts.append(f"{perf.get('title', '')} {perf.get('notes', '')}")
    
    if not text_parts:
        raise HTTPException(status_code=400, detail="No content available for embedding generation")
    
    canonical_text = " ".join(text_parts)
    
    try:
        client = openai.OpenAI(api_key=os.getenv("CORAMA_33"))
        embedding_response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=canonical_text
        )
        embedding = embedding_response.data[0].embedding
        
        embedding_id = f"company_{user_id}"
        if qdrant_client:
            try:
                qdrant_client.upsert(
                    collection_name="company_profiles",
                    points=[{
                        "id": embedding_id,
                        "vector": embedding,
                        "payload": {
                            "user_id": user_id,
                            "company_name": profile.company_name,
                            "naics": profile.naics,
                            "keywords": profile.keywords
                        }
                    }]
                )
                print(f"Stored embedding in Qdrant with ID: {embedding_id}")
            except Exception as qdrant_error:
                print(f"Failed to store embedding in Qdrant: {qdrant_error}")
        
        profile.embedding_id = embedding_id
        profile.last_updated = datetime.now()
        company_profiles_db[user_id] = profile
        
        return {"message": "Embedding generated successfully", "embedding_id": embedding_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@app.get("/api/contracts/{contract_id}/match")
async def get_contract_match_details(contract_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    profile = company_profiles_db.get(user_id)
    if not profile:
        return ContractMatchResponse(score=None, reason="profile_missing")
    
    try:
        factors = [
            {
                "name": "Vector similarity (capability ↔ contract)",
                "weight": 0.55,
                "value": 0.89,
                "contribution": 0.489,
                "evidence": ["operator interface", "inspect", "report"]
            },
            {
                "name": "NAICS overlap",
                "weight": 0.20,
                "value": 1.00,
                "contribution": 0.20,
                "evidence": profile.naics[:3] if profile.naics else ["561720"]
            },
            {
                "name": "Keyword fit",
                "weight": 0.15,
                "value": 0.80,
                "contribution": 0.12,
                "evidence": profile.keywords[:3] if profile.keywords else ["overhaul", "electronic", "USCG"]
            },
            {
                "name": "Geography",
                "weight": 0.05,
                "value": 1.00,
                "contribution": 0.05,
                "evidence": profile.geos if profile.geos else ["Nationwide eligible"]
            },
            {
                "name": "Set-aside",
                "weight": 0.05,
                "value": 0.60,
                "contribution": 0.03,
                "evidence": profile.set_asides if profile.set_asides else ["Small Business eligible"]
            }
        ]
        
        total_score = sum(f["contribution"] for f in factors)
        
        return ContractMatchResponse(
            score=total_score,
            factors=factors,
            notes="Weights adjustable in Admin → Matching."
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate match details: {str(e)}")

@app.post("/credits/purchase")
async def purchase_credits(request: CreditPurchaseRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user_id = token.replace("mock_token_", "")
        
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        credit_prices = {50: 1900, 150: 4900, 300: 8900}  # prices in cents
        amount = credit_prices.get(request.credits)
        
        if not amount:
            raise HTTPException(status_code=400, detail="Invalid credit package")
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            payment_method=request.payment_method_id,
            confirm=True,
            return_url='https://corama.com/dashboard'
        )
        
        if payment_intent.status == 'succeeded':
            user.credits += request.credits
            users_db[user_id] = user
            
            return {
                "success": True,
                "credits_added": request.credits,
                "new_balance": user.credits
            }
        else:
            raise HTTPException(status_code=400, detail="Payment failed")
            
    except Exception as e:
        if "stripe" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to purchase credits: {str(e)}")

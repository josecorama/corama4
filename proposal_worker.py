#!/usr/bin/env python3
"""
Background Worker for Proposal Generation and Contract Analysis

This worker runs as a separate process from the Flask application.
It polls Firebase for queued jobs and processes them with controlled concurrency.

Supported job types:
1. Proposal Generation (proposal_jobs) - 8 parallel sections per job
2. Contract Analysis (contract_analysis_jobs) - PDF analysis with OpenAI

This architecture prevents Gunicorn worker crashes by:
1. Moving long-running GPT-4 calls out of HTTP request lifecycle
2. Storing job state in Firebase (survives worker restarts)
3. Limiting concurrent jobs to prevent memory exhaustion

Usage:
    python proposal_worker.py

The worker will run continuously, polling for new jobs every 5 seconds.
"""

import os
import sys
import json
import time
import uuid
import logging
import signal
import tempfile
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# PDF processing imports
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logging.warning("PyMuPDF not available - contract analysis will be limited")

# Load environment variables
base_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(base_dir, '.env')
load_dotenv(env_path, override=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, db as admin_database

# Initialize OpenAI
from openai import OpenAI

# Worker configuration
WORKER_ID = f"worker-{uuid.uuid4().hex[:8]}"
POLL_INTERVAL = 5  # seconds between polling for new jobs
LEASE_DURATION = 600  # 10 minutes lease duration
HEARTBEAT_INTERVAL = 30  # seconds between heartbeats
MAX_SECTIONS_PARALLEL = 8  # parallel sections per job (matches current behavior)

# Global flag for graceful shutdown
shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        database_url = 'https://corama-c911e-default-rtdb.firebaseio.com'
    
    # Normalize DATABASE_URL
    if database_url and not database_url.startswith('http'):
        database_url = f'https://{database_url}'
    if database_url and not database_url.endswith('.firebaseio.com'):
        if '.firebaseio.com' not in database_url:
            database_url = database_url.rstrip('/') + '.firebaseio.com'
    
    try:
        # Check if already initialized
        existing_app = firebase_admin.get_app()
        logger.info("Firebase Admin SDK already initialized")
        return admin_database
    except ValueError:
        pass
    
    firebase_creds_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    
    if firebase_creds_json:
        try:
            service_account_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(service_account_dict)
            storage_bucket = os.getenv('STORAGE_BUCKET', 'corama-c911e.appspot.com')
            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url,
                'storageBucket': storage_bucket
            })
            logger.info(f"Firebase Admin SDK initialized with database: {database_url}")
            return admin_database
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            raise
    else:
        service_account_path = os.path.join(base_dir, os.getenv('SERVICE_ACCOUNT_JSON', ''))
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            storage_bucket = os.getenv('STORAGE_BUCKET', 'corama-c911e.appspot.com')
            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url,
                'storageBucket': storage_bucket
            })
            logger.info(f"Firebase Admin SDK initialized from file with database: {database_url}")
            return admin_database
        else:
            raise RuntimeError("No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or SERVICE_ACCOUNT_JSON")


def initialize_openai():
    """Initialize OpenAI client"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")
    return OpenAI(api_key=api_key)


def claim_job(db, job_id: str) -> bool:
    """
    Attempt to claim a job using atomic transaction.
    Returns True if successfully claimed, False otherwise.
    """
    job_ref = db.reference(f'proposal_jobs/{job_id}')
    
    def claim_transaction(current_data):
        if current_data is None:
            return None  # Job doesn't exist
        
        # Check if job is available to claim
        if current_data.get('status') != 'queued':
            return None  # Already claimed or completed
        
        # Check if there's an existing lease that hasn't expired
        lease_expires = current_data.get('lease_expires_at', 0)
        if lease_expires > time.time():
            return None  # Another worker has a valid lease
        
        # Claim the job
        current_data['status'] = 'running'
        current_data['claimed_by'] = WORKER_ID
        current_data['lease_expires_at'] = time.time() + LEASE_DURATION
        current_data['started_at'] = time.time()
        current_data['last_heartbeat'] = time.time()
        
        return current_data
    
    try:
        result = job_ref.transaction(claim_transaction)
        if result and result.get('claimed_by') == WORKER_ID:
            logger.info(f"Successfully claimed job {job_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error claiming job {job_id}: {e}")
        return False


def update_heartbeat(db, job_id: str):
    """Update job heartbeat to maintain lease"""
    try:
        job_ref = db.reference(f'proposal_jobs/{job_id}')
        job_ref.update({
            'last_heartbeat': time.time(),
            'lease_expires_at': time.time() + LEASE_DURATION
        })
    except Exception as e:
        logger.warning(f"Failed to update heartbeat for job {job_id}: {e}")


def add_event(db, job_id: str, event_type: str, data: dict, event_seq: int):
    """Add an event to the job's event log in Firebase"""
    try:
        events_ref = db.reference(f'proposal_jobs/{job_id}/events')
        event_data = {
            'type': event_type,
            'data': data,
            'timestamp': time.time(),
            'seq': event_seq
        }
        # Use push to generate unique key, but also store seq for ordering
        events_ref.push(event_data)
        logger.debug(f"Added event {event_type} (seq={event_seq}) for job {job_id}")
    except Exception as e:
        logger.error(f"Failed to add event for job {job_id}: {e}")


def update_section(db, job_id: str, section_num: int, status: str, name: str, content: str = None):
    """Update a section's status and content in Firebase"""
    try:
        section_ref = db.reference(f'proposal_jobs/{job_id}/sections/{section_num}')
        update_data = {
            'status': status,
            'name': name,
            'updated_at': time.time()
        }
        if content is not None:
            update_data['content'] = content
        section_ref.update(update_data)
    except Exception as e:
        logger.error(f"Failed to update section {section_num} for job {job_id}: {e}")


def complete_job(db, job_id: str, full_proposal: str, sections: list):
    """Mark job as completed with final results"""
    try:
        job_ref = db.reference(f'proposal_jobs/{job_id}')
        job_ref.update({
            'status': 'completed',
            'full_proposal': full_proposal,
            'completed_at': time.time()
        })
        logger.info(f"Job {job_id} completed successfully")
    except Exception as e:
        logger.error(f"Failed to complete job {job_id}: {e}")


def fail_job(db, job_id: str, error: str):
    """Mark job as failed with error message"""
    try:
        job_ref = db.reference(f'proposal_jobs/{job_id}')
        job_ref.update({
            'status': 'error',
            'error': error,
            'failed_at': time.time()
        })
        logger.error(f"Job {job_id} failed: {error}")
    except Exception as e:
        logger.error(f"Failed to mark job {job_id} as failed: {e}")


def generate_section(openai_client, section_num: int, section_name: str, prompt: str, 
                     company_name: str, company_address: str, company_email: str,
                     capability_statement: str, all_annotations_text: str, 
                     team_summary: str, pricing_summary: str) -> str:
    """Generate a single proposal section using OpenAI GPT-4"""
    try:
        system_prompt = f"""You are an expert government contract proposal writer with 20+ years of experience winning federal, state, and local government contracts. Generate Section {section_num}: {section_name} for a comprehensive public procurement proposal.

CRITICAL REQUIREMENTS FOR SUBSTANTIVE CONTENT:
1. Write THOROUGH, DETAILED content that is ready for professional use
2. Each section should be comprehensive and substantive - aim for the word count specified in the prompt
3. Use specific, concrete language rather than generic statements
4. Include detailed explanations, methodologies, and approaches
5. Reference the specific contract requirements and tailor content accordingly
6. Write in formal government contracting language with professional tone

FORMATTING RULES:
- Output PLAIN TEXT ONLY - NO markdown symbols (**, ##, -, •)
- Use clear section headings in UPPERCASE
- Use numbered lists where appropriate (1., 2., 3.)
- Write in professional paragraph form with detailed explanations
- Include appropriate placeholders [IN BRACKETS] only where specific company data is truly missing
- Structure content with clear subheadings for easy navigation

COMPANY INFORMATION:
Company Name: {company_name}
Company Address: {company_address}
Company Email: {company_email}

CAPABILITY STATEMENT (Use this to inform technical capabilities and past performance):
{capability_statement[:4000] if capability_statement else 'Company capabilities to be detailed based on specific contract requirements.'}

CONTRACT REQUIREMENTS AND ANNOTATIONS (Reference these specifically in your response):
{all_annotations_text[:5000]}

TEAM MEMBERS (Include these in staffing and management sections):
{team_summary}

PRICING INFORMATION (Use for cost proposal section):
{pricing_summary}

Remember: Generate SUBSTANTIVE, READY-TO-USE content. The goal is a proposal that requires minimal editing before submission."""

        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=4000
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating section {section_num}: {e}")
        # Re-raise so the caller can emit section_error event
        raise


def get_section_prompts(company_name: str, company_address: str, team_summary: str, pricing_summary: str) -> list:
    """Return the 8 section prompts for proposal generation"""
    return [
        (1, "Cover Letter & Executive Summary", f"""Generate a comprehensive, ready-to-use Cover Letter and Executive Summary section. TARGET LENGTH: 1,200-1,500 words.

COVER PAGE INFORMATION:
Include a formal cover page with: Solicitation reference, Title of the opportunity, Contracting Agency, Company name ({company_name}), Submission date, and "DRAFT - FOR INTERNAL REVIEW ONLY" notice.

COVER LETTER/TRANSMITTAL LETTER (300-400 words):
Write a compelling, formal transmittal letter that:
1. Opens with a strong statement of interest and commitment to the solicitation
2. Introduces {company_name} with specific credentials and relevant experience
3. Highlights 2-3 key differentiators that make the company uniquely qualified
4. Expresses understanding of the agency's mission and how this contract supports it
5. Includes commitment to performance, schedule, and budget
6. Closes with contact information and signature block for "[Authorized Representative, Title]"

EXECUTIVE SUMMARY (800-1,100 words):
Write a compelling executive summary that demonstrates deep understanding of requirements, proposed solution overview, key differentiators, value proposition, and key personnel highlights."""),

        (2, "Administrative & Compliance Information", f"""Generate a thorough Administrative & Compliance Information section. TARGET LENGTH: 800-1,000 words.

Include:
1. OFFEROR IDENTIFICATION AND CONTACT INFORMATION
2. BUSINESS CLASSIFICATION AND STATUS
3. REGISTRATIONS AND CERTIFICATIONS
4. REPRESENTATIONS AND CERTIFICATIONS SUMMARY
5. INSURANCE AND BONDING

Company Name: {company_name}
Company Address: {company_address}"""),

        (3, "Technical Approach", f"""Generate a comprehensive, detailed Technical Approach section. TARGET LENGTH: 2,000-2,500 words. This is the most critical section.

Include:
1. UNDERSTANDING OF REQUIREMENTS (400-500 words)
2. TECHNICAL SOLUTION AND METHODOLOGY (600-800 words)
3. WORK PLAN AND IMPLEMENTATION APPROACH (500-600 words)
4. DELIVERABLES AND ACCEPTANCE CRITERIA (300-400 words)
5. COMPLIANCE MATRIX SUMMARY (200-300 words)"""),

        (4, "Management & Staffing Plan", f"""Generate a comprehensive Management & Staffing Plan section. TARGET LENGTH: 1,500-1,800 words.

Include:
1. PROJECT MANAGEMENT APPROACH (400-500 words)
2. ORGANIZATIONAL STRUCTURE (300-400 words)
3. KEY PERSONNEL (500-600 words)
{team_summary}
4. STAFFING PLAN AND RESOURCE ALLOCATION (300-400 words)"""),

        (5, "Corporate Experience & Past Performance", f"""Generate a comprehensive Corporate Experience & Past Performance section. TARGET LENGTH: 1,500-1,800 words.

Include:
1. CORPORATE OVERVIEW (300-400 words)
2. CORE COMPETENCIES (200-300 words)
3. PAST PERFORMANCE EXAMPLES (800-1,000 words) - 3-4 detailed references
4. RELEVANCE MAPPING (200-300 words)"""),

        (6, "Quality Assurance, Risk Management & Small Business Participation", f"""Generate a comprehensive section covering Quality Assurance, Risk Management, and Small Business Participation. TARGET LENGTH: 1,400-1,700 words.

Include:
1. QUALITY ASSURANCE AND QUALITY CONTROL (500-600 words)
2. RISK MANAGEMENT (500-600 words) - identify 5-7 specific risks
3. SMALL BUSINESS PARTICIPATION PLAN (400-500 words)"""),

        (7, "Price/Cost Proposal (High-Level Draft)", f"""Generate a comprehensive Price/Cost Proposal section. TARGET LENGTH: 1,000-1,200 words.

IMPORTANT: Include disclaimer that all prices are preliminary draft values.

{pricing_summary}

Include:
1. PRICING SUMMARY AND TOTAL PRICE (200-250 words)
2. DETAILED COST BREAKDOWN (300-400 words)
3. PRICING ASSUMPTIONS AND BASIS OF ESTIMATE (250-300 words)
4. VALUE PROPOSITION AND COST REALISM (200-250 words)"""),

        (8, "Attachments & Supporting Documentation Index", f"""Generate a comprehensive Attachments & Supporting Documentation Index section. TARGET LENGTH: 600-800 words.

Include:
1. ATTACHMENT INDEX AND DESCRIPTIONS (Attachments A through H)
2. DOCUMENT PREPARATION CHECKLIST
3. SUBMISSION INSTRUCTIONS AND NOTES""")
    ]


# ============================================================================
# CONTRACT ANALYSIS JOB PROCESSING
# ============================================================================

def extract_text_with_pages_worker(pdf_path: str) -> list:
    """Extract text from PDF with page information using PyMuPDF"""
    if not PYMUPDF_AVAILABLE:
        logger.error("PyMuPDF not available for PDF extraction")
        return []
    
    pages_text = []
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            pages_text.append({
                'page': page_num,
                'text': text
            })
        doc.close()
        logger.info(f"Extracted text from {len(pages_text)} pages")
        return pages_text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        return []


def download_pdf_from_firebase(storage_path: str) -> str:
    """Download PDF from Firebase Storage to a temp file"""
    try:
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_path = tmp_file.name
        
        blob.download_to_filename(tmp_path)
        logger.info(f"Downloaded PDF from Firebase: {storage_path} -> {tmp_path}")
        return tmp_path
    except Exception as e:
        logger.error(f"Error downloading PDF from Firebase: {e}")
        raise


def process_contract_analysis_job(db, openai_client, job_id: str, job_data: dict):
    """
    Process a contract analysis job.
    Downloads PDF, extracts text, calls OpenAI, and stores results.
    """
    logger.info(f"Processing contract analysis job {job_id}")
    
    try:
        # Update job status to running
        job_ref = db.reference(f'contract_analysis_jobs/{job_id}')
        job_ref.update({
            'status': 'running',
            'started_at': time.time(),
            'progress': 'Downloading PDF...'
        })
        
        user_id = job_data.get('user_id')
        storage_path = job_data.get('storage_path')
        contract_name = job_data.get('contract_name', 'Contract')
        
        if not storage_path:
            raise ValueError("No storage_path provided in job data")
        
        # Download PDF from Firebase Storage
        job_ref.update({'progress': 'Extracting text from PDF...'})
        tmp_path = download_pdf_from_firebase(storage_path)
        
        try:
            # Extract text with page information
            pages_text = extract_text_with_pages_worker(tmp_path)
            
            if not pages_text:
                raise ValueError("Could not extract text from PDF. The document may be image-only or scanned.")
            
            # Combine text with page markers using per-page budgeting
            total_pages = len(pages_text)
            max_total_chars = 80000
            chars_per_page = max_total_chars // total_pages if total_pages > 0 else max_total_chars
            
            combined_text = ""
            for page_info in pages_text:
                page_text = page_info['text']
                if len(page_text) > chars_per_page:
                    page_text = page_text[:chars_per_page] + "... [page truncated]"
                combined_text += f"\n\n--- PAGE {page_info['page'] + 1} ---\n\n{page_text}"
            
            logger.info(f"Contract analysis: {total_pages} pages, {len(combined_text)} chars total")
            
            # Update progress
            job_ref.update({'progress': 'Analyzing contract with AI...'})
            
            # Call OpenAI to analyze the contract
            structured_prompt = f"""You are an expert government contract analyst. Analyze this contract document and provide strategic insights.

CONTRACT NAME: {contract_name}

CONTRACT DOCUMENT TEXT (with page markers):
{combined_text}

You must respond with a JSON object containing two parts:

1. "markdown_summary": A comprehensive markdown-formatted analysis with these sections:
   - **Contract Overview**: What this contract is about, issuing agency, scope of work
   - **Key Requirements**: Main deliverables, qualifications, requirements
   - **Important Deadlines**: Proposal due dates, performance periods, milestones
   - **Compliance Requirements**: Certifications, registrations, SAM, NAICS codes, set-asides
   - **Evaluation Criteria**: How proposals will be evaluated
   - **Strategic Recommendations**: 3-5 actionable recommendations
   - **Risk Assessment**: Potential risks or challenges

2. "findings": An array of specific findings, each with:
   - "id": Unique identifier (f1, f2, f3, etc.)
   - "type": One of "overview", "requirement", "deadline", "compliance", "evaluation", "recommendation", "risk"
   - "title": Short title (max 50 chars)
   - "quote": EXACT text snippet from the contract (40-80 words) that supports this finding
   - "page_hint": Page number where this quote appears (1-indexed)
   - "rationale": Brief explanation of why this is important (1-2 sentences)
   - "severity": "high", "medium", or "low"

IMPORTANT: The "quote" field MUST contain exact text from the contract document.

Respond ONLY with valid JSON, no other text."""

            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert government contract analyst. Always respond with valid JSON only."},
                    {"role": "user", "content": structured_prompt}
                ],
                max_tokens=4000,
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            ai_response = response.choices[0].message.content
            
            # Parse the JSON response
            ai_response = ai_response.strip()
            if '```' in ai_response:
                parts = ai_response.split('```')
                for part in parts:
                    part = part.strip()
                    if part.startswith('json'):
                        part = part[4:].strip()
                    if part.startswith('{'):
                        ai_response = part
                        break
            
            parsed_response = json.loads(ai_response)
            
            # Update job with results
            job_ref.update({
                'status': 'completed',
                'completed_at': time.time(),
                'progress': 'Complete',
                'result': {
                    'markdown_summary': parsed_response.get('markdown_summary', ''),
                    'findings': parsed_response.get('findings', []),
                    'total_pages': total_pages
                }
            })
            
            logger.info(f"Contract analysis job {job_id} completed successfully")
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logger.error(f"Error processing contract analysis job {job_id}: {e}", exc_info=True)
        try:
            job_ref = db.reference(f'contract_analysis_jobs/{job_id}')
            job_ref.update({
                'status': 'error',
                'error': str(e),
                'failed_at': time.time()
            })
        except Exception as update_error:
            logger.error(f"Failed to update job status: {update_error}")


def claim_contract_analysis_job(db, job_id: str) -> bool:
    """Attempt to claim a contract analysis job"""
    job_ref = db.reference(f'contract_analysis_jobs/{job_id}')
    
    def claim_transaction(current_data):
        if current_data is None:
            return None
        if current_data.get('status') != 'queued':
            return None
        lease_expires = current_data.get('lease_expires_at', 0)
        if lease_expires > time.time():
            return None
        
        current_data['status'] = 'running'
        current_data['claimed_by'] = WORKER_ID
        current_data['lease_expires_at'] = time.time() + LEASE_DURATION
        current_data['started_at'] = time.time()
        return current_data
    
    try:
        result = job_ref.transaction(claim_transaction)
        if result and result.get('claimed_by') == WORKER_ID:
            logger.info(f"Successfully claimed contract analysis job {job_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error claiming contract analysis job {job_id}: {e}")
        return False


def find_and_process_contract_analysis_jobs(db, openai_client):
    """Find queued contract analysis jobs and process one"""
    try:
        jobs_ref = db.reference('contract_analysis_jobs')
        all_jobs = jobs_ref.get() or {}
        
        for job_id, job_data in all_jobs.items():
            if shutdown_requested:
                break
            
            status = job_data.get('status')
            
            # Check for abandoned jobs
            if status == 'running':
                lease_expires = job_data.get('lease_expires_at', 0)
                if lease_expires < time.time():
                    logger.info(f"Found abandoned contract analysis job {job_id}, resetting to queued")
                    jobs_ref.child(job_id).update({'status': 'queued'})
                    status = 'queued'
                else:
                    continue
            
            if status != 'queued':
                continue
            
            if claim_contract_analysis_job(db, job_id):
                process_contract_analysis_job(db, openai_client, job_id, job_data)
                return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error finding contract analysis jobs: {e}", exc_info=True)
        return False


# ============================================================================
# PROPOSAL GENERATION JOB PROCESSING
# ============================================================================

def process_job(db, openai_client, job_id: str, job_data: dict):
    """
    Process a single proposal generation job.
    Generates 8 sections in parallel and updates Firebase with progress.
    """
    logger.info(f"Processing job {job_id}")
    event_seq = 0
    
    try:
        # Add started event
        add_event(db, job_id, 'started', {'message': 'Proposal generation started'}, event_seq)
        event_seq += 1
        
        user_id = job_data.get('user_id')
        draft_id = job_data.get('draft_id')
        
        # Get draft data from Firebase
        draft_ref = db.reference(f'proposal_drafts/{user_id}/{draft_id}')
        draft_data = draft_ref.get()
        
        if not draft_data:
            fail_job(db, job_id, 'Draft not found')
            add_event(db, job_id, 'error', {'message': 'Draft not found'}, event_seq)
            return
        
        # Get user data for company info
        user_ref = db.reference(f'users/{user_id}')
        user_data = user_ref.get() or {}
        
        # Get capability statement if available
        capability_statement = ""
        try:
            cs_ref = db.reference(f'capability_statements/{user_id}')
            cs_data = cs_ref.get()
            if cs_data:
                capability_statement = cs_data.get('content', '') or cs_data.get('parsed_content', '') or ''
        except Exception as cs_error:
            logger.warning(f"Could not fetch capability statement: {cs_error}")
        
        # Extract data from draft
        annotations = draft_data.get('annotations', [])
        pricing = draft_data.get('pricing', {})
        team_members = draft_data.get('team_members', [])
        
        # Build contract context
        all_annotations_text = '\n'.join([f"{ann.get('category', '')}: {ann.get('text', '')}" for ann in annotations])
        
        company_name = user_data.get('company', 'Our Company')
        company_address = user_data.get('address', '[Company Address]')
        company_email = user_data.get('email', '[Email]')
        
        # Build pricing summary
        labor_total = sum(item.get('cost', 0) for item in pricing.get('labor', []))
        material_total = sum(item.get('cost', 0) for item in pricing.get('materials', []))
        subtotal = labor_total + material_total
        margin_pct = pricing.get('margin_pct', 15)
        risk_pct = pricing.get('risk_pct', 5)
        margin_amount = subtotal * (margin_pct / 100)
        risk_amount = subtotal * (risk_pct / 100)
        total_bid = subtotal + margin_amount + risk_amount
        
        pricing_summary = f"""
Labor Costs: ${labor_total:,.2f}
Material Costs: ${material_total:,.2f}
Subtotal: ${subtotal:,.2f}
Margin ({margin_pct}%): ${margin_amount:,.2f}
Risk Reserve ({risk_pct}%): ${risk_amount:,.2f}
Total Bid Amount: ${total_bid:,.2f}

Labor Breakdown:
""" + '\n'.join([f"- {item.get('role', 'Role')}: {item.get('hours', 0)} hours @ ${item.get('rate', 0)}/hr = ${item.get('cost', 0):,.2f}" for item in pricing.get('labor', [])])
        
        # Build team summary
        team_summary = '\n'.join([f"- {member.get('name', 'Team Member')}: {member.get('role', 'Role')} - {member.get('experience', 'Experience')}" for member in team_members]) or "Team to be determined based on contract requirements."
        
        # Get section prompts
        section_prompts = get_section_prompts(company_name, company_address, team_summary, pricing_summary)
        
        # Initialize sections in Firebase
        for num, name, _ in section_prompts:
            update_section(db, job_id, num, 'pending', name)
        
        # Generate all 8 sections in parallel
        sections = {}
        completed_sections = []
        last_heartbeat = time.time()
        
        with ThreadPoolExecutor(max_workers=MAX_SECTIONS_PARALLEL) as executor:
            future_to_section = {
                executor.submit(
                    generate_section, 
                    openai_client, 
                    num, name, prompt,
                    company_name, company_address, company_email,
                    capability_statement, all_annotations_text,
                    team_summary, pricing_summary
                ): (num, name)
                for num, name, prompt in section_prompts
            }
            
            for future in as_completed(future_to_section):
                section_num, section_name = future_to_section[future]
                
                # Update heartbeat periodically
                if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                    update_heartbeat(db, job_id)
                    last_heartbeat = time.time()
                
                try:
                    content = future.result()
                    sections[section_num] = {
                        'name': section_name,
                        'content': content
                    }
                    completed_sections.append(section_num)
                    logger.info(f"Generated Section {section_num}: {section_name}")
                    
                    # Update section in Firebase
                    update_section(db, job_id, section_num, 'completed', section_name, content)
                    
                    # Emit section_completed event
                    add_event(db, job_id, 'section_completed', {
                        'section_num': section_num,
                        'section_name': section_name,
                        'completed_count': len(completed_sections),
                        'total_sections': 8
                    }, event_seq)
                    event_seq += 1
                    
                except Exception as e:
                    logger.error(f"Error in section {section_num}: {e}")
                    error_content = f"[Error generating this section: {str(e)}]"
                    sections[section_num] = {
                        'name': section_name,
                        'content': error_content
                    }
                    completed_sections.append(section_num)
                    
                    # Update section with error
                    update_section(db, job_id, section_num, 'error', section_name, error_content)
                    
                    # Emit section_error event
                    add_event(db, job_id, 'section_error', {
                        'section_num': section_num,
                        'section_name': section_name,
                        'error': str(e)
                    }, event_seq)
                    event_seq += 1
        
        # Order sections 1-8
        ordered_sections = [sections.get(i, {'name': f'Section {i}', 'content': '[Not generated]'}) for i in range(1, 9)]
        
        # Build the full proposal document
        disclaimer = """
================================================================================
                    DRAFT - FOR INTERNAL REVIEW ONLY
================================================================================

DISCLAIMER - DRAFT DOCUMENT

This document is an automatically generated draft proposal produced by an 
AI-assisted tool. It is NOT a final, complete, or legally binding offer. 
The content may be incomplete, inaccurate, or inconsistent. It MUST be 
thoroughly reviewed, edited, and approved by qualified human personnel 
before being used for any official submission or external communication.

================================================================================
"""
        
        full_proposal = disclaimer + "\n\n"
        for i, section in enumerate(ordered_sections, 1):
            full_proposal += f"\n\n{'='*80}\nSECTION {i}: {section['name'].upper()}\n{'='*80}\n\n"
            full_proposal += section['content']
        
        # Add instructions at the end
        instructions = """

================================================================================
                    INSTRUCTIONS FOR USING THIS DRAFT
================================================================================

This AI-generated draft proposal requires careful review and refinement before 
any official use. Please follow these steps:

1. READ EACH SECTION CAREFULLY
   - Review all 8 sections for accuracy and completeness
   - Verify all facts, figures, and claims

2. CORRECT AND REFINE
   - Replace all placeholders marked with [brackets]
   - Insert missing details and specific data
   - Validate all pricing and compliance statements
   - Adjust language to match your company's voice

3. VERIFY COMPLIANCE
   - Check alignment with actual solicitation instructions
   - Ensure all evaluation criteria are addressed
   - Verify format requirements are met

4. INTERNAL APPROVAL
   - Obtain necessary legal/compliance approvals
   - Get management sign-off on pricing
   - Verify technical accuracy with subject matter experts

5. FINALIZE FOR SUBMISSION
   - Download and edit in your word processor
   - Apply your company's proposal template
   - Perform final compliance check
   - Submit before the deadline

================================================================================
"""
        full_proposal += instructions
        
        # Save the generated proposal to the draft
        draft_ref.update({
            'generated_proposal': {
                'sections': ordered_sections,
                'full_text': full_proposal,
                'generated_at': datetime.now().isoformat(),
                'status': 'draft'
            }
        })
        
        # Mark job as completed
        complete_job(db, job_id, full_proposal, ordered_sections)
        
        # Emit done event - IMPORTANT: Do NOT include large payloads (sections, full_proposal)
        # to prevent OOM in the SSE endpoint. Frontend fetches results via /status endpoint.
        add_event(db, job_id, 'done', {
            'total_sections': len(ordered_sections),
            'message': 'Proposal generation completed successfully'
        }, event_seq)
        
        logger.info(f"Job {job_id} completed successfully with {len(ordered_sections)} sections")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        fail_job(db, job_id, str(e))
        add_event(db, job_id, 'error', {'message': str(e)}, event_seq)


def find_and_process_jobs(db, openai_client):
    """Find queued jobs and process one at a time"""
    try:
        # Query for all jobs
        jobs_ref = db.reference('proposal_jobs')
        all_jobs = jobs_ref.get() or {}
        
        for job_id, job_data in all_jobs.items():
            if shutdown_requested:
                break
            
            status = job_data.get('status')
            
            # Check if this is an abandoned job (running but lease expired)
            if status == 'running':
                lease_expires = job_data.get('lease_expires_at', 0)
                if lease_expires < time.time():
                    logger.info(f"Found abandoned job {job_id} (lease expired), resetting to queued")
                    jobs_ref.child(job_id).update({'status': 'queued'})
                    status = 'queued'  # Update local status so we can try to claim it
                else:
                    continue  # Job is actively being processed by another worker
            
            # Skip jobs that aren't queued
            if status != 'queued':
                continue
            
            # Try to claim the job
            if claim_job(db, job_id):
                # Process the job (blocking - one job at a time)
                process_job(db, openai_client, job_id, job_data)
                return True  # Processed one job
        
        return False  # No jobs to process
        
    except Exception as e:
        logger.error(f"Error finding jobs: {e}", exc_info=True)
        return False


def cleanup_stale_jobs(db):
    """Clean up jobs that have been running too long without heartbeat"""
    try:
        jobs_ref = db.reference('proposal_jobs')
        all_jobs = jobs_ref.get() or {}
        
        current_time = time.time()
        stale_threshold = LEASE_DURATION * 2  # 20 minutes
        
        for job_id, job_data in all_jobs.items():
            if job_data.get('status') == 'running':
                last_heartbeat = job_data.get('last_heartbeat', 0)
                if current_time - last_heartbeat > stale_threshold:
                    logger.warning(f"Marking stale job {job_id} as failed")
                    fail_job(db, job_id, 'Worker timeout - job was abandoned')
                    
    except Exception as e:
        logger.error(f"Error cleaning up stale jobs: {e}")


def cleanup_stale_contract_analysis_jobs(db):
    """Clean up contract analysis jobs that have been running too long"""
    try:
        jobs_ref = db.reference('contract_analysis_jobs')
        all_jobs = jobs_ref.get() or {}
        
        current_time = time.time()
        stale_threshold = LEASE_DURATION * 2  # 20 minutes
        
        for job_id, job_data in all_jobs.items():
            if job_data.get('status') == 'running':
                started_at = job_data.get('started_at', 0)
                if current_time - started_at > stale_threshold:
                    logger.warning(f"Marking stale contract analysis job {job_id} as failed")
                    jobs_ref.child(job_id).update({
                        'status': 'error',
                        'error': 'Worker timeout - job was abandoned',
                        'failed_at': current_time
                    })
                    
    except Exception as e:
        logger.error(f"Error cleaning up stale contract analysis jobs: {e}")


def main():
    """Main worker loop - processes both proposal and contract analysis jobs"""
    global shutdown_requested
    
    # Set up signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    logger.info(f"Starting background worker {WORKER_ID}")
    logger.info("Supported job types: proposal_jobs, contract_analysis_jobs")
    
    # Initialize services
    try:
        db = initialize_firebase()
        openai_client = initialize_openai()
        logger.info("Services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        sys.exit(1)
    
    cleanup_counter = 0
    
    # Main loop
    while not shutdown_requested:
        try:
            job_processed = False
            
            # Try to process a proposal job first
            if not job_processed:
                job_processed = find_and_process_jobs(db, openai_client)
            
            # Try to process a contract analysis job
            if not job_processed:
                job_processed = find_and_process_contract_analysis_jobs(db, openai_client)
            
            # Periodically clean up stale jobs (every 10 iterations)
            cleanup_counter += 1
            if cleanup_counter >= 10:
                cleanup_stale_jobs(db)
                cleanup_stale_contract_analysis_jobs(db)
                cleanup_counter = 0
            
            # If no job was processed, wait before polling again
            if not job_processed and not shutdown_requested:
                time.sleep(POLL_INTERVAL)
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
            time.sleep(POLL_INTERVAL)
    
    logger.info(f"Worker {WORKER_ID} shutting down")


if __name__ == '__main__':
    main()

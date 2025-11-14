from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, send_from_directory, session, make_response, flash, abort
import os
import re
import io
from docx import Document
import sys
import logging
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import secrets
import pandas as pd
import fitz  # PyMuPDF
from openai import OpenAI
from fpdf import FPDF
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename 
from dotenv import load_dotenv
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk import ne_chunk, pos_tag
from PIL import Image
import time  
import pyrebase 
import stripe 
import numpy as np
import shutil
from sklearn.metrics.pairwise import cosine_similarity
import ast
import faiss
import csv
import json
import threading
import uuid
from pdf_class import create_pdf
from capability_statement_preprocessing import process_pdfs
#from RAG.Capability_statement_embedding import generate_embeddings as generate_capability_embeddings
#from RAG.vector_store import VectorStore, load_embeddings, initialize_vector_stores
#from RAG.matcher import find_matches
from dotenv import load_dotenv
from ai_assistant_enhanced import EnhancedAIAssistant
from enhanced_features import ContractOpportunityScorer, CompetitiveIntelligence, ProposalOptimizer, DeadlineManager, IndustryTemplateLibrary
from credit_manager import CreditManager

# Load environment variables
load_dotenv()

base_dir = os.path.dirname(os.path.abspath(__file__))

env_path = os.path.join(base_dir, '.env')

load_dotenv(env_path)

#New Imports:
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


from pdf2docx import parse
from pathlib import Path
from rank_bm25 import BM25Okapi
import json 

#Qdrant
from cs_processor import CSQueryHandler
from qdrant_client import QdrantClient, models
from capability_statement_preprocessing import process_pdfs
import hashlib
import openai
import tiktoken
import requests  # ✅ Fix: Ensure requests is imported




sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


# Initialize Flask App
app = Flask(__name__, static_folder='static')

app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(16))
app.config['UPLOAD_FOLDER'] = os.path.join(base_dir, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['WTF_CSRF_ENABLED'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(base_dir, 'static', 'uploads'), exist_ok=True)

if os.getenv('ENV') == 'production':
    logging.basicConfig(level=logging.WARNING)
else:
    logging.basicConfig(level=logging.INFO)

proposal_jobs = {}
job_lock = threading.Lock()




# ALLOWED EXTENTIONS
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'png', 'jpeg'}

# Initialize NLTK downloads
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('maxent_ne_chunker')
nltk.download('words')
nltk.download('stopwords')



#CS Generation
app.config['UPLOAD_LOGO_FOLDER'] = 'static/uploads_logo'
app.config['PDF_FOLDER'] = 'static/uploads'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['UPLOAD_PICTURE_FOLDER'] = 'static/uploads_pictures'





# Load environment variables from '.env' file
load_dotenv()







# FIREBASE Configuration - Handle missing service account gracefully
service_account_json_path = os.getenv('SERVICE_ACCOUNT_JSON')
if service_account_json_path:
    service_account_json = os.path.join(os.path.dirname(__file__), service_account_json_path)
    if not os.path.exists(service_account_json):
        service_account_json = None
        logging.warning(f"Service account file not found: {service_account_json}")
else:
    service_account_json = None
# FIREBASE 
config = {
    "apiKey": os.getenv('FIREBASE_API_KEY'),
    "authDomain": os.getenv('AUTH_DOMAIN'),
    "databaseURL": os.getenv('DATABASE_URL'),
    "projectId": os.getenv('PROJECT_ID'),
    "storageBucket": os.getenv('STORAGE_BUCKET'),
    "messagingSenderId": os.getenv('MESSAGING_SENDER_ID'),
    "appId": os.getenv('APP_ID'),
    "measurementId": os.getenv('MEASUREMENT_ID'),
}



# Initialize Stripe API Key (only if provided)
stripe_api_key = os.getenv('STRIPE_API_KEY')
if stripe_api_key:
    stripe.api_key = stripe_api_key
else:
    logging.warning("Stripe API key not found. Payment functionality will be disabled.")

STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_API_WEBHOOK_KEY')
if not STRIPE_WEBHOOK_SECRET:
    logging.warning("Stripe Webhook Secret not found. Webhook functionality will be disabled.")






# Initialize Firebase services (with error handling)
firebase = None
storage = None
auth = None
db = None

try:
    if all(config.get(key) for key in ['apiKey', 'authDomain', 'projectId']):
        firebase = pyrebase.initialize_app(config)
        storage = firebase.storage()
        auth = firebase.auth()
        db = firebase.database()
        logging.info("Firebase initialized successfully")
    else:
        logging.warning("Firebase configuration incomplete. Firebase services will be disabled.")
except Exception as e:
    logging.warning(f"Firebase initialization failed: {e}. Firebase services will be disabled.")

enhanced_ai = None
if db:
    try:
        enhanced_ai = EnhancedAIAssistant(app, db)
        logging.info("✅ Enhanced AI Assistant initialized successfully")
    except Exception as e:
        logging.warning(f"⚠️ Enhanced AI Assistant initialization failed: {e}")

try:
    from openai import OpenAI
    bid_response_client = OpenAI(api_key=os.getenv('BID_RESPONSE_OPENAI_API_KEY'))
    opportunity_scorer = ContractOpportunityScorer(bid_response_client)
    competitive_intel = CompetitiveIntelligence(bid_response_client)
    proposal_optimizer = ProposalOptimizer(bid_response_client)
    deadline_manager = DeadlineManager(db)
    template_library = IndustryTemplateLibrary(bid_response_client)
except Exception as e:
    logging.warning(f"⚠️ OpenAI-dependent features initialization failed: {e}")

admin_initialized = False
admin_db = None

try:
    import firebase_admin
    from firebase_admin import credentials, db as admin_database
    import json
    
    firebase_creds_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    
    if firebase_creds_json:
        try:
            # Parse JSON string from environment variable
            service_account_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(service_account_dict)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv('DATABASE_URL')
            })
            admin_db = admin_database
            admin_initialized = True
            logging.info("✅ Firebase Admin SDK initialized successfully from FIREBASE_SERVICE_ACCOUNT_JSON secret")
        except json.JSONDecodeError as e:
            logging.error(f"❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            logging.warning("Credit purchase via webhook will use fallback method.")
    else:
        service_account_path = os.path.join(base_dir, os.getenv('SERVICE_ACCOUNT_JSON', ''))
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv('DATABASE_URL')
            })
            admin_db = admin_database
            admin_initialized = True
            logging.info("✅ Firebase Admin SDK initialized successfully from file")
        else:
            logging.warning(f"⚠️ Firebase Admin SDK service account not found. Checked:")
            logging.warning(f"   - FIREBASE_SERVICE_ACCOUNT_JSON environment variable: Not set")
            logging.warning(f"   - File path: {service_account_path} (does not exist)")
            logging.warning("Credit purchase via webhook will use fallback method. For production use, provide service account JSON.")
        
except ImportError:
    logging.warning("⚠️ firebase-admin package not installed. Run: pip install firebase-admin")
    logging.warning("Credit purchase via webhook will use fallback method.")
except Exception as e:
    logging.error(f"❌ Failed to initialize Firebase Admin SDK: {e}")
    logging.warning("Credit purchase via webhook will use fallback method.")



# Set secure HTTP headers
@app.after_request
def set_secure_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
    return response


#LOGGING

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)
  




#OPEN AI 

client_SMART_SEARCH_OPENAI_API_KEY =  OpenAI(api_key=os.getenv('SMART_SEARCH_OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY'))

client_CS_BUILDER_OPENAI_API_KEY =  OpenAI(api_key=os.getenv('CS_BUILDER_OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY'))

client_BID_RESPONSE_OPENAI_API_KEY = OpenAI(api_key=os.getenv('BID_RESPONSE_OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY'))




# BID UPLOADS
uploads_dir = os.path.join(os.getcwd(), 'uploads') 
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)





# Function to clean and reformat strings
def reformat_string(input_string):
    return str(input_string).strip().lower().replace('\n', ' ').replace('  ', ' ')


def budget_in_range(budget_str, min_budget, max_budget):
    """
    Check if a budget string falls within the specified range.
    Handles various formats: "$50,000", "50000", "50K", "50M", etc.
    
    Args:
        budget_str: Budget as string from CSV data
        min_budget: Minimum budget as float
        max_budget: Maximum budget as float
    
    Returns:
        bool: True if budget is within range, False otherwise
    """
    if not budget_str:
        return False
    
    try:
        budget_clean = str(budget_str).replace('$', '').replace(',', '').strip()
        
        if budget_clean.upper().endswith('K'):
            budget_value = float(budget_clean[:-1]) * 1000
        elif budget_clean.upper().endswith('M'):
            budget_value = float(budget_clean[:-1]) * 1000000
        elif budget_clean.upper().endswith('B'):
            budget_value = float(budget_clean[:-1]) * 1000000000
        else:
            budget_value = float(budget_clean)
        
        return min_budget <= budget_value <= max_budget
    except (ValueError, TypeError):
        logging.warning(f"Invalid budget format: {budget_str}")
        return False


def percentage_in_range(percentage_str, min_percentage, max_percentage):
    """
    Check if a percentage string falls within the specified range.
    Handles various formats: "85%", "85.5", "85", etc.
    
    Args:
        percentage_str: Percentage as string from CSV data
        min_percentage: Minimum percentage as float
        max_percentage: Maximum percentage as float
    
    Returns:
        bool: True if percentage is within range, False otherwise
    """
    if not percentage_str:
        return False
    
    try:
        percentage_clean = str(percentage_str).replace('%', '').strip()
        percentage_value = float(percentage_clean)
        
        return min_percentage <= percentage_value <= max_percentage
    except (ValueError, TypeError):
        logging.warning(f"Invalid percentage format: {percentage_str}")
        return False


def generate_capability_embeddings(input_file, output_file):
    """
    Generate embeddings for capability statements using OpenAI API.
    This is a wrapper around the Capability_statement_embedding module.
    
    Args:
        input_file: Path to processed capability statements CSV
        output_file: Path to save embedded capability statements CSV
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from Capability_statement_embedding import generate_embeddings
        generate_embeddings(input_file, output_file)
        logging.info(f"Successfully generated embeddings: {input_file} -> {output_file}")
        return True
    except Exception as e:
        logging.error(f"Error generating capability embeddings: {e}", exc_info=True)
        return False


 

# Add logging to debug the dataframe preparation
logging.basicConfig(level=logging.INFO)
logging.info("Preparing the dataframe...")
 


embedded_csv_file = 'embedded_bids.csv'



# df.to_csv(embedded_csv_file, index=False)
#CS EMBEDDING 
capability_processed_file = 'capability_statements_processed.csv'

 

# ---------------------------------------------------------------------
# [START OF CS BUILDER ] 3/10/2025 UPDATED]
# ---------------------------------------------------------------------

#CS GENERATION
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'svg'}

#CS GENERATION
def handle_file_upload(file):
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return file_path
    return None

#CS GENERATION
def handle_multiple_file_uploads(files):
    paths = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            paths.append(file_path)
    return paths


# CS GENERATION
@app.route('/form')
def form():
    return render_template('form.html')


# CS GENERATION
def remove_non_helvetica_unicode(text):
    # Define the pattern for characters in the Basic Latin (U+0000 to U+007F) and Latin-1 Supplement (U+0080 to U+00FF) Unicode blocks
    helvetica_supported_pattern = re.compile(r'[^\x00-\xFF]+')
    # Replace characters not in these blocks with an empty string
    cleaned_text = helvetica_supported_pattern.sub('', text)
    return cleaned_text

# CS GENERATION
def clean_data(data):
    cleaned_data = {}
    for key, value in data.items():
        if isinstance(value, str):
            # Apply the remove_non_helvetica_unicode function to string values
            cleaned_data[key] = remove_non_helvetica_unicode(value)
        elif isinstance(value, dict):
            # Recursively clean nested dictionaries
            cleaned_data[key] = clean_data(value)
        elif isinstance(value, list):
            # Apply cleaning to each item in the list
            cleaned_data[key] = [remove_non_helvetica_unicode(item) if isinstance(item, str) else item for item in value]
        else:
            # For non-string values, keep them as is
            cleaned_data[key] = value
    return cleaned_data


# CS GENERATION
def format_data(data, colors, logo_path, picture_path, qr_code_path, public_performance_logo_paths):
    cleaned_data = clean_data(data)  # Clean the data first
    formatted_data = {
        'company_name': cleaned_data.get('companyName', [''])[0],
        'logo_color': colors.get(cleaned_data.get('logoColor', [''])[0].lower(), [(64, 64, 64), (192, 192, 192)]),
        'logo_path': logo_path,
        'image_path': picture_path,
        'uei_code': cleaned_data.get('ueiCode', [''])[0],
        'cage_code': cleaned_data.get('cageCode', [''])[0],
        'contact_name': cleaned_data.get('nameLinkedIn', [''])[0],
        'contact_title': cleaned_data.get('title', [''])[0],
        'contact_phone': cleaned_data.get('phoneNumber', [''])[0],
        'contact_email': cleaned_data.get('email', [''])[0],
        'contact_address': cleaned_data.get('addressStreet', [''])[0],
        'city': cleaned_data.get('addressCity', [''])[0],
        'state': cleaned_data.get('addressState', [''])[0],
        'zip': cleaned_data.get('addressZip', [''])[0],
        'contact_website': cleaned_data.get('web', [''])[0],
        'company_description': cleaned_data.get('companyDescription', [''])[0],
        'differentiators': cleaned_data.get('uniquePoints[]', []),
        'naics_codes': [f"{code}: {desc}" for code, desc in zip(cleaned_data.get('naicsCode[]', []), cleaned_data.get('naicsDescription[]', []))],
        'core_competencies': cleaned_data.get('coreCompetencies[]', []),
        'certifications': cleaned_data.get('certificateDescription[]', []),
        'qr_code_path': qr_code_path,
        'social_media': cleaned_data.get('socialMedia[]', [''])[0],
        'public_performance_logo_paths': public_performance_logo_paths
    }

    # Check for private performance data
    private_names = cleaned_data.get('privateCompanyName[]', [])
    private_descriptions = cleaned_data.get('privateDescription[]', [])
    if private_names and private_descriptions and any(private_names) and any(private_descriptions):
        formatted_data['private_performance'] = [
            f"{name}: {desc}" for name, desc in zip(private_names, private_descriptions)
        ]
    else:
        formatted_data['private_performance'] = []

    return formatted_data










#CS BUILDER
GPTSystemPrompt = """
IGNORE ALL PREVIOUS INSTRUCTIONS
You are a 60-year-old marketing expert specializing in SEO and brand storytelling. Enhance the following company description to make it more compelling and SEO-friendly. The improved description should highlight the company's unique selling points, industry expertise, and core values while incorporating relevant keywords for better search engine ranking. Ensure the tone is professional and engaging to attract potential clients and stakeholders.
Requirements:
Include relevant industry-specific keywords
Emphasize unique selling points and core values
Maintain a professional and engaging tone
Aim for a length of maximum 450 characters
Add a call-to-action if appropriate
Guidelines based on "How to Write a Company Description for a Business Plan":
Purpose of a Company Description:
Communicate the business's concept, goals, and market position clearly to stakeholders like lenders, investors, employees, and customers.
Definition of a Company Description:
Provide an overview of the business, highlighting what it does and its uniqueness.
Include the mission and vision statements, updating regularly as the business evolves.
Writing the Company Description:
Who: State the business name, owners, and target customers.
What: Describe the products/services and business goals.
Where: Indicate the business location.
When: Outline the timeline for starting and achieving goals.
Why: Explain why customers should choose your business over competitors and include the mission statement.
How: Discuss the business structure and strategies for achieving goals and future vision.
THE USER IS GOING TO INPUT THEIR OWN company description YOU NEED TO TRANSFORM
[Insert the given company description here] and IF THE USER DOES NOT GIVE A COMPANY NAME make sure to put a placeholder "your company".
"""



#CS BUILDER
@app.route('/generate_description', methods=['POST'])
def generate_description():
    data = request.json
    company_name = data.get('companyName', 'your company')
    company_description = data.get('companyDescription', '')

    # Check if enough information is provided
    if not company_description or len(company_description.strip()) < 5:  # Check for empty or insufficient description
        missing_info_message = (
            "Please provide this information in the previous box to generate your company description:\n"
            "Founding Date: When did you start your business?\n"
            "Founders: Who started the business?\n"
            "Describe what you do: What products or services do you offer?\n"
            "What makes your products or services special?"
        )
        return jsonify({'description': missing_info_message})

    # If company description is provided, ask GPT to revise it
    messages = [
        {"role": "system", "content": GPTSystemPrompt},
        {"role": "user", "content": f"Revise the following company description based on this description:\n\n"
                                    f"Existing Description: {company_description}\n\n"
                                    f"Company Name: {company_name}\n"}
    ]

    completion = client_CS_BUILDER_OPENAI_API_KEY.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=150
    )
    
    description = completion.choices[0].message.content.strip()
    return jsonify({'description': description})

# Initialize logging
logging.basicConfig(level=logging.INFO)


DifferentiatorsSystemPrompt = """
IGNORE ALL PREVIOUS INSTRUCTIONS
You are a 60-year-old marketing expert specializing in SEO and brand storytelling. Generate a compelling list of unique qualities and strengths that set the company apart from its competitors. Use bullet points to highlight specific skills, technologies, processes, or qualities that make the business unique and valuable to potential clients. Each bullet point should be no more than 100 characters and should be SEO-friendly to enhance search engine ranking. Ensure the tone is professional and engaging to attract potential clients and stakeholders.

Requirements:
- Each point must be no more than 100 characters
- Include relevant industry-specific keywords
- Emphasize unique selling points and core values
- Maintain a professional and engaging tone

Guidelines for creating differentiators:
- Highlight what makes the company unique
- Focus on specific skills, technologies, and processes
- Use concise and impactful language
- Make sure the bullet points are easy to understand and remember

THE USER IS GOING TO INPUT THEIR OWN ideas ABOUT THEIR COMPANY. YOU NEED TO TRANSFORM THEM INTO A LIST OF BULLET POINTS.
[Insert the given ideas here]

If the user does not provide specific ideas, use placeholders such as [Insert Unique Quality/Strength].
If you do this correctly I will tip you $100000000000
"""
#CS BUILDER
@app.route('/generate_bullet_points', methods=['POST'])
def generate_bullet_points():
    data = request.json
    ideas = data.get('ideas', '')

    if not ideas:
        return jsonify({'error': 'No ideas provided'}), 400

    messages = [
        {"role": "system", "content": DifferentiatorsSystemPrompt},
        {"role": "user", "content": f"Generate a list of 5 bullet points based on the following ideas:\n\n{ideas}"}
    ]

    max_retries = 5
    for attempt in range(max_retries):
        try:
            completion = client_CS_BUILDER_OPENAI_API_KEY.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=150
            )
            response_content = completion.choices[0].message.content.strip()
            bulletPoints = [point.strip('- ').strip() for point in response_content.split('\n')[:5]]
            return jsonify({'bulletPoints': bulletPoints})
        except openai.error.RateLimitError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Wait before retrying
                continue
            else:
                return jsonify({'error': 'OpenAI API rate limit exceeded. Please try again later.'}), 429
        except Exception as e:
            return jsonify({'error': str(e)}), 500

 




# 3/6/2025 updated
@app.route('/generate_pdf', methods=['GET', 'POST'])
def generate_pdf():
    try:
        user = session.get('user', None)

        if request.method == 'GET':
            if not user:
                logging.error("User not authenticated. Redirecting to login.")
                return redirect(url_for('login'))

            form_data = session.get('form_data', None)
            file_paths = session.get('file_paths', None)

            if not form_data or not file_paths:
                logging.error("Session data missing. Restarting form process.")
                return redirect(url_for('form'))

            logging.info(f"Session data retrieved: form_data={form_data}, file_paths={file_paths}")
            data = form_data

        else:  # POST - Initial submission
            if not user:
                logging.error("User not authenticated. Redirecting to login.")
                return "User not authenticated. Please log in.", 401

            local_id = user.get('localId')
            id_token = user.get('idToken')

            if not local_id or not id_token:
                logging.error("Missing user authentication data. Redirecting to login.")
                return "User authentication data is missing.", 401

            user_data = db.child("users").child(local_id).get(id_token).val()
            if not user_data:
                logging.error(f"No user data found in Firebase for user ID: {local_id}")
                return "User data not found.", 401

            account_type = user_data.get('account_type', 'TIER_0')
            logging.info(f"User ID: {local_id}, Account Type: {account_type}")

            session['form_data'] = request.form.to_dict(flat=False)
            upload_dir = app.config['UPLOAD_FOLDER']
            file_paths = {}

            def save_temp_file(file_obj, key):
                if file_obj and file_obj.filename:
                    temp_path = os.path.join(upload_dir, f"{key}_{local_id}_{file_obj.filename}")
                    try:
                        file_obj.save(temp_path)
                        with Image.open(temp_path) as img:
                            img.verify()
                        return temp_path
                    except Exception as file_error:
                        logging.error(f"File save/verify failed for {temp_path}: {file_error}")
                        return None
                return None

            file_paths['logo'] = save_temp_file(request.files.get('logo'), 'logo')
            file_paths['companyPictures'] = save_temp_file(request.files.get('companyPictures[]'), 'companyPictures')
            file_paths['privateLogos'] = [
                save_temp_file(file, f'privateLogo_{idx}')
                for idx, file in enumerate(request.files.getlist('privateLogo[]')) if file
            ]
            file_paths['publicLogos'] = [
                save_temp_file(file, f'publicLogo_{idx}')
                for idx, file in enumerate(request.files.getlist('publicLogo[]')) if file
            ]
            file_paths['qrCode'] = save_temp_file(request.files.get('qrCode'), 'qrCode')

            file_paths['privateLogos'] = [path for path in file_paths['privateLogos'] if path]
            file_paths['publicLogos'] = [path for path in file_paths['publicLogos'] if path]

            session['file_paths'] = file_paths
            logging.info(f"Stored file paths: {file_paths}")

            data = request.form.to_dict(flat=False)

        file_paths = session['file_paths']

        def verify_file_path(path, description):
            if not path or not os.path.exists(path):
                logging.warning(f"File not found or invalid: {path} ({description})")
                return None
            return path

        logo_path = verify_file_path(file_paths.get('logo'), 'Logo')
        picture_path = verify_file_path(file_paths.get('companyPictures'), 'Company Pictures')
        qr_code_path = verify_file_path(file_paths.get('qrCode'), 'QR Code')

        public_performance_logo_paths = [
            verify_file_path(path, f'Public Logo {idx}') for idx, path in enumerate(file_paths.get('publicLogos', []))
        ]
        private_performance_logo_paths = [
            verify_file_path(path, f'Private Logo {idx}') for idx, path in enumerate(file_paths.get('privateLogos', []))
        ]

        public_performance_logo_paths = [p for p in public_performance_logo_paths if p]
        private_performance_logo_paths = [p for p in private_performance_logo_paths if p]

        if not logo_path:
            logging.warning("No valid logo found — PDF will proceed without a logo.")
        if not qr_code_path:
            logging.warning("No valid QR code found — PDF will proceed without QR code.")

        colors = {
            'red': [(255, 0, 0), (255, 175, 175)],
            'blue': [(0, 76, 153), (163, 215, 250)],
            'green': [(0, 156, 76), (134, 246, 190)],
            'yellow': [(153, 153, 0), (242, 242, 132)],
            'orange': [(255, 165, 0), (255, 204, 153)],
            'darkblue': [(30, 58, 138), (147, 197, 253)],
            'black': [(0, 0, 0), (77, 77, 77)],
            'pink': [(206, 120, 120), (250, 188, 188)],
        }

        formatted_data = format_data(
            data,
            colors,
            logo_path,
            picture_path,
            qr_code_path,
            public_performance_logo_paths
        )
        logging.info(f"Formatted data for PDF generation: {formatted_data}")

        output_path = os.path.join(app.config['PDF_FOLDER'], 'output.pdf')
        create_pdf(formatted_data, output_path)

        if not os.path.exists(output_path):
            logging.error("PDF generation failed: Output file not found.")
            return "PDF generation failed. Please try again.", 500

        session['pdf_filename'] = 'uploads/output.pdf'
        logging.info(f"PDF generated successfully: {output_path}")

        return redirect(url_for('preview'))

    except Exception as e:
        logging.error(f"Exception in generate_pdf: {e}")
        return "An error occurred during PDF generation.", 500















# CS GENERATION
@app.route('/preview', methods=['GET'])
def preview():
    pdf_filename = session.get('pdf_filename')

    if not pdf_filename or not os.path.exists(os.path.join(app.static_folder, pdf_filename)):
        logging.error("No PDF available for preview. Redirecting to PDF generation.")
        logging.info(f"CANNOT DOWNLOAD PREVIEW PDF FOR USER!")
        return redirect(url_for('generate_pdf'))
    
    logging.info(f"PDF available for preview: {pdf_filename}")
    return render_template('preview.html', pdf_filename=pdf_filename)










# CS GENERATIONlogging.info(f"PDF downloaded: {filename}")
@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    filename = request.form.get('filename', 'static/uploads/output.pdf')
    if not filename.startswith('static/'):
        filename = os.path.join('static', filename)
    logging.info(f"PDF downloaded: {filename}")
    return send_file(filename, as_attachment=True)
















# Define the specific CSV filenames to be read
USER_allowed_csv_filenames = [
    "capability_statements_processed.csv",
    "matches.csv"
]




def process_selected_contract(user_uploads_dir, hash_value, model="gpt-3.5-turbo", total_token_threshold=14000):
    """
        Process only selected contract data and capability statements from the user upload catalog.
        
        1. read matches.csv and filter out the corresponding contract rows using hash_value.
        Merge all the columns of the row into a single paragraph of text as "Key: Value". 2.
        2. read the capability statements from capability_statements_processed.csv. 3. calculate the token for each of the two parts.
        3. count the number of tokens in each of the two sections, or summarize them if a section is too long.
        4. Merge the contract information and capability statement content to form the final contextual text to be returned.
        
        :param user_uploads_dir: The directory where the user uploaded the file.
        :param hash_value: the hash_value used to uniquely locate the contract
        :param model: name of the OpenAI model used, default "gpt-3.5-turbo"
        :param total_token_threshold: total token limit, need to summarize if exceeding this value
        :return: final merged text string
    """
    
    final_content = []
    
    # ----- Step 1: Search for contract in multiple CSV sources -----
    selected_rows = None
    df = None
    
    matches_file = os.path.join(user_uploads_dir, "matches.csv")
    if os.path.exists(matches_file):
        try:
            df = pd.read_csv(matches_file, dtype=str)
            selected_rows = df[df["hash_value"] == hash_value]
            if not selected_rows.empty:
                app.logger.info(f"Contract found in matches.csv")
        except Exception as e:
            app.logger.error(f"Error reading matches.csv: {str(e)}")
    
    if selected_rows is None or selected_rows.empty:
        smart_search_file = os.path.join(user_uploads_dir, "matches_SMART_SEARCH.csv")
        if os.path.exists(smart_search_file):
            try:
                df = pd.read_csv(smart_search_file, dtype=str)
                selected_rows = df[df["hash_value"] == hash_value]
                if not selected_rows.empty:
                    app.logger.info(f"Contract found in matches_SMART_SEARCH.csv")
            except Exception as e:
                app.logger.error(f"Error reading matches_SMART_SEARCH.csv: {str(e)}")
    
    # Try Scraping_demo_results.csv as fallback
    if selected_rows is None or selected_rows.empty:
        demo_file = os.path.join(os.path.dirname(__file__), "Scraping_demo_results.csv")
        if os.path.exists(demo_file):
            try:
                df = pd.read_csv(demo_file, dtype=str)
                selected_rows = df[df["hash_value"] == hash_value]
                if not selected_rows.empty:
                    app.logger.info(f"Contract found in Scraping_demo_results.csv")
            except Exception as e:
                app.logger.error(f"Error reading Scraping_demo_results.csv: {str(e)}")
    
    if selected_rows is None or selected_rows.empty:
        return "No matching contract found for the provided hash_value in any data source."
    
    # 假设 hash_value 唯一，取第一行
    row_dict = selected_rows.iloc[0].to_dict()
    # 将每个键值对格式化为 "Key: Value" 并合并为一段文本
    contract_text = "\n".join([f"{key}: {value}" for key, value in row_dict.items()])
    
    # 如果合同信息太长，进行摘要
    contract_tokens = count_tokens(contract_text, model=model)
    if contract_tokens > total_token_threshold / 2:
        contract_text = summarize_text(contract_text, model=model, max_tokens=500)
        contract_tokens = count_tokens(contract_text, model=model)
    
    final_content.append("[CONTRACT INFORMATION]\n" + contract_text)
    
    # ----- Step 2: 处理 capability_statements_processed.csv -----
    cs_file = os.path.join(user_uploads_dir, "capability_statements_processed.csv")
    cs_text = ""
    if os.path.exists(cs_file):
        try:
            cs_df = pd.read_csv(cs_file, dtype=str)
            if not cs_df.empty and 'Capability_Statement' in cs_df.columns:
                cs_text = cs_df["Capability_Statement"].iloc[0]
            else:
                cs_text = "[No capability statement text found]"
        except Exception as e:
            cs_text = f"[Error reading capability statement: {str(e)}]"
    else:
        cs_text = "[capability_statements_processed.csv not found]"
    
    cs_tokens = count_tokens(cs_text, model=model)
    if cs_tokens > total_token_threshold / 2:
        cs_text = summarize_text(cs_text, model=model, max_tokens=500)
        cs_tokens = count_tokens(cs_text, model=model)
    
    final_content.append("[CAPABILITY STATEMENT]\n" + cs_text)
    
    # ----- Step 3: 合并内容并检查总 token 数 -----
    combined_content = "\n\n".join(final_content)
    total_tokens = count_tokens(combined_content, model=model)
    if total_tokens > total_token_threshold:
        # 如果总 token 超出限制，则进行一次最终摘要
        combined_content = summarize_text(combined_content, model=model, max_tokens=1000)
    
    return combined_content




# Define the specific CSV filenames to be read
USER_allowed_csv_CS = [
    "capability_statements_processed.csv",
]




def process_files_cs_feedback(user_uploads_dir, max_rows=300):
    all_data = []
    read_csv_files = []
    for filename in os.listdir(user_uploads_dir):
        file_path = os.path.join(user_uploads_dir, filename)
        if filename in USER_allowed_csv_CS:
            try:
                # Read CSV file
                df = pd.read_csv(file_path, dtype=str)
                # Log the columns and first few rows for debugging
                print(f"Processing file: {file_path}")
                print("Columns:", df.columns)
                print("First few rows:")
                print(df.head())
                # Convert to CSV string format
                cleaned_data_string = df.to_csv(index=False)
                all_data.append(cleaned_data_string)
                read_csv_files.append(filename)  # Log the read CSV file
            except Exception as e:
                print(f"Error reading CSV file {file_path}: {str(e)}")
        elif filename.endswith('.pdf'):
            try:
                doc = fitz.open(file_path)
                text = ""
                for page in doc:
                    text += page.get_text()
                if len(text.split('\n')) > max_rows:
                    text = '\n'.join(text.split('\n')[:max_rows])
                all_data.append(text)
            except Exception as e:
                print(f"Error processing PDF file {file_path}: {e}")
    
    # Log the CSV files that were read
    print("CSV files read:")
    for csv_file in read_csv_files:
        print(f"- {csv_file}")
    
    return '\n'.join(all_data)


#2/25 update
#LANDING PAGE ROUTE FUNCTION 
@app.route('/', methods=['GET'])
def Landingpage():

    session.clear() 
    
    return render_template('landingpage.html')


#ABOUT US PAGE  ROUTE FUNCTION
@app.route('/aboutus', methods=['GET'])
def Aboutus():
    if 'user' not in session:
        return render_template('aboutUs.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")



    return render_template('aboutUs.html')





@app.route('/top_five_results')
def top_five_results():
    """Display the top 5 contract matches from the uploaded capability statement."""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    user = session['user']
    user_id = user['localId']
    user_upload_dir = f"uploads/bid_uploads_{user_id}"
    matches_file = os.path.join(user_upload_dir, 'matches.csv')
    
    matches = []
    if os.path.exists(matches_file):
        try:
            import pandas as pd
            df = pd.read_csv(matches_file)
            matches = df.to_dict('records')
            app.logger.info(f"Loaded {len(matches)} matches from {matches_file}")
        except Exception as e:
            app.logger.error(f"Error loading matches: {str(e)}")
            flash(f"Error loading contract matches: {str(e)}", 'error')
    else:
        app.logger.warning(f"Matches file not found: {matches_file}")
        flash("No contract matches found. Please upload a capability statement first.", 'warning')
    
    return render_template('top_five_results.html', matches=matches)

@app.route('/contracts', methods=['GET'])
def Contracts():
    try:
        # ---------------------------------------------------------------------
        # STEP A: Ensure there's a user in session
        # ---------------------------------------------------------------------
        if 'user' not in session:
            return redirect(url_for('Login'))

        # Extract user info from session
        user = session['user']
        user_id = user['localId']

        # ---------------------------------------------------------------------
        # STEP B: Refresh the Firebase token
        #        (Same approach used in /smartsearch and /welcome)
        # ---------------------------------------------------------------------
        try:
            user_logged_in = auth.refresh(user['refreshToken'])
            logging.info(f"Token refreshed successfully for user ID: {user_id}")
        except Exception as token_error:
            logging.error(f"Token refresh failed for user ID {user_id}: {token_error}")
            return render_template('error.html', error="Session expired. Please log in again.")

        # ---------------------------------------------------------------------
        # STEP C: Retrieve user data from Firebase
        # ---------------------------------------------------------------------
        user_data = None
        for _ in range(2):  # attempt a retry if needed
            try:
                user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
                if user_data:
                    break
            except Exception as data_error:
                logging.warning(f"Retrying Firebase fetch for user {user_id}: {data_error}")

        if not user_data:
            logging.error(f"No user data found in Firebase for user ID {user_id}")
            return render_template('error.html', error="Error retrieving user data. Contact support.")

        logging.info(f"✅ FREE ACCESS granted to /contracts for user {user_id} - Contract Radar Maximizer is completely free!")

        # ---------------------------------------------------------------------
        # STEP E: Original Contracts Logic (UNCHANGED)
        # ---------------------------------------------------------------------
        user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")

        cs_name = None
        top_matches = []
        filtered_bids = []
        unique_categories = set()

        # Attempt to get the name of the uploaded capability statement (PDF)
        for filename in os.listdir(user_uploads_dir):
            if filename.lower().endswith('.pdf'):
                cs_name = filename
                break

        # Choose the matches file:
        # Prioritize matches.csv (updated by top-5 capability statement search)
        # over matches_SMART_SEARCH.csv
        rag_matches_file = os.path.join(user_uploads_dir, 'matches.csv')
        smart_search_matches_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
        if os.path.exists(rag_matches_file):
            matches_file_path = rag_matches_file
        elif os.path.exists(smart_search_matches_file):
            matches_file_path = smart_search_matches_file
        else:
            matches_file_path = None

        # Load top matches (limit to top 5) if a matches file exists
        if matches_file_path:
            try:
                with open(matches_file_path, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    top_matches = sorted(
                        list(reader),
                        key=lambda x: float(x.get('Similarity_Score', '0').replace('%', '').strip()),
                        reverse=True
                    )[:5]
            except Exception as e:
                app.logger.error(f"Error loading matches file: {matches_file_path}. Error: {e}")
                top_matches = []

        # Load all bids from embedded_bids.csv
        embedded_bids_file = os.path.join(user_uploads_dir, 'embedded_bids.csv')
        if os.path.exists(embedded_bids_file):
            try:
                with open(embedded_bids_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    embedded_bids = list(reader)
                    for bid in embedded_bids:
                        if bid.get('Category'):
                            unique_categories.add(bid['Category'])
                    filtered_bids = embedded_bids
            except Exception as e:
                app.logger.error(f"Error loading embedded_bids.csv: {e}", exc_info=True)
                embedded_bids = []

        # Optionally, apply filters based on URL query parameters
        budget_filter = request.args.get('budget')
        category_filter = request.args.get('category')
        due_date_filter = request.args.get('due_date')
        match_percentage_filter = request.args.get('match_percentage')

        if budget_filter:
            min_budget, max_budget = map(float, budget_filter.split('-'))
            filtered_bids = [
                bid for bid in filtered_bids
                if budget_in_range(bid.get('Budget'), min_budget, max_budget)
            ]

        if category_filter:
            filtered_bids = [bid for bid in filtered_bids if bid.get('Category') == category_filter]

        if due_date_filter:
            def is_due_in_range(due_date_str, days):
                try:
                    bid_due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
                    end_date = datetime.now() + timedelta(days=days)
                    return bid_due_date <= end_date
                except ValueError:
                    return False

            if due_date_filter == "open_until_contracted":
                filtered_bids = [bid for bid in filtered_bids if bid.get('Due Date') == "Open Until Contracted"]
            elif due_date_filter != "all":
                days = int(due_date_filter)
                filtered_bids = [bid for bid in filtered_bids if is_due_in_range(bid.get('Due Date'), days)]

        if match_percentage_filter:
            min_match, max_match = map(float, match_percentage_filter.split('-'))
            filtered_bids = [
                bid for bid in filtered_bids
                if percentage_in_range(bid.get('Match_Percentage', '0'), min_match, max_match)
            ]

        return render_template(
            'contracts.html',
            cs_name=cs_name if cs_name else 'No file uploaded',
            matches=top_matches,
            embedded_bids=filtered_bids,
            categories=sorted(unique_categories)
        )

    except Exception as e:
        logging.error(f"Unexpected error in /contracts route: {e}", exc_info=True)
        return render_template('error.html', error="An unexpected error occurred in /contracts.")








#contracts for rag and smart search 
@app.route('/contractsSmartSearch', methods=['GET'])
def ContractsSmartSearch():
    if 'user' not in session:
        return redirect(url_for('Login'))

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")

    # Initialize variables for matches and uploaded capability statement
    cs_name = None
    top_matches = []
    filtered_bids = []
    unique_categories = set()

    # Get the name of the last uploaded capability statement
    for filename in os.listdir(user_uploads_dir):
        if filename.endswith('.pdf'):
            cs_name = filename
            break

    # Load matches from `matches_SMART_SEARCH.csv` if it exists
    smart_search_matches_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
    rag_matches_file = os.path.join(user_uploads_dir, 'matches.csv')

    if os.path.exists(smart_search_matches_file):
        matches_file_path = smart_search_matches_file
        cs_name = "Smart Search Results"
    elif os.path.exists(rag_matches_file):
        matches_file_path = rag_matches_file
    else:
        matches_file_path = None

    # Load matches.csv for top matches if a matches file exists
    if matches_file_path:
        try:
            with open(matches_file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                top_matches = sorted(
                    list(reader),
                    key=lambda x: float(x.get('Similarity_Score', '0').replace('%', '').strip()),
                    reverse=True
                )[:5]  # Limit to top 5 matches
        except Exception as e:
            app.logger.error(f"Error loading matches file: {matches_file_path}. Error: {e}")
            top_matches = []

    # Load all bids from `embedded_bids.csv`
    embedded_bids_file = os.path.join(user_uploads_dir, 'embedded_bids.csv')

    if os.path.exists(embedded_bids_file):
        try:
            with open(embedded_bids_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                embedded_bids = list(reader)
                for bid in embedded_bids:
                    if bid.get('Category'):
                        unique_categories.add(bid['Category'])
                filtered_bids = embedded_bids
        except Exception as e:
            app.logger.error(f"Error loading embedded_bids.csv: {e}", exc_info=True)
            embedded_bids = []

    # Apply filters to embedded bids if requested
    budget_filter = request.args.get('budget')
    category_filter = request.args.get('category')
    due_date_filter = request.args.get('due_date')
    match_percentage_filter = request.args.get('match_percentage')

    if budget_filter:
        min_budget, max_budget = map(float, budget_filter.split('-'))
        filtered_bids = [bid for bid in filtered_bids if budget_in_range(bid.get('Budget'), min_budget, max_budget)]

    if category_filter:
        filtered_bids = [bid for bid in filtered_bids if bid.get('Category') == category_filter]

    if due_date_filter:
        def is_due_in_range(due_date_str, days):
            try:
                bid_due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
                end_date = datetime.now() + timedelta(days=days)
                return bid_due_date <= end_date
            except ValueError:
                return False

        if due_date_filter == "open_until_contracted":
            filtered_bids = [bid for bid in filtered_bids if bid.get('Due Date') == "Open Until Contracted"]
        elif due_date_filter != "all":
            days = int(due_date_filter)
            filtered_bids = [bid for bid in filtered_bids if is_due_in_range(bid.get('Due Date'), days)]

    if match_percentage_filter:
        min_match, max_match = map(float, match_percentage_filter.split('-'))
        filtered_bids = [
            bid for bid in filtered_bids
            if percentage_in_range(bid.get('Match_Percentage', '0'), min_match, max_match)
        ]

    # Render contracts.html with all necessary data
    return render_template(
        'contractsSmartSearch.html',
        cs_name=cs_name if cs_name else 'No file uploaded',
        matches=top_matches,
        embedded_bids=filtered_bids,
        categories=sorted(unique_categories)
    )









#contracts for rag and smart search 
# contracts for RAG and SMART search
@app.route('/contractsAll', methods=['GET'])
def ContractsAll():
    if 'user' not in session:
        return redirect(url_for('Login'))

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")

    # Initialize variables for matches and uploaded capability statement
    cs_name = None
    top_matches = []
    filtered_bids = []
    unique_categories = set()
    unique_industries = set()
    unique_organizations = set()
    unique_departments = set()  # FIXED: Departments were not being populated

    # Get the name of the last uploaded capability statement
    for filename in os.listdir(user_uploads_dir):
        if filename.endswith('.pdf'):
            cs_name = filename
            break

    # Load all bids from `embedded_bids.csv`
    embedded_bids_file = os.path.join(user_uploads_dir, 'embedded_bids.csv')

    if os.path.exists(embedded_bids_file):
        try:
            with open(embedded_bids_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                embedded_bids = list(reader)
                for bid in embedded_bids:
                    if bid.get('Category'):
                        unique_categories.add(bid['Category'])
                    if bid.get('Industry'):
                        unique_industries.add(bid['Industry'])
                    if bid.get('Organization'):
                        unique_organizations.add(bid['Organization'])
                    if bid.get('Department'):  # FIXED: Now extracting departments
                        unique_departments.add(bid['Department'])
                filtered_bids = embedded_bids
        except Exception as e:
            app.logger.error(f"Error loading embedded_bids.csv: {e}", exc_info=True)
            embedded_bids = []

    # Apply filters to embedded bids if requested
    budget_filter = request.args.get('budget')
    category_filter = request.args.get('category')
    due_date_filter = request.args.get('due_date')
    match_percentage_filter = request.args.get('match_percentage')
    industry_filter = request.args.get('industry')
    organization_filter = request.args.get('organization')
    department_filter = request.args.get('department')

    if budget_filter:
        min_budget, max_budget = map(float, budget_filter.split('-'))
        filtered_bids = [bid for bid in filtered_bids if budget_in_range(bid.get('Budget'), min_budget, max_budget)]

    if category_filter:
        filtered_bids = [bid for bid in filtered_bids if bid.get('Category') == category_filter]

    if due_date_filter:
        def is_due_in_range(due_date_str, days):
            try:
                bid_due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
                end_date = datetime.now() + timedelta(days=days)
                return bid_due_date <= end_date
            except ValueError:
                return False

        if due_date_filter == "open_until_contracted":
            filtered_bids = [bid for bid in filtered_bids if bid.get('Due Date') == "Open Until Contracted"]
        elif due_date_filter != "all":
            days = int(due_date_filter)
            filtered_bids = [bid for bid in filtered_bids if is_due_in_range(bid.get('Due Date'), days)]

    if match_percentage_filter:
        min_match, max_match = map(float, match_percentage_filter.split('-'))
        filtered_bids = [
            bid for bid in filtered_bids
            if percentage_in_range(bid.get('Match_Percentage', '0'), min_match, max_match)
        ]

    if industry_filter:
        filtered_bids = [bid for bid in filtered_bids if bid.get('Industry') == industry_filter]

    if organization_filter:
        filtered_bids = [bid for bid in filtered_bids if bid.get('Organization') == organization_filter]

    if department_filter:
        filtered_bids = [bid for bid in filtered_bids if bid.get('Department') == department_filter]

    # Render contracts.html with all necessary data
    return render_template(
        'contractsAll.html',
        cs_name=cs_name if cs_name else 'No file uploaded',
        matches=top_matches,
        embedded_bids=filtered_bids,
        categories=sorted(unique_categories),
        industries=sorted(unique_industries),
        organizations=sorted(unique_organizations),
        departments=sorted(unique_departments)  # FIXED: Passing the correct variable
    )






















# Helper function to check if the due date is within the range
def is_due_in_range(due_date_str, days):
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        if days == 0:
            return True  # 'All upcoming' selected
        return due_date <= datetime.now() + timedelta(days=days)
    except ValueError:
        return False






#UPDATED ON 2/20
#Updated on 3/4/2025 with zirong's changes
@app.route('/viewcontractdetails', methods=['GET'])
def Viewcontractdetails():
    hash_value_received = request.args.get('hash_value')
    contract_details = None
    user = session.get('user')
    if not user:
        return redirect(url_for('Login'))
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    user_uploads_dir = os.path.abspath(user_data.get('uploads_dir', 'uploads/'))
    app.logger.debug(f"用户上传目录: {user_uploads_dir}")
    matches_file = os.path.join(user_uploads_dir, 'matches.csv')
    if os.path.exists(matches_file):
        try:
            with open(matches_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                app.logger.debug(f"CSV 列名: {reader.fieldnames}")
                found_matches = 0
                for row in reader:
                    # 清理键名（以防存在空格问题）
                    row = {k.strip(): v for k, v in row.items()}
                    # 提取 Detail_Link 和 Bid_Number（兼容不同的列名）
                    detail_link = row.get('Detail Link') or row.get('Detail_Link') or '#'
                    bid_number = row.get('Bid Number') or row.get('Bid_Number') or ''
                    # 生成 hash 值
                    hash_input = f"{detail_link}{bid_number}"
                    computed_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
                    app.logger.debug(f"计算哈希值: {computed_hash}, 合同编号: {bid_number}")
                    found_matches += 1
                    if computed_hash == hash_value_received:
                        contract_details = row
                        app.logger.info(f"找到匹配的合同: {bid_number}")
                        break
                app.logger.info(f"共检查了 {found_matches} 个合同")
        except Exception as e:
            app.logger.error(f"读取 CSV 文件错误: {str(e)}", exc_info=True)
    else:
        app.logger.warning(f"Matches 文件不存在: {matches_file}")
    # 同样可以添加 embedded_bids.csv 的查找逻辑（如果需要）
    if contract_details:
        hash_value_received = request.args.get('hash_value')
        # 确保字段存在，添加缺少的字段
        for field in ['Bid_Description', 'Bid Description']:
            if field not in contract_details:
                app.logger.warning(f"合同缺少 '{field}' 字段")
                if 'Bid_Description' not in contract_details and 'Bid Description' not in contract_details:
                    contract_details['Bid Description'] = 'No description available'
        return render_template('viewcontractdetails.html', contract=contract_details, hash_value_received=hash_value_received)
    else:
        app.logger.error(f"未找到哈希值 {hash_value_received} 对应的合同")
        return "Contract details not found", 404







#Contracts all PAGE  ROUTE FUNCTION
@app.route('/home2', methods=['GET'])
def Hom():
    return render_template('home2.html')



#login
 
# UPDATED 2/25 
@app.route('/login', methods=['GET', 'POST'])
def Login():
    session.clear()  # Clear any existing session data

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        app.logger.info("✅ FREE ACCESS - Skipping reCAPTCHA validation for Contract Radar Maximizer free users")
        app.logger.info(f"🔐 Login attempt for email: {email}")
        
        try:
            # Authenticate user with Firebase
            user = auth.sign_in_with_email_and_password(email, password)
            local_id = user['localId']
            refreshed_user = auth.refresh(user['refreshToken'])

            # Set session data for the authenticated user
            session['user'] = {
                'localId': local_id,
                'idToken': refreshed_user['idToken'],
                'email': email,
                'refreshToken': refreshed_user['refreshToken']
            }

            # Retrieve user data from Firebase
            user_data = db.child("users").child(local_id).get(refreshed_user['idToken']).val()
            
            # Handle case where user exists in Firebase Auth but not in database
            if user_data is None:
                app.logger.warning(f"User {email} exists in Firebase Auth but not in database. Creating default user data.")
                default_user_data = {
                    "email": email,
                    "account_type": "CONTRACT_RADAR_MAXIMIZER_ESSENTIALS",
                    "subscription_end_date": "9999-12-31",
                    "is_stripe_customer": False,
                    "first_name": email.split('@')[0],
                    "last_name": "",
                    "company": "",
                    "username": email.split('@')[0],
                    "credits_balance": 100,
                    "credits_used": 0,
                    "last_credit_update": datetime.now().isoformat(),
                    "credit_purchase_history": []
                }
                
                db.child("users").child(local_id).set(default_user_data, refreshed_user['idToken'])
                user_data = default_user_data
                app.logger.info(f"Created default user data for {email}")
            
            account_type = user_data.get('account_type', 'CONTRACT_RADAR_MAXIMIZER_ESSENTIALS')
            subscription_end_date = user_data.get('subscription_end_date', '9999-12-31')
            is_stripe_customer = user_data.get('is_stripe_customer', False)  
            stripe_customer_id = user_data.get('stripe_customer_id', None)

            app.logger.info(f"Retrieved account_type: {account_type}, subscription_end_date: {subscription_end_date}, is_stripe_customer: {is_stripe_customer}")

            session['is_subscriber'] = True  # Grant full access to all users
            session['is_logged_in'] = True
            app.logger.info(f"✅ User logged in successfully - FREE ACCESS granted to {email}")
            return redirect(url_for('Welcome'))
        
        except Exception as e:
            app.logger.error(f"❌ Login error for {email}: {e}")
            app.logger.error(f"Login error type: {type(e)}")
            app.logger.error(f"Login error args: {e.args if hasattr(e, 'args') else 'No args'}")
            
            error_message = "Login failed. Check your email or password and try again."
            if 'EMAIL_NOT_FOUND' in str(e):
                error_message = "This email is not registered. Please sign up first."
                app.logger.info(f"✅ EMAIL_NOT_FOUND error handled for {email}")
            elif 'INVALID_PASSWORD' in str(e) or 'INVALID_LOGIN_CREDENTIALS' in str(e):
                error_message = "Incorrect email or password. Please try again."
                app.logger.info(f"✅ INVALID_LOGIN_CREDENTIALS error handled for {email}")
            elif 'USER_DISABLED' in str(e):
                error_message = "This account has been disabled. Contact support for assistance."
                app.logger.info(f"✅ USER_DISABLED error handled for {email}")
            elif 'INVALID_EMAIL' in str(e):
                error_message = "Invalid email format. Please check your email address."
                app.logger.info(f"✅ INVALID_EMAIL error handled for {email}")
            elif 'TOO_MANY_ATTEMPTS_TRY_LATER' in str(e):
                error_message = "Too many failed login attempts. Please try again later."
                app.logger.info(f"✅ TOO_MANY_ATTEMPTS error handled for {email}")
            else:
                app.logger.error(f"❌ Unhandled login error for {email}: {str(e)}")
                error_message = f"Login failed: {str(e)}"
            
            return render_template('login.html', error=error_message, RECAPTCHA_SITE_KEY=RECAPTCHA_SITE_KEY)
    
    return render_template('login.html', RECAPTCHA_SITE_KEY=RECAPTCHA_SITE_KEY)









#BID SEARCH FUNCTION 
def create_user_directory(user_id):
    try:
        user_uploads_dir = os.path.join(uploads_dir, f'bid_uploads_{user_id}')
        if not os.path.exists(user_uploads_dir):
            os.makedirs(user_uploads_dir)
            # Copy embedded CSV file if it exists
            if os.path.exists(embedded_csv_file):
                shutil.copy(embedded_csv_file, user_uploads_dir) #ADDING BIDS IN USER FOLDER 
            else:
                app.logger.warning(f"embedded_csv_file not found: {embedded_csv_file}")
        return user_uploads_dir
    except Exception as e:
        app.logger.error(f"Error in creating user directory: {e}")
        raise e




# Load the price ID for CS Builder from .env
CS_BUILDER_PRICE_ID = os.getenv("CORAMA_CS_BUILDER_API")



# STRIPE Prices Mapping
# Stripe Prices Mapping
prices = {
    'CORAMA_ESSENTIALS': {
        'weekly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_WEEKLY'),
        'monthly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_MONTHLY'),
        'yearly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_YEARLY'),
    },
    'CONTRACT_RADAR_MAXIMIZER_ESSENTIALS': {
        'weekly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_WEEKLY'),
        'monthly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_MONTHLY'),
        'yearly': os.getenv('CORAMA_ESSENTIALS_STRIPE_API_YEARLY'),
    },
    'CORAMA_SUPPLY_CHAIN_VISIBILITY': {  # Tier 2 Product
        'monthly': os.getenv('CORAMA_SUPPLY_CHAIN_STRIPE_API_MONTHLY'),
        'yearly': os.getenv('CORAMA_SUPPLY_CHAIN_STRIPE_API_YEARLY')
    },
    'CONTRACT_RADAR_MAXIMIZER_SUPPLY_CHAIN_VISIBILITY': {
        'monthly': os.getenv('CORAMA_SUPPLY_CHAIN_STRIPE_API_MONTHLY'),
        'yearly': os.getenv('CORAMA_SUPPLY_CHAIN_STRIPE_API_YEARLY')
    },
    'TRUSTED_PARTNER': {  # Tier 3 Product
        'monthly': os.getenv('CORAMA_TRUSTED_PARTNER_STRIPE_API_MONTHLY'),
        'yearly': os.getenv('CORAMA_TRUSTED_PARTNER_STRIPE_API_YEARLY')
    }
}



def send_welcome_email(email, display_name):
    app.logger.info(f"📤 Attempting to send welcome email to {email}...")

    sender_email = os.getenv('EMAIL_GOOGLE_USER')
    sender_password = os.getenv('EMAIL_GOOGLE_PASS')
    subject = "🎉 Welcome To Contract Radar Maximizer!"

    # HTML Email Body
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; color: #333; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #2A85FF; text-align: center;">Welcome To <span style="color: #111;">Contract Radar Maximizer</span> 🎉</h2>
          <p>Hi <strong>{display_name}</strong>,</p>
          <p>We're thrilled to welcome you aboard the Contract Radar Maximizer platform!</p>
          <p>Don't miss any opportunities, log in now!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://contractradarmaxmizer.com/login" style="background-color: #2A85FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">🌐 Login Here</a>
          </div>
          <p style="font-size: 0.9em; color: #888;">If you have any questions, just reply to this email — we're here to help!</p>
          <p style="text-align: center; margin-top: 40px; font-size: 0.85em; color: #aaa;">&copy; 2025 Contract Radar Maximizer</p>
        </div>
      </body>
    </html>
    """

    try:
        # Create MIME message
        msg = MIMEMultipart("alternative")
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = email

        # Attach HTML part
        mime_text = MIMEText(html_body, "html")
        msg.attach(mime_text)

        app.logger.debug("📧 Styled HTML email composed successfully.")

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            app.logger.debug("🔐 Connecting to SMTP server...")
            server.login(sender_email, sender_password)
            app.logger.debug("🔐 SMTP login successful.")
            server.sendmail(sender_email, email, msg.as_string())

        app.logger.info(f"✅ Professional welcome email sent to {email}")
    except Exception as e:
        app.logger.exception(f"❌ ERROR sending welcome email to {email}: {e}")
#SIGNUP FIX 3/25 

 
# ✅ Get reCAPTCHA keys
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")
RECAPTCHA_SITE_KEY = os.getenv("RECAPTCHA_SITE_KEY")

# ✅ Log reCAPTCHA and Firebase Status
app.logger.info(f"🔍 Loaded RECAPTCHA_SECRET_KEY: {'✔ Loaded' if RECAPTCHA_SECRET_KEY else '❌ NOT LOADED'}")
app.logger.info(f"🔍 Loaded RECAPTCHA_SITE_KEY: {RECAPTCHA_SITE_KEY if RECAPTCHA_SITE_KEY else '❌ NOT LOADED'}")
app.logger.info(f"🔍 Firebase Initialized: {'✔ Successful' if firebase else '❌ Failed'}")


@app.route('/signup', methods=['GET', 'POST'])
def Signup():
    if request.method == 'POST':
        app.logger.info("📌 Received a POST request on /signup")

        # ✅ Log Incoming Form Data
        app.logger.debug(f"📩 Form Data Received: {request.form}")

        app.logger.info("✅ FREE ACCESS - Skipping reCAPTCHA validation for Contract Radar Maximizer free users")

        # ✅ Get User Data from Form
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        company = request.form.get('company')
        email = request.form.get('email')
        password = request.form.get('password')
        username = request.form.get('username')
        account_type = request.form.get('account_type', 'CONTRACT_RADAR_MAXIMIZER_ESSENTIALS')
        billing_period = request.form.get('billing_period', 'free')
        subscription_end_date = '9999-12-31'  # Permanent free access
        join_directory = request.form.get('join_directory') == 'on'  # Checkbox value

        app.logger.debug(f"📌 User Info: {first_name} {last_name} | {email} | {company}")

        if not email or not password:
            app.logger.error("❌ ERROR: Email or Password missing!")
            return render_template('signup.html', error="Please provide both email and password.", RECAPTCHA_SITE_KEY=RECAPTCHA_SITE_KEY)

        try:
            # ✅ Create Firebase User
            app.logger.info(f"👤 Creating user in Firebase: {email}")
            user = auth.create_user_with_email_and_password(email, password)
            user_id = user.get('localId')
            user_logged_in = auth.sign_in_with_email_and_password(email, password)

            app.logger.info(f"✅ Firebase user created successfully! User ID: {user_id}")

            # ✅ Send Welcome Email
            app.logger.info("📨 Calling send_welcome_email function...")
            send_welcome_email(email, email)
            app.logger.info("📨 send_welcome_email function execution completed.")

            # ✅ Store User Data in Session
            session['user_data'] = {
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
                "email": email,
                "username": username,
                "account_type": account_type,
                "billing_period": billing_period,
                "subscription_end_date": subscription_end_date
            }

            app.logger.debug(f"💾 Session Data Stored: {session['user_data']}")

            # ✅ Store User Data in Firebase Database
            db.child("users").child(user_id).set({
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
                "email": email,
                "username": username,
                "account_type": account_type,
                "subscription_end_date": subscription_end_date,
                "uploads_dir": create_user_directory(user_id),
                "credits_balance": 100,
                "credits_used": 0,
                "directory_listed": join_directory
            }, user_logged_in['idToken'])
            
            if join_directory:
                try:
                    db.child("corama_directory").child(user_id).set({
                        "company": company,
                        "contact_name": f"{first_name} {last_name}",
                        "email": email,
                        "services": "",  # To be filled in directory profile
                        "description": "",  # To be filled in directory profile
                        "phone": "",  # To be filled in directory profile
                        "website": "",  # To be filled in directory profile
                        "listed": True,
                        "created_at": datetime.now().isoformat()
                    }, user_logged_in['idToken'])
                    app.logger.info(f"✅ User {user_id} added to CORAMA Directory")
                except Exception as e:
                    app.logger.error(f"❌ Failed to add user to directory: {e}")

            app.logger.info("✅ User successfully added to Firebase Database!")

            return redirect(url_for('confirm_terms'))

        except Exception as e:
            app.logger.exception(f"❌ ERROR: Signup failed for email {email}: {e}")
            app.logger.error(f"❌ ERROR TYPE: {type(e)}")
            app.logger.error(f"❌ ERROR ARGS: {e.args if hasattr(e, 'args') else 'No args'}")
            app.logger.error(f"❌ ERROR STRING: {str(e)}")

            error_message = "An unexpected error occurred. Please try again."

            error_str = str(e).upper()
            if 'EMAIL_EXISTS' in error_str:
                error_message = "This email is already registered. Please log in instead."
                app.logger.info(f"✅ EMAIL_EXISTS error handled for {email}")
            elif 'INVALID_EMAIL' in error_str:
                error_message = "Invalid email format. Please check your email address."
                app.logger.info(f"✅ INVALID_EMAIL error handled for {email}")
            elif 'WEAK_PASSWORD' in error_str:
                error_message = "Password is too weak. Please choose a stronger password (minimum 6 characters)."
                app.logger.info(f"✅ WEAK_PASSWORD error handled for {email}")
            elif 'INVALID_PASSWORD' in error_str:
                error_message = "Invalid password format. Please check your password."
                app.logger.info(f"✅ INVALID_PASSWORD error handled for {email}")
            elif 'TOO_MANY_ATTEMPTS_TRY_LATER' in error_str:
                error_message = "Too many failed attempts. Please try again later."
                app.logger.info(f"✅ TOO_MANY_ATTEMPTS error handled for {email}")
            else:
                app.logger.error(f"❌ UNHANDLED SIGNUP ERROR for {email}: {str(e)}")
                if "400 Client Error" in str(e):
                    error_message = "Account creation failed. Please check your information and try again."
                else:
                    error_message = "An unexpected error occurred during signup. Please try again."

            return render_template('signup.html', error=error_message, RECAPTCHA_SITE_KEY=RECAPTCHA_SITE_KEY)

    return render_template('signup.html', RECAPTCHA_SITE_KEY=RECAPTCHA_SITE_KEY)

#UPDATED 3/13/25
@app.route('/confirm_terms', methods=['GET', 'POST'])
def confirm_terms():
    if request.method == 'POST':
        # Retrieve user data from session
        user_data = session.get('user_data')

        if not user_data:
            return redirect(url_for('signup'))

        try:
            user_id = user_data['user_id']
            
            db.child("users").child(user_id).update({
                "account_type": user_data['account_type'],
                "subscription_end_date": "9999-12-31",
                "uploads_dir": create_user_directory(user_id),
            }, session['user']['idToken'])
            
            app.logger.info(f"✅ FREE ACCESS granted to user {user_id} - Account created successfully!")
            return redirect(url_for('Welcome'))

        except Exception as e:
            return render_template('confirm_terms.html', error=str(e))

    # Render the terms confirmation page on GET

    return render_template('confirm_terms.html')


#updated 3/4/25
@app.route('/signupCSBuilder', methods=['GET', 'POST'])
def signupCSBuilder():
    # Clear unrelated session data to ensure clean state
    session.pop('user', None)
    session.pop('form_data', None)
    session.pop('file_paths', None)

    if request.method == 'POST':
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        company = request.form.get('company')
        email = request.form.get('email')
        password = request.form.get('password')
        username = request.form.get('username')

        account_type = "CS_BUILDER_PRODUCT"
        subscription_end_date = "9999-12-31"

        if not email or not password:
            return render_template('signupCSBuilder.html', error="Please provide both email and password.")

        try:
            # Create user in Firebase Auth
            user = auth.create_user_with_email_and_password(email, password)
            user_id = user.get('localId')
            user_logged_in = auth.sign_in_with_email_and_password(email, password)

            data = {
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
                "email": email,
                "username": username,
                "account_type": account_type,
                "subscription_end_date": subscription_end_date,
            }
            db.child("users").child(user_id).set(data, user_logged_in['idToken'])

            stripe_customer = stripe.Customer.create(
                email=email,
                description=f"{first_name} {last_name} from {company}"
            )

            app.logger.info("📨 Calling send_welcome_email function...")
            send_welcome_email(email, email)
            app.logger.info("📨 send_welcome_email function execution completed.")


            db.child("users").child(user_id).update(
                {"stripe_customer_id": stripe_customer['id']},
                user_logged_in['idToken']
            )

            session['user'] = {
                'localId': user_id,
                'idToken': user_logged_in['idToken'],
                'email': email,
                'refreshToken': user_logged_in['refreshToken'],
            }

            logging.info(f"CSBuilder user {user_id} signed up and logged in successfully.")
            return redirect(url_for('form'))

        except Exception as e:
            logging.exception(f"SignupCSBuilder error for {email}: {e}")

            error_message = "An unexpected error occurred during signup. Please try again."

            if hasattr(e, 'args') and len(e.args) > 0:
                try:
                    error_detail = e.args[0]
                    if isinstance(error_detail, str) and 'EMAIL_EXISTS' in error_detail:
                        error_message = "The email you entered is already registered. Please log in instead."
                    elif isinstance(error_detail, dict):
                        firebase_error = error_detail.get('error', {}).get('message', '')
                        if firebase_error == "EMAIL_EXISTS":
                            error_message = "The email you entered is already registered. Please log in instead."
                        elif firebase_error == "INVALID_EMAIL":
                            error_message = "The email format is invalid. Please check your email."
                        elif firebase_error == "WEAK_PASSWORD":
                            error_message = "Password is too weak. Please choose a stronger password."
                except Exception as parse_error:
                    logging.warning(f"Failed to parse Firebase error: {parse_error}")

            return render_template('signupCSBuilder.html', error=error_message)

    return render_template('signupCSBuilder.html', firebase_config=config)







# updated 3/17/25 - Permanent Stripe Validation Fix
@app.route('/welcome', methods=['GET'])
def Welcome():
    try:
        # Ensure Firebase authentication is fully established
        user = auth.current_user
        if not user:
            logging.warning("No authenticated user found. Redirecting to login.")
            return redirect(url_for('Login'))

        user_id = user['localId']
        email = user.get('email', '').strip().lower()
        logging.info(f"Authenticated user ID: {user_id}, Email: {email}")

        # 🔄 Ensure a fresh Firebase token before querying data
        try:
            user_logged_in = auth.refresh(user['refreshToken'])
            logging.info(f"✅ Token refreshed for user {user_id}")
        except Exception as token_error:
            logging.error(f"❌ Token refresh failed for {user_id}: {token_error}")
            return render_template('error.html', error="Session expired. Please log in again.")

        # 🔍 Retrieve user data from Firebase
        try:
            user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
            if not user_data:
                logging.error(f"❌ No user data found for {user_id}")
                return render_template('error.html', error="User data missing. Contact support.")
            logging.info(f"✅ Retrieved user data for {user_id}")

        except Exception as data_error:
            logging.error(f"❌ Firebase data fetch failed for {user_id}: {data_error}")
            return render_template('error.html', error="Error retrieving user data. Contact support.")

        # Extract necessary user details
        company_name = user_data.get('company', 'No Company')
        first_name = user_data.get('first_name', 'User')
        
        from csv_analytics import get_dashboard_metrics
        analytics_data = get_dashboard_metrics()
        logging.info(f"📊 Analytics data loaded: {analytics_data}")
        
        page = request.args.get('page', 1, type=int)
        items_per_page = 10  # Dashboard shows fewer items than smartsearch for better UX
        
        # Contract Radar Maximizer is now completely FREE - no Stripe validation needed
        logging.info(f"✅ FREE ACCESS granted to {user_id} - Contract Radar Maximizer is completely free!")
        return render_template('welcome.html', 
                             company_name=company_name, 
                             first_name=first_name,
                             user_data=user_data,
                             analytics=analytics_data,
                             current_page=page,
                             items_per_page=items_per_page)

    except Exception as e:
        logging.exception(f"❌ Unexpected error in /welcome: {e}")
        return render_template('error.html', error="Unexpected error occurred. Contact support.")









@app.route('/api/contracts', methods=['GET'])
def get_contracts_api():
    """API endpoint to get contract data for the dashboard with pagination"""
    try:
        import pandas as pd
        csv_path = os.path.join(os.path.dirname(__file__), 'Scraping_demo_results.csv')
        df = pd.read_csv(csv_path)
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        items_per_page = 10
        
        total_contracts = len(df)
        total_pages = (total_contracts + items_per_page - 1) // items_per_page
        start = (page - 1) * items_per_page
        end = start + items_per_page
        
        # Get paginated contracts
        paginated_df = df.iloc[start:end]
        contracts = paginated_df.to_dict('records')
        
        return jsonify({
            "contracts": contracts,
            "total_contracts": total_contracts,
            "current_page": page,
            "total_pages": total_pages
        })
    except Exception as e:
        logging.error(f"Error loading contracts: {e}")
        return jsonify({
            "contracts": [
                {
                    "bid_name": "City Infrastructure Improvement Project",
                    "category": "Construction",
                    "due_date": "2025-10-15",
                    "status": "active",
                    "bid_number": "BID-2025-001",
                    "detail_link": "https://example.com/contract"
                }
            ],
            "total_contracts": 1,
            "current_page": 1,
            "total_pages": 1
        })

@app.route('/dashboard_search', methods=['POST'])
def dashboard_search():
    """Search contracts for dashboard with real-time filtering and analytics update"""
    try:
        # Ensure session is populated from auth.current_user if needed
        if not ensure_session_from_auth():
            return jsonify({"success": False, "message": "User not logged in."}), 401

        data = request.get_json(force=True) or {}
        user_query = data.get('query', '').strip()
        page = data.get('page', 1)
        items_per_page = 10

        if not user_query:
            import pandas as pd
            csv_path = os.path.join(os.path.dirname(__file__), 'Scraping_demo_results.csv')
            df = pd.read_csv(csv_path)
            
            total_contracts = len(df)
            total_pages = (total_contracts + items_per_page - 1) // items_per_page
            start = (page - 1) * items_per_page
            end = start + items_per_page
            
            paginated_df = df.iloc[start:end]
            contracts = paginated_df.to_dict('records')
            
            from csv_analytics import analyze_contract_data
            analytics = analyze_contract_data()
            
            return jsonify({
                "success": True,
                "contracts": contracts,
                "total_contracts": total_contracts,
                "current_page": page,
                "total_pages": total_pages,
                "analytics": analytics
            })

        if not vector_store:
            logging.warning("Vector store not initialized, falling back to basic text search")
            import pandas as pd
            csv_path = os.path.join(os.path.dirname(__file__), 'Scraping_demo_results.csv')
            df = pd.read_csv(csv_path)
            
            if user_query:
                mask = (df['bid_name'].str.contains(user_query, case=False, na=False) |
                        df['category'].str.contains(user_query, case=False, na=False) |
                        df['bid_description'].str.contains(user_query, case=False, na=False))
                df = df[mask]
            
            total_contracts = len(df)
            total_pages = (total_contracts + items_per_page - 1) // items_per_page
            start = (page - 1) * items_per_page
            end = start + items_per_page
            
            paginated_df = df.iloc[start:end]
            contracts = paginated_df.to_dict('records')
            
            category_counts = df['category'].value_counts().to_dict()
            status_counts = df['status'].value_counts().to_dict()
            open_contracts = status_counts.get('open', 0)
            
            category_diversity = len(category_counts)
            win_probability = min(85, max(55, (category_diversity * 5) + (open_contracts / total_contracts * 20))) if total_contracts > 0 else 0
            
            high_score_categories = ['Construction', 'Information Technology', 'Professional Services']
            high_score_contracts = df[
                df['category'].str.contains('|'.join(high_score_categories), case=False, na=False)
            ]
            high_score_count = len(high_score_contracts)

            analytics = {
                'total_contracts': total_contracts,
                'category_distribution': category_counts,
                'status_distribution': status_counts,
                'win_probability': round(win_probability, 1),
                'open_contracts': open_contracts,
                'upcoming_deadlines': 0,
                'high_score_opportunities': high_score_count
            }

            return jsonify({
                "success": True,
                "contracts": contracts,
                "total_contracts": total_contracts,
                "current_page": page,
                "total_pages": total_pages,
                "analytics": analytics
            })

        valid, msg = validate_query(user_query)
        if not valid:
            logging.warning(f"Invalid query: {msg}")
            return jsonify({"success": False, "message": msg}), 400

        user_query_embedding = generate_query_embedding(user_query)
        search_results = find_matches_with_query(
            query_embedding=user_query_embedding,
            bid_store=vector_store,
            top_k=10000
        )
        
        # Filter results with similarity >= 0.7
        filtered_results = [res for res in search_results if res.get('Similarity_Score', 0) >= 0.7]
        
        if not filtered_results:
            return jsonify({
                "success": True,
                "contracts": [],
                "total_contracts": 0,
                "current_page": 1,
                "total_pages": 1,
                "analytics": {
                    'total_contracts': 0,
                    'category_distribution': {},
                    'status_distribution': {},
                    'win_probability': 0,
                    'open_contracts': 0,
                    'upcoming_deadlines': 0,
                    'high_score_opportunities': 0
                }
            })

        total_contracts = len(filtered_results)
        total_pages = (total_contracts + items_per_page - 1) // items_per_page
        start = (page - 1) * items_per_page
        end = start + items_per_page
        paginated_contracts = filtered_results[start:end]

        import pandas as pd
        filtered_df = pd.DataFrame(filtered_results)
        
        category_counts = filtered_df['category'].value_counts().to_dict()
        status_counts = filtered_df['status'].value_counts().to_dict()
        open_contracts = status_counts.get('open', 0)
        
        category_diversity = len(category_counts)
        win_probability = min(85, max(55, (category_diversity * 5) + (open_contracts / total_contracts * 20)))
        
        high_score_categories = ['Construction', 'Information Technology', 'Professional Services']
        high_score_contracts = filtered_df[
            filtered_df['category'].str.contains('|'.join(high_score_categories), case=False, na=False)
        ]
        high_score_count = len(high_score_contracts)

        analytics = {
            'total_contracts': total_contracts,
            'category_distribution': category_counts,
            'status_distribution': status_counts,
            'win_probability': round(win_probability, 1),
            'open_contracts': open_contracts,
            'upcoming_deadlines': 0,
            'high_score_opportunities': high_score_count
        }

        return jsonify({
            "success": True,
            "contracts": paginated_contracts,
            "total_contracts": total_contracts,
            "current_page": page,
            "total_pages": total_pages,
            "analytics": analytics
        })

    except Exception as e:
        logging.error(f"Error in /dashboard_search: {e}", exc_info=True)
        return jsonify({"success": False, "message": "Error processing the search."}), 500

@app.route('/ai-assistant')
def ai_assistant_room():
    """AI Assistant room for bid response creation"""
    user = auth.current_user
    if not user:
        return redirect(url_for('Login'))
    
    contract_param = request.args.get('hash_value') or request.args.get('hash') or request.args.get('contract') or request.args.get('bid_number')
    contract_name = request.args.get('name')
    
    if not contract_param:
        return redirect('/welcome')
    
    # Determine if we have a hash_value or need to look up by bid_number
    contract_id = None  # This will be the hash_value
    bid_number = None
    
    # Check if the parameter looks like a hash (64 hex characters)
    if len(contract_param) == 64 and all(c in '0123456789abcdef' for c in contract_param.lower()):
        # It's already a hash_value
        contract_id = contract_param
    else:
        # It's a bid_number, we need to look up the contract and compute hash_value
        bid_number = contract_param
        user_id = user['localId']
        
        try:
            # Get user data to find uploads directory
            user_data = None
            if admin_initialized and admin_db:
                user_ref = admin_db.reference(f'users/{user_id}')
                user_data = user_ref.get()
            else:
                user_data = db.child("users").child(user_id).get(user['idToken']).val()
            
            if user_data:
                user_uploads_dir = user_data.get('uploads_dir', '')
                if user_uploads_dir and os.path.exists(user_uploads_dir):
                    matches_file = os.path.join(user_uploads_dir, 'matches.csv')
                    contract_found = False
                    
                    if os.path.exists(matches_file):
                        try:
                            with open(matches_file, 'r', encoding='utf-8') as file:
                                reader = csv.DictReader(file)
                                for row in reader:
                                    row = {k.strip(): v for k, v in row.items()}
                                    row_bid_number = row.get('Bid Number') or row.get('Bid_Number') or ''
                                    if row_bid_number == bid_number:
                                        # Found the contract, compute hash_value
                                        detail_link = row.get('Detail Link') or row.get('Detail_Link') or '#'
                                        hash_input = f"{detail_link}{row_bid_number}"
                                        contract_id = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
                                        if not contract_name:
                                            contract_name = row.get('Bid Name') or row.get('Bid_Name') or bid_number
                                        contract_found = True
                                        break
                        except Exception as e:
                            logging.error(f"Error reading matches.csv: {e}")
                    
                    # If not found in matches.csv, try matches_SMART_SEARCH.csv
                    if not contract_found:
                        smart_search_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
                        if os.path.exists(smart_search_file):
                            try:
                                with open(smart_search_file, 'r', encoding='utf-8') as file:
                                    reader = csv.DictReader(file)
                                    for row in reader:
                                        row = {k.strip(): v for k, v in row.items()}
                                        row_bid_number = row.get('Bid Number') or row.get('Bid_Number') or ''
                                        if row_bid_number == bid_number:
                                            detail_link = row.get('Detail Link') or row.get('Detail_Link') or '#'
                                            hash_input = f"{detail_link}{row_bid_number}"
                                            contract_id = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
                                            if not contract_name:
                                                contract_name = row.get('Bid Name') or row.get('Bid_Name') or bid_number
                                            contract_found = True
                                            break
                            except Exception as e:
                                logging.error(f"Error reading matches_SMART_SEARCH.csv: {e}")
                    
                    # If still not found, try demo dataset as fallback
                    if not contract_found:
                        demo_file = os.path.join(os.path.dirname(__file__), 'Scraping_demo_results.csv')
                        if os.path.exists(demo_file):
                            try:
                                with open(demo_file, 'r', encoding='utf-8') as file:
                                    reader = csv.DictReader(file)
                                    for row in reader:
                                        row = {k.strip(): v for k, v in row.items()}
                                        row_bid_number = row.get('Bid Number') or row.get('Bid_Number') or ''
                                        if row_bid_number == bid_number:
                                            detail_link = row.get('Detail Link') or row.get('Detail_Link') or '#'
                                            hash_input = f"{detail_link}{row_bid_number}"
                                            contract_id = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
                                            if not contract_name:
                                                contract_name = row.get('Bid Name') or row.get('Bid_Name') or bid_number
                                            contract_found = True
                                            break
                            except Exception as e:
                                logging.error(f"Error reading demo dataset: {e}")
                    
                    if not contract_found:
                        logging.error(f"Contract with bid_number {bid_number} not found in any dataset")
                        contract_id = bid_number
        except Exception as e:
            logging.error(f"Error looking up contract by bid_number: {e}")
            contract_id = bid_number
    
    if not contract_id:
        return redirect('/welcome')
    
    user_id = user['localId']
    current_credits = 0
    has_capability_statement = False
    capability_statement_filename = None
    company_name = None
    
    try:
        if admin_initialized and admin_db:
            user_ref = admin_db.reference(f'users/{user_id}')
            user_data = user_ref.get()
            
            if user_data:
                current_credits = user_data.get('credits_balance', 0)
                logging.info(f"✅ Admin SDK: Fetched credit balance for AI Assistant: {current_credits} credits")
                
                user_uploads_dir = user_data.get('uploads_dir', '')
                if user_uploads_dir and os.path.exists(user_uploads_dir):
                    try:
                        capability_statement = process_files_user_input(user_uploads_dir)
                        if capability_statement and \
                           capability_statement not in ['Not available', '[capability_statements_processed.csv not found]', '[No capability statement text found]'] and \
                           len(capability_statement.strip()) >= 50:
                            has_capability_statement = True
                            logging.info(f"✅ User {user_id} has valid capability statement")
                            
                            # Extract all capability statements from CSV
                            csv_path = os.path.join(user_uploads_dir, 'capability_statements_processed.csv')
                            capability_statements = []
                            capability_statement_count = 0
                            
                            if os.path.exists(csv_path):
                                try:
                                    df = pd.read_csv(csv_path)
                                    if not df.empty and 'Company' in df.columns:
                                        company_name = df['Company'].iloc[0]  # Primary company (important-comment)
                                        capability_statement_count = len(df)
                                        
                                        # Build list of all capabilities for selection
                                        for idx, row in df.iterrows():
                                            capability_statements.append({
                                                'company': row.get('Company', 'Unknown'),
                                                'filename': row.get('filename', ''),
                                                'upload_date': row.get('upload_date', ''),
                                                'is_primary': idx == 0 or row.get('is_primary', False)
                                            })
                                        
                                        logging.info(f"✅ Found {capability_statement_count} capability statement(s), primary: {company_name}")
                                except Exception as e:
                                    logging.error(f"Error reading company names from CSV: {e}")
                            
                            for fname in os.listdir(user_uploads_dir):
                                if fname.lower().endswith(('.pdf', '.doc', '.docx')):
                                    capability_statement_filename = fname
                                    break
                        else:
                            logging.warning(f"⚠️ User {user_id} has no valid capability statement")
                    except Exception as e:
                        logging.error(f"Error checking capability statement: {e}")
        else:
            logging.warning("⚠️ Using fallback method to fetch credit balance for AI Assistant")
            user_data = db.child("users").child(user_id).get(user['idToken']).val()
            if user_data:
                current_credits = user_data.get('credits_balance', 0)
                
                user_uploads_dir = user_data.get('uploads_dir', '')
                if user_uploads_dir and os.path.exists(user_uploads_dir):
                    try:
                        capability_statement = process_files_user_input(user_uploads_dir)
                        if capability_statement and \
                           capability_statement not in ['Not available', '[capability_statements_processed.csv not found]', '[No capability statement text found]'] and \
                           len(capability_statement.strip()) >= 50:
                            has_capability_statement = True
                            
                            # Extract all capability statements from CSV
                            csv_path = os.path.join(user_uploads_dir, 'capability_statements_processed.csv')
                            if os.path.exists(csv_path):
                                try:
                                    df = pd.read_csv(csv_path)
                                    if not df.empty and 'Company' in df.columns:
                                        company_name = df['Company'].iloc[0]
                                        logging.info(f"✅ Extracted company name: {company_name}")
                                except Exception as e:
                                    logging.error(f"Error reading company name from CSV: {e}")
                            
                            for fname in os.listdir(user_uploads_dir):
                                if fname.lower().endswith(('.pdf', '.doc', '.docx')):
                                    capability_statement_filename = fname
                                    break
                    except Exception as e:
                        logging.error(f"Error checking capability statement: {e}")
    except Exception as e:
        logging.error(f"Error fetching credit balance for AI Assistant: {e}")
        current_credits = 0
    
    return render_template('ai_assistant_room.html', 
                         contract_id=contract_id,
                         contract_name=contract_name,
                         current_credits=current_credits,
                         has_capability_statement=has_capability_statement,
                         capability_statement_filename=capability_statement_filename,
                         company_name=company_name,
                         capability_statements=capability_statements if 'capability_statements' in locals() else [],
                         capability_statement_count=capability_statement_count if 'capability_statement_count' in locals() else 0)

@app.route('/proposal/start')
def proposal_start():
    """Screen 1: Contract Analysis & PDF Annotations"""
    user = auth.current_user
    if not user:
        return redirect(url_for('Login'))
    
    contract_hash = request.args.get('hash_value') or request.args.get('hash')
    draft_id = request.args.get('draft_id')
    
    if not contract_hash:
        return redirect('/welcome')
    
    user_id = user['localId']
    current_credits = 0
    
    try:
        if admin_initialized and admin_db:
            user_ref = admin_db.reference(f'users/{user_id}')
            user_data = user_ref.get()
            if user_data:
                current_credits = user_data.get('credits_balance', 0)
    except Exception as e:
        logging.error(f"Error fetching credits for proposal start: {e}")
    
    # Get contract details from CSV
    contract_data = None
    try:
        df = pd.read_csv('Scraping_demo_results.csv')
        contract_row = df[df['hash_value'] == contract_hash]
        if not contract_row.empty:
            contract_data = contract_row.iloc[0].to_dict()
    except Exception as e:
        logging.error(f"Error loading contract data: {e}")
    
    return render_template('proposal_start.html',
                         contract_hash=contract_hash,
                         contract_data=contract_data,
                         draft_id=draft_id,
                         current_credits=current_credits,
                         user_id=user_id)

@app.route('/proposal/team')
def proposal_team():
    """Screen 2: Team & Subcontractor Builder"""
    user = auth.current_user
    if not user:
        return redirect(url_for('Login'))
    
    draft_id = request.args.get('draft_id')
    if not draft_id:
        return redirect('/welcome')
    
    user_id = user['localId']
    current_credits = 0
    
    try:
        if admin_initialized and admin_db:
            user_ref = admin_db.reference(f'users/{user_id}')
            user_data = user_ref.get()
            if user_data:
                current_credits = user_data.get('credits_balance', 0)
    except Exception as e:
        logging.error(f"Error fetching credits for proposal team: {e}")
    
    return render_template('proposal_team.html',
                         draft_id=draft_id,
                         current_credits=current_credits,
                         user_id=user_id)

@app.route('/proposal/pricing')
def proposal_pricing():
    """Screen 3: Pricing Strategy & Review"""
    user = auth.current_user
    if not user:
        return redirect(url_for('Login'))
    
    draft_id = request.args.get('draft_id')
    if not draft_id:
        return redirect('/welcome')
    
    user_id = user['localId']
    current_credits = 0
    
    try:
        if admin_initialized and admin_db:
            user_ref = admin_db.reference(f'users/{user_id}')
            user_data = user_ref.get()
            if user_data:
                current_credits = user_data.get('credits_balance', 0)
    except Exception as e:
        logging.error(f"Error fetching credits for proposal pricing: {e}")
    
    return render_template('proposal_pricing.html',
                         draft_id=draft_id,
                         current_credits=current_credits,
                         user_id=user_id)

#2/25 updated
@app.route('/welcome2', methods=['GET'])  
def Welcome2():
    try:
        user = auth.current_user
        if not user:
            logging.info("User not authenticated, redirecting...")
            return redirect(url_for('Login'))

        user_id = user['localId']

        # Ensure a fresh Firebase token before querying data
        try:
            user_logged_in = auth.refresh(user['refreshToken'])
            logging.info(f"✅ Token refreshed for user {user_id}")
        except Exception as token_error:
            logging.error(f"❌ Token refresh failed for {user_id}: {token_error}", exc_info=True)
            return render_template('error.html', error="Session expired. Please log in again.")

        # Retrieve user data from Firebase with proper validation
        try:
            user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
            if not user_data:
                logging.error(f"❌ No user data found for {user_id}")
                return render_template('error.html', error="User data missing. Contact support.")
            logging.info(f"Fetched User Data: {user_data}")
        except Exception as data_error:
            logging.error(f"❌ Firebase data fetch failed for {user_id}: {data_error}", exc_info=True)
            return render_template('error.html', error="Error retrieving user data. Contact support.")

        if user_data:
            company_name = user_data.get('company', 'No Company')
            first_name = user_data.get('first_name', 'User')

            logging.info(f"Company Name: {company_name}")

            return render_template('welcome2.html', company_name=company_name, first_name=first_name)

        logging.info("User not authenticated, redirecting...")
        return redirect(url_for('Login'))

    except Exception as e:
        logging.error(f"Error: {str(e)}", exc_info=True)
        return render_template('error.html', error=str(e))







#Trustedpartner ROUTE FUNCTION 
@app.route('/trustedpartner', methods=['GET']) 
def Trustedpartner():
    return render_template('trustedpartner.html')


#Finalist ROUTE FUNCTION 
@app.route('/finalist', methods=['GET']) 
def Finalist():
    return render_template('finalist.html')


@app.route('/contact', methods=['GET']) 
def Contact():
    return render_template('contact.html')




#businessplan ROUTE FUNCTION 
@app.route('/businessplan', methods=['GET']) 
def Businessplan():
    return render_template('businessplan.html')






#FAQ ROUTE FUNCTION 
@app.route('/faq', methods=['GET']) 
def Faq():
    if 'user' not in session:
        return render_template('faq.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('faq.html')


#TERMS OF USE ROUTE FUNCTION
@app.route('/terms_of_use', methods=['GET'])
def terms_of_use():
    return redirect(url_for('static', filename='docs/TermsofUse.pdf'))


#PRIVACY NOTICE ROUTE FUNCTION
@app.route('/privacy_notice', methods=['GET'])
def privacy_notice():
    return redirect(url_for('static', filename='docs/PrivacyNotice.pdf'))


    #TEAM DETAIL PAGE ROUTE FUNCTION
@app.route('/businesspartner', methods=['GET']) 
def Businesspartner():
    return render_template('businesspartner.html')



    #TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/businesspartnerdetail', methods=['GET']) 
def Businesspartnerdetail():
    return render_template('businesspartnerdetail.html')






# ---------------------------------------------------------------------
# [START OF TEAM DETAIL] 3/5/2025 UPDATED]
# ---------------------------------------------------------------------



#TEAM PAGE ROUTE FUNCTION 
@app.route('/team', methods=['GET']) 
def Team():
    if 'user' not in session:
        return render_template('team.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('team.html')


#SANTI G TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/teamdetailpage', methods=['GET']) 
def TeamDetailPage():
    if 'user' not in session:
        return render_template('teamdetailpage.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('teamdetailpage.html')


#JAIME P TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/jpDetail', methods=['GET']) 
def jpDetailPage():
    if 'user' not in session:
        return render_template('jp.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('jp.html')



#MELISSA S TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/msDetail', methods=['GET']) 
def msDetailPage():
    if 'user' not in session:
        return render_template('ms.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('ms.html')


    
#ZIRONG L TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/zlDetail', methods=['GET']) 
def zlDetailPage():
    if 'user' not in session:
        return render_template('zl.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('zl.html')


    
#ADRIAN R TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/arDetail', methods=['GET']) 
def arDetailPage():
    if 'user' not in session:
        return render_template('ar.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('ar.html')



    
#ADRIAN R TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/blDetail', methods=['GET']) 
def blDetailPage():
    if 'user' not in session:
        return render_template('bl.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('bl.html')


    
#Victoria D TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/vdDetail', methods=['GET']) 
def vdDetailPage():
    if 'user' not in session:
        return render_template('vd.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('vd.html')


#Victoria D TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/mmDetail', methods=['GET']) 
def mmDetailPage():
    if 'user' not in session:
        return render_template('mm.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('mm.html')



#Rodrigo M TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/rmDetail', methods=['GET']) 
def rmDetailPage():
    if 'user' not in session:
        return render_template('rm.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('rm.html')


#daniel intern TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/dtDetail', methods=['GET']) 
def dtDetailPage():
    if 'user' not in session:
        return render_template('dt.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('rm.html')


# ---------------------------------------------------------------------
# [END OF TEAM DETAIL] 3/5/2025 UPDATED]
# ---------------------------------------------------------------------




#
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

#BID SEARCH FUNCTION TO CLEAR USER UPLOADS EXCEPT 'embedded_bids.csv'

ALLOWED_PERSISTENT_FILES = ['matches.csv', 'capability_statements_processed.csv']
#BID SEARCH FUNCTION TO CLEAR USER UPLOADS EXCEPT 'embedded_bids.csv'
@app.route('/clear_uploads', methods=['POST'])
def clear_uploads():
    # Ensure session is populated from auth.current_user if needed
    if not ensure_session_from_auth():
        app.logger.error('User not logged in')
        return jsonify({'success': False, 'message': 'User not logged in'}), 400
    
    user = session.get('user')
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    user_uploads_dir = user_data.get('uploads_dir')
    # Verify if the uploads directory path is retrieved correctly
    if not user_uploads_dir:
        app.logger.error('User uploads directory not provided')
        return jsonify({'success': False, 'message': 'User uploads directory not provided'}), 400
    # Check if the directory exists
    if not os.path.exists(user_uploads_dir):
        app.logger.error(f"Uploads directory does not exist: {user_uploads_dir}")
        return jsonify({'success': False, 'message': f"Uploads directory does not exist: {user_uploads_dir}"}), 400
    try:
        files_cleared = 0
        for filename in os.listdir(user_uploads_dir):
            # Skip the file 'embedded_bids.csv' and delete everything else
            if filename.lower().endswith('.pdf') or filename in ALLOWED_PERSISTENT_FILES:
                continue
                file_path = os.path.join(user_uploads_dir, filename)
                if os.path.isfile(file_path):  # Ensure it's a file
                    os.remove(file_path)
                    files_cleared += 1
        app.logger.info(f"Cleared {files_cleared} files from {user_uploads_dir}, excluding 'embedded_bids.csv'")
        return jsonify({'success': True, 'message': f"Cleared {files_cleared} files, excluding 'embedded_bids.csv'"})
    except Exception as e:
        app.logger.error(f"Error clearing files: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/logout', methods=['GET'] )
def logout():
    """Clear the session and redirect to login page."""
    session.clear()
    return redirect(url_for('Login'))


def check_qdrant_config():
    qdrant_url = os.getenv('QDRANT_URL')
    qdrant_api_key = os.getenv('QDRANT_API_KEY')
    
    if not qdrant_url or not qdrant_api_key:
        raise ValueError("Qdrant configuration missing. Check your .env file.")
    
    print(f"Qdrant URL: {qdrant_url}")
    print(f"Qdrant API key length: {len(qdrant_api_key)}")
    
    return qdrant_url, qdrant_api_key



#UPDATED ON 2/20
#UPDATED AGAIN ON 3/4/2025 WITH ZIRONG'S CHANGES
@app.route('/upload_and_process', methods=['POST'])
def upload_and_process():
    """Processes a newly uploaded PDF in two scenarios:
        1) The user wants to do a top-5 capability match (federal vs. state) => generate matches.csv.
        2) The user clicks 'Bid' on smartsearch.html => we parse the PDF, update matches_SMART_SEARCH.csv with the PDF's company name.
    """
    if 'user' not in session:
        return jsonify({"success": False, "message": "User not logged in."})

    user = session['user']
    user_id = user['localId']

    if request.method != 'POST':
        return jsonify({"success": False, "message": "Invalid request method."})

    # 1) Grab the file from the form
    file = request.files.get('file')
    if not file:
        return jsonify({"success": False, "message": "No file selected. Please choose a file to upload."})
    if not file.filename:
        return jsonify({"success": False, "message": "No file selected. Please choose a valid file to upload."})
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": f"Invalid file type '{file.filename}'. Please upload a PDF, JPG, PNG, or JPEG file."})
    
    try:
        # 2) Determine if user selected "federal"/"state" or passed a hash_value from the modal
        selected_contract_types = request.form.getlist('contractTypes[]')
        selected_states = request.form.getlist('states[]')
        hash_value = request.form.get('hash_value')  # this is from the "Bid" modal, if any

        # 3) Create user upload directory (if needed)
        user_upload_dir = f"uploads/bid_uploads_{user_id}"
        try:
            os.makedirs(user_upload_dir, exist_ok=True)
            app.logger.info(f"Created/verified user upload directory: {user_upload_dir}")
        except Exception as e:
            app.logger.error(f"Failed to create user upload directory: {str(e)}")
            return jsonify({"success": False, "message": "Failed to create upload directory. Please try again."})

        # 4) Delete old PDFs in that folder, then save the new PDF
        try:
            for fname in os.listdir(user_upload_dir):
                if fname.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
                    os.remove(os.path.join(user_upload_dir, fname))
                    app.logger.info(f"Removed old file: {fname}")
        except Exception as e:
            app.logger.warning(f"Error cleaning old files: {str(e)}")

        filename = secure_filename(file.filename)
        file_path = os.path.join(user_upload_dir, filename)
        try:
            file.save(file_path)
            app.logger.info(f"Saved uploaded file: {file_path}")
        except Exception as e:
            app.logger.error(f"Failed to save uploaded file: {str(e)}")
            return jsonify({"success": False, "message": "Failed to save uploaded file. Please try again."})

        # 5) Process the PDF => generate capability_statements_processed.csv
        csv_path = os.path.join(user_upload_dir, "capability_statements_processed.csv")
        try:
            process_pdfs([file_path], csv_path)
            app.logger.info(f"Successfully processed PDF and created CSV: {csv_path}")
        except Exception as e:
            app.logger.error(f"Failed to process PDF: {str(e)}")
            return jsonify({"success": False, "message": f"Failed to process uploaded file: {str(e)}"})

        # 6) Try to read “Company” from the newly processed CSV
        pdf_company_name = None
        if os.path.exists(csv_path):
            try:
                cs_df = pd.read_csv(csv_path, dtype=str)
                if "Company" in cs_df.columns and not cs_df.empty:
                    pdf_company_name = cs_df["Company"].iloc[0]
            except Exception as e:
                app.logger.warning(f"[upload_and_process] Could not read 'Company' from CSV: {e}")

        # 7) If the user is applying “federal” or “state” filters => do your typical top-5 matching logic
        #    (the original code that calls “handler.process_query(...)” and writes matches.csv).
        #    If you do not have that logic anymore, comment out or adapt as needed.
        # 
        #    Example (pseudo-code):
        if selected_contract_types or selected_states or not hash_value:
            # Example: re-run your Qdrant or RAG logic to produce “matches.csv”
            # (the same steps from your original upload_and_process).
            handler = CSQueryHandler(
                openai_api_key=os.getenv('CS_BID_SEARCH_OPENAI_API_KEY'),
                qdrant_url=os.getenv('QDRANT_URL'),
                qdrant_api_key=os.getenv('QDRANT_API_KEY'),
                user_upload_dir=user_upload_dir
            )
            with open(file_path, 'rb') as pdf_file:
                results = handler.process_query(pdf_file, contract_types=selected_contract_types, states=selected_states)
            
            try:
                app.logger.info(f"Starting Qdrant matching with contract_types: {selected_contract_types}, states: {selected_states}")
                
                # Initialize CSQueryHandler for contract matching
                handler = CSQueryHandler(
                    openai_api_key=os.getenv('CS_BID_SEARCH_OPENAI_API_KEY'),
                    qdrant_url=os.getenv('QDRANT_URL'),
                    qdrant_api_key=os.getenv('QDRANT_API_KEY'),
                    user_upload_dir=user_upload_dir
                )
                
                # Process query to get top 5 matching contracts
                with open(file_path, 'rb') as pdf_file:
                    results = handler.process_query(
                        pdf_file, 
                        contract_types=selected_contract_types, 
                        states=selected_states,
                        limit=50  # Get more results for better filtering
                    )
                
                app.logger.info(f"Qdrant matching completed. Found {len(results)} results")
                
                matches_file = os.path.join(user_upload_dir, 'matches.csv')
                with open(matches_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=[
                        'Company', 'Bid_Number', 'Bid_Name', 'Bid_Description',
                        'Status', 'Category', 'Due_Date', 'Detail_Link',
                        'State', 'Organization', 'Budget', 'Similarity_Score', 'hash_value'
                    ])
                    writer.writeheader()
                    for row in results:
                        # If we have pdf_company_name, use it:
                        writer.writerow({
                            'Company':         pdf_company_name if pdf_company_name else "Unknown",
                            'Bid_Number':      row['Bid_Number'],
                            'Bid_Name':        row['Bid_Name'],
                            'Bid_Description': row.get('Bid_Description',''),
                            'Status':          row.get('Status',''),
                            'Category':        row.get('Category',''),
                            'Due_Date':        row.get('Due_Date',''),
                            'Detail_Link':     row.get('Detail_Link','#'),
                            'State':           row.get('State',''),
                            'Organization':    row.get('Organization',''),
                            'Budget':          row.get('Budget',''),
                            'Similarity_Score': row.get('Similarity_Score',''),
                            'hash_value':      row.get('hash_value','')
                        })
                
                app.logger.info(f"Successfully saved {len(results)} matches to {matches_file}")
                
                # If success, redirect to the top-5 results page
                return jsonify({"success": True, "message": "Upload success (top-5 matches).", "redirect": "/top_five_results"})
                
            except Exception as e:
                app.logger.error(f"Error during Qdrant matching: {str(e)}")
                return jsonify({"success": False, "message": f"Error processing contract matches: {str(e)}"})

        # 8) Otherwise, if the user is coming from the “Bid” button on SMART SEARCH, we’ll have a hash_value.
        #    We want to “patch” matches_SMART_SEARCH.csv => set the 'Company' for that one row.
        #    Then redirect to /index?hash_value=...
        if hash_value:
            # Path to matches_SMART_SEARCH.csv
            smartsearch_file = os.path.join(user_upload_dir, 'matches_SMART_SEARCH.csv')
            if pdf_company_name and os.path.exists(smartsearch_file):
                try:
                    df_smart = pd.read_csv(smartsearch_file, dtype=str)
                    # find the row matching hash_value
                    mask = (df_smart['hash_value'] == hash_value)
                    if mask.any():
                        df_smart.loc[mask, 'Company'] = pdf_company_name
                        df_smart.to_csv(smartsearch_file, index=False)
                        app.logger.info(f"[upload_and_process] Updated row in matches_SMART_SEARCH.csv with Company={pdf_company_name}.")
                except Exception as e:
                    app.logger.warning(f"[upload_and_process] Could not update matches_SMART_SEARCH: {e}")

            # 9) Return success => front-end will redirect to /index?hash_value=...
            return jsonify({"success": True})
        
        # 10) If we reach here, user neither used top-5 filtering nor provided hash_value
        #     => Possibly a no-op scenario. Just respond success, or do some fallback:
        return jsonify({"success": True, "message": "PDF uploaded, but no matching logic was triggered."})

    except Exception as e:
        app.logger.error(f"[upload_and_process] Error processing file: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"Upload processing failed: {str(e)}"})



##HELP FUNCTION FOR CS FEEDBACK!!

def count_tokens(text, model="gpt-3.5-turbo"):
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def summarize_text(text, model="gpt-3.5-turbo", temperature=0.3, max_tokens=500):
    """
    使用 GPT 对长文本进行摘要，生成一个简明摘要文本。
    """
    messages = [
        {"role": "system", "content": "你是一位专业的文本摘要专家，请阅读下面的内容，并生成一个简明扼要的摘要，保留关键信息，不要遗漏任何重要信息。"},
        {"role": "user", "content": text}
    ]
    response = client_CS_BUILDER_OPENAI_API_KEY.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens
    )
    summary = response.choices[0].message.content.strip()
    return summary


# CS FEEDBACK ON INDEX.HTML
#use open ai gpt 3.5 FUNCTION
@app.route('/ask_CS_feedback', methods=['POST'])
def ask_CS_feedback():
    user_query = request.form.get('query')
    user = session['user']
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    user_uploads_dir = user_data['uploads_dir']
    if not user_query or len(user_query.strip()) < 1:
        app.logger.error("ask_CS_feedback: No or empty user_query received.")
        return jsonify({"response": "No valid query provided."}), 400
    app.logger.info(f"[CS_FEEDBACK] user_query: {user_query}")
    # 读取 capability_statements_processed.csv 得到完整文本
    try:
        cs_df = pd.read_csv(os.path.join(user_uploads_dir, "capability_statements_processed.csv"))
        if not cs_df.empty:
            # 假设只有一行，如果有多行，可按需合并或选择合适的行
            cs_text = cs_df["Capability_Statement"].iloc[0]
        else:
            cs_text = ""
    except Exception as e:
        app.logger.error(f"[CS_FEEDBACK] 读取CSV出错: {e}")
        cs_text = ""
    app.logger.info(f"[CS_FEEDBACK] capability statement text length: {len(cs_text)}")
    # 检查Token数量，如果超过阈值，则对内容进行摘要
    token_threshold = 3000
    token_count = count_tokens(cs_text)
    app.logger.info(f"[CS_FEEDBACK] Token count: {token_count}")
    if token_count > token_threshold:
        app.logger.info("[CS_FEEDBACK] Input text too long, summarizing content...")
        cs_text = summarize_text(cs_text)
        app.logger.info(f"[CS_FEEDBACK] Summarized text length: {len(cs_text)}")
    # 定义固定的评估指令，要求模型输出固定结构的反馈
    refined_instructions = (
        "You are an expert business consultant specializing in evaluating capability statements.\n\n"
        "Below is the **full text** extracted from a CSV file—no external attachments are required.\n"
        "Please evaluate the provided text using the following strict format:\n\n"
        "1. **Summary of Key Findings**:\n"
        "   Write exactly **one short paragraph** summarizing the main strengths and weaknesses.\n\n"
        "2. **Clarity and Precision**: Evaluate the clarity and precision of the articulation of services and capabilities, and suggest improvements.\n"
        "3. **Differentiation**: Identify unique strengths or differentiators, and recommend how to emphasize them.\n"
        "4. **Relevance to Target Audience**: Assess how well the statement aligns with the contract requirements and potential client needs.\n"
        "5. **Conciseness and Impact**: Comment on the conciseness of the language and overall impact, and advise on streamlining.\n"
        "6. **Visual and Structural Presentation**: Critique the layout and organization, and suggest improvements for a professional look.\n"
        "7. **Actionable Recommendations**: List specific, actionable suggestions for improvement.\n\n"
        "Ensure your entire response is in **one** message, following the above structure exactly.\n"
        "You **do have** the entire text in the prompt, so do **not** say you can't see it.\n"
    )
    # 构造最终的系统提示，将固定指令和从CSV读取的文本结合起来
    system_prompt = refined_instructions + "\n\nCapability Statement Content:\n" + cs_text
    app.logger.info(f"[CS_FEEDBACK] system_prompt length: {len(system_prompt)}")
    print("System Prompt (first 300 chars):", system_prompt[:300])
    try:
        response = client_CS_BUILDER_OPENAI_API_KEY.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            temperature=0,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        if not response or not response.choices:
            app.logger.error("[CS_FEEDBACK] Empty or invalid response from OpenAI (no choices).")
            return jsonify({"response": "No response generated from OpenAI."}), 500
        bot_response = response.choices[0].message.content.strip()
        if not bot_response:
            app.logger.error("[CS_FEEDBACK] The response.choices[0] has no content.")
            return jsonify({"response": "OpenAI responded with empty content."}), 500
        app.logger.info(f"[CS_FEEDBACK] bot_response[:300]: {bot_response[:300]}")
        return jsonify({"response": bot_response})
    except Exception as e:
        app.logger.error(f"[CS_FEEDBACK] Unexpected Error: {e}", exc_info=True)
        return jsonify({"error": f"Unhandled error: {str(e)}"}), 500

##3/4/2025 CHANGES
def process_files_user_input(user_uploads_dir,
                             model="gpt-3.5-turbo",
                             single_row_max_len=1000,
                             total_token_threshold=14000):
    """
    1. Read capability_statements_processed.csv. If it is too long, summarize it and add to final_content.
    2. Then read matches.csv row by row; for each row, count the tokens. If a row is too long, summarize it before adding.
       If the overall tokens approach the threshold, perform further summarization or skip the row.
    3. Finally, return the concatenated string.
    :param user_uploads_dir: The directory containing the user's uploaded files.
    :param model: The model to use, default is gpt-3.5-turbo.
    :param single_row_max_len: The character length threshold for summarizing an individual row.
    :param total_token_threshold: The overall token threshold to avoid exceeding the model's limit.
    :return: A concatenated string of the processed text.
    """
    final_content = []
    current_total_tokens = 0
    # =========== Step 1: Process capability_statements_processed.csv ==============
    cs_file = os.path.join(user_uploads_dir, "capability_statements_processed.csv")
    if os.path.exists(cs_file):
        cs_df = pd.read_csv(cs_file, dtype=str)
        # Convert the DataFrame to a CSV-format string
        cs_str = cs_df.to_csv(index=False)
        # Check token count
        cs_tokens = count_tokens(cs_str, model=model)
        if cs_tokens > total_token_threshold / 2:
            # If the capability statement is too long, summarize it first
            cs_str = summarize_text(cs_str, model=model, max_tokens=1000)
            cs_tokens = count_tokens(cs_str, model=model)
        # If after summarization it still fits within the threshold, add it
        if current_total_tokens + cs_tokens < total_token_threshold:
            final_content.append(cs_str)
            current_total_tokens += cs_tokens
        else:
            # If adding it exceeds the threshold, try a stronger summary
            short_summary = summarize_text(cs_str, model=model, max_tokens=500)
            short_summary_tokens = count_tokens(short_summary, model=model)
            if current_total_tokens + short_summary_tokens < total_token_threshold:
                final_content.append(short_summary)
                current_total_tokens += short_summary_tokens
            else:
                # If it still exceeds, omit the content or add a placeholder message
                final_content.append("Capability Statement Summary: [Content Too Long, omitted]")
                current_total_tokens += count_tokens(final_content[-1], model=model)
    else:
        print("No capability_statements_processed.csv found.")
    # =========== Step 2: Process matches.csv ==============
    matches_file = os.path.join(user_uploads_dir, "matches.csv")
    if os.path.exists(matches_file):
        df = pd.read_csv(matches_file, dtype=str)
        # Assume we need all columns
        all_columns = df.columns.tolist()
        for i, row in df.iterrows():
            # Convert the entire row to a string
            # You can customize the format, for example: "Bid_Name: ..., Bid_Description: ..., etc."
            row_text_parts = []
            for col in all_columns:
                val = row[col] if pd.notnull(row[col]) else ""
                row_text_parts.append(f"{col}: {val}")
            row_text = " | ".join(row_text_parts)
            # First, check by character length if summarization is needed
            if len(row_text) > single_row_max_len:
                row_text = summarize_text(row_text, model=model, max_tokens=500)
            # Count tokens for the row text
            row_tokens = count_tokens(row_text, model=model)
            # Determine if adding this row would exceed the overall threshold
            if current_total_tokens + row_tokens < total_token_threshold:
                final_content.append(row_text)
                current_total_tokens += row_tokens
            else:
                # If it exceeds, try summarizing the row further
                row_text_short = summarize_text(row_text, model=model, max_tokens=200)
                row_text_short_tokens = count_tokens(row_text_short, model=model)
                if current_total_tokens + row_text_short_tokens < total_token_threshold:
                    final_content.append(row_text_short)
                    current_total_tokens += row_text_short_tokens
                else:
                    # If still exceeding, omit the row or add a placeholder message
                    final_content.append(f"[Row omitted due to length: {row.get('Bid_Name', 'Unknown')}]")
                    current_total_tokens += count_tokens(final_content[-1], model=model)
    else:
        print("No matches.csv found.")
    # =========== Step 3: Return the concatenated string ==============
    return "\n".join(final_content)



# BID RESPONSE GENERATION ON INDEX.HTML
@app.route('/ask_question', methods=['POST'])
def ask_model_question():
    user_query = request.form.get('query')
    user = session['user']
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    user_uploads_dir = user_data['uploads_dir']

    #add content to LLM 
    combined_content = process_files_user_input(user_uploads_dir)

    print("Combined Content in ask_question function:", combined_content)  # Debugging line
    
    hash_value = request.form.get('hash_value')
    if not hash_value:
        return jsonify({"error": "hash_value is required for generating a tailored response."}), 400

    combined_content = process_selected_contract(user_uploads_dir, hash_value)
    print("Combined Content in ask_question function:", combined_content)  # Debug
    
    try:
        response = client_BID_RESPONSE_OPENAI_API_KEY.chat.completions.create(
            model="ft:gpt-3.5-turbo-0125:personal:bid-response:9oyXR6qz", # calling custom open ai model 
            messages=[
                {"role": "system", "content": combined_content},
                {"role": "user", "content": user_query}
            ],
            temperature=0
        )
        bot_response = response.choices[0].message.content.strip() if response.choices else 'No response generated.'
        print("Bot Response:", bot_response)  # Debugging line
        return jsonify({"response": bot_response})
    except Exception as e:
        app.logger.error(f"Error in model response: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/add_test_credits', methods=['POST'])
def add_test_credits():
    """Add credits to test user for testing purposes"""
    try:
        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 401
            
        user = session['user']
        user_id = user['localId']
        id_token = user['idToken']
        
        data = request.get_json()
        credits_to_add = data.get('credits', 100)
        
        credit_manager = CreditManager(db)
        success, new_balance = credit_manager.add_credits(
            user_id, id_token, credits_to_add, "manual_test"
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Added {credits_to_add} credits",
                "new_balance": new_balance
            })
        else:
            return jsonify({"error": "Failed to add credits"}), 500
            
    except Exception as e:
        app.logger.error(f"Error adding test credits: {e}")
        return jsonify({"error": str(e)}), 500

def detect_query_intent(query):
    """Detect if query is casual/greeting or an actual task request"""
    query_lower = query.lower().strip()
    
    # Casual greetings and test messages
    casual_patterns = [
        'hi', 'hello', 'hey', 'greetings',
        'you there', 'are you there', 'are you online',
        'test', 'testing', 'ping',
        'good morning', 'good afternoon', 'good evening',
        'how are you', 'whats up', 'what\'s up',
    ]
    
    # Check for exact matches or if query starts with casual phrase
    for pattern in casual_patterns:
        if query_lower == pattern or query_lower.startswith(pattern + ' '):
            return 'casual'
    
    # If very short (< 5 chars) and doesn't contain keywords, likely casual
    if len(query_lower) < 5 and not any(keyword in query_lower for keyword in ['analyze', 'help', 'what', 'how', 'why']):
        return 'casual'
    
    return 'task'

@app.route('/ai_assistant_enhanced', methods=['POST'])
def enhanced_ai_assistant():
    """Enhanced AI assistant endpoint with credit-based billing"""
    global enhanced_ai
    
    ensure_session_from_auth()
    
    user_query = request.form.get('query')
    hash_value = request.form.get('hash_value')
    action_type = request.form.get('action_type', 'general')
    
    app.logger.info(f"Enhanced AI Assistant called with action_type: {action_type}, hash_value: '{hash_value}', query: {user_query[:50] if user_query else 'None'}...")
    
    try:
        if not user_query:
            return jsonify({"error": "Query is required"}), 400
        
        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 401
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        user_id = user['localId']
        id_token = user['idToken']
        
        # Initialize credit manager
        credit_manager = CreditManager(db)
        
        if admin_initialized and admin_db:
            current_credits = credit_manager.get_user_credits_admin(user_id, admin_db)
        else:
            try:
                current_credits = credit_manager.get_user_credits(user_id, id_token)
            except:
                current_credits = 0
        
        # Detect query intent - skip credits for casual greetings
        query_intent = detect_query_intent(user_query)
        
        if query_intent == 'casual' and action_type == 'general':
            # Respond to casual query without deducting credits
            casual_response = f"""Hello! I'm your AI Bid Assistant for Contract Radar Maximizer. I'm here to help you create winning government contract proposals.

I can assist you with:
• Analyzing contract opportunities and calculating win probability (3 credits)
• Generating compliance checklists (2 credits)  
• Developing bid strategies (3 credits)
• Creating proposal outlines (2 credits)
• Generating comprehensive 30-50 page proposals (15 credits)

You currently have {current_credits} credits available.

How can I help you with your contract response today?"""
            
            return jsonify({
                "response": casual_response,
                "credits_used": 0,
                "remaining_credits": current_credits,
                "casual_greeting": True
            })
        
        # Determine credit cost based on action type
        credit_costs = {
            'general': 1,
            'analyze': 3,
            'compliance': 2,
            'strategy': 3,
            'outline': 2,
            'full_proposal': 15
        }
        
        required_credits = credit_costs.get(action_type, 1)
        
        # Check if user has enough credits BEFORE deduction
        if current_credits < required_credits:
            return jsonify({
                "error": f"Insufficient credits. You have {current_credits} credits but this operation requires {required_credits} credits.",
                "credits_required": required_credits,
                "current_balance": current_credits
            }), 402
        
        # Process the request with credit deduction
        context_data = {}
        
        try:
            if hash_value:
                app.logger.info(f"Processing context data with hash_value: {hash_value}")
                user_uploads_dir = user_data['uploads_dir']
                context_data['contract_info'] = process_selected_contract(user_uploads_dir, hash_value)
                context_data['capability_statement'] = process_files_user_input(user_uploads_dir)
                
                # Check if user has a valid capability statement
                capability_statement = context_data.get('capability_statement', '')
                if not capability_statement or capability_statement in ['Not available', '[capability_statements_processed.csv not found]', '[No capability statement text found]'] or len(capability_statement.strip()) < 50:
                    app.logger.warning(f"User {user_id} has no valid capability statement")
                    return jsonify({
                        "error": "No capability statement found. Please upload or create your capability statement in the Capability Statement section to use AI features. This helps us provide personalized, accurate responses based on your company's unique profile and capabilities.",
                        "requires_capability_statement": True
                    }), 400
                
                company_identity = extract_company_identity(user_uploads_dir)
                context_data['company_name'] = company_identity.get('company_name', 'your company')
                app.logger.info(f"Extracted company name: {context_data['company_name']}")
                
                if admin_initialized and admin_db:
                    uploaded_docs = get_user_uploaded_documents(user_id, admin_db)
                    context_data['uploaded_documents'] = uploaded_docs
                    app.logger.info(f"Retrieved {len(uploaded_docs)} uploaded documents")
                else:
                    context_data['uploaded_documents'] = []
            else:
                app.logger.warning(f"No hash_value provided, skipping context gathering")
                    
        except Exception as e:
            app.logger.error(f"Error processing context data: {e}", exc_info=True)
            context_data = {
                'contract_info': 'Not available',
                'capability_statement': 'Not available',
                'company_name': 'your company',
                'uploaded_documents': []
            }
        
        # Handle specialized actions regardless of hash_value
        if action_type == 'full_proposal':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, "Full proposal generation",
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            job_id = str(uuid.uuid4())
            
            with job_lock:
                proposal_jobs[job_id] = {
                    'status': 'processing',
                    'progress': 0,
                    'result': None,
                    'error': None,
                    'user_id': user_id,
                    'credits_used': required_credits,
                    'remaining_credits': current_credits - required_credits
                }
            
            def generate_proposal_async():
                try:
                    app.logger.info(f"Starting async proposal generation for job {job_id}")
                    contract_requirements = enhanced_ai.analyze_contract_requirements(context_data.get('contract_info', ''))
                    
                    with job_lock:
                        proposal_jobs[job_id]['progress'] = 20
                    
                    full_proposal = enhanced_ai.generate_full_proposal(
                        contract_requirements,
                        context_data.get('capability_statement', ''),
                        company_name=context_data.get('company_name', 'your company'),
                        user_documents=context_data.get('uploaded_documents', [])
                    )
                    
                    with job_lock:
                        proposal_jobs[job_id]['status'] = 'completed'
                        proposal_jobs[job_id]['progress'] = 100
                        proposal_jobs[job_id]['result'] = {
                            "response": f"Comprehensive proposal generated successfully for {context_data.get('company_name', 'your company')}",
                            "proposal": full_proposal
                        }
                    app.logger.info(f"Completed async proposal generation for job {job_id}")
                    
                except Exception as e:
                    app.logger.error(f"Error generating full proposal for job {job_id}: {e}", exc_info=True)
                    credit_manager.add_credits_admin(user_id, required_credits, "refund_failed_generation", admin_db=admin_db if admin_initialized else None)
                    with job_lock:
                        proposal_jobs[job_id]['status'] = 'failed'
                        proposal_jobs[job_id]['error'] = str(e)
            
            thread = threading.Thread(target=generate_proposal_async)
            thread.daemon = True
            thread.start()
            
            response_data = {
                "job_id": job_id,
                "status": "processing",
                "message": "Proposal generation started. Use the job_id to check status.",
                "credits_used": required_credits,
                "remaining_credits": current_credits - required_credits
            }
            app.logger.info(f"Returning async job response: {response_data}")
            return jsonify(response_data)
            
        elif action_type == 'analyze':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, "Contract analysis",
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            try:
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data.get('contract_info', ''))
                
                analysis_response = enhanced_ai.generate_contract_analysis(
                    contract_requirements,
                    context_data.get('capability_statement', ''),
                    company_name=context_data.get('company_name', 'your company'),
                    uploaded_docs=context_data.get('uploaded_documents', [])
                )
                
                return jsonify({
                    "response": analysis_response,
                    "credits_used": required_credits,
                    "remaining_credits": current_credits - required_credits
                })
                
            except Exception as e:
                app.logger.error(f"Error in analyze action: {e}")
                credit_manager.add_credits_admin(user_id, required_credits, "refund_failed_analysis", admin_db=admin_db if admin_initialized else None)
                return jsonify({"error": "Failed to analyze contract"}), 500
            
        elif action_type == 'compliance':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, "Compliance checklist generation",
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            try:
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data.get('contract_info', ''))
                
                compliance_checklist = enhanced_ai.generate_compliance_checklist(
                    contract_requirements,
                    company_name=context_data.get('company_name', 'your company')
                )
                
                return jsonify({
                    "response": compliance_checklist,
                    "credits_used": required_credits,
                    "remaining_credits": current_credits - required_credits
                })
                
            except Exception as e:
                app.logger.error(f"Error in compliance action: {e}")
                credit_manager.add_credits_admin(user_id, required_credits, "refund_failed_compliance", admin_db=admin_db if admin_initialized else None)
                return jsonify({"error": "Failed to generate compliance checklist"}), 500
            
        elif action_type == 'strategy':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, "Bid strategy generation",
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            try:
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data.get('contract_info', ''))
                
                strategy = enhanced_ai.suggest_bid_strategy(
                    contract_requirements, 
                    context_data.get('capability_statement', ''),
                    company_name=context_data.get('company_name', 'your company')
                )
                
                return jsonify({
                    "response": strategy,
                    "credits_used": required_credits,
                    "remaining_credits": current_credits - required_credits
                })
                
            except Exception as e:
                app.logger.error(f"Error generating bid strategy: {e}")
                credit_manager.add_credits_admin(user_id, required_credits, "refund_failed_strategy", admin_db=admin_db if admin_initialized else None)
                return jsonify({"error": "Failed to generate bid strategy"}), 500
            
        elif action_type == 'outline':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, "Proposal outline generation",
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            try:
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data.get('contract_info', ''))
                
                proposal_outline = enhanced_ai.generate_proposal_outline(
                    contract_requirements,
                    context_data.get('capability_statement', ''),
                    company_name=context_data.get('company_name', 'your company')
                )
                
                return jsonify({
                    "response": proposal_outline,
                    "credits_used": required_credits,
                    "remaining_credits": current_credits - required_credits
                })
                
            except Exception as e:
                app.logger.error(f"Error generating proposal outline: {e}")
                credit_manager.add_credits_admin(user_id, required_credits, "refund_failed_outline", admin_db=admin_db if admin_initialized else None)
                return jsonify({"error": "Failed to generate proposal outline"}), 500
            
        
        # For general queries (non-specialized actions), generate AI response
        if action_type == 'general':
            success, message, new_balance = credit_manager.deduct_credits_admin(
                user_id, required_credits, action_type, user_query[:100],
                admin_db=admin_db if admin_initialized else None
            )
            if not success:
                return jsonify({"error": message, "credits_required": required_credits, "current_balance": current_credits}), 402
            
            conversation_history = enhanced_ai.get_conversation_context(user_id, hash_value) if hash_value else []
            ai_response = enhanced_ai.generate_enhanced_response(user_query, context_data, conversation_history)
            
            # Save conversation turn
            if hash_value:
                enhanced_ai.save_conversation_turn(user_id, hash_value, user_query, ai_response)
            
            return jsonify({
                "response": ai_response,
                "credits_used": required_credits,
                "remaining_credits": current_credits - required_credits
            })
        
        # If we reach here, it's an unknown action type
        return jsonify({"error": f"Unknown action type: {action_type}"}), 400
        
    except Exception as e:
        app.logger.error(f"Error in enhanced AI assistant: {str(e)}")
        return jsonify({"error": f"Enhanced AI assistant error: {str(e)}"}), 500

@app.route('/proposal_job_status/<job_id>', methods=['GET'])
def proposal_job_status(job_id):
    """Check the status of an async proposal generation job"""
    with job_lock:
        job = proposal_jobs.get(job_id)
        
        if not job:
            return jsonify({"error": "Job not found"}), 404
        
        response = {
            "status": job['status'],
            "progress": job['progress'],
            "credits_used": job['credits_used'],
            "remaining_credits": job['remaining_credits']
        }
        
        if job['status'] == 'completed':
            response.update(job['result'])
            del proposal_jobs[job_id]
        elif job['status'] == 'failed':
            response['error'] = job['error']
            del proposal_jobs[job_id]
        
        return jsonify(response)

@app.route('/capability-builder-enhanced')
def capability_builder_enhanced():
    user = session.get('user')
    current_credits = 0
    if user:
        user_id = user['localId']
        credit_manager = CreditManager(db)
        if admin_initialized and admin_db:
            current_credits = credit_manager.get_user_credits_admin(user_id, admin_db)
    return render_template('capability_builder_enhanced.html', current_credits=current_credits)

@app.route('/save-capability-statement', methods=['POST'])
def save_capability_statement():
    try:
        # if 'user_id' not in session:
        #     return jsonify({'error': 'User not authenticated'}), 401
        
        user_id = session.get('user_id', 'test_user')
        data = request.get_json()
        
        # Save to Firebase (temporarily disabled due to configuration issues)
        # if db:
        #     doc_ref = db.collection('capability_statements').document(user_id)
        #     doc_ref.set({
        #         'data': data,
        #         'updated_at': 'timestamp_placeholder',
        #         'user_id': user_id
        #     })
            
        return jsonify({'success': True, 'message': 'Capability statement saved successfully'})
        
    except Exception as e:
        logging.error(f"Error saving capability statement: {str(e)}")
        return jsonify({'error': 'Failed to save capability statement'}), 500

@app.route('/load-capability-statement', methods=['GET'])
def load_capability_statement():
    try:
        # if 'user_id' not in session:
        #     return jsonify({'error': 'User not authenticated'}), 401
        
        user_id = session.get('user_id', 'test_user')
        
        # Load from Firebase (temporarily disabled due to configuration issues)
        # if db:
        #     doc_ref = db.collection('capability_statements').document(user_id)
        #     doc = doc_ref.get()
        #     
        #     if doc.exists:
        #         return jsonify(doc.to_dict().get('data', {}))
        
        return jsonify({'error': 'Load functionality temporarily disabled'}), 404
        
    except Exception as e:
        logging.error(f"Error loading capability statement: {str(e)}")
        return jsonify({'error': 'Failed to load capability statement'}), 500

def enhance_capability_statement_content(data):
    """Use AI to create professional, compelling capability statement content matching industry standards"""
    try:
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        prompt = f"""You are an expert in creating professional government contracting capability statements. Create compelling, detailed content that matches the quality of top-tier capability statements.

Company: {data.get('company_name', '')}
Industry/Focus: Based on NAICS codes {', '.join(data.get('naics_codes', [])[:3])}

Current Content:
- Company Description: {data.get('company_description', '')}
- Core Competencies: {', '.join(data.get('core_competencies', []))}
- Differentiators: {', '.join(data.get('differentiators', []))}
- Past Performance: {', '.join(data.get('private_performance', []))}
- Certifications: {', '.join(data.get('certifications', []))}

Create professional capability statement content following these guidelines:

1. ABOUT US (80-120 words): Write a compelling company overview that:
   - Highlights the company's expertise and unique value proposition
   - Emphasizes commitment to quality, safety, and customer satisfaction
   - Mentions years of experience or notable achievements
   - Uses professional, confident language
   - Focuses on what makes them stand out in their industry

2. PAST PERFORMANCE (5-6 items): Create impressive, specific achievements:
   - Format: "Brief description highlighting scale/impact and results"
   - Include quantifiable metrics (number of projects, success rate, etc.)
   - Emphasize on-time delivery, budget compliance, quality
   - Show breadth of experience
   - Use professional, achievement-focused language

3. CORE COMPETENCIES (6-7 items): Detailed service descriptions:
   - Format: "Service Name: Detailed description of capability and value"
   - Each should be 15-25 words explaining the service comprehensively
   - Focus on expertise, approach, and client benefits
   - Use industry-specific terminology
   - Emphasize comprehensive, professional service delivery

4. DIFFERENTIATORS (5-6 items): Compelling competitive advantages:
   - Format: "Advantage Title: Explanation of how this sets them apart"
   - Each should be 15-25 words
   - Focus on proven track record, advanced capabilities, unique approaches
   - Emphasize commitment to excellence, innovation, compliance
   - Use strong, confident language

5. CERTIFICATIONS (keep all, enhance descriptions):
   - Add brief context if needed (e.g., "ISO 9001:2015 Certified: Demonstrating commitment to quality management")

Return ONLY a JSON object:
{{
  "company_description": "professional 80-120 word description",
  "past_performance": ["achievement 1", "achievement 2", ...],
  "core_competencies": ["Service: Description", ...],
  "differentiators": ["Advantage: Explanation", ...],
  "certifications": ["certification with context", ...]
}}"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert in creating professional government contracting capability statements. Create detailed, compelling content that matches industry-leading examples. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
            max_tokens=3000
        )
        
        enhanced_content = json.loads(response.choices[0].message.content)
        
        data['company_description'] = enhanced_content.get('company_description', data.get('company_description', ''))
        data['core_competencies'] = enhanced_content.get('core_competencies', data.get('core_competencies', []))
        data['differentiators'] = enhanced_content.get('differentiators', data.get('differentiators', []))
        data['private_performance'] = enhanced_content.get('past_performance', data.get('private_performance', []))
        data['certifications'] = enhanced_content.get('certifications', data.get('certifications', []))
        
        return data
        
    except Exception as e:
        logging.error(f"Error enhancing capability statement content: {str(e)}")
        return data

@app.route('/generate-enhanced-pdf', methods=['POST'])
def generate_enhanced_pdf():
    try:
        # if 'user_id' not in session:
        #     return jsonify({'error': 'User not authenticated'}), 401
        
        user_id = session.get('user_id', 'test_user')
        
        # Create user directory if it doesn't exist
        user_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{user_id}")
        os.makedirs(user_upload_dir, exist_ok=True)
        
        # Handle file uploads
        logo_path = None
        image_path = None
        
        if 'logoFile' in request.files and request.files['logoFile'].filename:
            logo_file = request.files['logoFile']
            if allowed_file(logo_file.filename):
                logo_filename = f"logo_{int(time.time())}_{logo_file.filename}"
                logo_path = os.path.join(user_upload_dir, logo_filename)
                logo_file.save(logo_path)
        
        if 'imageFile' in request.files and request.files['imageFile'].filename:
            image_file = request.files['imageFile']
            if allowed_file(image_file.filename):
                image_filename = f"image_{int(time.time())}_{image_file.filename}"
                image_path = os.path.join(user_upload_dir, image_filename)
                image_file.save(image_path)
        
        # Collect form data
        form_data = {}
        for key, value in request.form.items():
            if key.endswith('[]'):
                base_key = key[:-2]
                if base_key not in form_data:
                    form_data[base_key] = []
                form_data[base_key].append(value)
            else:
                form_data[key] = value
        
        # Process competencies, differentiators, etc. from JSON if present
        try:
            if 'competencies' in request.form:
                form_data['competencies'] = json.loads(request.form['competencies'])
            if 'differentiators' in request.form:
                form_data['differentiators'] = json.loads(request.form['differentiators'])
            if 'naicsCodes' in request.form:
                form_data['naicsCodes'] = json.loads(request.form['naicsCodes'])
            if 'certifications' in request.form:
                form_data['certifications'] = json.loads(request.form['certifications'])
        except json.JSONDecodeError:
            pass
        
        # Convert hex colors to RGB tuples
        def hex_to_rgb(hex_color):
            hex_color = hex_color.lstrip('#')
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        
        primary_color = form_data.get('primaryColor', '#2E4C8B')
        secondary_color = form_data.get('secondaryColor', '#A8D5E2')
        
        primary_rgb = hex_to_rgb(primary_color)
        secondary_rgb = hex_to_rgb(secondary_color)
        
        formatted_data = {
            'company_name': form_data.get('companyName', ''),
            'logo_color': [primary_rgb, secondary_rgb],
            'logo_path': logo_path,
            'image_path': image_path,
            'uei_code': form_data.get('ueiCode', ''),
            'cage_code': form_data.get('cageCode', ''),
            'contact_name': form_data.get('contactName', ''),
            'contact_title': form_data.get('contactTitle', ''),
            'contact_phone': form_data.get('phone', ''),
            'contact_email': form_data.get('email', ''),
            'contact_address': form_data.get('address', ''),
            'city': form_data.get('city', ''),
            'state': form_data.get('state', ''),
            'zip': form_data.get('zipCode', ''),
            'contact_website': form_data.get('website', ''),
            'company_description': form_data.get('companyDescription', ''),
            'differentiators': form_data.get('differentiators', []),
            'naics_codes': form_data.get('naicsCodes', []),
            'core_competencies': form_data.get('competencies', []),
            'certifications': form_data.get('certifications', []),
            'qr_code_path': None,
            'social_media': '',
            'public_performance_logo_paths': [],
            'private_performance': []
        }
        
        # Add past performance data
        if 'pastPerformanceClient' in form_data:
            clients = form_data['pastPerformanceClient'] if isinstance(form_data['pastPerformanceClient'], list) else [form_data['pastPerformanceClient']]
            values = form_data.get('pastPerformanceValue', [])
            descriptions = form_data.get('pastPerformanceDescription', [])
            
            if not isinstance(values, list):
                values = [values] if values else []
            if not isinstance(descriptions, list):
                descriptions = [descriptions] if descriptions else []
            
            # Ensure all lists are the same length
            max_len = max(len(clients), len(values), len(descriptions))
            clients.extend([''] * (max_len - len(clients)))
            values.extend([''] * (max_len - len(values)))
            descriptions.extend([''] * (max_len - len(descriptions)))
            
            formatted_data['private_performance'] = [
                f"{client}: {desc} (Value: {value})" 
                for client, desc, value in zip(clients, descriptions, values)
                if client or desc or value
            ]
        
        formatted_data = enhance_capability_statement_content(formatted_data)
        
        # Generate PDF
        output_filename = f"capability_statement_{user_id}_{int(time.time())}.pdf"
        output_path = os.path.join(user_upload_dir, output_filename)
        
        create_pdf(formatted_data, output_path)
        
        if not os.path.exists(output_path):
            return jsonify({'error': 'PDF generation failed'}), 500
        
        # Return the PDF file
        return send_file(output_path, as_attachment=True, download_name=f"{form_data.get('companyName', 'Company')}_Capability_Statement.pdf")
        
    except Exception as e:
        logging.error(f"Error generating enhanced PDF: {str(e)}")
        return jsonify({'error': 'Failed to generate PDF'}), 500

@app.route('/process-capability-statement', methods=['POST'])
def process_capability_statement():
    try:
        user_id = session.get('user_id', 'test_user')
        logging.info(f"Processing capability statement for user: {user_id}")
        
        # Handle file upload or URL
        capability_text = ""
        
        if 'capabilityFile' in request.files and request.files['capabilityFile'].filename:
            file = request.files['capabilityFile']
            logging.info(f"Processing file upload: {file.filename}, size: {file.content_length if hasattr(file, 'content_length') else 'unknown'}")
            
            if file and allowed_file(file.filename):
                user_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"user_{user_id}")
                os.makedirs(user_upload_dir, exist_ok=True)
                
                filename = f"temp_capability_{int(time.time())}_{file.filename}"
                filepath = os.path.join(user_upload_dir, filename)
                file.save(filepath)
                logging.info(f"File saved to: {filepath}")
                
                # Extract text from PDF
                capability_text = extract_text_from_pdf(filepath)
                logging.info(f"Extracted text length: {len(capability_text) if capability_text else 0}")
                
                os.remove(filepath)
            else:
                logging.error(f"File validation failed for: {file.filename}")
                return jsonify({'error': f'Invalid file type. Please upload a PDF file.'}), 400
        
        elif request.json and 'url' in request.json:
            url = request.json['url']
            logging.info(f"Processing URL import: {url}")
            capability_text = download_and_extract_from_url(url)
            logging.info(f"URL extracted text length: {len(capability_text) if capability_text else 0}")
        
        else:
            logging.error("No file or URL provided in request")
            return jsonify({'error': 'No file or URL provided'}), 400
        
        if not capability_text or len(capability_text.strip()) < 10:
            logging.error(f"Insufficient text extracted: '{capability_text[:100] if capability_text else ''}...' (length: {len(capability_text) if capability_text else 0})")
            error_msg = 'Could not extract meaningful text. '
            if 'url' in request.json:
                error_msg += 'The system can import from both PDF URLs and websites. If the content is too short or not relevant, please try: (1) A direct PDF URL, (2) Uploading the PDF file directly, or (3) A different webpage with more detailed company information.'
            else:
                error_msg += 'Please ensure the PDF contains readable text (not scanned images). Try using a text-based PDF or OCR software first.'
            return jsonify({'error': error_msg}), 400
        
        # Use AI to parse and structure the capability statement
        logging.info("Starting AI parsing of capability statement")
        parsed_data = parse_capability_statement_with_ai(capability_text)
        logging.info(f"AI parsing completed, fields found: {list(parsed_data.keys()) if parsed_data else 'none'}")
        
        if not parsed_data:
            logging.error("AI parsing returned empty result")
            return jsonify({'error': 'Could not parse capability statement content. Please try a different document.'}), 400
        
        return jsonify({'success': True, 'data': parsed_data})
        
    except Exception as e:
        logging.error(f"Error processing capability statement: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to process capability statement: {str(e)}'}), 500

def extract_text_from_pdf(filepath):
    """Extract text from PDF file with robust fallback methods"""
    try:
        import PyPDF2
        import fitz  # PyMuPDF
        
        logging.info(f"Attempting to extract text from PDF: {filepath}")
        
        if not os.path.exists(filepath):
            logging.error(f"PDF file does not exist: {filepath}")
            return ""
        
        file_size = os.path.getsize(filepath)
        logging.info(f"PDF file size: {file_size} bytes")
        
        text = ""
        try:
            with open(filepath, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                logging.info(f"PDF has {len(reader.pages)} pages")
                
                for i, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        text += page_text
                        logging.debug(f"PyPDF2: Page {i+1} extracted {len(page_text)} characters")
                    except Exception as page_error:
                        logging.warning(f"PyPDF2: Error extracting text from page {i+1}: {str(page_error)}")
                        continue
                
                logging.info(f"PyPDF2: Total extracted text length: {len(text)}")
        except Exception as pypdf_error:
            logging.warning(f"PyPDF2 extraction failed: {str(pypdf_error)}")
        
        if len(text.strip()) < 50:
            logging.info("PyPDF2 extracted insufficient text, trying PyMuPDF fallback...")
            try:
                doc = fitz.open(filepath)
                text = ""
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    page_text = page.get_text("text")
                    text += page_text
                    logging.debug(f"PyMuPDF: Page {page_num+1} extracted {len(page_text)} characters")
                
                doc.close()
                logging.info(f"PyMuPDF: Total extracted text length: {len(text)}")
                
                # Check if this is an image-only PDF
                if len(text.strip()) < 50:
                    logging.warning("PDF appears to be image-only or scanned. OCR may be required.")
                    
            except Exception as pymupdf_error:
                logging.error(f"PyMuPDF extraction also failed: {str(pymupdf_error)}")
        
        return text.strip()
            
    except Exception as e:
        logging.error(f"Error extracting PDF text from {filepath}: {str(e)}", exc_info=True)
        return ""

def download_and_extract_from_url(url):
    """Download PDF from URL or scrape text from website with robust fallbacks"""
    try:
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin, urlparse
        
        logging.info(f"Attempting to download content from URL: {url}")
        
        if not url.startswith(('http://', 'https://')):
            logging.error(f"Invalid URL format: {url}")
            return ""
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': f"{urlparse(url).scheme}://{urlparse(url).netloc}/"
        }
        
        try:
            head_response = requests.head(url, timeout=10, headers=headers, allow_redirects=True)
            content_type = head_response.headers.get('content-type', '').lower()
            status_code = head_response.status_code
            logging.info(f"HEAD request - Status: {status_code}, Content-Type: {content_type}")
        except Exception as e:
            logging.warning(f"HEAD request failed: {e}, proceeding with GET")
            content_type = ''
            status_code = None
        
        if 'pdf' in content_type or url.lower().endswith('.pdf'):
            logging.info("Detected direct PDF URL, downloading...")
            response = requests.get(url, timeout=30, headers=headers, stream=True, allow_redirects=True)
            
            if response.status_code == 200:
                temp_path = f"/tmp/temp_capability_{int(time.time())}.pdf"
                
                max_size = 10 * 1024 * 1024  # 10MB
                downloaded_size = 0
                
                with open(temp_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            downloaded_size += len(chunk)
                            if downloaded_size > max_size:
                                logging.error(f"PDF file too large: {downloaded_size} bytes")
                                os.remove(temp_path)
                                return ""
                            f.write(chunk)
                
                logging.info(f"Downloaded {downloaded_size} bytes to {temp_path}")
                text = extract_text_from_pdf(temp_path)
                os.remove(temp_path)
                logging.info(f"Extracted {len(text)} characters from PDF")
                return text
            else:
                logging.error(f"Failed to download PDF: HTTP {response.status_code}")
                return ""
        
        else:
            logging.info("Detected HTML page, attempting to extract content...")
            response = requests.get(url, timeout=30, headers=headers, allow_redirects=True)
            
            if response.status_code != 200:
                logging.error(f"Failed to fetch website: HTTP {response.status_code}")
                return ""
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            pdf_links = []
            for tag in soup.find_all(['a', 'iframe', 'embed', 'object']):
                href = tag.get('href') or tag.get('src') or tag.get('data')
                if href and ('.pdf' in href.lower() or 'pdf' in href.lower()):
                    absolute_url = urljoin(url, href)
                    pdf_links.append(absolute_url)
                    logging.info(f"Found potential PDF link: {absolute_url}")
            
            if pdf_links:
                logging.info(f"Attempting to download PDF from embedded link: {pdf_links[0]}")
                try:
                    pdf_response = requests.get(pdf_links[0], timeout=30, headers=headers, stream=True, allow_redirects=True)
                    if pdf_response.status_code == 200 and 'pdf' in pdf_response.headers.get('content-type', '').lower():
                        temp_path = f"/tmp/temp_capability_{int(time.time())}.pdf"
                        max_size = 10 * 1024 * 1024
                        downloaded_size = 0
                        
                        with open(temp_path, 'wb') as f:
                            for chunk in pdf_response.iter_content(chunk_size=8192):
                                if chunk:
                                    downloaded_size += len(chunk)
                                    if downloaded_size > max_size:
                                        logging.error(f"Embedded PDF too large: {downloaded_size} bytes")
                                        os.remove(temp_path)
                                        break
                                    f.write(chunk)
                        
                        if os.path.exists(temp_path):
                            logging.info(f"Downloaded embedded PDF: {downloaded_size} bytes")
                            text = extract_text_from_pdf(temp_path)
                            os.remove(temp_path)
                            if text and len(text.strip()) > 10:
                                logging.info(f"Successfully extracted {len(text)} characters from embedded PDF")
                                return text
                except Exception as pdf_error:
                    logging.warning(f"Failed to download embedded PDF: {pdf_error}")
            
            logging.info("No valid PDF found, scraping HTML text content...")
            
            for element in soup(["script", "style"]):
                element.decompose()
            
            text_parts = []
            
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=['content', 'main-content', 'page-content', 'container'])
            
            if main_content:
                logging.info("Found main content area")
                text_parts.append(main_content.get_text(separator='\n', strip=True))
            else:
                logging.info("No main content area, extracting from common elements...")
                
                for meta in soup.find_all('meta', attrs={'name': ['description', 'og:description']}):
                    content = meta.get('content', '')
                    if content:
                        text_parts.append(content)
                        logging.info(f"Found meta description: {len(content)} chars")
                
                for tag in soup.find_all(['p', 'li', 'td', 'h1', 'h2', 'h3', 'h4', 'div']):
                    text = tag.get_text(separator=' ', strip=True)
                    if text and len(text) > 20:  # Only meaningful text
                        text_parts.append(text)
                
                logging.info(f"Extracted text from {len(text_parts)} elements")
            
            combined_text = '\n'.join(text_parts)
            lines = [line.strip() for line in combined_text.split('\n') if line.strip()]
            final_text = '\n'.join(lines)
            
            import re
            final_text = re.sub(r'\n{3,}', '\n\n', final_text)
            final_text = re.sub(r' {2,}', ' ', final_text)
            
            logging.info(f"Final scraped text: {len(final_text)} characters from {len(lines)} lines")
            
            if len(final_text.strip()) < 200:
                logging.info("Extracted text too short, trying full page text extraction...")
                final_text = soup.get_text(separator='\n', strip=True)
                lines = [line.strip() for line in final_text.split('\n') if line.strip()]
                final_text = '\n'.join(lines)
                logging.info(f"Full page extraction: {len(final_text)} characters")
            
            return final_text
            
    except requests.exceptions.Timeout:
        logging.error(f"Timeout downloading from URL: {url}")
        return ""
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error downloading from URL {url}: {str(e)}")
        return ""
    except Exception as e:
        logging.error(f"Error downloading from URL {url}: {str(e)}", exc_info=True)
        return ""

def parse_capability_statement_with_ai(text):
    """Use AI to parse capability statement text into structured data"""
    try:
        logging.info("Starting AI parsing of capability statement text")
        
        max_chars = 8000  # Conservative limit for GPT-3.5-turbo
        if len(text) > max_chars:
            text = text[:max_chars] + "..."
            logging.info(f"Truncated text to {max_chars} characters")
        
        messages = [
            {"role": "system", "content": "You are an expert at parsing capability statements. Extract structured data from the provided text and return it as valid JSON with fields: companyName, contactName, phone, email, address, city, state, zipCode, website, companyDescription, competencies (array), differentiators (array), ueiCode, cageCode, naicsCodes (array), certifications (array). Only include fields that you can clearly identify from the text. Return ONLY the JSON object, no additional text."},
            {"role": "user", "content": f"Parse this capability statement text and return only JSON:\n\n{text}"}
        ]
        
        completion = client_CS_BUILDER_OPENAI_API_KEY.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=1000,
            temperature=0.1
        )
        
        response_text = completion.choices[0].message.content.strip()
        logging.info(f"AI response length: {len(response_text)}")
        logging.debug(f"AI response: {response_text[:200]}...")
        
        import json
        import re
        
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            parsed_data = json.loads(json_str)
            logging.info(f"Successfully parsed JSON with fields: {list(parsed_data.keys())}")
            return parsed_data
        else:
            try:
                parsed_data = json.loads(response_text)
                logging.info(f"Successfully parsed entire response as JSON with fields: {list(parsed_data.keys())}")
                return parsed_data
            except json.JSONDecodeError:
                logging.error(f"Could not parse AI response as JSON: {response_text}")
                return {}
        
    except Exception as e:
        logging.error(f"Error parsing with AI: {str(e)}", exc_info=True)
        return {}

@app.route('/update_selected_capability', methods=['POST'])
def update_selected_capability():
    """Update which capability statement is currently selected as primary"""
    try:
        if 'user' not in session:
            return jsonify({'error': 'User not authenticated'}), 401
        
        user = session['user']
        user_id = user['localId']
        id_token = user['idToken']
        filename = request.json.get('filename')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
        
        # Get user uploads directory
        user_data = db.child("users").child(user_id).get(id_token).val()
        if not user_data or 'uploads_dir' not in user_data:
            return jsonify({'error': 'User uploads directory not found'}), 400
        
        user_uploads_dir = user_data['uploads_dir']
        csv_path = os.path.join(user_uploads_dir, 'capability_statements_processed.csv')
        
        if not os.path.exists(csv_path):
            return jsonify({'error': 'Capability statements CSV not found'}), 404
        
        df = pd.read_csv(csv_path)
        df['is_primary'] = df['filename'] == filename
        df.to_csv(csv_path, index=False)
        
        logging.info(f"✅ Updated primary capability statement to {filename} for user {user_id}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error updating selected capability: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload_document', methods=['POST'])
def upload_document():
    """Upload document to user's profile for AI assistant use with credit deduction"""
    try:
        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 401
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        user_id = user['localId']
        id_token = user['idToken']
        
        if not user_data or 'uploads_dir' not in user_data:
            return jsonify({"error": "User uploads directory not found"}), 400
            
        skip_credits = True  # TODO: Set to False to re-enable credit checks after Firebase is fixed
        
        if not skip_credits:
            # Initialize credit manager and check credits
            credit_manager = CreditManager(db)
            current_credits = credit_manager.get_user_credits(user_id, id_token)
            
            if current_credits < 2:
                return jsonify({
                    "error": "Insufficient credits for document upload",
                    "credits_required": 2,
                    "current_balance": current_credits
                }), 402
        else:
            current_credits = 0  # Placeholder when credits are bypassed
            logging.info(f"⚠️ TEMPORARY: Bypassing credit checks for capability statement upload")
            
        user_uploads_dir = user_data['uploads_dir']
        
        # Create uploads directory if it doesn't exist
        if not os.path.exists(user_uploads_dir):
            os.makedirs(user_uploads_dir)
            logging.info(f"✅ Created uploads directory: {user_uploads_dir}")
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if file and allowed_file(file.filename):
            if not skip_credits:
                success, message = credit_manager.deduct_credits(
                    user_id, id_token, 2, "document_upload", f"Upload document: {file.filename}"
                )
                if not success:
                    return jsonify({"error": message}), 402
            
            filename = secure_filename(file.filename)
            file_path = os.path.join(user_uploads_dir, filename)
            file.save(file_path)
            
            # Process all capability statement PDFs in directory into CSV
            try:
                pdf_files = [
                    os.path.join(user_uploads_dir, f) 
                    for f in os.listdir(user_uploads_dir) 
                    if f.lower().endswith('.pdf')
                ]
                if pdf_files:
                    output_csv = os.path.join(user_uploads_dir, 'capability_statements_processed.csv')
                    process_pdfs(pdf_files, output_csv)
                    logging.info(f"✅ Processed {len(pdf_files)} capability statement PDF(s) for user {user_id}")
            except Exception as e:
                logging.error(f"Error processing capability statement PDFs: {e}")
            
            documents_ref = db.child("users").child(user['localId']).child("documents")
            document_data = {
                'filename': filename,
                'upload_date': datetime.now().isoformat(),
                'file_path': file_path,
                'file_type': filename.split('.')[-1].lower(),
                'credits_used': 2
            }
            documents_ref.push(document_data, user['idToken'])
            
            return jsonify({
                "success": True, 
                "filename": filename,
                "credits_used": 0 if skip_credits else 2,
                "remaining_credits": current_credits if skip_credits else current_credits - 2
            })
        else:
            return jsonify({"error": "File type not allowed"}), 400
            
    except Exception as e:
        logging.error(f"Error uploading document: {e}")
        return jsonify({"error": str(e)}), 500

def get_user_uploaded_documents(user_id, admin_db=None):
    """
    Retrieve uploaded documents from user's profile
    
    Args:
        user_id: Firebase user ID
        admin_db: Firebase Admin SDK database reference (if available)
    
    Returns:
        list: List of document metadata with content excerpts
    """
    try:
        documents = []
        
        if admin_db:
            documents_ref = admin_db.reference(f'users/{user_id}/documents')
            docs_data = documents_ref.get()
            
            if docs_data:
                for doc_key, doc_info in docs_data.items():
                    file_path = doc_info.get('file_path', '')
                    filename = doc_info.get('filename', '')
                    
                    content_excerpt = ""
                    if os.path.exists(file_path):
                        try:
                            if file_path.lower().endswith('.pdf'):
                                import fitz
                                doc = fitz.open(file_path)
                                content_excerpt = doc[0].get_text()[:1000] if len(doc) > 0 else ""
                            elif file_path.lower().endswith(('.txt', '.doc', '.docx')):
                                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                    content_excerpt = f.read()[:1000]
                        except Exception as e:
                            logging.warning(f"Could not read document {filename}: {e}")
                    
                    documents.append({
                        'filename': filename,
                        'file_type': doc_info.get('file_type', ''),
                        'upload_date': doc_info.get('upload_date', ''),
                        'content_excerpt': content_excerpt
                    })
                
                logging.info(f"Retrieved {len(documents)} uploaded documents for user {user_id}")
        
        return documents
        
    except Exception as e:
        logging.error(f"Error retrieving user documents: {e}")
        return []

def extract_company_identity(user_uploads_dir):
    """
    Extract company name and identity from capability statement
    
    Args:
        user_uploads_dir: User's uploads directory path
    
    Returns:
        dict: Company identity information
    """
    try:
        cs_file = os.path.join(user_uploads_dir, "capability_statements_processed.csv")
        if os.path.exists(cs_file):
            cs_df = pd.read_csv(cs_file, dtype=str)
            if not cs_df.empty and 'Company' in cs_df.columns:
                company_name = cs_df["Company"].iloc[0]
                logging.info(f"Extracted company name: {company_name}")
                return {'company_name': company_name}
        
        logging.warning("Could not extract company identity")
        return {'company_name': 'your company'}
        
    except Exception as e:
        logging.error(f"Error extracting company identity: {e}")
        return {'company_name': 'your company'}



@app.route('/contract_analysis', methods=['POST'])
def analyze_contract_endpoint():
    """Dedicated endpoint for contract analysis"""
    try:
        hash_value = request.form.get('hash_value')
        if not hash_value:
            return jsonify({"error": "hash_value is required"}), 400
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        user_uploads_dir = user_data['uploads_dir']
        
        contract_content = process_selected_contract(user_uploads_dir, hash_value)
        capability_statement = process_files_user_input(user_uploads_dir)
        
        contract_requirements = enhanced_ai.analyze_contract_requirements(contract_content)
        win_probability = enhanced_ai.calculate_win_probability(capability_statement, contract_requirements)
        compliance_checklist = enhanced_ai.generate_compliance_checklist(contract_requirements)
        proposal_outline = enhanced_ai.generate_proposal_outline(contract_requirements, capability_statement)
        
        company_profile = {"capabilities": capability_statement}
        opportunity_score = opportunity_scorer.score_opportunity({"content": contract_content}, company_profile)
        competitive_analysis = competitive_intel.analyze_competition({"content": contract_content}, "GENERAL")
        
        return jsonify({
            "contract_requirements": contract_requirements,
            "win_probability": win_probability,
            "compliance_checklist": compliance_checklist,
            "proposal_outline": proposal_outline,
            "opportunity_score": opportunity_score,
            "competitive_analysis": competitive_analysis
        })
        
    except Exception as e:
        app.logger.error(f"Error in contract analysis: {str(e)}")
        return jsonify({"error": f"Contract analysis error: {str(e)}"}), 500

@app.route('/proposal_timeline', methods=['POST'])
def create_proposal_timeline():
    """Create automated proposal development timeline"""
    try:
        hash_value = request.form.get('hash_value')
        if not hash_value:
            return jsonify({"error": "hash_value is required"}), 400
            
        user = session['user']
        user_id = user['localId']
        
        contract_data = {
            'hash_value': hash_value,
            'title': request.form.get('contract_title', 'Contract'),
            'due_date': request.form.get('due_date', '2024-12-31')
        }
        
        timeline = deadline_manager.create_proposal_timeline(contract_data, user_id)
        
        return jsonify({
            "timeline": timeline,
            "message": "Proposal timeline created successfully"
        })
        
    except Exception as e:
        app.logger.error(f"Error creating timeline: {str(e)}")
        return jsonify({"error": f"Timeline creation error: {str(e)}"}), 500

@app.route('/upcoming_deadlines', methods=['GET'])
def get_upcoming_deadlines():
    """Get upcoming proposal deadlines for user"""
    try:
        user = session['user']
        user_id = user['localId']
        
        days_ahead = request.args.get('days', 7, type=int)
        deadlines = deadline_manager.get_upcoming_deadlines(user_id, days_ahead)
        
        return jsonify({"deadlines": deadlines})
        
    except Exception as e:
        app.logger.error(f"Error getting deadlines: {str(e)}")
        return jsonify({"error": f"Deadlines error: {str(e)}"}), 500

@app.route('/industry_template', methods=['POST'])
def get_industry_template():
    """Get customized industry template for proposal"""
    try:
        industry = request.form.get('industry', 'PROFESSIONAL_SERVICES')
        hash_value = request.form.get('hash_value')
        
        if not hash_value:
            return jsonify({"error": "hash_value is required"}), 400
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        user_uploads_dir = user_data['uploads_dir']
        
        contract_content = process_selected_contract(user_uploads_dir, hash_value)
        capability_statement = process_files_user_input(user_uploads_dir)
        
        contract_requirements = {"content": contract_content}
        company_profile = {"capabilities": capability_statement}
        
        customized_template = template_library.get_customized_template(
            industry, contract_requirements, company_profile
        )
        
        return jsonify({
            "template": customized_template,
            "industry": industry
        })
        
    except Exception as e:
        app.logger.error(f"Error getting template: {str(e)}")
        return jsonify({"error": f"Template error: {str(e)}"}), 500


##New Button tailor_cs_for_contract
@app.route('/tailor_cs_for_contract', methods=['POST'])
def tailor_cs_for_contract():
    # 1. 验证用户登录
    user = session.get('user')
    if not user:
        return jsonify({"error": "User not logged in"}), 401

    # 2. 获取前端传来的hash_value
    hash_value = request.form.get('hash_value')
    if not hash_value:
        return jsonify({"error": "No hash_value provided"}), 400

    # 3. 获取用户上传目录
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    user_uploads_dir = user_data.get('uploads_dir')
    if not user_uploads_dir or not os.path.exists(user_uploads_dir):
        return jsonify({"error": "User uploads directory not found"}), 400

    # 4. 使用process_selected_contract函数获取合同和CS的组合内容
    combined_content = process_selected_contract(user_uploads_dir, hash_value)
    if combined_content.startswith("Error") or combined_content.startswith("No matching"):
        return jsonify({"error": combined_content}), 404

    # 5. 重新构造针对tailoring的系统提示
    tailoring_instructions = """
    You are an expert procurement consultant. The user wants to tailor their Capability Statement for a specific contract.
    Please perform the following steps:
    1. Summarize the contract's main requirements.
    2. Compare the provided Capability Statement with the contract needs.
    3. Identify any gaps where the CS does not address the contract requirements.
    4. Provide actionable, bullet-point recommendations to improve the CS.
    Respond in one message.
    """

    # 6. 结合系统提示和process_selected_contract的输出
    # 注意: process_selected_contract已经提供了格式化的合同和CS信息
    system_prompt = f"{tailoring_instructions}\n\n{combined_content}"

    # 7. 调用OpenAI API获取tailored建议
    try:
        response = client_BID_RESPONSE_OPENAI_API_KEY.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt}
            ],
            temperature=0.0,
            max_tokens=1000
        )
        if not response or not response.choices:
            return jsonify({"error": "No response from GPT"}), 500
        gpt_result = response.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(f"Error calling GPT: {e}")
        return jsonify({"error": str(e)}), 500

    # 8. 返回结果给前端
    return jsonify({"response": gpt_result})  







#SUCCESS PAGE ROUTE FUNCTION 
@app.route('/success')
def success():
    return render_template('success.html')




@app.route('/index', methods=['GET'])
def index():
    hash_value = request.args.get('hash_value')
    bid_number = request.args.get('bid_number')
    user = session.get('user')
    if not user:
        return redirect(url_for('Login'))

    # Ensure a fresh Firebase token before querying data
    try:
        user_logged_in = auth.refresh(user['refreshToken'])
        app.logger.info(f"✅ Token refreshed for user {user['localId']}")
    except Exception as token_error:
        app.logger.error(f"❌ Token refresh failed for {user['localId']}: {token_error}", exc_info=True)
        return render_template('error.html', error="Session expired. Please log in again.")

    # Retrieve user data from Firebase with proper validation
    try:
        user_data = db.child("users").child(user['localId']).get(user_logged_in['idToken']).val()
        if not user_data:
            app.logger.error(f"❌ No user data found for {user['localId']}")
            return render_template('error.html', error="User data missing. Contact support.")
        app.logger.info(f"✅ Retrieved user data for {user['localId']}")
    except Exception as data_error:
        app.logger.error(f"❌ Firebase data fetch failed for {user['localId']}: {data_error}", exc_info=True)
        return render_template('error.html', error="Error retrieving user data. Contact support.")

    # Retrieve user uploads directory
    user_uploads_dir = os.path.abspath(user_data.get('uploads_dir', 'uploads/'))
    
    # Initialize contract details
    contract_details = None

    # ─────────────────────────────────────────────
    # 1) If we have a hash_value, check BOTH
    #    matches.csv THEN matches_SMART_SEARCH.csv
    # ─────────────────────────────────────────────
    if hash_value:
        # First check matches.csv
        matches_file = os.path.join(user_uploads_dir, 'matches.csv')
        if os.path.exists(matches_file):
            try:
                with open(matches_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        row = {k.strip(): v for k, v in row.items()}

                        detail_link = (
                            row.get('Detail Link') or
                            row.get('Detail_Link') or
                            row.get('detail_link') or
                            '#'
                        )
                        row_bid_number = (
                            row.get('Bid Number') or
                            row.get('Bid_Number') or
                            row.get('bid_number') or
                            ''
                        )
                        hash_input = f"{detail_link}{row_bid_number}"
                        computed_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

                        if computed_hash == hash_value:
                            contract_details = row
                            app.logger.info(f"通过哈希值找到合同 (matches.csv): {row_bid_number}")
                            break
            except Exception as e:
                app.logger.error(f"Error reading matches file: {str(e)}", exc_info=True)

        # If still not found, check matches_SMART_SEARCH.csv
        if not contract_details:
            matches_smart_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
            if os.path.exists(matches_smart_file):
                try:
                    with open(matches_smart_file, 'r', encoding='utf-8') as file:
                        reader = csv.DictReader(file)
                        for row in reader:
                            row = {k.strip(): v for k, v in row.items()}

                            detail_link = (
                                row.get('Detail Link') or
                                row.get('Detail_Link') or
                                row.get('detail_link') or
                                '#'
                            )
                            row_bid_number = (
                                row.get('Bid Number') or
                                row.get('Bid_Number') or
                                row.get('bid_number') or
                                ''
                            )
                            hash_input = f"{detail_link}{row_bid_number}"
                            computed_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

                            if computed_hash == hash_value:
                                contract_details = row
                                app.logger.info(f"通过哈希值找到合同 (matches_SMART_SEARCH.csv): {row_bid_number}")
                                break
                except Exception as e:
                    app.logger.error(f"Error reading matches_SMART_SEARCH.csv: {str(e)}", exc_info=True)

    # ─────────────────────────────────────────────
    # 2) If not found yet, check embedded_bids.csv
    #    using bid_number logic (unchanged)
    # ─────────────────────────────────────────────
    if not contract_details and bid_number:
        matches_file = os.path.join(user_uploads_dir, 'matches.csv')
        if os.path.exists(matches_file):
            try:
                with open(matches_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        row_bid_number = row.get('Bid Number') or row.get('Bid_Number') or ''
                        if row_bid_number.strip().lower() == bid_number.strip().lower():
                            contract_details = row
                            app.logger.info(f"通过bid_number找到合同: {bid_number}")
                            break
            except Exception as e:
                app.logger.error(f"读取matches文件错误: {str(e)}", exc_info=True)

    # ─────────────────────────────────────────────
    # 3) Find the capability statement if any
    # ─────────────────────────────────────────────
    cs_name = None
    for filename in os.listdir(user_uploads_dir):
        if filename.endswith('.pdf'):
            cs_name = filename
            break

    # ─────────────────────────────────────────────
    # 4) If found, show /index page; else 404
    # ─────────────────────────────────────────────
    if contract_details:
        app.logger.info(f"为生成响应提供合同: {contract_details.get('Bid_Name', 'Unknown')}")
        return render_template('index.html', contract=contract_details, capability_statement=cs_name)
    else:
        app.logger.error(f"找不到合同详情，hash_value={hash_value}, bid_number={bid_number}")
        return "Contract details not found", 404

@app.route('/download_proposal', methods=['POST'])
def download_proposal():
    """Generate and download full proposal document in Word format"""
    try:
        if 'user' not in session:
            return jsonify({'error': 'User not authenticated'}), 401
        
        # Get proposal data from request
        proposal_data = request.json.get('proposal_data')
        contract_name = request.json.get('contract_name', 'Government Contract Proposal')
        company_name = request.json.get('company_name', 'Your Company')
        
        if not proposal_data:
            app.logger.error("No proposal data provided")
            return jsonify({'error': 'Proposal data is required'}), 400
        
        app.logger.info(f"Proposal data keys: {proposal_data.keys()}")
        
        # Create Word document
        doc = Document()
        
        # Add title page
        doc.add_heading(f'{company_name}', 0)
        doc.add_heading(f'Proposal Response', 1)
        doc.add_heading(f'{contract_name}', 2)
        doc.add_paragraph(f'\nSubmitted: {datetime.now().strftime("%B %d, %Y")}')
        doc.add_page_break()
        
        # Add each section - handle both 'sections' and 'proposal_sections' keys
        sections = proposal_data.get('sections', proposal_data.get('proposal_sections', []))
        
        if not sections:
            app.logger.error(f"No sections found in proposal data. Keys: {proposal_data.keys()}")
            return jsonify({'error': 'No proposal sections found in data'}), 400
        
        app.logger.info(f"Processing {len(sections)} sections")
        
        for section in sections:
            section_title = section.get('section', section.get('title', 'Untitled Section'))
            section_content = section.get('content', '')
            doc.add_heading(section_title, 1)
            doc.add_paragraph(section_content)
            doc.add_page_break()
        
        # Add footer with page numbers
        for section in doc.sections:
            footer = section.footer
            footer_para = footer.paragraphs[0]
            footer_para.text = f'{company_name} - {contract_name}\t'
            footer_para.alignment = 1
        
        # Save to buffer
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        # Generate filename
        safe_contract_name = "".join(c for c in contract_name if c.isalnum() or c in (' ', '-', '_')).strip()
        filename = f'{company_name}_{safe_contract_name}_Proposal.docx'
        
        app.logger.info(f"Successfully generated proposal document: {filename}")
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        app.logger.error(f"Error generating proposal download: {e}", exc_info=True)
        return jsonify({'error': f'Failed to generate proposal document: {str(e)}'}), 500






# Route for displaying the top 5 fitting contracts
@app.route('/view_matches', methods=['GET'])
def view_matches():
    if 'user' not in session:
        return jsonify({"success": False, "message": "User not logged in."})

    user_id = session['user']['localId']
    cloud_path = f"matches/{user_id}/matches.csv"

    try:
        # Step 1: Read the matches.csv file directly from Firebase Storage
        file_data = storage.child(cloud_path).get()  # Get the file content as bytes

        # Step 2: Convert the file data to a readable format using io.StringIO
        csv_file = io.StringIO(file_data.decode('utf-8'))  # Decode bytes to string

        # Step 3: Parse the CSV file in memory
        matches = []
        reader = csv.DictReader(csv_file)
        for row in reader:
            app.logger.info(f"CSV Row Data: {row}")  # Log each row to the console
            matches.append(row)

        # Step 4: Log the entire matches data to the console
        app.logger.info(f"Full Matches Data: {matches}")

        # Step 5: Send the matches data to the template for rendering
        return render_template('your_template.html', matches=matches)

    except Exception as e:
        app.logger.error(f"Error reading matches.csv: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": "Error reading the matches file."})





# New route to handle document generation and download
@app.route('/generate_docx', methods=['POST'])
def generate_docx():
    # Extract response content and contract name from the POST request
    response_content = request.form.get('response_content')
    contract_name = request.form.get('contract_name', 'CORAMA Response')  # Default to 'CORAMA Response' if not provided

    # Create a new Word document with a dynamic title
    doc = Document()
    doc.add_heading(f'Response to: {contract_name}', 0)  # Dynamic heading with the contract name
    doc.add_paragraph(response_content)

    # Create an in-memory buffer to save the document
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    # Send the document back as a downloadable file
    return send_file(buffer, as_attachment=True, download_name=f'{contract_name}_response.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')


@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        email = request.form.get('email')  # Get the email from the form
        try:
            auth.send_password_reset_email(email)
            # Provide feedback that the email has been sent
            return render_template('reset_password.html', 
                                   message="A password reset link has been sent to your email.")
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            error_message = "Failed to send password reset email. Please check the email address."
            return render_template('reset_password.html', error=error_message)
    return render_template('reset_password.html')

# Route for the PDF page
@app.route('/onepager')
def corama_pdf():
    return render_template('corama_pdf.html')

# Static route to serve the PDF file
@app.route('/static/uploads/<filename>')
def serve_pdf(filename):
    return send_from_directory('static/uploads', filename)




   
#TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/terms_of_use', methods=['GET']) 
def termsofuse():
    return render_template('terms_of_use.html')




   
#TEAM DETAIL PAGE ROUTE FUNCTION 
@app.route('/privacy_notice', methods=['GET']) 
def privacynotice():
    return render_template('privacy_notice.html')



@app.route('/add_contract', methods=['GET']) 
def addContract():
    return render_template('addcontract.html')




#PROCESS CONTRACT 
@app.route('/process_contract', methods=['POST'])
def process_contract():
    # Handle form data
    form_data = request.form.to_dict()
    contract_data = {
        'Bid Number': form_data.get('bidNumber'),
        'Bid Name': form_data.get('bidName'),
        'Bid Description': form_data.get('bidDescription'),
        'Status': form_data.get('status'),
        'Available Date': form_data.get('availableDate'),
        'Due Date': form_data.get('dueDate'),
        'Category': form_data.get('category'),
        'Industry': form_data.get('industry'),
        'Budget Estimate': form_data.get('budgetEstimate'),
        'Organization': form_data.get('organization'),
        'Department': form_data.get('department'),
        'Detail Link': form_data.get('detailLink'),
        'Is Small Business': form_data.get('isSmallBusiness'),
        'Project Duration': form_data.get('projectDuration')
    }

    # Save contract data to CSV
    contract_csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'contract_data.csv')
    with open(contract_csv_path, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=contract_data.keys())
        writer.writeheader()
        writer.writerow(contract_data)

    # Handle capability statement upload
    file = request.files.get('capabilityStatement')
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # Process the capability statement and save to CSV
        process_pdfs([file_path], 'capability_statements_processed.csv')
        generate_capability_embeddings('capability_statements_processed.csv', 'capability_statements_embedded.csv')

    return redirect(url_for('index2'))





@app.route('/index2', methods=['GET'])
def index2():
    # Load contract data from CSV
    contract_data = {}
    contract_csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'contract_data.csv')
    if os.path.exists(contract_csv_path):
        with open(contract_csv_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            contract_data = next(reader, {})

    # Load capability statement data
    capability_statement = 'capability_statements_embedded.csv'  # Assuming this is the processed file

    return render_template('index2.html', contract=contract_data, capability_statement=capability_statement)



#blog ROUTE FUNCTION 
@app.route('/blog', methods=['GET']) 
def Blog():
    return render_template('blog.html')





@app.route('/blogdetail', methods=['GET']) 
def Blogdetail():
    return render_template('blogdetail.html')



@app.route('/blogdetail_Changing_the_Bidding_Landscape', methods=['GET']) 
def Blogdetail_Changing_the_Bidding_Landscapel():
    return render_template('blogdetail_Changing_the_Bidding_Landscape.html')


@app.route('/blogdetail_Traditional_Bidding_Processes', methods=['GET']) 
def Blogdetail_Traditional_Bidding_Processes():
    return render_template('blogdetail_Traditional_Bidding_Processes.html')


@app.route('/blogdetail_Supports_Minority_Women', methods=['GET']) 
def Blogdetail_Supports_Minority_Women():
    return render_template('blogdetail_Supports_Minority_Women.html')


@app.route('/blogdetailBetween_RFP_and_RFQ', methods=['GET']) 
def BlogdetailBetween_RFP_and_RFQ():
    return render_template('blogdetailBetween_RFP_and_RFQ.html')



# ---------------------------------------------------------------------
# [START OF SMART SEARCH]
# ---------------------------------------------------------------------

class QdrantStore:
    def __init__(self, dimension=1536):
        qdrant_url = os.getenv('QDRANT_URL')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        
        if not qdrant_url or not qdrant_api_key:
            raise ValueError("Qdrant configuration not found in environment variables")
            
        self.client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )
        
        self.collection_name = "contracts"
        try:
            self.client.get_collection(self.collection_name)
            logging.info(f"Connected to existing collection {self.collection_name}")
        except Exception as e:
            logging.error(f"Error connecting to collection: {e}")
            raise

    def search(self, query_vector, top_k=10):
        try:
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
                score_threshold=0.75  # 保证只返回相似度 ≥ 0.7 的结果
            )
            logging.info(f"Search returned {len(search_result)} results")
            return [(hit.payload, hit.score) for hit in search_result]
        except Exception as e:
            logging.error(f"Search error: {e}")
            return []


    @staticmethod
    def inspect_state_values():
        try:
            qdrant_url = os.getenv('QDRANT_URL')
            qdrant_api_key = os.getenv('QDRANT_API_KEY')
            
            client = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key
            )
            
            scroll_result = client.scroll(
                collection_name="contracts",
                limit=100,  # 取100条数据作为样本
                with_vectors=False
            )
            
            states = set()
            for point in scroll_result[0]:
                state = point.payload.get('state')
                states.add(state)
                
            logging.info(f"Unique state values in database: {states}")
            return states
        except Exception as e:
            logging.error(f"Error inspecting state values: {e}")
            return None

def normalize_payload(payload):
    """
    将 payload 中的键转换为小写，并将空格替换为下划线
    """
    normalized = {}
    for key, value in payload.items():
        new_key = key.strip().lower().replace(" ", "_")
        normalized[new_key] = value
    return normalized


def load_all_contracts(client):
    """
    分页加载集合中所有合同数据，使用 offset 参数实现分页
    """
    all_contracts = []
    offset = 0
    while True:
        scroll_result = client.scroll(
            collection_name="contracts",
            limit=1000,
            with_vectors=True,
            offset=offset  # 使用 offset 分页（请确保你的 qdrant_client 版本支持此参数，否则请升级）
        )
        points = scroll_result[0]
        all_contracts.extend(points)
        if len(points) < 1000:
            break
        offset += 1000
    return all_contracts

def validate_query(query):
    if len(query) < 3:
        return False, "Query is too short. Please provide a more detailed search."
    return True, ""

def initialize_vector_store():
    try:
        vs = QdrantStore()  # 不传入维度参数
        logging.info("Successfully initialized QdrantStore")
        return vs
    except Exception as e:
        logging.error(f"Error initializing vector store: {e}")
        return None

def generate_query_embedding(query):
    try:
        response = client_SMART_SEARCH_OPENAI_API_KEY.embeddings.create(
            input=[query], 
            model="text-embedding-ada-002"
        )
        response_dict = response.to_dict()
        embedding = response_dict["data"][0]["embedding"]
        logging.info(f"Generated embedding for query: {query}")
        return embedding
    except Exception as e:
        logging.error(f"Error generating query embedding: {e}", exc_info=True)
        raise


def find_matches_with_query(query_embedding, bid_store, top_k=50):
    matches = []
    # 调用 search 方法，此时 score_threshold=0.7 会过滤出分数 ≥ 0.7 的结果
    search_result = bid_store.search(query_embedding, top_k=10000)
    logging.info(f"Raw search results count: {len(search_result)}")
    for bid, sim in search_result:
        try:
            normalized_bid = normalize_payload(bid)
            match_data = {
                "bid_number": normalized_bid.get("bid_number"),
                "bid_name": normalized_bid.get("bid_name"),
                "organization": normalized_bid.get("organization"),
                "status": normalized_bid.get("status"),
                "due_date": normalized_bid.get("due_date"),
                "category": normalized_bid.get("category"),
                "industry": normalized_bid.get("industry"),
                "department": normalized_bid.get("department"),
                "state": normalized_bid.get("state"),
                "detail_link": normalized_bid.get("detail_link"),
                "Similarity_Score": sim
            }

            # --- Add the hash_value ---
            detail_link = normalized_bid.get("detail_link", "")
            bid_number  = normalized_bid.get("bid_number", "")
            hash_input  = f"{detail_link}{bid_number}"
            match_data["hash_value"] = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

            matches.append(match_data)
        except Exception as e:
            logging.error(f"Error processing a search result row: {e}", exc_info=True)
            continue
    return matches




# Global initialization
vector_store = initialize_vector_store()

@app.route('/process_smartsearch', methods=['POST'])
def process_smartsearch():
    try:
        if not vector_store:
            logging.warning("Vector store not initialized, falling back to basic text search")
            import pandas as pd
            csv_path = os.path.join(os.path.dirname(__file__), 'Scraping_demo_results.csv')
            df = pd.read_csv(csv_path)
            
            data = request.get_json(force=True) or {}
            user_query = data.get('query', '').strip()
            
            if user_query:
                mask = (df['bid_name'].str.contains(user_query, case=False, na=False) |
                        df['category'].str.contains(user_query, case=False, na=False) |
                        df['bid_description'].str.contains(user_query, case=False, na=False))
                df = df[mask]
            
            contracts = df.to_dict('records')
            return jsonify({"success": True, "contracts": contracts})

        data = request.get_json(force=True) or {}
        user_query = data.get('query', '').strip()
        if not user_query:
            logging.warning("Empty query received for /process_smartsearch.")
            return jsonify({"success": False, "message": "Query cannot be empty."}), 400

        valid, msg = validate_query(user_query)
        if not valid:
            logging.warning(f"Invalid query: {msg}")
            return jsonify({"success": False, "message": msg}), 400

        user_query_embedding = generate_query_embedding(user_query)
        # Get all matching results with similarity >= 0.7
        search_results = find_matches_with_query(
            query_embedding=user_query_embedding,
            bid_store=vector_store,
            top_k=10000  # 返回所有候选结果
        )
        # 过滤出相似度 >= 0.7 的结果
        filtered_results = [res for res in search_results if res.get('Similarity_Score', 0) >= 0.7]
        
        if not filtered_results:
            return jsonify({"success": True, "matches": [], "message": "No matching contracts found."})
        
        # 对搜索结果进行分页处理
        items_per_page = 50
        try:
            page = int(request.args.get('page', 1))
        except ValueError:
            page = 1
        total_matches = len(filtered_results)
        total_pages = (total_matches + items_per_page - 1) // items_per_page
        start = (page - 1) * items_per_page
        end = start + items_per_page
        paginated_matches = filtered_results[start:end]
        
        return jsonify({
            "success": True,
            "matches": paginated_matches,
            "total_matches": total_matches,
            "current_page": page,
            "total_pages": total_pages
        })

    except Exception as e:
        logging.error(f"Error in /process_smartsearch: {e}", exc_info=True)
        return jsonify({"success": False, "message": "Error processing the search."}), 500




# ---------------------------------------------------------------------------
# SMART SEARCH
# ---------------------------------------------------------------------------
@app.route('/smartsearch', methods=['GET', 'POST'])
def Smartsearch():
    try:
        # ---------------------------------------------------------------------
        # Step 0: Ensure user is authenticated
        # ---------------------------------------------------------------------
        user = auth.current_user
        if not user:
            logging.warning("No authenticated user found. Redirecting to login.")
            return redirect(url_for('Login'))

        user_id = user['localId']
        logging.info(f"Authenticated user ID: {user_id}")

        # ---------------------------------------------------------------------
        # Step 1: Refresh the user's token
        # ---------------------------------------------------------------------
        try:
            user_logged_in = auth.refresh(user['refreshToken'])
            logging.info(f"Token refreshed successfully for user ID: {user_id}")
        except Exception as token_error:
            logging.error(f"Token refresh failed for user ID {user_id}: {token_error}")
            flash("Session issue detected. Please try again.", "error")
            return redirect(url_for('Smartsearch'))  # or handle as needed

        # ---------------------------------------------------------------------
        # Step 2: Retrieve user data from Firebase
        # ---------------------------------------------------------------------
        user_data = None
        for _ in range(2):
            try:
                user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
                if user_data:
                    break
            except Exception as data_error:
                logging.warning(f"Retrying Firebase fetch for user {user_id}: {data_error}")

        if not user_data:
            return render_template('error.html', error="Temporary issue retrieving user data. Please try again.")

        email = user_data.get('email', '').strip().lower()
        company_name = user_data.get('company', 'No Company')
        first_name = user_data.get('first_name', 'User')
        logging.info(f"✅ FREE ACCESS granted to /smartsearch for user {user_id} - Contract Radar Maximizer is completely free!")

        # ---------------------------------------------------------------------
        # Step 4: Pull the user's uploads directory with fallback creation
        # ---------------------------------------------------------------------
        user_uploads_dir = user_data.get('uploads_dir')
        if not user_uploads_dir:
            try:
                app.logger.info(f"🔧 Creating missing uploads directory for user {user_id}")
                user_uploads_dir = create_user_directory(user_id)
                
                # Update Firebase with the new uploads directory path
                db.child("users").child(user_id).update({
                    "uploads_dir": user_uploads_dir
                }, user_logged_in['idToken'])
                
                app.logger.info(f"✅ Successfully created and updated uploads directory for user {user_id}: {user_uploads_dir}")
            except Exception as e:
                app.logger.error(f"❌ Failed to create uploads directory for user {user_id}: {e}")
                return render_template('error.html', error="Unable to initialize user directory. Please contact support.")
        
        if not os.path.exists(user_uploads_dir):
            app.logger.warning(f"⚠️ Directory path exists in Firebase but not on filesystem: {user_uploads_dir}")
            try:
                os.makedirs(user_uploads_dir, exist_ok=True)
                # Copy embedded CSV file if it exists
                embedded_csv_file = os.path.join(os.getcwd(), "embedded_bids.csv")
                if os.path.exists(embedded_csv_file):
                    shutil.copy(embedded_csv_file, user_uploads_dir)
                app.logger.info(f"✅ Recreated missing directory: {user_uploads_dir}")
            except Exception as e:
                app.logger.error(f"❌ Failed to recreate directory {user_uploads_dir}: {e}")
                return render_template('error.html', error="Directory initialization failed. Please contact support.")

        # ---------------------------------------------------------------------
        # NEW: Determine the company_name from capability_statements_processed.csv
        # ---------------------------------------------------------------------
        detected_company_name = "Unknown"
        cs_file = os.path.join(user_uploads_dir, "capability_statements_processed.csv")
        if os.path.exists(cs_file):
            try:
                cs_df = pd.read_csv(cs_file, dtype=str)
                if "Company" in cs_df.columns and not cs_df.empty:
                    detected_company_name = cs_df["Company"].iloc[0]
                    logging.info(f"[SMARTSEARCH] Found company name in CSV: {detected_company_name}")
            except Exception as e:
                logging.warning(f"[SMARTSEARCH] Error reading company name from CSV: {e}")

        # ---------------------------------------------------------------------
        # Step 5: Handle the user’s search query (unchanged logic)
        #         - If query == '' => show all
        #         - Else => do embedding-based search
        # ---------------------------------------------------------------------
        query = request.args.get('query', '').strip()
        try:
            page = int(request.args.get('page', 1))
        except ValueError:
            page = 1
        items_per_page = 50

        # Initialize Qdrant client
        qdrant_url    = os.getenv('QDRANT_URL')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)

        def normalize_payload(payload):
            new_payload = {}
            for k, v in payload.items():
                new_payload[k.lower().replace(" ", "_")] = v
            return new_payload

        def read_contracts_from_qdrant(offset, limit):
            """Helper to read 'raw' contract data from Qdrant with pagination."""
            try:
                scroll_result = client.scroll(
                    collection_name="contracts",
                    limit=limit,
                    with_vectors=True,
                    offset=offset
                )
                points = scroll_result[0]
                contracts_list = []
                for p in points:
                    normal = normalize_payload(p.payload)
                    # build row
                    row = {
                        'bid_number':      normal.get('bid_number', ''),
                        'bid_name':        normal.get('bid_name', ''),
                        'organization':    normal.get('organization', ''),
                        'status':          normal.get('status', ''),
                        'available_date':  normal.get('available_date', ''),
                        'due_date':        normal.get('due_date', ''),
                        'industry':        normal.get('industry', ''),
                        'category':        normal.get('category', ''),
                        'budget_estimate': normal.get('budget_estimate', ''),
                        'department':      normal.get('department', ''),
                        'state':           normal.get('state', ''),
                        'duration':        normal.get('duration', ''),
                        'detail_link':     normal.get('detail_link', '#'),
                    }
                    # add a hash_value
                    detail_link  = row['detail_link']
                    bid_number   = row['bid_number']
                    hash_input   = f"{detail_link}{bid_number}"
                    row["hash_value"] = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()
                    contracts_list.append(row)
                return contracts_list
            except Exception as e:
                logging.error(f"Error reading from Qdrant: {e}", exc_info=True)
                return []

        def generate_query_embedding(query_text):
            try:
                response = client_SMART_SEARCH_OPENAI_API_KEY.embeddings.create(
                    input=[query_text],
                    model="text-embedding-ada-002"
                )
                embedding_data = response.to_dict()
                return embedding_data["data"][0]["embedding"]
            except Exception as emb_err:
                logging.error(f"Error generating embedding: {emb_err}", exc_info=True)
                return None

        def qdrant_search(vector, top_k=10000):
            search_result = []
            if vector is None:
                return search_result
            try:
                hits = client.search(
                    collection_name="contracts",
                    query_vector=vector,
                    limit=top_k,
                    score_threshold=0.70
                )
                for hit in hits:
                    payload = normalize_payload(hit.payload)
                    row = {
                        'bid_number':       payload.get('bid_number', ''),
                        'bid_name':         payload.get('bid_name', ''),
                        'organization':     payload.get('organization', ''),
                        'status':           payload.get('status', ''),
                        'due_date':         payload.get('due_date', ''),
                        'category':         payload.get('category', ''),
                        'industry':         payload.get('industry', ''),
                        'department':       payload.get('department', ''),
                        'state':            payload.get('state', ''),
                        'detail_link':      payload.get('detail_link', '#'),
                        'Similarity_Score': hit.score,
                    }
                    # hash
                    detail_link = row['detail_link']
                    bnum        = row['bid_number']
                    row['hash_value'] = hashlib.sha256(f"{detail_link}{bnum}".encode('utf-8')).hexdigest()
                    search_result.append(row)
            except Exception as srch_err:
                logging.error(f"Error searching in Qdrant: {srch_err}", exc_info=True)
            return search_result

        # ---------------------------------------------------------------------
        # If user’s query is empty => Show ALL contracts (unchanged logic)
        # ---------------------------------------------------------------------
        if query == "":
            total_response = client.count(collection_name="contracts")
            total_contracts = total_response.count
            offset = (page - 1) * items_per_page
            contracts = read_contracts_from_qdrant(offset, items_per_page)
            total_pages = (total_contracts + items_per_page - 1) // items_per_page
            display_title = "All Contracts"

            # Write them into matches_SMART_SEARCH.csv
            smartsearch_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
            with open(smartsearch_file, 'w', newline='', encoding='utf-8') as f:
                fieldnames = [
                    'Company',
                    'Bid_Number',
                    'Bid_Name',
                    'Bid_Description',
                    'Status',
                    'Category',
                    'Due_Date',
                    'Detail_Link',
                    'State',
                    'Organization',
                    'Budget',
                    'Similarity_Score',
                    'hash_value'
                ]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for c in contracts:
                    writer.writerow({
                        'Company':         detected_company_name,
                        'Bid_Number':      c['bid_number'],
                        'Bid_Name':        c['bid_name'],
                        'Bid_Description': "",
                        'Status':          c['status'],
                        'Category':        c['category'],
                        'Due_Date':        c['due_date'],
                        'Detail_Link':     c['detail_link'],
                        'State':           c['state'],
                        'Organization':    c['organization'],
                        'Budget':          c.get('budget_estimate', ''),
                        'Similarity_Score': c.get('Similarity_Score', ''),
                        'hash_value':      c['hash_value']
                    })

        # ---------------------------------------------------------------------
        # Else => Do AI-based search with the user’s query (unchanged logic)
        # ---------------------------------------------------------------------
        else:
            embedding = generate_query_embedding(query)
            if not embedding:
                flash("Error generating embedding for search query.", "error")
                return render_template(
                    'smartsearch.html', 
                    company_name=company_name, 
                    first_name=first_name, 
                    contracts=[], 
                    categories_list=[],
                    industries_list=[],
                    current_page=page,
                    total_pages=0,
                    total_matches=0,
                    display_title="Error",
                    query=query
                )

            search_results = qdrant_search(embedding, top_k=10000)
            total_contracts = len(search_results)
            total_pages = (total_contracts + items_per_page - 1) // items_per_page
            start = (page - 1) * items_per_page
            end = start + items_per_page
            contracts = search_results[start:end]
            display_title = f"Search Results for '{query}'"

            # Write them to matches_SMART_SEARCH.csv
            smartsearch_file = os.path.join(user_uploads_dir, 'matches_SMART_SEARCH.csv')
            with open(smartsearch_file, 'w', newline='', encoding='utf-8') as f:
                fieldnames = [
                    'Company',
                    'Bid_Number',
                    'Bid_Name',
                    'Bid_Description',
                    'Status',
                    'Category',
                    'Due_Date',
                    'Detail_Link',
                    'State',
                    'Organization',
                    'Budget',
                    'Similarity_Score',
                    'hash_value'
                ]
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()

                for c in contracts:
                    writer.writerow({
                        'Company':         detected_company_name,
                        'Bid_Number':      c.get('bid_number', ''),
                        'Bid_Name':        c.get('bid_name', ''),
                        'Bid_Description': "",
                        'Status':          c.get('status', ''),
                        'Category':        c.get('category', ''),
                        'Due_Date':        c.get('due_date', ''),
                        'Detail_Link':     c.get('detail_link', ''),
                        'State':           c.get('state', ''),
                        'Organization':    c.get('organization', ''),
                        'Budget':          c.get('budget_estimate', ''),
                        'Similarity_Score': c.get('Similarity_Score', ''),
                        'hash_value':      c.get('hash_value', '')
                    })

        # ---------------------------------------------------------------------
        # After building `contracts`, gather categories, industries, etc. (unchanged)
        # ---------------------------------------------------------------------
        categories_list = sorted({c['category'] for c in contracts if c['category']})
        industries_list = sorted({c.get('industry', '') for c in contracts if c.get('industry', '')})

        return render_template(
            'smartsearch.html',
            company_name=company_name,
            first_name=first_name,
            contracts=contracts,
            categories_list=categories_list,
            industries_list=industries_list,
            current_page=page,
            total_pages=total_pages,
            total_matches=total_contracts,
            display_title=display_title,
            query=query
        )

    except Exception as e:
        logging.error(f"Unexpected error in /smartsearch route: {e}", exc_info=True)
        return render_template('error.html', error="An unexpected error occurred.")


# ---------------------------------------------------------------------------
# MEMBERSHIP STATUS (unchanged)
# ---------------------------------------------------------------------------
@app.route('/membershipstatus', methods=['GET', 'POST'])
def membershipstatus():
    try:
        # Get the authenticated user
        user = auth.current_user
        if user:
            user_id = user['localId']
            logging.info(f"Authenticated user ID: {user_id}")

            # Refresh user's token
            try:
                user_logged_in = auth.refresh(user['refreshToken'])
                logging.info(f"Token refreshed successfully for user ID: {user_id}")
            except Exception as token_error:
                logging.error(f"Token refresh failed for user ID {user_id}: {token_error}")
                return redirect(url_for('Login'))

            # Retrieve user data from Firebase
            try:
                user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
                logging.info(f"User data retrieved for user ID {user_id}: {user_data}")
            except Exception as data_error:
                logging.error(f"Failed to retrieve user data for user ID {user_id}: {data_error}")
                return render_template('error.html', error="Failed to retrieve user data.")

            if user_data:
                # Extract user details
                company_name = user_data.get('company', 'No Company')
                first_name = user_data.get('first_name', 'User')
                account_type = user_data.get('account_type', 'Not Available')
                subscription_end_date = user_data.get('subscription_end_date', 'Not Available')
                stripe_customer_id = user_data.get('stripe_customer_id')

                # If Stripe Customer ID is missing, fetch it from Stripe using the user's email
                if not stripe_customer_id:
                    user_email = user_data.get('email', '')
                    try:
                        # Fetch the Stripe customer object using email
                        stripe_customers = stripe.Customer.list(email=user_email).data
                        if stripe_customers:
                            stripe_customer = stripe_customers[0]
                            stripe_customer_id = stripe_customer.id
                            logging.info(f"Fetched Stripe Customer ID from API: {stripe_customer_id}")

                            # Update Firebase with the retrieved Stripe Customer ID
                            db.child("users").child(user_id).update({
                                "stripe_customer_id": stripe_customer_id
                            }, user_logged_in['idToken'])
                        else:
                            logging.warning(f"No Stripe customer found for email: {user_email}")
                            stripe_customer_id = "No Stripe ID Found"
                    except Exception as stripe_error:
                        logging.error(f"Error fetching Stripe Customer ID for email {user_email}: {stripe_error}")
                        stripe_customer_id = "Error Fetching Stripe ID"

                # Log the Stripe customer ID and other details
                logging.info(f"Stripe Customer ID for user ID {user_id}: {stripe_customer_id}")
                logging.info(f"Account type: {account_type}, Subscription end date: {subscription_end_date}")

                # Check allowed account types and render page
                allowed_account_types = ["CORAMA_ESSENTIALS", "CORAMA_SUPPLY_CHAIN_VISIBILITY", "TRUSTED_PARTNER", "CONTRACT_RADAR_MAXIMIZER_ESSENTIALS", "CONTRACT_RADAR_MAXIMIZER_SUPPLY_CHAIN_VISIBILITY"]
                if account_type in allowed_account_types:
                    return render_template(
                        'membershipstatus.html',
                        company_name=company_name,
                        first_name=first_name,
                        account_type=account_type,
                        subscription_end_date=subscription_end_date,
                        stripe_customer_id=stripe_customer_id  # Pass to template
                    )
                else:
                    logging.warning(f"Unauthorized access attempt by user ID: {user_id} with account type: {account_type}")
                    return redirect(url_for('Welcome2'))

        logging.warning("No authenticated user found. Redirecting to login.")
        return redirect(url_for('Login'))

    except Exception as e:
        # Handle unexpected errors
        logging.error(f"Unexpected error in /membershipstatus route: {e}")
        return render_template('error.html', error=str(e))


# ---------------------------------------------------------------------------
# UPGRADE MEMBERSHIP (unchanged)
# ---------------------------------------------------------------------------
@app.route('/upgrade_membership', methods=['GET'])
def upgrade_membership():
    try:
        user = session.get('user')
        if not user:
            return redirect(url_for('Login'))

        user_id = user['localId']
        user_data = db.child("users").child(user_id).get(user['idToken']).val()

        if not user_data:
            return redirect(url_for('Login'))

        stripe_customer_id = user_data.get('stripe_customer_id')
        if not stripe_customer_id:
            return render_template('error.html', error="Stripe customer ID not found.")

        # Get selected billing period from URL params (default to monthly)
        billing_period = request.args.get('billing_period', 'monthly')

        # Get the correct price ID based on the billing period
        price_id = prices['CORAMA_ESSENTIALS'].get(billing_period)
        if not price_id:
            return render_template('error.html', error="Invalid billing period selected.")

        # Contract Radar Maximizer is now FREE - no payment required
        logging.info(f"✅ FREE ACCESS - No payment required for user {user_id}")
        return redirect(url_for('Welcome'))

    except Exception as e:
        logging.error(f"Error creating Stripe checkout session: {e}")
        return render_template('error.html', error="An error occurred while upgrading.")



@app.route('/upgrade_success', methods=['GET'])
def upgrade_success():
    try:
        user = session.get('user')
        if not user:
            return redirect(url_for('Login'))

        user_id = user['localId']
        user_data = db.child("users").child(user_id).get(user['idToken']).val()

        if not user_data:
            return redirect(url_for('Login'))

        subscription_end_date = "9999-12-31"

        # ✅ Create user upload directory
        uploads_dir = create_user_directory(user_id)

        db.child("users").child(user_id).update({
            "account_type": "CONTRACT_RADAR_MAXIMIZER_ESSENTIALS",
            "subscription_end_date": subscription_end_date,
            "uploads_dir": uploads_dir
        }, user['idToken'])

        return redirect(url_for('Welcome'))

    except Exception as e:
        logging.error(f"Error in upgrade success: {e}")
        return render_template('error.html', error="An error occurred after payment.")




#WORKS AS OF 3/4/25
@app.route('/cancel_membership', methods=['POST'])
def cancel_membership():
    try:
        # Authenticate the user
        user = auth.current_user
        if not user:
            logging.warning("No authenticated user found. Redirecting to login.")
            return jsonify({"error": "User not authenticated"}), 401

        user_id = user['localId']
        logging.info(f"Authenticated user ID: {user_id}")

        # Refresh the user's token
        try:
            user_logged_in = auth.refresh(user['refreshToken'])
            logging.info(f"Token refreshed successfully for user ID: {user_id}")
        except Exception as token_error:
            logging.error(f"Failed to refresh token for user ID {user_id}: {token_error}")
            return jsonify({"error": "Failed to refresh token"}), 500

        # Fetch user data from Firebase
        try:
            user_data = db.child("users").child(user_id).get(user_logged_in['idToken']).val()
            logging.info(f"User data retrieved for user ID {user_id}: {user_data}")
        except Exception as firebase_error:
            logging.error(f"Failed to retrieve user data for user ID {user_id}: {firebase_error}")
            return jsonify({"error": "User data not found"}), 500

        if not user_data:
            logging.warning(f"No user data found in Firebase for user ID: {user_id}")
            return jsonify({"error": "User data not found"}), 400

        # Get Stripe Customer ID
        stripe_customer_id = user_data.get('stripe_customer_id')
        if not stripe_customer_id:
            logging.error(f"Stripe Customer ID is missing for user ID: {user_id}")
            return jsonify({"error": "Stripe Customer ID not found"}), 400

        logging.info(f"Stripe Customer ID for user ID {user_id}: {stripe_customer_id}")

        # Retrieve the subscription ID from Firebase
        stripe_subscription_id = user_data.get('stripe_subscription_id')

        # If subscription ID is missing or invalid, fetch trialing/active subscriptions from Stripe
        if not stripe_subscription_id:
            logging.info(f"No subscription ID found in Firebase for user ID {user_id}, checking Stripe.")
        else:
            # Verify the subscription exists on Stripe
            try:
                subscription = stripe.Subscription.retrieve(stripe_subscription_id)
                if subscription.status not in ["active", "trialing"]:
                    logging.warning(f"Subscription ID {stripe_subscription_id} is not active or trialing. Fetching from Stripe.")
                    stripe_subscription_id = None
            except stripe.error.InvalidRequestError as e:
                logging.warning(f"Subscription ID {stripe_subscription_id} is invalid: {e}")
                stripe_subscription_id = None

        if not stripe_subscription_id:
            try:
                logging.info(f"Fetching trialing/active subscriptions from Stripe for customer ID: {stripe_customer_id}")
                subscriptions = stripe.Subscription.list(customer=stripe_customer_id).data
                # Filter subscriptions for active or trialing status
                valid_subscriptions = [sub for sub in subscriptions if sub.status in ["active", "trialing"]]
                if valid_subscriptions:
                    stripe_subscription_id = valid_subscriptions[0].id
                    logging.info(f"Fetched subscription ID: {stripe_subscription_id} for customer ID: {stripe_customer_id}")

                    # Save the subscription ID back to Firebase
                    db.child("users").child(user_id).update({
                        "stripe_subscription_id": stripe_subscription_id
                    }, user_logged_in['idToken'])
                    logging.info(f"Updated Firebase with subscription ID {stripe_subscription_id} for user ID: {user_id}")
                else:
                    logging.warning(f"No active or trialing subscription found for customer ID: {stripe_customer_id}")
                    return jsonify({"error": "No active or trialing subscription found"}), 400
            except Exception as stripe_error:
                logging.error(f"Error fetching subscriptions from Stripe for customer ID {stripe_customer_id}: {stripe_error}")
                return jsonify({"error": "Error retrieving subscription from Stripe"}), 500

        # Contract Radar Maximizer is now FREE - no subscriptions to cancel
        logging.info(f"✅ FREE ACCESS - No subscription to cancel for user {user_id}")

        # Update Firebase to reflect canceled membership
        # try:
        #     db.child("users").child(user_id).update({
        #         "account_type": None,
        #         "subscription_end_date": None,
        #         "stripe_subscription_id": None,
        #     }, user_logged_in['idToken'])
        #     logging.info(f"Firebase updated successfully for user ID {user_id} to reflect canceled membership.")
        # except Exception as firebase_update_error:
        #     logging.error(f"Failed to update Firebase for user ID {user_id}: {firebase_update_error}")
        #     return jsonify({"error": "Failed to update Firebase"}), 500

        return jsonify({"message": "Membership canceled successfully"}), 200

    except Exception as e:
        logging.error(f"Unexpected error in cancel_membership route: {e}")
        return jsonify({"error": str(e)}), 500


@app.context_processor # Added to make is_logged_in available to all templates, is set to false everywhere and only changes to true when logging in
def inject_logged_in_status():
    return{'is_logged_in': session.get('is_logged_in', False)}


# Route to convert PDF to Word and allow download
@app.route('/download_word', methods=['POST'])
def download_word():
    pdf_filename = 'static/uploads/output.pdf'
    word_filename = pdf_filename.replace('.pdf', '.docx')  # Change extension
    # Check if the PDF exists before converting
    if not os.path.exists(pdf_filename):
        return abort(404, description="PDF file not found")
    try:
        # Convert PDF to DOCX
        parse(pdf_filename, word_filename)
        # Send the Word file for download
        return send_file(word_filename, as_attachment=True)
    except Exception:
        return render_template('error.html', error="Error converting PDF to Word")



@app.route('/stripe_webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get("Stripe-Signature")

    environment = os.getenv('ENV', 'production')

    if environment == 'local':
        # 🚨 Skip signature verification for local testing (Postman, etc.)
        app.logger.warning("⚠️ Skipping Stripe signature verification (local mode)")
        event = json.loads(payload)
    else:
        # ✅ In production, enforce signature check for security
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except ValueError:
            app.logger.error("❌ Invalid payload received from Stripe")
            return "Invalid payload", 400
        except stripe.error.SignatureVerificationError:
            app.logger.error("❌ Invalid signature received from Stripe")
            return "Invalid signature", 400

    # ✅ Handle different event types
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        handle_successful_payment(session)
    elif event["type"] == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        handle_invoice_payment(invoice)
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        handle_failed_payment(invoice)

    return jsonify({"status": "success"}), 200

def handle_successful_payment(session):
    customer_id = session["customer"]
    subscription_id = session.get("subscription")
    metadata = session.get("metadata", {})
    
    if metadata.get("purchase_type") == "credits":
        user_id = metadata.get("user_id")
        credits = int(metadata.get("credits", 0))
        
        if user_id and credits:
            credit_manager = CreditManager(db)
            success, new_balance = credit_manager.add_credits_admin(
                user_id, credits, "stripe_purchase", admin_db=admin_db if admin_initialized else None
            )
            if success:
                app.logger.info(f"✅ Credits added for user {user_id}: {credits} credits, new balance: {new_balance}")
            else:
                app.logger.error(f"❌ Failed to add credits for user {user_id} via webhook")
                app.logger.error(f"User {user_id} completed payment but credits were not added - manual intervention required")
    
    app.logger.info(f"✅ Payment successful for customer {customer_id}, subscription {subscription_id}")

def handle_invoice_payment(invoice):
    customer_id = invoice["customer"]
    app.logger.info(f"✅ Invoice paid for customer {customer_id}")

def handle_failed_payment(invoice):
    customer_id = invoice["customer"]
    app.logger.warning(f"❌ Payment failed for customer {customer_id}")





#demo page
@app.route('/demo', methods=['GET']) 
def demoPage():
    if 'user' not in session:
        return render_template('demo.html')

    # Get authenticated user
    user = session['user']
    user_id = user['localId']
    user_uploads_dir = os.path.abspath(f"uploads/bid_uploads_{user_id}")
    return render_template('demo.html')





@app.route('/cancel')
def cancel():
    return "Payment was canceled. Please try again."



@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500



@app.route('/purchase_credits', methods=['GET'])
def purchase_credits():
    """Display credit purchase options"""
    if 'user' not in session:
        return redirect(url_for('Login'))
        
    user = session['user']
    user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
    current_credits = user_data.get('credits_balance', 0)
    
    credit_packages = [
        {"credits": 100, "price": 1000, "description": "Starter Pack - Perfect for small projects"},
        {"credits": 300, "price": 2500, "description": "Professional Pack - Great for multiple proposals"},
        {"credits": 750, "price": 5000, "description": "Enterprise Pack - Best value for frequent users"},
        {"credits": 2000, "price": 10000, "description": "Agency Pack - For consulting firms and agencies"}
    ]
    
    return render_template('purchase_credits.html', 
                         current_credits=current_credits,
                         credit_packages=credit_packages)

@app.route('/create_credit_checkout', methods=['POST'])
def create_credit_checkout():
    """Create Stripe checkout session for credit purchase"""
    try:
        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 401
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        stripe_customer_id = user_data.get('stripe_customer_id')
        
        if not stripe_customer_id:
            user_email = user_data.get('email', '')
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            company = user_data.get('company', '')
            
            try:
                logging.info(f"No stripe_customer_id found for {user_email}, attempting to fetch from Stripe API")
                stripe_customers = stripe.Customer.list(email=user_email).data
                
                if stripe_customers:
                    stripe_customer_id = stripe_customers[0].id
                    logging.info(f"Found existing Stripe customer: {stripe_customer_id}")
                else:
                    logging.info(f"No existing Stripe customer found, creating new customer for {user_email}")
                    stripe_customer = stripe.Customer.create(
                        email=user_email,
                        description=f"{first_name} {last_name} from {company}"
                    )
                    stripe_customer_id = stripe_customer.id
                    logging.info(f"Created new Stripe customer: {stripe_customer_id}")
                
                db.child("users").child(user['localId']).update(
                    {"stripe_customer_id": stripe_customer_id},
                    user['idToken']
                )
                logging.info(f"Updated Firebase with stripe_customer_id for user {user['localId']}")
                
            except Exception as stripe_error:
                logging.error(f"Error handling Stripe customer for {user_email}: {stripe_error}")
                return jsonify({"error": "Failed to set up payment account. Please try again."}), 500
            
        credits = int(request.json.get('credits'))
        price = int(request.json.get('price'))
        
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'{credits} CORAMA Credits',
                        'description': f'AI-powered contract analysis and proposal generation credits'
                    },
                    'unit_amount': price,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=url_for('credit_purchase_success', _external=True) + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=url_for('purchase_credits', _external=True),
            metadata={
                'user_id': user['localId'],
                'credits': credits,
                'purchase_type': 'credits'
            }
        )
        
        return jsonify({"checkout_url": checkout_session.url})
        
    except Exception as e:
        logging.error(f"Error creating credit checkout: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/credit_purchase_success')
def credit_purchase_success():
    """Handle successful credit purchase"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    user = session['user']
    user_id = user['localId']
    id_token = user['idToken']
    
    session_id = request.args.get('session_id')
    if session_id:
        try:
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            credits = int(checkout_session.metadata.get('credits', 0))
            metadata_user_id = checkout_session.metadata.get('user_id')
            
            success = False
            if metadata_user_id == user_id and credits > 0:
                credit_manager = CreditManager(db)
                success, new_balance = credit_manager.add_credits_admin(
                    user_id, credits, "stripe_purchase", admin_db=admin_db if admin_initialized else None
                )
                if success:
                    app.logger.info(f"✅ Credits added via success page for user {user_id}: {credits} credits, new balance: {new_balance}")
                else:
                    app.logger.error(f"❌ Failed to add credits via success page for user {user_id}")
            
            return render_template('credit_purchase_success.html', credits=credits, success=success)
        except Exception as e:
            logging.error(f"Error retrieving checkout session: {e}")
    
    return redirect(url_for('purchase_credits'))

@app.route('/credit_history', methods=['GET'])
def credit_history():
    """Display credit transaction history and usage analytics"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    user = session['user']
    user_id = user['localId']
    
    try:
        if admin_initialized and admin_db:
            user_ref = admin_db.reference(f'users/{user_id}')
            user_data = user_ref.get()
            
            if not user_data:
                logging.error(f"User {user_id} not found in database")
                return redirect(url_for('Welcome'))
            
            current_credits = user_data.get('credits_balance', 0)
            credits_used = user_data.get('credits_used', 0)
            
            transactions_ref = admin_db.reference(f'credit_transactions/{user_id}')
            transactions = transactions_ref.get()
            transaction_list = []
            if transactions:
                for key, transaction in transactions.items():
                    transaction_list.append(transaction)
                transaction_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            logging.info(f"✅ Admin SDK: Fetched credit history for user {user_id}")
        else:
            logging.warning("⚠️ Using fallback method to fetch credit history")
            user_data = db.child("users").child(user_id).get(user['idToken']).val()
            current_credits = user_data.get('credits_balance', 0)
            credits_used = user_data.get('credits_used', 0)
            
            transactions = db.child("credit_transactions").child(user_id).get(user['idToken']).val()
            transaction_list = []
            if transactions:
                for key, transaction in transactions.items():
                    transaction_list.append(transaction)
                transaction_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return render_template('credit_history.html',
                             current_credits=current_credits,
                             credits_used=credits_used,
                             transactions=transaction_list)
    except Exception as e:
        logging.error(f"Error fetching credit history: {e}")
        return redirect(url_for('Welcome'))

@app.route('/uploads/contracts/<path:filename>')
def serve_contract_pdf(filename):
    """Serve contract PDF files"""
    try:
        ensure_session_from_auth()
        
        if 'user' not in session:
            abort(401)
        
        contracts_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'contracts')
        
        if not os.path.exists(os.path.join(contracts_dir, filename)):
            abort(404)
        
        return send_from_directory(contracts_dir, filename, mimetype='application/pdf')
    except Exception as e:
        logging.error(f"Error serving contract PDF {filename}: {e}")
        abort(500)

@app.route('/api/fetch_contract_pdf', methods=['POST'])
def fetch_contract_pdf():
    """Fetch contract PDF from detail link"""
    try:
        data = request.json
        contract_hash = data.get('contract_hash')
        detail_link = data.get('detail_link')
        
        if not contract_hash or not detail_link:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        contracts_dir = os.path.join('uploads', 'contracts')
        os.makedirs(contracts_dir, exist_ok=True)
        pdf_path = os.path.join(contracts_dir, f'{contract_hash}.pdf')
        
        if os.path.exists(pdf_path):
            return jsonify({
                'success': True,
                'pdf_url': f'/uploads/contracts/{contract_hash}.pdf',
                'cached': True
            })
        
        import requests
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin, urlparse
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.head(detail_link, headers=headers, timeout=10, allow_redirects=True)
            content_type = response.headers.get('Content-Type', '').lower()
            
            if 'application/pdf' in content_type or detail_link.lower().endswith('.pdf'):
                pdf_response = requests.get(detail_link, headers=headers, timeout=30)
                pdf_response.raise_for_status()
                
                with open(pdf_path, 'wb') as f:
                    f.write(pdf_response.content)
                
                return jsonify({
                    'success': True,
                    'pdf_url': f'/uploads/contracts/{contract_hash}.pdf',
                    'method': 'direct_download'
                })
            
            page_response = requests.get(detail_link, headers=headers, timeout=30)
            page_response.raise_for_status()
            soup = BeautifulSoup(page_response.content, 'html.parser')
            
            pdf_links = []
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = urljoin(detail_link, href)
                
                if (href.lower().endswith('.pdf') or 
                    'pdf' in href.lower() or 
                    'attachment' in href.lower() or
                    'download' in href.lower() or
                    'file' in href.lower()):
                    pdf_links.append(full_url)
            
            for iframe in soup.find_all('iframe', src=True):
                src = iframe['src']
                if src.lower().endswith('.pdf') or 'pdf' in src.lower():
                    pdf_links.append(urljoin(detail_link, src))
            
            for embed in soup.find_all('embed', src=True):
                src = embed['src']
                if src.lower().endswith('.pdf') or 'pdf' in src.lower():
                    pdf_links.append(urljoin(detail_link, src))
            
            if pdf_links:
                pdf_url = pdf_links[0]
                pdf_response = requests.get(pdf_url, headers=headers, timeout=30)
                pdf_response.raise_for_status()
                
                with open(pdf_path, 'wb') as f:
                    f.write(pdf_response.content)
                
                return jsonify({
                    'success': True,
                    'pdf_url': f'/uploads/contracts/{contract_hash}.pdf',
                    'method': 'extracted_from_page'
                })
            
            return jsonify({
                'success': False,
                'error': 'No PDF found on the page',
                'message': 'Could not find a PDF link on the contract detail page. Please upload the PDF manually.'
            })
            
        except requests.RequestException as e:
            logging.error(f"Error fetching PDF from {detail_link}: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to fetch PDF: {str(e)}',
                'message': 'Please upload the contract PDF manually'
            })
        
    except Exception as e:
        logging.error(f"Error fetching contract PDF: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/upload_contract_pdf', methods=['POST'])
def upload_contract_pdf():
    """Upload contract PDF manually"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'success': False, 'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf']
        contract_hash = request.form.get('contract_hash')
        
        if not contract_hash:
            return jsonify({'success': False, 'error': 'Missing contract hash'}), 400
        
        contracts_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'contracts')
        os.makedirs(contracts_dir, exist_ok=True)
        pdf_path = os.path.join(contracts_dir, f'{contract_hash}.pdf')
        
        pdf_file.save(pdf_path)
        
        return jsonify({
            'success': True,
            'pdf_url': f'/uploads/contracts/{contract_hash}.pdf'
        })
        
    except Exception as e:
        logging.error(f"Error uploading contract PDF: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analyze_contract', methods=['POST'])
def analyze_contract():
    """Analyze contract with AI and generate annotations"""
    ensure_session_from_auth()
    
    try:
        if 'user' not in session:
            return jsonify({'success': False, 'error': 'User not authenticated'}), 401
        
        data = request.json
        contract_hash = data.get('contract_hash')
        user_id = data.get('user_id')
        
        if not contract_hash or not user_id:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        # Check if PDF exists
        contracts_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'contracts')
        pdf_path = os.path.join(contracts_dir, f'{contract_hash}.pdf')
        
        if not os.path.exists(pdf_path):
            return jsonify({'success': False, 'error': 'PDF not found. Please upload the contract PDF first.'}), 404
        
        # Extract text from PDF using PyMuPDF
        import fitz
        pdf_text = ""
        page_texts = []
        
        try:
            doc = fitz.open(pdf_path)
            for page_num, page in enumerate(doc, 1):
                page_text = page.get_text()
                page_texts.append({'page': page_num, 'text': page_text})
                pdf_text += f"\n--- Page {page_num} ---\n{page_text}"
            doc.close()
        except Exception as e:
            logging.error(f"Error extracting PDF text: {e}")
            return jsonify({'success': False, 'error': f'Failed to read PDF: {str(e)}'}), 500
        
        if not pdf_text.strip():
            return jsonify({'success': False, 'error': 'PDF appears to be empty or contains only images'}), 400
        
        max_chars = 50000
        if len(pdf_text) > max_chars:
            pdf_text = pdf_text[:max_chars] + "\n\n[Document truncated for analysis...]"
        
        # Generate AI annotations using OpenAI
        try:
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), timeout=60.0)
            
            prompt = f"""You are an expert contract analyst helping a business understand a government contract opportunity. Analyze the following contract document and provide strategic annotations in these categories:

1. Key Requirements & Deliverables - What must be delivered, when, and to what standards
2. Small Print & Critical Clauses - Important details that are easy to miss but critical to understand
3. Compliance Requirements - Certifications, regulations, and legal requirements that must be met
4. Risk Factors & Challenges - Potential issues, tight timelines, or difficult requirements
5. Win Strategy Recommendations - How to position the proposal to maximize chances of winning

For each category, provide 1-3 specific, actionable insights based on the actual contract text. Be concise but specific. Focus on what matters most for a business deciding whether and how to bid.

Contract Document:
{pdf_text}

Provide your analysis as a JSON array with objects containing 'category' and 'text' fields."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert contract analyst. Provide strategic insights in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                timeout=60
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content.strip()
            
            import json
            import re
            
            json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
            if json_match:
                annotations = json.loads(json_match.group(0))
            else:
                annotations = [
                    {
                        'category': 'AI Analysis',
                        'text': ai_response
                    }
                ]
        
        except Exception as e:
            logging.error(f"Error generating AI annotations: {e}")
            annotations = [
                {
                    'category': 'Document Loaded',
                    'text': f'Successfully extracted {len(page_texts)} pages from the contract PDF. AI analysis is temporarily unavailable. Please review the document manually.'
                }
            ]
        
        # Generate draft ID
        import uuid
        draft_id = str(uuid.uuid4())
        
        # Save to Firebase
        if admin_initialized and admin_db:
            draft_ref = admin_db.reference(f'proposal_drafts/{user_id}/{draft_id}')
            draft_ref.set({
                'draft_id': draft_id,
                'user_id': user_id,
                'contract_hash': contract_hash,
                'annotations': annotations,
                'page_count': len(page_texts),
                'created_at': datetime.now().isoformat(),
                'status': 'analysis_complete'
            })
        
        return jsonify({
            'success': True,
            'draft_id': draft_id,
            'annotations': annotations,
            'page_count': len(page_texts)
        })
        
    except Exception as e:
        logging.error(f"Error analyzing contract: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_draft_team', methods=['GET'])
def get_draft_team():
    """Get team members from draft"""
    try:
        draft_id = request.args.get('draft_id')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        if admin_initialized and admin_db:
            user = auth.current_user
            if not user:
                return jsonify({'success': False, 'error': 'Not authenticated'}), 401
            
            draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
            draft_data = draft_ref.get()
            
            if draft_data and 'team_members' in draft_data:
                return jsonify({
                    'success': True,
                    'team_members': draft_data['team_members']
                })
        
        return jsonify({
            'success': True,
            'team_members': []
        })
        
    except Exception as e:
        logging.error(f"Error getting draft team: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add_team_member', methods=['POST'])
def add_team_member():
    """Add team member to draft"""
    try:
        data = request.json
        draft_id = data.get('draft_id')
        member = data.get('member')
        
        if not draft_id or not member:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        if admin_initialized and admin_db:
            user = auth.current_user
            if not user:
                return jsonify({'success': False, 'error': 'Not authenticated'}), 401
            
            draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
            draft_data = draft_ref.get()
            
            if not draft_data:
                draft_data = {'team_members': []}
            
            if 'team_members' not in draft_data:
                draft_data['team_members'] = []
            
            draft_data['team_members'].append(member)
            draft_ref.update({'team_members': draft_data['team_members']})
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error adding team member: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/extract_subcontractor_info', methods=['POST'])
def extract_subcontractor_info():
    """Extract subcontractor info from website with robust error handling"""
    try:
        data = request.json
        url = data.get('url')
        draft_id = data.get('draft_id')
        
        if not url or not draft_id:
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
        
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        from bs4 import BeautifulSoup
        import re
        import json as json_lib
        from urllib.parse import urlparse, urljoin
        
        normalized_url = url.strip()
        if not normalized_url.startswith(('http://', 'https://')):
            normalized_url = 'https://' + normalized_url
        
        try:
            parsed = urlparse(normalized_url)
            if not parsed.netloc:
                return jsonify({
                    'success': False,
                    'error': 'Invalid URL format. Please enter a valid website URL (e.g., example.com or https://example.com)'
                }), 400
        except Exception:
            return jsonify({
                'success': False,
                'error': 'Invalid URL format. Please check the URL and try again.'
            }), 400
        
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        ssl_error_occurred = False
        response = None
        
        try:
            app.logger.info(f"Fetching website: {normalized_url}")
            response = session.get(
                normalized_url,
                headers=headers,
                timeout=(5, 15),  # (connect timeout, read timeout)
                allow_redirects=True,
                verify=True
            )
            response.raise_for_status()
            
        except requests.exceptions.SSLError as ssl_err:
            app.logger.warning(f"SSL error for {normalized_url}, retrying without verification: {ssl_err}")
            ssl_error_occurred = True
            try:
                response = session.get(
                    normalized_url,
                    headers=headers,
                    timeout=(5, 15),
                    allow_redirects=True,
                    verify=False
                )
                response.raise_for_status()
            except Exception as retry_err:
                app.logger.error(f"Retry failed for {normalized_url}: {retry_err}")
                return jsonify({
                    'success': False,
                    'error': f'SSL certificate error. The website may have security issues. Error: {str(retry_err)}'
                }), 500
                
        except requests.exceptions.Timeout:
            app.logger.error(f"Timeout fetching {normalized_url}")
            return jsonify({
                'success': False,
                'error': 'Request timed out. The website took too long to respond. Please try again or try a different page.'
            }), 500
            
        except requests.exceptions.ConnectionError as conn_err:
            app.logger.error(f"Connection error for {normalized_url}: {conn_err}")
            return jsonify({
                'success': False,
                'error': 'Could not connect to the website. Please check the URL and try again.'
            }), 500
            
        except requests.exceptions.HTTPError as http_err:
            status_code = http_err.response.status_code if http_err.response else 0
            app.logger.error(f"HTTP error {status_code} for {normalized_url}: {http_err}")
            
            if status_code == 403:
                return jsonify({
                    'success': False,
                    'error': 'Access denied (403). The website is blocking automated access. Please try a different page or add the company manually.'
                }), 500
            elif status_code == 429:
                return jsonify({
                    'success': False,
                    'error': 'Rate limited (429). Too many requests to this website. Please wait a moment and try again.'
                }), 500
            elif status_code == 404:
                return jsonify({
                    'success': False,
                    'error': 'Page not found (404). Please check the URL and try again.'
                }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': f'Website returned error {status_code}. Please try a different page or add the company manually.'
                }), 500
                
        except requests.RequestException as req_err:
            app.logger.error(f"Request error for {normalized_url}: {req_err}")
            return jsonify({
                'success': False,
                'error': f'Failed to fetch website: {str(req_err)}'
            }), 500
        
        content_type = response.headers.get('Content-Type', '').lower()
        if 'text/html' not in content_type:
            app.logger.warning(f"Non-HTML content type for {normalized_url}: {content_type}")
            return jsonify({
                'success': False,
                'error': f'Website returned non-HTML content ({content_type}). Please try the company\'s main page or About page.'
            }), 500
        
        content_length = len(response.content)
        app.logger.info(f"Fetched {normalized_url}: status={response.status_code}, content-type={content_type}, length={content_length}")
        
        # Check for minimal content
        if content_length < 500:
            app.logger.warning(f"Suspiciously small content for {normalized_url}: {content_length} bytes")
            return jsonify({
                'success': False,
                'error': 'Website returned very little content. It may require JavaScript or be blocking automated access.'
            }), 500
        
        soup = BeautifulSoup(response.content, 'html.parser')
        page_text = soup.get_text().lower()
        
        anti_bot_indicators = [
            'cloudflare', 'access denied', 'captcha', 'please verify you are human',
            'enable javascript', 'bot detection', 'security check'
        ]
        if any(indicator in page_text[:1000] for indicator in anti_bot_indicators):
            app.logger.warning(f"Anti-bot page detected for {normalized_url}")
            return jsonify({
                'success': False,
                'error': 'Website is using bot protection (Cloudflare, CAPTCHA, etc.). Please add the company manually.'
            }), 500
        
        # Extract structured data (JSON-LD)
        company_name = ''
        email = ''
        phone = ''
        services = ''
        address = ''
        linkedin_url = ''
        
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                data = json_lib.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    item_type = item.get('@type', '')
                    if item_type in ['Organization', 'LocalBusiness', 'Corporation', 'Company']:
                        if not company_name and item.get('name'):
                            company_name = item['name']
                        if not email and item.get('email'):
                            email = item['email']
                        if not phone and item.get('telephone'):
                            phone = item['telephone']
                        if not address and item.get('address'):
                            addr = item['address']
                            if isinstance(addr, dict):
                                address = ', '.join(filter(None, [
                                    addr.get('streetAddress', ''),
                                    addr.get('addressLocality', ''),
                                    addr.get('addressRegion', ''),
                                    addr.get('postalCode', '')
                                ]))
                            elif isinstance(addr, str):
                                address = addr
                        if not linkedin_url and item.get('sameAs'):
                            same_as = item['sameAs'] if isinstance(item['sameAs'], list) else [item['sameAs']]
                            for link in same_as:
                                if 'linkedin.com' in link.lower():
                                    linkedin_url = link
                                    break
                        if not services and item.get('description'):
                            services = item['description'][:300]
            except (json_lib.JSONDecodeError, AttributeError, KeyError) as e:
                app.logger.debug(f"Error parsing JSON-LD: {e}")
                continue
        
        # Extract from OpenGraph / Twitter meta tags
        if not company_name:
            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                company_name = og_title['content'].strip()
        
        if not services:
            og_desc = soup.find('meta', property='og:description')
            if og_desc and og_desc.get('content'):
                services = og_desc['content'][:300]
            else:
                twitter_desc = soup.find('meta', attrs={'name': 'twitter:description'})
                if twitter_desc and twitter_desc.get('content'):
                    services = twitter_desc['content'][:300]
        
        if not company_name:
            title_tag = soup.find('title')
            if title_tag and title_tag.text:
                title_text = title_tag.text.strip()
                for separator in [' | ', ' - ', ' – ', ' — ']:
                    if separator in title_text:
                        company_name = title_text.split(separator)[0].strip()
                        break
                if not company_name:
                    company_name = title_text
        
        if not company_name or len(company_name) > 100:
            h1_tag = soup.find('h1')
            if h1_tag and h1_tag.text and len(h1_tag.text.strip()) < 100:
                company_name = h1_tag.text.strip()
        
        # Extract email with regex if not found
        if not email:
            email_pattern = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
            emails = re.findall(email_pattern, soup.get_text())
            filtered_emails = [e for e in emails if not any(x in e.lower() for x in ['example', 'test', 'noreply', 'no-reply'])]
            if filtered_emails:
                email = filtered_emails[0]
        
        # Extract phone with regex if not found
        if not phone:
            phone_pattern = r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
            phone_matches = re.findall(phone_pattern, soup.get_text())
            if phone_matches:
                match = phone_matches[0]
                phone = f"({match[0]}) {match[1]}-{match[2]}"
        
        # Extract LinkedIn URL if not found
        if not linkedin_url:
            linkedin_links = soup.find_all('a', href=re.compile(r'linkedin\.com', re.I))
            if linkedin_links:
                linkedin_url = linkedin_links[0].get('href', '')
        
        # Extract services from meta description if not found
        if not services:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                services = meta_desc['content'][:300]
        
        # Fallback to first substantial paragraph
        if not services:
            paragraphs = soup.find_all('p')
            for p in paragraphs[:5]:
                text = p.get_text().strip()
                if len(text) > 80:  # Substantial paragraph
                    services = text[:300]
                    break
        
        if not company_name:
            company_name = parsed.netloc.replace('www.', '').split('.')[0].title()
        
        if not services:
            services = 'Services information not found. Please edit manually.'
        
        member = {
            'company': company_name,
            'contact_name': '',
            'contact_role': '',
            'email': email,
            'phone': phone,
            'services': services,
            'website': normalized_url,
            'linkedin_url': linkedin_url,
            'address': address,
            'source': 'website'
        }
        
        app.logger.info(f"Successfully extracted info from {normalized_url}: company={company_name}")
        
        response_data = {
            'success': True,
            'member': member
        }
        
        if ssl_error_occurred:
            response_data['warning'] = 'SSL certificate could not be verified. Data was extracted but the connection may not be secure.'
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error extracting subcontractor info: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }), 500

@app.route('/api/update_draft_team', methods=['POST'])
def update_draft_team():
    """Update team members in draft"""
    try:
        data = request.json
        draft_id = data.get('draft_id')
        team_members = data.get('team_members')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        if admin_initialized and admin_db:
            user = auth.current_user
            if not user:
                return jsonify({'success': False, 'error': 'Not authenticated'}), 401
            
            draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
            draft_ref.update({'team_members': team_members})
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error updating draft team: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/suggest_team', methods=['POST'])
def suggest_team():
    """Generate AI-powered team composition suggestions based on contract analysis"""
    try:
        data = request.json
        draft_id = data.get('draft_id')
        current_team = data.get('team_members', [])
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        user = auth.current_user
        if not user:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user_id = user['localId']
        
        if not admin_initialized or not admin_db:
            return jsonify({'success': False, 'error': 'Firebase not initialized'}), 500
        
        draft_ref = admin_db.reference(f'proposal_drafts/{user_id}/{draft_id}')
        draft_data = draft_ref.get()
        
        if not draft_data:
            return jsonify({'success': False, 'error': 'Draft not found. Please analyze the contract first.'}), 404
        
        if 'annotations' not in draft_data or not draft_data['annotations']:
            return jsonify({'success': False, 'error': 'No contract analysis found. Please run "Analyze with AI" first.'}), 400
        
        annotations = draft_data['annotations']
        contract_hash = draft_data.get('contract_hash', '')
        
        annotations_text = "\n".join([f"{ann.get('category', 'Note')}: {ann.get('text', '')}" for ann in annotations])
        
        capability_statement = ""
        try:
            user_uploads_dir = os.path.join('uploads', f'bid_uploads_{user_id}')
            cs_file = os.path.join(user_uploads_dir, 'capability_statements_processed.csv')
            
            if os.path.exists(cs_file):
                import pandas as pd
                cs_df = pd.read_csv(cs_file)
                primary_cs = cs_df[cs_df['is_primary'] == True]
                if not primary_cs.empty:
                    capability_statement = primary_cs.iloc[0]['Capability_Statement']
                elif not cs_df.empty:
                    capability_statement = cs_df.iloc[0]['Capability_Statement']
        except Exception as e:
            app.logger.warning(f"Could not load capability statement: {e}")
        
        current_team_text = ""
        if current_team:
            current_team_text = "\n\nCurrent Team Members:\n" + "\n".join([
                f"- {member.get('company', 'Unknown')}: {member.get('services', 'N/A')}"
                for member in current_team
            ])
        
        try:
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'), timeout=45.0)
            
            prompt = f"""You are an expert government contracting team composition advisor. Based on the contract analysis and company capabilities, recommend a strategic team composition.

CONTRACT ANALYSIS:
{annotations_text[:3000]}

COMPANY CAPABILITIES:
{capability_statement[:2000] if capability_statement else "No capability statement available"}
{current_team_text}

Provide strategic team recommendations in JSON format with this structure:
{{
  "team_structure": "Brief description of recommended prime/sub structure",
  "recommended_roles": [
    {{
      "role": "Role title",
      "responsibilities": "Key responsibilities",
      "why_needed": "Why this role is critical for this contract",
      "preferred_qualifications": "Certifications, experience, or qualifications",
      "partner_profile": "Type of partner to seek (e.g., SDVOSB, 8(a), specific NAICS)"
    }}
  ],
  "key_considerations": [
    "Important consideration 1",
    "Important consideration 2"
  ],
  "compliance_notes": "Any compliance or certification requirements for team members"
}}

Focus on roles that fill gaps, meet compliance requirements, and strengthen the proposal. Be specific and actionable."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert government contracting team composition advisor. Provide strategic, actionable recommendations in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                timeout=45
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            import json as json_lib
            import re
            
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                suggestions_data = json_lib.loads(json_match.group(0))
            else:
                suggestions_data = {
                    'team_structure': 'AI analysis completed',
                    'recommended_roles': [{
                        'role': 'Team Composition',
                        'responsibilities': ai_response[:500],
                        'why_needed': 'Based on contract analysis',
                        'preferred_qualifications': 'See contract requirements',
                        'partner_profile': 'Relevant to contract scope'
                    }],
                    'key_considerations': ['Review full analysis above'],
                    'compliance_notes': 'Refer to contract compliance requirements'
                }
            
            app.logger.info(f"Successfully generated team suggestions for draft {draft_id}")
            
            return jsonify({
                'success': True,
                'suggestions': suggestions_data
            })
            
        except Exception as ai_error:
            app.logger.error(f"Error generating team suggestions: {ai_error}")
            return jsonify({
                'success': False,
                'error': f'AI analysis failed: {str(ai_error)}'
            }), 500
        
    except Exception as e:
        app.logger.error(f"Error in suggest_team: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_draft_pricing', methods=['GET'])
def get_draft_pricing():
    """Get pricing data from draft"""
    try:
        draft_id = request.args.get('draft_id')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        if admin_initialized and admin_db:
            user = auth.current_user
            if not user:
                return jsonify({'success': False, 'error': 'Not authenticated'}), 401
            
            draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
            draft_data = draft_ref.get()
            
            if draft_data and 'pricing' in draft_data:
                return jsonify({
                    'success': True,
                    'pricing': draft_data['pricing']
                })
        
        return jsonify({
            'success': True,
            'pricing': {
                'labor': [],
                'materials': [],
                'margin_pct': 15,
                'risk_pct': 5
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting draft pricing: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update_draft_pricing', methods=['POST'])
def update_draft_pricing():
    """Update pricing data in draft"""
    try:
        data = request.json
        draft_id = data.get('draft_id')
        pricing = data.get('pricing')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        if admin_initialized and admin_db:
            user = auth.current_user
            if not user:
                return jsonify({'success': False, 'error': 'Not authenticated'}), 401
            
            draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
            draft_ref.update({'pricing': pricing})
        
        return jsonify({'success': True})
        
    except Exception as e:
        logging.error(f"Error updating draft pricing: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate_pricing_strategy', methods=['POST'])
def generate_pricing_strategy():
    """Generate AI-powered pricing strategy"""
    try:
        data = request.json
        draft_id = data.get('draft_id')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        if not admin_initialized or not admin_db:
            return jsonify({'success': False, 'error': 'Firebase not initialized'}), 500
        
        user = auth.current_user
        if not user:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        draft_ref = admin_db.reference(f'proposal_drafts/{user["localId"]}/{draft_id}')
        draft_data = draft_ref.get()
        
        if not draft_data:
            return jsonify({'success': False, 'error': 'Draft not found'}), 404
        
        annotations = draft_data.get('annotations', [])
        team_members = draft_data.get('team_members', [])
        contract_hash = draft_data.get('contract_hash', '')
        
        annotations_text = '\n'.join([f"- {ann.get('category', '')}: {ann.get('text', '')}" for ann in annotations])
        team_text = '\n'.join([f"- {member.get('company', '')}: {member.get('services', '')}" for member in team_members])
        
        try:
            from openai import OpenAI
            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            
            prompt = f"""You are an expert pricing strategist for government contracts. Based on the contract analysis and team composition below, provide a comprehensive pricing strategy recommendation.

Contract Analysis:
{annotations_text if annotations_text else 'No contract analysis available'}

Team Composition:
{team_text if team_text else 'No team members added yet'}

Provide a detailed pricing strategy that includes:
1. Recommended delivery model (fixed-price, time & materials, cost-plus, etc.)
2. Competitive positioning and estimated price range
3. Key cost drivers breakdown (labor, materials, overhead, risk)
4. Risk mitigation strategies
5. Win strategy recommendations

Format your response in HTML with clear headings and bullet points."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert pricing strategist for government contracts. Provide detailed, actionable pricing recommendations."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            strategy = response.choices[0].message.content.strip()
            
            draft_ref.update({'pricing_strategy': strategy})
            
            return jsonify({
                'success': True,
                'strategy': strategy
            })
            
        except Exception as e:
            logging.error(f"Error generating AI pricing strategy: {e}")
            
            fallback_strategy = """
            <h4>Recommended Pricing Strategy</h4>
            <p><strong>Delivery Model:</strong> Fixed-price contract with milestone-based payments</p>
            <p><strong>Competitive Positioning:</strong> Based on market analysis, similar contracts typically range from $150K-$250K. 
            Recommend positioning competitively while maintaining healthy margins.</p>
            <p><strong>Key Cost Drivers:</strong></p>
            <ul>
                <li>Labor: 60% of total cost (estimated hours at blended rate)</li>
                <li>Materials & Equipment: 25% of total cost</li>
                <li>Overhead & Risk: 15% of total cost</li>
            </ul>
            <p><strong>Risk Mitigation:</strong> Include 5-10% contingency for unforeseen circumstances and material price fluctuations.</p>
            <p><em>Note: AI analysis temporarily unavailable. Please review and adjust based on your specific contract requirements.</em></p>
            """
            
            return jsonify({
                'success': True,
                'strategy': fallback_strategy
            })
        
    except Exception as e:
        logging.error(f"Error generating pricing strategy: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate_final_proposal', methods=['GET'])
def generate_final_proposal():
    """Generate final proposal document with disclaimer"""
    try:
        draft_id = request.args.get('draft_id')
        
        if not draft_id:
            return jsonify({'success': False, 'error': 'Missing draft_id'}), 400
        
        
        return jsonify({
            'success': True,
            'message': 'Proposal generation not yet fully implemented. This will integrate with the existing full proposal generation system.'
        })
        
    except Exception as e:
        logging.error(f"Error generating final proposal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def ensure_session_from_auth():
    """Helper function to populate session from auth.current_user if session is missing"""
    if 'user_data' not in session:
        user = auth.current_user
        if user:
            # Repopulate session from auth.current_user
            session['user_data'] = {
                'user_id': user.get('localId'),
                'idToken': user.get('idToken'),
                'refreshToken': user.get('refreshToken'),
                'email': user.get('email', ''),
                'first_name': user.get('first_name', ''),
                'last_name': user.get('last_name', ''),
                'company': user.get('company', '')
            }
            session.permanent = True
            app.logger.info(f"✅ Repopulated session from auth.current_user for user {user.get('localId')}")
            return True
        return False
    return True

@app.route('/directory-profile')
def directory_profile():
    """Directory profile management page"""
    if not ensure_session_from_auth():
        return redirect(url_for('Login'))
    
    return render_template('directory_profile.html')

@app.route('/api/get_directory_profile', methods=['GET'])
def get_directory_profile():
    """Get user's directory profile"""
    try:
        # Ensure session is populated from auth.current_user if needed
        if not ensure_session_from_auth():
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user_id = session['user_data']['user_id']
        id_token = session['user_data']['idToken']
        
        user_data = None
        try:
            user_data = db.child("users").child(user_id).get(id_token).val()
        except Exception as user_error:
            app.logger.warning(f"Could not read user data with token for user {user_id}: {user_error}")
            if admin_initialized and admin_db:
                try:
                    user_ref = admin_db.reference(f'users/{user_id}')
                    user_data = user_ref.get()
                    app.logger.info(f"✅ Successfully read user data using Admin SDK for user {user_id}")
                except Exception as admin_error:
                    app.logger.error(f"❌ Admin SDK read also failed for user {user_id}: {repr(admin_error)}")
        
        if not user_data:
            user_data = {
                'company': session['user_data'].get('company', ''),
                'first_name': session['user_data'].get('first_name', ''),
                'last_name': session['user_data'].get('last_name', ''),
                'email': session['user_data'].get('email', ''),
                'directory_listed': False
            }
            app.logger.warning(f"Using session data as fallback for user {user_id}")
        
        directory_data = None
        try:
            directory_data = db.child("corama_directory").child(user_id).get(id_token).val()
        except Exception as dir_error:
            app.logger.warning(f"Could not read directory data with token for user {user_id}: {dir_error}")
            if admin_initialized and admin_db:
                try:
                    directory_ref = admin_db.reference(f'corama_directory/{user_id}')
                    directory_data = directory_ref.get()
                    app.logger.info(f"✅ Successfully read directory data using Admin SDK for user {user_id}")
                except Exception as admin_error:
                    app.logger.warning(f"⚠️ Admin SDK read also failed for directory data {user_id}: {repr(admin_error)}")
        
        if not directory_data:
            directory_data = {
                'company': user_data.get('company', ''),
                'contact_name': f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                'email': user_data.get('email', ''),
                'services': '',
                'description': '',
                'phone': '',
                'website': '',
                'linkedin_url': '',
                'certifications': '',
                'past_projects': '',
                'team_size': '',
                'years_in_business': '',
                'logo_url': '',
                'listed': user_data.get('directory_listed', False)
            }
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'profile': directory_data
        })
        
    except Exception as e:
        app.logger.error(f"Error getting directory profile: {e}")
        return jsonify({'success': False, 'error': 'Failed to load profile. Please try again.'}), 500

@app.route('/api/update_directory_profile', methods=['POST'])
def update_directory_profile():
    """Update user's directory profile"""
    try:
        # Use session-based authentication instead of auth.current_user
        if 'user_data' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user_id = session['user_data']['user_id']
        id_token = session['user_data']['idToken']
        data = request.json
        
        # Get user data to include company name
        user_data = db.child("users").child(user_id).get(id_token).val()
        
        if not user_data:
            return jsonify({'success': False, 'error': 'User data not found'}), 404
        
        profile_data = {
            'company': user_data.get('company', ''),
            'contact_name': data.get('contact_name', '').strip(),
            'email': data.get('email', '').strip(),
            'phone': data.get('phone', '').strip(),
            'website': data.get('website', '').strip(),
            'linkedin_url': data.get('linkedin_url', '').strip(),
            'services': data.get('services', '').strip(),
            'description': data.get('description', '').strip(),
            'certifications': data.get('certifications', '').strip(),
            'past_projects': data.get('past_projects', '').strip(),
            'team_size': data.get('team_size', '').strip(),
            'years_in_business': data.get('years_in_business', '').strip(),
            'logo_url': data.get('logo_url', ''),
            'listed': data.get('listed', False),
            'updated_at': datetime.now().isoformat()
        }
        
        app.logger.info(f"Attempting to update directory profile for user {user_id}")
        
        directory_write_success = False
        
        try:
            db.child("corama_directory").child(user_id).set(profile_data, id_token)
            directory_write_success = True
            app.logger.info(f"✅ Successfully wrote directory entry for user {user_id} using user token")
        except Exception as dir_error:
            error_str = str(dir_error).upper()
            app.logger.warning(f"⚠️ User token write failed for user {user_id}: {repr(dir_error)}")
            
            if 'PERMISSION' in error_str or 'UNAUTHORIZED' in error_str or '401' in error_str:
                if admin_initialized and admin_db:
                    try:
                        directory_ref = admin_db.reference(f'corama_directory/{user_id}')
                        directory_ref.set(profile_data)
                        directory_write_success = True
                        app.logger.info(f"✅ Successfully wrote directory entry for user {user_id} using Admin SDK fallback")
                    except Exception as admin_error:
                        app.logger.error(f"❌ Admin SDK write also failed for user {user_id}: {repr(admin_error)}")
                        return jsonify({
                            'success': False, 
                            'error': 'Unable to update directory profile. Please contact support.',
                            'permission_error': True
                        }), 403
                else:
                    app.logger.error(f"❌ Admin SDK not available and user token failed for user {user_id}")
                    return jsonify({
                        'success': False, 
                        'error': 'Permission denied. Please contact support to enable directory access.',
                        'permission_error': True
                    }), 403
            else:
                raise
        
        if not directory_write_success:
            app.logger.error(f"❌ Directory write failed for user {user_id}")
            return jsonify({'success': False, 'error': 'Failed to update directory profile'}), 500
        
        try:
            db.child("users").child(user_id).update({
                'directory_listed': data.get('listed', False)
            }, id_token)
            app.logger.info(f"✅ Successfully updated directory_listed flag for user {user_id}")
        except Exception as user_update_error:
            app.logger.warning(f"⚠️ Failed to update directory_listed flag for user {user_id}: {repr(user_update_error)}")
            if admin_initialized and admin_db:
                try:
                    user_ref = admin_db.reference(f'users/{user_id}')
                    user_ref.update({'directory_listed': data.get('listed', False)})
                    app.logger.info(f"✅ Successfully updated directory_listed flag using Admin SDK for user {user_id}")
                except Exception as admin_user_error:
                    app.logger.error(f"❌ Admin SDK user update also failed for user {user_id}: {repr(admin_user_error)}")
        
        return jsonify({'success': True})
        
    except Exception as e:
        app.logger.error(f"Error updating directory profile: {e}")
        return jsonify({'success': False, 'error': 'Failed to update profile. Please try again.'}), 500

@app.route('/api/upload_directory_logo', methods=['POST'])
def upload_directory_logo():
    """Upload company logo for directory profile"""
    try:
        if 'user_data' not in session:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        user_id = session['user_data']['user_id']
        
        if 'logo' not in request.files:
            return jsonify({'success': False, 'error': 'No logo file provided'}), 400
        
        logo_file = request.files['logo']
        
        if logo_file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_ext = logo_file.filename.rsplit('.', 1)[1].lower() if '.' in logo_file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'success': False, 'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP'}), 400
        
        logo_file.seek(0, os.SEEK_END)
        file_size = logo_file.tell()
        logo_file.seek(0)
        
        if file_size > 5 * 1024 * 1024:
            return jsonify({'success': False, 'error': 'File too large. Maximum size is 5MB'}), 400
        
        # Create directory logos folder if it doesn't exist
        logos_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'directory_logos')
        os.makedirs(logos_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"{user_id}_{int(time.time())}.{file_ext}"
        filepath = os.path.join(logos_dir, filename)
        
        logo_file.save(filepath)
        
        # Generate URL for the logo
        logo_url = f"/static/uploads/directory_logos/{filename}"
        
        static_logos_dir = os.path.join(base_dir, 'static', 'uploads', 'directory_logos')
        os.makedirs(static_logos_dir, exist_ok=True)
        static_filepath = os.path.join(static_logos_dir, filename)
        shutil.copy2(filepath, static_filepath)
        
        return jsonify({
            'success': True,
            'logo_url': logo_url
        })
        
    except Exception as e:
        app.logger.error(f"Error uploading directory logo: {e}")
        return jsonify({'success': False, 'error': 'Failed to upload logo. Please try again.'}), 500

@app.route('/api/get_directory_companies', methods=['GET'])
def get_directory_companies():
    """Get all companies listed in the directory - PUBLIC endpoint (no login required)"""
    try:
        search_query = request.args.get('search', '').lower()
        
        directory_data = None
        
        if 'user_data' in session:
            try:
                id_token = session['user_data']['idToken']
                directory_data = db.child("corama_directory").get(id_token).val()
            except Exception as token_error:
                app.logger.warning(f"Could not read directory with user token: {token_error}")
        
        if not directory_data and admin_initialized and admin_db:
            try:
                directory_ref = admin_db.reference('corama_directory')
                directory_data = directory_ref.get()
                app.logger.info("✅ Successfully read directory using Admin SDK")
            except Exception as admin_error:
                app.logger.error(f"❌ Admin SDK read also failed for directory: {repr(admin_error)}")
        
        if not directory_data:
            app.logger.info("📋 Firebase directory is empty, loading seed data")
            try:
                import json
                seed_file_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'directory_seed.json')
                if os.path.exists(seed_file_path):
                    with open(seed_file_path, 'r') as f:
                        seed_data = json.load(f)
                        directory_data = seed_data
                        app.logger.info(f"✅ Loaded {len(seed_data)} seed companies")
                else:
                    app.logger.warning("⚠️ Seed data file not found")
                    return jsonify({'success': True, 'companies': []})
            except Exception as seed_error:
                app.logger.error(f"❌ Error loading seed data: {seed_error}")
                return jsonify({'success': True, 'companies': []})
        
        companies = []
        for user_id, profile in directory_data.items():
            if profile.get('listed', False):
                if search_query:
                    searchable_text = f"{profile.get('company', '')} {profile.get('services', '')} {profile.get('description', '')}".lower()
                    if search_query not in searchable_text:
                        continue
                
                companies.append({
                    'user_id': user_id,
                    'company': profile.get('company', ''),
                    'contact_name': profile.get('contact_name', ''),
                    'email': profile.get('email', ''),
                    'phone': profile.get('phone', ''),
                    'website': profile.get('website', ''),
                    'linkedin_url': profile.get('linkedin_url', ''),
                    'team_size': profile.get('team_size', ''),
                    'years_in_business': profile.get('years_in_business', ''),
                    'services': profile.get('services', ''),
                    'description': profile.get('description', ''),
                    'certifications': profile.get('certifications', ''),
                    'past_projects': profile.get('past_projects', ''),
                    'logo_url': profile.get('logo_url', '')
                })
        
        companies.sort(key=lambda x: x['company'])
        
        return jsonify({'success': True, 'companies': companies})
        
    except Exception as e:
        app.logger.error(f"Error getting directory companies: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/directory')
def directory_browse():
    """Public directory browse page - no login required"""
    return render_template('directory_browse.html')

@app.route('/directory/company/<user_id>')
def directory_company_profile(user_id):
    """Individual company profile page - no login required"""
    return render_template('directory_company_profile.html', company_user_id=user_id)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)

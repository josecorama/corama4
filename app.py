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
from pdf_class import create_pdf
#from RAG.capability_statement_preprocessing import process_pdfs
#from RAG.Capability_statement_embedding import generate_embeddings as generate_capability_embeddings
#from RAG.vector_store import VectorStore, load_embeddings, initialize_vector_stores
#from RAG.matcher import find_matches
from dotenv import load_dotenv
from ai_assistant_enhanced import EnhancedAIAssistant
from enhanced_features import ContractOpportunityScorer, CompetitiveIntelligence, ProposalOptimizer, DeadlineManager, IndustryTemplateLibrary

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

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(base_dir, 'static', 'uploads'), exist_ok=True)

if os.getenv('ENV') == 'production':
    logging.basicConfig(level=logging.WARNING)
else:
    logging.basicConfig(level=logging.INFO)




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
        
        # Initialize Enhanced AI Assistant and additional features after Firebase setup
        from openai import OpenAI
        bid_response_client = OpenAI(api_key=os.getenv('BID_RESPONSE_OPENAI_API_KEY'))
        
        enhanced_ai = EnhancedAIAssistant(app, db)
        opportunity_scorer = ContractOpportunityScorer(bid_response_client)
        competitive_intel = CompetitiveIntelligence(bid_response_client)
        proposal_optimizer = ProposalOptimizer(bid_response_client)
        deadline_manager = DeadlineManager(db)
        template_library = IndustryTemplateLibrary(bid_response_client)
    else:
        logging.warning("Firebase configuration incomplete. Firebase services will be disabled.")
except Exception as e:
    logging.warning(f"Firebase initialization failed: {e}. Firebase services will be disabled.")



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

client_SMART_SEARCH_OPENAI_API_KEY =  OpenAI(api_key=os.getenv('SMART_SEARCH_OPENAI_API_KEY'))

client_CS_BUILDER_OPENAI_API_KEY =  OpenAI(api_key=os.getenv('CS_BUILDER_OPENAI_API_KEY'))

client_BID_RESPONSE_OPENAI_API_KEY = OpenAI(api_key=os.getenv('BID_RESPONSE_OPENAI_API_KEY'))




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
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

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
    
    # ----- Step 1: 处理 matches.csv 中的选定合同 -----
    matches_file = os.path.join(user_uploads_dir, "matches.csv")
    if not os.path.exists(matches_file):
        return "matches.csv not found."
    
    try:
        df = pd.read_csv(matches_file, dtype=str)
    except Exception as e:
        return f"Error reading matches.csv: {str(e)}"
    
    selected_rows = df[df["hash_value"] == hash_value]
    if selected_rows.empty:
        return "No matching contract found for the provided hash_value."
    
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
                    "username": email.split('@')[0]
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
            }, user_logged_in['idToken'])

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

@app.route('/ai-assistant')
def ai_assistant_room():
    """AI Assistant room for bid response creation"""
    contract_id = request.args.get('contract')
    contract_name = request.args.get('name')
    
    if not contract_id:
        return redirect('/welcome')
    
    return render_template('ai_assistant_room.html', 
                         contract_id=contract_id,
                         contract_name=contract_name)

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
    user = session.get('user')
    if not user:
        app.logger.error('User not logged in')
        return jsonify({'success': False, 'message': 'User not logged in'}), 400
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

@app.route('/ai_assistant_enhanced', methods=['POST'])
def enhanced_ai_assistant():
    """Enhanced AI assistant endpoint with comprehensive bid creation capabilities"""
    try:
        user_query = request.form.get('query')
        hash_value = request.form.get('hash_value')
        action_type = request.form.get('action_type', 'general')  # general, analyze, strategy, compliance, outline
        
        if not user_query:
            return jsonify({"error": "Query is required"}), 400
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        user_uploads_dir = user_data['uploads_dir']
        user_id = user['localId']
        
        conversation_history = enhanced_ai.get_conversation_context(user_id, hash_value) if hash_value else []
        
        context_data = {}
        
        if hash_value:
            context_data['contract_info'] = process_selected_contract(user_uploads_dir, hash_value)
            context_data['capability_statement'] = process_files_user_input(user_uploads_dir)
            
            if action_type == 'analyze':
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data['contract_info'])
                context_data['contract_requirements'] = contract_requirements
                
                win_probability = enhanced_ai.calculate_win_probability(
                    context_data['capability_statement'], 
                    contract_requirements
                )
                context_data['win_probability'] = win_probability
                
            elif action_type == 'compliance':
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data['contract_info'])
                compliance_checklist = enhanced_ai.generate_compliance_checklist(contract_requirements)
                context_data['compliance_checklist'] = compliance_checklist
                
            elif action_type == 'strategy':
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data['contract_info'])
                win_probability = enhanced_ai.calculate_win_probability(
                    context_data['capability_statement'], 
                    contract_requirements
                )
                strategy = enhanced_ai.suggest_bid_strategy(contract_requirements, context_data['capability_statement'], win_probability.get('probability', 50))
                context_data['bid_strategy'] = strategy
                
            elif action_type == 'outline':
                contract_requirements = enhanced_ai.analyze_contract_requirements(context_data['contract_info'])
                proposal_outline = enhanced_ai.generate_proposal_outline(contract_requirements, context_data['capability_statement'])
                context_data['proposal_outline'] = proposal_outline
        
        # Generate enhanced response
        ai_response = enhanced_ai.generate_enhanced_response(user_query, context_data, conversation_history)
        
        # Save conversation turn
        if hash_value:
            enhanced_ai.save_conversation_turn(user_id, hash_value, user_query, ai_response)
        
        # Return response with additional context if requested
        response_data = {"response": ai_response}
        
        if action_type == 'analyze' and 'win_probability' in context_data:
            response_data['win_probability'] = context_data['win_probability']
            response_data['contract_requirements'] = context_data.get('contract_requirements', {})
            
        elif action_type == 'compliance' and 'compliance_checklist' in context_data:
            response_data['compliance_checklist'] = context_data['compliance_checklist']
            
        elif action_type == 'outline' and 'proposal_outline' in context_data:
            response_data['proposal_outline'] = context_data['proposal_outline']
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error in enhanced AI assistant: {str(e)}")
        return jsonify({"error": f"Enhanced AI assistant error: {str(e)}"}), 500

@app.route('/upload_document', methods=['POST'])
def upload_document():
    """Upload document to user's profile for AI assistant use"""
    try:
        if 'user' not in session:
            return jsonify({"error": "User not authenticated"}), 401
            
        user = session['user']
        user_data = db.child("users").child(user['localId']).get(user['idToken']).val()
        
        if not user_data or 'uploads_dir' not in user_data:
            return jsonify({"error": "User uploads directory not found"}), 400
            
        user_uploads_dir = user_data['uploads_dir']
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(user_uploads_dir, filename)
            file.save(file_path)
            
            documents_ref = db.child("users").child(user['localId']).child("documents")
            document_data = {
                'filename': filename,
                'upload_date': datetime.now().isoformat(),
                'file_path': file_path,
                'file_type': filename.split('.')[-1].lower()
            }
            documents_ref.push(document_data, user['idToken'])
            
            return jsonify({"success": True, "filename": filename})
        else:
            return jsonify({"error": "File type not allowed"}), 400
            
    except Exception as e:
        logging.error(f"Error uploading document: {e}")
        return jsonify({"error": str(e)}), 500

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
            logging.error("Vector store not initialized.")
            return jsonify({"success": False, "message": "Search unavailable."}), 500

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



if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)

#!/usr/bin/env python3
"""
APEX Accelerator - USASpending.gov Data Import Prototype Script

This script demonstrates how to:
1. Fetch recent contract awards from USASpending.gov API
2. Match awards to existing APEX clients using fuzzy matching
3. Automatically create contract records and milestones
4. Generate alerts for upcoming deadlines

Usage:
    python apex_prototype_import.py --days 7 --min-value 25000
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from dotenv import load_dotenv
import pyrebase
import firebase_admin
from firebase_admin import credentials, db as admin_db

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from apex_api_integration import ApexAPIOrchestrator
from apex_award_tracker import ApexAwardTracker, ApexMatchingEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def initialize_firebase():
    """Initialize Firebase connections (both Pyrebase and Admin SDK)"""
    load_dotenv()
    
    firebase_config = {
        "apiKey": os.getenv('FIREBASE_API_KEY'),
        "authDomain": os.getenv('AUTH_DOMAIN'),
        "databaseURL": os.getenv('DATABASE_URL'),
        "projectId": os.getenv('PROJECT_ID'),
        "storageBucket": os.getenv('STORAGE_BUCKET'),
        "messagingSenderId": os.getenv('MESSAGING_SENDER_ID'),
        "appId": os.getenv('APP_ID')
    }
    
    firebase = pyrebase.initialize_app(firebase_config)
    pyrebase_db = firebase.database()
    
    try:
        service_account_path = os.getenv('SERVICE_ACCOUNT_JSON', 'corama-c911e-firebase-adminsdk-eldc8-9333a76b90.json')
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {
                'databaseURL': os.getenv('DATABASE_URL')
            })
            firebase_admin_db = admin_db.reference()
            logger.info("Firebase Admin SDK initialized successfully")
        else:
            firebase_admin_db = None
            logger.warning("Firebase Admin SDK credentials not found, using Pyrebase only")
    except Exception as e:
        logger.warning(f"Could not initialize Firebase Admin SDK: {e}")
        firebase_admin_db = None
    
    return pyrebase_db, firebase_admin_db


def create_sample_clients(tracker):
    """Create sample APEX clients for demonstration"""
    sample_clients = [
        {
            'company_name': 'ABC Manufacturing Inc.',
            'duns_number': '123456789',
            'uei_code': 'ABC123456789',
            'cage_code': '1A2B3',
            'contact_email': 'owner@abcmfg.com',
            'contact_phone': '+1-555-0100',
            'contact_name': 'John Smith',
            'assigned_counselor_email': 'counselor@apex.org',
            'industry_naics': ['336411', '332710'],
            'business_type': 'Small Business, Minority-Owned',
            'region': 'Midwest',
            'state': 'IL'
        },
        {
            'company_name': 'Tech Solutions LLC',
            'duns_number': '987654321',
            'uei_code': 'TECH987654321',
            'cage_code': '9Z8Y7',
            'contact_email': 'contact@techsolutions.com',
            'contact_phone': '+1-555-0200',
            'contact_name': 'Jane Doe',
            'assigned_counselor_email': 'counselor@apex.org',
            'industry_naics': ['541512', '541519'],
            'business_type': 'Small Business, Woman-Owned',
            'region': 'Midwest',
            'state': 'IN'
        },
        {
            'company_name': 'Green Energy Systems',
            'duns_number': '456789123',
            'uei_code': 'GREEN456789123',
            'cage_code': '5G4E3',
            'contact_email': 'info@greenenergy.com',
            'contact_phone': '+1-555-0300',
            'contact_name': 'Bob Johnson',
            'assigned_counselor_email': 'counselor@apex.org',
            'industry_naics': ['221114', '237130'],
            'business_type': 'Small Business',
            'region': 'Midwest',
            'state': 'IL'
        }
    ]
    
    logger.info("Creating sample clients...")
    created_count = 0
    
    for client_data in sample_clients:
        success, message, client_id = tracker.create_client(client_data)
        if success:
            logger.info(f"✓ Created client: {client_data['company_name']} (ID: {client_id})")
            created_count += 1
        else:
            logger.warning(f"✗ Failed to create client {client_data['company_name']}: {message}")
    
    logger.info(f"Created {created_count} sample clients")
    return created_count


def run_import(days_back=7, min_value=25000, create_samples=False):
    """
    Run the import process
    
    Args:
        days_back: Number of days to look back for awards
        min_value: Minimum contract value to import
        create_samples: Whether to create sample clients first
    """
    logger.info("=" * 80)
    logger.info("APEX ACCELERATOR - CONTRACT AWARD IMPORT PROTOTYPE")
    logger.info("=" * 80)
    
    logger.info("\n1. Initializing Firebase connection...")
    pyrebase_db, firebase_admin_db = initialize_firebase()
    
    logger.info("\n2. Initializing Award Tracker...")
    tracker = ApexAwardTracker(pyrebase_db, firebase_admin_db)
    matching_engine = ApexMatchingEngine(tracker)
    
    if create_samples:
        logger.info("\n3. Creating sample clients...")
        create_sample_clients(tracker)
    
    logger.info("\n4. Initializing API connections...")
    sam_api_key = os.getenv('SAM_GOV_API_KEY')
    if sam_api_key:
        logger.info("   ✓ SAM.gov API key found")
    else:
        logger.warning("   ⚠ SAM.gov API key not found (will use USASpending.gov only)")
    
    api_orchestrator = ApexAPIOrchestrator(sam_api_key=sam_api_key)
    
    logger.info(f"\n5. Fetching awards from last {days_back} days (min value: ${min_value:,.2f})...")
    awards = api_orchestrator.fetch_all_recent_awards(days_back=days_back, min_value=min_value)
    
    if not awards:
        logger.warning("   No awards found!")
        return
    
    logger.info(f"   ✓ Found {len(awards)} awards")
    
    logger.info("\n6. Sample awards retrieved:")
    for i, award in enumerate(awards[:5], 1):
        logger.info(f"\n   Award #{i}:")
        logger.info(f"   - Contract: {award.get('contract_number', 'N/A')}")
        logger.info(f"   - Recipient: {award.get('recipient_name', 'N/A')}")
        logger.info(f"   - Amount: ${award.get('award_amount', 0):,.2f}")
        logger.info(f"   - Agency: {award.get('awarding_agency', 'N/A')}")
        logger.info(f"   - UEI: {award.get('recipient_uei', 'N/A')}")
    
    if len(awards) > 5:
        logger.info(f"\n   ... and {len(awards) - 5} more awards")
    
    logger.info("\n7. Matching awards to existing clients...")
    total_matches = 0
    high_confidence_matches = 0
    medium_confidence_matches = 0
    auto_created_contracts = 0
    
    for award in awards:
        matches = matching_engine.match_award_to_client(award)
        
        if matches:
            total_matches += 1
            best_match = matches[0]
            
            logger.info(f"\n   Match found for: {award.get('recipient_name', 'N/A')}")
            logger.info(f"   - Client: {best_match['client_name']}")
            logger.info(f"   - Confidence: {best_match['match_score']}%")
            logger.info(f"   - Match type: {best_match['match_criteria'].get('match_type', 'unknown')}")
            
            if best_match['match_score'] >= 95:
                high_confidence_matches += 1
                logger.info(f"   - Status: AUTO-APPROVED (high confidence)")
            elif best_match['match_score'] >= 70:
                medium_confidence_matches += 1
                logger.info(f"   - Status: PENDING REVIEW (medium confidence)")
            
            success, queue_id = matching_engine.create_match_queue_entry(award, matches)
            if success:
                logger.info(f"   - Queue ID: {queue_id}")
                if best_match['match_score'] >= 95:
                    auto_created_contracts += 1
    
    logger.info("\n" + "=" * 80)
    logger.info("IMPORT SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total awards processed: {len(awards)}")
    logger.info(f"Total matches found: {total_matches}")
    logger.info(f"High confidence matches (≥95%): {high_confidence_matches}")
    logger.info(f"Medium confidence matches (70-94%): {medium_confidence_matches}")
    logger.info(f"Auto-created contracts: {auto_created_contracts}")
    logger.info(f"Pending staff review: {medium_confidence_matches}")
    logger.info("=" * 80)
    
    logger.info("\nNEXT STEPS:")
    logger.info("1. Review pending matches in the staff dashboard")
    logger.info("2. Approve or reject medium-confidence matches")
    logger.info("3. Verify auto-created contracts and milestones")
    logger.info("4. Check that alerts are scheduled correctly")
    logger.info("5. Set up daily cron job for automated imports")
    
    logger.info("\n✓ Import process completed successfully!")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='APEX Accelerator Contract Award Import Prototype'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Number of days to look back for awards (default: 7)'
    )
    parser.add_argument(
        '--min-value',
        type=float,
        default=25000,
        help='Minimum contract value to import (default: 25000)'
    )
    parser.add_argument(
        '--create-samples',
        action='store_true',
        help='Create sample clients before importing'
    )
    
    args = parser.parse_args()
    
    try:
        run_import(
            days_back=args.days,
            min_value=args.min_value,
            create_samples=args.create_samples
        )
    except KeyboardInterrupt:
        logger.info("\n\nImport interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"\n\nError during import: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

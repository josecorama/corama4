"""
APEX Accelerator Post-Award Contract Tracking System
Core module for tracking government contract awards and managing milestones
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import hashlib
import json
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
import pandas as pd

logger = logging.getLogger(__name__)


class ApexAwardTracker:
    """Main class for managing contract awards and tracking"""
    
    def __init__(self, db, firebase_admin_db=None):
        """
        Initialize the Award Tracker
        
        Args:
            db: Firebase database reference (Pyrebase)
            firebase_admin_db: Firebase Admin SDK database reference (optional)
        """
        self.db = db
        self.admin_db = firebase_admin_db
        
    def create_client(self, client_data: Dict) -> Tuple[bool, str, Optional[str]]:
        """
        Create a new APEX client record
        
        Args:
            client_data: Dictionary containing client information
            
        Returns:
            Tuple of (success, message, client_id)
        """
        try:
            required_fields = ['company_name', 'contact_email', 'assigned_counselor_email']
            for field in required_fields:
                if field not in client_data:
                    return False, f"Missing required field: {field}", None
            
            client_id = self._generate_client_id(client_data['company_name'])
            
            client_data['client_id'] = client_id
            client_data['created_at'] = datetime.utcnow().isoformat()
            client_data['updated_at'] = datetime.utcnow().isoformat()
            client_data['status'] = client_data.get('status', 'active')
            
            if self.admin_db:
                self.admin_db.child('apex_clients').child(client_id).set(client_data)
            else:
                self.db.child('apex_clients').child(client_id).set(client_data)
            
            logger.info(f"Created client: {client_id} - {client_data['company_name']}")
            return True, "Client created successfully", client_id
            
        except Exception as e:
            logger.error(f"Error creating client: {str(e)}")
            return False, f"Error creating client: {str(e)}", None
    
    def get_client(self, client_id: str) -> Optional[Dict]:
        """Get client information by ID"""
        try:
            if self.admin_db:
                client = self.admin_db.child('apex_clients').child(client_id).get()
            else:
                client = self.db.child('apex_clients').child(client_id).get()
            
            return client.val() if client else None
        except Exception as e:
            logger.error(f"Error getting client {client_id}: {str(e)}")
            return None
    
    def get_all_clients(self) -> List[Dict]:
        """Get all active clients"""
        try:
            if self.admin_db:
                clients = self.admin_db.child('apex_clients').get()
            else:
                clients = self.db.child('apex_clients').get()
            
            if not clients or not clients.val():
                return []
            
            client_list = []
            for client_id, client_data in clients.val().items():
                client_data['client_id'] = client_id
                client_list.append(client_data)
            
            return client_list
        except Exception as e:
            logger.error(f"Error getting all clients: {str(e)}")
            return []
    
    def create_contract(self, contract_data: Dict, auto_generate_milestones: bool = True) -> Tuple[bool, str, Optional[str]]:
        """
        Create a new contract award record
        
        Args:
            contract_data: Dictionary containing contract information
            auto_generate_milestones: Whether to automatically generate milestones
            
        Returns:
            Tuple of (success, message, contract_id)
        """
        try:
            required_fields = ['client_id', 'contract_number', 'contract_title', 
                             'contract_value', 'start_date', 'end_date']
            for field in required_fields:
                if field not in contract_data:
                    return False, f"Missing required field: {field}", None
            
            client = self.get_client(contract_data['client_id'])
            if not client:
                return False, f"Client not found: {contract_data['client_id']}", None
            
            contract_id = self._generate_contract_id(contract_data['contract_number'])
            
            contract_data['contract_id'] = contract_id
            contract_data['created_at'] = datetime.utcnow().isoformat()
            contract_data['updated_at'] = datetime.utcnow().isoformat()
            contract_data['status'] = contract_data.get('status', 'active')
            contract_data['data_source'] = contract_data.get('data_source', 'client_reported')
            
            if self.admin_db:
                self.admin_db.child('apex_contracts').child(contract_id).set(contract_data)
            else:
                self.db.child('apex_contracts').child(contract_id).set(contract_data)
            
            logger.info(f"Created contract: {contract_id} - {contract_data['contract_number']}")
            
            if auto_generate_milestones:
                milestone_count = self.generate_milestones(contract_id, contract_data)
                logger.info(f"Generated {milestone_count} milestones for contract {contract_id}")
            
            return True, "Contract created successfully", contract_id
            
        except Exception as e:
            logger.error(f"Error creating contract: {str(e)}")
            return False, f"Error creating contract: {str(e)}", None
    
    def get_contract(self, contract_id: str) -> Optional[Dict]:
        """Get contract information by ID"""
        try:
            if self.admin_db:
                contract = self.admin_db.child('apex_contracts').child(contract_id).get()
            else:
                contract = self.db.child('apex_contracts').child(contract_id).get()
            
            return contract.val() if contract else None
        except Exception as e:
            logger.error(f"Error getting contract {contract_id}: {str(e)}")
            return None
    
    def get_client_contracts(self, client_id: str) -> List[Dict]:
        """Get all contracts for a specific client"""
        try:
            if self.admin_db:
                contracts = self.admin_db.child('apex_contracts').order_by_child('client_id').equal_to(client_id).get()
            else:
                contracts = self.db.child('apex_contracts').order_by_child('client_id').equal_to(client_id).get()
            
            if not contracts or not contracts.val():
                return []
            
            contract_list = []
            for contract_id, contract_data in contracts.val().items():
                contract_data['contract_id'] = contract_id
                contract_list.append(contract_data)
            
            return contract_list
        except Exception as e:
            logger.error(f"Error getting contracts for client {client_id}: {str(e)}")
            return []
    
    def generate_milestones(self, contract_id: str, contract_data: Dict) -> int:
        """
        Generate milestones for a contract based on dates and requirements
        
        Args:
            contract_id: Contract identifier
            contract_data: Contract information
            
        Returns:
            Number of milestones created
        """
        try:
            milestones = []
            start_date = datetime.fromisoformat(contract_data['start_date'])
            end_date = datetime.fromisoformat(contract_data['end_date'])
            
            milestones.append({
                'milestone_type': 'contract_start',
                'milestone_title': 'Contract Start Date',
                'milestone_description': f"Contract {contract_data['contract_number']} begins",
                'due_date': start_date.date().isoformat(),
                'alert_days_before': [7, 3, 1],
                'priority': 'high'
            })
            
            milestones.append({
                'milestone_type': 'contract_end',
                'milestone_title': 'Contract End Date',
                'milestone_description': f"Contract {contract_data['contract_number']} expires",
                'due_date': end_date.date().isoformat(),
                'alert_days_before': [90, 60, 30, 14],
                'priority': 'high'
            })
            
            if contract_data.get('option_years', 0) > 0:
                option_decision_date = end_date - timedelta(days=120)
                milestones.append({
                    'milestone_type': 'option_year_decision',
                    'milestone_title': 'Option Year Decision Point',
                    'milestone_description': 'Decision point for exercising option year',
                    'due_date': option_decision_date.date().isoformat(),
                    'alert_days_before': [60, 30, 14, 7],
                    'priority': 'high'
                })
            
            invoicing_frequency = contract_data.get('invoicing_frequency', 'quarterly')
            if invoicing_frequency == 'monthly':
                current_date = start_date
                invoice_num = 1
                while current_date < end_date:
                    invoice_date = current_date + timedelta(days=30)
                    if invoice_date <= end_date:
                        milestones.append({
                            'milestone_type': 'invoicing_deadline',
                            'milestone_title': f'Monthly Invoice #{invoice_num}',
                            'milestone_description': f'Submit monthly invoice for period ending {invoice_date.strftime("%Y-%m-%d")}',
                            'due_date': invoice_date.date().isoformat(),
                            'alert_days_before': [7, 3, 1],
                            'priority': 'high'
                        })
                        invoice_num += 1
                    current_date = invoice_date
                    
            elif invoicing_frequency == 'quarterly':
                current_date = start_date
                quarter_num = 1
                while current_date < end_date:
                    invoice_date = current_date + timedelta(days=90)
                    if invoice_date <= end_date:
                        milestones.append({
                            'milestone_type': 'invoicing_deadline',
                            'milestone_title': f'Q{quarter_num} Invoice Submission',
                            'milestone_description': f'Submit quarterly invoice for Q{quarter_num}',
                            'due_date': invoice_date.date().isoformat(),
                            'alert_days_before': [14, 7, 3],
                            'priority': 'high'
                        })
                        quarter_num += 1
                    current_date = invoice_date
            
            if contract_data.get('has_subcontracting_plan', False):
                sub_plan_date = start_date + timedelta(days=30)
                milestones.append({
                    'milestone_type': 'subcontracting_plan',
                    'milestone_title': 'Subcontracting Plan Submission',
                    'milestone_description': 'Submit subcontracting plan to contracting officer',
                    'due_date': sub_plan_date.date().isoformat(),
                    'alert_days_before': [14, 7, 3],
                    'priority': 'high'
                })
                
                current_date = start_date + timedelta(days=180)
                report_num = 1
                while current_date < end_date:
                    milestones.append({
                        'milestone_type': 'subcontracting_report',
                        'milestone_title': f'ISR/SSR Report #{report_num}',
                        'milestone_description': 'Submit Individual/Summary Subcontracting Report',
                        'due_date': current_date.date().isoformat(),
                        'alert_days_before': [30, 14, 7],
                        'priority': 'high'
                    })
                    current_date += timedelta(days=180)
                    report_num += 1
            
            cpars_date = end_date - timedelta(days=30)
            milestones.append({
                'milestone_type': 'cpars_review',
                'milestone_title': 'CPARS Review Period',
                'milestone_description': 'Contractor Performance Assessment Reporting System review',
                'due_date': cpars_date.date().isoformat(),
                'alert_days_before': [30, 14, 7],
                'priority': 'medium'
            })
            
            renewal_date = end_date - timedelta(days=180)
            milestones.append({
                'milestone_type': 'renewal_opportunity',
                'milestone_title': 'Contract Renewal Opportunity',
                'milestone_description': 'Begin preparing for contract renewal or re-compete',
                'due_date': renewal_date.date().isoformat(),
                'alert_days_before': [90, 60, 30],
                'priority': 'medium'
            })
            
            current_date = start_date + timedelta(days=90)
            quarter_num = 1
            while current_date < end_date:
                milestones.append({
                    'milestone_type': 'performance_review',
                    'milestone_title': f'Q{quarter_num} Performance Review',
                    'milestone_description': f'Quarterly performance review with contracting officer',
                    'due_date': current_date.date().isoformat(),
                    'alert_days_before': [14, 7],
                    'priority': 'medium'
                })
                current_date += timedelta(days=90)
                quarter_num += 1
            
            milestone_count = 0
            for milestone_data in milestones:
                milestone_data['contract_id'] = contract_id
                milestone_data['client_id'] = contract_data['client_id']
                milestone_data['status'] = 'pending'
                milestone_data['created_at'] = datetime.utcnow().isoformat()
                milestone_data['updated_at'] = datetime.utcnow().isoformat()
                
                milestone_id = self._generate_milestone_id(contract_id, milestone_data['milestone_type'])
                
                if self.admin_db:
                    self.admin_db.child('apex_milestones').child(milestone_id).set(milestone_data)
                else:
                    self.db.child('apex_milestones').child(milestone_id).set(milestone_data)
                
                self._generate_alerts_for_milestone(milestone_id, milestone_data)
                
                milestone_count += 1
            
            return milestone_count
            
        except Exception as e:
            logger.error(f"Error generating milestones for contract {contract_id}: {str(e)}")
            return 0
    
    def _generate_alerts_for_milestone(self, milestone_id: str, milestone_data: Dict):
        """Generate alert records for a milestone"""
        try:
            due_date = datetime.fromisoformat(milestone_data['due_date'])
            alert_days = milestone_data.get('alert_days_before', [7])
            
            for days_before in alert_days:
                alert_date = due_date - timedelta(days=days_before)
                
                if alert_date.date() >= datetime.utcnow().date():
                    alert_data = {
                        'milestone_id': milestone_id,
                        'contract_id': milestone_data['contract_id'],
                        'client_id': milestone_data['client_id'],
                        'alert_type': 'milestone_reminder',
                        'alert_title': f"Upcoming: {milestone_data['milestone_title']}",
                        'alert_message': f"{milestone_data['milestone_description']} - Due in {days_before} days ({due_date.strftime('%B %d, %Y')})",
                        'scheduled_date': alert_date.date().isoformat(),
                        'status': 'pending',
                        'priority': milestone_data.get('priority', 'medium'),
                        'delivery_channels': ['email', 'dashboard'],
                        'created_at': datetime.utcnow().isoformat()
                    }
                    
                    alert_id = self._generate_alert_id(milestone_id, days_before)
                    
                    if self.admin_db:
                        self.admin_db.child('apex_alerts').child(alert_id).set(alert_data)
                    else:
                        self.db.child('apex_alerts').child(alert_id).set(alert_data)
                    
        except Exception as e:
            logger.error(f"Error generating alerts for milestone {milestone_id}: {str(e)}")
    
    def get_pending_alerts(self, date: Optional[str] = None) -> List[Dict]:
        """
        Get all pending alerts for a specific date
        
        Args:
            date: Date in ISO format (YYYY-MM-DD). Defaults to today.
            
        Returns:
            List of alert dictionaries
        """
        try:
            if date is None:
                date = datetime.utcnow().date().isoformat()
            
            if self.admin_db:
                alerts = self.admin_db.child('apex_alerts').order_by_child('scheduled_date').equal_to(date).get()
            else:
                alerts = self.db.child('apex_alerts').order_by_child('scheduled_date').equal_to(date).get()
            
            if not alerts or not alerts.val():
                return []
            
            alert_list = []
            for alert_id, alert_data in alerts.val().items():
                if alert_data.get('status') == 'pending':
                    alert_data['alert_id'] = alert_id
                    alert_list.append(alert_data)
            
            return alert_list
            
        except Exception as e:
            logger.error(f"Error getting pending alerts: {str(e)}")
            return []
    
    def mark_alert_sent(self, alert_id: str) -> bool:
        """Mark an alert as sent"""
        try:
            update_data = {
                'status': 'sent',
                'sent_date': datetime.utcnow().isoformat()
            }
            
            if self.admin_db:
                self.admin_db.child('apex_alerts').child(alert_id).update(update_data)
            else:
                self.db.child('apex_alerts').child(alert_id).update(update_data)
            
            return True
        except Exception as e:
            logger.error(f"Error marking alert {alert_id} as sent: {str(e)}")
            return False
    
    def get_client_milestones(self, client_id: str, status: Optional[str] = None) -> List[Dict]:
        """Get all milestones for a client"""
        try:
            if self.admin_db:
                milestones = self.admin_db.child('apex_milestones').order_by_child('client_id').equal_to(client_id).get()
            else:
                milestones = self.db.child('apex_milestones').order_by_child('client_id').equal_to(client_id).get()
            
            if not milestones or not milestones.val():
                return []
            
            milestone_list = []
            for milestone_id, milestone_data in milestones.val().items():
                if status is None or milestone_data.get('status') == status:
                    milestone_data['milestone_id'] = milestone_id
                    milestone_list.append(milestone_data)
            
            milestone_list.sort(key=lambda x: x.get('due_date', ''))
            
            return milestone_list
            
        except Exception as e:
            logger.error(f"Error getting milestones for client {client_id}: {str(e)}")
            return []
    
    def complete_milestone(self, milestone_id: str, notes: Optional[str] = None) -> bool:
        """Mark a milestone as completed"""
        try:
            update_data = {
                'status': 'completed',
                'completed_date': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if notes:
                update_data['notes'] = notes
            
            if self.admin_db:
                self.admin_db.child('apex_milestones').child(milestone_id).update(update_data)
            else:
                self.db.child('apex_milestones').child(milestone_id).update(update_data)
            
            logger.info(f"Completed milestone: {milestone_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error completing milestone {milestone_id}: {str(e)}")
            return False
    
    def _generate_client_id(self, company_name: str) -> str:
        """Generate a unique client ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        name_hash = hashlib.md5(company_name.encode()).hexdigest()[:8]
        return f"client_{name_hash}_{timestamp}"
    
    def _generate_contract_id(self, contract_number: str) -> str:
        """Generate a unique contract ID"""
        contract_hash = hashlib.md5(contract_number.encode()).hexdigest()[:12]
        return f"contract_{contract_hash}"
    
    def _generate_milestone_id(self, contract_id: str, milestone_type: str) -> str:
        """Generate a unique milestone ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        combined = f"{contract_id}_{milestone_type}_{timestamp}"
        milestone_hash = hashlib.md5(combined.encode()).hexdigest()[:12]
        return f"milestone_{milestone_hash}"
    
    def _generate_alert_id(self, milestone_id: str, days_before: int) -> str:
        """Generate a unique alert ID"""
        combined = f"{milestone_id}_{days_before}"
        alert_hash = hashlib.md5(combined.encode()).hexdigest()[:12]
        return f"alert_{alert_hash}"


class ApexMatchingEngine:
    """Engine for matching public contract awards to existing clients"""
    
    def __init__(self, tracker: ApexAwardTracker):
        """
        Initialize the Matching Engine
        
        Args:
            tracker: ApexAwardTracker instance
        """
        self.tracker = tracker
        self.clients = []
        self._load_clients()
    
    def _load_clients(self):
        """Load all clients into memory for matching"""
        self.clients = self.tracker.get_all_clients()
        logger.info(f"Loaded {len(self.clients)} clients for matching")
    
    def match_award_to_client(self, award_data: Dict) -> List[Dict]:
        """
        Match a contract award to existing clients
        
        Args:
            award_data: Dictionary containing award information from SAM.gov/USASpending
            
        Returns:
            List of potential matches with confidence scores
        """
        matches = []
        
        award_uei = award_data.get('recipient_uei', '').strip().upper()
        award_duns = award_data.get('recipient_duns', '').strip()
        award_cage = award_data.get('recipient_cage', '').strip().upper()
        award_name = award_data.get('recipient_name', '').strip()
        
        for client in self.clients:
            match_score = 0
            match_criteria = {}
            
            client_uei = client.get('uei_code', '').strip().upper()
            if award_uei and client_uei and award_uei == client_uei:
                match_score = 100
                match_criteria['uei_match'] = True
                match_criteria['match_type'] = 'exact_uei'
            
            elif award_duns and client.get('duns_number', '').strip() == award_duns:
                match_score = 98
                match_criteria['duns_match'] = True
                match_criteria['match_type'] = 'exact_duns'
            
            elif award_cage and client.get('cage_code', '').strip().upper() == award_cage:
                match_score = 95
                match_criteria['cage_match'] = True
                match_criteria['match_type'] = 'exact_cage'
            
            elif award_name and client.get('company_name'):
                name_similarity = fuzz.token_sort_ratio(
                    award_name.lower(),
                    client['company_name'].lower()
                )
                
                if name_similarity >= 90:
                    match_score = name_similarity
                    match_criteria['name_similarity'] = name_similarity
                    match_criteria['match_type'] = 'fuzzy_name'
            
            if match_score >= 70:
                matches.append({
                    'client_id': client['client_id'],
                    'client_name': client['company_name'],
                    'match_score': match_score,
                    'match_criteria': match_criteria,
                    'client_data': client
                })
        
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        return matches
    
    def create_match_queue_entry(self, award_data: Dict, matches: List[Dict]) -> Tuple[bool, str]:
        """
        Create a match queue entry for staff review
        
        Args:
            award_data: Award information
            matches: List of potential client matches
            
        Returns:
            Tuple of (success, queue_id)
        """
        try:
            queue_id = self._generate_queue_id(award_data.get('contract_number', ''))
            
            queue_data = {
                'contract_data': award_data,
                'potential_matches': matches,
                'status': 'pending_review',
                'data_source': award_data.get('data_source', 'sam_gov_api'),
                'created_at': datetime.utcnow().isoformat(),
                'reviewed_by': None,
                'reviewed_at': None
            }
            
            if matches and matches[0]['match_score'] >= 95:
                queue_data['status'] = 'auto_approved'
                queue_data['auto_approved_at'] = datetime.utcnow().isoformat()
                
                self._auto_create_contract(award_data, matches[0])
            
            if self.tracker.admin_db:
                self.tracker.admin_db.child('apex_match_queue').child(queue_id).set(queue_data)
            else:
                self.tracker.db.child('apex_match_queue').child(queue_id).set(queue_data)
            
            return True, queue_id
            
        except Exception as e:
            logger.error(f"Error creating match queue entry: {str(e)}")
            return False, str(e)
    
    def _auto_create_contract(self, award_data: Dict, match: Dict):
        """Automatically create a contract for high-confidence matches"""
        try:
            contract_data = {
                'client_id': match['client_id'],
                'contract_number': award_data.get('contract_number', ''),
                'contract_title': award_data.get('award_description', 'Government Contract'),
                'awarding_agency': award_data.get('awarding_agency', ''),
                'contract_value': award_data.get('award_amount', 0),
                'award_date': award_data.get('award_date', datetime.utcnow().date().isoformat()),
                'start_date': award_data.get('period_of_performance_start', datetime.utcnow().date().isoformat()),
                'end_date': award_data.get('period_of_performance_end', (datetime.utcnow() + timedelta(days=365)).date().isoformat()),
                'data_source': 'automated_import',
                'match_confidence': match['match_score'],
                'verified_by_staff': False
            }
            
            success, message, contract_id = self.tracker.create_contract(contract_data, auto_generate_milestones=True)
            
            if success:
                logger.info(f"Auto-created contract {contract_id} for client {match['client_id']}")
            else:
                logger.error(f"Failed to auto-create contract: {message}")
                
        except Exception as e:
            logger.error(f"Error auto-creating contract: {str(e)}")
    
    def _generate_queue_id(self, contract_number: str) -> str:
        """Generate a unique queue ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        queue_hash = hashlib.md5(f"{contract_number}_{timestamp}".encode()).hexdigest()[:12]
        return f"queue_{queue_hash}"

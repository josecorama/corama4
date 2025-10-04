"""
Credit Management System for Contract Radar Maximizer
Handles credit deduction, balance checking, and transaction logging
"""

import logging
from datetime import datetime
from functools import wraps
from flask import session, jsonify

class CreditManager:
    def __init__(self, db):
        self.db = db
        
    def get_user_credits(self, user_id, id_token):
        """Get current credit balance for user"""
        try:
            user_data = self.db.child("users").child(user_id).get(id_token).val()
            return user_data.get('credits_balance', 0) if user_data else 0
        except Exception as e:
            logging.error(f"Error getting user credits: {e}")
            return 0
            
    def deduct_credits(self, user_id, id_token, amount, operation_type, description=""):
        """Deduct credits from user balance"""
        try:
            user_ref = self.db.child("users").child(user_id)
            user_data = user_ref.get(id_token).val()
            
            if not user_data:
                return False, "User data not found"
                
            current_balance = user_data.get('credits_balance', 0)
            if current_balance < amount:
                return False, f"Insufficient credits. Required: {amount}, Available: {current_balance}"
                
            new_balance = current_balance - amount
            credits_used = user_data.get('credits_used', 0) + amount
            
            user_ref.update({
                'credits_balance': new_balance,
                'credits_used': credits_used,
                'last_credit_update': datetime.now().isoformat()
            }, id_token)
            
            transaction_ref = self.db.child("credit_transactions").child(user_id)
            transaction_ref.push({
                'amount': -amount,
                'operation_type': operation_type,
                'description': description,
                'timestamp': datetime.now().isoformat(),
                'balance_after': new_balance
            }, id_token)
            
            return True, f"Credits deducted successfully. New balance: {new_balance}"
            
        except Exception as e:
            logging.error(f"Error deducting credits: {e}")
            return False, str(e)
            
    def add_credits(self, user_id, id_token, amount, source="purchase"):
        """Add credits to user balance"""
        try:
            user_ref = self.db.child("users").child(user_id)
            user_data = user_ref.get(id_token).val()
            
            current_balance = user_data.get('credits_balance', 0)
            new_balance = current_balance + amount
            
            user_ref.update({
                'credits_balance': new_balance,
                'last_credit_update': datetime.now().isoformat()
            }, id_token)
            
            transaction_ref = self.db.child("credit_transactions").child(user_id)
            transaction_ref.push({
                'amount': amount,
                'operation_type': source,
                'description': f"Credits added via {source}",
                'timestamp': datetime.now().isoformat(),
                'balance_after': new_balance
            }, id_token)
            
            return True, new_balance
            
        except Exception as e:
            logging.error(f"Error adding credits: {e}")
            return False, 0
    
    def add_credits_admin(self, user_id, amount, source="purchase", admin_db=None):
        """
        Add credits to user balance using Firebase Admin SDK (preferred) or REST API fallback.
        This is designed for server-side operations like Stripe webhooks.
        
        Args:
            user_id: Firebase user ID
            amount: Number of credits to add
            source: Source of credits (e.g., "stripe_purchase", "manual_grant")
            admin_db: Firebase Admin SDK database reference (if available)
        """
        try:
            if admin_db:
                logging.info(f"Using Firebase Admin SDK to add {amount} credits to user {user_id}")
                
                user_ref = admin_db.reference(f'users/{user_id}')
                user_data = user_ref.get()
                
                if not user_data:
                    logging.error(f"User {user_id} not found in database")
                    return False, 0
                
                current_balance = user_data.get('credits_balance', 0)
                new_balance = current_balance + amount
                
                user_ref.update({
                    'credits_balance': new_balance,
                    'last_credit_update': datetime.now().isoformat()
                })
                
                transaction_ref = admin_db.reference(f'credit_transactions/{user_id}')
                transaction_ref.push({
                    'amount': amount,
                    'operation_type': source,
                    'description': f"Credits added via {source}",
                    'timestamp': datetime.now().isoformat(),
                    'balance_after': new_balance
                })
                
                logging.info(f"✅ Admin SDK: Added {amount} credits to user {user_id}, new balance: {new_balance}")
                return True, new_balance
            
            logging.warning("⚠️ Falling back to REST API for credit addition (Admin SDK not available)")
            import os
            import requests
            
            database_url = os.getenv('DATABASE_URL')
            api_key = os.getenv('FIREBASE_API_KEY')
            
            if not database_url or not api_key:
                logging.error("Firebase credentials not found for admin operation")
                return False, 0
            
            user_url = f"{database_url}/users/{user_id}.json?auth={api_key}"
            response = requests.get(user_url)
            
            if response.status_code != 200:
                logging.error(f"Failed to fetch user data: {response.status_code}")
                return False, 0
            
            user_data = response.json()
            if not user_data:
                logging.error(f"User {user_id} not found")
                return False, 0
            
            current_balance = user_data.get('credits_balance', 0)
            new_balance = current_balance + amount
            
            update_data = {
                'credits_balance': new_balance,
                'last_credit_update': datetime.now().isoformat()
            }
            update_response = requests.patch(user_url, json=update_data)
            
            if update_response.status_code != 200:
                logging.error(f"Failed to update credits: {update_response.status_code}")
                return False, 0
            
            transaction_url = f"{database_url}/credit_transactions/{user_id}.json?auth={api_key}"
            transaction_data = {
                'amount': amount,
                'operation_type': source,
                'description': f"Credits added via {source}",
                'timestamp': datetime.now().isoformat(),
                'balance_after': new_balance
            }
            requests.post(transaction_url, json=transaction_data)
            
            logging.info(f"REST API: Added {amount} credits to user {user_id}, new balance: {new_balance}")
            return True, new_balance
            
        except Exception as e:
            logging.error(f"Error in admin credit addition: {e}")
            return False, 0

def require_credits(cost, operation_type):
    """Decorator to require credits for AI operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if 'user' not in session:
                return jsonify({"error": "User not authenticated"}), 401
                
            user = session['user']
            user_id = user['localId']
            id_token = user['idToken']
            
            from app import db  # Import db from app module
            credit_manager = CreditManager(db)
            success, message = credit_manager.deduct_credits(
                user_id, id_token, cost, operation_type, func.__name__
            )
            
            if not success:
                return jsonify({"error": message, "credits_required": cost}), 402
                
            return func(*args, **kwargs)
        return wrapper
    return decorator

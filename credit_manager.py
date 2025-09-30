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

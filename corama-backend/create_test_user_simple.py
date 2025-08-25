#!/usr/bin/env python3
"""Simple synchronous script to create test user with credits"""

import sqlite3
import os
from datetime import datetime

def create_test_user():
    """Create test user with credits using synchronous SQLite"""
    db_path = "corama_dev.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found. Run init_db_simple.py first.")
        return
    
    conn = sqlite3.connect(db_path)
    try:
        email = "aertodriguez0110@gmail.com"
        password = "Adreliaz18@fenix"
        user_id = f"user_{email.replace('@', '_').replace('.', '_')}"
        
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"User {email} already exists with ID: {existing_user[0]}")
            user_id = existing_user[0]
        else:
            conn.execute(
                "INSERT INTO users (id, email, name, company) VALUES (?, ?, ?, ?)",
                (user_id, email, "Dev Test User", "Test Company")
            )
            print(f"Created new user {email} with ID: {user_id}")
        
        cursor = conn.execute(
            "SELECT COALESCE(SUM(delta), 0) as balance FROM credits_ledger WHERE user_id = ?",
            (user_id,)
        )
        current_balance = cursor.fetchone()[0]
        print(f"Current credit balance: {current_balance}")
        
        if current_balance < 1000:
            needed_credits = 1000 - current_balance
            conn.execute(
                "INSERT INTO credits_ledger (user_id, delta, reason, source) VALUES (?, ?, ?, ?)",
                (user_id, needed_credits, "dev_seed", "manual_grant")
            )
            print(f"Added {needed_credits} credits")
        else:
            print("User already has sufficient credits")
        
        conn.commit()
        
        cursor = conn.execute(
            "SELECT COALESCE(SUM(delta), 0) as balance FROM credits_ledger WHERE user_id = ?",
            (user_id,)
        )
        final_balance = cursor.fetchone()[0]
        print(f"✅ Final credit balance for {email}: {final_balance}")
        print(f"✅ User setup complete. User ID: {user_id}")
        print(f"✅ Password: {password}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_user()

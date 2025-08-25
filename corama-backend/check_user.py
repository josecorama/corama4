#!/usr/bin/env python3
"""Check test user and credits in database"""

import sqlite3
import os

def check_user():
    """Check if test user exists and their credit balance"""
    db_path = "corama_dev.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found")
        return
    
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute("SELECT * FROM users WHERE email = ?", ("aertodriguez0110@gmail.com",))
        user = cursor.fetchone()
        
        if user:
            print(f"✅ User found: {user}")
            user_id = user[0]
            
            cursor = conn.execute(
                "SELECT * FROM credits_ledger WHERE user_id = ? ORDER BY created_at",
                (user_id,)
            )
            ledger_entries = cursor.fetchall()
            
            print(f"📊 Ledger entries ({len(ledger_entries)}):")
            total_credits = 0
            for entry in ledger_entries:
                print(f"  - ID: {entry[0]}, Delta: {entry[2]}, Reason: {entry[4]}, Source: {entry[5]}")
                total_credits += entry[2]
            
            print(f"💰 Total credits: {total_credits}")
        else:
            print("❌ User not found")
            
            cursor = conn.execute("SELECT * FROM users")
            all_users = cursor.fetchall()
            print(f"📋 All users in database ({len(all_users)}):")
            for u in all_users:
                print(f"  - {u}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    check_user()

#!/usr/bin/env python3
"""
Idempotent script to create/update dev test user with credits
Usage: python upsert_test_user_and_credits.py --email EMAIL --password PASSWORD --credits AMOUNT
"""

import asyncio
import argparse
import os
import sys
from datetime import datetime, date

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'corama-backend'))

import sqlite3
import aiosqlite

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./corama_dev.db")

async def get_db_connection():
    db_path = DATABASE_URL.replace("sqlite:///", "")
    backend_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'corama-backend')
    db_path = os.path.join(backend_dir, "corama_dev.db")
    return await aiosqlite.connect(db_path)

async def add_credits_to_ledger(
    user_id: str, 
    delta: int, 
    reason: str, 
    source: str, 
    stripe_session_id: str = None
):
    """Add credits to user's ledger"""
    conn = await get_db_connection()
    try:
        await conn.execute(
            """INSERT INTO credits_ledger (user_id, delta, reason, source, stripe_session_id) 
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, delta, reason, source, stripe_session_id)
        )
        await conn.commit()
    finally:
        await conn.close()

async def get_user_credits(user_id: str) -> int:
    """Get user's current credit balance from ledger"""
    conn = await get_db_connection()
    try:
        cursor = await conn.execute(
            "SELECT COALESCE(SUM(delta), 0) as balance FROM credits_ledger WHERE user_id = ?",
            (user_id,)
        )
        row = await cursor.fetchone()
        return row[0] if row else 0
    finally:
        await conn.close()

async def upsert_user_and_credits(email: str, password: str, credits: int, reason: str = "dev_seed"):
    """Create or update user with specified credits"""
    
    user_id = f"user_{email.replace('@', '_').replace('.', '_')}"
    
    conn = await get_db_connection()
    try:
        cursor = await conn.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing_user = await cursor.fetchone()
        
        if existing_user:
            print(f"User {email} already exists with ID: {existing_user[0]}")
            user_id = existing_user[0]
        else:
            await conn.execute(
                "INSERT INTO users (id, email, name, company) VALUES (?, ?, ?, ?)",
                (user_id, email, "Dev Test User", "Test Company")
            )
            print(f"Created new user {email} with ID: {user_id}")
        
        today = date.today()
        cursor = await conn.execute(
            """SELECT SUM(delta) as total FROM credits_ledger 
               WHERE user_id = ? AND reason = ? AND DATE(created_at) = ?""",
            (user_id, reason, today)
        )
        existing_credits = await cursor.fetchone()
        
        if existing_credits and existing_credits[0]:
            print(f"Dev seed credits already granted today: {existing_credits[0]}")
            needed_credits = credits - existing_credits[0]
            if needed_credits != 0:
                await add_credits_to_ledger(user_id, needed_credits, f"{reason}_adjustment", "manual_grant")
                print(f"Adjusted credits by {needed_credits} to reach target of {credits}")
        else:
            await add_credits_to_ledger(user_id, credits, reason, "manual_grant")
            print(f"Granted {credits} credits to user {email}")
        
        await conn.commit()
        
        balance = await get_user_credits(user_id)
        print(f"Final credit balance for {email}: {balance}")
        
        return user_id
        
    finally:
        await conn.close()

async def main():
    parser = argparse.ArgumentParser(description="Create dev test user with credits")
    parser.add_argument("--email", required=True, help="User email")
    parser.add_argument("--password", required=True, help="User password (for reference)")
    parser.add_argument("--credits", type=int, default=1000, help="Credits to grant")
    parser.add_argument("--reason", default="dev_seed", help="Reason for credit grant")
    
    args = parser.parse_args()
    
    print(f"Creating/updating user: {args.email}")
    print(f"Password (for reference): {args.password}")
    print(f"Credits: {args.credits}")
    
    user_id = await upsert_user_and_credits(args.email, args.password, args.credits, args.reason)
    print(f"✅ User setup complete. User ID: {user_id}")

if __name__ == "__main__":
    asyncio.run(main())

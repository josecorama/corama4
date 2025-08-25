#!/usr/bin/env python3
"""Simple database initialization script"""

import asyncio
import sqlite3
import os

def init_database_sync():
    """Initialize database tables synchronously"""
    db_path = "corama_dev.db"
    
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                company TEXT,
                subscription_tier TEXT DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS credits_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id),
                delta INTEGER NOT NULL,
                currency TEXT DEFAULT 'USD',
                reason TEXT NOT NULL,
                source TEXT NOT NULL,
                stripe_session_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        print("✅ Database initialized successfully!")
        
    finally:
        conn.close()

if __name__ == "__main__":
    init_database_sync()

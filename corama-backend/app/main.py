from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import sqlite3
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, date
import json

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./corama_dev.db")

async def get_db_connection():
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(__file__), "..", db_path)
    db_path = os.path.abspath(db_path)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return await aiosqlite.connect(db_path)

async def init_database():
    """Initialize database tables"""
    conn = await get_db_connection()
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                company TEXT,
                subscription_tier TEXT DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await conn.execute("""
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
        
        await conn.commit()
        print("✅ Database initialized successfully!")
        
    finally:
        await conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_database()
    yield

app = FastAPI(
    title="Corama API (Minimal)", 
    description="Lightweight AI-Powered Capability Statement & Contract Matching Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

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

async def get_or_create_user(user_id: str, email: str = None, name: str = None, company: str = None):
    """Get existing user or create new one"""
    conn = await get_db_connection()
    try:
        cursor = await conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        
        if not user and email and name:
            await conn.execute(
                "INSERT INTO users (id, email, name, company) VALUES (?, ?, ?, ?)",
                (user_id, email, name, company)
            )
            await conn.commit()
            
            cursor = await conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = await cursor.fetchone()
        
        if user:
            credits = await get_user_credits(user_id)
            user_dict = {
                'id': user[0],
                'email': user[1], 
                'name': user[2],
                'company': user[3],
                'subscription_tier': user[4],
                'created_at': user[5],
                'credits': credits
            }
            return user_dict
        
        return None
    finally:
        await conn.close()

class User(BaseModel):
    id: str
    email: str
    name: str
    company: Optional[str] = None
    subscription_tier: str = "free"
    credits: int = 0

class CapabilityStatement(BaseModel):
    company_name: str
    description: str
    core_competencies: List[str]
    past_performance: List[str]
    certifications: List[str]

@app.get("/healthz")
async def healthz():
    return {"status": "healthy", "service": "corama-minimal"}

@app.get("/user/profile")
async def get_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    user = await get_or_create_user(
        user_id=user_id,
        email="aertodriguez0110@gmail.com" if "aertodriguez0110_gmail_com" in user_id else "test@example.com",
        name="Dev Test User",
        company="Test Company"
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@app.post("/api/dev/grant-credits")
async def grant_credits_dev(request: dict, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dev-only endpoint to grant credits"""
    if os.getenv("NODE_ENV") != "development" and not os.getenv("IS_DEV_ADMIN"):
        raise HTTPException(status_code=403, detail="Dev endpoint not available in production")
    
    email = request.get("email")
    amount = request.get("amount")
    reason = request.get("reason", "dev_grant")
    
    if not email or amount is None:
        raise HTTPException(status_code=400, detail="Email and amount required")
    
    conn = await get_db_connection()
    try:
        cursor = await conn.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = await cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await add_credits_to_ledger(user[0], amount, reason, "dev_endpoint")
        
        credits = await get_user_credits(user[0])
        
        return {
            "success": True,
            "user_email": email,
            "credits_granted": amount,
            "new_balance": credits
        }
    finally:
        await conn.close()

@app.post("/generate-capability-statement")
async def generate_capability_statement_minimal(
    request: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Minimal capability statement generation (mock response)"""
    token = credentials.credentials
    user_id = token.replace("mock_token_", "")
    
    user = await get_or_create_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_credits = await get_user_credits(user_id)
    if current_credits < 5:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    
    await add_credits_to_ledger(user_id, -5, "capability_statement_generation", "ai_service")
    
    return {
        "content": f"""CAPABILITY STATEMENT - {request.get('company_name', 'Your Company')}

EXECUTIVE SUMMARY
{request.get('company_name', 'Your Company')} is a leading provider of professional services with extensive experience in government contracting.

CORE COMPETENCIES
• Professional service delivery
• Government contracting expertise  
• Quality assurance and compliance
• Project management

PAST PERFORMANCE
• Successfully completed multiple government contracts
• Proven track record of on-time delivery
• Strong client satisfaction ratings

CERTIFICATIONS & QUALIFICATIONS
• DUNS: {request.get('duns_number', 'N/A')}
• CAGE Code: {request.get('cage_code', 'N/A')}
• NAICS Codes: {', '.join(request.get('naics_codes', []))}

This is a minimal version for testing the credits system.""",
        "credits_used": 5,
        "remaining_credits": current_credits - 5
    }

@app.get("/")
async def root():
    return {
        "message": "Corama Minimal API - Credits System Test",
        "version": "1.0.0",
        "endpoints": [
            "/healthz",
            "/user/profile", 
            "/api/dev/grant-credits",
            "/generate-capability-statement"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

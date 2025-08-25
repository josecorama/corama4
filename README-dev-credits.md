# Dev Credits System - Quick Start Guide

## Overview
The Corama platform now includes a comprehensive credits ledger system for tracking user credit balances and transactions. This guide covers setting up the dev test user with 1,000 credits.

## Quick Setup

### 1. Create Test User with 1,000 Credits
```bash
cd /home/ubuntu/corama3
python scripts/dev/upsert_test_user_and_credits.py \
  --email aertodriguez0110@gmail.com \
  --password "Adreliaz18@fenix" \
  --credits 1000
```

### 2. Verify User Creation
```bash
cd /home/ubuntu/corama3/corama-backend
python check_user.py
```

### 3. Start Backend Server
```bash
cd /home/ubuntu/corama3/corama-backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test Login
- Email: `aertodriguez0110@gmail.com`
- Password: `Adreliaz18@fenix`
- Expected credits: 1,000

## Dev Endpoint Usage

### Grant Additional Credits
```bash
curl -X POST "http://localhost:8000/api/dev/grant-credits" \
  -H "Authorization: Bearer mock_token_user_aertodriguez0110_gmail_com" \
  -H "Content-Type: application/json" \
  -d '{"email": "aertodriguez0110@gmail.com", "amount": 500, "reason": "dev_testing"}'
```

### Revoke Credits (Cleanup)
```bash
curl -X POST "http://localhost:8000/api/dev/grant-credits" \
  -H "Authorization: Bearer mock_token_user_aertodriguez0110_gmail_com" \
  -H "Content-Type: application/json" \
  -d '{"email": "aertodriguez0110@gmail.com", "amount": -1000, "reason": "dev_cleanup"}'
```

## Credit Costs
- Capability Statement Generation: 5 credits
- Contract Analysis: 2 credits
- Multi-page Document Generation: 10 credits
- Bid Response Generation: 10 credits

## Database Schema
- **users**: id, email, name, company, subscription_tier, created_at
- **credits_ledger**: id, user_id, delta, currency, reason, source, stripe_session_id, created_at

## Environment Variables Required
```bash
NODE_ENV=development
IS_DEV_ADMIN=true
DATABASE_URL=sqlite:///./corama_dev.db
```

## Stripe Test Mode Integration
The system includes webhook handlers for Stripe test mode purchases. When a `checkout.session.completed` event is received, credits are automatically added to the user's ledger based on the session metadata.

## Safety Features
- Idempotent script execution (safe to re-run)
- Dev endpoint protected by environment checks
- Credits tracked via ledger entries (not direct balance manipulation)
- Proper transaction history for auditing

## Verification Checklist
✅ Test user created with correct email and password  
✅ 1,000 credits granted through ledger system  
✅ AI features properly deduct credits  
✅ Entering forms/pages does NOT deduct credits  
✅ Dev endpoint functional for credit management  
✅ Stripe webhook handler implemented  
✅ Database schema properly implemented  

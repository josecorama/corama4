# Dev Credits System

## Overview
The Corama platform uses a credits ledger system to track user credit balances and transactions.

## Database Schema

### Users Table
- `id`: Primary key (TEXT)
- `email`: Unique email address
- `name`: User's full name
- `company`: Company name (optional)
- `subscription_tier`: Subscription level (default: 'free')
- `created_at`: Account creation timestamp

### Credits Ledger Table
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users table
- `delta`: Credit change (positive for additions, negative for deductions)
- `currency`: Currency code (default: 'USD')
- `reason`: Human-readable reason for the transaction
- `source`: System source of the transaction
- `stripe_session_id`: Stripe session ID (for purchases)
- `created_at`: Transaction timestamp

## Dev User Setup

### Create Test User with 1000 Credits
```bash
cd /home/ubuntu/corama3
python scripts/dev/upsert_test_user_and_credits.py \
  --email aertodriguez0110@gmail.com \
  --password "Adreliaz18@fenix" \
  --credits 1000
```

### Grant Additional Credits
```bash
curl -X POST http://localhost:8000/api/dev/grant-credits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock_token_user_aertodriguez0110_gmail_com" \
  -d '{"email": "aertodriguez0110@gmail.com", "amount": 500, "reason": "dev_testing"}'
```

### Revoke Credits (Cleanup)
```bash
python scripts/dev/upsert_test_user_and_credits.py \
  --email aertodriguez0110@gmail.com \
  --password "Adreliaz18@fenix" \
  --credits -1000 \
  --reason dev_cleanup
```

## Credit Costs

- Capability Statement Generation: 5 credits
- Contract Analysis: 2 credits
- Multi-page Capability Statement: 10 credits
- Bid Response Generation: 10 credits

## Stripe Integration

The system supports Stripe webhook integration for automatic credit granting:

1. Set up Stripe webhook endpoint: `/stripe/webhook`
2. Configure webhook to listen for `checkout.session.completed` events
3. Include credits amount in session metadata: `{"credits": "100"}`
4. Credits are automatically added to user's ledger upon successful payment

## Environment Variables

```bash
# Development Settings
NODE_ENV=development
IS_DEV_ADMIN=true

# Database
DATABASE_URL=sqlite:///./corama_dev.db

# Stripe (Test Mode)
STRIPE_API_KEY=sk_test_...
STRIPE_API_WEBHOOK_KEY=whsec_...
```

## Testing

1. Start the backend server:
   ```bash
   cd /home/ubuntu/corama3/corama-backend && python -m uvicorn app.main:app --reload
   ```

2. Create test user:
   ```bash
   python scripts/dev/upsert_test_user_and_credits.py \
     --email aertodriguez0110@gmail.com \
     --password "Adreliaz18@fenix" \
     --credits 1000
   ```

3. Test login with mock token: `mock_token_user_aertodriguez0110_gmail_com`

4. Verify credit balance and deductions work correctly in the frontend.

# Corama Backend

AI-Powered Capability Statement & Contract Matching Platform Backend

## Deployment to Render

This backend is configured to deploy to Render using the `render.yaml` configuration.

### Required Environment Variables

Set these in your Render dashboard:

- `OPENAI_API_KEY` - OpenAI API key for AI features
- `QDRANT_URL` - Qdrant vector database URL
- `QDRANT_API_KEY` - Qdrant API key
- `SENDGRID_API_KEY` - SendGrid API key for welcome emails
- `FIREBASE_CREDENTIALS` - Firebase service account JSON (as string)
- `STRIPE_SECRET_KEY` - Stripe secret key for payments

### Features

- User authentication with Google OAuth
- AI-powered capability statement generation
- Contract search and matching
- Welcome email system
- Credit-based payment system
- Multi-page document generation

### API Documentation

Once deployed, visit `/docs` for interactive API documentation.
# Updated Wed Aug 20 15:36:17 UTC 2025

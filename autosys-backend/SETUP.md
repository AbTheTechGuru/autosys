# AutoSys Backend — Setup Guide

## Prerequisites
- Node.js ≥ 20
- Supabase project (free tier works)
- Redis (optional in dev — falls back to in-memory)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ANTHROPIC_API_KEY, PAYSTACK_SECRET_KEY

# 3. Run database migrations
# Open Supabase Dashboard → SQL Editor → paste contents of:
# supabase/migrations/001_initial_schema.sql
# Click "Run"

# 4. Start dev server
npm run dev
# Runs on http://localhost:3001
# Hot reloads with --watch flag
```

## Production Deployment

```bash
# Set NODE_ENV=production in your hosting environment
# Ensure REDIS_URL is set (in-memory store is not suitable for production)
npm start
```

## Security Checklist Before Going Live

- [ ] `JWT_SECRET` is ≥ 64 random characters (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT exposed to frontend
- [ ] `ANTHROPIC_API_KEY` is NOT exposed to frontend
- [ ] `PAYSTACK_WEBHOOK_SECRET` is set and HMAC verification is active
- [ ] `REDIS_URL` points to a real Redis instance
- [ ] `CORS_ORIGIN` is set to your actual frontend domain
- [ ] `NODE_ENV=production`

## Key Design Decisions

- **Prices in kobo**: All monetary values stored as integers in kobo (₦1 = 100 kobo) to avoid floating-point issues. Divide by 100 for display.
- **RLS**: Row Level Security enabled on all tenant tables as defence-in-depth. Backend uses service-role key which bypasses it, but enforces `dealer_id` scoping in every query.
- **Refresh token rotation**: Each refresh token is one-time-use. Reuse detection logs out all sessions.
- **AI rate limiting**: 30 calls/hour per dealer (configurable). Cost is controlled server-side.

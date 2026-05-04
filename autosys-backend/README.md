# AutoSys Dealer OS — Backend Documentation

> Production-ready Node.js + Express + Supabase backend for the AutoSys multi-tenant SaaS platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Database Schema (Supabase)](#database-schema)
6. [Authentication & Multi-tenancy](#authentication--multi-tenancy)
7. [API Reference](#api-reference)
8. [Security Architecture](#security-architecture)
9. [Payment Integration](#payment-integration)
10. [AI Features](#ai-features)
11. [Deployment Guide](#deployment-guide)
12. [Development Workflow](#development-workflow)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AutoSys SaaS Platform                     │
├──────────────────┬──────────────────┬───────────────────────┤
│   React Frontend │   Node/Express   │     Supabase           │
│   (Vercel/CDN)   │   REST API       │  PostgreSQL + Auth      │
│                  │   (Railway/EC2)  │  + Storage + Realtime  │
├──────────────────┴──────────────────┴───────────────────────┤
│              External Services                               │
│  Paystack  │  Flutterwave  │  Claude AI  │  WhatsApp API    │
└─────────────────────────────────────────────────────────────┘
```

### Multi-tenancy Model

- **Tenant = Dealership**: every row in every table has a `dealer_id`
- **Row Level Security (RLS)**: Supabase enforces tenant isolation at the DB level
- **JWT**: Contains `dealer_id` claim; all API routes validate it
- **Shared infrastructure, isolated data**: one database, many tenants

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 LTS | Backend runtime |
| Framework | Express 5 | HTTP server |
| Database | PostgreSQL via Supabase | Primary data store |
| Auth | Supabase Auth + JWT | Authentication |
| Storage | Supabase Storage | Vehicle images, documents |
| Realtime | Supabase Realtime | Live notifications |
| Payments | Paystack + Flutterwave | Nigerian payment processing |
| AI | Anthropic Claude API | Descriptions, pricing, follow-ups |
| Validation | Zod | Runtime type safety |
| Rate Limiting | express-rate-limit | API abuse prevention |
| Logging | Pino | Structured JSON logging |
| Cache | Redis (Upstash) | Session cache, rate limit store |
| Queue | BullMQ | Async jobs (emails, webhooks) |
| Email | Resend | Transactional emails |
| Deployment | Railway / Render | Node.js hosting |

---

## Project Structure

```
autosys-backend/
├── src/
│   ├── config/
│   │   ├── supabase.js          # Supabase client (service role)
│   │   ├── redis.js             # Redis/Upstash client
│   │   └── index.js             # All config exports
│   ├── middleware/
│   │   ├── auth.js              # JWT verification + dealer context
│   │   ├── rateLimit.js         # Per-route rate limiting
│   │   ├── validate.js          # Zod schema validation
│   │   ├── security.js          # Helmet, CORS, XSS
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── auth.js              # POST /auth/login, /auth/signup
│   │   ├── vehicles.js          # CRUD /vehicles
│   │   ├── leads.js             # CRUD /leads
│   │   ├── deals.js             # CRUD /deals (pipeline)
│   │   ├── payments.js          # Payment intent + webhook
│   │   ├── websites.js          # Website builder state
│   │   ├── team.js              # Team members + roles
│   │   ├── analytics.js         # Dashboard KPIs
│   │   └── ai.js                # AI generation endpoints
│   ├── services/
│   │   ├── payment.service.js   # Payment orchestration
│   │   ├── paystack.service.js  # Paystack API calls
│   │   ├── flutterwave.service.js # Flutterwave API calls
│   │   ├── webhook.handler.js   # Payment webhook verification
│   │   ├── ai.service.js        # Claude API calls
│   │   ├── email.service.js     # Resend email sending
│   │   └── storage.service.js   # Supabase Storage helpers
│   ├── controllers/
│   │   ├── vehicles.controller.js
│   │   ├── leads.controller.js
│   │   ├── payments.controller.js
│   │   └── ai.controller.js
│   └── utils/
│       ├── errors.js            # Custom error classes
│       ├── pagination.js        # Cursor-based pagination
│       └── crypto.js            # Hash / verify helpers
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_payments.sql
│   │   └── 004_websites.sql
│   └── seeds/
│       └── demo_dealer.sql
├── docs/
│   ├── api.md                   # Full API reference
│   └── security.md              # Security checklist
├── .env.example
├── package.json
└── server.js                    # Entry point
```

---

## Environment Setup

### Prerequisites

```bash
node >= 20.0.0
npm >= 10.0.0
```

### Installation

```bash
git clone https://github.com/your-org/autosys-backend
cd autosys-backend
npm install
cp .env.example .env
# Fill in all values in .env
npm run db:migrate    # Run Supabase migrations
npm run db:seed       # Seed demo data (dev only)
npm run dev           # Start with hot reload
```

### Environment Variables (.env.example)

```env
# ── Server ─────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
API_VERSION=v1
CORS_ORIGIN=http://localhost:5173,https://app.autosys.ng

# ── Supabase ────────────────────────────────────────────────
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER expose to frontend

# ── JWT ─────────────────────────────────────────────────────
JWT_SECRET=minimum-32-chars-random-secret-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# ── Payments ────────────────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxx

FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
FLUTTERWAVE_WEBHOOK_SECRET=xxxxx

# ── AI ──────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxx

# ── Email ───────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=notifications@autosys.ng

# ── Redis (Upstash) ─────────────────────────────────────────
REDIS_URL=redis://default:xxxxx@us1-xxxx.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# ── WhatsApp ────────────────────────────────────────────────
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_ID=xxxxx
WHATSAPP_VERIFY_TOKEN=xxxxx  # Your custom webhook verify token

# ── Storage ─────────────────────────────────────────────────
SUPABASE_STORAGE_BUCKET=vehicle-images
MAX_FILE_SIZE_MB=10
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# ── Feature Flags ───────────────────────────────────────────
ENABLE_AI_FEATURES=true
ENABLE_WHATSAPP=true
MAINTENANCE_MODE=false
```

---

## Database Schema

### Core Tables (Supabase PostgreSQL)

```sql
-- ═══════════════════════════════════════════
-- 001_initial_schema.sql
-- ═══════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive search

-- ─── Dealers (Tenants) ───────────────────────────────────────
CREATE TABLE dealers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  whatsapp      TEXT,
  address       TEXT,
  city          TEXT DEFAULT 'Lagos',
  country       TEXT DEFAULT 'Nigeria',
  subdomain     TEXT UNIQUE NOT NULL,  -- e.g. "dangote-motors"
  custom_domain TEXT UNIQUE,
  logo_url      TEXT,
  plan          TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free','pro','premium')),
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at   TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  is_active     BOOLEAN DEFAULT true,
  settings      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── Users (within a dealer) ────────────────────────────────
CREATE TABLE dealer_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id   UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL,  -- Supabase auth.users.id
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sales_agent'
                CHECK (role IN ('owner','admin','sales_agent','viewer')),
  is_active   BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dealer_id, email)
);

-- ─── Vehicles ────────────────────────────────────────────────
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2030),
  price           BIGINT NOT NULL CHECK (price >= 0),  -- in kobo
  mileage         INTEGER CHECK (mileage >= 0),
  fuel_type       TEXT CHECK (fuel_type IN ('Petrol','Diesel','Hybrid','Electric','CNG')),
  transmission    TEXT CHECK (transmission IN ('Automatic','Manual','CVT')),
  condition       TEXT CHECK (condition IN ('New','Used','Foreign Used')),
  color           TEXT,
  description     TEXT,
  features        TEXT[],
  status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','reserved','sold','draft')),
  vin             TEXT,
  images          TEXT[],  -- Array of Supabase Storage URLs
  thumbnail_url   TEXT,
  views           INTEGER DEFAULT 0,
  inquiries       INTEGER DEFAULT 0,
  ai_description  TEXT,    -- Claude-generated description
  suggested_price BIGINT,  -- AI suggested price in kobo
  seo_slug        TEXT UNIQUE,
  meta_title      TEXT,
  meta_description TEXT,
  listed_at       TIMESTAMPTZ DEFAULT now(),
  sold_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vehicles_dealer ON vehicles(dealer_id);
CREATE INDEX idx_vehicles_status ON vehicles(dealer_id, status);
CREATE INDEX idx_vehicles_search ON vehicles USING gin(
  to_tsvector('english', title || ' ' || brand || ' ' || model)
);

-- ─── Leads ───────────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES dealer_users(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  whatsapp        TEXT,
  source          TEXT DEFAULT 'website'
                    CHECK (source IN ('website','whatsapp','instagram','facebook','referral','walk_in','phone','other')),
  stage           TEXT NOT NULL DEFAULT 'new'
                    CHECK (stage IN ('new','contacted','qualified','negotiation','closed_won','closed_lost')),
  score           INTEGER DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  budget          BIGINT,  -- in kobo
  notes           TEXT,
  vehicle_interest TEXT,   -- Free-text if no vehicle_id
  follow_up_at    TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  tags            TEXT[],
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_dealer ON leads(dealer_id);
CREATE INDEX idx_leads_stage ON leads(dealer_id, stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_followup ON leads(dealer_id, follow_up_at) WHERE follow_up_at IS NOT NULL;

-- ─── Lead Timeline ───────────────────────────────────────────
CREATE TABLE lead_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  dealer_id   UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES dealer_users(id),
  action      TEXT NOT NULL,  -- 'note', 'call', 'whatsapp', 'email', 'stage_change'
  content     TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_timeline_lead ON lead_timeline(lead_id);

-- ─── Deals (Pipeline) ────────────────────────────────────────
CREATE TABLE deals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES dealer_users(id),
  title           TEXT NOT NULL,
  value           BIGINT NOT NULL,  -- in kobo
  stage           TEXT NOT NULL DEFAULT 'lead'
                    CHECK (stage IN ('lead','negotiation','payment','delivered','lost')),
  probability     INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  commission_rate DECIMAL(5,2) DEFAULT 2.00,  -- %
  commission_amount BIGINT,  -- computed: value * commission_rate / 100
  expected_close_date DATE,
  closed_at       TIMESTAMPTZ,
  notes           TEXT,
  tags            TEXT[],
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_dealer ON deals(dealer_id);
CREATE INDEX idx_deals_stage ON deals(dealer_id, stage);
CREATE INDEX idx_deals_assigned ON deals(assigned_to);

-- ─── Payments ────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_name   TEXT,
  customer_email  TEXT,
  reference       TEXT UNIQUE NOT NULL,  -- e.g. "AUTO-1234567890"
  gateway         TEXT NOT NULL CHECK (gateway IN ('paystack','flutterwave')),
  gateway_ref     TEXT,  -- Gateway's own reference
  amount          BIGINT NOT NULL,  -- in kobo/smallest currency unit
  currency        TEXT NOT NULL DEFAULT 'NGN',
  payment_method  TEXT CHECK (payment_method IN ('card','bank_transfer','ussd','mobile_money','qr')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','success','failed','refunded','cancelled')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  webhook_data    JSONB,
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_dealer ON payments(dealer_id);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_status ON payments(dealer_id, status);
CREATE INDEX idx_payments_gateway_ref ON payments(gateway_ref) WHERE gateway_ref IS NOT NULL;

-- ─── Subscriptions ───────────────────────────────────────────
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('free','pro','premium')),
  billing_cycle   TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  amount          BIGINT NOT NULL,
  currency        TEXT DEFAULT 'NGN',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  gateway         TEXT,
  gateway_sub_id  TEXT,  -- Paystack plan code, etc.
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Websites ────────────────────────────────────────────────
CREATE TABLE websites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id   UUID NOT NULL UNIQUE REFERENCES dealers(id) ON DELETE CASCADE,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Full page builder state
  theme       JSONB DEFAULT '{}'::jsonb,
  published   BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  version     INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Media Assets ────────────────────────────────────────────
CREATE TABLE media_assets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id   UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  filename    TEXT NOT NULL,
  url         TEXT NOT NULL,
  size_bytes  INTEGER,
  mime_type   TEXT,
  storage_path TEXT NOT NULL,  -- Supabase Storage path
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_dealer ON media_assets(dealer_id);
CREATE INDEX idx_media_vehicle ON media_assets(vehicle_id);

-- ─── Audit Log ───────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id   UUID REFERENCES dealers(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES dealer_users(id),
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,  -- 'vehicle', 'lead', 'payment', etc.
  resource_id UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_dealer ON audit_logs(dealer_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ─── Automatic updated_at triggers ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['dealers','dealer_users','vehicles','leads','deals','payments','subscriptions','websites']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END; $$;
```

---

## Row Level Security (RLS) Policies

```sql
-- ═══════════════════════════════════════════
-- 002_rls_policies.sql
-- ═══════════════════════════════════════════

-- Enable RLS on ALL tables
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: extract dealer_id from JWT
CREATE OR REPLACE FUNCTION auth.dealer_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'dealer_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function: extract role from JWT
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE;

-- ─── Vehicles RLS ────────────────────────────────────────────
-- Public: anyone can read available vehicles (for public listing)
CREATE POLICY "vehicles_public_read" ON vehicles
  FOR SELECT USING (status = 'available');

-- Authenticated: dealer members see ALL their vehicles
CREATE POLICY "vehicles_dealer_all" ON vehicles
  FOR ALL USING (dealer_id = auth.dealer_id())
  WITH CHECK (dealer_id = auth.dealer_id());

-- ─── Leads RLS ───────────────────────────────────────────────
-- Sales agents: see only their assigned leads
CREATE POLICY "leads_sales_agent" ON leads
  FOR SELECT USING (
    dealer_id = auth.dealer_id() AND (
      auth.user_role() IN ('owner','admin') OR
      assigned_to = (SELECT id FROM dealer_users WHERE auth_user_id = auth.uid())
    )
  );

-- Admins/owners: full access to dealer leads
CREATE POLICY "leads_admin_all" ON leads
  FOR ALL USING (
    dealer_id = auth.dealer_id() AND
    auth.user_role() IN ('owner','admin')
  ) WITH CHECK (dealer_id = auth.dealer_id());

-- ─── Payments RLS ────────────────────────────────────────────
CREATE POLICY "payments_dealer_read" ON payments
  FOR SELECT USING (dealer_id = auth.dealer_id());

CREATE POLICY "payments_admin_write" ON payments
  FOR INSERT WITH CHECK (
    dealer_id = auth.dealer_id() AND
    auth.user_role() IN ('owner','admin')
  );

-- ─── Audit Log RLS ───────────────────────────────────────────
-- Read-only for admins
CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (
    dealer_id = auth.dealer_id() AND
    auth.user_role() IN ('owner','admin')
  );

-- Service role can insert (no user restriction needed)
CREATE POLICY "audit_service_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);
```

---

## Authentication & Multi-tenancy

### JWT Claims Structure

```json
{
  "sub": "auth-user-uuid",
  "email": "user@dealer.com",
  "dealer_id": "dealer-uuid",
  "role": "admin",
  "plan": "pro",
  "exp": 1735689600,
  "iat": 1735686000
}
```

### Auth Flow

```
1. User registers → Supabase Auth creates auth.users record
2. Our API hook creates dealer + dealer_users records
3. Login → Supabase returns access_token (15min) + refresh_token (30d)
4. Our API signs custom JWT with dealer_id + role claims
5. Frontend stores tokens securely (httpOnly cookie recommended)
6. Every API request: middleware decodes JWT, attaches dealer context
7. Supabase client uses service role on backend; RLS enforced by JWT claims
```

---

## API Reference

### Base URL

```
Production: https://api.autosys.ng/v1
Staging:    https://api-staging.autosys.ng/v1
Local:      http://localhost:3001/v1
```

### Authentication

All protected routes require:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register dealership + owner |
| POST | `/auth/login` | Login, returns tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/me` | Current user + dealer |

#### Vehicles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vehicles` | List with filters, pagination |
| POST | `/vehicles` | Create vehicle |
| GET | `/vehicles/:id` | Get by ID |
| PATCH | `/vehicles/:id` | Update vehicle |
| DELETE | `/vehicles/:id` | Soft delete |
| POST | `/vehicles/bulk-import` | CSV import |
| POST | `/vehicles/:id/images` | Upload images (multipart) |
| DELETE | `/vehicles/:id/images/:imageId` | Remove image |
| POST | `/vehicles/:id/generate-description` | AI description |
| GET | `/vehicles/:id/suggested-price` | AI pricing |

**GET /vehicles Query Params:**
```
status=available|reserved|sold|draft
brand=Toyota
fuel_type=Petrol|Diesel|Hybrid
year_min=2018
year_max=2024
price_min=10000000
price_max=80000000
search=camry
sort=price_asc|price_desc|newest|views
page=1
limit=20
```

#### Leads

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leads` | List with stage filter |
| POST | `/leads` | Create lead (also from public form) |
| GET | `/leads/:id` | Get with timeline |
| PATCH | `/leads/:id` | Update stage, assign, etc. |
| DELETE | `/leads/:id` | Archive lead |
| POST | `/leads/:id/timeline` | Add timeline entry |
| POST | `/leads/:id/generate-followup` | AI follow-up message |
| POST | `/leads/capture` | **Public endpoint** for website forms |

#### Deals (Pipeline)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/deals` | Get kanban board data |
| POST | `/deals` | Create deal |
| PATCH | `/deals/:id` | Update deal / move stage |
| DELETE | `/deals/:id` | Remove deal |
| GET | `/deals/summary` | Pipeline value summary |

#### Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments/initialize` | Create payment intent |
| GET | `/payments` | Transaction history |
| GET | `/payments/:id` | Get transaction |
| POST | `/payments/verify/:reference` | Verify payment status |
| POST | `/payments/webhook/paystack` | Paystack webhook receiver |
| POST | `/payments/webhook/flutterwave` | Flutterwave webhook receiver |
| GET | `/payments/analytics` | Revenue metrics |

#### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/dashboard` | All KPIs for dashboard |
| GET | `/analytics/revenue` | Revenue breakdown |
| GET | `/analytics/leads` | Lead source & conversion |
| GET | `/analytics/inventory` | Stock health metrics |

#### AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/vehicle-description` | Generate listing copy |
| POST | `/ai/price-analysis` | Market price suggestion |
| POST | `/ai/lead-followup` | WhatsApp follow-up draft |
| POST | `/ai/social-post` | Social media content |
| POST | `/ai/chat` | General dealership assistant |

---

## Security Architecture

### Middleware Stack (in order)

```javascript
// server.js — middleware chain
app.use(helmet())                    // Security headers
app.use(cors(corsOptions))           // Origin whitelist
app.use(express.json({ limit: '1mb' }))
app.use(sanitizeInput)               // XSS sanitization
app.use(requestLogger)               // Pino structured logs
app.use('/v1', globalRateLimit)      // 100 req/15min per IP
app.use('/v1/auth', authRateLimit)   // 10 req/15min for auth
app.use('/v1', authenticate)         // JWT verification
app.use('/v1', tenantContext)        // Attach dealer_id
app.use(errorHandler)                // Global error handler
```

### Security Checklist

- [x] **JWT**: Short-lived (15min) + Refresh (30d), stored in httpOnly cookies
- [x] **RLS**: Enforced at database level, not just API level
- [x] **Input Validation**: Zod schemas on all POST/PATCH routes
- [x] **XSS**: DOMPurify-equivalent server-side sanitization
- [x] **SQL Injection**: Parameterized queries via Supabase client (no raw SQL from user input)
- [x] **Rate Limiting**: Per-IP + per-route limits via Redis
- [x] **CORS**: Explicit origin whitelist, no wildcard in production
- [x] **File Uploads**: Type whitelist (jpg/png/webp only), 10MB limit, virus scan (ClamAV)
- [x] **Webhooks**: HMAC signature verification before processing
- [x] **Idempotency**: Payment keys prevent duplicate charges
- [x] **Audit Log**: All mutations logged with user, IP, before/after state
- [x] **Secrets**: Never logged, never in responses, rotatable via env
- [x] **HTTPS Only**: Enforced at reverse proxy (Nginx/Cloudflare)
- [x] **Helmet**: CSP, HSTS, X-Frame-Options, etc.
- [x] **Account Lockout**: 5 failed logins → 15min lockout via Redis

---

## Payment Integration

### Payment Flow

```
1. Frontend: POST /payments/initialize
   → Backend creates idempotency key
   → Tries Paystack first

2. Paystack success?
   → Returns checkout URL to frontend
   → User completes payment on Paystack

3. Paystack sends webhook to /payments/webhook/paystack
   → Verify HMAC signature
   → Update payment status in DB
   → Update vehicle status if sold
   → Trigger email notification
   → Emit realtime event to dashboard

4. If Paystack fails (network error, not user failure):
   → Auto-fallback to Flutterwave
   → Same flow as above

5. Frontend can also poll GET /payments/verify/:reference
```

### Webhook Security

```javascript
// paystack.service.js
verifyWebhookSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}
```

---

## AI Features

### Claude Integration

```javascript
// ai.service.js
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

async generateVehicleDescription(vehicle) {
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    system: `You are an expert automotive copywriter for Nigerian dealerships.
             Write compelling, buyer-focused vehicle descriptions.
             Always mention key features, condition, and end with a WhatsApp CTA.
             Use ₦ for prices when relevant.`,
    messages: [{
      role: 'user',
      content: `Write a 4-sentence listing description for:
                ${vehicle.year} ${vehicle.brand} ${vehicle.model}
                Mileage: ${vehicle.mileage}km
                Condition: ${vehicle.condition}
                Features: ${vehicle.features?.join(', ')}
                Price: ₦${(vehicle.price / 100).toLocaleString()}`
    }]
  });
  return message.content[0].text;
}
```

---

## Deployment Guide

### Option A: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create project
railway new autosys-backend
railway add redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set SUPABASE_URL=...
# (set all .env variables)

# Deploy
railway up

# Custom domain
railway domain add api.autosys.ng
```

### Option B: Render

```yaml
# render.yaml
services:
  - type: web
    name: autosys-api
    env: node
    buildCommand: npm install
    startCommand: node server.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
    scaling:
      minInstances: 1
      maxInstances: 5
      targetMemoryPercent: 80
```

### Option C: AWS EC2 + Nginx

```nginx
# /etc/nginx/sites-available/autosys-api
server {
    listen 443 ssl http2;
    server_name api.autosys.ng;
    
    ssl_certificate     /etc/letsencrypt/live/api.autosys.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.autosys.ng/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        
        # Webhook body size
        client_max_body_size 1m;
    }
}
```

### Database Migrations

```bash
# Run on Supabase SQL editor or via CLI
supabase db push  # Push local migrations
supabase db pull  # Pull remote schema

# Or direct
psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL < supabase/migrations/002_rls_policies.sql
psql $DATABASE_URL < supabase/migrations/003_payments.sql
```

---

## Development Workflow

```bash
# Start development
npm run dev          # Nodemon hot-reload on :3001

# Run tests
npm test             # Jest unit tests
npm run test:e2e     # Supertest API tests
npm run test:security # OWASP ZAP scan (requires ZAP running)

# Code quality
npm run lint         # ESLint
npm run format       # Prettier

# Database
npm run db:migrate   # Apply pending migrations
npm run db:reset     # Drop and recreate (dev only!)
npm run db:seed      # Seed demo dealership

# Generate types from Supabase
npm run generate:types  # Outputs src/types/supabase.ts

# Load testing
npm run load-test    # k6 scenario (requires k6 installed)
```

### Monitoring

```bash
# Health check endpoint
GET /health
→ { status: "ok", version: "1.0.0", db: "connected", uptime: 3600 }

# Metrics (Prometheus format)
GET /metrics
→ (requires METRICS_ENABLED=true)
```

---

## Package.json

```json
{
  "name": "autosys-backend",
  "version": "1.0.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:e2e": "jest --config jest.e2e.config.js",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "generate:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/supabase.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "@supabase/supabase-js": "^2.47.0",
    "@upstash/redis": "^1.34.0",
    "bullmq": "^5.18.0",
    "cors": "^2.8.5",
    "crypto": "^1.0.1",
    "express": "^5.0.1",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "resend": "^4.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.7",
    "supertest": "^7.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.3"
  }
}
```

---

*AutoSys Backend v1.0 · Built for Nigerian car dealers · Licensed under MIT*

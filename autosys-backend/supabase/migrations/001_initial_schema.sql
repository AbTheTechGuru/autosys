-- =================================================================
-- AutoSys Dealer OS — Initial Schema
-- Run in Supabase SQL Editor or via `supabase db push`
-- =================================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────
create type plan_type     as enum ('free','pro','premium');
create type user_role     as enum ('superadmin','owner','admin','agent','viewer');
create type vehicle_status as enum ('available','reserved','sold');
create type fuel_type     as enum ('petrol','diesel','hybrid','electric','cng');
create type transmission  as enum ('automatic','manual');
create type condition_type as enum ('foreign_used','locally_used','brand_new');
create type lead_stage    as enum ('new','contacted','negotiating','closed_won','closed_lost');
create type deal_stage    as enum ('lead','negotiation','payment','delivered');
create type lead_source   as enum ('website','whatsapp','referral','instagram','facebook','walkin','phone','other');
create type txn_status    as enum ('pending','success','failed','refunded');
create type campaign_type as enum ('whatsapp','email','instagram','sms');
create type campaign_status as enum ('draft','active','scheduled','completed','failed');
create type ticket_status as enum ('open','in_progress','resolved','closed');
create type ticket_priority as enum ('low','medium','high','critical');

-- =================================================================
-- DEALERS
-- =================================================================
create table dealers (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  subdomain         text not null unique,
  plan              plan_type not null default 'free',
  plan_expires_at   timestamptz,
  is_active         boolean not null default true,
  city              text,
  address           text,
  phone             text,
  whatsapp          text,
  logo_url          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint dealers_subdomain_format check (subdomain ~ '^[a-z0-9-]{3,40}$')
);

create index idx_dealers_subdomain on dealers(subdomain);
create index idx_dealers_plan      on dealers(plan);

-- ── Trigger: auto-update updated_at ──────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger dealers_updated_at before update on dealers
  for each row execute function set_updated_at();

-- =================================================================
-- USERS
-- =================================================================
create table users (
  id                    uuid primary key default uuid_generate_v4(),
  dealer_id             uuid not null references dealers(id) on delete cascade,
  name                  text not null,
  email                 text not null unique,
  password_hash         text not null,
  role                  user_role not null default 'agent',
  phone                 text,
  avatar_url            text,
  notification_prefs    jsonb not null default '{"new_lead":true,"payment":true,"deal_change":true,"weekly_digest":false,"whatsapp":true,"email":true}',
  is_active             boolean not null default true,
  must_reset_password   boolean not null default false,
  last_login_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint users_email_format check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

create index idx_users_dealer_id on users(dealer_id);
create index idx_users_email     on users(email);
create index idx_users_role      on users(dealer_id, role);

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- =================================================================
-- REFRESH TOKENS
-- =================================================================
create table refresh_tokens (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  dealer_id   uuid not null references dealers(id) on delete cascade,
  token       text not null unique,
  is_revoked  boolean not null default false,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index idx_refresh_tokens_user   on refresh_tokens(user_id);
create index idx_refresh_tokens_token  on refresh_tokens(token);
-- Auto-clean expired tokens
create index idx_refresh_tokens_expiry on refresh_tokens(expires_at) where not is_revoked;

-- =================================================================
-- API KEYS
-- =================================================================
create table api_keys (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid not null references dealers(id) on delete cascade,
  key_hash    text not null unique,
  key_prefix  text not null,
  is_active   boolean not null default true,
  last_used_at timestamptz,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

create index idx_api_keys_dealer on api_keys(dealer_id, is_active);

-- =================================================================
-- VEHICLES
-- =================================================================
create table vehicles (
  id            uuid primary key default uuid_generate_v4(),
  dealer_id     uuid not null references dealers(id) on delete cascade,
  brand         text not null,
  model         text not null,
  year          smallint not null check (year >= 1980 and year <= 2030),
  price         bigint not null check (price >= 0),    -- kobo
  mileage       integer not null default 0 check (mileage >= 0),
  fuel_type     fuel_type not null,
  transmission  transmission not null,
  condition     condition_type not null,
  status        vehicle_status not null default 'available',
  color         text,
  vin           text,
  description   text,
  features      text[] not null default '{}',
  image_urls    text[] not null default '{}',
  views_count   integer not null default 0,
  inquiry_count integer not null default 0,
  days_listed   integer generated always as
                  (extract(day from (now() - created_at))::integer) stored,
  created_by    uuid references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_vehicles_dealer  on vehicles(dealer_id);
create index idx_vehicles_status  on vehicles(dealer_id, status);
create index idx_vehicles_brand   on vehicles(dealer_id, brand);
create index idx_vehicles_price   on vehicles(dealer_id, price);

create trigger vehicles_updated_at before update on vehicles
  for each row execute function set_updated_at();

-- =================================================================
-- LEADS
-- =================================================================
create table leads (
  id                uuid primary key default uuid_generate_v4(),
  dealer_id         uuid not null references dealers(id) on delete cascade,
  name              text not null,
  phone             text not null,
  email             text,
  vehicle_interest  text,
  budget            bigint check (budget >= 0),  -- kobo
  source            lead_source not null default 'other',
  stage             lead_stage not null default 'new',
  notes             text,
  ai_score          smallint check (ai_score between 0 and 100),
  assigned_to       uuid references users(id) on delete set null,
  last_contacted_at timestamptz,
  created_by        uuid references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_leads_dealer    on leads(dealer_id);
create index idx_leads_stage     on leads(dealer_id, stage);
create index idx_leads_source    on leads(dealer_id, source);
create index idx_leads_assigned  on leads(dealer_id, assigned_to);
create index idx_leads_created   on leads(dealer_id, created_at desc);
-- Full-text search
create index idx_leads_search    on leads using gin(to_tsvector('english', name || ' ' || coalesce(email,'') || ' ' || coalesce(vehicle_interest,'')));

create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();

-- =================================================================
-- LEAD EVENTS (Timeline)
-- =================================================================
create table lead_events (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references leads(id) on delete cascade,
  dealer_id   uuid not null references dealers(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,  -- 'stage_changed', 'note', 'email_sent', 'ai_followup', etc.
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index idx_lead_events_lead    on lead_events(lead_id, created_at desc);
create index idx_lead_events_dealer  on lead_events(dealer_id, created_at desc);

-- =================================================================
-- DEALS (Pipeline)
-- =================================================================
create table deals (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid not null references dealers(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  vehicle_id  uuid references vehicles(id) on delete set null,
  title       text not null,
  value       bigint not null default 0 check (value >= 0),  -- kobo
  stage       deal_stage not null default 'lead',
  notes       text,
  assigned_to uuid references users(id) on delete set null,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_deals_dealer  on deals(dealer_id);
create index idx_deals_stage   on deals(dealer_id, stage);

create trigger deals_updated_at before update on deals
  for each row execute function set_updated_at();

-- Deal stage event log
create table deal_events (
  id          uuid primary key default uuid_generate_v4(),
  deal_id     uuid not null references deals(id) on delete cascade,
  dealer_id   uuid not null references dealers(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- =================================================================
-- TRANSACTIONS (Payments)
-- =================================================================
create table transactions (
  id               uuid primary key default uuid_generate_v4(),
  dealer_id        uuid not null references dealers(id) on delete cascade,
  reference        text not null unique,
  amount           bigint not null check (amount > 0),  -- kobo
  email            text,
  gateway          text not null default 'paystack',
  gateway_ref      text,
  status           txn_status not null default 'pending',
  metadata         jsonb not null default '{}',
  gateway_response jsonb,
  paid_at          timestamptz,
  created_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_transactions_dealer    on transactions(dealer_id);
create index idx_transactions_reference on transactions(reference);
create index idx_transactions_status    on transactions(dealer_id, status);

create trigger transactions_updated_at before update on transactions
  for each row execute function set_updated_at();

-- =================================================================
-- CAMPAIGNS
-- =================================================================
create table campaigns (
  id           uuid primary key default uuid_generate_v4(),
  dealer_id    uuid not null references dealers(id) on delete cascade,
  name         text not null,
  type         campaign_type not null,
  audience     text not null default 'all',
  message      text not null,
  status       campaign_status not null default 'draft',
  schedule_at  timestamptz,
  launched_at  timestamptz,
  sent_count   integer not null default 0,
  open_count   integer not null default 0,
  click_count  integer not null default 0,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_campaigns_dealer on campaigns(dealer_id, created_at desc);

create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

-- =================================================================
-- AUTOMATIONS
-- =================================================================
create table automations (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid not null references dealers(id) on delete cascade,
  trigger     text not null,
  action      text not null,
  enabled     boolean not null default true,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index idx_automations_dealer on automations(dealer_id, enabled);

-- Default automations for new dealers (inserted via function)
create or replace function seed_default_automations(p_dealer_id uuid)
returns void language plpgsql as $$
begin
  insert into automations (dealer_id, trigger, action, enabled) values
    (p_dealer_id, 'New lead created',            'Send WhatsApp greeting immediately',    true),
    (p_dealer_id, 'Lead not contacted for 2 days','Send follow-up reminder',              true),
    (p_dealer_id, 'Deal closed',                 'Send congratulations + review request', true),
    (p_dealer_id, 'Vehicle listed 30+ days',     'Alert admin via WhatsApp',              false),
    (p_dealer_id, 'Payment received',            'Send receipt + thank you email',        true);
end; $$;

-- =================================================================
-- WEBSITE CONFIGS
-- =================================================================
create table website_configs (
  id               uuid primary key default uuid_generate_v4(),
  dealer_id        uuid not null unique references dealers(id) on delete cascade,
  hero_headline    text not null default 'Find Your Perfect Car',
  hero_subtext     text not null default 'Premium vehicles at unbeatable prices.',
  hero_cta         text not null default 'Browse Inventory',
  meta_title       text,
  meta_description text,
  custom_domain    text,
  primary_color    text not null default '#C8973A',
  whatsapp_number  text,
  show_prices      boolean not null default true,
  theme            text not null default 'dark',
  is_published     boolean not null default false,
  last_published_at timestamptz,
  updated_at       timestamptz not null default now()
);

-- =================================================================
-- WEBHOOK CONFIGS
-- =================================================================
create table webhook_configs (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid not null unique references dealers(id) on delete cascade,
  url         text not null,
  events      text[] not null default '{}',
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- =================================================================
-- SUPPORT TICKETS
-- =================================================================
create table support_tickets (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid references dealers(id) on delete set null,
  subject     text not null,
  description text not null,
  status      ticket_status not null default 'open',
  priority    ticket_priority not null default 'medium',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tickets_status on support_tickets(status, created_at desc);

-- =================================================================
-- RLS (Row Level Security)
-- All dealer data is isolated by dealer_id.
-- The backend uses the service-role key which bypasses RLS,
-- but RLS is enforced as a defence-in-depth layer.
-- =================================================================
alter table vehicles    enable row level security;
alter table leads       enable row level security;
alter table lead_events enable row level security;
alter table deals       enable row level security;
alter table deal_events enable row level security;
alter table transactions enable row level security;
alter table campaigns   enable row level security;
alter table automations enable row level security;

-- Service role (backend) bypasses all policies automatically.
-- Anon/authenticated Supabase client policies (if ever used directly):

create policy "dealer_isolation_vehicles"    on vehicles    using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_leads"       on leads       using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_lead_events" on lead_events using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_deals"       on deals       using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_deal_events" on deal_events using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_transactions" on transactions using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_campaigns"   on campaigns   using (dealer_id = current_setting('app.dealer_id', true)::uuid);
create policy "dealer_isolation_automations" on automations using (dealer_id = current_setting('app.dealer_id', true)::uuid);

-- =================================================================
-- HELPER FUNCTION: Create dealer + owner atomically
-- Called from auth.js signup route
-- =================================================================
create or replace function create_dealer_with_owner(
  p_dealer_name   text,
  p_subdomain     text,
  p_user_name     text,
  p_email         text,
  p_password_hash text,
  p_phone         text default null
)
returns jsonb language plpgsql as $$
declare
  v_dealer dealers%rowtype;
  v_user   users%rowtype;
begin
  -- Create dealer
  insert into dealers (name, subdomain, plan)
  values (p_dealer_name, p_subdomain, 'free')
  returning * into v_dealer;

  -- Create owner user
  insert into users (dealer_id, name, email, password_hash, role, phone)
  values (v_dealer.id, p_user_name, p_email, p_password_hash, 'owner', p_phone)
  returning * into v_user;

  -- Seed default automations
  perform seed_default_automations(v_dealer.id);

  -- Seed default website config
  insert into website_configs (dealer_id) values (v_dealer.id);

  return jsonb_build_object(
    'dealer', row_to_json(v_dealer),
    'user',   row_to_json(v_user)
  );
end; $$;

-- =================================================================
-- INDEXES for common query patterns
-- =================================================================
-- Dashboard overview queries
create index idx_deals_delivered_date  on deals(dealer_id, updated_at desc) where stage = 'delivered';
create index idx_leads_new_date        on leads(dealer_id, created_at desc) where stage = 'new';
create index idx_txns_success_date     on transactions(dealer_id, paid_at desc) where status = 'success';

-- =================================================================
-- COMMENTS (documentation)
-- =================================================================
comment on table dealers      is 'One record per dealership. All data is scoped by dealer_id.';
comment on table users        is 'Staff accounts. Multiple users per dealer.';
comment on table refresh_tokens is 'JWT refresh token rotation log. Old tokens are revoked, not deleted.';
comment on table vehicles     is 'Car inventory. Prices stored in kobo (₦ × 100).';
comment on table leads        is 'Prospective buyers. Source tracked for attribution.';
comment on table lead_events  is 'Immutable audit log for every lead action (stage changes, notes, AI calls).';
comment on table deals        is 'Active pipeline deals with stage tracking.';
comment on table transactions is 'All payment attempts via Paystack/Flutterwave. Amount in kobo.';

-- =================================================================
-- DEALER_USERS (separate from the simpler users table)
-- Used by the current auth.js route for Supabase-auth-based signup
-- =================================================================
create table if not exists dealer_users (
  id             uuid primary key default uuid_generate_v4(),
  dealer_id      uuid not null references dealers(id) on delete cascade,
  full_name      text not null,
  email          text not null unique,
  password_hash  text not null,
  phone          text,
  role           user_role not null default 'agent',
  avatar_url     text,
  notification_prefs jsonb not null default '{"new_lead":true,"payment":true}',
  is_active      boolean not null default true,
  must_reset_password boolean not null default false,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_dealer_users_dealer  on dealer_users(dealer_id);
create index if not exists idx_dealer_users_email   on dealer_users(email);

create trigger dealer_users_updated_at before update on dealer_users
  for each row execute function set_updated_at();

-- =================================================================
-- CAMPAIGN_TEMPLATES
-- =================================================================
create table if not exists campaign_templates (
  id          uuid primary key default uuid_generate_v4(),
  dealer_id   uuid references dealers(id) on delete cascade,  -- null = built-in
  name        text not null,
  type        campaign_type not null,
  message     text not null default '',
  category    text not null default 'custom',
  is_builtin  boolean not null default false,
  created_by  uuid references dealer_users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_templates_dealer on campaign_templates(dealer_id);

-- Add last_seen_at to users table if it doesn't exist
alter table users add column if not exists last_seen_at timestamptz;


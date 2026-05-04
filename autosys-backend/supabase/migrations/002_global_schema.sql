-- =================================================================
-- AutoSys Global Schema — Migration 002
-- Run AFTER 001_initial_schema.sql
-- Adds: global dealer config, tasks, calendar, messages, social,
--       automations v2, activity logs, scheduled triggers
-- =================================================================

-- ── 1. EXTEND DEALERS TABLE ───────────────────────────────────
-- Add global fields to existing dealers table

alter table dealers
  add column if not exists country          text not null default 'NG',
  add column if not exists currency         text not null default 'NGN',
  add column if not exists timezone         text not null default 'Africa/Lagos',
  add column if not exists payment_provider text not null default 'paystack',
  add column if not exists locale           text not null default 'en-NG',
  add column if not exists phone_prefix     text not null default '+234';

comment on column dealers.country          is 'ISO 3166-1 alpha-2 country code (NG, US, KE, etc.)';
comment on column dealers.currency         is 'ISO 4217 currency code (NGN, USD, KES, etc.)';
comment on column dealers.timezone         is 'IANA timezone (Africa/Lagos, America/New_York, etc.)';
comment on column dealers.payment_provider is 'Primary payment gateway (paystack, stripe, razorpay, mpesa, etc.)';

-- ── 2. EXTEND PAYMENTS TABLE ──────────────────────────────────
alter table payments
  add column if not exists country         text,
  add column if not exists customer_phone  text,
  add column if not exists checkout_id     text,
  add column if not exists checkout_config jsonb;

-- ── 3. TASKS ──────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default uuid_generate_v4(),
  dealer_id    uuid not null references dealers(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  due_date     timestamptz not null,
  assigned_to  uuid references dealer_users(id) on delete set null,
  lead_id      uuid references leads(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  status       text not null default 'pending'
               check (status in ('pending','in_progress','completed','cancelled')),
  priority     text not null default 'medium'
               check (priority in ('low','medium','high','urgent')),
  type         text not null default 'task'
               check (type in ('task','followup','call','meeting','reminder')),
  created_by   text,          -- 'automation' | user uuid
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_tasks_dealer     on tasks(dealer_id);
create index if not exists idx_tasks_due        on tasks(dealer_id, due_date) where status != 'completed';
create index if not exists idx_tasks_assigned   on tasks(assigned_to, status);
create index if not exists idx_tasks_lead       on tasks(lead_id);

create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

alter table tasks enable row level security;
create policy if not exists "dealer_isolation_tasks"
  on tasks using (dealer_id = current_setting('app.dealer_id', true)::uuid);

-- ── 4. CALENDAR EVENTS ────────────────────────────────────────
create table if not exists calendar_events (
  id           uuid primary key default uuid_generate_v4(),
  dealer_id    uuid not null references dealers(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  location     text not null default '',
  type         text not null default 'appointment'
               check (type in ('appointment','test_drive','followup','meeting','call','other')),
  status       text not null default 'confirmed'
               check (status in ('confirmed','tentative','cancelled')),
  assigned_to  uuid references dealer_users(id) on delete set null,
  lead_id      uuid references leads(id) on delete set null,
  deal_id      uuid references deals(id) on delete set null,
  created_by   uuid references dealer_users(id) on delete set null,
  is_all_day   boolean not null default false,
  recurrence   jsonb,         -- { freq: 'weekly', until: '...' }
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_cal_dealer     on calendar_events(dealer_id);
create index if not exists idx_cal_start      on calendar_events(dealer_id, start_time);
create index if not exists idx_cal_assigned   on calendar_events(assigned_to, start_time);
create index if not exists idx_cal_lead       on calendar_events(lead_id);

create trigger cal_events_updated_at before update on calendar_events
  for each row execute function set_updated_at();

alter table calendar_events enable row level security;
create policy if not exists "dealer_isolation_calendar"
  on calendar_events using (dealer_id = current_setting('app.dealer_id', true)::uuid);

-- ── 5. MESSAGES (Unified Inbox) ───────────────────────────────
create table if not exists messages (
  id                  uuid primary key default uuid_generate_v4(),
  dealer_id           uuid not null references dealers(id) on delete cascade,
  lead_id             uuid references leads(id) on delete set null,
  channel             text not null
                      check (channel in ('whatsapp','sms','email','call')),
  direction           text not null
                      check (direction in ('inbound','outbound')),
  from_number         text,
  to_number           text,
  subject             text,          -- Email only
  body                text not null default '',
  status              text not null default 'sent'
                      check (status in ('pending','sent','delivered','read','failed','received','simulated')),
  sent_by             uuid references dealer_users(id) on delete set null,
  provider            text,          -- 'meta','termii','twilio','sendgrid','resend'
  provider_message_id text,
  error_message       text,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists idx_messages_dealer    on messages(dealer_id);
create index if not exists idx_messages_lead      on messages(lead_id, created_at desc);
create index if not exists idx_messages_channel   on messages(dealer_id, channel);
create index if not exists idx_messages_inbox     on messages(dealer_id, created_at desc);

alter table messages enable row level security;
create policy if not exists "dealer_isolation_messages"
  on messages using (dealer_id = current_setting('app.dealer_id', true)::uuid);

-- ── 6. SOCIAL POSTS ───────────────────────────────────────────
create table if not exists social_posts (
  id               uuid primary key default uuid_generate_v4(),
  dealer_id        uuid not null references dealers(id) on delete cascade,
  platform         text not null
                   check (platform in ('facebook','instagram','tiktok','twitter','linkedin')),
  content          text not null,
  media_urls       text[] not null default '{}',
  vehicle_id       uuid references vehicles(id) on delete set null,
  status           text not null default 'draft'
                   check (status in ('draft','scheduled','published','failed','skipped')),
  scheduled_at     timestamptz,
  published_at     timestamptz,
  platform_post_id text,
  source           text not null default 'manual'
                   check (source in ('manual','automation')),
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_social_dealer    on social_posts(dealer_id);
create index if not exists idx_social_platform  on social_posts(dealer_id, platform);
create index if not exists idx_social_status    on social_posts(dealer_id, status);

alter table social_posts enable row level security;
create policy if not exists "dealer_isolation_social"
  on social_posts using (dealer_id = current_setting('app.dealer_id', true)::uuid);

-- ── 7. AUTOMATIONS V2 (extend existing table) ─────────────────
alter table automations
  add column if not exists name        text not null default 'Untitled Automation',
  add column if not exists conditions  jsonb not null default '[]',
  add column if not exists actions     jsonb not null default '[]',
  add column if not exists run_count   integer not null default 0,
  add column if not exists last_run_at timestamptz,
  add column if not exists updated_at  timestamptz not null default now();

create trigger automations_updated_at before update on automations
  for each row execute function set_updated_at();

-- ── 8. AUTOMATION SCHEDULES (for delayed follow-ups) ──────────
create table if not exists automation_schedules (
  id            uuid primary key default uuid_generate_v4(),
  dealer_id     uuid not null references dealers(id) on delete cascade,
  trigger       text not null,
  fire_at       timestamptz not null,
  action_config jsonb not null default '{}',
  payload       jsonb not null default '{}',
  status        text not null default 'pending'
                check (status in ('pending','fired','cancelled','failed')),
  fired_at      timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_schedules_fire    on automation_schedules(fire_at) where status = 'pending';
create index if not exists idx_schedules_dealer  on automation_schedules(dealer_id);

-- ── 9. ACTIVITY LOGS ──────────────────────────────────────────
create table if not exists activity_logs (
  id           uuid primary key default uuid_generate_v4(),
  dealer_id    uuid not null references dealers(id) on delete cascade,
  entity_type  text not null,   -- 'automation','lead','deal','payment','user'
  entity_id    uuid,
  action       text not null,   -- e.g. 'automation.send_whatsapp.success'
  actor_id     uuid references dealer_users(id) on delete set null,
  actor_type   text not null default 'system',  -- 'user' | 'system' | 'automation'
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_actlog_dealer  on activity_logs(dealer_id, created_at desc);
create index if not exists idx_actlog_entity  on activity_logs(entity_type, entity_id);

-- ── 10. UPDATE create_dealer_with_owner to accept global fields ─
create or replace function create_dealer_with_config(
  p_dealer_name     text,
  p_subdomain       text,
  p_country         text default 'NG',
  p_currency        text default 'NGN',
  p_timezone        text default 'Africa/Lagos',
  p_payment_provider text default 'paystack',
  p_plan            text default 'free'
)
returns jsonb language plpgsql as $$
declare
  v_dealer dealers%rowtype;
begin
  insert into dealers (name, subdomain, plan, country, currency, timezone, payment_provider)
  values (p_dealer_name, p_subdomain, p_plan::plan_type, p_country, p_currency, p_timezone, p_payment_provider)
  returning * into v_dealer;

  -- Seed default automations
  perform seed_default_automations(v_dealer.id);

  -- Seed default website config
  insert into website_configs (dealer_id) values (v_dealer.id);

  return row_to_json(v_dealer)::jsonb;
end; $$;

-- ── 11. INDEXES for new query patterns ───────────────────────
-- For unified inbox queries
create index if not exists idx_msgs_conv  on messages(dealer_id, lead_id, created_at desc);
-- For automation scheduling
create index if not exists idx_sched_next on automation_schedules(fire_at asc) where status = 'pending';
-- For task due-date alerts
create index if not exists idx_task_overdue on tasks(dealer_id, due_date asc) where status = 'pending';

-- ── 12. SEED GLOBAL AUTOMATIONS (replace legacy) ─────────────
create or replace function seed_default_automations(p_dealer_id uuid)
returns void language plpgsql as $$
begin
  delete from automations where dealer_id = p_dealer_id; -- clear legacy
  insert into automations (dealer_id, name, trigger, actions, enabled) values
    (p_dealer_id, 'Welcome new lead',
     'lead.created',
     '[{"type":"send_whatsapp","config":{"message":"Hello {{lead.name}}! Thank you for your interest. How can we help you today?"}}]',
     true),
    (p_dealer_id, 'Follow-up after 2 days',
     'lead.created',
     '[{"type":"create_task","config":{"title":"Follow up with {{lead.name}}","daysFromNow":2,"priority":"high"}}]',
     true),
    (p_dealer_id, 'Deal closed — congratulate',
     'deal.moved',
     '[{"type":"send_email","config":{"subject":"Congratulations on your new car!","body":"Dear {{lead.name}}, congratulations on your purchase!"}}]',
     true),
    (p_dealer_id, 'Payment received — receipt',
     'payment.success',
     '[{"type":"send_email","config":{"subject":"Payment Confirmed","body":"Your payment of {{payment.amount}} has been confirmed. Reference: {{payment.reference}}"}}]',
     true),
    (p_dealer_id, 'New vehicle — post to social',
     'vehicle.created',
     '[{"type":"post_social","config":{"platform":"facebook","content":"🚗 New arrival! {{vehicle.year}} {{vehicle.brand}} {{vehicle.model}} now available."}}]',
     false);
end; $$;

comment on table tasks             is 'Follow-up tasks, reminders, and to-dos per dealer.';
comment on table calendar_events   is 'Appointments, test drives, meetings per dealer.';
comment on table messages          is 'Unified inbox: all inbound/outbound messages across channels.';
comment on table social_posts      is 'Auto-posted and manual social media content per dealer.';
comment on table automation_schedules is 'Pending delayed automation actions (fire_at queue).';
comment on table activity_logs     is 'Audit log for all system and user actions.';

-- =================================================================
-- AutoSys Blog System — Migration 003
-- Run AFTER 001_initial_schema.sql (and 002_global_schema.sql if present)
-- Creates: blog_posts, blog_categories, blog_tags, blog_views, blog_cta_clicks
-- =================================================================

-- ── Blog post status enum ─────────────────────────────────────
create type blog_status as enum ('draft', 'published', 'archived');

-- ── Categories ────────────────────────────────────────────────
create table blog_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  description text,
  color       text not null default '#C8973A',
  post_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into blog_categories (name, slug, description, color) values
  ('Sales & CRM',        'sales-crm',       'Lead management, closing deals, CRM best practices', '#3B82F6'),
  ('Inventory',          'inventory',        'Vehicle sourcing, pricing, stock management',         '#C8973A'),
  ('Marketing',          'marketing',        'Digital marketing, WhatsApp, social media for dealers','#8B5CF6'),
  ('Business Growth',    'business-growth',  'Scaling your dealership, team management, finance',   '#16A34A'),
  ('Technology',         'technology',       'Software, tools, and automation for car dealers',     '#F59E0B'),
  ('Industry News',      'industry-news',    'Nigerian automotive industry updates and trends',      '#EC4899');

-- ── Blog Posts ────────────────────────────────────────────────
create table blog_posts (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  slug           text not null unique,
  content        text not null default '',      -- Rich HTML content
  excerpt        text not null default '',
  featured_image text,
  author_name    text not null default 'AutoSys Team',
  author_avatar  text,
  author_bio     text,
  status         blog_status not null default 'draft',
  category_id    uuid references blog_categories(id) on delete set null,
  category_slug  text,                           -- Denormalised for fast reads
  tags           text[] not null default '{}',
  read_time      integer not null default 3,     -- Minutes, auto-calculated
  meta_title     text,
  meta_desc      text,
  og_image       text,
  featured       boolean not null default false,
  view_count     integer not null default 0,
  created_by     uuid references users(id) on delete set null,  -- null = system/seed
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_blog_slug       on blog_posts(slug);
create index idx_blog_status     on blog_posts(status, published_at desc);
create index idx_blog_category   on blog_posts(category_id, status);
create index idx_blog_featured   on blog_posts(featured, status);
create index idx_blog_tags       on blog_posts using gin(tags);
create index idx_blog_search     on blog_posts using gin(to_tsvector('english', title || ' ' || coalesce(excerpt,'')));

create trigger blog_posts_updated_at before update on blog_posts
  for each row execute function set_updated_at();

-- ── Page views (analytics) ────────────────────────────────────
create table blog_views (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references blog_posts(id) on delete cascade,
  fingerprint text,                         -- Anonymous visitor fingerprint
  referrer    text,
  country     text,
  created_at  timestamptz not null default now()
);

create index idx_blog_views_post on blog_views(post_id, created_at desc);
create index idx_blog_views_day  on blog_views(post_id, date_trunc('day', created_at));

-- ── CTA click tracking ────────────────────────────────────────
create table blog_cta_clicks (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references blog_posts(id) on delete cascade,
  cta_type    text not null,               -- 'hero', 'inline', 'end', 'sticky'
  destination text not null,              -- '/auth', '/app', 'whatsapp', etc.
  created_at  timestamptz not null default now()
);

create index idx_cta_post on blog_cta_clicks(post_id, cta_type);

-- ── Function: increment post views atomically ─────────────────
create or replace function increment_blog_views(p_post_id uuid, p_fingerprint text default null)
returns void language plpgsql as $$
begin
  update blog_posts set view_count = view_count + 1 where id = p_post_id;
  insert into blog_views (post_id, fingerprint) values (p_post_id, p_fingerprint);
end; $$;

-- ── Function: recalculate read time from content ──────────────
create or replace function calc_read_time(content text)
returns integer language plpgsql as $$
declare
  word_count integer;
begin
  -- Average adult reading speed: 200 wpm
  word_count := array_length(regexp_split_to_array(trim(content), '\s+'), 1);
  return greatest(1, round(word_count::numeric / 200));
end; $$;

-- ── Trigger: auto-calc read_time on insert/update ─────────────
create or replace function blog_calc_read_time()
returns trigger language plpgsql as $$
begin
  new.read_time := calc_read_time(new.content);
  -- Auto-set published_at on first publish
  if new.status = 'published' and old.status != 'published' then
    new.published_at := now();
  end if;
  -- Auto-generate meta fields if missing
  if new.meta_title is null or new.meta_title = '' then
    new.meta_title := new.title || ' | AutoSys Blog';
  end if;
  if new.meta_desc is null or new.meta_desc = '' then
    new.meta_desc := left(new.excerpt, 160);
  end if;
  if new.og_image is null and new.featured_image is not null then
    new.og_image := new.featured_image;
  end if;
  return new;
end; $$;

create trigger blog_posts_read_time before insert or update on blog_posts
  for each row execute function blog_calc_read_time();

-- ── Seed: 6 rich demo posts ────────────────────────────────────
insert into blog_posts (title, slug, excerpt, featured_image, author_name, status, category_slug, tags, read_time, published_at, featured, content, meta_title, meta_desc) values

(
  'How Nigerian Car Dealers Are Closing 3x More Sales with CRM Software',
  'nigerian-car-dealers-closing-3x-more-sales-crm',
  'Discover how top dealerships in Lagos and Abuja are using CRM tools to track leads, automate follow-ups, and close more deals every month.',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80',
  'Emeka Obi',
  'published',
  'sales-crm',
  ARRAY['crm','leads','sales','automation'],
  7,
  now() - interval '5 days',
  true,
  '<h2>The Lead Follow-Up Problem Every Dealer Faces</h2><p>Walk into any car dealership in Lagos and ask the sales manager about their biggest challenge. Nine times out of ten, they''ll tell you the same thing: <strong>lost leads</strong>.</p><p>A customer calls on Monday about a 2019 Toyota Camry. The agent writes the number on a sticky note. By Wednesday, that note is buried under three other sticky notes. The customer buys from a competitor.</p><p>This scenario plays out hundreds of times across Nigerian dealerships every single day — and it''s costing the industry billions of naira in lost revenue.</p><h2>What CRM Software Actually Does</h2><p>A Customer Relationship Management (CRM) system is not just a digital address book. Modern CRMs like the one built into AutoSys are intelligent lead tracking engines that:</p><ul><li>Automatically capture leads from WhatsApp, your website, Instagram DMs, and phone calls</li><li>Remind agents to follow up at exactly the right time</li><li>Track every interaction with every customer in one place</li><li>Score leads based on their likelihood to buy</li><li>Give managers real-time visibility into every agent''s pipeline</li></ul><h2>Real Numbers from Real Dealers</h2><p>We analysed data from 147 Nigerian dealerships that switched from manual tracking to AutoSys CRM in the last 18 months. The results were striking:</p><ul><li><strong>Average lead-to-sale conversion rate increased from 8% to 24%</strong></li><li>Response time to new leads dropped from 4.2 hours to 11 minutes</li><li>Sales agents reported handling 40% more leads without additional stress</li></ul><h2>The WhatsApp Factor</h2><p>Here''s something unique about the Nigerian market: WhatsApp is not a messaging app. It''s a business platform. Over 67% of car enquiries in Nigeria start on WhatsApp — either through personal messages, status views, or broadcast lists.</p><p>The dealers closing the most deals are the ones treating WhatsApp as a serious sales channel with proper CRM integration, not as a personal phone.</p><blockquote><p>"Before AutoSys, I was responding to WhatsApp messages at 2am and still missing leads. Now the system tracks everything and even suggests what to reply." — Fatima Aliyu, AliyuAuto Abuja</p></blockquote><h2>Getting Started</h2><p>The good news is that setting up a modern CRM doesn''t require technical expertise or a large budget. AutoSys offers a free plan that lets you manage up to 5 vehicles and unlimited leads — no credit card required.</p>',
  'Nigerian Car Dealers Closing 3x More Sales with CRM | AutoSys Blog',
  'Discover how top Nigerian dealerships use CRM software to track leads, automate follow-ups, and triple their sales conversion rate.'
),

(
  '10 WhatsApp Marketing Tactics Every Nigerian Car Dealer Must Use in 2025',
  'whatsapp-marketing-tactics-nigerian-car-dealers-2025',
  'WhatsApp is Nigeria''s most powerful sales channel. Learn the 10 tactics top-performing dealers use to convert conversations into closed deals.',
  'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80',
  'Chidinma Okonkwo',
  'published',
  'marketing',
  ARRAY['whatsapp','marketing','leads','nigeria'],
  9,
  now() - interval '12 days',
  true,
  '<h2>Why WhatsApp is the #1 Car Sales Channel in Nigeria</h2><p>Nigeria has 90 million WhatsApp users. That is not a statistic — that is your entire customer base. Every potential car buyer in Lagos, Abuja, Port Harcourt, and Kano has WhatsApp on their phone and checks it multiple times daily.</p><p>Smart dealers figured this out years ago. Mediocre dealers are still waiting for website traffic that is never coming.</p><h2>Tactic 1: Build a Professional Broadcast List</h2><p>Your WhatsApp broadcast list is worth more than any email list you will ever build. Unlike email (which gets 18% open rates at best), WhatsApp messages get 98% open rates. Start collecting numbers with consent and segment them by interest (budget range, vehicle type, location).</p><h2>Tactic 2: Vehicle Status Updates as Story Content</h2><p>Post every new vehicle arrival as a WhatsApp Status with professional photos and price. People who view your status are warm leads — they''re interested enough to engage. AutoSys lets you see who viewed and auto-sends them a follow-up message.</p><h2>Tactic 3: AI-Powered Quick Replies</h2><p>Set up quick reply templates for the 20 most common questions: price, availability, payment terms, test drive booking. With AutoSys AI, these replies are personalized to the specific vehicle the customer asked about.</p><h2>Tactic 4: The 5-Minute Follow-Up Rule</h2><p>Research shows that responding to a lead within 5 minutes makes you 100x more likely to close the sale compared to responding 30 minutes later. Set up AutoSys automations to send an instant acknowledgment while your agent takes a proper response.</p><h2>Tactics 5-10 (Summary)</h2><ul><li><strong>Tactic 5:</strong> Monthly "Vehicle of the Month" broadcast with exclusive pricing</li><li><strong>Tactic 6:</strong> Customer testimonial videos as Status content</li><li><strong>Tactic 7:</strong> Payment plan calculator shared via WhatsApp</li><li><strong>Tactic 8:</strong> Re-engagement campaign for leads who went cold</li><li><strong>Tactic 9:</strong> Post-sale follow-up sequence (30, 90, 365 days)</li><li><strong>Tactic 10:</strong> Referral rewards program via WhatsApp</li></ul>',
  '10 WhatsApp Marketing Tactics for Nigerian Car Dealers 2025 | AutoSys',
  'Learn 10 proven WhatsApp marketing tactics that top Nigerian car dealers use to convert conversations into closed deals in 2025.'
),

(
  'The Complete Guide to Pricing Your Used Cars for Maximum Profit in Nigeria',
  'guide-pricing-used-cars-maximum-profit-nigeria',
  'Stop underpricing your inventory. Learn the data-driven pricing strategies that Nigeria''s most profitable dealerships use to maximize margins.',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80',
  'AutoSys Team',
  'published',
  'inventory',
  ARRAY['pricing','inventory','profit','strategy'],
  8,
  now() - interval '20 days',
  false,
  '<h2>The Pricing Problem Costing Nigerian Dealers Millions</h2><p>We surveyed 200 Nigerian car dealers and found that 73% of them use one of two broken pricing strategies: copying competitor prices or gut feeling. Both approaches leave enormous money on the table.</p><h2>The Data-Driven Pricing Framework</h2><p>Professional pricing starts with understanding four variables: market demand, vehicle condition, financing availability, and seasonal factors. Here is how to apply each one.</p><h2>Market Demand Analysis</h2><p>Before pricing any vehicle, check how many similar cars are listed on Jiji, CarDealers.ng, and Carmudi. If there are only 3 listings for a 2018 Toyota Venza in good condition in Lagos — you can price 8-12% above market. If there are 40 listings — you need to be competitive.</p><h2>The Condition Premium Matrix</h2><p>Nigerian buyers place a 15-25% premium on documented service history and "first owner" status. If you can verify and document a vehicle''s maintenance history, you can command significantly higher prices. This is why keeping service records is a business decision, not just admin.</p><h2>Seasonal Pricing Windows</h2><p>Nigerian car sales have clear seasonal patterns. January-February (post-Christmas) is slow. March-June is hot (end of quarter, school resumption). September is strong (Eid and back-to-school). December is the hottest month of the year — especially for premium vehicles as gifts and year-end bonuses fuel purchases.</p>',
  'Guide to Pricing Used Cars for Maximum Profit in Nigeria | AutoSys Blog',
  'Stop underpricing your inventory. Learn data-driven pricing strategies for maximum margins on used cars in Nigeria.'
),

(
  'How to Build a Car Dealership Website That Actually Converts in 2025',
  'build-car-dealership-website-converts-2025',
  'Most dealership websites look great but convert terribly. Here''s the conversion-focused framework top Nigerian dealers use to turn visitors into buyers.',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80',
  'AutoSys Team',
  'published',
  'technology',
  ARRAY['website','conversion','digital','seo'],
  6,
  now() - interval '31 days',
  false,
  '<h2>The Truth About Dealership Websites</h2><p>Here is a number that will shock you: the average Nigerian car dealership website converts at 0.4%. That means 996 out of every 1,000 visitors leave without taking any action.</p><p>The websites that convert at 3-8% (the top 5% of dealerships) do not have better-looking websites. They have smarter websites.</p><h2>The 5 Elements of a Converting Dealership Website</h2><h3>1. Clear, Specific Hero Headline</h3><p>Do not write "Welcome to Our Dealership." Write "Lagos'' Largest Selection of Tokunbo Cars — 200+ Vehicles, Verified Condition." Specific beats generic every time.</p><h3>2. WhatsApp Button Above the Fold</h3><p>Your visitors are on their phones. They want to message you on WhatsApp, not fill out a form. A floating WhatsApp button that is always visible can increase enquiries by 40-60%.</p><h3>3. Live Inventory with Photos</h3><p>Show your actual cars. Inventory pages with real photos and prices get 8x more enquiries than generic pages. AutoSys syncs your inventory to your website automatically — no manual uploads.</p><h3>4. Social Proof Everywhere</h3><p>Photos of happy customers, Google reviews, number of cars sold, years in business. Nigerian buyers are deeply social — they need to see that others have bought from you successfully.</p><h3>5. Mobile-First Design</h3><p>87% of Nigerian internet users are on mobile. If your website is not fast and beautiful on a ₦40,000 Android phone on 3G, you are losing sales daily.</p>',
  'How to Build a Car Dealership Website That Converts in 2025 | AutoSys',
  'Learn the conversion-focused website framework that top Nigerian dealerships use to turn website visitors into buyers in 2025.'
),

(
  'AutoSys vs. Excel: Why Nigerian Dealers Are Finally Ditching Spreadsheets',
  'autosys-vs-excel-why-dealers-ditching-spreadsheets',
  'Millions of naira in deals are being lost because dealerships still run on Excel. Here''s a brutally honest comparison of old-school vs. modern dealership management.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  'Biodun Adeyemi',
  'published',
  'technology',
  ARRAY['software','excel','management','efficiency'],
  5,
  now() - interval '45 days',
  false,
  '<h2>The Excel Dealership: A Day in the Life</h2><p>7:30 AM. Samuel, sales manager at a Lagos dealership, opens Excel. He has 14 sheets — inventory, leads, deals, commissions, payments, vehicle docs. He manually updates four of them before his first customer arrives.</p><p>By 11 AM, a customer asks about a Camry that Samuel forgot he already promised to another buyer. By 3 PM, he cannot find last week''s payment record. By 5 PM, he has sent the wrong vehicle specs to a customer via email.</p><p>This is not incompetence. This is what happens when you run a complex, multi-variable business on a tool designed for simple tables.</p><h2>The Real Cost of Excel</h2><p>We calculated the true cost of Excel-based dealership management across 50 dealerships over 12 months:</p><ul><li><strong>Lost deals from slow follow-up:</strong> average ₦2.1M per dealership per year</li><li><strong>Double-booking errors:</strong> average 2.3 incidents per month per dealership</li><li><strong>Commission disputes:</strong> average 8 hours/month of manager time</li><li><strong>Reporting time:</strong> 3-4 hours per week manually compiling reports</li></ul><h2>AutoSys vs. Excel: Feature-by-Feature</h2><p>The comparison is not really fair to Excel — it was never designed to run a dealership. But here is the honest breakdown across six critical functions.</p>',
  'AutoSys vs Excel: Why Nigerian Dealers Are Ditching Spreadsheets | Blog',
  'Millions in deals are lost because Nigerian dealerships still use Excel. Here''s an honest comparison of spreadsheets vs. modern dealer software.'
),

(
  'From 8 to 31 Cars Per Month: The AutoSys Success Story of Okafor Motors',
  'okafor-motors-success-story-autosys',
  'Emeka Okafor struggled to scale his Lagos dealership past 8 cars per month. Six months after switching to AutoSys, they hit 31. Here''s exactly what changed.',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=1200&q=80',
  'AutoSys Team',
  'published',
  'business-growth',
  ARRAY['case-study','success','growth','crm'],
  10,
  now() - interval '58 days',
  false,
  '<h2>The Problem: Good Cars, Bad Systems</h2><p>Emeka Okafor has been in the car business for 11 years. He knows vehicles — he can tell the history of a Tokunbo Honda Accord just by looking at the dashboard cluster. What he could not do was scale.</p><p>"I was the system," Emeka told us. "Every deal, every lead, every follow-up ran through my head. When I took a day off, everything stopped."</p><h2>Six Months Before AutoSys</h2><p>In December 2023, Okafor Motors was selling an average of 8 cars per month. Revenue was steady but growth had stalled at ₦48M/month. Emeka had tried hiring more agents — but without a system, more agents meant more chaos.</p><p>He was missing an average of 14 leads per week that came in during off-hours on WhatsApp. His agents had no visibility into each other''s deals. Commission calculations took two days every month and always caused arguments.</p><h2>The Switch: What Changed in 30 Days</h2><p>Okafor Motors went live on AutoSys in January 2024. Within the first 30 days, three things happened immediately:</p><ol><li><strong>WhatsApp integration captured off-hours leads.</strong> 23 leads in the first month that would have been missed. 4 converted to sales immediately.</li><li><strong>Inventory went online.</strong> Their website (built in AutoSys in 45 minutes) started getting enquiries from Google searches they did not even know they were ranking for.</li><li><strong>Agents could see the full pipeline.</strong> No more double-booking. No more "I thought you were handling that customer."</li></ol><h2>Month 6 Numbers</h2><p>By June 2024, Okafor Motors was selling 31 cars per month — a 287% increase. More striking: Emeka was working fewer hours than he was when selling 8 cars per month.</p><blockquote><p>"AutoSys did not just grow my business. It freed me from my business. Now I can think like an owner instead of running around like a salesperson." — Emeka Okafor</p></blockquote>',
  'From 8 to 31 Cars Per Month: Okafor Motors AutoSys Success Story',
  'How Okafor Motors tripled their monthly car sales in 6 months using AutoSys CRM, WhatsApp integration, and inventory management.'
);

-- Update category post counts
update blog_categories bc set post_count = (
  select count(*) from blog_posts bp
  where bp.category_slug = bc.slug and bp.status = 'published'
);

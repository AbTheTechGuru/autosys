'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { NotFoundError } = require('../utils/errors');
const { z }         = require('zod');
const { validate }  = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

const websiteConfigSchema = z.object({
  hero_headline: z.string().max(200).optional(),
  hero_subtext:  z.string().max(500).optional(),
  hero_cta:      z.string().max(100).optional(),
  meta_title:    z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  custom_domain: z.string().max(253).optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  whatsapp_number: z.string().optional(),
  show_prices:   z.boolean().optional(),
  theme:         z.enum(['dark', 'light']).optional(),
});

// ── GET /websites/config ──────────────────────────────────────
router.get('/config', async (req, res) => {
  const { data } = await supabase
    .from('website_configs')
    .select('*')
    .eq('dealer_id', req.auth.dealerId)
    .maybeSingle();

  res.json({
    config: data || {
      hero_headline: 'Find Your Perfect Car',
      hero_subtext:  'Premium vehicles at unbeatable prices.',
      hero_cta:      'Browse Inventory',
      show_prices:   true,
      theme:         'dark',
    },
  });
});

// ── PUT /websites/config ──────────────────────────────────────
router.put('/config', requireRole(['owner', 'admin']), validate({ body: websiteConfigSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('website_configs')
    .upsert({
      dealer_id:  req.auth.dealerId,
      ...req.body,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'dealer_id' })
    .select()
    .single();

  if (error) throw error;
  res.json({ config: data });
});

// ── POST /websites/publish ────────────────────────────────────
router.post('/publish', requireRole(['owner', 'admin']), async (req, res) => {
  await supabase
    .from('website_configs')
    .update({ last_published_at: new Date().toISOString(), is_published: true })
    .eq('dealer_id', req.auth.dealerId);

  res.json({ message: 'Website published', subdomain: req.dealer.subdomain });
});

// ── GET /websites/analytics ───────────────────────────────────
router.get('/analytics', async (req, res) => {
  // Placeholder — integrate with a real analytics provider (Plausible, GA4, etc.)
  res.json({
    page_views:    0,
    unique_visitors: 0,
    lead_conversions: 0,
    bounce_rate:   0,
    note: 'Connect a web analytics provider in Settings → Integrations',
  });
});

module.exports = router;

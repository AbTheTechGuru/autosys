'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { redis }    = require('../config/redis');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/schemas');
const { z }         = require('zod');
const logger        = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

const notificationSchema = z.object({
  new_lead:      z.boolean().optional(),
  payment:       z.boolean().optional(),
  deal_change:   z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
  whatsapp:      z.boolean().optional(),
  email:         z.boolean().optional(),
});

// ── GET /settings ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const [dealerRes, userRes] = await Promise.all([
    supabase.from('dealers').select('*').eq('id', req.auth.dealerId).single(),
    supabase.from('dealer_users').select('id,full_name,email,phone,notification_prefs,avatar_url').eq('id', req.auth.userId).single(),
  ]);

  res.json({ dealer: dealerRes.data, user: userRes.data });
});

// ── PUT /settings/profile ─────────────────────────────────────
router.put('/profile', requireRole(['owner', 'admin']), validate({ body: updateProfileSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('dealers')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.auth.dealerId)
    .select()
    .single();

  if (error) throw error;

  // Bust dealer cache
  await redis.del(`dealer:${req.auth.dealerId}`);

  logger.info({ dealerId: req.auth.dealerId }, 'Dealer profile updated');
  res.json({ dealer: data });
});

// ── PUT /settings/notifications ───────────────────────────────
router.put('/notifications', validate({ body: notificationSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('dealer_users')
    .update({ notification_prefs: req.body })
    .eq('id', req.auth.userId)
    .select('id, notification_prefs')
    .single();

  if (error) throw error;
  res.json({ preferences: data.notification_prefs });
});

// ── GET /settings/api-key ─────────────────────────────────────
router.get('/api-key', requireRole(['owner', 'admin']), async (req, res) => {
  const { data } = await supabase
    .from('api_keys')
    .select('id, key_prefix, created_at, last_used_at')
    .eq('dealer_id', req.auth.dealerId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  res.json({ api_key: data });
});

// ── POST /settings/api-key/regenerate ────────────────────────
router.post('/api-key/regenerate', requireRole(['owner']), async (req, res) => {
  const { v4: uuid } = require('uuid');
  const crypto = require('crypto');

  // Revoke all existing keys
  await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('dealer_id', req.auth.dealerId);

  // Generate new key: prefix_<random>
  const raw    = `as_${uuid().replace(/-/g, '')}`;
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 10);

  const { data } = await supabase
    .from('api_keys')
    .insert({ dealer_id: req.auth.dealerId, key_hash: hash, key_prefix: prefix, created_by: req.auth.userId })
    .select('id, key_prefix, created_at')
    .single();

  logger.info({ dealerId: req.auth.dealerId }, 'API key regenerated');

  // Return the raw key ONCE — we never store it plaintext
  res.json({ api_key: { ...data, key: raw } });
});

// ── PUT /settings/webhook ─────────────────────────────────────
router.put('/webhook', requireRole(['owner', 'admin']), async (req, res) => {
  const { url, events } = req.body;

  const { data, error } = await supabase
    .from('webhook_configs')
    .upsert({
      dealer_id: req.auth.dealerId,
      url,
      events:    events || [],
      updated_at:new Date().toISOString(),
    }, { onConflict: 'dealer_id' })
    .select()
    .single();

  if (error) throw error;
  res.json({ webhook: data });
});

module.exports = router;

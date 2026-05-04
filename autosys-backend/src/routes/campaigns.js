'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requirePlan } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { createCampaignSchema } = require('../validators/schemas');
const { NotFoundError } = require('../utils/errors');
const logger        = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// ── GET /campaigns ────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ campaigns: data || [] });
});

// ── POST /campaigns ───────────────────────────────────────────
router.post('/', requirePlan('pro'), validate({ body: createCampaignSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...req.body, dealer_id: req.auth.dealerId, created_by: req.auth.userId, status: 'draft' })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ campaign: data });
});

// ── POST /campaigns/:id/launch ────────────────────────────────
router.post('/:id/launch', requirePlan('pro'), async (req, res) => {
  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('id', req.params.id).eq('dealer_id', req.auth.dealerId).single();
  if (!campaign) throw new NotFoundError('Campaign');

  // TODO: integrate with actual WhatsApp/Email/SMS provider
  // For now, mark as active and record the launch
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'active', launched_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw error;
  logger.info({ dealerId: req.auth.dealerId, campaignId: req.params.id, type: campaign.type }, 'Campaign launched');
  res.json({ campaign: data });
});

// ── DELETE /campaigns/:id ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('campaigns').delete().eq('id', req.params.id).eq('dealer_id', req.auth.dealerId);
  if (error) throw error;
  res.json({ message: 'Campaign deleted' });
});

// ── GET /automations ──────────────────────────────────────────
// Also served at GET /automations when mounted at /v1/automations in server.js
router.get('/automations', async (req, res) => {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  res.json({ automations: data || [] });
});

// ── PATCH /automations/:id ────────────────────────────────────
router.patch('/automations/:id', async (req, res) => {
  const { enabled } = req.body;
  const { data, error } = await supabase
    .from('automations')
    .update({ enabled })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select().single();

  if (error || !data) throw new NotFoundError('Automation');
  res.json({ automation: data });
});

module.exports = router;

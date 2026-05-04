'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { z }         = require('zod');
const { NotFoundError } = require('../utils/errors');
const logger        = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

const createDealSchema = z.object({
  lead_id:     z.string().uuid().optional(),
  vehicle_id:  z.string().uuid().optional(),
  title:       z.string().min(2).max(200).trim(),
  value:       z.coerce.number().int().min(0),
  stage:       z.enum(['lead','negotiation','payment','delivered']).default('lead'),
  assigned_to: z.string().uuid().optional(),
  notes:       z.string().max(2000).optional(),
});

const updateDealSchema = createDealSchema.partial();

const moveDealSchema = z.object({
  stage: z.enum(['lead','negotiation','payment','delivered']),
  notes: z.string().max(500).optional(),
});

// ── GET /deals ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*, lead:leads(id,name,phone), vehicle:vehicles(id,brand,model,year,price), assigned:users!assigned_to(id,name)')
    .eq('dealer_id', req.auth.dealerId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  res.json({ deals: data || [] });
});

// ── POST /deals ───────────────────────────────────────────────
router.post('/', validate({ body: createDealSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .insert({ ...req.body, dealer_id: req.auth.dealerId, created_by: req.auth.userId })
    .select()
    .single();

  if (error) throw error;
  logger.info({ dealerId: req.auth.dealerId, dealId: data.id }, 'Deal created');
  res.status(201).json({ deal: data });
});

// ── PATCH /deals/:id/stage ────────────────────────────────────
router.patch('/:id/stage', validate({ body: moveDealSchema }), async (req, res) => {
  const { data: existing } = await supabase
    .from('deals').select('id,stage').eq('id', req.params.id).eq('dealer_id', req.auth.dealerId).single();
  if (!existing) throw new NotFoundError('Deal');

  const { data, error } = await supabase
    .from('deals')
    .update({ stage: req.body.stage, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select().single();

  if (error) throw error;

  await supabase.from('deal_events').insert({
    deal_id:   req.params.id,
    dealer_id: req.auth.dealerId,
    user_id:   req.auth.userId,
    action:    'stage_changed',
    details:   { from: existing.stage, to: req.body.stage, notes: req.body.notes },
  });

  res.json({ deal: data });
});

// ── PUT /deals/:id ────────────────────────────────────────────
router.put('/:id', validate({ body: updateDealSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select().single();

  if (error || !data) throw new NotFoundError('Deal');
  res.json({ deal: data });
});

// ── DELETE /deals/:id ─────────────────────────────────────────
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  const { error } = await supabase
    .from('deals').delete().eq('id', req.params.id).eq('dealer_id', req.auth.dealerId);
  if (error) throw error;
  res.json({ message: 'Deal deleted' });
});

module.exports = router;

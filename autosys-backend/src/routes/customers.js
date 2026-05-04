'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate);

/**
 * Customers = leads with stage 'closed_won'.
 * They are a view over the leads table, not a separate entity.
 */

// ── GET /customers ────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let q = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('dealer_id', req.auth.dealerId)
    .eq('stage', 'closed_won');

  if (search) {
    q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  q = q.order('updated_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  res.setHeader('X-Total-Count', count || 0);
  res.json({ customers: data || [], total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── GET /customers/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*, timeline:lead_events(*)')
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (error || !data) throw new NotFoundError('Customer');
  res.json({ customer: data });
});

// ── PUT /customers/:id ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { notes, vehicle_interest, budget, assigned_to } = req.body;

  const { data, error } = await supabase
    .from('leads')
    .update({ notes, vehicle_interest, budget, assigned_to, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .eq('stage', 'closed_won')
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Customer');
  res.json({ customer: data });
});

module.exports = router;

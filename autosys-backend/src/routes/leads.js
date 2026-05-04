'use strict';

require('express-async-errors');
const express  = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createLeadSchema, updateLeadSchema, updateLeadStageSchema, addNoteSchema, listLeadsSchema,
} = require('../validators/schemas');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// ── Verify lead belongs to dealer ────────────────────────────
async function getLead(leadId, dealerId) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('dealer_id', dealerId)
    .single();
  if (error || !data) throw new NotFoundError('Lead');
  return data;
}

// ── GET /leads ────────────────────────────────────────────────
router.get('/', validate({ query: listLeadsSchema }), async (req, res) => {
  const { page, limit, sort, order, stage, source, assigned_to, search } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('leads')
    .select('*, assigned_user:dealer_users!assigned_to(id,full_name)', { count: 'exact' })
    .eq('dealer_id', req.auth.dealerId);

  if (stage && stage !== 'all') query = query.eq('stage', stage);
  if (source) query = query.eq('source', source);
  if (assigned_to) query = query.eq('assigned_to', assigned_to);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,vehicle_interest.ilike.%${search}%`);

  // Agents only see their own leads
  if (req.auth.role === 'agent') {
    query = query.eq('assigned_to', req.auth.userId);
  }

  query = query
    .order(sort || 'created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  res.setHeader('X-Total-Count', count || 0);
  res.json({ leads: data, total: count, page, limit });
});

// ── POST /leads ───────────────────────────────────────────────
router.post('/', validate({ body: createLeadSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...req.body, dealer_id: req.auth.dealerId, created_by: req.auth.userId })
    .select()
    .single();

  if (error) throw error;

  logger.info({ dealerId: req.auth.dealerId, leadId: data.id }, 'Lead created');
  res.status(201).json({ lead: data });
});

// ── GET /leads/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const lead = await getLead(req.params.id, req.auth.dealerId);

  // Fetch timeline
  const { data: timeline } = await supabase
    .from('lead_events')
    .select('*')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false });

  res.json({ lead: { ...lead, timeline: timeline || [] } });
});

// ── PUT /leads/:id ────────────────────────────────────────────
router.put('/:id', validate({ body: updateLeadSchema }), async (req, res) => {
  await getLead(req.params.id, req.auth.dealerId);

  const { data, error } = await supabase
    .from('leads')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select()
    .single();

  if (error) throw error;
  res.json({ lead: data });
});

// ── PATCH /leads/:id/stage ────────────────────────────────────
router.patch('/:id/stage', validate({ body: updateLeadStageSchema }), async (req, res) => {
  const lead = await getLead(req.params.id, req.auth.dealerId);
  const { stage, notes } = req.body;

  const { data, error } = await supabase
    .from('leads')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', lead.id)
    .select()
    .single();

  if (error) throw error;

  // Write timeline event
  await supabase.from('lead_events').insert({
    lead_id:   lead.id,
    dealer_id: req.auth.dealerId,
    user_id:   req.auth.userId,
    action:    'stage_changed',
    details:   { from: lead.stage, to: stage, notes },
  });

  res.json({ lead: data });
});

// ── POST /leads/:id/notes ─────────────────────────────────────
router.post('/:id/notes', validate({ body: addNoteSchema }), async (req, res) => {
  const lead = await getLead(req.params.id, req.auth.dealerId);

  const { data, error } = await supabase
    .from('lead_events')
    .insert({
      lead_id:   lead.id,
      dealer_id: req.auth.dealerId,
      user_id:   req.auth.userId,
      action:    'note',
      details:   { content: req.body.content },
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ event: data });
});

// ── DELETE /leads/:id ─────────────────────────────────────────
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  await getLead(req.params.id, req.auth.dealerId);

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId);

  if (error) throw error;
  res.json({ message: 'Lead deleted' });
});

// ── Public capture (website widget — no auth) ─────────────────
// Exported separately for server.js public routes
const capture = async (req, res) => {
  const { dealerSubdomain } = req.params;

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name, plan')
    .eq('subdomain', dealerSubdomain)
    .eq('is_active', true)
    .single();

  if (!dealer) throw new NotFoundError('Dealer');

  const schema = require('../validators/schemas').createLeadSchema.pick({
    name: true, phone: true, email: true, vehicle_interest: true, notes: true,
  });
  const body = schema.parse(req.body);

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ ...body, dealer_id: dealer.id, source: 'website' })
    .select('id')
    .single();

  if (error) throw error;

  res.status(201).json({ success: true, lead_id: lead.id });
};

module.exports = router;
module.exports.capture = capture;

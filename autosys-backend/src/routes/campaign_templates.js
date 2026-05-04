'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requirePlan } = require('../middleware/auth');
const { NotFoundError } = require('../utils/errors');

const router = express.Router();
router.use(authenticate);

// Built-in templates (always available, not dealer-scoped)
const BUILTIN_TEMPLATES = [
  { id:'tpl-1', name:'Flash Sale Blast',    type:'whatsapp',  category:'sales',     description:'Urgent discount offer with emoji and CTA',           is_builtin: true },
  { id:'tpl-2', name:'New Arrival Alert',   type:'whatsapp',  category:'inventory', description:'Announce a new vehicle in stock',                    is_builtin: true },
  { id:'tpl-3', name:'Monthly Newsletter',  type:'email',     category:'retention', description:'Professional HTML email digest for existing customers',is_builtin: true },
  { id:'tpl-4', name:'Instagram Caption',   type:'instagram', category:'social',    description:'Engaging visual post with hashtags',                  is_builtin: true },
  { id:'tpl-5', name:'Follow-Up SMS',       type:'sms',       category:'leads',     description:'Short follow-up for uncontacted leads',               is_builtin: true },
  { id:'tpl-6', name:'Test Drive Invite',   type:'whatsapp',  category:'sales',     description:'Invite warm leads for a test drive',                  is_builtin: true },
  { id:'tpl-7', name:'Payment Reminder',    type:'sms',       category:'payments',  description:'Gentle reminder for pending payment',                 is_builtin: true },
  { id:'tpl-8', name:'Referral Request',    type:'whatsapp',  category:'retention', description:'Ask satisfied customers for referrals',               is_builtin: true },
];

// ── GET /campaign-templates ───────────────────────────────────
router.get('/', async (req, res) => {
  const { type, category } = req.query;

  // Fetch dealer custom templates
  const { data: custom } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false });

  let builtin = BUILTIN_TEMPLATES;
  if (type)     builtin = builtin.filter((t) => t.type === type);
  if (category) builtin = builtin.filter((t) => t.category === category);

  res.json({ templates: [...builtin, ...(custom || [])] });
});

// ── POST /campaign-templates ──────────────────────────────────
router.post('/', requirePlan('pro'), async (req, res) => {
  const { name, type, message, category } = req.body;

  if (!name || !type || !message) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, type, and message are required' });
  }

  const { data, error } = await supabase
    .from('campaign_templates')
    .insert({
      dealer_id: req.auth.dealerId,
      name,
      type,
      message,
      category: category || 'custom',
      created_by: req.auth.userId,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ template: data });
});

// ── DELETE /campaign-templates/:id ────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('campaign_templates')
    .delete()
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId);

  if (error) throw error;
  res.json({ message: 'Template deleted' });
});

module.exports = router;

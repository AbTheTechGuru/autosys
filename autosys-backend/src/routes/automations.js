'use strict';

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { NotFoundError, AppError } = require('../utils/errors');
const { engine, TRIGGERS, ACTIONS } = require('../services/automation.engine');

const router = express.Router();
router.use(authenticate);

// ── GET /automations — list all automations ───────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ automations: data || [] });
});

// ── GET /automations/meta — return trigger/action enums ───────
router.get('/meta', (_req, res) => {
  res.json({ triggers: Object.values(TRIGGERS), actions: Object.values(ACTIONS) });
});

// ── GET /automations/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (error || !data) throw new NotFoundError('Automation');
  res.json({ automation: data });
});

// ── POST /automations — create new automation ─────────────────
router.post('/', async (req, res) => {
  const {
    name, trigger, conditions = [], actions, enabled = true, config = {},
    // Legacy: single action
    action,
  } = req.body;

  if (!trigger) throw new AppError('trigger is required', 400, 'VALIDATION_ERROR');
  if (!actions && !action) throw new AppError('actions[] is required', 400, 'VALIDATION_ERROR');

  // Support both old shape (action: string) and new shape (actions: Action[])
  const actionsArr = actions || [{ type: action, config }];

  const { data, error } = await supabase
    .from('automations')
    .insert({
      dealer_id:  req.auth.dealerId,
      name:       name || `${trigger} automation`,
      trigger,
      conditions,
      actions:    actionsArr,
      action,    // Legacy field — keep for backward compat
      enabled,
      config,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ automation: data });
});

// ── PUT /automations/:id — full update ───────────────────────
router.put('/:id', async (req, res) => {
  const { name, trigger, conditions, actions, enabled, config } = req.body;

  const { data, error } = await supabase
    .from('automations')
    .update({ name, trigger, conditions, actions, enabled, config, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Automation');
  res.json({ automation: data });
});

// ── PATCH /automations/:id — toggle enabled ───────────────────
router.patch('/:id', async (req, res) => {
  const { enabled } = req.body;

  const { data, error } = await supabase
    .from('automations')
    .update({ enabled })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Automation');
  res.json({ automation: data });
});

// ── DELETE /automations/:id ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId);

  if (error) throw error;
  res.json({ success: true });
});

// ── POST /automations/test — manually fire a trigger (dev/testing) ──
router.post('/test-trigger', async (req, res) => {
  const { trigger, payload = {} } = req.body;
  if (!trigger) throw new AppError('trigger is required', 400, 'VALIDATION_ERROR');

  await engine.fire(trigger, { ...payload, _test: true }, req.auth.dealerId);
  res.json({ success: true, message: `Trigger '${trigger}' fired for testing` });
});

module.exports = router;

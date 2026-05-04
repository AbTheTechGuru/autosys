'use strict';

const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { NotFoundError, AppError } = require('../utils/errors');
const { engine, TRIGGERS } = require('../services/automation.engine');

const router = express.Router();
router.use(authenticate);

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════

// GET /calendar/tasks
router.get('/tasks', async (req, res) => {
  const { status, assignedTo, leadId, from, to } = req.query;

  let query = supabase
    .from('tasks')
    .select(`
      *,
      leads(id, name, phone),
      deals(id, stage)
    `)
    .eq('dealer_id', req.auth.dealerId)
    .order('due_date', { ascending: true });

  if (status)     query = query.eq('status', status);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (leadId)     query = query.eq('lead_id', leadId);
  if (from)       query = query.gte('due_date', from);
  if (to)         query = query.lte('due_date', to);

  const { data, error } = await query;
  if (error) throw error;

  res.json({ tasks: data || [] });
});

// POST /calendar/tasks
router.post('/tasks', async (req, res) => {
  const {
    title, description, dueDate, assignedTo,
    leadId, dealId, priority = 'medium', type = 'task',
  } = req.body;

  if (!title || !dueDate) throw new AppError('title and dueDate required', 400, 'VALIDATION_ERROR');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      dealer_id:   req.auth.dealerId,
      title,
      description: description || '',
      due_date:    dueDate,
      assigned_to: assignedTo,
      lead_id:     leadId,
      deal_id:     dealId,
      priority,
      type,
      status:      'pending',
      created_by:  req.auth.userId,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ task: data });
});

// PATCH /calendar/tasks/:id
router.patch('/tasks/:id', async (req, res) => {
  const allowed = ['title', 'description', 'due_date', 'assigned_to', 'status', 'priority'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Task');
  res.json({ task: data });
});

// DELETE /calendar/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  await supabase.from('tasks')
    .delete().eq('id', req.params.id).eq('dealer_id', req.auth.dealerId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
// CALENDAR EVENTS
// ══════════════════════════════════════════════════════════════

// GET /calendar/events
router.get('/events', async (req, res) => {
  const { from, to, type, assignedTo } = req.query;

  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      leads(id, name, phone),
      deals(id, stage)
    `)
    .eq('dealer_id', req.auth.dealerId)
    .order('start_time', { ascending: true });

  if (from)       query = query.gte('start_time', from);
  if (to)         query = query.lte('start_time', to);
  if (type)       query = query.eq('type', type);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);

  const { data, error } = await query;
  if (error) throw error;
  res.json({ events: data || [] });
});

// POST /calendar/events
router.post('/events', async (req, res) => {
  const {
    title, description, startTime, endTime,
    leadId, dealId, assignedTo, type = 'appointment', location,
  } = req.body;

  if (!title || !startTime) throw new AppError('title and startTime required', 400, 'VALIDATION_ERROR');

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      dealer_id:   req.auth.dealerId,
      title,
      description: description || '',
      start_time:  startTime,
      end_time:    endTime || new Date(new Date(startTime).getTime() + 3600000).toISOString(),
      lead_id:     leadId,
      deal_id:     dealId,
      assigned_to: assignedTo,
      type,
      location:    location || '',
      created_by:  req.auth.userId,
      status:      'confirmed',
    })
    .select()
    .single();

  if (error) throw error;

  // Fire automation if linked to a lead
  if (leadId) {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    await engine.fire('calendar.event_created', { event: data, lead }, req.auth.dealerId);
  }

  res.status(201).json({ event: data });
});

// PATCH /calendar/events/:id
router.patch('/events/:id', async (req, res) => {
  const allowed = ['title', 'description', 'start_time', 'end_time', 'assigned_to', 'status', 'location', 'type'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Calendar event');
  res.json({ event: data });
});

// DELETE /calendar/events/:id
router.delete('/events/:id', async (req, res) => {
  await supabase.from('calendar_events')
    .delete().eq('id', req.params.id).eq('dealer_id', req.auth.dealerId);
  res.json({ success: true });
});

// GET /calendar/overview — combined tasks + events for a date range
router.get('/overview', async (req, res) => {
  const { from = new Date().toISOString(), to } = req.query;
  const toDate = to || new Date(Date.now() + 30 * 86400000).toISOString();

  const [tasks, events] = await Promise.all([
    supabase.from('tasks').select('*')
      .eq('dealer_id', req.auth.dealerId)
      .gte('due_date', from).lte('due_date', toDate)
      .order('due_date'),
    supabase.from('calendar_events').select('*')
      .eq('dealer_id', req.auth.dealerId)
      .gte('start_time', from).lte('start_time', toDate)
      .order('start_time'),
  ]);

  res.json({ tasks: tasks.data || [], events: events.data || [] });
});

module.exports = router;

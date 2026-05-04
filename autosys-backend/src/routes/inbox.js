'use strict';

const express              = require('express');
const { supabase }         = require('../config/supabase');
const { authenticate }     = require('../middleware/auth');
const { AppError }         = require('../utils/errors');
const communicationService = require('../services/communication.service');

const router = express.Router();
router.use(authenticate);

// GET /inbox — paginated unified message list
router.get('/', async (req, res) => {
  const { channel, page = 1, limit = 30, leadId, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('messages')
    .select(`
      id, channel, direction, body, subject, status, created_at,
      lead_id, from_number, to_number, provider,
      leads(id, name, phone, email, stage, avatar_url)
    `, { count: 'exact' })
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (channel) query = query.eq('channel', channel);
  if (leadId)  query = query.eq('lead_id', leadId);
  if (search)  query = query.ilike('body', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    messages: data || [],
    total:    count || 0,
    page:     Number(page),
    limit:    Number(limit),
  });
});

// GET /inbox/conversations — grouped by lead (conversation view)
router.get('/conversations', async (req, res) => {
  const { channel, limit = 20 } = req.query;

  // Get latest message per lead
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, channel, direction, body, status, created_at, lead_id,
      leads!inner(id, name, phone, email, stage)
    `)
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false })
    .limit(Number(limit) * 3); // Fetch more, then deduplicate by lead

  if (error) throw error;

  // Group by lead and get latest
  const seen = new Set();
  const convs = (data || []).filter((m) => {
    if (seen.has(m.lead_id)) return false;
    seen.add(m.lead_id);
    return true;
  }).slice(0, Number(limit));

  res.json({ conversations: convs });
});

// GET /inbox/thread/:leadId — full thread for a lead
router.get('/thread/:leadId', async (req, res) => {
  const { channel } = req.query;
  const thread = await communicationService.getThread(req.auth.dealerId, req.params.leadId);

  const filtered = channel ? thread.filter((m) => m.channel === channel) : thread;
  res.json({ messages: filtered });
});

// POST /inbox/send — send a message from the inbox UI
router.post('/send', async (req, res) => {
  const { leadId, channel, message, subject } = req.body;

  if (!leadId || !channel || !message)
    throw new AppError('leadId, channel, and message are required', 400, 'VALIDATION_ERROR');

  // Fetch lead to get contact details
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, name, phone, email')
    .eq('id', leadId)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (error || !lead) throw new AppError('Lead not found', 404, 'NOT_FOUND');

  // Get dealer country for SMS routing
  const dealer = req.dealer;

  let result;
  switch (channel) {
    case 'whatsapp':
      if (!lead.phone) throw new AppError('Lead has no phone number', 400, 'NO_PHONE');
      result = await communicationService.sendWhatsApp(
        req.auth.dealerId, leadId, lead.phone, message, req.auth.userId
      );
      break;

    case 'sms':
      if (!lead.phone) throw new AppError('Lead has no phone number', 400, 'NO_PHONE');
      result = await communicationService.sendSms(
        req.auth.dealerId, leadId, lead.phone, message, dealer?.country || 'US'
      );
      break;

    case 'email':
      if (!lead.email) throw new AppError('Lead has no email address', 400, 'NO_EMAIL');
      result = await communicationService.sendEmail(
        req.auth.dealerId, leadId, lead.email,
        subject || `Message from AutoSys`, `<p>${message}</p>`, message
      );
      break;

    default:
      throw new AppError(`Unknown channel: ${channel}`, 400, 'UNKNOWN_CHANNEL');
  }

  res.json({ success: true, result });
});

// POST /inbox/call — initiate a phone call
router.post('/call', async (req, res) => {
  const { phone, method = 'tel' } = req.body;
  if (!phone) throw new AppError('phone is required', 400, 'VALIDATION_ERROR');

  const result = await communicationService.initiateCall(phone, method);
  res.json({ success: true, ...result });
});

// POST /inbox/whatsapp-webhook — Meta sends messages here
// This is also registered as a public route in server.js
router.post('/whatsapp-webhook', async (req, res) => {
  const { dealerId } = req.params; // resolved from subdomain or API key
  const body = req.body;

  try {
    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        const contacts = change.value?.contacts || [];

        for (let i = 0; i < messages.length; i++) {
          await communicationService.handleIncomingWhatsApp(
            dealerId || req.auth?.dealerId,
            messages[i],
            contacts[i] || {},
          );
        }
      }
    }
  } catch (err) {
    // Always 200 to Meta to prevent retry storms
  }

  res.sendStatus(200);
});

module.exports = router;

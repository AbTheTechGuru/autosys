'use strict';

/**
 * AutoSys AI Routes
 *
 * FIXES:
 *  1. `requirePlan` was imported from '../middleware/auth' but that function
 *     didn't exist in the original auth.js — crash on startup.
 *     requirePlan is now defined in the fixed auth.js middleware.
 *  2. `router.use(authenticate)` was called here AND in server.js — double auth.
 *     Removed the redundant call (server.js applies authenticate at mount time).
 *  3. `req.auth.plan` used inside /ai/chat but req.auth was not guaranteed to
 *     have `plan` — safely falls back to req.dealer.plan.
 *  4. AI description endpoint was named `generateDescription` in service but
 *     the route called `aiService.generateDescription` — no issue there, confirmed correct.
 *  5. generateVehicleDescription vs generateDescription naming inconsistency in
 *     ai.service.js — route calls `aiService.generateDescription` but service
 *     exports `generateVehicleDescription`. Fixed the route to match service method name.
 */

require('express-async-errors');
const express          = require('express');
const { requirePlan }  = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const {
  aiDescriptionSchema,
  aiPricingSchema,
  aiFollowupSchema,
  aiSocialSchema,
  aiChatSchema,
} = require('../validators/schemas');
const aiService        = require('../services/ai.service');
const { supabase }     = require('../config/supabase');
const { NotFoundError } = require('../utils/errors');
const logger            = require('../utils/logger');

const router = express.Router();
// authenticate is applied in server.js — do NOT add router.use(authenticate) here

// ── POST /ai/description ──────────────────────────────────────
// FIX: service method is named generateVehicleDescription, not generateDescription
router.post('/description', validate({ body: aiDescriptionSchema }), async (req, res) => {
  const text = await aiService.generateVehicleDescription(req.body);
  logger.info({ dealerId: req.auth.dealerId, action: 'ai.description' }, 'AI description generated');
  res.json({ text });
});

// ── POST /ai/pricing ──────────────────────────────────────────
router.post('/pricing', validate({ body: aiPricingSchema }), async (req, res) => {
  const text = await aiService.suggestPricing(req.body);
  logger.info({ dealerId: req.auth.dealerId, action: 'ai.pricing' }, 'AI pricing generated');
  res.json({ text });
});

// ── POST /ai/followup ─────────────────────────────────────────
router.post('/followup', validate({ body: aiFollowupSchema }), async (req, res) => {
  const { lead_id } = req.body;

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, name, vehicle_interest, stage, budget, source, notes, last_contacted_at, created_at')
    .eq('id', lead_id)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (error || !lead) throw new NotFoundError('Lead');

  const text = await aiService.generateFollowup({ lead, dealerName: req.dealer.name });

  logger.info({ dealerId: req.auth.dealerId, leadId: lead_id, action: 'ai.followup' }, 'AI follow-up generated');
  res.json({ text });
});

// ── POST /ai/social ───────────────────────────────────────────
router.post('/social', requirePlan('pro'), validate({ body: aiSocialSchema }), async (req, res) => {
  const text = await aiService.generateSocialPosts({
    vehicle:        req.body,
    dealerName:     req.dealer.name,
    dealerLocation: req.dealer.city || 'Lagos',
  });

  logger.info({ dealerId: req.auth.dealerId, action: 'ai.social' }, 'AI social posts generated');
  res.json({ text });
});

// ── POST /ai/chat ─────────────────────────────────────────────
router.post('/chat', validate({ body: aiChatSchema }), async (req, res) => {
  const { messages } = req.body;

  const text = await aiService.chat({
    messages,
    dealerContext: {
      name: req.dealer.name,
      // FIX: safely fall back to dealer.plan if req.auth.plan is undefined
      plan: req.auth.plan || req.dealer.plan,
      city: req.dealer.city,
    },
  });

  res.json({ text });
});

// ── POST /ai/whatsapp-reply ───────────────────────────────────
router.post('/whatsapp-reply', async (req, res) => {
  const { customer_name, vehicle_interest, last_message } = req.body;
  const text = await aiService.generateWhatsappReply({
    customerName:    customer_name,
    vehicleInterest: vehicle_interest,
    lastMessage:     last_message,
    dealerName:      req.dealer.name,
  });
  res.json({ text });
});

// ── POST /ai/campaign-message ─────────────────────────────────
router.post('/campaign-message', requirePlan('pro'), async (req, res) => {
  const { name, type, audience } = req.body;
  const text = await aiService.generateCampaignMessage({
    name, type, audience, dealerName: req.dealer.name,
  });
  res.json({ text });
});

// ── POST /ai/score-lead/:leadId ───────────────────────────────
router.post('/score-lead/:leadId', async (req, res) => {
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', req.params.leadId)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (!lead) throw new NotFoundError('Lead');

  const result = await aiService.scoreLead({ lead });
  await supabase.from('leads').update({ ai_score: result.score }).eq('id', lead.id);

  res.json(result);
});

module.exports = router;

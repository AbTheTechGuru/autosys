'use strict';

require('express-async-errors');
const express      = require('express');
const crypto       = require('crypto');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const env          = require('../config/env');
const { AppError } = require('../utils/errors');
const logger       = require('../utils/logger');

const router = express.Router();

// ── Protected routes ──────────────────────────────────────────
router.use(authenticate);

// ── GET /payments ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (error) throw error;

  res.setHeader('X-Total-Count', count || 0);
  res.json({
    transactions: data || [],
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// ── GET /payments/summary ─────────────────────────────────────
router.get('/summary', async (req, res) => {
  const did = req.auth.dealerId;

  const [total, thisMonth, pending] = await Promise.all([
    supabase.from('transactions').select('amount').eq('dealer_id', did).eq('status', 'success'),
    supabase.from('transactions').select('amount').eq('dealer_id', did).eq('status', 'success')
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
    supabase.from('transactions').select('amount').eq('dealer_id', did).eq('status', 'pending'),
  ]);

  const sum = (rows) => (rows.data || []).reduce((s, r) => s + (r.amount || 0), 0);

  res.json({
    total_revenue: sum(total),
    this_month:    sum(thisMonth),
    pending:       sum(pending),
    count:         total.data?.length || 0,
  });
});

// ── POST /payments/initiate ───────────────────────────────────
router.post('/initiate', async (req, res) => {
  const { amount, email, metadata, gateway = 'paystack' } = req.body;

  if (!amount || amount < 10000) {
    throw new AppError('Minimum payment amount is ₦100', 400, 'INVALID_AMOUNT');
  }

  const reference = `ASY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  await supabase.from('transactions').insert({
    dealer_id:  req.auth.dealerId,
    reference,
    amount,
    email,
    gateway,
    status:     'pending',
    metadata:   metadata || {},
    created_by: req.auth.userId,
  });

  if (gateway === 'paystack') {
    res.json({ authorization_url: `https://checkout.paystack.com/${reference}`, reference });
  } else {
    res.json({ payment_link: `https://checkout.flutterwave.com/${reference}`, reference });
  }
});

// ── GET /payments/verify/:reference ──────────────────────────
router.get('/verify/:reference', async (req, res) => {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference', req.params.reference)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (!data) throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  res.json({ transaction: data });
});

// ── Paystack webhook (exported — no router auth middleware) ───
const paystackWebhook = async (req, res) => {
  // Reject in production if secret is not configured
  if (!env.PAYSTACK_WEBHOOK_SECRET) {
    if (env.NODE_ENV === 'production') {
      logger.error('PAYSTACK_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(401).json({ error: 'Webhook secret not configured' });
    }
    // Dev-only: process without verification for local testing
    logger.warn('PAYSTACK_WEBHOOK_SECRET not set — skipping HMAC (dev only)');
  } else {
    // Verify HMAC signature
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('Paystack webhook: signature mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let event;
  try {
    event = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  logger.info({ event: event.event, reference: event.data?.reference }, 'Paystack webhook received');

  if (event.event === 'charge.success') {
    const { reference } = event.data;
    await supabase
      .from('transactions')
      .update({
        status:           'success',
        paid_at:          new Date().toISOString(),
        gateway_response: event.data,
      })
      .eq('reference', reference);
  }

  return res.status(200).json({ received: true });
};

// ── Flutterwave webhook (exported — no router auth middleware) ─
const flutterwaveWebhook = async (req, res) => {
  if (!env.FLUTTERWAVE_WEBHOOK_SECRET) {
    if (env.NODE_ENV === 'production') {
      logger.error('FLUTTERWAVE_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(401).json({ error: 'Webhook secret not configured' });
    }
    logger.warn('FLUTTERWAVE_WEBHOOK_SECRET not set — skipping verification (dev only)');
  } else {
    if (req.headers['verif-hash'] !== env.FLUTTERWAVE_WEBHOOK_SECRET) {
      logger.warn('Flutterwave webhook: signature mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let event;
  try {
    event = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  logger.info({ event: event.event, txRef: event.data?.tx_ref }, 'Flutterwave webhook received');

  if (event.event === 'charge.completed' && event.data?.status === 'successful') {
    await supabase
      .from('transactions')
      .update({
        status:           'success',
        paid_at:          new Date().toISOString(),
        gateway_response: event.data,
      })
      .eq('reference', event.data.tx_ref);
  }

  return res.status(200).json({ received: true });
};

module.exports = router;
module.exports.paystackWebhook    = paystackWebhook;
module.exports.flutterwaveWebhook = flutterwaveWebhook;

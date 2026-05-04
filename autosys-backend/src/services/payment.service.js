'use strict';

/**
 * AutoSys Payment Service
 *
 * FIXES:
 *  1. CRITICAL SECURITY: Paystack webhook HMAC comparison used `===` (string
 *     equality) instead of `crypto.timingSafeEqual`. This is vulnerable to
 *     timing attacks that can bypass signature verification. Fixed.
 *  2. CRITICAL SECURITY: Flutterwave webhook was comparing `req.headers['verif-hash']`
 *     to an env var, but that env var check was missing and would always be falsy —
 *     any request to the webhook was accepted without authentication. Fixed.
 *  3. Stripe webhook used the correct `stripe.webhooks.constructEvent()` pattern,
 *     but the raw body was not being passed as a Buffer — it was being stringified
 *     first, causing signature failures. server.js now applies express.raw() before
 *     this handler; this service expects a Buffer.
 *  4. `handlePaystackWebhook` referenced `this.supabase` but no supabase instance
 *     was set on `this` — crash. Uses the module-level supabase import instead.
 *  5. All webhook handlers returned undefined on success — server.js then crashed
 *     trying to call res.json(undefined). Each now returns a plain object.
 *  6. initializePayment was returning the full axios response object instead of
 *     just the authorization_url and reference.
 */

'use strict';

const crypto     = require('crypto');
const axios      = require('axios');
const Stripe     = require('stripe');
const { supabase } = require('../config/supabase');
const { AppError } = require('../utils/errors');
const logger     = require('../utils/logger');
const env        = require('../config/env');

// Lazy-init Stripe only if keys are configured
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

class PaymentService {

  // ── Initialize payment ────────────────────────────────────
  async initializePayment({ dealerId, dealId, amount, currency, email, provider }) {
    const reference = `autosys-${dealerId}-${dealId}-${Date.now()}`;

    if (provider === 'paystack') {
      const { data } = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        { email, amount: amount * 100, currency, reference, metadata: { dealerId, dealId } },
        { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } },
      );
      // FIX: return just the needed fields, not the full axios wrapper
      return {
        provider:          'paystack',
        authorization_url: data.data.authorization_url,
        reference:         data.data.reference,
        access_code:       data.data.access_code,
      };
    }

    if (provider === 'flutterwave') {
      const { data } = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref:       reference,
          amount,
          currency:     currency || 'NGN',
          redirect_url: `${env.FRONTEND_URL}/app/payments/verify`,
          customer:     { email },
          meta:         { dealerId, dealId },
        },
        { headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` } },
      );
      return {
        provider:          'flutterwave',
        authorization_url: data.data.link,
        reference,
      };
    }

    if (provider === 'stripe') {
      if (!stripe) throw new AppError('Stripe is not configured.', 500, 'STRIPE_NOT_CONFIGURED');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency, product_data: { name: `Deal #${dealId}` }, unit_amount: amount * 100 }, quantity: 1 }],
        mode:       'payment',
        success_url: `${env.FRONTEND_URL}/app/payments/success?ref=${reference}`,
        cancel_url:  `${env.FRONTEND_URL}/app/payments/cancel`,
        metadata:   { dealerId, dealId, reference },
      });
      return {
        provider:          'stripe',
        authorization_url: session.url,
        reference,
        session_id:        session.id,
      };
    }

    throw new AppError(`Unsupported payment provider: ${provider}`, 400, 'INVALID_PROVIDER');
  }

  // ── Paystack webhook ──────────────────────────────────────
  async handlePaystackWebhook(rawBody, signature) {
    if (!env.PAYSTACK_SECRET_KEY) throw new AppError('Paystack not configured', 500, 'PAYSTACK_NOT_CONFIGURED');

    const expected = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    // FIX: use timingSafeEqual to prevent timing attacks
    const sigBuf  = Buffer.from(signature || '', 'hex');
    const expBuf  = Buffer.from(expected, 'hex');
    const isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!isValid) {
      logger.warn('Paystack webhook: invalid signature');
      throw new AppError('Invalid Paystack signature', 401, 'INVALID_SIGNATURE');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());

    if (event.event === 'charge.success') {
      await this._recordPayment({
        reference: event.data.reference,
        amount:    event.data.amount / 100,
        currency:  event.data.currency,
        provider:  'paystack',
        status:    'success',
        metadata:  event.data.metadata,
      });
    }

    // FIX: return an object so server.js can call res.json(result)
    return { received: true };
  }

  // ── Flutterwave webhook ───────────────────────────────────
  async handleFlutterwaveWebhook(rawBody, signature) {
    // FIX: was always accepting — verif-hash check was missing the env var
    const secret = env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) throw new AppError('Flutterwave not configured', 500, 'FLW_NOT_CONFIGURED');

    if (!signature || signature !== env.FLUTTERWAVE_WEBHOOK_SECRET) {
      logger.warn('Flutterwave webhook: invalid signature');
      throw new AppError('Invalid Flutterwave signature', 401, 'INVALID_SIGNATURE');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());

    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      await this._recordPayment({
        reference: event.data.tx_ref,
        amount:    event.data.amount,
        currency:  event.data.currency,
        provider:  'flutterwave',
        status:    'success',
        metadata:  event.data.meta,
      });
    }

    return { received: true };
  }

  // ── Stripe webhook ────────────────────────────────────────
  async handleStripeWebhook(rawBody, signature) {
    if (!stripe) throw new AppError('Stripe not configured', 500, 'STRIPE_NOT_CONFIGURED');

    let event;
    try {
      // FIX: rawBody must be a Buffer (express.raw() applied in server.js)
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err: err.message }, 'Stripe webhook: invalid signature');
      throw new AppError(`Stripe webhook error: ${err.message}`, 401, 'INVALID_SIGNATURE');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this._recordPayment({
        reference: session.metadata.reference,
        amount:    session.amount_total / 100,
        currency:  session.currency.toUpperCase(),
        provider:  'stripe',
        status:    'success',
        metadata:  session.metadata,
      });
    }

    return { received: true };
  }

  // ── Internal: record payment in DB ────────────────────────
  async _recordPayment({ reference, amount, currency, provider, status, metadata }) {
    const dealId   = metadata?.dealId   || metadata?.deal_id;
    const dealerId = metadata?.dealerId || metadata?.dealer_id;

    // Idempotency: skip if already recorded
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();

    if (existing) {
      logger.info({ reference }, 'Payment already recorded, skipping');
      return;
    }

    const { error: txErr } = await supabase.from('transactions').insert({
      reference, amount, currency, provider, status,
      deal_id:   dealId   || null,
      dealer_id: dealerId || null,
    });

    if (txErr) {
      logger.error({ err: txErr, reference }, 'Failed to record transaction');
      throw txErr;
    }

    // Advance deal stage if applicable
    if (dealId && status === 'success') {
      await supabase.from('deals')
        .update({ stage: 'paperwork' })
        .eq('id', dealId)
        .in('stage', ['offer', 'negotiation', 'payment']);
    }

    logger.info({ reference, amount, currency, provider, dealId }, 'Payment recorded');
  }
}

module.exports = new PaymentService();

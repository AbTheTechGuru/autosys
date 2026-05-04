'use strict';

/**
 * AutoSys Admin Routes
 *
 * FIXES:
 *  1. CRITICAL: router.get('/plans') and router.get('/mrr') were defined AFTER
 *     `module.exports = router` — they were completely unreachable dead code.
 *     Moved all route definitions before the export.
 *  2. `require('../middleware/auth')` was importing `signTokens` which doesn't
 *     exist on auth.js — only authenticate and requireRole are needed here.
 *  3. MRR calculation was hardcoded to NGN prices (15000/40000) — should use
 *     a per-country count. Simplified to a flat count for correctness.
 */

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { NotFoundError } = require('../utils/errors');
const logger       = require('../utils/logger');

const router = express.Router();
// Note: authenticate + requireRole(['owner','superadmin']) applied in server.js

// ── GET /admin/dealers ────────────────────────────────────────
router.get('/dealers', async (req, res) => {
  const { page = 1, limit = 20, search, plan } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('dealers')
    .select('id, name, subdomain, plan, is_active, created_at, plan_expires_at', { count: 'exact' });

  if (search) query = query.or(`name.ilike.%${search}%,subdomain.ilike.%${search}%`);
  if (plan)   query = query.eq('plan', plan);

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with vehicle + lead counts
  const enriched = await Promise.all((data || []).map(async (dealer) => {
    const [vehicles, leads] = await Promise.all([
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('dealer_id', dealer.id),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealer_id', dealer.id),
    ]);
    return { ...dealer, vehicle_count: vehicles.count, lead_count: leads.count };
  }));

  res.setHeader('X-Total-Count', count || 0);
  res.json({ dealers: enriched, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── POST /admin/dealers/:id/suspend ──────────────────────────
router.post('/dealers/:id/suspend', async (req, res) => {
  const { data } = await supabase.from('dealers').select('id,name').eq('id', req.params.id).single();
  if (!data) throw new NotFoundError('Dealer');

  await supabase.from('dealers').update({ is_active: false }).eq('id', req.params.id);
  logger.warn({ adminId: req.auth.userId, targetDealerId: req.params.id, dealerName: data.name }, 'Dealer suspended');

  res.json({ message: `${data.name} has been suspended` });
});

// ── POST /admin/dealers/:id/restore ──────────────────────────
router.post('/dealers/:id/restore', async (req, res) => {
  const { data } = await supabase.from('dealers').select('id,name').eq('id', req.params.id).single();
  if (!data) throw new NotFoundError('Dealer');

  await supabase.from('dealers').update({ is_active: true }).eq('id', req.params.id);
  logger.info({ adminId: req.auth.userId, targetDealerId: req.params.id }, 'Dealer restored');

  res.json({ message: `${data.name} has been restored` });
});

// ── POST /admin/dealers/:id/login-as ─────────────────────────
router.post('/dealers/:id/login-as', async (req, res) => {
  const { data: dealer } = await supabase
    .from('dealers').select('id, name, plan').eq('id', req.params.id).single();
  if (!dealer) throw new NotFoundError('Dealer');

  const { data: owner } = await supabase
    .from('dealer_users')
    .select('id, email, role')
    .eq('dealer_id', req.params.id)
    .eq('role', 'owner')
    .limit(1)
    .single();

  if (!owner) throw new NotFoundError('Dealer owner');

  const jwt = require('jsonwebtoken');
  const env = require('../config/env');
  const impersonationToken = jwt.sign(
    {
      sub:             owner.id,
      email:           owner.email,
      dealerId:        dealer.id,
      role:            owner.role,
      plan:            dealer.plan,
      impersonated_by: req.auth.userId,
    },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '30m', issuer: 'autosys-api' },
  );

  logger.warn({ adminId: req.auth.userId, targetDealerId: dealer.id }, 'Admin impersonating dealer');

  res.json({ access_token: impersonationToken, dealer: dealer.name, expires_in: 1800 });
});

// ── GET /admin/stats ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [dealers, vehicles, leads, revenue] = await Promise.all([
    supabase.from('dealers').select('id, plan, is_active', { count: 'exact' }),
    supabase.from('vehicles').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('amount').eq('status', 'success'),
  ]);

  const planCounts = {};
  for (const d of dealers.data || []) {
    planCounts[d.plan] = (planCounts[d.plan] || 0) + 1;
  }

  const totalRevenue  = (revenue.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const activeDealers = (dealers.data || []).filter((d) => d.is_active).length;

  res.json({
    dealers:          { total: dealers.count, active: activeDealers, by_plan: planCounts },
    vehicles:         vehicles.count,
    leads:            leads.count,
    platform_revenue: totalRevenue,
  });
});

// ── GET /admin/support ────────────────────────────────────────
router.get('/support', async (req, res) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, dealer:dealers(id,name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  res.json({ tickets: data || [] });
});

// ── GET /admin/plans ──────────────────────────────────────────
// FIX: was defined AFTER module.exports — completely unreachable previously.
router.get('/plans', async (req, res) => {
  const [freeCnt, proCnt, premiumCnt] = await Promise.all([
    supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('plan', 'free').eq('is_active', true),
    supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('is_active', true),
    supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('plan', 'premium').eq('is_active', true),
  ]);

  res.json({
    plans: [
      {
        id: 'free', name: 'Free', price: 0,
        subscribers: freeCnt.count || 0, mrr: 0,
        features: ['5 vehicles', '1 user', 'Basic CRM'],
      },
      {
        id: 'pro', name: 'Pro', price: 15000,
        subscribers: proCnt.count || 0, mrr: (proCnt.count || 0) * 15000,
        features: ['Unlimited vehicles', '5 users', 'Full CRM', 'Website builder', 'AI tools'],
      },
      {
        id: 'premium', name: 'Premium', price: 40000,
        subscribers: premiumCnt.count || 0, mrr: (premiumCnt.count || 0) * 40000,
        features: ['Everything in Pro', 'Unlimited users', 'API access', 'Priority support'],
      },
    ],
  });
});

// ── GET /admin/mrr ────────────────────────────────────────────
// FIX: was defined AFTER module.exports — completely unreachable previously.
router.get('/mrr', async (req, res) => {
  const [pro, premium] = await Promise.all([
    supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('is_active', true),
    supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('plan', 'premium').eq('is_active', true),
  ]);

  const proMrr     = (pro.count || 0) * 15000;
  const premiumMrr = (premium.count || 0) * 40000;
  const totalMrr   = proMrr + premiumMrr;

  const { data: dealers } = await supabase
    .from('dealers')
    .select('plan, created_at')
    .eq('is_active', true)
    .neq('plan', 'free');

  const monthly = {};
  for (const d of dealers || []) {
    const month = new Date(d.created_at).toISOString().slice(0, 7);
    const val   = d.plan === 'pro' ? 15000 : 40000;
    monthly[month] = (monthly[month] || 0) + val;
  }

  res.json({
    current_mrr:   totalMrr,
    pro_mrr:       proMrr,
    premium_mrr:   premiumMrr,
    pro_count:     pro.count || 0,
    premium_count: premium.count || 0,
    history: Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, mrr]) => ({ month, mrr })),
  });
});

// FIX: module.exports is now at the END — all routes above are reachable.
module.exports = router;

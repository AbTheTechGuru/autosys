'use strict';

/**
 * AutoSys Analytics Routes
 *
 * FIXES:
 *  1. CRITICAL: router.get('/heatmap'), router.get('/top-vehicles'), and
 *     router.get('/website') were ALL defined AFTER `module.exports = router`.
 *     They were completely unreachable — 404 on every call.
 *     Moved all routes before the export.
 *  2. Duplicate `router.use(authenticate)` call removed (authenticate is already
 *     applied at mount time in server.js — was being applied twice).
 *  3. `AppError` was imported but never used — removed unused import.
 */

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Helper: period → date filter
function periodFilter(period = '30d') {
  const map = { '7d': 7, '30d': 30, '3m': 90, '12m': 365 };
  const days = map[period] || 30;
  return new Date(Date.now() - days * 86400000).toISOString();
}

// ── GET /analytics/overview ───────────────────────────────────
router.get('/overview', async (req, res) => {
  const { period = '30d' } = req.query;
  const from = periodFilter(period);
  const did  = req.auth.dealerId;

  const [vehicles, leads, deals, revenue] = await Promise.all([
    supabase.from('vehicles').select('id, status', { count: 'exact' }).eq('dealer_id', did),
    supabase.from('leads').select('id, stage', { count: 'exact' }).eq('dealer_id', did).gte('created_at', from),
    supabase.from('deals').select('id, stage, value').eq('dealer_id', did),
    supabase.from('deals').select('value').eq('dealer_id', did).eq('stage', 'delivered').gte('updated_at', from),
  ]);

  const totalRevenue = (revenue.data || []).reduce((s, d) => s + (d.value || 0), 0);
  const closedDeals  = (deals.data || []).filter((d) => d.stage === 'delivered').length;
  const convRate     = leads.count > 0 ? ((closedDeals / leads.count) * 100).toFixed(1) : 0;

  res.json({
    fleet_size:       vehicles.count || 0,
    available_count:  (vehicles.data || []).filter((v) => v.status === 'available').length,
    leads_total:      leads.count || 0,
    leads_new:        (leads.data || []).filter((l) => l.stage === 'new').length,
    revenue:          totalRevenue,
    deals_closed:     closedDeals,
    conversion_rate:  parseFloat(convRate),
    pipeline_value:   (deals.data || [])
      .filter((d) => !['delivered', 'closed_lost'].includes(d.stage))
      .reduce((s, d) => s + (d.value || 0), 0),
  });
});

// ── GET /analytics/revenue ────────────────────────────────────
router.get('/revenue', async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .select('value, updated_at')
    .eq('dealer_id', req.auth.dealerId)
    .eq('stage', 'delivered')
    .order('updated_at', { ascending: true });

  if (error) throw error;

  const monthly = {};
  for (const deal of data || []) {
    const month = new Date(deal.updated_at).toISOString().slice(0, 7);
    monthly[month] = (monthly[month] || 0) + (deal.value || 0);
  }

  res.json({ monthly });
});

// ── GET /analytics/leads ──────────────────────────────────────
router.get('/leads', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('source, stage, created_at, ai_score')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const bySource = {};
  const byMonth  = {};
  for (const lead of data || []) {
    bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    const month = new Date(lead.created_at).toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  res.json({ by_source: bySource, by_month: byMonth, total: data?.length || 0 });
});

// ── GET /analytics/funnel ─────────────────────────────────────
router.get('/funnel', async (req, res) => {
  const did = req.auth.dealerId;

  const [leads, contacted, negotiations, closed] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealer_id', did),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealer_id', did).neq('stage', 'new'),
    supabase.from('deals').select('id', { count: 'exact', head: true }).eq('dealer_id', did).in('stage', ['negotiation', 'payment']),
    supabase.from('deals').select('id', { count: 'exact', head: true }).eq('dealer_id', did).eq('stage', 'delivered'),
  ]);

  res.json({
    funnel: [
      { label: 'Leads Captured', count: leads.count      || 0 },
      { label: 'Contacted',      count: contacted.count  || 0 },
      { label: 'Negotiating',    count: negotiations.count || 0 },
      { label: 'Deals Closed',   count: closed.count     || 0 },
    ],
  });
});

// ── GET /analytics/agents ─────────────────────────────────────
router.get('/agents', async (req, res) => {
  const { data, error } = await supabase
    .from('dealer_users')
    .select('id, full_name, email, role')
    .eq('dealer_id', req.auth.dealerId)
    .eq('is_active', true);

  if (error) throw error;

  const agentStats = await Promise.all(
    (data || []).map(async (user) => {
      const [leads, deals] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealer_id', req.auth.dealerId).eq('assigned_to', user.id),
        supabase.from('deals').select('value').eq('dealer_id', req.auth.dealerId).eq('assigned_to', user.id).eq('stage', 'delivered'),
      ]);

      const revenue = (deals.data || []).reduce((s, d) => s + (d.value || 0), 0);
      return {
        ...user,
        name:          user.full_name,
        leads_count:   leads.count || 0,
        deals_closed:  deals.data?.length || 0,
        revenue,
        commission:    Math.round(revenue * 0.02),
      };
    }),
  );

  res.json({ agents: agentStats });
});

// ── GET /analytics/heatmap ────────────────────────────────────
// FIX: was unreachable (defined after module.exports in original).
router.get('/heatmap', async (req, res) => {
  const did = req.auth.dealerId;
  const { data } = await supabase
    .from('leads')
    .select('created_at')
    .eq('dealer_id', did)
    .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString());

  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const row of data || []) {
    const d = new Date(row.created_at);
    matrix[d.getDay()][d.getHours()]++;
  }
  res.json({ heatmap: matrix });
});

// ── GET /analytics/top-vehicles ──────────────────────────────
// FIX: was unreachable (defined after module.exports in original).
router.get('/top-vehicles', async (req, res) => {
  const did = req.auth.dealerId;

  const { data: leads } = await supabase
    .from('leads')
    .select('vehicle_interest')
    .eq('dealer_id', did)
    .not('vehicle_interest', 'is', null);

  const counts = {};
  for (const l of leads || []) {
    const v = l.vehicle_interest?.trim();
    if (v) counts[v] = (counts[v] || 0) + 1;
  }

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([vehicle, inquiries]) => ({ vehicle, inquiries }));

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, price, status, views_count')
    .eq('dealer_id', did)
    .order('views_count', { ascending: false })
    .limit(10);

  res.json({ by_inquiries: top, by_views: vehicles || [] });
});

// ── GET /analytics/website ───────────────────────────────────
// FIX: was unreachable (defined after module.exports in original).
router.get('/website', async (_req, res) => {
  res.json({
    page_views:       0,
    unique_visitors:  0,
    bounce_rate:      0,
    avg_session_secs: 0,
    top_pages:        [],
    referrers:        [],
    note: 'Connect an analytics provider in Settings → Integrations to see website traffic data.',
  });
});

// FIX: module.exports is now at the END — all routes are reachable.
module.exports = router;

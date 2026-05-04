'use strict';

/**
 * AutoSys Commissions Route
 *
 * FIXES:
 *  1. CRITICAL: `const { fmtM } = (v) => v;` is syntactically invalid JavaScript.
 *     This was attempting to destructure a function, not an object — it throws
 *     a TypeError at startup. Removed the unused server-side formatter entirely
 *     (formatting belongs in the frontend).
 *  2. Import path `'../utils/../middleware/auth'` resolves correctly but is
 *     needlessly confusing — simplified to `'../middleware/auth'`.
 *  3. Duplicate authenticate middleware call removed (already applied in server.js).
 */

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// ── GET /commissions ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const { period = 'month' } = req.query;
  const days = period === 'week' ? 7 : 30;
  const from = new Date(Date.now() - days * 86400000).toISOString();

  const { data: deals } = await supabase
    .from('deals')
    .select('value, assigned_to, updated_at, assigned:dealer_users!assigned_to(id, full_name)')
    .eq('dealer_id', req.auth.dealerId)
    .eq('stage', 'delivered')
    .gte('updated_at', from);

  const byAgent = {};
  for (const deal of deals || []) {
    const uid = deal.assigned_to;
    if (!uid) continue;
    if (!byAgent[uid]) {
      byAgent[uid] = {
        user:          { id: uid, name: deal.assigned?.full_name || 'Unknown' },
        total_revenue: 0,
        deals_count:   0,
        commission:    0,
      };
    }
    byAgent[uid].total_revenue += deal.value || 0;
    byAgent[uid].deals_count   += 1;
    byAgent[uid].commission     = Math.round(byAgent[uid].total_revenue * 0.02);
  }

  res.json({ commissions: Object.values(byAgent), period });
});

module.exports = router;

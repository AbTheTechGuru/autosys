'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole, hashPassword } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { inviteTeamMemberSchema } = require('../validators/schemas');
const { NotFoundError, ConflictError, AppError } = require('../utils/errors');
const { v4: uuid }  = require('uuid');
const logger        = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

// ── GET /team ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('dealer_users')
    .select('id, full_name, email, role, phone, avatar_url, is_active, created_at, last_seen_at')
    .eq('dealer_id', req.auth.dealerId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  res.json({ members: data || [] });
});

// ── POST /team/invite ─────────────────────────────────────────
router.post('/invite', requireRole(['owner', 'admin']), validate({ body: inviteTeamMemberSchema }), async (req, res) => {
  const { email, role, name } = req.body;

  // Check plan member limits
  const planLimits = { free: 1, pro: 5, premium: Infinity };
  const limit = planLimits[req.auth.plan] ?? 1;

  const { count } = await supabase
    .from('dealer_users')
    .select('id', { count: 'exact', head: true })
    .eq('dealer_id', req.auth.dealerId)
    .eq('is_active', true);

  if ((count || 0) >= limit) {
    throw new AppError(`Your ${req.auth.plan} plan allows up to ${limit} team members. Upgrade to add more.`, 402, 'PLAN_LIMIT_REACHED');
  }

  // Check email not already in use
  const { data: existing } = await supabase
    .from('dealer_users').select('id').eq('email', email).maybeSingle();
  if (existing) throw new ConflictError('A user with this email already exists');

  // Generate temporary password (user will reset on first login)
  const tempPassword = uuid().replace(/-/g, '').slice(0, 16);
  const passwordHash = await hashPassword(tempPassword);

  const { data: user, error } = await supabase
    .from('dealer_users')
    .insert({
      full_name:     name || email.split('@')[0],
      email,
      role,
      dealer_id:     req.auth.dealerId,
      password_hash: passwordHash,
      is_active:     true,
      must_reset_password: true,
    })
    .select('id, full_name, email, role')
    .single();

  if (error) throw error;

  // TODO: Send invitation email with tempPassword via email service
  // await emailService.sendInvite({ to: email, tempPassword, dealerName: req.dealer.name });

  logger.info({ dealerId: req.auth.dealerId, invitedUserId: user.id, role }, 'Team member invited');

  res.status(201).json({
    member: user,
    // Only expose temp password in development for testing
    ...(process.env.NODE_ENV === 'development' && { temp_password: tempPassword }),
  });
});

// ── PUT /team/:id ─────────────────────────────────────────────
router.put('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  const { role, is_active } = req.body;

  // Prevent demoting the last owner
  if (role && role !== 'owner') {
    const { count } = await supabase
      .from('dealer_users')
      .select('id', { count: 'exact', head: true })
      .eq('dealer_id', req.auth.dealerId)
      .eq('role', 'owner')
      .eq('is_active', true);
    if ((count || 0) <= 1) {
      throw new AppError('Cannot remove the last owner of a dealership', 400, 'LAST_OWNER');
    }
  }

  const updates = {};
  if (role !== undefined)      updates.role      = role;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('dealer_users')
    .update(updates)
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId)
    .select('id, full_name, email, role, is_active')
    .single();

  if (error || !data) throw new NotFoundError('Team member');
  res.json({ member: data });
});

// ── DELETE /team/:id ──────────────────────────────────────────
router.delete('/:id', requireRole(['owner']), async (req, res) => {
  if (req.params.id === req.auth.userId) {
    throw new AppError('You cannot remove yourself', 400, 'CANNOT_REMOVE_SELF');
  }

  const { error } = await supabase
    .from('dealer_users')
    .update({ is_active: false })
    .eq('id', req.params.id)
    .eq('dealer_id', req.auth.dealerId);

  if (error) throw error;
  res.json({ message: 'Team member deactivated' });
});

// ── GET /team/commissions ─────────────────────────────────────
router.get('/commissions', async (req, res) => {
  const { period = 'month' } = req.query;
  const from = new Date(Date.now() - (period === 'month' ? 30 : 7) * 86400000).toISOString();

  const { data: deals } = await supabase
    .from('deals')
    .select('value, assigned_to, updated_at, assigned:users!assigned_to(id, name)')
    .eq('dealer_id', req.auth.dealerId)
    .eq('stage', 'delivered')
    .gte('updated_at', from);

  const byAgent = {};
  for (const deal of deals || []) {
    const uid  = deal.assigned_to;
    if (!uid) continue;
    if (!byAgent[uid]) {
      byAgent[uid] = { user: deal.assigned, total_revenue: 0, deals_count: 0, commission: 0 };
    }
    byAgent[uid].total_revenue += deal.value || 0;
    byAgent[uid].deals_count  += 1;
    byAgent[uid].commission    = Math.round(byAgent[uid].total_revenue * 0.02); // 2%
  }

  res.json({ commissions: Object.values(byAgent) });
});

module.exports = router;

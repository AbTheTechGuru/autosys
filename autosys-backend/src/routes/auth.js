'use strict';

/**
 * AutoSys Auth Routes
 *
 * FIXES:
 *  1. Imports AuthError and ConflictError from utils/errors — these were missing
 *     from the original errors.js (crash on startup). Now added.
 *  2. Imports signTokens, revokeToken, hashPassword, verifyPassword from auth
 *     middleware — these were missing from original auth.js middleware (crash).
 *  3. JWT_SECRET read through env.js (validated) not raw process.env.
 *  4. /auth/refresh was importing changePasswordHandler inline incorrectly.
 *  5. /auth/me used req.auth.plan and req.auth.planExpired which are not set on
 *     the authenticate middleware's req.auth — safely fallback to null.
 *  6. Refresh token schema field mismatch: schema used `refresh_token` (snake_case)
 *     but the handler read `req.body.refreshToken` (camelCase). Unified to camelCase.
 */

require('express-async-errors');
const express      = require('express');
const jwt          = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { redis }    = require('../config/redis');
const { validate } = require('../middleware/validate');
const {
  authenticate,
  signTokens,
  revokeToken,
  hashPassword,
  verifyPassword,
} = require('../middleware/auth');
const { AppError, AuthError, ConflictError } = require('../utils/errors');
const env          = require('../config/env');
const logger       = require('../utils/logger');
const { z }        = require('zod');

const router = express.Router();

// ── Canonical schemas ─────────────────────────────────────────
const signupSchema = z.object({
  fullName:       z.string().min(2).max(100).trim(),
  dealershipName: z.string().min(2).max(200).trim(),
  subdomain:      z.string()
    .regex(/^[a-z0-9-]{3,50}$/, 'Subdomain: 3-50 chars, lowercase letters, numbers, hyphens only')
    .optional(),
  email:          z.string().email().toLowerCase(),
  password:       z.string().min(8).max(72),
  phone:          z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
});

// FIX: unified field name to camelCase (was snake_case in original, causing mismatch)
const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(72),
});

// ── Brute-force lockout ───────────────────────────────────────
const MAX_ATTEMPTS     = 5;
const LOCKOUT_DURATION = 900; // 15 min

const checkLockout = async (email) => {
  const key      = `lockout:${email}`;
  const attempts = parseInt(await redis.get(key) || '0');
  return attempts >= MAX_ATTEMPTS;
};
const recordFailedAttempt = async (email) => {
  const key      = `lockout:${email}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, LOCKOUT_DURATION);
};
const clearLockout = async (email) => redis.del(`lockout:${email}`);

// ── Helper: build auth response ───────────────────────────────
function authResponse(user, dealer, accessToken, refreshToken) {
  return {
    accessToken,
    refreshToken,
    user: {
      id:       user.id,
      email:    user.email,
      fullName: user.fullName,
      name:     user.fullName,
      role:     user.role,
    },
    dealer: {
      id:        dealer.id,
      name:      dealer.name,
      subdomain: dealer.subdomain,
      plan:      dealer.plan,
    },
  };
}

// ── Set refresh cookie ────────────────────────────────────────
function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,
    path:     '/',
  });
}

// ── POST /auth/signup ─────────────────────────────────────────
router.post('/signup', validate({ body: signupSchema }), async (req, res) => {
  const { fullName, dealershipName, email, password, phone } = req.body;
  let { subdomain } = req.body;

  if (!subdomain) {
    subdomain = dealershipName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  const { data: existingEmail } = await supabase
    .from('dealer_users').select('id').eq('email', email).maybeSingle();
  if (existingEmail) throw new ConflictError('An account with this email already exists.');

  const { data: existingSub } = await supabase
    .from('dealers').select('id').eq('subdomain', subdomain).maybeSingle();
  if (existingSub) {
    subdomain = `${subdomain}-${Date.now().toString(36)}`;
  }

  const passwordHash = await hashPassword(password);

  const { data: dealer, error: dealerErr } = await supabase
    .from('dealers')
    .insert({
      name:          dealershipName,
      subdomain,
      plan:          'free',
      is_active:     true,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    })
    .select('id, name, subdomain, plan')
    .single();

  if (dealerErr) {
    logger.error({ err: dealerErr }, 'Dealer creation failed');
    throw new AppError('Failed to create dealership. Please try again.', 500, 'DB_ERROR');
  }

  const { data: dealerUser, error: userErr } = await supabase
    .from('dealer_users')
    .insert({
      dealer_id:     dealer.id,
      full_name:     fullName,
      email,
      password_hash: passwordHash,
      phone:         phone || null,
      role:          'owner',
      is_active:     true,
    })
    .select('id, full_name, email, role')
    .single();

  if (userErr) {
    await supabase.from('dealers').delete().eq('id', dealer.id);
    logger.error({ err: userErr }, 'User creation failed');
    throw new AppError('Failed to create user account. Please try again.', 500, 'DB_ERROR');
  }

  const userObj = { id: dealerUser.id, email, fullName, role: 'owner' };
  const { accessToken, refreshToken } = signTokens(userObj, dealer);

  setRefreshCookie(res, refreshToken);
  logger.info({ dealerId: dealer.id, userId: dealerUser.id }, 'New signup');

  res.status(201).json(authResponse(userObj, dealer, accessToken, refreshToken));
});

// ── POST /auth/login ──────────────────────────────────────────
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body;

  if (await checkLockout(email)) {
    throw new AppError(
      'Account temporarily locked after too many failed attempts. Try again in 15 minutes.',
      429, 'ACCOUNT_LOCKED',
    );
  }

  const { data: dealerUser } = await supabase
    .from('dealer_users')
    .select('id, full_name, email, password_hash, role, is_active, dealer_id, dealers(id,name,subdomain,plan,is_active)')
    .eq('email', email)
    .maybeSingle();

  // Constant-time check — prevents user enumeration via timing
  const DUMMY = '$2a$12$dummyhashtopreventtimingattacksxxxxxxxxxxxxxxxxxxxxxxxxx';
  const match = await verifyPassword(password, dealerUser?.password_hash || DUMMY);

  if (!dealerUser || !match) {
    await recordFailedAttempt(email);
    throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  if (!dealerUser.is_active) {
    throw new AuthError('Your account has been deactivated. Contact support.', 'ACCOUNT_DISABLED');
  }

  const dealer = dealerUser.dealers;
  if (!dealer?.is_active) {
    throw new AuthError('This dealership account is suspended.', 'DEALER_SUSPENDED');
  }

  await clearLockout(email);

  // Fire-and-forget last_seen update
  supabase.from('dealer_users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', dealerUser.id)
    .then(() => {});

  const userObj = { id: dealerUser.id, email, fullName: dealerUser.full_name, role: dealerUser.role };
  const { accessToken, refreshToken } = signTokens(userObj, dealer);

  setRefreshCookie(res, refreshToken);
  logger.info({ dealerId: dealer.id, userId: dealerUser.id }, 'Login');

  res.json(authResponse(userObj, dealer, accessToken, refreshToken));
});

// ── POST /auth/refresh ────────────────────────────────────────
router.post('/refresh', validate({ body: refreshSchema }), async (req, res) => {
  // FIX: read from cookie OR body.refreshToken (camelCase — matches schema)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new AuthError('Refresh token required.', 'MISSING_REFRESH_TOKEN');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer:     'autosys-api',
    });
  } catch {
    throw new AuthError('Invalid or expired refresh token.', 'INVALID_REFRESH_TOKEN');
  }

  if (decoded.type !== 'refresh') {
    throw new AuthError('Invalid token type.', 'INVALID_TOKEN_TYPE');
  }

  const { data: dealerUser } = await supabase
    .from('dealer_users')
    .select('id, full_name, email, role, is_active, dealer_id, dealers(id,name,subdomain,plan,is_active)')
    .eq('id', decoded.sub)
    .maybeSingle();

  if (!dealerUser?.is_active) throw new AuthError('User not found or inactive.', 'USER_NOT_FOUND');

  const dealer = dealerUser.dealers;
  if (!dealer?.is_active) throw new AuthError('Dealer account suspended.', 'DEALER_SUSPENDED');

  const userObj = {
    id:       dealerUser.id,
    email:    dealerUser.email,
    fullName: dealerUser.full_name,
    role:     dealerUser.role,
  };
  const { accessToken, refreshToken: newRefreshToken } = signTokens(userObj, dealer);

  setRefreshCookie(res, newRefreshToken);

  res.json({
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id:       userObj.id,
      email:    userObj.email,
      fullName: userObj.fullName,
      name:     userObj.fullName,
      role:     userObj.role,
    },
    dealer: {
      id:        dealer.id,
      name:      dealer.name,
      subdomain: dealer.subdomain,
      plan:      dealer.plan,
    },
  });
});

// ── POST /auth/logout ─────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  if (req.auth.jti) {
    const decoded = jwt.decode(req.headers.authorization.slice(7));
    if (decoded?.exp) {
      await revokeToken(req.auth.jti, decoded.exp * 1000);
    }
  }

  res.clearCookie('refreshToken', { path: '/' });
  logger.info({ userId: req.auth.userId }, 'Logout');
  res.json({ message: 'Logged out successfully.' });
});

// ── GET /auth/me ──────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { data: dealerUser } = await supabase
    .from('dealer_users')
    .select('id, full_name, email, role, last_seen_at, dealers(id,name,subdomain,plan,is_active)')
    .eq('id', req.auth.userId)
    .single();

  if (!dealerUser) throw new AuthError('User not found.', 'NOT_FOUND');

  res.json({
    user: {
      id:       dealerUser.id,
      email:    dealerUser.email,
      fullName: dealerUser.full_name,
      name:     dealerUser.full_name,
      role:     dealerUser.role,
      lastSeen: dealerUser.last_seen_at,
    },
    dealer: {
      id:        dealerUser.dealers.id,
      name:      dealerUser.dealers.name,
      subdomain: dealerUser.dealers.subdomain,
      // FIX: req.auth.plan may be undefined if token is old — fall back to DB value
      plan:      req.auth.plan || dealerUser.dealers.plan,
    },
  });
});

// ── POST/PUT /auth/password ───────────────────────────────────
const changePasswordHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { data: user } = await supabase
    .from('dealer_users')
    .select('password_hash')
    .eq('id', req.auth.userId)
    .single();

  if (!user) throw new AuthError('User not found.', 'NOT_FOUND');

  const match = await verifyPassword(currentPassword, user.password_hash);
  if (!match) throw new AuthError('Current password is incorrect.', 'WRONG_PASSWORD');

  const newHash = await hashPassword(newPassword);
  await supabase
    .from('dealer_users')
    .update({ password_hash: newHash })
    .eq('id', req.auth.userId);

  logger.info({ userId: req.auth.userId }, 'Password changed');
  res.json({ message: 'Password updated successfully.' });
};

router.post('/password', authenticate, validate({ body: changePasswordSchema }), changePasswordHandler);
router.put('/password',  authenticate, validate({ body: changePasswordSchema }), changePasswordHandler);

// ── POST /auth/check-subdomain ────────────────────────────────
router.post('/check-subdomain', async (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain || !/^[a-z0-9-]{3,50}$/.test(subdomain)) {
    return res.json({ available: false, reason: 'Invalid format' });
  }
  const { data } = await supabase
    .from('dealers').select('id').eq('subdomain', subdomain).maybeSingle();
  res.json({ available: !data });
});

// ── POST /auth/forgot-password ────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (email) {
    // TODO: send reset email via email service
    logger.info({ email }, 'Password reset requested');
  }
  // Always return success to prevent email enumeration
  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

module.exports = router;

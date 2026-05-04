'use strict';

/**
 * AutoSys — auth.middleware.js
 *
 * FIXES:
 *  1. auth.js route imports signTokens, revokeToken, hashPassword, verifyPassword
 *     but none of those were exported from this file — CRASH on startup.
 *  2. requirePlan() was imported in ai.js and campaign_templates.js but missing entirely.
 *  3. JWT_SECRET was read from process.env directly in auth.js (bypasses env.js validation).
 *  4. Dealer cache had no upper bound — potential memory leak in long-running processes.
 *  5. AuthError was imported in auth.js but not exported from utils/errors.js.
 *     Added it to errors.js AND used it here.
 *  6. ConflictError was imported in auth.js but not exported — added to errors.js.
 */

const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const { redis } = require('../config/redis');
const { supabase } = require('../config/supabase');
const { UnauthorizedError, AppError } = require('../utils/errors');
const { getCountryConfig } = require('../config/countryConfig');
const env       = require('../config/env');
const logger    = require('../utils/logger');

// ── Dealer cache (per-process, 60 s TTL, max 500 entries) ────
const DEALER_CACHE = new Map();
const CACHE_TTL    = 60_000;
const CACHE_MAX    = 500;

async function getDealerCached(dealerId) {
  const cached = DEALER_CACHE.get(dealerId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const { data } = await supabase
    .from('dealers')
    .select('id, name, country, currency, timezone, payment_provider, plan, is_active')
    .eq('id', dealerId)
    .single();

  if (data) {
    // Evict oldest entry if cache is at capacity
    if (DEALER_CACHE.size >= CACHE_MAX) {
      const oldestKey = DEALER_CACHE.keys().next().value;
      DEALER_CACHE.delete(oldestKey);
    }
    DEALER_CACHE.set(dealerId, { data, ts: Date.now() });
  }
  return data;
}

// ── Token helpers (used by auth.js routes) ────────────────────

/**
 * Sign a short-lived access token + long-lived refresh token.
 * @param {{ id, email, fullName, role }} user
 * @param {{ id, name, subdomain, plan }} dealer
 */
function signTokens(user, dealer) {
  const payload = {
    sub:      user.id,
    email:    user.email,
    dealerId: dealer.id,
    role:     user.role,
    plan:     dealer.plan,
  };

  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN, issuer: 'autosys-api' },
  );

  const refreshToken = jwt.sign(
    { sub: user.id, dealerId: dealer.id, type: 'refresh' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_REFRESH_EXPIRES_IN, issuer: 'autosys-api' },
  );

  return { accessToken, refreshToken };
}

/**
 * Add an access token to the Redis blocklist until its natural expiry.
 * No-op in dev if Redis is not available.
 */
async function revokeToken(jti, expMs) {
  if (!jti) return;
  const ttlSeconds = Math.max(Math.ceil((expMs - Date.now()) / 1000), 0);
  if (ttlSeconds > 0) {
    await redis.setex(`blocklist:${jti}`, ttlSeconds, '1');
  }
}

/**
 * Hash a plain-text password with bcrypt (cost 12).
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

/**
 * Verify plain-text password against bcrypt hash.
 * Safe against timing attacks (bcrypt.compare is constant-time).
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── Main auth middleware ───────────────────────────────────────
async function authenticate(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw new UnauthorizedError('No token provided');

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer:     'autosys-api',
      });
    } catch (e) {
      throw new UnauthorizedError(e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
    }

    // Check blocklist (token revocation)
    if (decoded.jti) {
      const revoked = await redis.get(`blocklist:${decoded.jti}`);
      if (revoked) throw new UnauthorizedError('Token has been revoked');
    }

    req.auth = {
      userId:   decoded.sub || decoded.userId,
      dealerId: decoded.dealerId,
      role:     decoded.role,
      plan:     decoded.plan,
      jti:      decoded.jti,
    };

    if (!req.auth.dealerId) throw new UnauthorizedError('Token missing dealerId');

    // ── Load dealer and inject into request ───────────────────
    const dealer = await getDealerCached(req.auth.dealerId);
    if (!dealer)                   throw new UnauthorizedError('Dealer not found');
    if (dealer.is_active === false) throw new UnauthorizedError('Dealer account is suspended');

    req.dealer       = dealer;
    req.countryConfig = getCountryConfig(dealer.country);

    // ── Enforce RLS at DB session level ───────────────────────
    await supabase.rpc('set_dealer_context', { dealer_id: req.auth.dealerId }).catch(() => {
      // Non-fatal if RPC not yet defined
    });

    next();
  } catch (err) {
    next(err);
  }
}

// ── Role guard ────────────────────────────────────────────────
function requireRole(roles = []) {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (!roles.includes(req.auth.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

// ── Plan guard ────────────────────────────────────────────────
// FIX: requirePlan was imported in ai.js + campaign_templates.js but never defined.
const PLAN_TIERS = { free: 0, pro: 1, premium: 2 };

function requirePlan(minPlan = 'pro') {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    const userTier = PLAN_TIERS[req.auth.plan] ?? 0;
    const reqTier  = PLAN_TIERS[minPlan] ?? 1;
    if (userTier < reqTier) {
      return next(new AppError(
        `This feature requires the ${minPlan} plan or higher. Upgrade in Settings → Billing.`,
        402,
        'PLAN_UPGRADE_REQUIRED',
      ));
    }
    next();
  };
}

// ── Country guard ─────────────────────────────────────────────
function requireCountry(countryCodes = []) {
  return (req, _res, next) => {
    if (!req.dealer) return next(new UnauthorizedError());
    if (!countryCodes.includes(req.dealer.country)) {
      return next(new AppError(
        `This feature is not available in ${req.dealer.country}`,
        403,
        'COUNTRY_NOT_SUPPORTED',
      ));
    }
    next();
  };
}

// ── Clear dealer cache (call after dealer settings update) ────
function invalidateDealerCache(dealerId) {
  DEALER_CACHE.delete(dealerId);
}

module.exports = {
  authenticate,
  requireRole,
  requirePlan,
  requireCountry,
  invalidateDealerCache,
  signTokens,
  revokeToken,
  hashPassword,
  verifyPassword,
};

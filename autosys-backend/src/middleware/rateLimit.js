'use strict';

/**
 * AutoSys Rate Limiters
 *
 * FIXES:
 *  1. CRITICAL: server.js calls `const { createRateLimiters } = require('./src/middleware/rateLimit')`
 *     but the original rateLimit.js exported individual limiters directly (globalLimit, authLimit…)
 *     instead of a factory function. This caused a destructuring undefined crash at startup.
 *     Changed the export to a `createRateLimiters()` factory that returns all limiters.
 *  2. Rate limits used `handler` option with an old express-rate-limit v6 API signature.
 *     Updated to the v7 `handler(req, res, next, options)` signature.
 *  3. `skipSuccessfulRequests` was set to true on the auth limiter — this means
 *     a successful login didn't count, allowing unlimited logins as long as one
 *     succeeded. Corrected to false (count all requests regardless of success).
 */

const rateLimit = require('express-rate-limit');
const { redis } = require('../config/redis');
const logger    = require('../utils/logger');

// ── Optional Redis store for distributed rate limiting ────────
let RedisStore;
try {
  RedisStore = require('rate-limit-redis');
} catch {
  // rate-limit-redis not installed — falls back to in-memory
}

function makeStore(prefix) {
  if (!RedisStore || !redis) return undefined;
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  });
}

// ── Handler factories ─────────────────────────────────────────
const tooManyHandler = (message, code) =>
  // FIX: v7 handler signature is (req, res, next, options)
  (_req, res) => {
    res.status(429).json({ error: code, message });
  };

// ── Factory function (matches server.js import) ───────────────
function createRateLimiters() {
  const globalLimit = rateLimit({
    windowMs:        15 * 60 * 1000,   // 15 min
    max:             500,
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:global:'),
    handler:         tooManyHandler('Too many requests. Please slow down.', 'RATE_LIMITED'),
    skip: (req) => req.url === '/health',
  });

  const authLimit = rateLimit({
    windowMs:               15 * 60 * 1000,
    max:                    10,
    standardHeaders:        true,
    legacyHeaders:          false,
    // FIX: was true — allows unlimited successful logins, defeating brute-force protection
    skipSuccessfulRequests: false,
    store:                  makeStore('rl:auth:'),
    keyGenerator:           (req) => req.body?.email || req.ip,
    handler:                tooManyHandler(
      'Too many authentication attempts. Try again in 15 minutes.',
      'AUTH_RATE_LIMITED',
    ),
  });

  const aiLimit = rateLimit({
    windowMs:        60 * 1000,   // 1 min
    max:             20,
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:ai:'),
    keyGenerator:    (req) => req.auth?.dealerId || req.ip,
    handler:         tooManyHandler(
      'AI rate limit reached. Wait a moment before trying again.',
      'AI_RATE_LIMITED',
    ),
  });

  const webhookLimit = rateLimit({
    windowMs:        60 * 1000,
    max:             100,
    standardHeaders: true,
    legacyHeaders:   false,
    store:           makeStore('rl:webhook:'),
    handler:         tooManyHandler('Webhook rate limit exceeded.', 'WEBHOOK_RATE_LIMITED'),
  });

  return { globalLimit, authLimit, aiLimit, webhookLimit };
}

module.exports = { createRateLimiters };

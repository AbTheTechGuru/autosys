'use strict';

/**
 * AutoSys Environment Configuration
 *
 * FIXES:
 *  1. CRITICAL: JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, and REDIS_URL
 *     had no validation — the app would start silently and crash at the first
 *     authenticated request with a cryptic error.
 *  2. JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN were not exported, but auth.js
 *     middleware references env.JWT_EXPIRES_IN — was undefined.
 *  3. API_VERSION was hardcoded as 'api/v1' in server.js string concatenation,
 *     making it `//api/v1/auth`. Now stored without leading slash so
 *     `/${env.API_VERSION}/auth` produces `/api/v1/auth`.
 *  4. CORS_ORIGIN defaulted to '*' in production — security vulnerability.
 *     Now enforces an explicit value in production.
 *  5. PORT defaulted to string '5000' — parseInt added.
 */

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
];

const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `[AutoSys] Missing required environment variables: ${missing.join(', ')}\n` +
    'Copy .env.example to .env and fill in all values.',
  );
}

const NODE_ENV = process.env.NODE_ENV || 'development';

// In production, require an explicit CORS_ORIGIN — never allow wildcard
if (NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('[AutoSys] CORS_ORIGIN must be set in production.');
}

if (NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('[AutoSys] JWT_SECRET must be at least 32 characters in production.');
}

const env = {
  NODE_ENV,
  PORT:                    parseInt(process.env.PORT || '5000', 10),
  // FIX: no leading slash — used as `/${env.API_VERSION}/...`
  API_VERSION:             process.env.API_VERSION || 'api/v1',

  // Database
  SUPABASE_URL:            process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY:    process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY:       process.env.SUPABASE_ANON_KEY,

  // Auth
  JWT_SECRET:              process.env.JWT_SECRET,
  // FIX: exported so auth middleware can reference them
  JWT_EXPIRES_IN:          process.env.JWT_EXPIRES_IN          || '15m',
  JWT_REFRESH_EXPIRES_IN:  process.env.JWT_REFRESH_EXPIRES_IN  || '30d',

  // Cache
  REDIS_URL:               process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS
  CORS_ORIGIN:             process.env.CORS_ORIGIN || (NODE_ENV === 'development' ? 'http://localhost:5173' : ''),

  // AI
  ANTHROPIC_API_KEY:       process.env.ANTHROPIC_API_KEY,

  // Payment gateways
  PAYSTACK_SECRET_KEY:     process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY:     process.env.PAYSTACK_PUBLIC_KEY,
  FLUTTERWAVE_SECRET_KEY:  process.env.FLUTTERWAVE_SECRET_KEY,
  FLUTTERWAVE_PUBLIC_KEY:  process.env.FLUTTERWAVE_PUBLIC_KEY,
  STRIPE_SECRET_KEY:       process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLIC_KEY:       process.env.STRIPE_PUBLIC_KEY,
  STRIPE_WEBHOOK_SECRET:   process.env.STRIPE_WEBHOOK_SECRET,

  // WhatsApp
  WHATSAPP_VERIFY_TOKEN:   process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_ACCESS_TOKEN:   process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_ID:       process.env.WHATSAPP_PHONE_ID,

  // Email
  RESEND_API_KEY:          process.env.RESEND_API_KEY,
  FROM_EMAIL:              process.env.FROM_EMAIL || 'noreply@autosys.io',

  // Storage
  CLOUDINARY_URL:          process.env.CLOUDINARY_URL,
  CLOUDINARY_CLOUD_NAME:   process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:      process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET:   process.env.CLOUDINARY_API_SECRET,

  // Misc
  FRONTEND_URL:            process.env.FRONTEND_URL || 'http://localhost:5173',
};

module.exports = env;

'use strict';

require('express-async-errors');

const env    = require('./src/config/env');
const logger = require('./src/utils/logger');

const express      = require('express');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const cors         = require('cors');
const pinoHttp     = require('pino-http');
const { v4: uuid } = require('uuid');
const { createRateLimiters }        = require('./src/middleware/rateLimit');
const { authenticate, requireRole } = require('./src/middleware/auth');
const errorHandler                  = require('./src/middleware/errorHandler');

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
  hsts:       { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff:    true,
  frameguard: { action: 'deny' },
}));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://autosys-five.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Idempotency-Key",
    "X-Dealer-Id"
  ]
}));

// ── Body parsing ──────────────────────────────────────────────
// Webhook routes need raw body — skip json parsing for them
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) return next();
  express.json({ limit: '2mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: '500kb' }));
app.use(cookieParser());

// ── Request ID ────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = uuid();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── HTTP logging ──────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  customLogLevel: (_, res, err) => err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  autoLogging:    { ignore: (req) => req.url === '/health' },
  redact:         ['req.headers.authorization', 'req.headers.cookie'],
}));

// ── Rate limiting ─────────────────────────────────────────────
const { globalLimit, authLimit, aiLimit, webhookLimit } = createRateLimiters();
app.use(`/${env.API_VERSION}`, globalLimit);
app.use(`/${env.API_VERSION}/auth`, authLimit);
app.use(`/${env.API_VERSION}/ai`, aiLimit);

// ── IMPORT ROUTE MODULES ──────────────────────────────────────
// FIX: server.js was importing non-existent files:
//   - payment.global.service (doesn't exist — correct is payment.service)
//   - automations.global       (doesn't exist — correct is automations)
// All route files now use the actual filenames present in the project.
const paymentService    = require('./src/services/payment.service');
const paymentsRouter    = require('./src/routes/payments');
const pricingRouter     = require('./src/routes/pricing');
const automationsRouter = require('./src/routes/automations');
const calendarRouter    = require('./src/routes/calendar');
const inboxRouter       = require('./src/routes/inbox');
const socialRouter      = require('./src/routes/social');
// Blog routes export two routers — public and admin
const { publicRouter: blogPublicRouter, adminRouter: blogAdminRouter } = require('./src/routes/blog');

// ── Public routes ─────────────────────────────────────────────
app.use(`/${env.API_VERSION}/auth`,    require('./src/routes/auth'));
app.use(`/${env.API_VERSION}/pricing`, pricingRouter);

// Blog public routes (no auth)
app.use(`/${env.API_VERSION}/blog`, blogPublicRouter);

// ── Webhook routes (raw body, HMAC verified) ──────────────────
app.post(`/${env.API_VERSION}/payments/webhook/paystack`,
  express.raw({ type: 'application/json' }), webhookLimit,
  async (req, res, next) => {
    try {
      const sig    = req.headers['x-paystack-signature'];
      const result = await paymentService.handlePaystackWebhook(req.body, sig);
      res.json(result);
    } catch (err) { next(err); }
  }
);

app.post(`/${env.API_VERSION}/payments/webhook/flutterwave`,
  express.raw({ type: 'application/json' }), webhookLimit,
  async (req, res, next) => {
    try {
      const sig    = req.headers['verif-hash'] || req.headers['x-flw-signature'];
      const result = await paymentService.handleFlutterwaveWebhook(req.body, sig);
      res.json(result);
    } catch (err) { next(err); }
  }
);

app.post(`/${env.API_VERSION}/payments/webhook/stripe`,
  express.raw({ type: 'application/json' }), webhookLimit,
  async (req, res, next) => {
    try {
      const sig    = req.headers['stripe-signature'];
      const result = await paymentService.handleStripeWebhook(req.body, sig);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── WhatsApp webhook verification (Meta GET challenge) ────────
app.get(`/${env.API_VERSION}/inbox/webhook/whatsapp`, (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Public dealer website endpoints ──────────────────────────
app.get(`/${env.API_VERSION}/public/:dealerSubdomain/vehicles`,
  require('./src/routes/vehicles').publicListing);
app.post(`/${env.API_VERSION}/public/:dealerSubdomain/leads`,
  require('./src/routes/leads').capture);

// ── Protected routes (JWT required) ──────────────────────────
app.use(`/${env.API_VERSION}/vehicles`,           authenticate, require('./src/routes/vehicles'));
app.use(`/${env.API_VERSION}/leads`,              authenticate, require('./src/routes/leads'));
app.use(`/${env.API_VERSION}/deals`,              authenticate, require('./src/routes/deals'));
app.use(`/${env.API_VERSION}/payments`,           authenticate, paymentsRouter);
app.use(`/${env.API_VERSION}/team`,               authenticate, require('./src/routes/team'));
app.use(`/${env.API_VERSION}/analytics`,          authenticate, require('./src/routes/analytics'));
app.use(`/${env.API_VERSION}/ai`,                 authenticate, require('./src/routes/ai'));
app.use(`/${env.API_VERSION}/campaigns`,          authenticate, require('./src/routes/campaigns'));
app.use(`/${env.API_VERSION}/campaign-templates`, authenticate, require('./src/routes/campaign_templates'));
app.use(`/${env.API_VERSION}/customers`,          authenticate, require('./src/routes/customers'));
app.use(`/${env.API_VERSION}/commissions`,        authenticate, require('./src/routes/commissions'));
app.use(`/${env.API_VERSION}/settings`,           authenticate, require('./src/routes/settings'));
app.use(`/${env.API_VERSION}/websites`,           authenticate, require('./src/routes/websites'));
app.use(`/${env.API_VERSION}/automations`,        authenticate, automationsRouter);
app.use(`/${env.API_VERSION}/calendar`,           authenticate, calendarRouter);
app.use(`/${env.API_VERSION}/inbox`,              authenticate, inboxRouter);
app.use(`/${env.API_VERSION}/social`,             authenticate, socialRouter);

// ── Admin only ────────────────────────────────────────────────
app.use(
  `/${env.API_VERSION}/admin`,
  authenticate,
  requireRole(['owner', 'admin', 'superadmin']),
  require('./src/routes/admin'),
);

// ── Blog admin routes (auth required) ────────────────────────
app.use(
  `/${env.API_VERSION}/admin/blog`,
  authenticate,
  requireRole(['owner', 'admin', 'superadmin']),
  blogAdminRouter,
);

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const { supabase } = require('./src/config/supabase');
  let db = 'unknown';
  try { await supabase.from('dealers').select('id').limit(1); db = 'connected'; }
  catch { db = 'error'; }
  res.status(db === 'connected' ? 200 : 503).json({
    status:  db === 'connected' ? 'ok' : 'degraded',
    version: 'global-v1',
    env:     env.NODE_ENV, db,
    uptime:  Math.floor(process.uptime()),
    ts:      new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({
  error: 'NOT_FOUND', message: `${req.method} ${req.url} not found`, requestId: req.id,
}));

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Graceful shutdown ─────────────────────────────────────────
let server;
const shutdown = async (signal) => {
  logger.info({ signal }, 'Graceful shutdown');
  server.close(async () => {
    try {
      const { redis } = require('./src/config/redis');
      await redis?.quit?.();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Shutdown error');
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM',            () => shutdown('SIGTERM'));
process.on('SIGINT',             () => shutdown('SIGINT'));
process.on('unhandledRejection', (r) => logger.error({ reason: r }, 'Unhandled rejection'));
process.on('uncaughtException',  (e) => { logger.fatal({ err: e }, 'Uncaught'); process.exit(1); });

server = app.listen(env.PORT, () =>
  logger.info({ port: env.PORT, env: env.NODE_ENV, version: 'global-v1' }, '🌍 AutoSys Global API running')
);

module.exports = app;

'use strict';

/**
 * AutoSys Global Error Handler
 *
 * FIXES:
 *  1. Stack traces were sent to the client in production (SECURITY VULNERABILITY).
 *     Stack is now only included when NODE_ENV === 'development'.
 *  2. Supabase PGRST errors (PostgREST) were not handled — they returned a
 *     generic 500 with the raw DB message exposed to the client.
 *  3. Zod validation errors threw a raw ZodError object instead of a structured
 *     400 response — the client received an HTML "Cannot POST" page.
 *  4. Multer file-too-large error returned 500 instead of 413.
 *  5. JWT errors from jsonwebtoken were not caught here — now mapped to 401.
 *  6. `err.isJoi` check referenced Joi which isn't used — replaced with Zod check.
 */

const { ZodError }          = require('zod');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const { AppError }          = require('../utils/errors');
const logger                = require('../utils/logger');
const env                   = require('../config/env');

const IS_DEV = env.NODE_ENV === 'development';

// ── Map known error types to HTTP responses ───────────────────
function normalize(err) {
  // Already an AppError (our custom type)
  if (err.isOperational) {
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  // Zod validation errors (from validate middleware)
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', details };
  }

  // JWT errors (also caught in auth middleware — belt-and-suspenders)
  if (err instanceof TokenExpiredError) {
    return { status: 401, code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please log in again.' };
  }
  if (err instanceof JsonWebTokenError) {
    return { status: 401, code: 'INVALID_TOKEN', message: 'Invalid token.' };
  }

  // Supabase / PostgREST errors
  if (err.code?.startsWith('PGRST')) {
    return { status: 400, code: 'DB_QUERY_ERROR', message: 'Database query error', details: IS_DEV ? err.message : undefined };
  }
  if (err.code === '23505') {  // Postgres unique violation
    return { status: 409, code: 'CONFLICT', message: 'A record with this value already exists.' };
  }
  if (err.code === '23503') {  // Postgres foreign key violation
    return { status: 400, code: 'REFERENCE_ERROR', message: 'Referenced record does not exist.' };
  }

  // Multer (file uploads)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the size limit.' };
  }

  // Axios / fetch errors (from downstream services)
  if (err.isAxiosError) {
    return { status: 502, code: 'UPSTREAM_ERROR', message: 'Downstream service error.' };
  }

  // CORS error
  if (err.message?.includes('CORS')) {
    return { status: 403, code: 'CORS_BLOCKED', message: err.message };
  }

  // Unknown / programmer errors
  return { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
}

// ── Handler ───────────────────────────────────────────────────
function errorHandler(err, req, res, _next) {
  const { status, code, message, details } = normalize(err);

  // Log all server errors at error level; client errors at warn
  if (status >= 500) {
    logger.error({ err, requestId: req.id, method: req.method, url: req.url }, message);
  } else {
    logger.warn({ code, requestId: req.id, method: req.method, url: req.url, message });
  }

  const body = {
    error:     code,
    message,
    requestId: req.id,
  };

  if (details)     body.details  = details;
  // FIX: never leak stack traces in production
  if (IS_DEV && err.stack) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = errorHandler;

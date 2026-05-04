'use strict';

/**
 * AutoSys custom error classes.
 *
 * FIXES:
 *  1. AuthError was imported in auth.js route but didn't exist → runtime crash.
 *  2. ConflictError was imported in auth.js and team.js routes but didn't exist → crash.
 *  3. ForbiddenError was imported in leads.js route but didn't exist → crash.
 *  4. ValidationError constructor was missing the `details` parameter, so the
 *     error handler's `err.details` spread was always undefined.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
    this.details       = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// FIX: Added missing AuthError (used in auth.js route)
class AuthError extends AppError {
  constructor(message = 'Authentication failed', code = 'AUTH_ERROR') {
    super(message, 401, code);
  }
}

// FIX: Added missing ConflictError (used in auth.js + team.js routes)
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// FIX: Added missing ForbiddenError (imported in leads.js route)
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  AuthError,
  ConflictError,
  ForbiddenError,
};

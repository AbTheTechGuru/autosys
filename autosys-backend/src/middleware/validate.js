'use strict';

/**
 * AutoSys Validate Middleware
 *
 * FIXES:
 *  1. `schema.parse(req.body)` was called directly without a try/catch — any
 *     Zod validation error would bubble up as an unhandled exception, causing a
 *     500 response instead of a 400.
 *  2. The middleware only validated `body`. Added support for `params` and
 *     `query` schemas so route-level validators can validate all three.
 *  3. Parsed values (with Zod transforms / defaults applied) were not written
 *     back to req — the route handler still got the raw, untransformed input.
 *  4. ZodError was re-thrown as-is; the errorHandler now maps it to 400 correctly.
 */

const { ZodError } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * validate({ body?, params?, query? })
 *
 * Usage:
 *   router.post('/', validate({ body: mySchema }), handler)
 *   router.get('/:id', validate({ params: idSchema, query: filterSchema }), handler)
 */
function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      // FIX: parse each schema and write the coerced result back to req.*
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // FIX: convert Zod errors into a readable 400 ValidationError
        const details = err.errors.map((e) => ({
          field:   e.path.join('.') || 'body',
          message: e.message,
        }));
        return next(new ValidationError('Validation failed', details));
      }
      next(err);
    }
  };
}

module.exports = { validate };

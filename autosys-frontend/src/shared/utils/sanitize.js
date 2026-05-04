import DOMPurify from 'dompurify';
import { z } from 'zod';

/**
 * Sanitize a string to prevent XSS injection.
 * Uses DOMPurify with a strict no-HTML policy.
 */
export const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Sanitize all string values in a plain object.
 */
export const sanitizeObject = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' ? sanitize(value) : value;
  }
  return result;
};

/* ─── Zod Validation Schemas ─── */

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  name:     z.string().min(2, 'Full name is required').max(100),
  dealer:   z.string().min(2, 'Dealership name is required').max(200),
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const vehicleSchema = z.object({
  t:       z.string().min(3, 'Title is required').max(200),
  brand:   z.string().min(1, 'Brand is required'),
  model:   z.string().min(1, 'Model is required'),
  year:    z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  price:   z.coerce.number().positive('Price must be a positive number'),
  mileage: z.coerce.number().min(0),
  fuel:    z.enum(['Petrol', 'Diesel', 'Hybrid', 'Electric']),
  trans:   z.enum(['Automatic', 'Manual']),
  cond:    z.enum(['Foreign Used', 'Used', 'New']),
  status:  z.enum(['Available', 'Reserved', 'Sold']),
});

export const leadSchema = z.object({
  name:   z.string().min(2, 'Name is required').max(100),
  phone:  z.string().min(7, 'Valid phone number required').max(20),
  email:  z.string().email().optional().or(z.literal('')),
  car:    z.string().max(200).optional(),
  budget: z.coerce.number().min(0).optional(),
  src:    z.string().max(50).optional(),
  stage:  z.enum(['New', 'Contacted', 'Closed']).default('New'),
});

/**
 * Validate and return { data, errors }.
 * errors is null if valid, otherwise a record of field->message.
 */
export const validate = (schema, input) => {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data, errors: null };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] ?? '_';
    errors[key] = issue.message;
  }
  return { data: null, errors };
};

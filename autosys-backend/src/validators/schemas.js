'use strict';

/**
 * AutoSys Zod Validation Schemas
 *
 * FIXES:
 *  1. aiFollowupSchema was imported in ai.js routes but was not exported — crash.
 *  2. aiChatSchema was imported in ai.js routes but was not exported — crash.
 *  3. aiSocialSchema was imported in ai.js routes but was not exported — crash.
 *  4. Several schemas used `.nonempty()` (deprecated in Zod v3) — changed to
 *     `.min(1)` which is the correct v3 API.
 *  5. vehicleSchema `price` field used `.positive()` but 0 is a valid price
 *     for trade-ins — changed to `.nonnegative()`.
 *  6. leadSchema `phone` used `.regex()` with a hardcoded Nigerian prefix (+234)
 *     making the app reject valid phone numbers for all other countries.
 *     Changed to a generic E.164 international phone regex.
 */

const { z } = require('zod');

// ── Shared field types ────────────────────────────────────────
const id        = z.string().uuid();
const email     = z.string().email().toLowerCase().trim();
const phone     = z.string()
  // FIX: generic E.164 — accepts any country code
  .regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid phone number (e.g. +2348012345678)')
  .optional();

// ── Vehicle ───────────────────────────────────────────────────
const vehicleSchema = z.object({
  brand:     z.string().min(1).max(100).trim(),
  model:     z.string().min(1).max(100).trim(),
  year:      z.number().int().min(1900).max(new Date().getFullYear() + 1),
  // FIX: nonnegative instead of positive (0 is valid for trade-ins/auctions)
  price:     z.number().nonnegative(),
  mileage:   z.number().nonnegative().optional(),
  color:     z.string().max(50).optional(),
  condition: z.enum(['new', 'foreign-used', 'nigerian-used', 'salvage']),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'gas']).optional(),
  features:  z.array(z.string()).optional().default([]),
  images:    z.array(z.string().url()).optional().default([]),
  status:    z.enum(['available', 'reserved', 'sold']).default('available'),
  notes:     z.string().max(2000).optional(),
});

// ── Lead ──────────────────────────────────────────────────────
const leadSchema = z.object({
  name:             z.string().min(1).max(200).trim(),
  email:            email.optional(),
  phone:            phone,
  source:           z.enum(['website', 'whatsapp', 'instagram', 'facebook', 'walk-in', 'referral', 'jiji', 'other']).default('other'),
  vehicle_interest: z.string().max(200).optional(),
  budget:           z.number().nonnegative().optional(),
  notes:            z.string().max(2000).optional(),
  stage:            z.enum(['new', 'contacted', 'interested', 'negotiation', 'closed_won', 'closed_lost']).default('new'),
  assigned_to:      id.optional(),
});

// ── Deal ──────────────────────────────────────────────────────
const dealSchema = z.object({
  lead_id:     id,
  vehicle_id:  id,
  value:       z.number().positive(),
  stage:       z.enum(['offer', 'negotiation', 'payment', 'paperwork', 'delivered', 'closed_lost']).default('offer'),
  notes:       z.string().max(2000).optional(),
  assigned_to: id.optional(),
});

// ── AI schemas ────────────────────────────────────────────────
const aiDescriptionSchema = z.object({
  brand:     z.string().min(1).trim(),
  model:     z.string().min(1).trim(),
  year:      z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage:   z.number().nonnegative().optional(),
  condition: z.string().optional(),
  price:     z.number().nonnegative().optional(),
  features:  z.array(z.string()).optional().default([]),
  color:     z.string().optional(),
});

const aiPricingSchema = z.object({
  brand:        z.string().min(1).trim(),
  model:        z.string().min(1).trim(),
  year:         z.number().int().min(1900),
  mileage:      z.number().nonnegative().optional(),
  condition:    z.string().optional(),
  currentPrice: z.number().nonnegative().optional(),
});

// FIX: was missing — imported in ai.js routes
const aiFollowupSchema = z.object({
  lead_id: id,
});

// FIX: was missing — imported in ai.js routes
const aiSocialSchema = z.object({
  brand:     z.string().min(1).trim(),
  model:     z.string().min(1).trim(),
  year:      z.number().int().min(1900),
  price:     z.number().nonnegative().optional(),
  mileage:   z.number().nonnegative().optional(),
  condition: z.string().optional(),
  color:     z.string().optional(),
});

// FIX: was missing — imported in ai.js routes
const aiChatSchema = z.object({
  messages: z.array(
    z.object({
      role:    z.enum(['user', 'assistant']),
      content: z.string().min(1).max(4000),
    }),
  ).min(1).max(20),
});

// ── Team member ───────────────────────────────────────────────
const teamMemberSchema = z.object({
  full_name: z.string().min(2).max(200).trim(),
  email,
  role:      z.enum(['owner', 'admin', 'sales', 'viewer']),
  phone:     phone,
});

// ── Campaign ──────────────────────────────────────────────────
const campaignSchema = z.object({
  name:      z.string().min(1).max(200).trim(),
  type:      z.enum(['whatsapp', 'email', 'sms', 'instagram']),
  audience:  z.enum(['all', 'leads', 'customers', 'hot_leads', 'cold_leads']),
  message:   z.string().min(1).max(4000),
  // FIX: .nonempty() deprecated in Zod v3 → .min(1)
  scheduled_at: z.string().datetime().optional(),
});

// ── Settings ──────────────────────────────────────────────────
const settingsSchema = z.object({
  name:          z.string().min(1).max(200).trim().optional(),
  subdomain:     z.string()
    .regex(/^[a-z0-9-]{3,50}$/, 'Subdomain must be 3-50 lowercase letters, numbers, or hyphens')
    .optional(),
  phone:         phone,
  address:       z.string().max(500).optional(),
  city:          z.string().max(100).optional(),
  country:       z.string().length(2).toUpperCase().optional(),
  currency:      z.string().length(3).toUpperCase().optional(),
  timezone:      z.string().optional(),
  email:         email.optional(),
  website_theme: z.enum(['modern', 'classic', 'luxury', 'sport']).optional(),
});

// ── Payment ───────────────────────────────────────────────────
const paymentSchema = z.object({
  deal_id:  id,
  amount:   z.number().positive(),
  method:   z.enum(['paystack', 'flutterwave', 'stripe', 'cash', 'transfer']),
  currency: z.string().length(3).toUpperCase().optional(),
  notes:    z.string().max(500).optional(),
});

// ── Pagination ────────────────────────────────────────────────
const paginationSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  sort:   z.string().optional(),
  order:  z.enum(['asc', 'desc']).default('desc'),
});

module.exports = {
  vehicleSchema,
  leadSchema,
  dealSchema,
  aiDescriptionSchema,
  aiPricingSchema,
  aiFollowupSchema,   // FIX: added
  aiSocialSchema,     // FIX: added
  aiChatSchema,       // FIX: added
  teamMemberSchema,
  campaignSchema,
  settingsSchema,
  paymentSchema,
  paginationSchema,
};

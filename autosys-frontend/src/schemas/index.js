import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Frontend form fields: fullName, dealershipName, email, password
// These match backend signup schema exactly — no mapping needed.
export const signupSchema = z.object({
  fullName:       z.string().min(2, 'Full name is required').max(100).trim(),
  dealershipName: z.string().min(2, 'Dealership name is required').max(200).trim(),
  email:          z.string().email('Please enter a valid email'),
  password:       z.string().min(8, 'Password must be at least 8 characters'),
});

// ── Inventory ─────────────────────────────────────────────────
// Field names match backend createVehicleSchema (snake_case, lowercase enums).
export const vehicleSchema = z.object({
  brand:        z.string().min(1, 'Brand is required'),
  model:        z.string().min(1, 'Model is required'),
  year:         z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  price:        z.coerce.number().positive('Price must be positive'),
  mileage:      z.coerce.number().min(0, 'Mileage cannot be negative'),
  fuel_type:    z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'cng']),
  transmission: z.enum(['automatic', 'manual']),
  condition:    z.enum(['foreign_used', 'locally_used', 'brand_new']),
  status:       z.enum(['available', 'reserved', 'sold']).default('available'),
  color:        z.string().max(40).optional(),
  description:  z.string().max(2000).optional(),
  features:     z.array(z.string()).default([]),
});

// ── CRM ───────────────────────────────────────────────────────
// Field names match backend createLeadSchema.
export const leadSchema = z.object({
  name:             z.string().min(2, 'Name is required').max(100),
  phone:            z.string().min(7, 'Phone number required').max(20),
  email:            z.string().email().optional().or(z.literal('')),
  vehicle_interest: z.string().max(200).optional(),
  budget:           z.coerce.number().min(0).optional(),
  source:           z.enum(['website', 'whatsapp', 'referral', 'instagram', 'facebook', 'walkin', 'phone', 'other']).default('other'),
  stage:            z.enum(['new', 'contacted', 'negotiating', 'closed_won', 'closed_lost']).default('new'),
  notes:            z.string().max(2000).optional(),
});

// ── Settings ──────────────────────────────────────────────────
export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export const profileSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  phone:    z.string().min(7).max(20).optional().or(z.literal('')),
  whatsapp: z.string().min(7).max(20).optional().or(z.literal('')),
  address:  z.string().max(300).optional(),
  city:     z.string().max(100).optional(),
});

// ── Marketing ─────────────────────────────────────────────────
export const campaignSchema = z.object({
  name:     z.string().min(2, 'Campaign name is required').max(200),
  type:     z.enum(['whatsapp', 'email', 'instagram', 'sms']),
  audience: z.enum(['all', 'new_leads', 'contacted', 'customers']),
  message:  z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

// ── Display helpers (frontend UI → form value conversion) ─────
// Convert user-friendly display values to backend enum values.
export const toFuelType  = (v) =>
  ({ Petrol:'petrol', Diesel:'diesel', Hybrid:'hybrid', Electric:'electric', CNG:'cng' }[v] ?? v.toLowerCase());
export const toTrans     = (v) =>
  v?.toLowerCase();
export const toCondition = (v) =>
  ({ 'Foreign Used':'foreign_used', 'Used':'locally_used', 'New':'brand_new', 'Brand New':'brand_new' }[v] ?? v.toLowerCase().replace(' ', '_'));
export const toStage     = (v) => v?.toLowerCase().replace(' ', '_');
export const toSource    = (v) => v?.toLowerCase().replace('-', '').replace(' ', '');

// ── Helper: safe parse returning { data, errors } ─────────────
export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data, errors: null };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { data: null, errors };
}

/**
 * AutoSys API Index — single source of truth for all API imports.
 * Import everything from here: import { crmApi, salesApi } from '@/services/api';
 *
 * Rules:
 *  - Each named export appears EXACTLY ONCE across all export lines.
 *  - adminApi lives in admin.api.js only — NOT re-exported from global.api.js.
 *  - websiteApi lives in global.api.js — exported here under that name.
 */

export { default as client, getToken, setToken, clearToken } from './client';

// ── Feature-specific API modules ──────────────────────────────
export { authApi }          from './auth.api';
export { crmApi }           from './crm.api';
export { salesApi }         from './sales.api';
export { analyticsApi }     from './analytics.api';
export { marketingApi }     from './marketing.api';
export { adminApi }         from './admin.api';
export { aiApi }            from './ai.api';
export { blogApi, adminBlogApi } from './blog.api';

// ── Global / shared API modules ───────────────────────────────
// Note: adminApi is NOT included here — it comes from admin.api.js above.
export {
  pricingApi,
  automationApi,
  calendarApi,
  inboxApi,
  socialApi,
  globalPaymentApi,
  tenantApi,
} from './global.api';

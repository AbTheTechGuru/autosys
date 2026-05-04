/**
 * AutoSys API Index
 *
 * FIXES:
 *  1. blogApi and adminBlogApi were defined in blog.api.js and used throughout
 *     the blog/admin-blog pages, but were never exported from this index file.
 *     Any component importing from '@/services/api' would get undefined.
 *  2. Added missing newline at end of file (cosmetic).
 */

export { default as client, getToken, setToken, clearToken } from './client';
export { authApi }      from './auth.api';
export { crmApi }       from './crm.api';
export { salesApi }     from './sales.api';
export { analyticsApi } from './analytics.api';
export { marketingApi } from './marketing.api';
export { adminApi }     from './admin.api';
export { aiApi }        from './ai.api';
export { blogApi, adminBlogApi } from './blog.api'; // FIX: was missing entirely
export {
  pricingApi,
  automationApi,
  calendarApi,
  inboxApi,
  socialApi,
  globalPaymentApi,
  tenantApi,
} from './global.api';

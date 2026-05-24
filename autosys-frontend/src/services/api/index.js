/**
 * AutoSys API Index — fully connected
 */
export { default as client, getToken, setToken, clearToken } from './client';
export { authApi }      from './auth.api';
export { crmApi }       from './crm.api';
export { salesApi, vehicleImageApi } from './sales.api';
export { marketingApi } from './marketing.api';
export { aiApi }        from './ai.api';
export { blogApi, adminBlogApi } from './blog.api';
export {
  pricingApi,
  automationApi,
  calendarApi,
  inboxApi,
  socialApi,
  globalPaymentApi,
  tenantApi,
  adminApi,
  websiteApi,
  analyticsApi,
  paymentsApi,
  teamApi,
  commissionsApi,
  settingsApi,
} from './global.api';

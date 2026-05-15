import client from '@/services/api/client';

/* ── Pricing API (public — no auth) ─────────────────────────── */
export const pricingApi = {
  /** GET /pricing?country=NG&plan=pro */
  getPricing: (country, plan = 'pro') =>
    client.get('/pricing', { params: { country, plan } }),

  /** GET /pricing/countries */
  getCountries: () =>
    client.get('/pricing/countries'),

  /** GET /pricing/plans?country=NG */
  getPlans: (country) =>
    client.get('/pricing/plans', { params: { country } }),
};

/* ── Automation Engine API ───────────────────────────────────── */
export const automationApi = {
  /** GET /automations */
  list: () => client.get('/automations'),

  /** GET /automations/meta — trigger/action enums */
  getMeta: () => client.get('/automations/meta'),

  /** GET /automations/:id */
  get: (id) => client.get(`/automations/${id}`),

  /** POST /automations */
  create: (data) => client.post('/automations', data),

  /** PUT /automations/:id */
  update: (id, data) => client.put(`/automations/${id}`, data),

  /** PATCH /automations/:id — toggle enabled */
  toggle: (id, enabled) => client.patch(`/automations/${id}`, { enabled }),

  /** DELETE /automations/:id */
  delete: (id) => client.delete(`/automations/${id}`),

  /** POST /automations/test-trigger */
  testTrigger: (trigger, payload = {}) =>
    client.post('/automations/test-trigger', { trigger, payload }),
};

/* ── Calendar + Tasks API ───────────────────────────────────── */
export const calendarApi = {
  // Tasks
  getTasks: (params = {}) => client.get('/calendar/tasks', { params }),
  createTask: (data) => client.post('/calendar/tasks', data),
  updateTask: (id, data) => client.patch(`/calendar/tasks/${id}`, data),
  deleteTask: (id) => client.delete(`/calendar/tasks/${id}`),

  // Events
  getEvents: (params = {}) => client.get('/calendar/events', { params }),
  createEvent: (data) => client.post('/calendar/events', data),
  updateEvent: (id, data) => client.patch(`/calendar/events/${id}`, data),
  deleteEvent: (id) => client.delete(`/calendar/events/${id}`),

  // Overview (tasks + events combined)
  getOverview: (from, to) => client.get('/calendar/overview', { params: { from, to } }),
};

/* ── Unified Inbox API ──────────────────────────────────────── */
export const inboxApi = {
  /** GET /inbox — paginated messages */
  getMessages: (params = {}) => client.get('/inbox', { params }),

  /** GET /inbox/conversations — grouped by lead */
  getConversations: (params = {}) => client.get('/inbox/conversations', { params }),

  /** GET /inbox/thread/:leadId */
  getThread: (leadId, channel = null) =>
    client.get(`/inbox/thread/${leadId}`, { params: channel ? { channel } : {} }),

  /** POST /inbox/send — send via any channel */
  send: ({ leadId, channel, message, subject }) =>
    client.post('/inbox/send', { leadId, channel, message, subject }),

  /** POST /inbox/call */
  initiateCall: (phone, method = 'tel') =>
    client.post('/inbox/call', { phone, method }),
};

/* ── Social Media API ───────────────────────────────────────── */
export const socialApi = {
  /** GET /social/posts */
  getPosts: (params = {}) => client.get('/social/posts', { params }),

  /** POST /social/post */
  post: ({ platforms, content, mediaUrls, vehicleId, scheduledAt }) =>
    client.post('/social/post', { platforms, content, mediaUrls, vehicleId, scheduledAt }),

  /** POST /social/post-vehicle/:vehicleId */
  postVehicle: (vehicleId, platforms = ['facebook', 'instagram']) =>
    client.post(`/social/post-vehicle/${vehicleId}`, { platforms }),

  /** GET /social/analytics */
  getAnalytics: (from, to) => client.get('/social/analytics', { params: { from, to } }),
};

/* ── Global Payment API (extended) ─────────────────────────── */
export const globalPaymentApi = {
  /** POST /payments/initialize */
  initialize: (data) => client.post('/payments/initialize', data),

  /** GET /payments/verify/:reference */
  verify: (reference) => client.get(`/payments/verify/${reference}`),
};

/* ── Tenant/Settings API ─────────────────────────────────────── */
export const tenantApi = {
  /** GET /settings/global */
  getGlobalSettings: () => client.get('/settings/global'),

  /** PATCH /settings/global */
  updateGlobalSettings: (data) => client.patch('/settings/global', data),

  /** GET /settings/dealer */
  getDealerConfig: () => client.get('/settings/dealer'),
};

export const websiteApi = {
  getConfig:    ()     => client.get('/websites/config'),
  saveConfig:   (body) => client.put('/websites/config', body),
  publish:      ()     => client.post('/websites/publish'),
  getAnalytics: ()     => client.get('/websites/analytics'),
};
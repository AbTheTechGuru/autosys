/**
 * AutoSys Blog API Client
 * ─────────────────────────
 * All blog-related API calls. Import alongside existing api/index.js.
 */
import client from '@/services/api/client';

/* ── Public blog API ─────────────────────────────────────────── */
export const blogApi = {
  /**
   * GET /blog — published posts (paginated + filterable)
   */
  getPosts: ({ page = 1, limit = 12, category, tag, search, featured } = {}) =>
    client.get('/blog', { params: { page, limit, category, tag, search, featured } }),

  /**
   * GET /blog/categories
   */
  getCategories: () => client.get('/blog/categories'),

  /**
   * GET /blog/featured — latest featured posts for landing page
   */
  getFeatured: () => client.get('/blog/featured'),

  /**
   * GET /blog/related/:slug
   */
  getRelated: (slug) => client.get(`/blog/related/${slug}`),

  /**
   * GET /blog/:slug — single post
   */
  getPost: (slug) => client.get(`/blog/${slug}`),

  /**
   * POST /blog/:slug/view — track page view
   */
  trackView: (slug) => client.post(`/blog/${slug}/view`),

  /**
   * POST /blog/:slug/cta-click — track CTA click
   */
  trackCta: (slug, ctaType, destination = '/auth') =>
    client.post(`/blog/${slug}/cta-click`, { ctaType, destination }),
};

/* ── Admin blog API ──────────────────────────────────────────── */
export const adminBlogApi = {
  /**
   * GET /admin/blog — all posts (admin only)
   */
  listAll: (params = {}) => client.get('/admin/blog', { params }),

  /**
   * GET /admin/blog/analytics
   */
  getAnalytics: () => client.get('/admin/blog/analytics'),

  /**
   * GET /admin/blog/:id
   */
  getById: (id) => client.get(`/admin/blog/${id}`),

  /**
   * POST /admin/blog — create
   */
  create: (data) => client.post('/admin/blog', data),

  /**
   * PUT /admin/blog/:id — update
   */
  update: (id, data) => client.put(`/admin/blog/${id}`, data),

  /**
   * PATCH /admin/blog/:id/publish — toggle publish
   */
  togglePublish: (id) => client.patch(`/admin/blog/${id}/publish`),

  /**
   * DELETE /admin/blog/:id
   */
  delete: (id) => client.delete(`/admin/blog/${id}`),
};

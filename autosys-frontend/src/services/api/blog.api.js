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

/**
 * Normalize post data from snake_case (frontend state) → camelCase (backend expects).
 *
 * The backend route (routes/blog.js) destructures:
 *   { title, slug, content, excerpt, featuredImage, authorName, authorBio,
 *     status, categorySlug, tags, featured, metaTitle, metaDesc, ogImage }
 *
 * The editor's form state and blogStore use snake_case keys, so we map them here
 * before every create/update call — single place, easy to maintain.
 */
function toBackend(data) {
  return {
    title:         data.title,
    slug:          data.slug,
    content:       data.content,
    excerpt:       data.excerpt,
    // snake_case from editor/store → camelCase for backend
    featuredImage: data.featuredImage  ?? data.featured_image  ?? null,
    authorName:    data.authorName     ?? data.author_name     ?? 'AutoSys Team',
    authorBio:     data.authorBio      ?? data.author_bio      ?? null,
    status:        data.status         ?? 'draft',
    categorySlug:  data.categorySlug   ?? data.category_slug   ?? null,
    tags:          data.tags           ?? [],
    featured:      data.featured       ?? false,
    metaTitle:     data.metaTitle      ?? data.meta_title      ?? null,
    metaDesc:      data.metaDesc       ?? data.meta_desc       ?? null,
    ogImage:       data.ogImage        ?? data.og_image        ?? null,
    read_time:     data.read_time      ?? 1,
  };
}

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
   * Normalizes field names to camelCase before sending (backend destructures camelCase).
   */
  create: (data) => client.post('/admin/blog', toBackend(data)),

  /**
   * PUT /admin/blog/:id — update
   * Normalizes field names to camelCase before sending.
   */
  update: (id, data) => client.put(`/admin/blog/${id}`, toBackend(data)),

  /**
   * PATCH /admin/blog/:id/publish — toggle publish
   */
  togglePublish: (id) => client.patch(`/admin/blog/${id}/publish`),

  /**
   * DELETE /admin/blog/:id
   */
  delete: (id) => client.delete(`/admin/blog/${id}`),
};

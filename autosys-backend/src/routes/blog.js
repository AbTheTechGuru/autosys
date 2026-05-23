'use strict';

/**
 * AutoSys Blog API — routes/blog.js
 * ─────────────────────────────────
 * Public:
 *   GET  /api/blog                  → published posts (paginated, filterable)
 *   GET  /api/blog/categories       → all categories
 *   GET  /api/blog/featured         → featured posts
 *   GET  /api/blog/:slug            → single published post
 *   POST /api/blog/:slug/view       → increment view count (analytics)
 *   POST /api/blog/:slug/cta-click  → track CTA click
 *
 * Admin (auth required, superadmin/owner/admin roles):
 *   GET    /api/admin/blog          → all posts (any status)
 *   POST   /api/admin/blog          → create post
 *   PUT    /api/admin/blog/:id      → update post
 *   DELETE /api/admin/blog/:id      → delete post
 *   PATCH  /api/admin/blog/:id/publish  → toggle publish
 *   GET    /api/admin/blog/analytics    → view + click stats
 */

require('express-async-errors');

const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { AppError, NotFoundError } = require('../utils/errors');

const publicRouter = express.Router();
const adminRouter  = express.Router();

// ── Slug generator ─────────────────────────────────────────────
function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ── Ensure slug uniqueness ─────────────────────────────────────
async function uniqueSlug(base, excludeId = null) {
  let slug = base;
  let i    = 0;
  while (true) {
    const q = supabase.from('blog_posts').select('id').eq('slug', slug);
    if (excludeId) q.neq('id', excludeId);
    const { data } = await q;
    if (!data?.length) return slug;
    slug = `${base}-${++i}`;
  }
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────

// GET /api/blog — list published posts
publicRouter.get('/', async (req, res) => {
  const {
    page     = 1,
    limit    = 12,
    category,
    tag,
    search,
    featured,
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('blog_posts')
    .select(
      'id, title, slug, excerpt, featured_image, author_name, author_avatar, status, category_slug, tags, read_time, view_count, published_at, featured',
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (category) query = query.eq('category_slug', category);
  if (featured) query = query.eq('featured', true);
  if (tag)      query = query.contains('tags', [tag]);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,excerpt.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({
    posts:      data || [],
    total:      count  || 0,
    page:       Number(page),
    limit:      Number(limit),
    totalPages: Math.ceil((count || 0) / Number(limit)),
  });
});

// GET /api/blog/categories — all categories with counts
publicRouter.get('/categories', async (_req, res) => {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('id, name, slug, description, color, post_count')
    .order('name');

  if (error) throw error;
  res.json({ categories: data || [] });
});

// GET /api/blog/featured — latest 3 featured posts
publicRouter.get('/featured', async (_req, res) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, author_name, category_slug, tags, read_time, published_at')
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  res.json({ posts: data || [] });
});

// GET /api/blog/related/:slug — related posts (same category, exclude self)
publicRouter.get('/related/:slug', async (req, res) => {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id, category_slug, tags')
    .eq('slug', req.params.slug)
    .single();

  if (!post) return res.json({ posts: [] });

  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, author_name, read_time, published_at')
    .eq('status', 'published')
    .eq('category_slug', post.category_slug)
    .neq('slug', req.params.slug)
    .order('published_at', { ascending: false })
    .limit(3);

  res.json({ posts: data || [] });
});

// GET /api/blog/:slug — single published post
publicRouter.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('status', 'published')
    .single();

  if (error || !data) throw new NotFoundError('Blog post');
  res.json({ post: data });
});

// POST /api/blog/:slug/view — track view (fire-and-forget)
publicRouter.post('/:slug/view', async (req, res) => {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', req.params.slug)
    .single();

  if (post) {
    const fp = req.headers['x-visitor-id'] || req.ip;
    await supabase.rpc('increment_blog_views', {
      p_post_id:     post.id,
      p_fingerprint: fp,
    });
  }

  res.json({ tracked: true });
});

// POST /api/blog/:slug/cta-click — track CTA click
publicRouter.post('/:slug/cta-click', async (req, res) => {
  const { ctaType = 'unknown', destination = '/auth' } = req.body;

  const { data: post } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', req.params.slug)
    .single();

  if (post) {
    await supabase.from('blog_cta_clicks').insert({
      post_id:     post.id,
      cta_type:    ctaType,
      destination,
    });
  }

  res.json({ tracked: true });
});

// ─────────────────────────────────────────────────────────────────
// ADMIN ROUTES (auth required)
// ─────────────────────────────────────────────────────────────────

adminRouter.use(authenticate);

const ADMIN_ROLES = ['superadmin', 'owner', 'admin'];

function assertAdmin(req) {
  if (!ADMIN_ROLES.includes(req.auth?.role)) {
    throw new AppError('Admin access required', 403, 'FORBIDDEN');
  }
}

// GET /api/admin/blog — all posts (any status)
adminRouter.get('/', async (req, res) => {
  assertAdmin(req);

  const { status, category, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, status, category_slug, tags, read_time, view_count, featured, published_at, created_at, updated_at, author_name', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (status)   query = query.eq('status', status);
  if (category) query = query.eq('category_slug', category);
  if (search)   query = query.ilike('title', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ posts: data || [], total: count || 0 });
});

// GET /api/admin/blog/analytics — blog analytics summary
adminRouter.get('/analytics', async (req, res) => {
  assertAdmin(req);

  const [posts, views, clicks] = await Promise.all([
    supabase.from('blog_posts').select('status, view_count').then(({ data }) => data || []),
    supabase.from('blog_views').select('post_id, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).then(({ data }) => data || []),
    supabase.from('blog_cta_clicks').select('cta_type').then(({ data }) => data || []),
  ]);

  res.json({
    totalPosts:     posts.length,
    publishedPosts: posts.filter((p) => p.status === 'published').length,
    draftPosts:     posts.filter((p) => p.status === 'draft').length,
    totalViews:     posts.reduce((s, p) => s + (p.view_count || 0), 0),
    viewsLast30d:   views.length,
    totalClicks:    clicks.length,
    clicksByType:   clicks.reduce((acc, c) => { acc[c.cta_type] = (acc[c.cta_type] || 0) + 1; return acc; }, {}),
  });
});

// GET /api/admin/blog/:id — single post (any status)
adminRouter.get('/:id', async (req, res) => {
  assertAdmin(req);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) throw new NotFoundError('Blog post');
  res.json({ post: data });
});

// POST /api/admin/blog — create post
adminRouter.post('/', async (req, res) => {
  assertAdmin(req);

  const {
    title, slug, content, excerpt,
    // Accept both camelCase (from frontend) and snake_case (legacy) field names
    featuredImage, featured_image,
    authorName,    author_name,
    authorBio,     author_bio,
    status = 'draft',
    categorySlug,  category_slug,
    tags = [], featured = false,
    metaTitle,     meta_title,
    metaDesc,      meta_desc,
    ogImage,       og_image,
  } = req.body;

  if (!title) throw new AppError('title is required', 400, 'VALIDATION_ERROR');

  // Normalise — prefer camelCase but accept snake_case fallback
  const resolvedFeaturedImage = featuredImage  || featured_image  || null;
  const resolvedAuthorName    = authorName     || author_name     || 'AutoSys Team';
  const resolvedAuthorBio     = authorBio      || author_bio      || null;
  const resolvedCategorySlug  = categorySlug   || category_slug   || null;
  const resolvedMetaTitle     = metaTitle      || meta_title      || null;
  const resolvedMetaDesc      = metaDesc       || meta_desc       || null;
  const resolvedOgImage       = ogImage        || og_image        || null;

  // Convert empty strings to null (prevents DB constraint issues)
  const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v);

  const baseSlug  = slug ? toSlug(slug) : toSlug(title);
  const finalSlug = await uniqueSlug(baseSlug);

  // Verify the userId exists in users table before inserting.
  // If it doesn't (e.g. JWT sub doesn't match users.id), set created_by to null
  // rather than failing the entire insert with a FK violation.
  let createdBy = req.auth.userId || null;
  if (createdBy) {
    const { data: userExists } = await supabase
      .from('users').select('id').eq('id', createdBy).single();
    if (!userExists) createdBy = null;
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug:           finalSlug,
      content:        content                          || '',
      excerpt:        excerpt                          || '',
      featured_image: nullIfEmpty(resolvedFeaturedImage),
      author_name:    resolvedAuthorName,
      author_bio:     nullIfEmpty(resolvedAuthorBio),
      status,
      category_slug:  nullIfEmpty(resolvedCategorySlug),
      tags:           Array.isArray(tags) ? tags : [],
      featured:       Boolean(featured),
      meta_title:     nullIfEmpty(resolvedMetaTitle),
      meta_desc:      nullIfEmpty(resolvedMetaDesc),
      og_image:       nullIfEmpty(resolvedOgImage),
      created_by:     createdBy,   // null-safe — won't violate FK constraint
    })
    .select()
    .single();

  if (error) {
    // Surface the real Supabase error so it appears in Render logs
    console.error('[Blog] Create error:', JSON.stringify(error));
    throw new AppError(
      error.message || 'Failed to create blog post',
      error.code === '23505' ? 409 : 500,
      error.code || 'DB_ERROR',
    );
  }

  res.status(201).json({ post: data });
});

// PUT /api/admin/blog/:id — full update
adminRouter.put('/:id', async (req, res) => {
  assertAdmin(req);

  const {
    title, slug, content, excerpt,
    // Accept both camelCase and snake_case
    featuredImage, featured_image,
    authorName,    author_name,
    authorBio,     author_bio,
    status,
    categorySlug,  category_slug,
    tags, featured,
    metaTitle,     meta_title,
    metaDesc,      meta_desc,
    ogImage,       og_image,
  } = req.body;

  // Normalise camelCase vs snake_case
  const resolvedFeaturedImage = featuredImage !== undefined ? featuredImage : featured_image;
  const resolvedAuthorName    = authorName    !== undefined ? authorName    : author_name;
  const resolvedAuthorBio     = authorBio     !== undefined ? authorBio     : author_bio;
  const resolvedCategorySlug  = categorySlug  !== undefined ? categorySlug  : category_slug;
  const resolvedMetaTitle     = metaTitle     !== undefined ? metaTitle     : meta_title;
  const resolvedMetaDesc      = metaDesc      !== undefined ? metaDesc      : meta_desc;
  const resolvedOgImage       = ogImage       !== undefined ? ogImage       : og_image;

  const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v);

  // Re-slug only if slug field explicitly provided
  let finalSlug;
  if (slug !== undefined) {
    const base = toSlug(slug || title || '');
    finalSlug  = await uniqueSlug(base, req.params.id);
  }

  const updates = {};
  if (title                      !== undefined) updates.title          = title;
  if (finalSlug                  !== undefined) updates.slug           = finalSlug;
  if (content                    !== undefined) updates.content        = content;
  if (excerpt                    !== undefined) updates.excerpt        = excerpt;
  if (resolvedFeaturedImage      !== undefined) updates.featured_image = nullIfEmpty(resolvedFeaturedImage);
  if (resolvedAuthorName         !== undefined) updates.author_name    = resolvedAuthorName || 'AutoSys Team';
  if (resolvedAuthorBio          !== undefined) updates.author_bio     = nullIfEmpty(resolvedAuthorBio);
  if (status                     !== undefined) updates.status         = status;
  if (resolvedCategorySlug       !== undefined) updates.category_slug  = nullIfEmpty(resolvedCategorySlug);
  if (tags                       !== undefined) updates.tags           = Array.isArray(tags) ? tags : [];
  if (featured                   !== undefined) updates.featured       = Boolean(featured);
  if (resolvedMetaTitle          !== undefined) updates.meta_title     = nullIfEmpty(resolvedMetaTitle);
  if (resolvedMetaDesc           !== undefined) updates.meta_desc      = nullIfEmpty(resolvedMetaDesc);
  if (resolvedOgImage            !== undefined) updates.og_image       = nullIfEmpty(resolvedOgImage);

  if (Object.keys(updates).length === 0) {
    return res.json({ post: { id: req.params.id, message: 'Nothing to update' } });
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error('[Blog] Update error:', JSON.stringify(error));
    throw new AppError(
      error.message || 'Failed to update blog post',
      500,
      error.code || 'DB_ERROR',
    );
  }
  if (!data) throw new NotFoundError('Blog post');

  res.json({ post: data });
});

// PATCH /api/admin/blog/:id/publish — toggle publish/draft
adminRouter.patch('/:id/publish', async (req, res) => {
  assertAdmin(req);

  const { data: existing } = await supabase
    .from('blog_posts')
    .select('status')
    .eq('id', req.params.id)
    .single();

  if (!existing) throw new NotFoundError('Blog post');

  const newStatus = existing.status === 'published' ? 'draft' : 'published';

  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      status:       newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw error;
  res.json({ post: data });
});

// DELETE /api/admin/blog/:id
adminRouter.delete('/:id', async (req, res) => {
  assertAdmin(req);

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', req.params.id);

  if (error) throw error;
  res.json({ success: true });
});

module.exports = { publicRouter, adminRouter };

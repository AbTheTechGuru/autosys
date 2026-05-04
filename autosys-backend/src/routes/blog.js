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
    title, slug, content, excerpt, featuredImage,
    authorName, authorBio, status = 'draft',
    categorySlug, tags = [], featured = false,
    metaTitle, metaDesc, ogImage,
  } = req.body;

  if (!title) throw new AppError('title is required', 400, 'VALIDATION_ERROR');

  const baseSlug  = slug ? toSlug(slug) : toSlug(title);
  const finalSlug = await uniqueSlug(baseSlug);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug:           finalSlug,
      content:        content       || '',
      excerpt:        excerpt       || '',
      featured_image: featuredImage || null,
      author_name:    authorName    || 'AutoSys Team',
      author_bio:     authorBio     || null,
      status,
      category_slug:  categorySlug  || null,
      tags,
      featured,
      meta_title:     metaTitle     || null,
      meta_desc:      metaDesc      || null,
      og_image:       ogImage       || null,
      created_by:     req.auth.userId,
    })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ post: data });
});

// PUT /api/admin/blog/:id — full update
adminRouter.put('/:id', async (req, res) => {
  assertAdmin(req);

  const {
    title, slug, content, excerpt, featuredImage,
    authorName, authorBio, status,
    categorySlug, tags, featured,
    metaTitle, metaDesc, ogImage,
  } = req.body;

  // Re-slug only if slug field explicitly provided
  let finalSlug;
  if (slug !== undefined) {
    const base = toSlug(slug || title || '');
    finalSlug  = await uniqueSlug(base, req.params.id);
  }

  const updates = {};
  if (title        !== undefined) updates.title          = title;
  if (finalSlug    !== undefined) updates.slug           = finalSlug;
  if (content      !== undefined) updates.content        = content;
  if (excerpt      !== undefined) updates.excerpt        = excerpt;
  if (featuredImage!== undefined) updates.featured_image = featuredImage;
  if (authorName   !== undefined) updates.author_name    = authorName;
  if (authorBio    !== undefined) updates.author_bio     = authorBio;
  if (status       !== undefined) updates.status         = status;
  if (categorySlug !== undefined) updates.category_slug  = categorySlug;
  if (tags         !== undefined) updates.tags           = tags;
  if (featured     !== undefined) updates.featured       = featured;
  if (metaTitle    !== undefined) updates.meta_title     = metaTitle;
  if (metaDesc     !== undefined) updates.meta_desc      = metaDesc;
  if (ogImage      !== undefined) updates.og_image       = ogImage;

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Blog post');
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

'use strict';

const express        = require('express');
const { supabase }   = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { AppError }   = require('../utils/errors');
const socialService  = require('../services/social.service');

const router = express.Router();
router.use(authenticate);

const PLATFORMS = ['facebook', 'instagram', 'tiktok'];

// GET /social/posts — history
router.get('/posts', async (req, res) => {
  const { platform, limit = 30, page = 1 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const posts = await socialService.getHistory(req.auth.dealerId, {
    platform, limit: Number(limit), offset,
  });

  res.json({ posts });
});

// POST /social/post — create + publish
router.post('/post', async (req, res) => {
  const { platforms, content, mediaUrls = [], vehicleId, scheduledAt } = req.body;

  if (!platforms?.length) throw new AppError('platforms[] required', 400, 'VALIDATION_ERROR');
  if (!content) throw new AppError('content is required', 400, 'VALIDATION_ERROR');

  const invalid = platforms.filter((p) => !PLATFORMS.includes(p));
  if (invalid.length) throw new AppError(`Invalid platforms: ${invalid.join(', ')}`, 400, 'INVALID_PLATFORM');

  const results = await socialService.post(req.auth.dealerId, {
    platforms, content, mediaUrls, vehicleId, scheduledAt,
  });

  res.status(201).json({ success: true, results });
});

// POST /social/post-vehicle/:vehicleId — auto-post vehicle listing
router.post('/post-vehicle/:vehicleId', async (req, res) => {
  const { platforms = ['facebook', 'instagram'] } = req.body;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', req.params.vehicleId)
    .eq('dealer_id', req.auth.dealerId)
    .single();

  if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

  const results = await socialService.postVehicle(req.auth.dealerId, vehicle, platforms);
  res.json({ success: true, results });
});

// GET /social/analytics — basic engagement stats
router.get('/analytics', async (req, res) => {
  const { from, to } = req.query;

  let query = supabase
    .from('social_posts')
    .select('platform, status, created_at')
    .eq('dealer_id', req.auth.dealerId);

  if (from) query = query.gte('created_at', from);
  if (to)   query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) throw error;

  const byPlatform = (data || []).reduce((acc, p) => {
    if (!acc[p.platform]) acc[p.platform] = { total: 0, published: 0, failed: 0 };
    acc[p.platform].total++;
    acc[p.platform][p.status] = (acc[p.platform][p.status] || 0) + 1;
    return acc;
  }, {});

  res.json({ analytics: byPlatform, total: data?.length || 0 });
});

module.exports = router;

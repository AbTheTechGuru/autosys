'use strict';

require('express-async-errors');
const express      = require('express');
const { supabase } = require('../config/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema, listVehiclesSchema } = require('../validators/schemas');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

const router = express.Router();

// ── Public: dealer website listing (no auth) ──────────────────
const publicListing = async (req, res) => {
  const { dealerSubdomain } = req.params;
  const { data: dealer } = await supabase
    .from('dealers').select('id,name').eq('subdomain', dealerSubdomain).eq('is_active', true).single();
  if (!dealer) throw new NotFoundError('Dealer');

  const { data } = await supabase
    .from('vehicles')
    .select('id,brand,model,year,price,mileage,fuel_type,transmission,condition,status,color,image_urls,description,features')
    .eq('dealer_id', dealer.id).eq('status', 'available')
    .order('created_at', { ascending: false }).limit(50);

  res.json({ dealer: dealer.name, vehicles: data || [] });
};

// All routes below require authentication
router.use(authenticate);

// ── GET /vehicles ─────────────────────────────────────────────
router.get('/', validate({ query: listVehiclesSchema }), async (req, res) => {
  const { page, limit, sort, order, status, brand, min_price, max_price, fuel_type } = req.query;
  const offset = (page - 1) * limit;

  let q = supabase.from('vehicles').select('*', { count: 'exact' }).eq('dealer_id', req.auth.dealerId);
  if (status && status !== 'all') q = q.eq('status', status);
  if (brand)     q = q.ilike('brand', `%${brand}%`);
  if (min_price) q = q.gte('price', min_price);
  if (max_price) q = q.lte('price', max_price);
  if (fuel_type) q = q.eq('fuel_type', fuel_type);
  q = q.order(sort || 'created_at', { ascending: order === 'asc' }).range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  res.setHeader('X-Total-Count', count || 0);
  res.json({ vehicles: data || [], total: count, page, limit });
});

// ── POST /vehicles ────────────────────────────────────────────
router.post('/', validate({ body: createVehicleSchema }), async (req, res) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...req.body, dealer_id: req.auth.dealerId, created_by: req.auth.userId })
    .select().single();
  if (error) throw error;
  logger.info({ dealerId: req.auth.dealerId, vehicleId: data.id }, 'Vehicle created');
  res.status(201).json({ vehicle: data });
});

// ── GET /vehicles/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*')
    .eq('id', req.params.id).eq('dealer_id', req.auth.dealerId).single();
  if (error || !data) throw new NotFoundError('Vehicle');
  res.json({ vehicle: data });
});

// ── PUT /vehicles/:id ─────────────────────────────────────────
router.put('/:id', validate({ body: updateVehicleSchema }), async (req, res) => {
  const { data, error } = await supabase.from('vehicles')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('dealer_id', req.auth.dealerId).select().single();
  if (error || !data) throw new NotFoundError('Vehicle');
  res.json({ vehicle: data });
});

// ── DELETE /vehicles/:id ──────────────────────────────────────
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  const { error } = await supabase.from('vehicles')
    .delete().eq('id', req.params.id).eq('dealer_id', req.auth.dealerId);
  if (error) throw error;
  res.json({ message: 'Vehicle deleted' });
});

// ── POST /vehicles/bulk ───────────────────────────────────────
router.post('/bulk', requireRole(['owner', 'admin']), async (req, res) => {
  const { vehicles } = req.body;
  if (!Array.isArray(vehicles) || !vehicles.length) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'vehicles array required' });
  }
  const rows = vehicles.slice(0, 200).map((v) => ({
    ...createVehicleSchema.parse(v),
    dealer_id:  req.auth.dealerId,
    created_by: req.auth.userId,
  }));
  const { data, error } = await supabase.from('vehicles').insert(rows).select('id');
  if (error) throw error;
  logger.info({ dealerId: req.auth.dealerId, count: data.length }, 'Bulk vehicles imported');
  res.status(201).json({ imported: data.length, ids: data.map((v) => v.id) });
});

module.exports = router;
module.exports.publicListing = publicListing;

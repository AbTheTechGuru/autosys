'use strict';

const express = require('express');
const { getPricing, getSupportedCountries, getCountryConfig } = require('../config/countryConfig');

const router = express.Router();

/**
 * GET /api/v1/pricing?country=NG&plan=pro
 * Returns dynamic pricing for a country/plan combo.
 * PUBLIC — no auth required (used on landing page).
 */
router.get('/', (req, res) => {
  const { country = 'US', plan = 'pro' } = req.query;

  const pricing = getPricing(country.toUpperCase(), plan);

  res.json({
    success: true,
    data:    pricing,
  });
});

/**
 * GET /api/v1/pricing/countries
 * Returns all supported countries with their currency/flag info.
 */
router.get('/countries', (_req, res) => {
  const countries = getSupportedCountries();
  res.json({ success: true, data: countries });
});

/**
 * GET /api/v1/pricing/plans?country=NG
 * Returns all plan tiers for a country.
 */
router.get('/plans', (req, res) => {
  const { country = 'US' } = req.query;
  const config = getCountryConfig(country.toUpperCase());

  const plans = Object.entries(config.plans).map(([tier, data]) => ({
    tier,
    ...data,
    currency:        config.currency,
    symbol:          config.symbol,
    paymentProviders: config.paymentProviders,
  }));

  res.json({ success: true, data: { country, currency: config.currency, plans } });
});

module.exports = router;

'use strict';

/**
 * AutoSys Global Country Configuration
 * ─────────────────────────────────────
 * Single source of truth for all country-specific settings.
 * Add a new country by adding one entry here — no other code changes needed.
 */

const COUNTRY_CONFIG = {
  // ── West Africa ──────────────────────────────────────────────
  NG: {
    name:             'Nigeria',
    currency:         'NGN',
    symbol:           '₦',
    locale:           'en-NG',
    timezone:         'Africa/Lagos',
    phonePrefix:      '+234',
    paymentProviders: ['paystack', 'flutterwave'],
    defaultProvider:  'paystack',
    // Price in smallest unit (kobo = 1/100 NGN)
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,       period: 'month' },
      pro:     { price: 15000,   period: 'month' },    // NGN 15,000/mo
      premium: { price: 40000,   period: 'month' },    // NGN 40,000/mo
    },
  },

  GH: {
    name:             'Ghana',
    currency:         'GHS',
    symbol:           'GH₵',
    locale:           'en-GH',
    timezone:         'Africa/Accra',
    phonePrefix:      '+233',
    paymentProviders: ['flutterwave', 'paystack'],
    defaultProvider:  'flutterwave',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,    period: 'month' },
      pro:     { price: 150,  period: 'month' },
      premium: { price: 400,  period: 'month' },
    },
  },

  KE: {
    name:             'Kenya',
    currency:         'KES',
    symbol:           'KSh',
    locale:           'sw-KE',
    timezone:         'Africa/Nairobi',
    phonePrefix:      '+254',
    paymentProviders: ['mpesa', 'flutterwave'],
    defaultProvider:  'mpesa',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,      period: 'month' },
      pro:     { price: 2000,   period: 'month' },
      premium: { price: 5500,   period: 'month' },
    },
  },

  ZA: {
    name:             'South Africa',
    currency:         'ZAR',
    symbol:           'R',
    locale:           'en-ZA',
    timezone:         'Africa/Johannesburg',
    phonePrefix:      '+27',
    paymentProviders: ['payfast', 'flutterwave'],
    defaultProvider:  'payfast',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,    period: 'month' },
      pro:     { price: 280,  period: 'month' },
      premium: { price: 750,  period: 'month' },
    },
  },

  // ── North Africa / Middle East ───────────────────────────────
  EG: {
    name:             'Egypt',
    currency:         'EGP',
    symbol:           'E£',
    locale:           'ar-EG',
    timezone:         'Africa/Cairo',
    phonePrefix:      '+20',
    paymentProviders: ['stripe', 'flutterwave'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,     period: 'month' },
      pro:     { price: 500,   period: 'month' },
      premium: { price: 1300,  period: 'month' },
    },
  },

  AE: {
    name:             'United Arab Emirates',
    currency:         'AED',
    symbol:           'AED',
    locale:           'ar-AE',
    timezone:         'Asia/Dubai',
    phonePrefix:      '+971',
    paymentProviders: ['stripe', 'telr'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,   period: 'month' },
      pro:     { price: 75,  period: 'month' },
      premium: { price: 200, period: 'month' },
    },
  },

  // ── Americas ─────────────────────────────────────────────────
  US: {
    name:             'United States',
    currency:         'USD',
    symbol:           '$',
    locale:           'en-US',
    timezone:         'America/New_York',
    phonePrefix:      '+1',
    paymentProviders: ['stripe', 'paypal'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,   period: 'month' },
      pro:     { price: 49,  period: 'month' },
      premium: { price: 129, period: 'month' },
    },
  },

  CA: {
    name:             'Canada',
    currency:         'CAD',
    symbol:           'C$',
    locale:           'en-CA',
    timezone:         'America/Toronto',
    phonePrefix:      '+1',
    paymentProviders: ['stripe', 'paypal'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,   period: 'month' },
      pro:     { price: 65,  period: 'month' },
      premium: { price: 175, period: 'month' },
    },
  },

  BR: {
    name:             'Brazil',
    currency:         'BRL',
    symbol:           'R$',
    locale:           'pt-BR',
    timezone:         'America/Sao_Paulo',
    phonePrefix:      '+55',
    paymentProviders: ['stripe', 'pagseguro'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,   period: 'month' },
      pro:     { price: 249, period: 'month' },
      premium: { price: 649, period: 'month' },
    },
  },

  // ── Europe ───────────────────────────────────────────────────
  GB: {
    name:             'United Kingdom',
    currency:         'GBP',
    symbol:           '£',
    locale:           'en-GB',
    timezone:         'Europe/London',
    phonePrefix:      '+44',
    paymentProviders: ['stripe', 'paypal'],
    defaultProvider:  'stripe',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,  period: 'month' },
      pro:     { price: 39, period: 'month' },
      premium: { price: 99, period: 'month' },
    },
  },

  // ── Asia ─────────────────────────────────────────────────────
  IN: {
    name:             'India',
    currency:         'INR',
    symbol:           '₹',
    locale:           'en-IN',
    timezone:         'Asia/Kolkata',
    phonePrefix:      '+91',
    paymentProviders: ['razorpay', 'stripe'],
    defaultProvider:  'razorpay',
    subunitMultiplier: 100,
    plans: {
      free:    { price: 0,    period: 'month' },
      pro:     { price: 3999, period: 'month' },
      premium: { price: 9999, period: 'month' },
    },
  },
};

// ── Helper functions ──────────────────────────────────────────────

/**
 * Get config for a country. Falls back to US if unknown.
 * @param {string} countryCode - ISO 3166-1 alpha-2 (e.g. 'NG', 'US')
 */
const getCountryConfig = (countryCode) =>
  COUNTRY_CONFIG[countryCode?.toUpperCase()] ?? COUNTRY_CONFIG['US'];

/**
 * Get pricing for a specific country and plan
 */
const getPricing = (countryCode, plan = 'pro') => {
  const config = getCountryConfig(countryCode);
  const planData = config.plans[plan] ?? config.plans['pro'];
  return {
    country:          countryCode,
    plan,
    currency:         config.currency,
    symbol:           config.symbol,
    price:            planData.price,
    period:           planData.period,
    subunitPrice:     planData.price * config.subunitMultiplier,
    paymentProviders: config.paymentProviders,
    defaultProvider:  config.defaultProvider,
    formatted:        formatCurrency(planData.price, config.currency, config.locale),
  };
};

/**
 * Format a number as currency for display
 */
const formatCurrency = (amount, currency, locale) => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

/**
 * Determine the best payment provider for a dealer's country
 */
const resolvePaymentProvider = (countryCode, preferredProvider = null) => {
  const config = getCountryConfig(countryCode);
  if (preferredProvider && config.paymentProviders.includes(preferredProvider)) {
    return preferredProvider;
  }
  return config.defaultProvider;
};

/**
 * List of all supported countries for UI dropdowns
 */
const getSupportedCountries = () =>
  Object.entries(COUNTRY_CONFIG).map(([code, c]) => ({
    code,
    name:     c.name,
    currency: c.currency,
    symbol:   c.symbol,
    flag:     countryFlag(code),
  }));

const countryFlag = (code) => {
  // Convert ISO country code to emoji flag
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  );
};

module.exports = {
  COUNTRY_CONFIG,
  getCountryConfig,
  getPricing,
  formatCurrency,
  resolvePaymentProvider,
  getSupportedCountries,
};

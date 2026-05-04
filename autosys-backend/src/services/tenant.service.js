'use strict';

/**
 * AutoSys Tenant Service
 * ──────────────────────
 * Multi-tenant dealer management.
 * All operations scoped by dealerId.
 * Handles dealer onboarding, configuration, and global settings.
 */

const { supabase }         = require('../config/supabase');
const { AppError }         = require('../utils/errors');
const { getCountryConfig, getSupportedCountries } = require('../config/countryConfig');
const logger               = require('../utils/logger');

class TenantService {
  /**
   * Create a new dealer with country + currency config applied.
   */
  async createDealer({ name, subdomain, country, timezone, currency, plan = 'free' }) {
    const countryConfig = getCountryConfig(country);

    const { data, error } = await supabase.rpc('create_dealer_with_config', {
      p_dealer_name:    name,
      p_subdomain:      subdomain,
      p_country:        country || 'US',
      p_currency:       currency || countryConfig.currency,
      p_timezone:       timezone || countryConfig.timezone,
      p_payment_provider: countryConfig.defaultProvider,
      p_plan:           plan,
    });

    if (error) throw new AppError(error.message, 400, 'DEALER_CREATE_FAILED');
    return data;
  }

  /**
   * Update dealer global settings (country, currency, payment provider).
   */
  async updateGlobalSettings(dealerId, { country, currency, timezone, paymentProvider }) {
    const updates = {};

    if (country) {
      const config = getCountryConfig(country);
      updates.country           = country;
      updates.currency          = currency || config.currency;
      updates.timezone          = timezone || config.timezone;
      updates.payment_provider  = paymentProvider || config.defaultProvider;
    }
    if (currency)        updates.currency         = currency;
    if (timezone)        updates.timezone         = timezone;
    if (paymentProvider) updates.payment_provider = paymentProvider;

    const { data, error } = await supabase.from('dealers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', dealerId)
      .select()
      .single();

    if (error) throw new AppError('Failed to update settings', 500, 'UPDATE_FAILED');
    return data;
  }

  /**
   * Get full dealer config including country pricing.
   */
  async getDealerConfig(dealerId) {
    const { data: dealer, error } = await supabase.from('dealers')
      .select('*')
      .eq('id', dealerId)
      .single();

    if (error || !dealer) throw new AppError('Dealer not found', 404, 'NOT_FOUND');

    const countryConfig = getCountryConfig(dealer.country);
    return {
      ...dealer,
      countryConfig,
      pricing: countryConfig.plans,
    };
  }

  /**
   * Enforce dealerId on any Supabase query builder.
   * Use this to ensure all queries are tenant-scoped.
   */
  scopeQuery(query, dealerId) {
    return query.eq('dealer_id', dealerId);
  }

  /**
   * Get all countries available for a dealer to configure.
   */
  getSupportedCountries() {
    return getSupportedCountries();
  }

  /**
   * Validate that a record belongs to a dealer (security check).
   */
  async assertOwnership(table, recordId, dealerId) {
    const { data } = await supabase.from(table)
      .select('dealer_id').eq('id', recordId).single();
    if (!data || data.dealer_id !== dealerId) {
      throw new AppError('Resource not found or access denied', 404, 'NOT_FOUND');
    }
  }

  /**
   * Get dealer statistics for admin dashboard.
   */
  async getDealerStats(dealerId) {
    const [leads, deals, vehicles, payments] = await Promise.all([
      supabase.from('leads').select('id, stage', { count: 'exact' }).eq('dealer_id', dealerId),
      supabase.from('deals').select('id, stage', { count: 'exact' }).eq('dealer_id', dealerId),
      supabase.from('vehicles').select('id, status', { count: 'exact' }).eq('dealer_id', dealerId),
      supabase.from('payments').select('amount, currency, status').eq('dealer_id', dealerId).eq('status', 'success'),
    ]);

    const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      leads:       { total: leads.count, byStage: this._groupByField(leads.data, 'stage') },
      deals:       { total: deals.count, byStage: this._groupByField(deals.data, 'stage') },
      vehicles:    { total: vehicles.count, byStatus: this._groupByField(vehicles.data, 'status') },
      revenue:     { total: totalRevenue, transactions: payments.data?.length || 0 },
    };
  }

  _groupByField(arr = [], field) {
    return (arr || []).reduce((acc, item) => {
      acc[item[field]] = (acc[item[field]] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new TenantService();

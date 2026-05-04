import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AutoSys Global Store
 * ────────────────────
 * Manages country, currency, locale, and formatting for the entire app.
 * Populated from dealer config on login. Can be overridden by the user.
 */

const COUNTRY_CONFIG = {
  NG: { name: 'Nigeria',        currency: 'NGN', symbol: '₦',   locale: 'en-NG', flag: '🇳🇬', timezone: 'Africa/Lagos'      },
  GH: { name: 'Ghana',          currency: 'GHS', symbol: 'GH₵', locale: 'en-GH', flag: '🇬🇭', timezone: 'Africa/Accra'      },
  KE: { name: 'Kenya',          currency: 'KES', symbol: 'KSh', locale: 'sw-KE', flag: '🇰🇪', timezone: 'Africa/Nairobi'    },
  ZA: { name: 'South Africa',   currency: 'ZAR', symbol: 'R',   locale: 'en-ZA', flag: '🇿🇦', timezone: 'Africa/Johannesburg'},
  EG: { name: 'Egypt',          currency: 'EGP', symbol: 'E£',  locale: 'ar-EG', flag: '🇪🇬', timezone: 'Africa/Cairo'      },
  AE: { name: 'UAE',            currency: 'AED', symbol: 'AED', locale: 'ar-AE', flag: '🇦🇪', timezone: 'Asia/Dubai'        },
  US: { name: 'United States',  currency: 'USD', symbol: '$',   locale: 'en-US', flag: '🇺🇸', timezone: 'America/New_York'  },
  CA: { name: 'Canada',         currency: 'CAD', symbol: 'C$',  locale: 'en-CA', flag: '🇨🇦', timezone: 'America/Toronto'   },
  GB: { name: 'United Kingdom', currency: 'GBP', symbol: '£',   locale: 'en-GB', flag: '🇬🇧', timezone: 'Europe/London'     },
  IN: { name: 'India',          currency: 'INR', symbol: '₹',   locale: 'en-IN', flag: '🇮🇳', timezone: 'Asia/Kolkata'      },
  BR: { name: 'Brazil',         currency: 'BRL', symbol: 'R$',  locale: 'pt-BR', flag: '🇧🇷', timezone: 'America/Sao_Paulo' },
};

export { COUNTRY_CONFIG };

export const useGlobalStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────
      countryCode: 'NG',
      currency:    'NGN',
      symbol:      '₦',
      locale:      'en-NG',
      timezone:    'Africa/Lagos',
      flag:        '🇳🇬',
      countryName: 'Nigeria',

      // ── Actions ────────────────────────────────────────────

      /**
       * Set country from dealer profile (called on login).
       */
      setFromDealer(dealer) {
        const country = dealer?.country || 'NG';
        const config  = COUNTRY_CONFIG[country] || COUNTRY_CONFIG['NG'];
        set({
          countryCode: country,
          currency:    dealer?.currency || config.currency,
          symbol:      config.symbol,
          locale:      config.locale,
          timezone:    dealer?.timezone || config.timezone,
          flag:        config.flag,
          countryName: config.name,
        });
      },

      /**
       * Manual country switch (settings page).
       */
      setCountry(code) {
        const config = COUNTRY_CONFIG[code];
        if (!config) return;
        set({
          countryCode: code,
          currency:    config.currency,
          symbol:      config.symbol,
          locale:      config.locale,
          timezone:    config.timezone,
          flag:        config.flag,
          countryName: config.name,
        });
      },

      /**
       * Format a number as currency using the current locale.
       * @param {number} amount - The amount in major units (not kobo/cents)
       */
      formatCurrency(amount) {
        const { currency, locale } = get();
        try {
          return new Intl.NumberFormat(locale, {
            style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
          }).format(amount);
        } catch {
          return `${get().symbol}${amount?.toLocaleString()}`;
        }
      },

      /**
       * Format a date using the current locale + timezone.
       */
      formatDate(date, options = {}) {
        const { locale, timezone } = get();
        return new Intl.DateTimeFormat(locale, {
          timeZone: timezone,
          year: 'numeric', month: 'short', day: 'numeric',
          ...options,
        }).format(new Date(date));
      },

      /**
       * Format time.
       */
      formatTime(date) {
        const { locale, timezone } = get();
        return new Intl.DateTimeFormat(locale, {
          timeZone: timezone, hour: '2-digit', minute: '2-digit',
        }).format(new Date(date));
      },

      /**
       * Get list of all supported countries.
       */
      getSupportedCountries() {
        return Object.entries(COUNTRY_CONFIG).map(([code, c]) => ({ code, ...c }));
      },
    }),
    {
      name:       'autosys-global',
      partialize: (s) => ({
        countryCode: s.countryCode,
        currency:    s.currency,
        symbol:      s.symbol,
        locale:      s.locale,
        timezone:    s.timezone,
        flag:        s.flag,
        countryName: s.countryName,
      }),
    }
  )
);

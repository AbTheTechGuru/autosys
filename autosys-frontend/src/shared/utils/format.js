/**
 * AutoSys Formatting Utilities
 *
 * FIXES:
 *  1. CRITICAL: React component imports and component body code was appended at the
 *     bottom of this pure utility file. This caused a build error because:
 *     - `import { useState, useEffect }` from React is ES module syntax in a
 *       utility file that other JS files import
 *     - JSX/component code was exported from a utils file
 *     - The leaked code was incomplete/truncated — missing closing braces
 *     Removed all the leaked component code. This file is utilities ONLY.
 */

/** Format a number as Nigerian Naira: ₦18,500,000 */
export const fmtN = (n) =>
  new Intl.NumberFormat('en-NG', {
    style:                'currency',
    currency:             'NGN',
    maximumFractionDigits: 0,
  }).format(n);

/** Compact format: ₦1.2B, ₦18.5M, ₦500K */
export const fmtM = (n) => {
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₦${(n / 1e3).toFixed(0)}K`;
  return `₦${n}`;
};

/** Format mileage: 42000 → "42k km" */
export const fmtMileage = (km) => `${(km / 1000).toFixed(0)}k km`;

/** Relative time: "2 min ago", "1 hour ago" */
export const fmtRelTime = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/** Short month names */
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Generic currency formatter that respects any locale/currency.
 * Used by globalStore for multi-currency support.
 */
export const formatCurrency = (amount, currency = 'NGN', locale = 'en-NG') => {
  try {
    return new Intl.NumberFormat(locale, {
      style:                'currency',
      currency,
      minimumFractionDigits:  0,
      maximumFractionDigits:  0,
    }).format(amount);
  } catch {
    return `${amount?.toLocaleString()} ${currency}`;
  }
};

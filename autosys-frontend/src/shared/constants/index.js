/**
 * AutoSys Blog — constants/index.blog.js (REPLACE existing constants/index.js)
 *
 * Changes from v3/v4:
 *   - Added Content Management nav group with Blog sub-routes
 *   - Admin sidebar now shows Blog, Create Post, Categories
 *   - PLANS array used by landing page pricing section
 */

// ── Navigation groups ──────────────────────────────────────────
export const NAV_GROUPS = [
  {
    group: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard',      icon: 'dash',     path: '/app/dashboard' },
      { key: 'analytics', label: 'Analytics',      icon: 'chart',    path: '/app/analytics' },
      { key: 'activity',  label: 'Live Activity',  icon: 'activity', path: '/app/activity', badge: 'live' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { key: 'inventory', label: 'Inventory',      icon: 'car',      path: '/app/inventory' },
      { key: 'crm',       label: 'CRM & Leads',    icon: 'phone',    path: '/app/crm',      badge: 'count' },
      { key: 'pipeline',  label: 'Pipeline',       icon: 'bars',     path: '/app/pipeline' },
      { key: 'calendar',  label: 'Calendar',       icon: 'activity', path: '/app/calendar' },
    ],
  },
  {
    group: 'Channels',
    items: [
      { key: 'inbox',     label: 'Unified Inbox',  icon: 'dash',     path: '/app/inbox',    badge: 'live' },
      { key: 'whatsapp',  label: 'WhatsApp CRM',   icon: 'wa',       path: '/app/whatsapp' },
      { key: 'social',    label: 'Social Media',   icon: 'globe',    path: '/app/social' },
      { key: 'website',   label: 'Website Builder',icon: 'globe',    path: '/app/website' },
      { key: 'marketing', label: 'Marketing',      icon: 'zap',      path: '/app/marketing' },
    ],
  },
  {
    group: 'Automation',
    items: [
      { key: 'automation',label: 'Automation Engine',icon: 'zap',    path: '/app/automation' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { key: 'payments',  label: 'Payments',       icon: 'pay',      path: '/app/payments' },
      { key: 'reports',   label: 'Reports',        icon: 'report',   path: '/app/reports' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { key: 'team',      label: 'Team',           icon: 'users',    path: '/app/team' },
      { key: 'ai',        label: 'AI Assistant',   icon: 'ai',       path: '/app/ai' },
      { key: 'settings',  label: 'Settings',       icon: 'settings', path: '/app/settings' },
    ],
  },
  // ── Super Admin only — hidden from all dealers ──────────────
  {
    group: 'Super Admin',
    superOnly: true,
    items: [
      { key: 'admin',           label: 'Overview',      icon: 'building', path: '/app/admin',          superOnly: true },
      { key: 'admin-blog',      label: 'Blog Posts',    icon: 'note',     path: '/app/admin/blog',     superOnly: true },
      { key: 'admin-blog-new',  label: 'Create Post',   icon: 'plus',     path: '/app/admin/blog/new', superOnly: true },
    ],
  },
];

export const MOBILE_NAV = [
  { key: 'dashboard', label: 'Home',   icon: 'dash',     path: '/app/dashboard' },
  { key: 'inbox',     label: 'Inbox',  icon: 'dash',     path: '/app/inbox' },
  { key: 'crm',       label: 'Leads',  icon: 'phone',    path: '/app/crm' },
  { key: 'calendar',  label: 'Tasks',  icon: 'activity', path: '/app/calendar' },
  { key: 'ai',        label: 'AI',     icon: 'ai',       path: '/app/ai' },
];

// ── Pricing plans (used by LandingPage) ───────────────────────
export const PLANS = [
  {
    name:         'Free',
    monthlyPrice: '₦0',
    yearlyPrice:  '₦0',
    cta:          'Start Free',
    features: [
      '5 Vehicles',
      '1 User Account',
      'Subdomain Website',
      'Basic CRM',
      'Email Support',
    ],
  },
  {
    name:         'Pro',
    monthlyPrice: '₦15,000',
    yearlyPrice:  '₦12,000',
    cta:          'Start Pro Trial',
    features: [
      'Unlimited Vehicles',
      '5 Team Members',
      'Custom Domain + SSL',
      'Full CRM + Pipeline',
      'WhatsApp Integration',
      'Advanced Analytics',
      'Payment Processing',
      'Priority Support',
    ],
  },
  {
    name:         'Premium',
    monthlyPrice: '₦40,000',
    yearlyPrice:  '₦32,000',
    cta:          'Go Premium',
    features: [
      'Everything in Pro',
      'Unlimited Team Members',
      'AI Assistant',
      'Automation Engine',
      'Social Media Auto-Post',
      'Blog & Content CMS',
      'API Access',
      'Dedicated Account Manager',
      'Custom Integrations',
    ],
  },
];

// ── Lead / Deal stages ─────────────────────────────────────────
export const LEAD_STAGES          = ['New', 'Contacted', 'Closed'];
export const PIPELINE_STAGES      = ['Lead', 'Negotiation', 'Payment', 'Delivered'];
export const LEAD_STAGE_VALUES    = ['new', 'contacted', 'negotiating', 'closed_won', 'closed_lost'];
export const PIPELINE_STAGE_VALUES = ['lead', 'negotiation', 'payment', 'delivered'];

// ── Vehicle enums ──────────────────────────────────────────────
export const FUEL_TYPES           = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
export const TRANSMISSION         = ['Automatic', 'Manual'];
export const VEHICLE_CONDITION    = ['Foreign Used', 'Locally Used', 'Brand New'];
export const VEHICLE_STATUS       = ['Available', 'Reserved', 'Sold'];
export const FUEL_TYPE_VALUES     = ['petrol', 'diesel', 'hybrid', 'electric', 'cng'];
export const TRANSMISSION_VALUES  = ['automatic', 'manual'];
export const CONDITION_VALUES     = ['foreign_used', 'locally_used', 'brand_new'];
export const STATUS_VALUES        = ['available', 'reserved', 'sold'];

// ── Lead sources ───────────────────────────────────────────────
export const LEAD_SOURCES         = ['Website', 'WhatsApp', 'Referral', 'Instagram', 'Facebook', 'Walk-in', 'Phone', 'Blog', 'Other'];
export const LEAD_SOURCE_VALUES   = ['website', 'whatsapp', 'referral', 'instagram', 'facebook', 'walkin', 'phone', 'blog', 'other'];

// ── Blog ───────────────────────────────────────────────────────
export const BLOG_STATUSES        = ['draft', 'published', 'archived'];
export const BLOG_CATEGORIES      = ['sales-crm', 'inventory', 'marketing', 'business-growth', 'technology', 'industry-news'];

// ── Misc ───────────────────────────────────────────────────────
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const REVENUE_DATA  = [52,68,45,88,102,79,115,88,142,158,134,176];
export const LEADS_MONTHLY = [18,24,16,32,28,22,40,31,48,52,44,61];
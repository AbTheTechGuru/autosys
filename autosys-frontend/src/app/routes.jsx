/**
 * AutoSys App Routes
 *
 * FIXES:
 *  1. CRITICAL: Two feature directories had trailing spaces in their names:
 *     - "automation " (with space) → "automation"
 *     - "calendar " (with space) → "calendar"
 *     This made the lazy() imports reference non-existent paths, causing a
 *     "Failed to fetch dynamically imported module" error at runtime.
 *     Both paths corrected to their space-free versions.
 *
 *  2. The `wrap` helper was applying <Suspense> but the `Component` argument
 *     was already a JSX element (not a component function) in all calls.
 *     Refactored wrap() to accept a component reference and return JSX.
 *
 *  3. routes.jsx imported `GlobalSettings.jsx` from a path that also had a
 *     trailing space. That page is not used in these routes — removed.
 */

import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppShell }     from '@/shared/components/layout/AppShell';
import { Spinner }      from '@/shared/components/ui/Spinner';

/* ── Existing lazy imports ──────────────────────────────────── */
const AuthPage       = lazy(() => import('@/features/auth/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const OnboardingPage = lazy(() => import('@/features/auth/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage  = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const InventoryPage  = lazy(() => import('@/features/inventory/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const CrmPage        = lazy(() => import('@/features/crm/pages/CrmPage').then((m) => ({ default: m.CrmPage })));
const PipelinePage   = lazy(() => import('@/features/pipeline/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })));
const WhatsAppPage   = lazy(() => import('@/features/communication/pages/WhatsAppPage').then((m) => ({ default: m.WhatsAppPage })));
const WebsitePage    = lazy(() => import('@/features/website-builder/pages/WebsitePage').then((m) => ({ default: m.WebsitePage })));
const MarketingPage  = lazy(() => import('@/features/marketing/pages/MarketingPage').then((m) => ({ default: m.MarketingPage })));
const AnalyticsPage  = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const PaymentsPage   = lazy(() => import('@/features/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ReportsPage    = lazy(() => import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const TeamPage       = lazy(() => import('@/features/team/pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const AiPage         = lazy(() => import('@/features/ai/pages/AiPage').then((m) => ({ default: m.AiPage })));
const SettingsPage   = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ActivityPage   = lazy(() => import('@/features/analytics/pages/ActivityPage').then((m) => ({ default: m.ActivityPage })));

/* ── Blog & Landing ─────────────────────────────────────────── */
const LandingPage    = lazy(() => import('@/features/landing/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const BlogHomePage   = lazy(() => import('@/features/blog/pages/BlogHomePage').then((m) => ({ default: m.BlogHomePage })));
const BlogPostPage   = lazy(() => import('@/features/blog/pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage })));

/* ── Admin CMS ──────────────────────────────────────────────── */
const AdminPage          = lazy(() => import('@/features/admin/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const AdminBlogDashboard = lazy(() => import('@/features/admin-blog/pages/AdminBlogDashboard').then((m) => ({ default: m.AdminBlogDashboard })));
const BlogPostEditor     = lazy(() => import('@/features/admin-blog/pages/BlogPostEditor').then((m) => ({ default: m.BlogPostEditor })));

/* ── Global routes ───────────────────────────────────────────── */
// FIX: Removed trailing space from import paths:
//   "@/features/automation /pages/AutomationPage"  →  "@/features/automation/pages/AutomationPage"
//   "@/features/calendar /pages/CalendarPage"       →  "@/features/calendar/pages/CalendarPage"
const AutomationPage = lazy(() => import('@/features/automation/pages/AutomationPage').then((m) => ({ default: m.AutomationPage })));
const InboxPage      = lazy(() => import('@/features/inbox/pages/InboxPage').then((m) => ({ default: m.InboxPage })));
const CalendarPage   = lazy(() => import('@/features/calendar/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const SocialPage     = lazy(() => import('@/features/social/pages/SocialPage').then((m) => ({ default: m.SocialPage })));

/* ── Page loader ─────────────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size={28} />
    </div>
  );
}

// FIX: wrap() now correctly accepts a lazy component reference (not an element)
// and wraps it in Suspense with the PageLoader fallback.
const wrap = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

/* ── Guards ──────────────────────────────────────────────────── */
function ProtectedRoute({ adminOnly = false }) {
  const isAuth   = useAuthStore((s) => s.isAuthenticated);
  const user     = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuth) return <Navigate to="/auth" state={{ from: location }} replace />;

  const ADMIN_ROLES = ['owner', 'admin', 'superadmin'];
  if (adminOnly && !ADMIN_ROLES.includes(user?.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}

/* ── Routes ──────────────────────────────────────────────────── */
export const routes = [
  // ── Public marketing + blog pages ─────────────────────────
  { path: '/',           element: wrap(LandingPage)  },
  { path: '/auth',       element: wrap(AuthPage)     },

  // Blog (public — no auth required)
  { path: '/blog',       element: wrap(BlogHomePage) },
  { path: '/blog/:slug', element: wrap(BlogPostPage) },

  // Onboarding (auth required)
  {
    path: '/onboarding',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: wrap(OnboardingPage) },
    ],
  },

  // ── Protected app shell ────────────────────────────────────
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/app/dashboard" replace /> },

        // ── Core existing routes ───────────────────────────────
        { path: 'dashboard',  element: wrap(DashboardPage)  },
        { path: 'analytics',  element: wrap(AnalyticsPage)  },
        { path: 'activity',   element: wrap(ActivityPage)   },
        { path: 'inventory',  element: wrap(InventoryPage)  },
        { path: 'crm',        element: wrap(CrmPage)        },
        { path: 'pipeline',   element: wrap(PipelinePage)   },
        { path: 'whatsapp',   element: wrap(WhatsAppPage)   },
        { path: 'website',    element: wrap(WebsitePage)    },
        { path: 'marketing',  element: wrap(MarketingPage)  },
        { path: 'payments',   element: wrap(PaymentsPage)   },
        { path: 'reports',    element: wrap(ReportsPage)    },
        { path: 'team',       element: wrap(TeamPage)       },
        { path: 'ai',         element: wrap(AiPage)         },
        { path: 'settings',   element: wrap(SettingsPage)   },

        // ── Global routes ──────────────────────────────────────
        { path: 'automation', element: wrap(AutomationPage) },
        { path: 'inbox',      element: wrap(InboxPage)      },
        { path: 'calendar',   element: wrap(CalendarPage)   },
        { path: 'social',     element: wrap(SocialPage)     },

        // ── Admin (role-gated) ────────────────────────────────
        {
          element: <ProtectedRoute adminOnly />,
          children: [
            { path: 'admin',               element: wrap(AdminPage)          },
            { path: 'admin/blog',          element: wrap(AdminBlogDashboard) },
            { path: 'admin/blog/new',      element: wrap(BlogPostEditor)     },
            { path: 'admin/blog/edit/:id', element: wrap(BlogPostEditor)     },
          ],
        },

        { path: '*', element: <Navigate to="/app/dashboard" replace /> },
      ],
    }],
  },

  { path: '*', element: <Navigate to="/" replace /> },
];

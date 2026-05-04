import { Outlet }     from 'react-router-dom';
import { Sidebar }    from './Sidebar';
import { Topbar }     from './Topbar';
import { MobNav }     from './MobNav';
import { CmdPalette } from './CmdPalette';
import { NotifPanel } from './NotifPanel';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { useUIStore }    from '@/store/uiStore';

// Sidebar width = 258px = 16.125rem ≈ w-64 (256px) is close but we use a CSS var
// to keep sidebar and main content perfectly in sync via a single value.
const SIDEBAR_W = 258;

export function AppShell() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-surface-bg text-text-primary font-sans">
      {/* Sidebar — fixed, 258px wide on md+ */}
      <Sidebar open={sidebarOpen} />

      {/* Overlays */}
      <CmdPalette />
      <NotifPanel />

      {/* Main content — offset by sidebar width on md+ */}
      <div
        className="flex flex-col min-h-screen transition-[margin] duration-200"
        style={{ '--sidebar-w': `${SIDEBAR_W}px` }}
      >
        {/* On mobile: no offset (sidebar is drawer overlay).
            On md+: offset by sidebar width using inline style for exact pixel match. */}
        <div
          className="flex flex-col min-h-screen"
          style={{ marginLeft: `clamp(0px, calc(var(--sidebar-w) * var(--sidebar-visible, 0)), ${SIDEBAR_W}px)` }}
          id="app-main"
        >
          {/* CSS custom property trick: on md screens sidebar is always visible */}
          <style>{`@media (min-width: 768px) { #app-main { margin-left: ${SIDEBAR_W}px !important; } }`}</style>

          <Topbar />

          <main
            id="main-content"
            className="flex-1 pb-20 md:pb-8"
            tabIndex={-1}
          >
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav — only renders on small screens */}
      <MobNav />
    </div>
  );
}

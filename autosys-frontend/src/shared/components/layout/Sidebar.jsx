import { NavLink, useLocation } from 'react-router-dom';
import { Logo }    from '@/shared/components/ui/Logo';
import { Icon }    from '@/shared/components/ui/Icon';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { NAV_GROUPS } from '@/shared/constants';
import { useAuthStore } from '@/store/authStore';
import { useUIStore }  from '@/store/uiStore';
import { useCrmStore } from '@/store/crmStore';
import { cn }          from '@/shared/utils/cn';

function NavItem({ item }) {
  const location  = useLocation();
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  const newLeads  = useCrmStore((s) => s.leads.filter((l) => l.stage === 'New').length);
  const isActive  = location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      onClick={closeSidebar}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2 px-[10px] py-[7px] rounded-[8px]',
        'text-[13px] font-bold transition-all duration-[130ms] no-underline',
        isActive
          ? 'bg-[rgba(200,151,58,.09)] text-gold nav-item-active'
          : 'text-text-muted hover:bg-surface-3 hover:text-text-primary',
      )}
    >
      <Icon
        name={item.icon}
        size={14}
        color={isActive ? '#C8973A' : '#4E4B58'}
      />
      <span className="flex-1 leading-none">{item.label}</span>

      {/* Badge: new lead count */}
      {item.badge === 'count' && newLeads > 0 && (
        <span className="ml-auto bg-[rgba(37,99,235,.12)] text-[#93C5FD] text-[9px] font-extrabold px-[5px] py-[1px] rounded-[9px]">
          {newLeads}
        </span>
      )}

      {/* Badge: live dot */}
      {item.badge === 'live' && (
        <LiveDot className="ml-auto" />
      )}
    </NavLink>
  );
}

export function Sidebar({ open }) {
  const user        = useAuthStore((s) => s.user);
  const setOpen     = useUIStore((s) => s.toggleSidebar);
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  const isAdmin     = ['admin', 'owner', 'superadmin'].includes(user?.role);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[199] md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-[200]',
          'w-[258px] bg-surface-1 border-r border-surface-4',
          'flex flex-col overflow-y-auto sidebar-transition',
          // Mobile: slide in/out; Desktop: always visible
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="px-[13px] py-[14px] border-b border-surface-4">
          <Logo size={28} />
        </div>

        {/* Dealer context pill */}
        <div className="px-[10px] py-[8px]">
          <div className="flex items-center gap-2 bg-[rgba(200,151,58,.08)] border border-[rgba(200,151,58,.18)] rounded-[9px] px-[11px] py-[7px]">
            <Avatar initials={toInitials(user?.dealer?.name ?? user?.dealer ?? 'DM')} size={26} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold truncate">
                {user?.dealer?.name ?? user?.dealer ?? 'Dangote Motors'}
              </div>
              <div className="text-[9.5px] font-extrabold text-gold">
                {user?.dealer?.plan ?? user?.plan ?? 'Free'} Plan · Active
              </div>
            </div>
            <span
              className="w-[6px] h-[6px] rounded-full bg-status-ok shrink-0"
              style={{ boxShadow: '0 0 6px #16A34A' }}
            />
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-[9px] py-[2px]" aria-label="Sidebar navigation">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || isAdmin,
            );
            if (!visibleItems.length) return null;
            return (
              <div key={group.group}>
                <p className="text-[9.5px] font-extrabold tracking-[2.8px] uppercase text-text-muted px-[10px] pt-[9px] pb-[2px] opacity-55">
                  {group.group}
                </p>
                {visibleItems.map((item) => (
                  <NavItem key={item.key} item={item} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-[10px] border-t border-surface-4">
          <NavLink
            to="/app/settings"
            className="flex items-center gap-2 cursor-pointer no-underline hover:bg-surface-3 rounded-[8px] px-[8px] py-[6px] transition-colors"
          >
            <Avatar initials={toInitials(user?.name ?? 'DA')} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold truncate text-text-primary">
                {user?.name ?? 'Dangote Admin'}
              </div>
              <div className="text-[10px] text-text-muted truncate">
                {user?.email ?? 'admin@dangote.com'}
              </div>
            </div>
            <Icon name="settings" size={13} color="#4E4B58" />
          </NavLink>
        </div>
      </aside>
    </>
  );
}

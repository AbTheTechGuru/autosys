import { useAuthStore }    from '@/store/authStore';
import { useUIStore }      from '@/store/uiStore';
import { useGlobalStore }  from '@/store/globalStore';
import { Icon }            from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { CountrySwitcher } from '@/features/globalSettings/components/GlobalSettings';
import { cn }              from '@/shared/utils/cn';

export function Topbar() {
  const user         = useAuthStore((s) => s.user);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { flag, currency, countryName } = useGlobalStore();

  return (
    <header className="sticky top-0 z-[100] flex items-center gap-3 h-[52px] px-4 md:px-5 bg-surface-1/90 backdrop-blur-sm border-b border-surface-4">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-[7px] hover:bg-surface-3 transition-colors"
        aria-label="Toggle sidebar">
        <Icon name="bars" size={16} color="#8A8680" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* ── NEW: Country Switcher ── */}
        <CountrySwitcher />

        {/* ── NEW: Currency badge ── */}
        <div className="hidden sm:flex items-center gap-1.5 bg-surface-2 border border-surface-4 rounded-[8px] px-2.5 py-[5px]">
          <span className="text-[11px] font-extrabold text-gold">{currency}</span>
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 rounded-[7px] hover:bg-surface-3 transition-colors"
          aria-label="Notifications">
          <Icon name="activity" size={15} color="#8A8680" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] border border-surface-1" />
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-2 rounded-[8px] hover:bg-surface-3 px-1.5 py-1 transition-colors">
          <Avatar initials={toInitials(user?.name || 'U')} size={26} />
          <span className="hidden sm:block text-[12px] font-bold text-text-primary truncate max-w-[100px]">
            {user?.name}
          </span>
        </button>
      </div>
    </header>
  );
}

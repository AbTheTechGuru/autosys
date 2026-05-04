import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '@/shared/components/ui/Icon';
import { MOBILE_NAV } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

export function MobNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[500] h-[62px]
                 bg-[rgba(14,14,22,.96)] backdrop-blur-[18px] border-t border-surface-4
                 flex items-center justify-around px-1"
    >
      {MOBILE_NAV.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.key}
            to={item.path}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-[3px] px-3 py-[6px]',
              'text-[9px] font-extrabold uppercase tracking-[.5px]',
              'transition-colors duration-[130ms] no-underline',
              // Larger touch target
              'min-w-[44px] min-h-[44px] justify-center',
              isActive ? 'text-gold' : 'text-text-muted',
            )}
          >
            <Icon name={item.icon} size={20} color={isActive ? '#C8973A' : '#4E4B58'} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

import { cn } from '@/shared/utils/cn';

/**
 * Tabs — horizontal pill-style tab switcher.
 *
 * @example
 * <Tabs
 *   tabs={[{ key:'overview', label:'Overview' }, { key:'revenue', label:'Revenue' }]}
 *   active={tab}
 *   onChange={setTab}
 * />
 */
export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label="Page tabs"
      className={cn(
        'flex bg-surface-3 rounded-[10px] p-[3px] gap-[2px] w-fit',
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-[13px] py-[6px] rounded-[7px] text-[12.5px] font-bold',
            'cursor-pointer transition-all duration-[130ms] border-none',
            'font-sans capitalize whitespace-nowrap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
            active === t.key
              ? 'bg-surface-2 text-text-primary shadow-[0_1px_4px_rgba(0,0,0,.32)]'
              : 'bg-transparent text-text-secondary hover:text-text-primary',
          )}
        >
          {t.label ?? t.key}
        </button>
      ))}
    </div>
  );
}

import { cn } from '@/shared/utils/cn';

const BASE = [
  'inline-flex items-center gap-[6px] rounded-[9px]',
  'font-sans font-extrabold cursor-pointer border-none',
  'transition-all duration-[160ms] whitespace-nowrap',
  'disabled:opacity-40 disabled:cursor-not-allowed',
  'disabled:transform-none disabled:filter-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg',
].join(' ');

const SIZES = {
  xs: 'px-2 py-[3px] text-[11px] rounded-[7px] gap-[3px]',
  sm: 'px-[11px] py-[5px] text-[12px] rounded-[8px] gap-1',
  md: 'px-[15px] py-2 text-[13px]',
  lg: 'px-7 py-3 text-[15px]',
  icon: 'p-[7px] aspect-square rounded-[8px]',
};

const VARIANTS = {
  gold:    'btn-gold',
  ghost:   'bg-transparent text-text-secondary border border-surface-4 hover:bg-surface-3 hover:text-text-primary hover:border-[rgba(200,151,58,.3)]',
  solid:   'bg-surface-3 text-text-primary border border-surface-4 hover:bg-surface-4',
  ok:      'bg-[rgba(22,163,74,.12)]  text-[#4ADE80] border border-[rgba(22,163,74,.25)]  hover:bg-[rgba(22,163,74,.2)]',
  danger:  'bg-[rgba(220,38,38,.12)]  text-[#F87171] border border-[rgba(220,38,38,.25)]  hover:bg-[rgba(220,38,38,.2)]',
  warning: 'bg-[rgba(217,119,6,.12)]  text-[#FBB040] border border-[rgba(217,119,6,.25)]  hover:bg-[rgba(217,119,6,.2)]',
  blue:    'bg-[rgba(37,99,235,.12)]  text-[#93C5FD] border border-[rgba(37,99,235,.25)]  hover:bg-[rgba(37,99,235,.2)]',
  purple:  'bg-[rgba(124,58,237,.12)] text-[#C4B5FD] border border-[rgba(124,58,237,.25)] hover:bg-[rgba(124,58,237,.2)]',
};

/**
 * Button — covers all AutoSys button styles.
 *
 * @param {'gold'|'ghost'|'solid'|'ok'|'danger'|'warning'|'blue'|'purple'} variant
 * @param {'xs'|'sm'|'md'|'lg'|'icon'} size
 * @param {string} as   - Render as another element (e.g. 'a')
 */
export function Button({
  variant = 'ghost',
  size    = 'md',
  as: Tag = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={cn(BASE, SIZES[size] ?? SIZES.md, VARIANTS[variant] ?? VARIANTS.ghost, className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

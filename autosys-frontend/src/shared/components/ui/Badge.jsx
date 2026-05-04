import { cn } from '@/shared/utils/cn';

const VARIANT_CLASSES = {
  gold:    'bg-[rgba(200,151,58,.12)] text-gold',
  ok:      'bg-[rgba(22,163,74,.12)]  text-[#4ADE80]',
  warning: 'bg-[rgba(217,119,6,.12)]  text-[#FBB040]',
  danger:  'bg-[rgba(220,38,38,.12)]  text-[#F87171]',
  blue:    'bg-[rgba(37,99,235,.12)]  text-[#93C5FD]',
  purple:  'bg-[rgba(124,58,237,.12)] text-[#C4B5FD]',
  teal:    'bg-[rgba(13,148,136,.12)] text-[#5EEAD4]',
  muted:   'bg-surface-4 text-text-secondary',
};

/** Map common status strings to variants automatically */
const AUTO_VARIANT = {
  Available: 'ok',
  Active:    'ok',
  Online:    'ok',
  New:       'blue',
  Contacted: 'warning',
  Scheduled: 'warning',
  Pending:   'warning',
  Away:      'warning',
  Reserved:  'warning',
  Sold:      'danger',
  Failed:    'danger',
  Offline:   'muted',
  Completed: 'blue',
  Closed:    'ok',
  Suspended: 'danger',
  Success:   'ok',
  Hot:       'danger',
  Warm:      'warning',
  Done:      'ok',
  Pro:       'blue',
  Premium:   'gold',
  Free:      'muted',
};

/**
 * Badge — compact status label.
 *
 * @param {string} variant  - Explicit variant key, or auto-detected from children
 * @param {string} children - Label text
 */
export function Badge({ variant, children, className = '' }) {
  const resolvedVariant = variant ?? AUTO_VARIANT[children] ?? 'muted';
  const variantClass = VARIANT_CLASSES[resolvedVariant] ?? VARIANT_CLASSES.muted;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[3px] px-[7px] py-[2px]',
        'rounded-[20px] text-[9.5px] font-extrabold tracking-[.3px] uppercase',
        variantClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

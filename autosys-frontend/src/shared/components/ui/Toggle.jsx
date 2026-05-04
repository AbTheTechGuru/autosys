import { cn } from '@/shared/utils/cn';

/**
 * Toggle switch — accessible with keyboard.
 */
export function Toggle({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-[38px] h-[21px] rounded-[11px] shrink-0',
        'transition-colors duration-[180ms] cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-gold' : 'bg-surface-5',
        className,
      )}
    >
      <span
        className={cn(
          'toggle-knob absolute w-[15px] h-[15px] bg-white rounded-full',
          'top-[3px] left-[3px] transition-transform duration-[180ms]',
          'shadow-[0_1px_4px_rgba(0,0,0,.35)]',
          checked && 'translate-x-[17px]',
        )}
      />
    </button>
  );
}

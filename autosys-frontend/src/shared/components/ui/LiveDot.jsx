import { cn } from '@/shared/utils/cn';

export function LiveDot({ className = '' }) {
  return (
    <span
      aria-label="Live"
      className={cn(
        'inline-block w-[6px] h-[6px] rounded-full bg-status-ok animate-pulse-dot',
        className,
      )}
    />
  );
}

import { cn } from '@/shared/utils/cn';

export function Spinner({ size = 16, className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-spin-slow shrink-0', className)}
      style={{
        width:       size,
        height:      size,
        border:      '2px solid #2B2B3C',
        borderTop:   '2px solid #C8973A',
        borderRadius:'50%',
      }}
    />
  );
}

import { cn } from '@/shared/utils/cn';

/**
 * Avatar — shows initials with gold gradient background.
 */
export function Avatar({ initials, size = 32, className = '', style = {} }) {
  const fontSize = Math.round(size * 0.35);
  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0 font-extrabold rounded-[9px]',
        className,
      )}
      style={{
        width:      size,
        height:     size,
        fontSize,
        background: 'linear-gradient(135deg,#8B5E18,#C8973A)',
        color:      '#07070B',
        borderRadius: Math.round(size * 0.28),
        ...style,
      }}
      aria-label={initials}
    >
      {initials}
    </div>
  );
}

/** Derive two-letter initials from a full name */
export function toInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

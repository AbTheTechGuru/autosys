import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';

/**
 * EmptyState — shown when a list/table has no items.
 */
export function EmptyState({
  icon     = 'search',
  title    = 'Nothing here yet',
  desc     = '',
  action,
  actionLabel = 'Add item',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-5"
        style={{ background: 'rgba(200,151,58,.09)', border: '1px solid rgba(200,151,58,.18)' }}
      >
        <Icon name={icon} size={22} color="#C8973A" />
      </div>
      <h3 className="font-display text-[18px] font-bold text-text-primary mb-2">{title}</h3>
      {desc && <p className="text-[13.5px] text-text-secondary max-w-[300px] leading-relaxed">{desc}</p>}
      {action && (
        <Button variant="gold" size="sm" className="mt-5" onClick={action}>
          <Icon name="plus" size={13} />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

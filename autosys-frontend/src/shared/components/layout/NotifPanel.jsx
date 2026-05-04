import { useRef } from 'react';
import { Icon }   from '@/shared/components/ui/Icon';
import { Button } from '@/shared/components/ui/Button';
import { useUIStore }           from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useClickOutside }      from '@/shared/hooks/useClickOutside';
import { fmtRelTime }           from '@/shared/utils/format';
import { cn }                   from '@/shared/utils/cn';

export function NotifPanel() {
  const open        = useUIStore((s) => s.notifOpen);
  const closeNotif  = useUIStore((s) => s.closeNotif);
  const { notifications, markAllRead, markRead } = useNotificationStore();

  const panelRef = useRef(null);
  useClickOutside(panelRef, () => { if (open) closeNotif(); });

  if (!open) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-[298] md:hidden"
        onClick={closeNotif}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed top-[64px] right-4 md:right-[18px] w-[calc(100vw-2rem)] max-w-[340px]
                   bg-surface-2 border border-surface-4 rounded-[15px] z-[300]
                   shadow-modal overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-4 flex justify-between items-center">
          <span className="font-display text-[17px] font-bold">Notifications</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="xs" onClick={markAllRead}>
              Mark read
            </Button>
            <Button variant="ghost" size="icon" onClick={closeNotif} aria-label="Close">
              <Icon name="x" size={12} />
            </Button>
          </div>
        </div>

        {/* List */}
        <ul className="max-h-[360px] overflow-y-auto" role="list">
          {notifications.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-text-muted">
              No notifications
            </li>
          )}
          {notifications.map((n) => (
            <li
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                'flex gap-[10px] px-4 py-[11px] cursor-pointer',
                'border-b border-[rgba(33,33,46,.35)] last:border-0',
                'transition-colors hover:bg-surface-3/40',
                n.unread && 'bg-[rgba(200,151,58,.04)]',
              )}
            >
              <div
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 border"
                style={{
                  background: `${n.color}18`,
                  borderColor: `${n.color}22`,
                }}
              >
                <Icon name={n.icon} size={13} color={n.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-[12.5px] leading-tight', n.unread ? 'font-extrabold' : 'font-semibold')}>
                  {n.title}
                </p>
                <p className="text-[11.5px] text-text-secondary mt-[2px] truncate">{n.desc}</p>
                <p className="text-[10.5px] text-text-muted mt-[1px]">{fmtRelTime(n.time)}</p>
              </div>
              {n.unread && (
                <div
                  className="w-[6px] h-[6px] rounded-full bg-gold shrink-0 mt-[5px]"
                  aria-label="Unread"
                />
              )}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="px-4 py-[9px] border-t border-surface-4 text-center">
          <span className="text-[12px] text-gold font-extrabold cursor-pointer hover:opacity-80">
            View all →
          </span>
        </div>
      </div>
    </>
  );
}

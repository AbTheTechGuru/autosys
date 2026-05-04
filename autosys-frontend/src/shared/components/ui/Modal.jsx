import { useEffect, useRef } from 'react';
import { cn } from '@/shared/utils/cn';
import { Button } from './Button';
import { Icon }   from './Icon';

/**
 * Accessible modal dialog.
 *
 * Traps focus, closes on Escape or backdrop click, and manages aria attributes.
 */
export function Modal({ open, onClose, title, children, maxWidth = 560, className = '' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      prev?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-5
                 bg-black/75 backdrop-blur-[14px] animate-fade-in"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          'w-full bg-surface-2 border border-surface-4 rounded-[18px]',
          'overflow-hidden max-h-[92vh] animate-slide-up outline-none',
          className,
        )}
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[22px] py-[17px] border-b border-surface-4">
          <h2
            id="modal-title"
            className="font-display text-[20px] font-bold text-text-primary leading-tight"
          >
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <Icon name="x" size={14} />
          </Button>
        </div>

        {/* Body */}
        <div className="px-[22px] py-5 overflow-y-auto max-h-[68vh]">
          {children}
        </div>
      </div>
    </div>
  );
}

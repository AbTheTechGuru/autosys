import { cn } from '@/shared/utils/cn';
import { forwardRef } from 'react';

const BASE_INPUT = [
  'w-full bg-surface-3 border border-surface-4 rounded-[9px]',
  'px-[13px] py-[9px] text-text-primary font-sans text-[13.5px] font-semibold',
  'outline-none placeholder:text-text-muted placeholder:font-normal',
  'transition-[border-color,box-shadow] duration-[160ms]',
  'focus:border-gold focus:ring-[3px] focus:ring-[rgba(200,151,58,.13)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

/** Text input */
export const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={cn(BASE_INPUT, className)} {...props} />
));
Input.displayName = 'Input';

/** Textarea */
export const Textarea = forwardRef(({ className = '', rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(BASE_INPUT, 'resize-y leading-[1.65]', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

/** Select */
export const Select = forwardRef(({ className = '', children, ...props }, ref) => (
  <select ref={ref} className={cn(BASE_INPUT, 'cursor-pointer', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

/** Label above an input */
export function Label({ children, className = '', required, ...props }) {
  return (
    <label
      className={cn(
        'block text-[10px] font-extrabold tracking-[1.8px] uppercase text-gold mb-[5px]',
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-[#F87171] ml-1" aria-hidden="true">*</span>}
    </label>
  );
}

/** Field = Label + Input + optional error message */
export function Field({ label, required, error, className = '', children }) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && (
        <p className="mt-1 text-[11.5px] text-[#F87171]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Search bar with magnifier icon */
export function SearchBar({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-[7px] bg-surface-3 border border-surface-4',
        'rounded-[9px] px-[11px] py-[7px]',
        'transition-[border-color] focus-within:border-gold',
        className,
      )}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
        stroke="#4E4B58" strokeWidth="1.85" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        className="bg-transparent border-none outline-none text-text-primary font-sans text-[13.5px] font-semibold w-full placeholder:text-text-muted placeholder:font-normal"
        {...props}
      />
    </div>
  );
}

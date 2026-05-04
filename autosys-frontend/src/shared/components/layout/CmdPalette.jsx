import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon }      from '@/shared/components/ui/Icon';
import { useUIStore } from '@/store/uiStore';
import { NAV_GROUPS } from '@/shared/constants';
import { cn }         from '@/shared/utils/cn';

const ALL_COMMANDS = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    label: `Go to ${item.label}`,
    icon:  item.icon,
    path:  item.path,
    group: g.group,
  })),
);

export function CmdPalette() {
  const open    = useUIStore((s) => s.cmdOpen);
  const closeCmd = useUIStore((s) => s.closeCmd);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [sel,   setSel]   = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q
      ? ALL_COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
      : ALL_COMMANDS;
    return list.slice(0, 9);
  }, [query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => setSel(0), [query]);

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[sel]) {
        navigate(results[sel].path);
        closeCmd();
      }
      if (e.key === 'Escape') closeCmd();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, sel, navigate, closeCmd]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 px-4
                 bg-black/80 backdrop-blur-[14px] animate-fade-in"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) closeCmd(); }}
    >
      <div
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-label="Command palette"
        className="w-full max-w-[540px] bg-surface-2 border border-[rgba(200,151,58,.28)]
                   rounded-[15px] overflow-hidden shadow-modal animate-slide-up"
      >
        {/* Search input */}
        <div className="flex items-center gap-[9px] px-[15px] py-[13px] border-b border-surface-4">
          <Icon name="search" size={15} color="#4E4B58" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            aria-label="Command palette search"
            aria-autocomplete="list"
            className="flex-1 bg-transparent border-none outline-none text-text-primary font-sans text-[14px] font-bold placeholder:text-text-muted placeholder:font-normal"
          />
          <kbd className="px-[5px] py-[2px] bg-surface-4 border border-surface-5 rounded-[4px] font-mono text-[10px] text-text-secondary shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul role="listbox" className="max-h-[320px] overflow-y-auto">
          {results.length === 0 && (
            <li className="px-[15px] py-8 text-center text-[13.5px] text-text-muted">
              No results for "{query}"
            </li>
          )}
          {results.map((cmd, i) => (
            <li
              key={cmd.path}
              role="option"
              aria-selected={i === sel}
              onClick={() => { navigate(cmd.path); closeCmd(); }}
              onMouseEnter={() => setSel(i)}
              className={cn(
                'flex items-center gap-[10px] px-[15px] py-[10px] cursor-pointer',
                'transition-colors duration-[80ms]',
                i === sel ? 'bg-surface-3' : 'hover:bg-surface-3/50',
              )}
            >
              <div className="w-[30px] h-[30px] rounded-[7px] bg-surface-3 border border-surface-4 flex items-center justify-center shrink-0">
                <Icon name={cmd.icon} size={14} color="#8A8680" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13.5px] font-bold text-text-primary">{cmd.label}</span>
                <span className="ml-2 text-[11px] text-text-muted">{cmd.group}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer hints */}
        <div className="px-[15px] py-[7px] border-t border-surface-4 flex gap-3 text-[11px] text-text-muted">
          <span><kbd className="px-[5px] py-[2px] bg-surface-4 border border-surface-5 rounded-[4px] font-mono text-[10px]">↑↓</kbd> navigate</span>
          <span><kbd className="px-[5px] py-[2px] bg-surface-4 border border-surface-5 rounded-[4px] font-mono text-[10px]">↵</kbd> select</span>
          <span><kbd className="px-[5px] py-[2px] bg-surface-4 border border-surface-5 rounded-[4px] font-mono text-[10px]">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

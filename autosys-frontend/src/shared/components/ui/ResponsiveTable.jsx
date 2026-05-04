import { cn } from '@/shared/utils/cn';

/**
 * ResponsiveTable — renders a <table> on md+ screens and a card stack on mobile.
 *
 * Props:
 *   columns:  [{ key, label, className? }]
 *   rows:     array of objects (or array of React rows for table mode)
 *   renderRow(row, index) → <tr>...</tr>   for table mode
 *   renderCard(row, index) → JSX           for mobile card mode
 *   empty: JSX shown when rows.length === 0
 *   loading: boolean
 *   loadingRows: number  (skeleton row count)
 */
export function ResponsiveTable({
  columns,
  rows = [],
  renderRow,
  renderCard,
  empty,
  loading = false,
  loadingRows = 5,
  className,
}) {
  if (!loading && rows.length === 0 && empty) {
    return empty;
  }

  return (
    <>
      {/* ── Mobile: card stack (hidden on md+) ─────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {loading
          ? Array(loadingRows).fill(0).map((_, i) => (
              <div key={i} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 animate-pulse">
                <div className="h-4 bg-surface-5 rounded w-1/2 mb-2" />
                <div className="h-3 bg-surface-4 rounded w-3/4" />
              </div>
            ))
          : rows.map((row, i) => (
              <div
                key={row.id ?? i}
                className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 hover:border-[rgba(200,151,58,.2)] transition-colors"
              >
                {renderCard(row, i)}
              </div>
            ))
        }
      </div>

      {/* ── Desktop: table (hidden below md) ───────────────── */}
      <div className={cn('hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto', className)}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-[14px] py-[9px] text-[9.5px] font-extrabold',
                    'uppercase tracking-[1px] text-text-muted bg-surface-3',
                    'border-b border-surface-4 first:pl-[18px] whitespace-nowrap',
                    col.className,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(loadingRows).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(33,33,46,.4)]">
                    {columns.map((col) => (
                      <td key={col.key} className="px-[14px] py-3 first:pl-[18px]">
                        <div className="h-4 bg-surface-4 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => renderRow(row, i))
            }
          </tbody>
        </table>
      </div>
    </>
  );
}

import { cn } from '@/shared/utils/cn';

/** Base shimmer block */
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={cn('skeleton rounded-[7px]', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a stat card */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[10px] w-[80px]" />
          <Skeleton className="h-[28px] w-[120px] mt-1" />
          <Skeleton className="h-[10px] w-[60px]" />
        </div>
        <Skeleton className="w-[38px] h-[38px] rounded-[10px]" />
      </div>
      <Skeleton className="h-[28px] w-full mt-3" />
    </div>
  );
}

/** Skeleton for a table row */
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-[14px] py-[12px]">
          <Skeleton className="h-[14px] w-full" style={{ maxWidth: i === 0 ? 160 : 100 }} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for a card grid */
export function CardGridSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
          <Skeleton className="h-[142px] rounded-none" />
          <div className="p-[14px] flex flex-col gap-[8px]">
            <Skeleton className="h-[14px] w-3/4" />
            <Skeleton className="h-[19px] w-1/2" />
            <Skeleton className="h-[11px] w-full" />
          </div>
        </div>
      ))}
    </>
  );
}

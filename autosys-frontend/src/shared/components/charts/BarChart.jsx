import { useEffect, useState } from 'react';
import { G } from '@/shared/utils/tokens';

/**
 * BarChart — vertical animated bar chart.
 *
 * @param {number[]} data      - Values
 * @param {string[]} labels    - X-axis labels
 * @param {string}   color     - Bar color (gradient gd→gl)
 * @param {string}   highlight - Highlight color for last bar
 * @param {number}   height    - Container height in px
 */
export function BarChart({
  data      = [],
  labels    = [],
  color     = G.g,
  highlight = true,
  height    = 150,
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const max = Math.max(...data, 1);

  return (
    <div
      className="flex items-end gap-[5px] w-full"
      style={{ height }}
      role="img"
      aria-label="Bar chart"
    >
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        const isLast = highlight && i === data.length - 1;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1"
            style={{ height: '100%' }}
          >
            <div className="flex items-end w-full flex-1">
              <div
                className="w-full rounded-t-[3px] transition-[height]"
                style={{
                  height: animated ? `${pct}%` : '4px',
                  minHeight: 4,
                  transitionDuration: `${0.8 + i * 0.04}s`,
                  transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)',
                  background: isLast
                    ? `linear-gradient(to top, ${G.gd}, ${G.gl})`
                    : `linear-gradient(to top, ${color}55, ${color}88)`,
                }}
                title={`${labels[i]}: ${v}`}
              />
            </div>
            <div
              className="text-[9px] whitespace-nowrap"
              style={{ color: isLast ? G.g : G.t2 }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

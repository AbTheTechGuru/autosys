import { G } from '@/shared/utils/tokens';

/**
 * DonutChart — animated SVG donut chart.
 *
 * @param {{ v: number, c: string }[]} segments - Value + color pairs
 * @param {number} size    - Width/height in px
 * @param {{ top: string, bot: string }} center  - Optional center label
 */
export function DonutChart({ segments = [], size = 120, center }) {
  const total = segments.reduce((s, d) => s + d.v, 0);
  const r     = size * 0.38;
  const cx    = size / 2;
  const cy    = size / 2;
  const circ  = 2 * Math.PI * r;
  let offset  = 0;

  if (!total) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Donut chart"
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={G.s5} strokeWidth={12} />

      {/* Segments */}
      {segments.map((seg, i) => {
        const dash    = (seg.v / total) * circ;
        const dashArr = `${dash} ${circ}`;
        const dashOff = -offset * circ / 100;
        offset       += (seg.v / total) * 100;

        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.c}
            strokeWidth={12}
            strokeDasharray={dashArr}
            strokeDashoffset={dashOff}
            style={{
              transformOrigin: 'center',
              transform:       'rotate(-90deg)',
              transition:      `stroke-dasharray .8s ease ${i * 0.12}s`,
            }}
          />
        );
      })}

      {/* Center label */}
      {center && (
        <>
          <text
            x={cx} y={cy - 5}
            textAnchor="middle"
            fill={G.t0}
            fontSize={size * 0.14}
            fontWeight="700"
            fontFamily="'Domine', serif"
          >
            {center.top}
          </text>
          <text
            x={cx} y={cy + 10}
            textAnchor="middle"
            fill={G.t1}
            fontSize={size * 0.09}
            fontFamily="'Nunito', sans-serif"
          >
            {center.bot}
          </text>
        </>
      )}
    </svg>
  );
}

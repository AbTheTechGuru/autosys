import { useState } from 'react';
import { G } from '@/shared/utils/tokens';

/**
 * LineChart — animated SVG line + area chart.
 *
 * @param {number[]} data    - Y values
 * @param {string[]} labels  - X-axis labels (must match data.length)
 * @param {string}   color   - Stroke + fill color
 * @param {number}   height  - Chart height in px
 * @param {boolean}  animated - Whether to animate on mount
 */
export function LineChart({ data = [], labels = [], color = G.g, height = 160, animated = true }) {
  const [hov, setHov] = useState(null);

  const W = 500;
  const pad = { l: 34, r: 14, t: 10, b: 22 };
  const cw  = W - pad.l - pad.r;
  const ch  = height - pad.t - pad.b;

  if (!data.length) return null;

  const max   = Math.max(...data);
  const min   = Math.min(...data);
  const range = max - min || 1;
  const px    = (i) => pad.l + (i / (data.length - 1)) * cw;
  const py    = (v) => pad.t + ch - ((v - min) / range) * ch;

  const pts    = data.map((v, i) => ({ x: px(i), y: animated ? py(v) : pad.t + ch }));
  const pathD  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD  = `${pathD} L${pts[pts.length - 1].x},${pad.t + ch} L${pts[0].x},${pad.t + ch} Z`;

  const yTicks = [min, min + range / 2, max];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full overflow-visible"
      style={{ height }}
      role="img"
      aria-label="Line chart"
    >
      {/* Y-axis gridlines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={pad.l} x2={W - pad.r}
            y1={py(v)} y2={py(v)}
            stroke={G.s4} strokeWidth="1" strokeDasharray="3,4"
          />
          <text
            x={pad.l - 4} y={py(v) + 4}
            textAnchor="end"
            style={{ fontFamily: "'Nunito',sans-serif", fontSize: 10, fill: G.t2 }}
          >
            {Math.round(v)}M
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={color} opacity="0.1" />

      {/* Line */}
      <path
        d={pathD}
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points + hover tooltip */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x} cy={p.y}
            r={hov === i ? 6 : 3.5}
            fill={color}
            style={{ cursor: 'pointer', transition: 'r .1s' }}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          />
          {hov === i && (
            <g>
              <rect x={p.x - 30} y={p.y - 28} width={60} height={20} rx={5} fill={G.s4} />
              <text
                x={p.x} y={p.y - 13}
                textAnchor="middle"
                style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, fontWeight: 700, fill: G.t0 }}
              >
                ₦{data[i]}M
              </text>
            </g>
          )}
          {/* X-axis label */}
          <text
            x={p.x} y={height - 4}
            textAnchor="middle"
            style={{ fontFamily: "'Nunito',sans-serif", fontSize: 9, fill: G.t2 }}
          >
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

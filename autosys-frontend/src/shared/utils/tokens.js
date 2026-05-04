/**
 * AutoSys Design Tokens
 * Single source of truth for all color/spacing values.
 * Used in dynamic inline styles where Tailwind arbitrary values aren't viable.
 */

export const G = {
  // Gold palette
  g:   '#C8973A',
  gl:  '#E2B96A',
  gd:  '#8B5E18',
  gg:  'rgba(200,151,58,.18)',

  // Dark surfaces (6-level depth system)
  bg:  '#07070B',
  s1:  '#0E0E16',
  s2:  '#13131C',
  s3:  '#191924',
  s4:  '#21212E',
  s5:  '#2B2B3C',
  s6:  '#373750',

  // Text hierarchy
  t0:  '#F0EDE2',
  t1:  '#8A8680',
  t2:  '#4E4B58',

  // Semantic colors + alpha backgrounds
  ok:  '#16A34A',
  okl: 'rgba(22,163,74,.12)',
  er:  '#DC2626',
  erl: 'rgba(220,38,38,.12)',
  wa:  '#D97706',
  wal: 'rgba(217,119,6,.12)',
  bl:  '#2563EB',
  bll: 'rgba(37,99,235,.12)',
  pu:  '#7C3AED',
  pul: 'rgba(124,58,237,.12)',
  te:  '#0D9488',
};

export const FONT = {
  display: "'Domine', serif",
  sans:    "'Nunito', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/**
 * AutoSys Logo — car icon + wordmark.
 * Responsive: hide text on xs with `textHidden` prop.
 */
export function Logo({ size = 30, textHidden = false }) {
  const pathLength = 120;

  return (
    <div className="flex items-center gap-[9px]">
      {/* Icon mark */}
      <div
        className="flex items-center justify-center shrink-0 rounded-[28%]"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg,#0B0B0C,#0B0B0C)',
          boxShadow: '0 3px 14px rgba(212,175,55,.20)',
          border: '1.5px solid rgba(212,175,55,.85)',
        }}
      >
        <svg
          width={size * 0.75}
          height={size * 0.75}
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <style>
            {`
              .draw {
                stroke-dasharray: ${pathLength};
                stroke-dashoffset: ${pathLength};
                animation: draw 2.5s ease-in-out infinite;
              }

              .pulse {
                animation: pulse 2.5s ease-in-out infinite;
                transform-origin: center;
              }

              .floatArrow {
                animation: floatArrow 2.5s ease-in-out infinite;
              }

              @keyframes draw {
                0% { stroke-dashoffset: ${pathLength}; opacity: 0.3; }
                40% { opacity: 1; }
                60% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; opacity: 0.6; }
              }

              @keyframes pulse {
                0%,100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.25); opacity: 1; }
              }

              @keyframes floatArrow {
                0%,100% { transform: translate(0,0); }
                50% { transform: translate(1px,-1px); }
              }
            `}
          </style>

          {/* Outer Square */}
          <rect
            x="0"
            y="0"
            width="80"
            height="80"
            rx="16"
            stroke="#D4AF37"
            strokeWidth="3.5"
            className="draw"
          />

          {/* Flow Lines */}
          <path
            d="M20 20 L60 20 L60 60"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="draw"
          />
          <path
            d="M20 60 L20 20"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="draw"
          />

          {/* Nodes */}
          <circle cx="20" cy="20" r="3.5" fill="#D4AF37" className="pulse" />
          <circle cx="60" cy="20" r="3.5" fill="#D4AF37" className="pulse" />
          <circle cx="60" cy="60" r="3.5" fill="#D4AF37" className="pulse" />
          <circle cx="20" cy="60" r="3.5" fill="#D4AF37" className="pulse" />

          {/* Arrow */}
          <path
            d="M55 55 L60 60 L65 55"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="floatArrow"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {!textHidden && (
        <div>
          <div
            className="font-display font-bold leading-none"
            style={{
              fontSize: size * 0.6,
              background: 'linear-gradient(135deg,#E2B96A,#C8973A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.4px',
            }}
          >
            AutoSys
          </div>

          <div
            className="text-text-muted uppercase tracking-[2.5px] leading-none mt-[2px]"
            style={{ fontSize: size * 0.27 }}
          >
            Dealer OS
          </div>
        </div>
      )}
    </div>
  );
}
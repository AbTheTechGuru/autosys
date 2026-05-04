/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Domine'", 'serif'],
        sans: ["'Nunito'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      colors: {
        gold: {
          DEFAULT: '#C8973A',
          light: '#E2B96A',
          dark: '#8B5E18',
          glow: 'rgba(200,151,58,0.18)',
        },
        surface: {
          bg:  '#07070B',
          1:   '#0E0E16',
          2:   '#13131C',
          3:   '#191924',
          4:   '#21212E',
          5:   '#2B2B3C',
          6:   '#373750',
        },
        text: {
          primary:   '#F0EDE2',
          secondary: '#8A8680',
          muted:     '#4E4B58',
        },
        status: {
          ok:   '#16A34A',
          okbg: 'rgba(22,163,74,0.12)',
          er:   '#DC2626',
          erbg: 'rgba(220,38,38,0.12)',
          wa:   '#D97706',
          wabg: 'rgba(217,119,6,0.12)',
          bl:   '#2563EB',
          blbg: 'rgba(37,99,235,0.12)',
          pu:   '#7C3AED',
          pubg: 'rgba(124,58,237,0.12)',
          te:   '#0D9488',
        },
      },
      borderRadius: {
        card: '14px',
        btn:  '9px',
        tag:  '20px',
      },
      animation: {
        'slide-up':  'slideUp 0.42s ease both',
        'fade-in':   'fadeIn 0.25s ease both',
        'scale-in':  'scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        'spin-slow': 'spin 0.72s linear infinite',
        'pulse-dot': 'pulseDot 2s ease infinite',
        'ticker':    'ticker 28s linear infinite',
        'glow':      'glow 3s ease infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.88)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(200,151,58,0.18)' },
          '60%':     { boxShadow: '0 0 22px 5px rgba(200,151,58,0.18)' },
        },
      },
      boxShadow: {
        gold:     '0 2px 14px rgba(200,151,58,0.3)',
        'gold-lg':'0 5px 20px rgba(200,151,58,0.4)',
        card:     '0 8px 28px rgba(0,0,0,0.55)',
        modal:    '0 24px 80px rgba(0,0,0,0.75)',
      },
      backdropBlur: {
        nav: '20px',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};

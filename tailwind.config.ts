import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#05030a',
          100: '#0a0714',
          200: '#0f0b1f',
          300: '#160f24',
          400: '#1a1330',
          500: '#241b3a',
        },
        nebula: {
          purple: '#6a2e6a',
          pink: '#b9407a',
          blue: '#3e63b0',
          lilac: '#c9b8ff',
          rose: '#ffd0ec',
        },
        ember: {
          DEFAULT: '#e0588f',
          soft: '#ffe3f3',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      backgroundImage: {
        'nebula-radial':
          'radial-gradient(circle at 50% 30%, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to))',
        'void-gradient': 'linear-gradient(180deg, #05030a 0%, #160f24 50%, #1a1330 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(185, 64, 122, 0.35)',
        'glow-lg': '0 0 80px rgba(185, 64, 122, 0.45)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        drift: {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
          '100%': { transform: 'translateY(0px)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        drift: 'drift 8s ease-in-out infinite',
        flicker: 'flicker 3s ease-in-out infinite',
        'fade-in': 'fade-in 1.2s ease-out forwards',
        'fade-up': 'fade-up 1.2s ease-out forwards',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
